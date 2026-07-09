import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

/* يولّد إيميلًا داخليًا فريدًا من اسم المستخدم (العمود فريد/إلزامي في القاعدة). */
function genInternalEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "user";
  return `${slug}-${randomBytes(4).toString("hex")}@abh-auto.local`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    let email = String(body.email ?? "").trim().toLowerCase(); // اختياري الآن
    const phone = body.phone ? String(body.phone).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const password = String(body.password ?? "");

    // الإيميل لم يعد مطلوبًا — الاسم + الباسوورد فقط.
    if (!name || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    // اسم المستخدم لازم يكون فريدًا لأنه معرّف الدخول (نستثني حسابات الـleads).
    const nameExists = await query<{ id: string }>(
      `SELECT id FROM users
        WHERE lower(name) = lower($1)
          AND (password_hash IS NULL OR password_hash NOT LIKE 'nologin:%')
        LIMIT 1`,
      [name]
    );
    if (nameExists.length > 0) {
      return NextResponse.json({ ok: false, error: "name_taken" }, { status: 409 });
    }

    // لو أُرسل إيميل: تحقّق من صحته وتفرّده. وإلا: ولّد واحدًا داخليًا.
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
      }
      const existing = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
      if (existing.length > 0) {
        return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
      }
    } else {
      email = genInternalEmail(name);
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