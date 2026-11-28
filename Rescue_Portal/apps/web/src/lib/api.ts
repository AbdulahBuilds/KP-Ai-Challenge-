export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'rescue_access_token';
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') accessToken = window.localStorage.getItem(TOKEN_KEY);
  return accessToken;
}

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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const isFormData = init.body instanceof FormData;
  if (!isFormData && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

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

  if (response.status === 401) {
    setAccessToken(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rescue-auth-expired'));
  }

  if (!response.ok) {
    const body = await parseBody(response);
    const detail = errorMessage(body, `Request failed (${response.status})`);
    const message =
      response.status === 502
        ? `${detail} — check that the Hospital Portal is running (npm run dev:hospital).`
        : response.status >= 500
          ? `${detail} — the Rescue API is temporarily unavailable. Please try again.`
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
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' });
  } catch {
    throw new ApiError(`Cannot reach the Rescue Portal API at ${API_URL}. Check that the API is running.`, 0);
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
