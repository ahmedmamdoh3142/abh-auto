import { Pool } from 'pg';

// Pool واحد يتعاد استخدامه عبر كل الطلبات (مهم في dev مع الـhot-reload)
const globalForDb = globalThis as unknown as { _abhPool?: Pool };

export const pool =
  globalForDb._abhPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') globalForDb._abhPool = pool;

// دالة مختصرة لتنفيذ استعلام
export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
