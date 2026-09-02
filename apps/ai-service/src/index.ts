import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { openrouter } from "./services/openrouter.js";

const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = Fastify({
  logger: { level: NODE_ENV === "development" ? "info" : "warn" },
});

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

app.get("/health", async () => ({
  status: "ok",
  service: "ai",
  openrouter: openrouter.isConfigured() ? "configured" : "missing_api_key",
  env: NODE_ENV,
  ts: new Date().toISOString(),
}));

app.get("/ai/models", async () => ({
  routes: openrouter.routes(),
}));

// Faz 2'de implement edilecek endpointler için stub'lar
app.post("/ai/recognize", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 2'de aktif olacak" });
});

app.post("/ai/price-suggest", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 2'de aktif olacak" });
});

app.post("/ai/damage-detect", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 5'te aktif olacak" });
});

app.post("/ai/translate", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 2'de aktif olacak" });
});

app.post("/ai/generate-description", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 2'de aktif olacak" });
});

app.post("/ai/assistant", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 5'te aktif olacak" });
});

app.get("/ai/rental-price", async (_req, reply) => {
  return reply.code(501).send({ error: "not_implemented", message: "Faz 4'te aktif olacak" });
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`AI service listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}