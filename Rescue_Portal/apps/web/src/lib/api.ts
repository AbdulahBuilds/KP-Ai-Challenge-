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
  if (typeof body === 'string') {
    const text = body.trim();
    if (!text || text.startsWith('<')) return fallback;
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
  }
  if (!body || typeof body !== 'object') return fallback;
  const record = body as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail']) {
    const value = record[key];
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join('; ');
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      let response: Response;
      try {
        response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      } catch {
        throw new ApiError(`Cannot reach the Rescue Portal API at ${API_URL}. Check that the API is running.`, 0);
      }
      if (response.status === 401) return null;
      if (!response.ok) {
        const body = await parseBody(response);
        throw new ApiError(errorMessage(body, `Session refresh failed (${response.status})`), response.status, body);
      }
      const data = (await response.json()) as AuthResponse;
      accessToken = data.accessToken;
      return data;
    })().finally(() => {
      refreshPromise = null;
    });
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
    throw new ApiError(`Cannot reach the Rescue Portal API at ${API_URL}. Check that the API is running.`, 0);
  }

  if (response.status === 401 && auth && retryOnUnauthorized) {
    let refreshed: AuthResponse | null = null;
    try {
      refreshed = await refreshAccessToken();
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status >= 500) {
        throw new ApiError(`Your session could not be refreshed because the Rescue API is unavailable. ${refreshError.message}`, refreshError.status);
      }
      throw refreshError instanceof ApiError
        ? refreshError
        : new ApiError('Your session could not be refreshed. Please try again.', 0);
    }
    if (refreshed) return api<T>(path, { ...options, retryOnUnauthorized: false });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rescue-auth-expired'));
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    const body = await parseBody(response);
    const detail = errorMessage(body, `Request failed (${response.status})`);
    const message = response.status >= 500
      ? `${detail} — the Rescue API is unavailable or misconfigured. Please try again or contact support.`
      : detail;
    throw new ApiError(message, response.status, body);
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
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' });
  } catch {
    throw new ApiError(`Cannot reach the Rescue Portal API at ${API_URL}. Check that the API is running.`, 0);
  }
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
