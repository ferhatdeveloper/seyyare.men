import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { login, logout, me, refresh, register } from "../lib/tokens.js";

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
  password: z.string().min(8).max(128),
  locale: z.string().default("tr"),
  displayName: z.string().min(2).max(64).optional(),
  role: z.enum(["user", "dealer"]).default("user"),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function getBearer(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const parts = auth.split(" ");
  return parts[0] === "Bearer" ? parts[1] : null;
}

function getUserIdFromJwt(req: FastifyRequest): string | null {
  const token = getBearer(req);
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    try {
      const tokens = await register(parsed.data);
      return reply.send(tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "register_failed";
      const code = msg === "email_taken" || msg === "phone_taken" ? 409 : 400;
      return reply.code(code).send({ error: msg });
    }
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error" });
    }
    try {
      const tokens = await login(parsed.data.identifier, parsed.data.password);
      return reply.send(tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "login_failed";
      return reply.code(401).send({ error: msg });
    }
  });

  app.post("/auth/refresh", async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error" });
    }
    try {
      const tokens = await refresh(parsed.data.refreshToken);
      return reply.send(tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "refresh_failed";
      return reply.code(401).send({ error: msg });
    }
  });

  app.post("/auth/logout", async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error" });
    try {
      await logout(parsed.data.refreshToken);
      return reply.send({ ok: true });
    } catch {
      return reply.send({ ok: true });
    }
  });

  app.get("/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserIdFromJwt(req);
    if (!userId) return reply.code(401).send({ error: "unauthorized" });
    const user = await me(userId);
    if (!user) return reply.code(404).send({ error: "not_found" });
    return reply.send(user);
  });
}