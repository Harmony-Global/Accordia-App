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
    throw new Error("Could not reach Accordia. Check your connection and make sure the backend is running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed. Please try again.";
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
    throw new Error("Could not reach Accordia. Check your connection and make sure the backend is running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed. Please try again.";
    throw new Error(message);
  }

  return data as T;
}
