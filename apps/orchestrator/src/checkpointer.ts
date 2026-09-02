// PostgresSaver benzeri thread state checkpointer
// Konuşma bazlı state saklama + cross-thread long-term memory

import { nanoid } from "nanoid";
import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";

export interface ThreadState {
  threadId: string;
  userId: string | null;
  intent: string | null;
  locale: string;
  messages: Array<{ role: string; content: string; agent?: string; ts: number }>;
  context: Record<string, unknown>;
  directives: unknown[];
  privateData: Record<string, unknown>; // alıcı max WTP vb. — asla client'a sızmaz
  turnCount: number;
  totalCostUsd: number;
  totalTokens: number;
  status: "active" | "paused" | "completed" | "failed";
  resumeToken: string | null;
  createdAt: number;
  updatedAt: number;
}

const THREAD_TTL_SEC = 60 * 60 * 24 * 30; // 30 gün

export const checkpointer = {
  async get(threadId: string): Promise<ThreadState | null> {
    // Önce Redis'ten dene (cache)
    const cached = await redis.get<ThreadState>(`thread:${threadId}`);
    if (cached) return cached;

    // DB'den yükle
    const res = await db.query<{
      id: string;
      user_id: string | null;
      intent: string | null;
      locale: string;
      messages: unknown;
      context: unknown;
      private_data: unknown;
      turn_count: number;
      total_cost_usd: number;
      total_tokens: number;
      status: string;
      resume_token: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, user_id, intent, locale, messages, context, private_data,
              turn_count, total_cost_usd, total_tokens, status, resume_token,
              created_at, updated_at
       FROM public.agent_threads WHERE id = $1`,
      [threadId],
    );

    const row = res.rows[0];
    if (!row) return null;

    const state: ThreadState = {
      threadId: row.id,
      userId: row.user_id,
      intent: row.intent,
      locale: row.locale,
      messages: row.messages as ThreadState["messages"],
      context: row.context as Record<string, unknown>,
      directives: [],
      privateData: row.private_data as Record<string, unknown>,
      turnCount: row.turn_count,
      totalCostUsd: Number(row.total_cost_usd),
      totalTokens: row.total_tokens,
      status: row.status as ThreadState["status"],
      resumeToken: row.resume_token,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };

    await redis.set(`thread:${threadId}`, state, 60 * 60); // 1 saat cache
    return state;
  },

  async create(opts: {
    userId: string | null;
    locale: string;
    initialContext?: Record<string, unknown>;
  }): Promise<ThreadState> {
    const threadId = nanoid(24);
    const now = Date.now();

    const state: ThreadState = {
      threadId,
      userId: opts.userId,
      intent: null,
      locale: opts.locale,
      messages: [],
      context: opts.initialContext ?? {},
      directives: [],
      privateData: {},
      turnCount: 0,
      totalCostUsd: 0,
      totalTokens: 0,
      status: "active",
      resumeToken: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.query(
      `INSERT INTO public.agent_threads (id, user_id, locale, messages, context, private_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [
        threadId,
        opts.userId,
        opts.locale,
        JSON.stringify(state.messages),
        JSON.stringify(state.context),
        JSON.stringify(state.privateData),
      ],
    );

    await redis.set(`thread:${threadId}`, state, THREAD_TTL_SEC);
    return state;
  },

  async update(threadId: string, patch: Partial<ThreadState>): Promise<ThreadState> {
    const current = await this.get(threadId);
    if (!current) throw new Error(`thread ${threadId} not found`);

    const next: ThreadState = {
      ...current,
      ...patch,
      threadId: current.threadId,
      updatedAt: Date.now(),
    };

    await db.query(
      `UPDATE public.agent_threads SET
        user_id = COALESCE($2, user_id),
        intent = COALESCE($3, intent),
        locale = $4,
        messages = $5,
        context = $6,
        private_data = $7,
        turn_count = $8,
        total_cost_usd = $9,
        total_tokens = $10,
        status = $11,
        resume_token = COALESCE($12, resume_token),
        updated_at = now()
       WHERE id = $1`,
      [
        threadId,
        next.userId,
        next.intent,
        next.locale,
        JSON.stringify(next.messages),
        JSON.stringify(next.context),
        JSON.stringify(next.privateData),
        next.turnCount,
        next.totalCostUsd,
        next.totalTokens,
        next.status,
        next.resumeToken,
      ],
    );

    await redis.set(`thread:${threadId}`, next, 60 * 60);
    return next;
  },

  async appendMessage(
    threadId: string,
    message: { role: string; content: string; agent?: string },
  ): Promise<void> {
    const state = await this.get(threadId);
    if (!state) return;
    const ts = Date.now();
    await this.update(threadId, {
      messages: [...state.messages, { ...message, ts }],
      turnCount: state.turnCount + 1,
    });
  },

  async setPrivate(threadId: string, key: string, value: unknown): Promise<void> {
    const state = await this.get(threadId);
    if (!state) return;
    await this.update(threadId, {
      privateData: { ...state.privateData, [key]: value },
    });
  },

  async pause(threadId: string, resumeToken: string): Promise<void> {
    await this.update(threadId, { status: "paused", resumeToken });
  },

  async complete(threadId: string): Promise<void> {
    await this.update(threadId, { status: "completed" });
  },
};