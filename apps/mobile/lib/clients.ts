export const postgrest = {
  url: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
};

export const authClient = {
  url: process.env.EXPO_PUBLIC_AUTH_URL ?? "http://localhost:5000",
};

export const aiClient = {
  url: process.env.EXPO_PUBLIC_AI_URL ?? "http://localhost:4000",
};

export const orchestrator = {
  url: process.env.EXPO_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:4050",
};

export const storage = {
  url: process.env.EXPO_PUBLIC_MINIO_URL ?? "http://localhost:9000",
};