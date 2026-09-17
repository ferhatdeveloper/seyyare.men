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
  createDemoBooking,
  listDemoAuctionBids,
  listDemoMyBookings,
  listLiveAuctions,
  normalizeAuctionRow,
  type DemoRental,
} from "./demo-data";

/** Soft-launch / prod: set EXPO_PUBLIC_USE_DEMO_FALLBACK=false to force live API/DB only. */
const USE_DEMO_FALLBACK =
  (process.env.EXPO_PUBLIC_USE_DEMO_FALLBACK ?? "true").toLowerCase() !== "false";

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
    airport_delivery: rental.airport_delivery ?? false,
    airport_delivery_fee: rental.airport_delivery_fee ?? 0,
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
  if (!USE_DEMO_FALLBACK) return undefined;
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

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await auth.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${authClient.url}/auth/refresh`, {
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

/** Map mobile `p_*` aliases to PostgREST function parameter names. */
function normalizeRpcArgs(
  name: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const a = { ...args };

  const alias = (from: string, to: string) => {
    if (a[from] !== undefined && a[to] === undefined) a[to] = a[from];
    delete a[from];
  };

  if (name === "list_reference_data" || name === "list_brands") {
    alias("p_locale", "locale");
    return a;
  }

  // PostgREST: keep p_* names for feed (do NOT remap p_locale → locale)
  if (name === "list_active_listings_feed") {
    return a;
  }

  if (name === "search_vehicles") {
    alias("p_q", "q");
    alias("p_make_ids", "make_ids");
    alias("p_body_type_ids", "body_type_ids");
    alias("p_fuel_type_ids", "fuel_type_ids");
    alias("p_transmission_ids", "transmission_ids");
    alias("p_color_ids", "color_ids");
    alias("p_min_year", "min_year");
    alias("p_max_year", "max_year");
    alias("p_min_price", "min_price");
    alias("p_max_price", "max_price");
    alias("p_min_mileage", "min_mileage");
    alias("p_max_mileage", "max_mileage");
    alias("p_condition_filter", "condition_filter");
    alias("p_lat", "lat");
    alias("p_lng", "lng");
    alias("p_radius_km", "radius_km");
    alias("p_locale", "locale");
    alias("p_sort_by", "sort_by");
    alias("p_sort_dir", "sort_dir");
    alias("p_page_size", "page_size");
    alias("p_page_offset", "page_offset");
    return a;
  }

  if (a.p_locale !== undefined && a.locale === undefined) {
    a.locale = a.p_locale;
    delete a.p_locale;
  }

  return a;
}

async function rpcWithDemoFallback<T>(
  name: string,
  args: Record<string, unknown>,
  demo: () => T,
): Promise<T> {
  const payload = normalizeRpcArgs(name, args);
  try {
    const res = await fetchWithAuth(`${postgrest.url}/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (isApiFailure(data, res.ok)) {
      if (USE_DEMO_FALLBACK) return demo();
      throw new Error(`RPC ${name} failed`);
    }
    if (
      USE_DEMO_FALLBACK &&
      Array.isArray(data) &&
      data.length === 0 &&
      (name === "search_vehicles" || name === "list_live_auctions")
    ) {
      return demo();
    }
    return data as T;
  } catch (e) {
    if (USE_DEMO_FALLBACK) return demo();
    throw e;
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
          USE_DEMO_FALLBACK &&
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

  /**
   * Insert a vehicle listing via PostgREST.
   * Returns the created row on success, null on API/RLS/network failure (demo OK).
   */
  createVehicle: async (
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> => {
    try {
      const res = await fetchWithAuth(`${postgrest.url}/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (isApiFailure(data, res.ok)) return null;
      if (Array.isArray(data)) {
        const row = data[0];
        if (row && typeof row === "object" && "id" in row) {
          return row as Record<string, unknown>;
        }
        return null;
      }
      if (data && typeof data === "object" && "id" in data) {
        return data as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  },

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
    if (name === "count_active_listings") {
      return rpcWithDemoFallback(name, args, () => DEMO_VEHICLES.length as T);
    }
    if (name === "list_active_listings_feed") {
      return rpcWithDemoFallback(name, args, () => {
        const limit = Number(args.p_limit ?? 10);
        const offset = Number(args.p_offset ?? 0);
        return filterDemoVehicles({
          ...args,
          p_page_size: limit,
          p_page_offset: offset,
          p_sort_by: "created_at",
          p_sort_dir: "desc",
          p_locale: args.p_locale,
        }) as T;
      });
    }
    // Wallet / auction / taxi — null / empty signals callers to use local demo
    if (name === "get_wallet_balance") {
      return rpcWithDemoFallback(name, args, () => null as T);
    }
    if (name === "wallet_top_up") {
      return rpcWithDemoFallback(name, args, () => null as T);
    }
    if (name === "charge_listing_fee") {
      return rpcWithDemoFallback(name, args, () => null as T);
    }
    if (name === "list_live_auctions") {
      return rpcWithDemoFallback(name, args, () => {
        const limit = Number(args.p_limit ?? 20);
        return listLiveAuctions().slice(0, Math.max(1, limit)) as T;
      }).then((rows) => {
        if (!Array.isArray(rows)) return rows;
        return rows.map((r) =>
          normalizeAuctionRow(
            (r && typeof r === "object" ? r : {}) as Record<string, unknown>,
          ),
        ) as T;
      });
    }
    if (name === "list_auction_bids") {
      return rpcWithDemoFallback(name, args, () => {
        const auctionId = String(args.p_auction_id ?? "");
        const limit = Number(args.p_limit ?? 40);
        return listDemoAuctionBids(auctionId, limit) as T;
      });
    }
    if (name === "place_bid") {
      return rpcWithDemoFallback(name, args, () => null as T);
    }
    if (name === "create_booking") {
      return rpcWithDemoFallback(name, args, () =>
        createDemoBooking({
          rental_id: String(args.p_rental_id ?? ""),
          start_date: String(args.p_start_date ?? ""),
          end_date: String(args.p_end_date ?? ""),
          total_amount:
            args.p_total_amount == null
              ? undefined
              : Number(args.p_total_amount),
          currency:
            args.p_currency == null ? undefined : String(args.p_currency),
        }) as T,
      );
    }
    if (name === "list_my_bookings") {
      return rpcWithDemoFallback(name, args, () => {
        const limit = Number(args.p_limit ?? 50);
        return listDemoMyBookings()
          .slice(0, Math.max(1, limit))
          .map((b) => ({
            id: b.id,
            rental_id: b.id,
            renter_id: "demo-guest",
            start_date: b.start,
            end_date: b.end,
            total_days: 1,
            total_amount: b.amount,
            currency: b.currency,
            status:
              b.status === "accepted"
                ? "confirmed"
                : b.status === "rejected"
                  ? "rejected"
                  : "pending",
            notes: null,
            city: b.city,
            rental_title: b.rentalTitle,
            guest_label: b.guest,
            party_role: "owner",
            created_at: new Date().toISOString(),
          })) as T;
      });
    }
    if (name === "request_ride") {
      return rpcWithDemoFallback(name, args, () => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `demo-ride-${Date.now()}`;
        return {
          id,
          status: "requested",
          rider_id: "demo-rider",
          driver_id: null,
        } as T;
      });
    }
    if (name === "nearby_drivers") {
      return rpcWithDemoFallback(name, args, () => {
        const lat = Number(args.lat ?? args.p_lat ?? 33.3152);
        const lng = Number(args.lng ?? args.p_lng ?? 44.3661);
        return [
          {
            user_id: "demo-driver-1",
            gender: null,
            geo_lat: lat + 0.008,
            geo_lng: lng + 0.006,
            distance_m: 920,
            updated_at: new Date().toISOString(),
            display_name: "Ahmed K.",
            eta_min: 4,
          },
        ] as T;
      });
    }
    if (name === "match_ride") {
      return rpcWithDemoFallback(name, args, () => {
        const id = String(args.p_ride_id ?? `demo-ride-${Date.now()}`);
        return {
          id,
          status: "matched",
          rider_id: "demo-rider",
          driver_id: "demo-driver-1",
        } as T;
      });
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
