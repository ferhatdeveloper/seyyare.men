// Orchestrator route — SSE streaming endpoint
// Central Agent tarafından yönetilir

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createSSE, sendDone } from "../sse.js";
import { centralAgent } from "../central-agent.js";
import { workerRegistry } from "../worker-registry.js";
import { agentMessageBus } from "../agent-protocol.js";
import { checkpointer } from "../checkpointer.js";
import type { UIDirective } from "../ui-directive.js";

const JWT_SECRET = process.env.PGRST_JWT_SECRET ?? process.env.JWT_SECRET ?? "";

function getUserId(req: { headers: Record<string, unknown> }): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string") return null;
  const token = auth.replace(/^Bearer\s+/i, "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const RunBodySchema = z.object({
  threadId: z.string().optional(),
  text: z.string().min(1).max(4000),
  images: z.array(z.string()).max(8).optional(),
  locale: z.enum(["tr", "en", "ar", "fa", "ku-bad", "ku-sor"]).default("tr"),
  vehicleId: z.string().uuid().optional(),
  vehicleData: z.record(z.string(), z.unknown()).optional(),
});

export async function orchestratorRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /agents/run
   * Central Agent tarafından yönetilen SSE streaming endpoint
   */
  app.post("/agents/run", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = RunBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const userId = getUserId(req);

    // Inject images/vehicleId into vehicleData so task-planner can access
    if (input.images && !input.vehicleData?._images) {
      input.vehicleData = { ...input.vehicleData, _images: input.images };
    }
    if (input.text && !input.vehicleData?._query) {
      input.vehicleData = { ...input.vehicleData, _query: input.text };
    }

    reply.hijack();
    const writer = createSSE(reply);

    try {
      // Emit callback — directive'leri SSE üzerinden stream et
      const emit = async (directive: UIDirective) => {
        writer.send({
          type: "directive",
          agent: "central",
          threadId: input.threadId ?? "",
          data: directive,
        });
      };

      // Central Agent'i çalıştır
      const result = await centralAgent.run(input, emit);

      // Total cost event
      writer.send({
        type: "cost",
        agent: "central",
        threadId: result.context.thread.threadId,
        data: {
          tokens: 0,
          costUsd: result.totalCostUsd,
          threadId: result.context.thread.threadId,
          planId: result.plan?.id,
          primaryIntent: result.primaryIntent,
          tasksCompleted: result.context.results.filter((r) => r.success).length,
        },
      });

      // Done
      sendDone(writer, result.context.thread.threadId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "orchestration_failed";
      app.log.error({ err: msg }, "central agent failed");
      writer.send({
        type: "error",
        agent: "central",
        threadId: input.threadId ?? "",
        data: { error: msg },
      });
      writer.close();
    }
  });

  /**
   * GET /agents/threads/:id
   */
  app.get<{ Params: { id: string } }>("/agents/threads/:id", async (req, reply) => {
    const { id } = req.params;
    const thread = await checkpointer.get(id);
    if (!thread) return reply.code(404).send({ error: "not_found" });
    return reply.send(thread);
  });

  /**
   * POST /agents/threads
   */
  app.post("/agents/threads", async (req, reply) => {
    const body = z
      .object({
        locale: z.string().default("tr"),
        context: z.record(z.string(), z.unknown()).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "validation_error" });

    const userId = getUserId(req);
    const thread = await checkpointer.create({
      userId,
      locale: body.data.locale,
      initialContext: body.data.context,
    });
    await agentMessageBus.createChannel(thread.threadId);
    return reply.send({ threadId: thread.threadId });
  });

  /**
   * GET /agents/models
   */
  app.get("/agents/models", async () => {
    return {
      models: {
        cheap: ["google/gemini-2.5-flash", "anthropic/claude-3-5-haiku", "openai/gpt-4o-mini"],
        premium: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
        free: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-12b-it:free"],
      },
    };
  });

  /**
   * GET /agents/intents
   */
  app.get("/agents/intents", async () => {
    return {
      intents: [
        "create_listing", "search_vehicles", "view_vehicle",
        "negotiate_price", "rent_vehicle", "translate_content",
        "check_damage", "recommend_similar", "fraud_check",
        "support_help", "compare_vehicles", "modify_listing", "general_chat",
      ],
    };
  });

  /**
   * GET /agents/workers
   * Aktif worker listesi (capabilities ile)
   */
  app.get("/agents/workers", async () => {
    return reply.send({ workers: workerRegistry.list() });
  });

  /**
   * GET /agents/threads/:id/plan
   * Thread için son task plan'ı
   */
  app.get<{ Params: { id: string } }>("/agents/threads/:id/plan", async (req, reply) => {
    const plans = await centralAgent.getActivePlans(req.params.id);
    return reply.send({ plans });
  });

  /**
   * GET /agents/threads/:id/messages
   * Thread için agent-to-agent mesajlaşma logu
   */
  app.get<{ Params: { id: string } }>("/agents/threads/:id/messages", async (req, reply) => {
    const channel = await agentMessageBus.getChannel(req.params.id);
    return reply.send({ messages: channel?.messages ?? [] });
  });
}