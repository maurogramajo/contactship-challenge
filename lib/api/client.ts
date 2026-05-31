type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let refreshPromise: Promise<void> | null = null;

export class ApiError extends Error {
  code: number;
  details?: unknown;

  constructor(message: string, code: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { body, headers: initHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(initHeaders as Record<string, string>),
  };

  const res = await fetch(url, {
    ...rest,
    credentials: rest.credentials ?? "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok && res.status === 401 && url !== "/api/auth/refresh") {
    if (!refreshPromise) {
      refreshPromise = fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })
        .then((refreshResponse) => {
          if (!refreshResponse.ok) {
            throw new Error("Session refresh failed");
          }
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      return request<T>(url, options);
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error ?? `Request failed with status ${res.status}`,
      data?.code ?? res.status,
      data?.details,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "GET" }),

  post: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "POST", body }),

  put: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "PUT", body }),

  delete: <T>(url: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "DELETE" }),
};

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  return request<T>(url, options);
}
