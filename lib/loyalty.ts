// lib/loyalty.ts — منطق العضويات بمستويات (server-side).
// المستوى يتحدّد بإجمالي إنفاق العميل مدى الحياة (الحجوزات غير الملغاة/المسترجعة).
// كل مستوى له خصم دائم ثابت (discount_percent) يُطبّق تلقائيًا على أي حجز.
import { query } from "@/lib/db";

export interface LoyaltyTier {
  code: string;
  name: { ar?: string; en?: string };
  threshold: number;          // الإنفاق المطلوب للوصول
  discountPercent: number;    // خصم دائم
  perks: { ar: string[]; en: string[] };
  hex: string;
  icon: string;               // shield | sparkles | gem | crown
  sort: number;
}

export interface UserLoyalty {
  lifetimeSpend: number;
  bookingsCount: number;
  current: LoyaltyTier;
  next: LoyaltyTier | null;
  progressPct: number;        // التقدّم نحو المستوى التالي (0–100)
  remainingToNext: number;    // كام باقي بالريال للترقية
}

/** كل المستويات النشطة، مرتّبة تصاعديًا. */
export async function getTiers(): Promise<LoyaltyTier[]> {
  const rows = await query<any>(
    `SELECT code, name, threshold, discount_percent, perks, hex, icon, sort
       FROM loyalty_tiers
      WHERE is_active = true
      ORDER BY sort, threshold`
  );
  return rows.map(normalizeTier);
}

function normalizeTier(r: any): LoyaltyTier {
  const perks = r.perks ?? {};
  return {
    code: r.code,
    name: typeof r.name === "string" ? { ar: r.name, en: r.name } : (r.name ?? {}),
    threshold: Number(r.threshold) || 0,
    discountPercent: Number(r.discount_percent) || 0,
    perks: { ar: Array.isArray(perks.ar) ? perks.ar : [], en: Array.isArray(perks.en) ? perks.en : [] },
    hex: r.hex || "#cbcdcd",
    icon: r.icon || "shield",
    sort: Number(r.sort) || 0,
  };
}

/** إجمالي إنفاق العميل مدى الحياة. مستقل عن أي view عشان أمان ترتيب الـmigrations. */
export async function getLifetimeSpend(userId: string): Promise<{ spend: number; count: number }> {
  const rows = await query<any>(
    `SELECT COALESCE(sum(total),0) AS spend, count(*)::int AS cnt
       FROM bookings
      WHERE user_id = $1
        AND status <> 'cancelled'
        AND payment_status <> 'refunded'`,
    [userId]
  );
  return { spend: Number(rows[0]?.spend) || 0, count: Number(rows[0]?.cnt) || 0 };
}

/** يحسب مستوى العميل الحالي + التقدّم للتالي. */
export async function getUserLoyalty(userId: string): Promise<{ tiers: LoyaltyTier[]; loyalty: UserLoyalty } | null> {
  const tiers = await getTiers();
  if (tiers.length === 0) return null;

  const { spend, count } = await getLifetimeSpend(userId);

  // المستوى الحالي = أعلى مستوى عتبته ≤ الإنفاق (وإلا الأدنى).
  let current = tiers[0];
  for (const t of tiers) if (spend >= t.threshold) current = t;

  const next = tiers.find((t) => t.threshold > current.threshold) ?? null;

  let progressPct = 100;
  let remainingToNext = 0;
  if (next) {
    const span = Math.max(1, next.threshold - current.threshold);
    progressPct = Math.max(0, Math.min(100, Math.round(((spend - current.threshold) / span) * 100)));
    remainingToNext = Math.max(0, next.threshold - spend);
  }

  return {
    tiers,
    loyalty: { lifetimeSpend: spend, bookingsCount: count, current, next, progressPct, remainingToNext },
  };
}

/** الخصم الدائم لمستوى العميل (يُستعمل في حساب الحجز). يرجّع 0 لو مفيش/شريك. */
export async function getLoyaltyDiscountPercent(userId?: string | null): Promise<number> {
  if (!userId) return 0;
  const res = await getUserLoyalty(userId).catch(() => null);
  return res?.loyalty.current.discountPercent ?? 0;
}