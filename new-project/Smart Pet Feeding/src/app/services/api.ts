import type { StoredAuthSession } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api").replace(
  /\/$/,
  "",
);

export const AUTH_STORAGE_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY ?? "smartPetFeederAuth";

export class HttpError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function readStoredAuth(): StoredAuthSession | null {
  const storedValue = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as StoredAuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAuth(session: StoredAuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const storedAuth = readStoredAuth();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth && storedAuth?.token) {
    headers.set("Authorization", `Bearer ${storedAuth.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response
    .json()
    .catch(() => ({ message: "Unexpected non-JSON response from the server." }));

  if (!response.ok) {
    throw new HttpError(
      payload.message ?? "Request failed.",
      response.status,
      payload.details ?? null,
    );
  }

  return payload as T;
}

export function extractErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
