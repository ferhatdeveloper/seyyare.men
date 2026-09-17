import { useApiBaseStore } from "./api-base-store";

function pick(
  envUrl: string | undefined,
  key: "api" | "auth" | "ai" | "orch" | "storage",
  fallback: string,
): string {
  const { override, urls } = useApiBaseStore.getState();
  if (override) return urls[key];
  return envUrl ?? urls[key] ?? fallback;
}

export const postgrest = {
  get url() {
    return pick(process.env.EXPO_PUBLIC_API_URL, "api", "http://localhost:3000");
  },
};

export const authClient = {
  get url() {
    return pick(process.env.EXPO_PUBLIC_AUTH_URL, "auth", "http://localhost:5000");
  },
};

export const aiClient = {
  get url() {
    return pick(process.env.EXPO_PUBLIC_AI_URL, "ai", "http://localhost:4000");
  },
};

export const orchestrator = {
  get url() {
    return pick(process.env.EXPO_PUBLIC_ORCHESTRATOR_URL, "orch", "http://localhost:4050");
  },
};

export const storage = {
  get url() {
    return pick(process.env.EXPO_PUBLIC_MINIO_URL, "storage", "http://localhost:9000");
  },
};
