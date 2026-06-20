import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

/**
 * تسجيل الدخول بالاسم (name) + كلمة المرور — بدل الإيميل.
 * نقبل الحقل سواء جاء باسم `name` أو `email` (توافق مع الواجهة القديمة)،
 * ونعامله كاسم مستخدم في كل الحالات.
 *
 * ملاحظة: الاسم غير فريد بطبيعته. لو وُجد أكثر من حساب بنفس الاسم وبنفس
 * كلمة المرور (نادر)، نسجّل الدخول لأول تطابق. الأنسب أن تكون الأسماء فريدة
 * للحسابات التي تسجّل الدخول (admin/staff/partner).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ندعم الحقلين: لو الواجهة لسه بتبعت `email` نعتبره الاسم.
    const rawName = String(body.name ?? body.username ?? body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!rawName || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // نجيب كل المستخدمين بنفس الاسم (case-insensitive) ومعاهم الـhash.
    const rows = await query<{
      id: string; name: string; password_hash: string | null;
    }>(
      `SELECT id, name, password_hash
         FROM users
        WHERE lower(name) = lower($1)
        ORDER BY created_at ASC`,
      [rawName]
    );

    // رسالة خطأ موحّدة (لا نكشف إن الاسم موجود أو لا)
    const generic = NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );

    if (rows.length === 0) {
      // تحقّق وهمي لتثبيت التوقيت (ضد timing attacks)
      await verifyPassword(password, "$2b$12$" + "x".repeat(53));
      return generic;
    }

    // نجرّب كل حساب بنفس الاسم لأول تطابق صحيح لكلمة المرور.
    let matched: { id: string; name: string } | null = null;
    for (const u of rows) {
      if (!u.password_hash) continue;
      const ok = await verifyPassword(password, u.password_hash);
      if (ok) { matched = { id: u.id, name: u.name }; break; }
    }

    if (!matched) return generic;

    await createSession(matched.id);
    return NextResponse.json({ ok: true, user: { id: matched.id, name: matched.name } });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}