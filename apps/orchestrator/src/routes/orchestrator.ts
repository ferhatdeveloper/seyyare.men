// Orchestrator route — SSE streaming endpoint
// POST /agents/run — ana orkestrasyon
// GET /agents/threads/:id — thread state

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createSSE, sendDone } from "../sse.js";
import { orchestrate } from "../graph.js";
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
   * SSE streaming endpoint — orchestrator'dan mobil'e directive stream
   */
  app.post("/agents/run", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = RunBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const userId = getUserId(req);

    // SSE reply — Fastify reply.hijack ile stream başlat
    reply.hijack();
    const writer = createSSE(reply);

    try {
      // Emit callback — her directive SSE üzerinden stream edilir
      const emit = async (directive: UIDirective) => {
        writer.send({
          type: "directive",
          agent: "orchestrator",
          threadId: input.threadId ?? "",
          data: directive,
        });
      };

      const ctx = await orchestrate(input, emit);

      // Completion: total cost + threadId'yi gönder
      writer.send({
        type: "cost",
        agent: "orchestrator",
        threadId: ctx.thread.threadId,
        data: {
          tokens: ctx.thread.totalTokens,
          costUsd: ctx.thread.totalCostUsd,
          threadId: ctx.thread.threadId,
        },
      });

      // Done event'i gönder (mobil taraf SSE'yi kapatır)
      sendDone(writer, ctx.thread.threadId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "orchestration_failed";
      app.log.error({ err: msg }, "orchestration failed");
      writer.send({
        type: "error",
        agent: "orchestrator",
        threadId: input.threadId ?? "",
        data: { error: msg },
      });
      writer.close();
    }
  });

  /**
   * GET /agents/threads/:id
   * Thread state getir
   */
  app.get<{ Params: { id: string } }>("/agents/threads/:id", async (req, reply) => {
    const { id } = req.params;
    const thread = await checkpointer.get(id);
    if (!thread) return reply.code(404).send({ error: "not_found" });
    return reply.send(thread);
  });

  /**
   * POST /agents/threads
   * Yeni thread oluştur
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
    return reply.send({ threadId: thread.threadId });
  });

  /**
   * GET /agents/models
   * Mevcut model registry
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
   * Bilinen intent listesi (debug için)
   */
  app.get("/agents/intents", async () => {
    return {
      intents: [
        "create_listing",
        "search_vehicles",
        "view_vehicle",
        "negotiate_price",
        "rent_vehicle",
        "translate_content",
        "check_damage",
        "recommend_similar",
        "fraud_check",
        "support_help",
        "general_chat",
      ],
    };
  });
}