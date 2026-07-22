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
};

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

function friendlyApiMessage(path: string, response: Response, data: Record<string, unknown>) {
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
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;

  try {
    response = await fetch(requestUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });
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

  return data as T;
}

export async function apiFormData<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(requestUrl(path), {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store"
    });
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

  return data as T;
}

