import { Pool } from 'pg';

// Pool واحد يتعاد استخدامه عبر كل الطلبات (مهم في dev مع الـhot-reload)
const globalForDb = globalThis as unknown as { _abhPool?: Pool };

export const pool =
  globalForDb._abhPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    // (جديد) تحسينات أداء:
    connectionTimeoutMillis: 5_000, // ما نستناش أكتر من 5 ثواني على كونكشن جديد
    keepAlive: true,                // يمنع قطع كونكشنز الـpool المفتوحة على شبكات فيها NAT/loadbalancer
    statement_timeout: 8_000,       // أي كويري عالق يتقطع بعد 8 ثواني بدل ما يعلّق الـrequest للأبد
  });

if (process.env.NODE_ENV !== 'production') globalForDb._abhPool = pool;

// دالة مختصرة لتنفيذ استعلام
export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
