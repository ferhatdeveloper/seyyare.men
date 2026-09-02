import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";

const PORT = Number(process.env.PORT ?? 5000);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = Fastify({
  logger: {
    transport:
      NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

await app.register(helmet);
await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

app.get("/health", async () => ({
  status: "ok",
  service: "auth",
  env: NODE_ENV,
  ts: new Date().toISOString(),
}));

await app.register(authRoutes, { prefix: "/" });

try {
  await db.connect();
  await redis.connect();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Auth service listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const shutdown = async () => {
  app.log.info("Shutting down...");
  await app.close();
  await db.end();
  await redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);