// lib/bundles.ts — منطق بندلات «خدمة + هدية» (server-side).
// بندل = خدمات «مؤهِّلة» (triggers) لو اختار العميل منها عددًا كافيًا (min_trigger_count)،
//        يفتحله اختيار هدية/هدايا (gifts) — مجانية (free) أو بخصم (percent).
import { query } from "@/lib/db";

export interface Bundle {
  id: string;
  label: string;
  title: { ar?: string; en?: string } | null;
  giftMode: "free" | "percent";
  giftPercent: number;       // نسبة الخصم على الهدية (100 = مجانية)
  minTriggerCount: number;   // كم خدمة مؤهِّلة لازم يختار
  maxGifts: number;          // كم هدية يقدر يختار
  stackable: boolean;        // يتجمّع مع كود الخصم؟
  triggerIds: number[];      // معرّفات الخدمات المؤهِّلة
  giftIds: number[];         // معرّفات الخدمات المتاحة كهدية
}

/** سعر تحميل الهدية بعد الخصم. free → 0. percent → السعر × (1 − النسبة). */
export function giftChargeFor(fullPrice: number, giftPercent: number): number {
  return Math.max(0, Math.round(fullPrice * (1 - (Number(giftPercent) || 0) / 100)));
}

function mapBundle(r: any, triggers: number[], gifts: number[]): Bundle {
  return {
    id: r.id,
    label: r.label,
    title: r.title ?? null,
    giftMode: r.gift_mode === "percent" ? "percent" : "free",
    giftPercent: Number(r.gift_percent) || 0,
    minTriggerCount: Math.max(1, Number(r.min_trigger_count) || 1),
    maxGifts: Math.max(1, Number(r.max_gifts) || 1),
    stackable: !!r.stackable,
    triggerIds: triggers,
    giftIds: gifts,
  };
}

/** كل البندلات النشطة (السارية زمنيًا) مع خدماتها. */
export async function getActiveBundles(): Promise<Bundle[]> {
  const rows = await query<any>(
    `SELECT id, label, title, gift_mode, gift_percent, min_trigger_count, max_gifts, stackable
       FROM offer_bundles
      WHERE is_active = true
        AND (starts_at  IS NULL OR starts_at  <= now())
        AND (expires_at IS NULL OR expires_at >  now())
      ORDER BY sort, created_at`
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const trg = await query<any>(`SELECT bundle_id, service_id FROM offer_bundle_triggers WHERE bundle_id = ANY($1)`, [ids]);
  const gft = await query<any>(`SELECT bundle_id, service_id FROM offer_bundle_gifts    WHERE bundle_id = ANY($1)`, [ids]);

  const tMap = new Map<string, number[]>();
  const gMap = new Map<string, number[]>();
  for (const r of trg) { const a = tMap.get(r.bundle_id) ?? []; a.push(Number(r.service_id)); tMap.set(r.bundle_id, a); }
  for (const r of gft) { const a = gMap.get(r.bundle_id) ?? []; a.push(Number(r.service_id)); gMap.set(r.bundle_id, a); }

  return rows
    .map((r) => mapBundle(r, tMap.get(r.id) ?? [], gMap.get(r.id) ?? []))
    // نتجاهل البندل الناقص (بدون triggers أو gifts)
    .filter((b) => b.triggerIds.length > 0 && b.giftIds.length > 0);
}

/** بندل واحد بالـid (للتحقّق من جهة الخادم وقت الحجز). */
export async function getBundleById(id: string): Promise<Bundle | null> {
  const rows = await query<any>(
    `SELECT id, label, title, gift_mode, gift_percent, min_trigger_count, max_gifts, stackable
       FROM offer_bundles WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const trg = await query<any>(`SELECT service_id FROM offer_bundle_triggers WHERE bundle_id = $1`, [id]);
  const gft = await query<any>(`SELECT service_id FROM offer_bundle_gifts    WHERE bundle_id = $1`, [id]);
  return mapBundle(rows[0], trg.map((x) => Number(x.service_id)), gft.map((x) => Number(x.service_id)));
}