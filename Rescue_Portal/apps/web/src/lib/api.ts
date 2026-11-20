import type { AuthResponse } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const value = (body as { message?: unknown }).message;
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'string') return value;
  return fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return await response.text();
}

export async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!response.ok) return null;
        const data = (await response.json()) as AuthResponse;
        accessToken = data.accessToken;
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, ...init } = options;
  const headers = new Headers(init.headers ?? {});
  const isFormData = init.body instanceof FormData;
  if (!isFormData && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the Rescue Portal API. Check that the API is running.', 0);
  }

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return api<T>(path, { ...options, retryOnUnauthorized: false });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rescue-auth-expired'));
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    const body = await parseBody(response);
    throw new ApiError(errorMessage(body, `Request failed (${response.status})`), response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await parseBody(response)) as T;
}

export function queryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let response = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' });
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        credentials: 'include',
      });
    }
  }
  if (!response.ok) {
    const body = await parseBody(response);
    throw new ApiError(errorMessage(body, 'Download failed'), response.status, body);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
