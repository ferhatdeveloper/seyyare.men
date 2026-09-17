import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const KEY = "seyyare.api_gateway_override_v1";

export type ServiceUrls = {
  api: string;
  auth: string;
  ai: string;
  orch: string;
  storage: string;
};

function stripSlash(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Soft-gateway paths (nginx strips prefixes; clients re-add service path segments). */
export function resolveServiceUrls(gateway: string): ServiceUrls {
  const g = stripSlash(gateway);
  return {
    api: `${g}/api`,
    auth: `${g}/auth`,
    ai: `${g}/ai`,
    orch: `${g}/orch`,
    storage: `${g}/storage`,
  };
}

function gatewayFromEnvUrl(url: string | undefined, suffix: string): string | null {
  if (!url) return null;
  const u = stripSlash(url);
  if (u.toLowerCase().endsWith(suffix)) {
    return stripSlash(u.slice(0, -suffix.length));
  }
  return null;
}

export function defaultGatewayFromEnv(): string {
  const fromPaths =
    gatewayFromEnvUrl(process.env.EXPO_PUBLIC_API_URL, "/api") ??
    gatewayFromEnvUrl(process.env.EXPO_PUBLIC_AUTH_URL, "/auth") ??
    gatewayFromEnvUrl(process.env.EXPO_PUBLIC_AI_URL, "/ai") ??
    gatewayFromEnvUrl(process.env.EXPO_PUBLIC_ORCHESTRATOR_URL, "/orch");
  if (fromPaths) return fromPaths;

  const explicit = stripSlash(process.env.EXPO_PUBLIC_GATEWAY_URL ?? "");
  if (explicit) return explicit;

  const api = stripSlash(process.env.EXPO_PUBLIC_API_URL ?? "");
  if (api) {
    try {
      return stripSlash(new URL(api).origin);
    } catch {
      return api;
    }
  }

  return "http://localhost:8088";
}

type ApiBaseState = {
  hydrated: boolean;
  /** null = use build-time / env default */
  override: string | null;
  gateway: string;
  urls: ServiceUrls;
  hydrate: () => Promise<void>;
  setOverride: (gateway: string | null) => Promise<void>;
  resetOverride: () => Promise<void>;
};

function buildState(override: string | null) {
  const gateway = stripSlash(override || defaultGatewayFromEnv());
  return {
    override,
    gateway,
    urls: resolveServiceUrls(gateway),
  };
}

export const useApiBaseStore = create<ApiBaseState>((set) => ({
  hydrated: false,
  ...buildState(null),

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const override = raw ? stripSlash(raw) || null : null;
      set({ hydrated: true, ...buildState(override) });
    } catch {
      set({ hydrated: true, ...buildState(null) });
    }
  },

  setOverride: async (gateway) => {
    const next = gateway ? stripSlash(gateway) : null;
    if (next) {
      await AsyncStorage.setItem(KEY, next);
    } else {
      await AsyncStorage.removeItem(KEY);
    }
    set({ ...buildState(next) });
  },

  resetOverride: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ ...buildState(null) });
  },
}));

/** Sync read for fetch helpers (after hydrate). */
export function getServiceUrls(): ServiceUrls {
  return useApiBaseStore.getState().urls;
}

export function getGateway(): string {
  return useApiBaseStore.getState().gateway;
}
