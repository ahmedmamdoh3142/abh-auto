import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // نجيب المستخدم بالـhash
    const rows = await query<{
      id: string; name: string; password_hash: string | null;
    }>(
      `SELECT id, name, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    const user = rows[0];

    // رسالة خطأ موحّدة سواء الإيميل غير موجود أو الباسوورد غلط
    // (حتى لا نكشف أي الإيميلات مسجّلة)
    const generic = NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );

    if (!user || !user.password_hash) {
      // نتحقق وهميًا للحفاظ على توقيت ثابت (ضد timing attacks)
      await verifyPassword(password, "$2b$12$" + "x".repeat(53));
      return generic;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return generic;

    // الدخول صحيح — افتح جلسة
    await createSession(user.id);

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}