import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const password = String(body.password ?? "");

    // تحقّق من جانب الخادم (لا نثق بالواجهة وحدها)
    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    // هل الإيميل مستخدم بالفعل؟
    const existing = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (existing.length > 0) {
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    }

    // تشفير كلمة المرور وإنشاء المستخدم
    const password_hash = await hashPassword(password);
    const rows = await query<{ id: string; name: string }>(
      `INSERT INTO users (name, email, phone, city_code, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name`,
      [name, email, phone, city, password_hash]
    );

    const user = rows[0];

    // افتح جلسة فورًا بعد التسجيل
    await createSession(user.id);

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (err) {
    console.error("POST /api/auth/register failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}