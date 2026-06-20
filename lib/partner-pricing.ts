import { query } from "@/lib/db";
import type { VehicleSize } from "@/lib/booking-data";

/**
 * lib/partner-pricing.ts — منطق أسعار الشركاء (B2B price book). SERVER فقط.
 *
 * الفكرة (النمط القياسي عالميًا — customer-specific price lists):
 *   • الأسعار العامة في service_prices تبقى كما هي ولا تُمَس أبدًا.
 *   • كل شركة لها "دفتر أسعار" خاص في partner_service_prices (سعر + عمولة لكل خدمة/حجم).
 *   • عند العرض/الحجز لمستخدم شريك: نُلبِس (overlay) أسعاره فوق الأساسية.
 *   • العمولة = مبلغ ثابت بالريال على كل خدمة/حجم — تُجمَّد وقت الحجز.
 */

export interface PartnerRow {
  id: string;
  userId: string;
  companyName: string;
  isActive: boolean;
}

/** سعر شريك واحد لخدمة/حجم. */
export interface PartnerPrice {
  serviceId: number;
  sizeCode: string;
  price: number;
  commission: number;
}

/**
 * هات بيانات الشريك المرتبطة بمستخدم (أو null لو مش شريك أو موقوف).
 * تُستعمل في كل مكان نحتاج فيه نعرف: هل هذا المستخدم شركة؟
 */
export async function getPartnerForUser(userId: string | null | undefined): Promise<PartnerRow | null> {
  if (!userId) return null;
  const rows = await query<{
    id: string; user_id: string; company_name: string; is_active: boolean;
  }>(
    `SELECT id, user_id, company_name, is_active
       FROM partners
      WHERE user_id = $1 AND is_active = true
      LIMIT 1`,
    [userId]
  );
  const p = rows[0];
  if (!p) return null;
  return { id: p.id, userId: p.user_id, companyName: p.company_name, isActive: p.is_active };
}

/**
 * هات كل أسعار شريك معيّن كخريطة:  "{serviceId}::{sizeCode}" → { price, commission }
 * نستعملها لدمج سريع O(1) بدل استعلام لكل خدمة.
 */
export async function getPartnerPriceMap(
  partnerId: string
): Promise<Map<string, { price: number; commission: number }>> {
  const rows = await query<{
    service_id: number; size_code: string; price: string; commission: string;
  }>(
    `SELECT service_id, size_code, price, commission
       FROM partner_service_prices
      WHERE partner_id = $1`,
    [partnerId]
  );
  const map = new Map<string, { price: number; commission: number }>();
  for (const r of rows) {
    map.set(`${r.service_id}::${r.size_code}`, {
      price: Number(r.price),
      commission: Number(r.commission),
    });
  }
  return map;
}

/**
 * مفتاح موحّد للخريطة أعلاه.
 */
export function priceKey(serviceId: number, size: string): string {
  return `${serviceId}::${size}`;
}

/**
 * طبّق سعر الشريك على خدمة. تُرجع:
 *   • price: سعر الشريك إن وُجد، وإلا السعر الأساسي.
 *   • old:   null دائمًا للشريك (لا يرى خصومات إعلانية)؛ للعميل العادي = القديم.
 *   • isPartnerPrice: هل السعر من دفتر الشريك؟
 *
 * basePrice/baseOld هما القيم الأساسية من service_prices.
 */
export function applyPartnerPrice(
  serviceId: number,
  size: string,
  basePrice: number,
  baseOld: number | null,
  partnerMap: Map<string, { price: number; commission: number }> | null
): { price: number; old: number | null; commission: number; isPartnerPrice: boolean } {
  if (partnerMap) {
    const pp = partnerMap.get(priceKey(serviceId, size));
    if (pp) {
      return { price: pp.price, old: null, commission: pp.commission, isPartnerPrice: true };
    }
    // شريك لكن لا سعر خاص لهذه الخدمة → يدفع الأساسي بلا خصم إعلاني، عمولة صفر.
    return { price: basePrice, old: null, commission: 0, isPartnerPrice: false };
  }
  // عميل عادي → السعر الأساسي + الخصم الإعلاني إن وُجد.
  return { price: basePrice, old: baseOld, commission: 0, isPartnerPrice: false };
}
