/**
 * app/api/otp/route.ts — إرسال + التحقق من رمز OTP عبر واتساب.
 *
 *   POST  { phone, purpose? }        → يولّد رمزًا، يخزّنه (hash)، ويضيفه لطابور الواتساب.
 *   PUT   { phone, code, purpose? }  → يتحقق من الرمز (hash + صلاحية + محاولات).
 *
 * purpose: 'booking' (افتراضي) للحجز بدون تسجيل دخول، أو 'reset' لاستعادة كلمة
 *   المرور. الفصل بينهما يمنع استخدام كود غرضٍ ما في غرض آخر.
 *
 * أمان:
 *   • لا نخزّن الرمز الخام أبدًا — فقط sha256(code + OTP_SECRET).
 *   • صلاحية 5 دقائق، 5 محاولات كحد أقصى، وحد معدّل (لا أكثر من رمز كل 60 ثانية لكل غرض).
 *   • قبل ربط المزوّد: الرمز يُسجَّل في الطابور لكن لا يُرسل فعليًا — للاختبار
 *     يمكن قراءة آخر رمز من جدول otp_codes (أو لوج الخادم) مؤقتًا.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enqueueOtp, toE164 } from "@/lib/whatsapp";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "change-me-in-env";
const TTL_MS = 5 * 60 * 1000;      // 5 دقائق
const RESEND_COOLDOWN_MS = 60 * 1000; // دقيقة بين الطلبات

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code + OTP_SECRET).digest("hex");
}
function genCode(): string {
  return String(crypto.randomInt(100000, 1000000)); // 6 أرقام
}

// ── إرسال رمز ──
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = toE164(body.phone);
    if (!phone) return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
    const purpose = body.purpose === "reset" ? "reset" : "booking";

    // حد المعدّل: امنع طلبًا جديدًا خلال 60 ثانية (لنفس الغرض)
    const recent = await query<any>(
      `SELECT created_at FROM otp_codes WHERE phone = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
      [phone, purpose]
    );
    if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ ok: false, error: "too_soon" }, { status: 429 });
    }

    const code = genCode();
    const expiresAt = new Date(Date.now() + TTL_MS);

    await query(
      `INSERT INTO otp_codes (phone, code_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [phone, hashCode(code), purpose, expiresAt]
    );

    // أضف للطابور (لا يُرسل فعليًا حتى يُفعَّل المزوّد)
    await enqueueOtp({ phone, code });

    // قبل الربط فقط: اطبع الرمز في اللوج للاختبار. احذف هذا بعد الربط.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] ${phone} (${purpose}) → ${code} (debug only)`);
    }

    return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("POST /api/otp failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// ── التحقق من رمز ──
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const phone = toE164(body.phone);
    const code = body.code ? String(body.code).trim() : "";
    const purpose = body.purpose === "reset" ? "reset" : "booking";
    if (!phone || !code) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

    const rows = await query<any>(
      `SELECT id, code_hash, attempts, max_attempts, expires_at, consumed_at
         FROM otp_codes
        WHERE phone = $1 AND purpose = $2
        ORDER BY created_at DESC LIMIT 1`,
      [phone, purpose]
    );
    const otp = rows[0];
    if (!otp) return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
    if (otp.consumed_at) return NextResponse.json({ ok: false, error: "already_used" }, { status: 400 });
    if (new Date(otp.expires_at).getTime() < Date.now())
      return NextResponse.json({ ok: false, error: "expired" }, { status: 400 });
    if (otp.attempts >= otp.max_attempts)
      return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });

    const matches = hashCode(code) === otp.code_hash;
    if (!matches) {
      await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
      return NextResponse.json({ ok: false, error: "wrong_code" }, { status: 400 });
    }

    await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [otp.id]);
    return NextResponse.json({ ok: true, verified: true });
  } catch (err) {
    console.error("PUT /api/otp failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}