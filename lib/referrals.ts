// lib/referrals.ts — نظام الإحالة «رشّح صاحبك».
// كل عضو له كود ثابت (anchor row في referrals بـ referred_id = NULL).
// لما صاحب يستخدم الكود: نصدّر كوبونًا للطرفين، ونسجّل صف إحالة (redemption).
import { randomBytes } from "crypto";
import { query } from "@/lib/db";

// إعدادات المكافأة (عدّلها بحرية)
export const REFERRER_PCT = 10; // خصم المُحيل
export const REFERRED_PCT = 10; // خصم الصاحب
export const REWARD_DAYS = 30;  // صلاحية الكوبون

function rand(n = 3) { return randomBytes(n).toString("hex").toUpperCase(); }

/** كود الإحالة الثابت للعضو (ينشئه أول مرة). */
export async function getOrCreateCode(userId: string): Promise<string> {
  const existing = await query<any>(
    `SELECT code FROM referrals WHERE referrer_id = $1 AND referred_id IS NULL ORDER BY created_at LIMIT 1`,
    [userId]
  );
  if (existing[0]?.code) return existing[0].code;

  for (let i = 0; i < 5; i++) {
    const code = "ABH-" + rand(3);
    try {
      await query(
        `INSERT INTO referrals (referrer_id, code, status) VALUES ($1, $2, 'pending')`,
        [userId, code]
      );
      return code;
    } catch (e: any) {
      if (String(e?.code) === "23505") continue; // كود مكرّر — جرّب تاني
      throw e;
    }
  }
  throw new Error("could not generate referral code");
}

/** صاحب الكود (anchor فقط). */
export async function resolveReferrer(code: string): Promise<string | null> {
  const rows = await query<any>(
    `SELECT referrer_id FROM referrals WHERE lower(code) = lower($1) AND referred_id IS NULL LIMIT 1`,
    [code]
  );
  return rows[0]?.referrer_id ?? null;
}

/** إحصائيات المُحيل. */
export async function getStats(userId: string): Promise<{ joined: number; rewarded: number }> {
  const rows = await query<any>(
    `SELECT count(*) FILTER (WHERE referred_id IS NOT NULL) AS joined,
            count(*) FILTER (WHERE status = 'rewarded')      AS rewarded
       FROM referrals WHERE referrer_id = $1`,
    [userId]
  );
  return { joined: Number(rows[0]?.joined) || 0, rewarded: Number(rows[0]?.rewarded) || 0 };
}

async function issueCoupon(userId: string, pct: number, label: string): Promise<string | null> {
  const expires = new Date(Date.now() + REWARD_DAYS * 86400 * 1000).toISOString();
  for (let i = 0; i < 5; i++) {
    const code = "REF-" + rand(3);
    try {
      await query(
        `INSERT INTO promo_codes
           (code, kind, discount_percent, fixed_amount, min_order,
            max_uses, per_user_limit, recipient_user_id, label, is_active, expires_at)
         VALUES ($1,'percentage',$2,0,0, 1, 1, $3, $4, true, $5)`,
        [code, pct, userId, label, expires]
      );
      return code;
    } catch (e: any) {
      if (String(e?.code) === "23505") continue;
      throw e;
    }
  }
  return null;
}

export type ClaimResult =
  | { ok: true; yourCode: string | null }
  | { ok: false; error: "invalid_code" | "self" | "already_referred" | "server" };

/** صاحب (friendId) يستخدم كود إحالة → مكافأة للطرفين. */
export async function claimReferral(code: string, friendId: string): Promise<ClaimResult> {
  try {
    const referrerId = await resolveReferrer(code);
    if (!referrerId) return { ok: false, error: "invalid_code" };
    if (referrerId === friendId) return { ok: false, error: "self" };

    const prior = await query<any>(`SELECT 1 FROM referrals WHERE referred_id = $1 LIMIT 1`, [friendId]);
    if (prior.length) return { ok: false, error: "already_referred" };

    const referrerCoupon = await issueCoupon(referrerId, REFERRER_PCT, "مكافأة إحالة");
    const referredCoupon = await issueCoupon(friendId, REFERRED_PCT, "هدية ترحيب");

    // صف الإحالة (redemption) — كود فريد مشتق من كود المُحيل + جزء من معرّف الصاحب.
    const redemptionCode = `${code}-${friendId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, code, status, reward_promo_referrer, reward_promo_referred, rewarded_at)
       VALUES ($1, $2, $3, 'rewarded', $4, $5, now())
       ON CONFLICT (code) DO NOTHING`,
      [referrerId, friendId, redemptionCode, referrerCoupon, referredCoupon]
    );

    return { ok: true, yourCode: referredCoupon };
  } catch (err) {
    console.error("claimReferral failed:", err);
    return { ok: false, error: "server" };
  }
}