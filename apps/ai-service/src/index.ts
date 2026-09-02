import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { openrouter } from "./services/openrouter.js";
import { db } from "./lib/db.js";
import { cache } from "./lib/cache.js";
import { visionRoutes } from "./routes/vision.js";
import { priceRoutes } from "./routes/price.js";
import { translateRoutes } from "./routes/translate.js";
import { descriptionRoutes } from "./routes/description.js";
import { damageRoutes } from "./routes/damage.js";
import { assistantRoutes } from "./routes/assistant.js";
import { rentalRoutes } from "./routes/rental.js";

const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = Fastify({
  logger: { level: NODE_ENV === "development" ? "info" : "warn" },
  bodyLimit: 50 * 1024 * 1024, // 50MB (multipart için)
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

// Tüm AI route'larını register et
await app.register(visionRoutes);
await app.register(priceRoutes);
await app.register(translateRoutes);
await app.register(descriptionRoutes);
await app.register(damageRoutes);
await app.register(assistantRoutes);
await app.register(rentalRoutes);

try {
  // DB ve Redis bağlantılarını doğrula
  await db.query("SELECT 1");
  await cache.client.ping();

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`AI service listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const shutdown = async () => {
  app.log.info("Shutting down AI service...");
  await app.close();
  await db.end();
  await cache.client.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);