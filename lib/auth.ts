/**
 * lib/auth.ts — أساس نظام المصادقة الآمن (SERVER ONLY).
 * تشفير كلمات المرور (bcrypt) + إدارة الجلسات عبر cookie آمن.
 */
import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const SESSION_COOKIE = "abh_session";
const SESSION_DAYS = 150; // مدة صلاحية الجلسة

// ── كلمات المرور ───────────────────────────────────────────
// نخزّن hash فقط، أبدًا النص الصريح. cost=12 توازن جيد بين الأمان والسرعة.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// ── الجلسات ────────────────────────────────────────────────
// توكن عشوائي قوي (256-bit) يُخزَّن في القاعدة ويُرسل في cookie آمن.
function newToken(): string {
  return randomBytes(32).toString("hex");
}

// إنشاء جلسة جديدة لمستخدم + ضبط الكوكي
export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expires]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,                              // JS في المتصفح لا يقدر يقرأها (حماية XSS)
    secure: process.env.NODE_ENV === "production", // HTTPS فقط في الإنتاج
    sameSite: "lax",                             // حماية أساسية من CSRF
    path: "/",
    expires,
  });
}

// قراءة المستخدم الحالي من الكوكي (أو null لو مفيش جلسة صالحة)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await query<{
    id: string; name: string; email: string; phone: string | null;
    city_code: string | null; role: string; member_since: string;
  }>(
    `SELECT u.id, u.name, u.email, u.phone, u.city_code, u.role, u.member_since
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()
     LIMIT 1`,
    [token]
  );

  return rows[0] ?? null;
}

// إنهاء الجلسة الحالية (حذفها من القاعدة + مسح الكوكي)
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
  cookieStore.delete(SESSION_COOKIE);
}