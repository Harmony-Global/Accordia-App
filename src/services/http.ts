const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "")).replace(/\/$/, "");

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

function friendlyApiMessage(path: string, response: Response, data: Record<string, unknown>) {
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
    throw new Error(friendlyApiMessage(path, response, data));
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
    throw new Error(friendlyApiMessage(path, response, data));
  }

  return data as T;
}
