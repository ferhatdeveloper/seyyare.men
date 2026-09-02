import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

export const db = {
  pool: new Pool({ connectionString, max: 20, idleTimeoutMillis: 30_000 }),

  async connect(): Promise<void> {
    await this.pool.query("SELECT 1");
  },

  async end(): Promise<void> {
    await this.pool.end();
  },

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    const res = await this.pool.query<T>(text, params as never[]);
    return { rows: res.rows, rowCount: res.rowCount ?? 0 };
  },
};