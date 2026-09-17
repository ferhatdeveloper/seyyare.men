import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import { orchestratorRoutes } from "./routes/orchestrator.js";
import { voiceRoutes } from "./routes/voice.js";
import { adminRoutes } from "./routes/admin.js";
import { agentToolsRoutes } from "./routes/agent-tools.js";
import { centralMonitoringRoutes } from "./routes/central-monitoring.js";
import { abTestingRoutes } from "./routes/ab-testing.js";
import { driverRoutes } from "./routes/drivers.js";
import { rideRoutes } from "./routes/rides.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { meetRoutes } from "./routes/meet.js";
import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { closeQueues } from "./queue/queues.js";
import { startWorkers, stopWorkers, shouldStartWorkers } from "./queue/workers.js";

const PORT = Number(process.env.PORT ?? 4050);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = Fastify({
  logger: {
    transport:
      NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
  bodyLimit: 50 * 1024 * 1024,
});

await app.register(cors, { origin: true, credentials: true });
await app.register(sensible);
await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

app.get("/health", async () => ({
  status: "ok",
  service: "orchestrator",
  architecture: "central-agent-multi-worker",
  env: NODE_ENV,
  openrouter: !!process.env.OPENROUTER_API_KEY,
  db: "connected",
  redis: "connected",
  queueWorkers: shouldStartWorkers(),
  ts: new Date().toISOString(),
}));

await app.register(orchestratorRoutes, { prefix: "/" });
await app.register(voiceRoutes, { prefix: "/" });
await app.register(adminRoutes, { prefix: "/" });
await app.register(agentToolsRoutes, { prefix: "/" });
await app.register(centralMonitoringRoutes, { prefix: "/" });
await app.register(abTestingRoutes, { prefix: "/" });
await app.register(driverRoutes, { prefix: "/" });
await app.register(rideRoutes, { prefix: "/" });
await app.register(webhookRoutes, { prefix: "/" });
await app.register(meetRoutes, { prefix: "/" });

try {
  await db.query("SELECT 1");
  await redis.client.ping();

  await startWorkers();

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Orchestrator (Central Agent) listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const shutdown = async () => {
  app.log.info("Shutting down orchestrator...");
  await app.close();
  await stopWorkers();
  await closeQueues();
  await db.end();
  await redis.client.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);