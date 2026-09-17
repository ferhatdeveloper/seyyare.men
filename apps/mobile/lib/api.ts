import { postgrest, authClient, aiClient } from "./clients";
import { auth } from "./auth";
import {
  DEMO_FAVORITES,
  DEMO_MESSAGES,
  DEMO_REFERENCE,
  DEMO_RENTALS,
  DEMO_SELLER,
  DEMO_STORES,
  DEMO_VEHICLES,
  demoAssistantReply,
  filterDemoVehicles,
  getDemoMessages,
  getDemoRental,
  getDemoSeller,
  getDemoVehicle,
  getDemoVehiclesBySeller,
  type DemoRental,
} from "./demo-data";

function normalizeDemoRental(rental: DemoRental): DemoRental {
  const cover =
    rental.vehicle.media?.find((m) => m.is_cover)?.url ??
    rental.vehicle.cover_url ??
    "";
  const media =
    rental.vehicle.media?.length > 0
      ? rental.vehicle.media
      : cover
        ? [{ id: `${rental.id}-cover`, url: cover, type: "image" as const, is_cover: true }]
        : [];
  return {
    ...rental,
    age_requirement: rental.age_requirement ?? 21,
    delivery_available: rental.delivery_available ?? false,
    vehicle: {
      ...rental.vehicle,
      media,
    },
    owner: rental.owner ?? {
      display_name: DEMO_SELLER.display_name,
      verified: DEMO_SELLER.verified,
      rating_avg: DEMO_SELLER.rating_avg,
    },
  };
}

function demoFallbackForGet(path: string): unknown | undefined {
  if (path.startsWith("/rentals")) {
    const idMatch = path.match(/[?&]id=eq\.([^&]+)/);
    if (idMatch) {
      const rental = getDemoRental(decodeURIComponent(idMatch[1]));
      return rental ? [normalizeDemoRental(rental)] : [];
    }
    return DEMO_RENTALS.map(normalizeDemoRental);
  }
  if (path.startsWith("/favorites")) return DEMO_FAVORITES;
  if (path.startsWith("/messages")) {
    const match = path.match(/conversation_id=eq\.([^&]+)/);
    if (!match) return [];
    const conversationId = decodeURIComponent(match[1]);
    // Real UUIDs must never get demo chat seed data
    if (!conversationId.startsWith("demo")) return [];
    return getDemoMessages(conversationId);
  }
  const vehicleMatch = path.match(/\/vehicles\?id=eq\.(.+?)(?:&|$)/);
  if (vehicleMatch) {
    const v = getDemoVehicle(decodeURIComponent(vehicleMatch[1]));
    return v ? [v] : [];
  }
  const sellerVehicles = path.match(/\/vehicles\?seller_id=eq\.([^&]+)/);
  if (sellerVehicles) {
    const sellerId = decodeURIComponent(sellerVehicles[1]);
    return getDemoVehiclesBySeller(sellerId);
  }
  const profileMatch = path.match(/\/user_profiles\?user_id=eq\.([^&]+)/);
  if (profileMatch) {
    const userId = decodeURIComponent(profileMatch[1]);
    const seller = getDemoSeller(userId);
    if (seller) return [seller];
  }
  if (path.startsWith("/demo/stores") || path.includes("list_stores")) {
    return DEMO_STORES.map((s) => ({
      id: s.user_id,
      name: s.display_name,
      city: s.city,
      country_code: s.country_code,
      verified: s.verified,
      rating_avg: s.rating_avg,
      rating_count: s.rating_count,
      listing_count: getDemoVehiclesBySeller(s.user_id).length,
      bio: s.bio,
      cover_url: s.cover_url,
      address: s.address,
      hours: s.hours,
      phone: s.phone,
    }));
  }
  return undefined;
}

const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? "http://localhost:5000";

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

function isApiFailure(payload: unknown, ok: boolean): boolean {
  if (!ok) return true;
  if (payload == null) return true;
  if (typeof payload === "object" && payload !== null && "code" in payload && "message" in payload) {
    return true; // PostgREST error shape
  }
  return false;
}

async function rpcWithDemoFallback<T>(
  name: string,
  args: Record<string, unknown>,
  demo: () => T,
): Promise<T> {
  try {
    const res = await fetchWithAuth(`${postgrest.url}/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (isApiFailure(data, res.ok)) return demo();
    if (Array.isArray(data) && data.length === 0 && name === "search_vehicles") return demo();
    return data as T;
  } catch {
    return demo();
  }
}

export const api = {
  get: <T = unknown>(path: string, init?: RequestInit) =>
    fetchWithAuth(`${postgrest.url}${path}`, { ...init, method: "GET" })
      .then(async (r) => {
        const data = await r.json();
        if (isApiFailure(data, r.ok)) {
          const demo = demoFallbackForGet(path);
          if (demo !== undefined) return demo as T;
          throw new Error("API unavailable");
        }
        if (
          Array.isArray(data) &&
          data.length === 0 &&
          (path.startsWith("/rentals") || path.startsWith("/favorites"))
        ) {
          const demo = demoFallbackForGet(path);
          if (demo !== undefined) return demo as T;
        }
        return data as T;
      })
      .catch(() => {
        const demo = demoFallbackForGet(path);
        if (demo !== undefined) return demo as T;
        throw new Error("API unavailable");
      }),

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

  rpc: <T = unknown>(name: string, args: Record<string, unknown> = {}) => {
    if (name === "search_vehicles") {
      return rpcWithDemoFallback(name, args, () => filterDemoVehicles(args) as T);
    }
    if (name === "list_reference_data") {
      return rpcWithDemoFallback(name, args, () => DEMO_REFERENCE as T);
    }
    if (name === "list_stores") {
      return rpcWithDemoFallback(name, args, () =>
        DEMO_STORES.map((s) => ({
          id: s.user_id,
          name: s.display_name,
          city: s.city,
          country_code: s.country_code,
          verified: s.verified,
          rating_avg: s.rating_avg,
          rating_count: s.rating_count,
          listing_count: getDemoVehiclesBySeller(s.user_id).length,
          bio: s.bio,
          cover_url: s.cover_url,
          address: s.address,
          hours: s.hours,
          phone: s.phone,
        })) as T,
      );
    }
    return rpcWithDemoFallback(name, args, () => ([] as unknown as T));
  },

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

  /** AI asistan — API yoksa demo yanıt */
  aiAssistant: async (messages: Array<{ role: string; content: string }>, locale: string) => {
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    try {
      const res = await fetch(`${aiClient.url}/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, locale }),
      });
      if (!res.ok) return demoAssistantReply(last);
      const data = await res.json();
      if (!data?.reply) return demoAssistantReply(last);
      return data as ReturnType<typeof demoAssistantReply>;
    } catch {
      return demoAssistantReply(last);
    }
  },

  getDemoVehicle,
  DEMO_VEHICLES,
  DEMO_FAVORITES,
  DEMO_MESSAGES,
};
