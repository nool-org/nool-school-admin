import { getFirebaseAuth } from './firebase';
import { AppError, AuthError, NetworkError } from './errors';

const REQUEST_TIMEOUT_MS = 10_000;
// Bulk imports parse + insert server-side and can take minutes - a short
// timeout aborted them mid-flight and a retry then duplicated rows.
const UPLOAD_TIMEOUT_MS = 5 * 60_000;

// NGINX's /api/ location passes the path through unchanged (Core's own
// routers are already mounted at the full /api/v1/... path) - see
// nool-core/nginx/conf.d/default.conf and services/core/src/main.py's
// router prefixes.
const CORE_API_PREFIX = '/api/v1';

export interface ApiRequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

interface ListEnvelope<T> {
  items: T[];
  total: number;
}

async function currentIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new AuthError('You need to sign in again.');
  }
  return user.getIdToken();
}

function apiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new AppError({
      code: 'CONFIG_ERROR',
      message: 'NEXT_PUBLIC_API_BASE_URL is not configured - copy .env.local.example to .env.local.',
      retryable: false,
    });
  }
  return baseUrl.replace(/\/+$/, '');
}

async function errorMessageFrom(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export interface LoginResult {
  customToken: string;
}

/**
 * Calls nool-core's Auth service `POST /api/v1/login` (through NGINX, at
 * `/auth/api/v1/login` - note this is the Auth service, not Core, so it
 * does NOT go through CORE_API_PREFIX above). The credential check itself
 * happens server-side now (see nool-core's
 * shared/auth/providers/firebase.py's authenticate_with_password) rather
 * than this app calling Firebase directly - the returned custom token is
 * exchanged for a real client session via signInWithCustomToken, see
 * AuthProvider.tsx's signIn.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/auth/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
  } catch (cause) {
    throw new NetworkError('Could not reach the server. Check your connection and try again.', cause);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new AuthError(await errorMessageFrom(response, 'Incorrect email or password.'));
  }
  if (!response.ok) {
    throw new AppError({
      code: 'UNEXPECTED_ERROR',
      message: await errorMessageFrom(response, `Request failed (${response.status}).`),
      retryable: false,
    });
  }

  try {
    return (await response.json()) as LoginResult;
  } catch (cause) {
    throw new NetworkError('Server returned an unreadable response.', cause);
  }
}

/**
 * Calls a nool-core School Admin / Super Admin endpoint - the reference
 * doc's HTTP-status table (400/409/422 -> UNEXPECTED_ERROR, 401 -> AUTH_ERROR
 * retryable, 403 -> AUTH_ERROR not retryable, 404 -> NOT_FOUND, 429/5xx ->
 * NETWORK_ERROR), same mapping as nool-apps' services/api/apiClient.ts.
 */
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const token = await currentIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${CORE_API_PREFIX}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (cause) {
    throw new NetworkError('Could not reach the server. Check your connection and try again.', cause);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new AuthError(
      await errorMessageFrom(response, 'Your session is no longer valid. Please sign in again.'),
    );
  }
  if (response.status === 403) {
    throw new AppError({
      code: 'AUTH_ERROR',
      message: await errorMessageFrom(response, 'You do not have permission to do that.'),
      retryable: false,
    });
  }
  if (response.status === 404) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: await errorMessageFrom(response, 'Not found.'),
      retryable: false,
    });
  }
  if (response.status === 429 || response.status >= 500) {
    throw new NetworkError(`Server returned an unexpected error (${response.status}).`);
  }
  if (!response.ok) {
    throw new AppError({
      code: 'UNEXPECTED_ERROR',
      message: await errorMessageFrom(response, `Request failed (${response.status}).`),
      retryable: false,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new NetworkError('Server returned an unreadable response.', cause);
  }
}

/** Unwraps the {items, total} envelope every list endpoint in the API uses. */
export async function apiRequestList<T>(path: string, init: ApiRequestInit = {}): Promise<T[]> {
  const envelope = await apiRequest<ListEnvelope<T>>(path, init);
  return envelope.items;
}

/**
 * Multipart file upload (bulk teacher/student import) - deliberately not
 * routed through apiRequest: the body is FormData, not JSON, and the
 * Content-Type header must be left unset so the browser can attach its
 * own multipart boundary.
 */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const token = await currentIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${CORE_API_PREFIX}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
  } catch (cause) {
    throw new NetworkError('Could not reach the server. Check your connection and try again.', cause);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new AuthError(
      await errorMessageFrom(response, 'Your session is no longer valid. Please sign in again.'),
    );
  }
  if (response.status === 403) {
    throw new AppError({
      code: 'AUTH_ERROR',
      message: await errorMessageFrom(response, 'You do not have permission to do that.'),
      retryable: false,
    });
  }
  if (response.status === 429 || response.status >= 500) {
    throw new NetworkError(`Server returned an unexpected error (${response.status}).`);
  }
  if (!response.ok) {
    throw new AppError({
      code: 'UNEXPECTED_ERROR',
      message: await errorMessageFrom(response, `Request failed (${response.status}).`),
      retryable: false,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new NetworkError('Server returned an unreadable response.', cause);
  }
}

/**
 * Downloads a CSV (or other file) response and saves it via the browser -
 * separate from apiRequest since the response body is a file, not JSON,
 * and the result is a side effect (a save-as), not a parsed value.
 */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const token = await currentIdToken();

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${CORE_API_PREFIX}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    throw new NetworkError('Could not reach the server. Check your connection and try again.', cause);
  }

  if (response.status === 401) {
    throw new AuthError(
      await errorMessageFrom(response, 'Your session is no longer valid. Please sign in again.'),
    );
  }
  if (!response.ok) {
    throw new AppError({
      code: 'UNEXPECTED_ERROR',
      message: await errorMessageFrom(response, `Download failed (${response.status}).`),
      retryable: false,
    });
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
