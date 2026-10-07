import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './db';
import { getSecureItem, removeSecureItem } from './secureStorage';

let onAuthFailure: ((reason?: string) => void) | null = null;

export const setAuthFailureCallback = (callback: (reason?: string) => void) => {
    onAuthFailure = callback;
};

// SPEC-44 CON-01/CON-02: latch so only the first rejected call in an
// invalidation episode logs; reset on every fresh login/logout.
let authWarnLatched = false;

export const resetAuthSessionWarningLatch = () => {
    authWarnLatched = false;
};

const clearAuthStorage = async () => {
    await removeSecureItem('authToken');
    await AsyncStorage.removeItem('activeUserId');
};

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

// SPEC-40 DEC-01/DEC-02/CON-05: the server nests its payload one level deeper
// than the envelope ({status, results, data:{<wrapperKey>: payload}}). Every
// consumer already assumes the flat payload via its type annotations, so the
// unwrap happens once, here. Keyed on KNOWN names and never on key count:
// `storage/upload` returns `{url}`, a legitimate single-key object, and must
// survive untouched.
export const RESPONSE_WRAPPER_KEYS = [
  "transactions",
  "categories",
  "dues",
  "savingsItems",
  "profile",
  "transaction",
] as const;

const unwrapEnvelope = <T,>(data: unknown): T => {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return data as T;
  }
  const keys = Object.keys(data as Record<string, unknown>);
  if (keys.length !== 1) return data as T;
  const only = keys[0];
  if (!(RESPONSE_WRAPPER_KEYS as readonly string[]).includes(only)) {
    // ACC-04: unknown wrapper — pass through untouched so a new endpoint fails
    // loudly in review rather than silently reading empty in production.
    return data as T;
  }
  return (data as Record<string, unknown>)[only] as T;
};

export async function authFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = await getSecureItem('authToken');

  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${formattedEndpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // SPEC-44 CON-06: warn only when the admin toggle is explicitly on.
      if (!authWarnLatched && process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true") {
        console.warn('401 Unauthorized - clearing auth credentials');
        authWarnLatched = true;
      }
      await clearAuthStorage();
      if (onAuthFailure) {
        onAuthFailure('session_ended');
      }
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // SPEC-36 v1.5 DEC-W8(a): the server answers DELETE with 204 + empty body.
      // Empty/unparseable body on a 2xx is success with no payload (data stays
      // undefined) — not a failure. Non-2xx keeps failing loudly below. The 401
      // session path above and the envelope unwrap below are untouched.
      if (response.ok) {
        return { ok: true, status: response.status };
      }
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        error: text ? `Non-JSON response: ${text.slice(0, 200)}` : `HTTP ${response.status} (empty body)`,
      };
    }

    // json() is typed `unknown`; narrow to the fields actually read.
    // NOTE (T-05): the server's error shape carries `message`, not `error`
    // (wallet_API/src/app.js — unverified in-tree); `error` stays first so an
    // `error`-shaped body still wins.
    const env = body as { status?: string; data?: unknown; error?: string; message?: string } | null;
    const unwrapped: T = unwrapEnvelope<T>(
      env?.status === 'success' && env?.data ? env.data : env
    );

    return {
      ok: response.ok,
      status: response.status,
      data: unwrapped,
      error: !response.ok ? (env?.error ?? env?.message ?? `HTTP ${response.status}`) as string : undefined,
    };
  } catch (e: unknown) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
