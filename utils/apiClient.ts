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

// SPEC-62 D-62-02 (DEC-62-01/02/03): 60s TTL read-through cache for heavy
// collection GETs. Memory-only Map (SPEC-36: no persistence); endpoint-alone
// keys (SPEC-59 rotates tokens — token keys would never hit; single live
// session + wipe-on-auth-change keeps this safe); lazy Date.now expiry (no
// timers — open-handle leak class); ok-only store, 401s never populate.
const GET_CACHE_TTL_MS = 60_000;
const GET_CACHE_MAX_ENTRIES = 50;
const HEAVY_GET_SEGMENTS: readonly string[] = ["transactions", "dues", "savingsItems"];

interface GetCacheEntry {
  at: number;
  status: number;
  payload: unknown;
}

const getCache = new Map<string, GetCacheEntry>();

function firstSegment(endpoint: string): string {
  const trimmed = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return trimmed.split(/[/?#]/, 1)[0];
}

function isHeavyGet(endpoint: string): boolean {
  return (HEAVY_GET_SEGMENTS as readonly string[]).includes(firstSegment(endpoint));
}

export function invalidateGetCache(prefix: string): void {
  const bare = prefix.startsWith("/") ? prefix.slice(1) : prefix;
  for (const key of getCache.keys()) {
    const k = key.startsWith("/") ? key.slice(1) : key;
    if (k === bare || k.startsWith(`${bare}?`) || k.startsWith(`${bare}/`)) {
      getCache.delete(key);
    }
  }
}

export function wipeGetCache(): void {
  getCache.clear();
}

function readGetCache(key: string): ApiResult<unknown> | null {
  const entry = getCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > GET_CACHE_TTL_MS) {
    getCache.delete(key);
    return null;
  }
  return { ok: true, status: entry.status, data: entry.payload };
}

function storeGetCache(key: string, status: number, payload: unknown): void {
  if (getCache.size >= GET_CACHE_MAX_ENTRIES) {
    const oldest = getCache.keys().next();
    if (!oldest.done) getCache.delete(oldest.value);
  }
  getCache.set(key, { at: Date.now(), status, payload });
}

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
  options: RequestInit = {},
  opts: { skipCache?: boolean } = {}
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

  const method = (options.method ?? "GET").toUpperCase();
  const cacheKey = formattedEndpoint;
  if (method === "GET" && !opts.skipCache && isHeavyGet(formattedEndpoint)) {
    const cached = readGetCache(cacheKey);
    if (cached) return cached as ApiResult<T>;
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
      wipeGetCache();
      if (onAuthFailure) {
        onAuthFailure('session_ended');
      }
    }

    // Mutation hit the network (ok incl. empty-body 204s): drop the
    // collection's cached rows so the next GET refetches (DEC-62-03).
    if (method !== "GET" && response.ok) {
      invalidateGetCache(firstSegment(formattedEndpoint));
    }

    let body: unknown;
    let rawText = "";
    try {
      rawText = await response.text();
    } catch {
      rawText = "";
    }
    if (!rawText) {
      body = undefined;
    } else {
      try {
        body = JSON.parse(rawText) as unknown;
      } catch {
        return {
          ok: false,
          status: response.status,
          error: `Non-JSON response: ${rawText.slice(0, 200)}`,
        };
      }
    }

    // json() is typed `unknown`; narrow to the fields actually read.
    // NOTE (T-05): the server's error shape carries `message`, not `error`
    // (wallet_API/src/app.js — unverified in-tree); `error` stays first so an
    // `error`-shaped body still wins.
    const env = body as { status?: string; data?: unknown; error?: string; message?: string } | null;
    const unwrapped: T = unwrapEnvelope<T>(
      env?.status === 'success' && env?.data ? env.data : env
    );

    if (method === "GET" && response.ok && !opts.skipCache && isHeavyGet(formattedEndpoint)) {
      storeGetCache(cacheKey, response.status, unwrapped);
    }

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
