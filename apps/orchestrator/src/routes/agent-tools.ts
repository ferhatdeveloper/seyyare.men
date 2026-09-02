// Agent Tools Routes — tool çağrıları için HTTP endpoint
// (Production'da tool'lar doğrudan agent içinden çağrılır ama debug/test için HTTP exposure)

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeTool, getAgentTools } from "../tools.js";
import { memory } from "../memory.js";

export async function agentToolsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /agents/tools/:agentName
   * Belirli bir agent için kullanılabilir tool listesi
   */
  app.get<{ Params: { agentName: string } }>("/agents/tools/:agentName", async (req, reply) => {
    const tools = getAgentTools(req.params.agentName);
    return reply.send({ agent: req.params.agentName, tools });
  });

  /**
   * POST /agents/tools/:toolName
   * Tool çağrısı (debug/testing için)
   */
  app.post<{ Params: { toolName: string }; Body: Record<string, unknown> }>(
    "/agents/tools/:toolName",
    async (req, reply) => {
      try {
        const result = await executeTool(req.params.toolName, req.body);
        return reply.send({ success: true, result });
      } catch (err) {
        return reply.code(400).send({
          success: false,
          error: err instanceof Error ? err.message : "tool_failed",
        });
      }
    },
  );

  /**
   * GET /agents/memory/preferences/:userId
   * Kullanıcı tercihleri
   */
  app.get<{ Params: { userId: string } }>("/agents/memory/preferences/:userId", async (req, reply) => {
    const prefs = await memory.getPreferences(req.params.userId);
    return reply.send(prefs);
  });

  /**
   * POST /agents/memory/preferences/:userId
   * Tercih güncelle
   */
  app.post<{ Params: { userId: string }; Body: { key: string; value: unknown } }>(
    "/agents/memory/preferences/:userId",
    async (req, reply) => {
      const { key, value } = req.body;
      await memory.setPreference(
        req.params.userId,
        key as "preferredLocale" | "preferredCurrency" | "favoriteBrands" | "priceRange" | "preferredBodyTypes" | "preferredFuelTypes",
        value,
      );
      return reply.send({ success: true });
    },
  );

  /**
   * GET /agents/memory/searches/:userId
   * Kullanıcının son aramaları
   */
  app.get<{ Params: { userId: string }; Querystring: { limit?: string } }>(
    "/agents/memory/searches/:userId",
    async (req, reply) => {
      const limit = Number(req.query.limit ?? 10);
      const searches = await memory.getRecentSearches(req.params.userId, limit);
      return reply.send({ searches });
    },
  );

  /**
   * POST /agents/memory/record-search
   * Aramayı kaydet
   */
  app.post<{ Body: { userId: string; query: string; filters?: Record<string, unknown> } }>(
    "/agents/memory/record-search",
    async (req, reply) => {
      const { userId, query, filters } = req.body;
      await memory.recordSearch(userId, query, filters);
      return reply.send({ success: true });
    },
  );

  /**
   * POST /agents/cache/invalidate
   * Agent cache invalidation (vehicle güncellendiğinde)
   */
  app.post<{ Body: { agent?: string; vehicleId?: string; pattern?: string } }>(
    "/agents/cache/invalidate",
    async (req, reply) => {
      const { agent, vehicleId, pattern } = req.body;
      let cleared = 0;
      if (vehicleId) {
        await memory.invalidateVehicleCaches(vehicleId);
        cleared++;
      }
      if (agent) {
        await memory.invalidateAgentCache(agent, pattern);
        cleared++;
      }
      return reply.send({ cleared });
    },
  );
}