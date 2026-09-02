import { postgrest, authClient, aiClient } from "./clients";
import { auth } from "./auth";

const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? "http://localhost:5000";

// Refresh mutex — eşzamanlı 401'lerde tek refresh isteği
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await auth.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await auth.clear();
        return null;
      }
      const data = await res.json();
      await auth.saveTokens(data);
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Axios-style response interceptor logic (vanilla fetch wrapper)
async function fetchWithAuth(
  url: string,
  init: RequestInit = {},
  retried = false,
): Promise<Response> {
  const accessToken = await auth.getAccessToken();
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetchWithAuth(url, init, true);
    }
    await auth.clear();
  }

  return res;
}

export const api = {
  // PostgREST
  get: <T = unknown>(path: string, init?: RequestInit) =>
    fetchWithAuth(`${postgrest.url}${path}`, { ...init, method: "GET" }).then((r) => r.json() as Promise<T>),

  post: <T = unknown>(path: string, body: unknown) =>
    fetchWithAuth(`${postgrest.url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    }).then((r) => r.json() as Promise<T>),

  patch: <T = unknown>(path: string, body: unknown) =>
    fetchWithAuth(`${postgrest.url}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    }).then((r) => r.json() as Promise<T>),

  delete: <T = unknown>(path: string) =>
    fetchWithAuth(`${postgrest.url}${path}`, { method: "DELETE" }).then((r) => r.json() as Promise<T>),

  rpc: <T = unknown>(name: string, args: Record<string, unknown> = {}) =>
    fetchWithAuth(`${postgrest.url}/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    }).then((r) => r.json() as Promise<T>),

  // Auth
  login: (identifier: string, password: string) =>
    fetch(`${authClient.url}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    }).then((r) => r.json()),

  register: (data: {
    email?: string;
    phone?: string;
    password: string;
    locale?: string;
    displayName?: string;
    role?: "user" | "dealer";
  }) =>
    fetch(`${authClient.url}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // AI
  aiRecognize: (image: FormData) =>
    fetch(`${aiClient.url}/ai/recognize`, { method: "POST", body: image }).then((r) => r.json()),

  aiPriceSuggest: (vehicle: Record<string, unknown>) =>
    fetch(`${aiClient.url}/ai/price-suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    }).then((r) => r.json()),

  aiTranslate: (text: string, targetLocale: string) =>
    fetch(`${aiClient.url}/ai/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLocale }),
    }).then((r) => r.json()),
};