/**
 * app/api/admin/bookings/[id]/services/route.ts — تعديل خدمات الحجز (قبل الدفع).
 *
 * PATCH { services: string[] }  (slugs للخدمات العادية فقط)
 *   • يعيد حساب الأسعار حسب حجم السيارة (size_code) — نفس منطق create.
 *   • لو العميل شركة (partner) يطبّق أسعارها وعمولتها.
 *   • يستبدل الخدمات العادية فقط (service_id IS NOT NULL و service_slug <> 'custom')
 *     ويُبقي: الهدايا (booking_bundle_gifts) والمخصّص (custom) والبرومو كما هي.
 *   • يعيد حساب subtotal / total / commission_total ويحدّث الحجز.
 *   • ممنوع لو الحجز مدفوع أو ملغي.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const b = await request.json();
    const services: string[] = Array.isArray(b.services) ? b.services.map((s: any) => String(s)) : [];

    // نقرأ الحجز الحالي (الحجم، الحالة، الدفع، البرومو، النقل، الشركة).
    const cur = await query<any>(
      `SELECT size_code, status, payment_status, user_id, partner_id,
              promo_discount, towing_cost
         FROM bookings WHERE id = $1`,
      [id]
    );
    if (!cur[0]) return bad("not_found", 404);
    const bk = cur[0];

    if (bk.status === "cancelled") return bad("booking_cancelled");
    if (bk.payment_status === "paid") return bad("already_paid");

    const sizeCode = ["small", "medium", "large"].includes(bk.size_code) ? bk.size_code : "large";

    // أسعار الشركة لو العميل شركة
    const partner = bk.user_id ? await getPartnerForUser(bk.user_id) : null;
    const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

    // ── نجيب أسعار الخدمات الجديدة حسب الحجم (نفس منطق create) ──
    let newSubtotal = 0;
    let newCommission = 0;
    const items: { serviceId: number; slug: string; unit: number; nameSnapshot: string | null; commission: number }[] = [];

    if (services.length > 0) {
      const priceRows = await query<any>(
        `SELECT s.id, s.slug, s.name, s.is_on_request, sp.price AS price
           FROM services s
           LEFT JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code = $2
          WHERE s.surface = 'catalog' AND s.slug = ANY($1)`,
        [services, sizeCode]
      );
      for (const r of priceRows) {
        const baseP = Number(r.price) || 0;
        let unit = r.is_on_request ? 0 : baseP;
        let commission = 0;
        if (partnerMap) {
          const pp = partnerMap.get(priceKey(r.id, sizeCode));
          unit = r.is_on_request ? 0 : (pp ? pp.price : baseP);
          commission = r.is_on_request ? 0 : (pp ? pp.commission : 0);
        }
        newSubtotal += unit;
        newCommission += commission;
        items.push({ serviceId: r.id, slug: r.slug, unit, nameSnapshot: r.name ? JSON.stringify(r.name) : null, commission });
      }
    }

    // ── نحسب مساهمة الهدايا والمخصّص الباقية (لا نلمسها) ──
    const keepRows = await query<any>(
      `SELECT COALESCE(SUM(line_total),0) AS kept, COALESCE(SUM(commission_snapshot),0) AS kept_comm
         FROM booking_items
        WHERE booking_id = $1
          AND (service_slug = 'custom' OR service_id IN (
                SELECT gift_service_id FROM booking_bundle_gifts WHERE booking_id = $1
              ))`,
      [id]
    );
    const keptTotal = Number(keepRows[0]?.kept) || 0;
    const keptComm = Number(keepRows[0]?.kept_comm) || 0;

    // ── نمسح الخدمات العادية فقط، ونضيف الجديدة ──
    await query(
      `DELETE FROM booking_items
        WHERE booking_id = $1
          AND service_slug <> 'custom'
          AND service_id IS NOT NULL
          AND service_id NOT IN (
                SELECT gift_service_id FROM booking_bundle_gifts WHERE booking_id = $1 AND gift_service_id IS NOT NULL
              )`,
      [id]
    );

    for (const it of items) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,1,$6,$7)`,
        [id, it.serviceId, it.slug, it.nameSnapshot, sizeCode, it.unit, it.commission]
      );
    }

    // ── إعادة حساب الإجماليات ──
    const towing = Number(bk.towing_cost) || 0;
    const promoDiscount = Number(bk.promo_discount) || 0;
    const subtotal = newSubtotal;                                  // الخدمات العادية فقط
    const beforePromo = subtotal + towing;
    const total = Math.max(0, beforePromo - promoDiscount) + keptTotal; // + الهدايا/المخصّص
    const commissionTotal = newCommission + keptComm;

    await query(
      `UPDATE bookings
          SET subtotal = $2, total = $3, commission_total = $4, updated_at = now()
        WHERE id = $1`,
      [id, subtotal, total, commissionTotal]
    );

    // نرجّع الخدمات المحدّثة للواجهة (بنفس شكل booking.services)
    const svcOut = await query<any>(
      `SELECT name_snapshot, service_slug, line_total
         FROM booking_items WHERE booking_id = $1 ORDER BY id`,
      [id]
    );

    return NextResponse.json({
      ok: true,
      booking: { subtotal, total, commissionTotal },
      services: svcOut.map((r) => ({ name_snapshot: r.name_snapshot, slug: r.service_slug, price: Number(r.line_total) || 0 })),
    });
  } catch (err) {
    console.error("PATCH /api/admin/bookings/[id]/services failed:", err);
    return bad("server_error", 500);
  }
}