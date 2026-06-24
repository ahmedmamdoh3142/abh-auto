// lib/wheel.ts — منطق عجلة الحظ (server-side).
// السيرفر هو اللي يختار القطاع (weighted) ويصدّر كوبونًا فريدًا للفائز ويسجّل اللفّة.
// الكوبون يتسجّل في promo_codes كـ recipient_user_id (شخصي، مرة واحدة) فيتحقّق
// تلقائيًا عبر منطق البرومو الموجود، ويظهر في «أكوادي» في البروفايل.
import { randomBytes } from "crypto";
import { query } from "@/lib/db";

export interface WheelConfig {
  isActive: boolean;
  title: { ar?: string; en?: string };
  subtitle: { ar?: string; en?: string } | null;
  spinDay: number;
  cooldownH: number;
  requireLogin: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}
export interface WheelSegment {
  id: number;
  label: { ar?: string; en?: string };
  kind: "promo_percent" | "promo_fixed" | "gift_service" | "nothing";
  value: number;
  giftServiceId: number | null;
  weight: number;
  hex: string;
  couponDays: number;
  minOrder: number;
}
export interface SpinResult {
  ok: boolean;
  error?: string;
  segmentId?: number;
  segmentIndex?: number;
  won?: boolean;
  code?: string | null;
  expiresAt?: string | null;
  nextAt?: string | null;
}

export async function getWheelConfig(): Promise<WheelConfig | null> {
  const rows = await query<any>(
    `SELECT is_active, title, subtitle, spin_day, per_user_cooldown_h, require_login, starts_at, expires_at
       FROM wheel_config WHERE id = 1 LIMIT 1`
  );
  const r = rows[0];
  if (!r) return null;
  return {
    isActive: !!r.is_active,
    title: r.title ?? { ar: "عجلة الحظ", en: "Lucky Wheel" },
    subtitle: r.subtitle ?? null,
    spinDay: Number(r.spin_day) ?? 5,
    cooldownH: Number(r.per_user_cooldown_h) || 168,
    requireLogin: r.require_login !== false,
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  };
}

export async function getSegments(): Promise<WheelSegment[]> {
  const rows = await query<any>(
    `SELECT id, label, kind, value, gift_service_id, weight, hex, coupon_days, min_order
       FROM wheel_segments WHERE is_active = true ORDER BY sort, id`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    label: r.label ?? {},
    kind: r.kind,
    value: Number(r.value) || 0,
    giftServiceId: r.gift_service_id != null ? Number(r.gift_service_id) : null,
    weight: Math.max(0, Number(r.weight) || 0),
    hex: r.hex || "#cbcdcd",
    couponDays: Number(r.coupon_days) || 14,
    minOrder: Number(r.min_order) || 0,
  }));
}

/** آخر لفّة للمستخدم (للتحقّق من المهلة). */
export async function lastSpinAt(userId: string): Promise<Date | null> {
  const rows = await query<any>(
    `SELECT spun_at FROM wheel_spins WHERE user_id = $1 ORDER BY spun_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.spun_at ? new Date(rows[0].spun_at) : null;
}

/** هل يقدر يلفّ الآن؟ */
export async function canSpin(userId: string, cfg: WheelConfig): Promise<{ allowed: boolean; nextAt: string | null }> {
  const last = await lastSpinAt(userId);
  if (!last) return { allowed: true, nextAt: null };
  const next = new Date(last.getTime() + cfg.cooldownH * 3600 * 1000);
  return next <= new Date() ? { allowed: true, nextAt: null } : { allowed: false, nextAt: next.toISOString() };
}

/** اختيار قطاع بالاحتمالية الموزونة. */
export function pickSegment(segs: WheelSegment[]): WheelSegment | null {
  if (segs.length === 0) return null;
  const total = segs.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (total <= 0) return segs[Math.floor(Math.random() * segs.length)];
  let r = Math.random() * total;
  for (const s of segs) { r -= Math.max(0, s.weight); if (r <= 0) return s; }
  return segs[segs.length - 1];
}

function genCode(): string {
  return "SPIN-" + randomBytes(3).toString("hex").toUpperCase();
}

/** إصدار كوبون شخصي للفائز. يرجّع الكود + تاريخ الانتهاء، أو null لو «نصيبك المرة الجاية». */
async function issueCoupon(seg: WheelSegment, userId: string): Promise<{ code: string; expiresAt: string } | null> {
  if (seg.kind === "nothing") return null;

  const expires = new Date(Date.now() + seg.couponDays * 86400 * 1000);
  const label = seg.label?.ar || seg.label?.en || "عجلة الحظ";
  let kind = "fixed";
  let discountPercent = 0;
  let fixedAmount = 0;

  if (seg.kind === "promo_percent") { kind = "percentage"; discountPercent = seg.value; }
  else { kind = "fixed"; fixedAmount = seg.value; } // promo_fixed أو gift_service → خصم بقيمة الهدية

  // كود فريد (مع إعادة محاولة بسيطة عند التصادم النادر).
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = genCode();
    try {
      await query(
        `INSERT INTO promo_codes
           (code, kind, discount_percent, fixed_amount, min_order,
            max_uses, per_user_limit, recipient_user_id, label, is_active, expires_at)
         VALUES ($1,$2,$3,$4,$5, 1, 1, $6, $7, true, $8)`,
        [code, kind, discountPercent, fixedAmount, seg.minOrder, userId, label, expires.toISOString()]
      );
      return { code, expiresAt: expires.toISOString() };
    } catch (e: any) {
      if (String(e?.code) === "23505") continue; // unique violation → جرّب كودًا آخر
      throw e;
    }
  }
  return null;
}

/** اللفّة الكاملة: تحقّق → اختيار → إصدار → تسجيل. */
export async function spin(userId: string): Promise<SpinResult> {
  const cfg = await getWheelConfig();
  if (!cfg || !cfg.isActive) return { ok: false, error: "wheel_inactive" };

  const now = new Date();
  if (cfg.startsAt && new Date(cfg.startsAt) > now) return { ok: false, error: "not_started" };
  if (cfg.expiresAt && new Date(cfg.expiresAt) < now) return { ok: false, error: "ended" };

  const gate = await canSpin(userId, cfg);
  if (!gate.allowed) return { ok: false, error: "cooldown", nextAt: gate.nextAt };

  const segs = await getSegments();
  if (segs.length === 0) return { ok: false, error: "no_segments" };

  const seg = pickSegment(segs)!;
  const segmentIndex = segs.findIndex((s) => s.id === seg.id);

  const coupon = await issueCoupon(seg, userId);
  const won = !!coupon;

  await query(
    `INSERT INTO wheel_spins (user_id, segment_id, won, promo_code) VALUES ($1,$2,$3,$4)`,
    [userId, seg.id, won, coupon?.code ?? null]
  );

  return {
    ok: true,
    segmentId: seg.id,
    segmentIndex,
    won,
    code: coupon?.code ?? null,
    expiresAt: coupon?.expiresAt ?? null,
  };
}