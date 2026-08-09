// lib/promo.ts — منطق أكواد الخصم (server-side). يُستخدم في API التحقق والحجز.
import { query } from "@/lib/db";

export type PromoKind = "percentage" | "fixed" | "service_percent" | "service_each" | "gift_service";

export interface PromoServiceRule {
  serviceId: number;
  amountMode: "percent" | "fixed";
  value: number;
}

export interface PromoCode {
  id: string;
  code: string;
  kind: PromoKind;
  label: string | null;
  description: string | null;
  discountPercent: number;     // للنوع percentage / service_percent
  fixedAmount: number;         // للنوع fixed
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  services: PromoServiceRule[]; // للنوعين service_*
  giftServiceId: number | null; // للنوع gift_service — الخدمة اللي تتضاف مجانًا
  commissionPercent: number | null; // (جديد) عمولة مؤثر اختيارية — % من كل حجز مدفوع بهذا الكود
}

export type PromoError =
  | "not_found" | "inactive" | "expired" | "not_started"
  | "used_up" | "min_order" | "no_match" | "per_user";

/** بند طلب مبسّط نحسب عليه الخصم. */
export interface PromoLine {
  serviceId: number;
  unit: number; // سعر البند
}

/** جلب كود كامل (مع خدماته) بالكود النصّي. */
export async function getPromoByCode(codeInput: string): Promise<PromoCode | null> {
  const code = codeInput.trim();
  if (!code) return null;
  const rows = await query<any>(
    `SELECT id, code, kind, label, description,
            COALESCE(discount_percent,0) AS discount_percent,
            fixed_amount, min_order, max_uses, used_count,
            per_user_limit, is_active, starts_at, expires_at, gift_service_id,
            commission_percent
     FROM promo_codes WHERE lower(code) = lower($1) LIMIT 1`,
    [code]
  );
  const p = rows[0];
  if (!p) return null;

  const svcRows = await query<any>(
    `SELECT service_id, amount_mode, value
     FROM promo_code_services WHERE promo_id = $1`,
    [p.id]
  );

  return {
    id: p.id,
    code: p.code,
    kind: p.kind as PromoKind,
    label: p.label ?? null,
    description: p.description ?? null,
    discountPercent: Number(p.discount_percent) || 0,
    fixedAmount: Number(p.fixed_amount) || 0,
    minOrder: Number(p.min_order) || 0,
    maxUses: p.max_uses != null ? Number(p.max_uses) : null,
    usedCount: Number(p.used_count) || 0,
    perUserLimit: p.per_user_limit != null ? Number(p.per_user_limit) : null,
    isActive: !!p.is_active,
    startsAt: p.starts_at ? new Date(p.starts_at).toISOString() : null,
    expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
    services: svcRows.map((s) => ({
      serviceId: Number(s.service_id),
      amountMode: s.amount_mode as "percent" | "fixed",
      value: Number(s.value) || 0,
    })),
    giftServiceId: p.gift_service_id != null ? Number(p.gift_service_id) : null,
    commissionPercent: p.commission_percent != null ? Number(p.commission_percent) : null,
  };
}

/** فحص صلاحية الكود (بدون حساب) — زمن/تفعيل/حد كلّي/حد للمستخدم.
 *  ملاحظة: per_user_limit يُحسب على الاستخدامات المؤكّدة فقط (paid_at IS NOT NULL)
 *  حتى لا يُمنع العميل بسبب حجز معلّق لم يُدفع بعد.
 */
export async function checkPromoValidity(
  p: PromoCode,
  userId?: string | null
): Promise<PromoError | null> {
  if (!p.isActive) return "inactive";
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return "not_started";
  if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return "expired";
  if (p.maxUses != null && p.usedCount >= p.maxUses) return "used_up";

  if (p.perUserLimit != null && userId) {
    const r = await query<any>(
      `SELECT count(*)::int AS n FROM promo_redemptions
       WHERE promo_id = $1 AND user_id = $2 AND paid_at IS NOT NULL`,
      [p.id, userId]
    );
    if ((r[0]?.n ?? 0) >= p.perUserLimit) return "per_user";
  }
  return null;
}

export interface PromoComputation {
  discount: number;                 // إجمالي الخصم
  perService: Record<number, number>; // خصم كل خدمة (للأنواع service_*)
  matchedServiceIds: number[];      // الخدمات اللي اتطبّق عليها خصم
  error: PromoError | null;
}

/**
 * حساب الخصم على بنود الطلب.
 * subtotalForMin = الأساس اللي نقيس عليه الحد الأدنى (عادة مجموع الخدمات + النقل).
 */
export function computePromo(
  p: PromoCode,
  lines: PromoLine[],
  subtotalForMin: number
): PromoComputation {
  const empty: PromoComputation = { discount: 0, perService: {}, matchedServiceIds: [], error: null };

  // الحد الأدنى للطلب
  if (p.minOrder > 0 && subtotalForMin < p.minOrder) {
    return { ...empty, error: "min_order" };
  }

  // ── كوبون هدية: لا يُحسب كخصم — الخدمة تُضاف كبند مجاني في راوت الحجز ──
  if (p.kind === "gift_service") {
    return { ...empty };
  }

  const round = (n: number) => Math.max(0, Math.round(n));

  // ── نسبة على الإجمالي ──
  if (p.kind === "percentage") {
    const base = lines.reduce((s, l) => s + l.unit, 0);
    return { ...empty, discount: round((base * p.discountPercent) / 100) };
  }

  // ── مبلغ ثابت على الإجمالي (لا يتعدّى الإجمالي) ──
  if (p.kind === "fixed") {
    const base = lines.reduce((s, l) => s + l.unit, 0);
    return { ...empty, discount: round(Math.min(p.fixedAmount, base)) };
  }

  // ── خدمات محددة: نسبة موحّدة ──
  if (p.kind === "service_percent") {
    const ids = new Set(p.services.map((s) => s.serviceId));
    const perService: Record<number, number> = {};
    let discount = 0;
    const matched: number[] = [];
    for (const l of lines) {
      if (!ids.has(l.serviceId)) continue;
      const cut = round((l.unit * p.discountPercent) / 100);
      perService[l.serviceId] = (perService[l.serviceId] ?? 0) + cut;
      discount += cut;
      matched.push(l.serviceId);
    }
    if (matched.length === 0) return { ...empty, error: "no_match" };
    return { discount, perService, matchedServiceIds: matched, error: null };
  }

  // ── خدمات محددة: لكل خدمة قيمتها (نسبة أو مبلغ) ──
  if (p.kind === "service_each") {
    const ruleMap = new Map(p.services.map((s) => [s.serviceId, s]));
    const perService: Record<number, number> = {};
    let discount = 0;
    const matched: number[] = [];
    for (const l of lines) {
      const rule = ruleMap.get(l.serviceId);
      if (!rule) continue;
      const cut = rule.amountMode === "fixed"
        ? Math.max(0, Math.round(Math.min(rule.value, l.unit)))
        : Math.max(0, Math.round((l.unit * rule.value) / 100));
      if (cut <= 0) continue;
      perService[l.serviceId] = (perService[l.serviceId] ?? 0) + cut;
      discount += cut;
      matched.push(l.serviceId);
    }
    if (matched.length === 0) return { ...empty, error: "no_match" };
    return { discount, perService, matchedServiceIds: matched, error: null };
  }

  return empty;
}

/**
 * تسجيل استخدام كود (بعد إنشاء الحجز) — كـ«معلّق» افتراضيًا.
 *
 * مفهوم جديد (طلب 3): الـredemption يُسجَّل وقت الحجز لكن لا يُحتسب في
 * الإحصائيات إلا بعد تأكيد الدفع. لذلك:
 *   • paidImmediately=true  (الدفع تم فورًا، مثلًا أونلاين) → paid_at=now() ويُزاد used_count.
 *   • paidImmediately=false (دفع بالفرع/معلّق)            → paid_at=NULL ولا يُزاد used_count.
 */
export async function recordRedemption(args: {
  promoId: string | null;
  code: string;
  bookingId: string | null;
  userId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  orderSubtotal: number;
  discountAmount: number;
  orderTotal: number;
  paidImmediately: boolean;
}): Promise<void> {
  // عمولة المؤثر (لو الكود عليه نسبة) — تُحسب وتُخزَّن كـ Snapshot وقت الاستخدام
  let commissionAmount = 0;
  if (args.promoId) {
    const cRows = await query<any>(
      `SELECT commission_percent FROM promo_codes WHERE id = $1`,
      [args.promoId]
    );
    const pct = cRows[0]?.commission_percent != null ? Number(cRows[0].commission_percent) : 0;
    if (pct > 0) commissionAmount = Math.max(0, Math.round((args.orderTotal * pct) / 100));
  }

  await query(
    `INSERT INTO promo_redemptions
       (promo_id, code, booking_id, user_id, customer_name, customer_email,
        order_subtotal, discount_amount, order_total, commission_amount, paid_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $11 THEN now() ELSE NULL END)`,
    [
      args.promoId, args.code, args.bookingId, args.userId,
      args.customerName, args.customerEmail,
      args.orderSubtotal, args.discountAmount, args.orderTotal, commissionAmount,
      args.paidImmediately,
    ]
  );
  // used_count يُزاد فقط عند الدفع الفوري (المؤكّد).
  if (args.promoId && args.paidImmediately) {
    await query(
      `UPDATE promo_codes
       SET used_count = used_count + 1,
           is_active = CASE WHEN max_uses IS NOT NULL AND used_count + 1 >= max_uses
                            THEN false ELSE is_active END,
           updated_at = now()
       WHERE id = $1`,
      [args.promoId]
    ).catch(() => {});
  }
}

/**
 * تأكيد استخدام البرومو لحجز مُعيّن (يُستدعى عند تأكيد الدفع).
 * يحوّل أي redemption معلّق لهذا الحجز إلى مؤكّد (paid_at=now())
 * ويزيد used_count مرة واحدة فقط لكل سجل تم تأكيده.
 */
export async function confirmRedemptionForBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;
  // اجلب السجلات المعلّقة لهذا الحجز
  const pending = await query<any>(
    `SELECT id, promo_id FROM promo_redemptions
      WHERE booking_id = $1 AND paid_at IS NULL`,
    [bookingId]
  );
  for (const r of pending) {
    await query(`UPDATE promo_redemptions SET paid_at = now() WHERE id = $1`, [r.id]);
    if (r.promo_id) {
      await query(
        `UPDATE promo_codes
         SET used_count = used_count + 1,
             is_active = CASE WHEN max_uses IS NOT NULL AND used_count + 1 >= max_uses
                              THEN false ELSE is_active END,
             updated_at = now()
         WHERE id = $1`,
        [r.promo_id]
      ).catch(() => {});
    }
  }
}

/**
 * إلغاء استخدام البرومو لحجز مُعيّن (يُستدعى عند إلغاء الحجز).
 * • إن كان مؤكّدًا (paid_at IS NOT NULL): نُنقص used_count ونعيد تفعيل الكود إن كان أُوقف بسبب النفاد.
 * • ثم نحذف سجل الـredemption نهائيًا (الحجز اتلغى فالخصم بطل).
 */
export async function voidRedemptionForBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;
  const rows = await query<any>(
    `SELECT id, promo_id, paid_at FROM promo_redemptions WHERE booking_id = $1`,
    [bookingId]
  );
  for (const r of rows) {
    if (r.promo_id && r.paid_at) {
      await query(
        `UPDATE promo_codes
         SET used_count = GREATEST(used_count - 1, 0),
             is_active = CASE
               WHEN max_uses IS NOT NULL AND GREATEST(used_count - 1, 0) < max_uses
                 AND (expires_at IS NULL OR expires_at > now())
               THEN true ELSE is_active END,
             updated_at = now()
         WHERE id = $1`,
        [r.promo_id]
      ).catch(() => {});
    }
    await query(`DELETE FROM promo_redemptions WHERE id = $1`, [r.id]).catch(() => {});
  }
}