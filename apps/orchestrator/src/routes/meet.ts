/**
 * In-app meet / WebRTC signaling stub.
 * POST /meet/signal stores SDP/ICE per roomId in an in-memory Map and
 * returns the room's peer messages — enough to scaffold WebRTC without
 * a full SFU/TURN stack. Ephemeral: lost on process restart.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const SignalBodySchema = z.object({
  roomId: z.string().min(1).max(128),
  type: z.enum(["offer", "answer", "ice", "bye"]),
  sdp: z.string().max(64_000).optional(),
  candidate: z.unknown().optional(),
  from: z.string().min(1).max(128).optional(),
});

export type SignalMessage = {
  type: "offer" | "answer" | "ice" | "bye";
  sdp?: string;
  candidate?: unknown;
  from?: string;
  ts: number;
};

/** roomId → recent signaling messages (bounded) */
const rooms = new Map<string, SignalMessage[]>();
const MAX_MESSAGES_PER_ROOM = 40;

export async function meetRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /meet/signal
   * Append SDP/ICE for roomId; respond with current room messages (echo).
   */
  app.post("/meet/signal", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SignalBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        details: parsed.error.flatten(),
      });
    }

    const { roomId, type, sdp, candidate, from } = parsed.data;
    const msg: SignalMessage = {
      type,
      ...(sdp !== undefined ? { sdp } : {}),
      ...(candidate !== undefined ? { candidate } : {}),
      ...(from !== undefined ? { from } : {}),
      ts: Date.now(),
    };

    const list = rooms.get(roomId) ?? [];
    list.push(msg);
    while (list.length > MAX_MESSAGES_PER_ROOM) list.shift();
    rooms.set(roomId, list);

    req.log.info(
      { roomId, type, from, count: list.length },
      "[meet:signal] stored",
    );

    return reply.send({
      ok: true,
      roomId,
      messages: list,
    });
  });
}
