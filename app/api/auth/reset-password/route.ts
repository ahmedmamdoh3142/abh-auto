/**
 * app/api/auth/reset-password/route.ts — استعادة كلمة المرور برقم الهاتف + OTP.
 *
 *   POST { phone, code, password }
 *     • يتحقق من رمز OTP (purpose=reset) بنفس منطق /api/otp PUT.
 *     • يلاقي حساب الدخول المرتبط بالرقم (يستثني حسابات الـleads: nologin).
 *     • يعيّن كلمة مرور جديدة (bcrypt) ويستهلك الرمز.
 *
 * أمان: رسالة خطأ موحّدة لا تكشف إن الرقم مسجّل أو لا (invalid_or_expired).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { toE164 } from "@/lib/whatsapp";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "change-me-in-env";
const onlyDigits = (s: string) => s.replace(/[^0-9]/g, "");

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code + OTP_SECRET).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = toE164(body.phone);
    const code = body.code ? String(body.code).trim() : "";
    const password = String(body.password ?? "");

    if (!phone || !code) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });

    // ── تحقّق من رمز الاستعادة (purpose=reset) ──
    const rows = await query<any>(
      `SELECT id, code_hash, attempts, max_attempts, expires_at, consumed_at
         FROM otp_codes
        WHERE phone = $1 AND purpose = 'reset'
        ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    const otp = rows[0];
    if (!otp) return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });
    if (otp.consumed_at) return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });
    if (new Date(otp.expires_at).getTime() < Date.now())
      return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });
    if (otp.attempts >= otp.max_attempts)
      return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });

    if (hashCode(code) !== otp.code_hash) {
      await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
      return NextResponse.json({ ok: false, error: "wrong_code" }, { status: 400 });
    }

    // ── لاقي حساب الدخول المرتبط بالرقم (استثنِ الـleads) ──
    const digits = onlyDigits(phone);
    const users = await query<{ id: string }>(
      `SELECT id FROM users
        WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') = $1
          AND (password_hash IS NULL OR password_hash NOT LIKE 'nologin:%')
        ORDER BY created_at ASC
        LIMIT 1`,
      [digits]
    );
    const user = users[0];

    // نستهلك الرمز في كل الأحوال (عشان ما يتعادش استخدامه)
    await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [otp.id]);

    // لا نكشف إن الرقم غير مسجّل — نفس رسالة النجاح الشكلية.
    if (!user) return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });

    const hash = await hashPassword(password);
    await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [user.id, hash]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-password failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}