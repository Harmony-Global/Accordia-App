import { getAppSessionId } from "@/lib/session";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "")).replace(/\/$/, "");

export class SessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please log in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export function isSessionExpiredError(error: unknown) {
  return error instanceof SessionExpiredError;
}

type RequestOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  cacheTtlMs?: number;
};

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const DEFAULT_GET_CACHE_TTL_MS = 15_000;
const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function requestUrl(path: string) {
  if (!API_URL) {
    throw new Error("Accordia API URL is not configured. Set NEXT_PUBLIC_API_URL and redeploy the frontend.");
  }

  return `${API_URL}${path}`;
}

function isSessionFailure(path: string, response: Response) {
  return response.status === 401 && !path.includes("/api/auth/login");
}

function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("accordia:session-expired"));
}

function cacheKey(path: string, token?: string | null) {
  return `${token ?? "public"}:${getAppSessionId() ?? "no-app-session"}:${path}`;
}

function appendAuthHeaders(headers: Record<string, string>, token?: string | null) {
  if (!token) return;

  headers.Authorization = `Bearer ${token}`;
  const appSessionId = getAppSessionId();
  if (appSessionId) {
    headers["X-Accordia-Session-Id"] = appSessionId;
  }
}

function logSlowRequest(path: string, durationMs: number) {
  if (process.env.NODE_ENV !== "development" || durationMs < 800) return;
  console.info(`[api] ${path} took ${Math.round(durationMs)}ms`);
}

export function clearApiCache() {
  responseCache.clear();
  pendingRequests.clear();
}

function friendlyApiMessage(path: string, response: Response, data: Record<string, unknown>) {
  const details = data.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  const fieldError = details?.fieldErrors ? Object.values(details.fieldErrors).flat().find(Boolean) : undefined;
  const formError = details?.formErrors?.find(Boolean);

  if (typeof fieldError === "string") return fieldError;
  if (typeof formError === "string") return formError;

  if (response.status === 422 && path.includes("/api/jobs/") && path.includes("/apply")) {
    return "You need to attach supporting images for your application.";
  }

  if (response.status === 401 && path.includes("/api/auth/login")) {
    return "Wrong email or password.";
  }

  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "You do not have permission to complete this action.";
  }

  if (response.status === 404) {
    return "We could not find that page or service. Please refresh and try again.";
  }

  if (response.status >= 500) {
    return "Unable to complete that request right now. Please try again shortly.";
  }

  return typeof data?.error === "string" ? data.error : "Request failed. Please try again.";
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const canUseMemoryCache = method === "GET";
  const ttlMs = options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
  const key = cacheKey(path, options.token);

  if (canUseMemoryCache && ttlMs > 0) {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const pending = pendingRequests.get(key);
    if (pending) return pending as Promise<T>;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  appendAuthHeaders(headers, options.token);

  async function executeRequest() {
    const startedAt = performance.now();
    let response: Response;

    try {
      response = await fetch(requestUrl(path), {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: "no-store"
      });
    } catch {
      throw new Error("Unable to connect. Check your internet connection and try again.");
    }

    logSlowRequest(path, performance.now() - startedAt);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = friendlyApiMessage(path, response, data);
      if (isSessionFailure(path, response)) {
        notifySessionExpired();
        throw new SessionExpiredError(message);
      }
      throw new Error(message);
    }

    if (canUseMemoryCache && ttlMs > 0) {
      responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    } else if (!canUseMemoryCache) {
      clearApiCache();
    }

    return data as T;
  }

  const request = executeRequest().finally(() => pendingRequests.delete(key));
  if (canUseMemoryCache && ttlMs > 0) pendingRequests.set(key, request);
  return request;
}

export async function apiFormData<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};

  appendAuthHeaders(headers, token);

  let response: Response;

  try {
    const startedAt = performance.now();
    response = await fetch(requestUrl(path), {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store"
    });
    logSlowRequest(path, performance.now() - startedAt);
  } catch {
    throw new Error("Unable to connect. Check your internet connection and try again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = friendlyApiMessage(path, response, data);
    if (isSessionFailure(path, response)) {
      notifySessionExpired();
      throw new SessionExpiredError(message);
    }
    throw new Error(message);
  }

  clearApiCache();
  return data as T;
}

