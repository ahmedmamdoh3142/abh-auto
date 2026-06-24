/**
 * app/api/admin/bookings/create/route.ts — إنشاء حجز من الداشبورد (موظّف/أدمن).
 *
 * زي حجز الموقع بالظبط لكن:
 *   • يُنسب الحجز للعميل المختار (userId) لو مسجّل، أو يُحفظ كزائر ببياناته.
 *   • الأسعار تُحسب في الخادم حسب حجم السيارة (size) — لا نثق بأي سعر من الواجهة.
 *   • لو العميل المختار شركة (partner): تُطبّق أسعاره الخاصة وعمولته (تُجمّد).
 *   • هدايا البندلات (خدمة + هدية): تُسعّر وتُتحقّق من الخادم وتُسجّل في
 *     booking_items + booking_bundle_gifts — نفس الموقع.
 *   • الدفع: cash → pending (معلّق)، غيره → paid. والبرومو يتبع نفس قاعدة الدفع.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";
import { getPromoByCode, checkPromoValidity, computePromo, recordRedemption, type PromoLine } from "@/lib/promo";
import { getBundleById, giftChargeFor } from "@/lib/bundles";
import { enqueueBookingConfirm, enqueueBookingReminder } from "@/lib/whatsapp";

const SIZE_OK = new Set(["small", "medium", "large"]);

export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json();

    // العميل: إما مسجّل (userId) أو زائر (بياناته اليدوية)
    const userId: string | null = body.userId ? String(body.userId) : null;

    // لو العميل المختار شركة، نطبّق تسعيره
    const partner = userId ? await getPartnerForUser(userId) : null;
    const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

    const vehicleLabel = body.vehicleLabel ? String(body.vehicleLabel).trim() : null;
    const plate = body.plate ? String(body.plate).trim() : null;
    const brandId = body.brandId ? String(body.brandId) : null;
    const model = body.model ? String(body.model) : null;
    const sizeCode = SIZE_OK.has(body.size) ? body.size : "large";
    const colorCode = body.colorKey ? String(body.colorKey) : null;
    const branchCode = body.branch ? String(body.branch) : null;
    const date = body.date ? String(body.date) : null;
    const time = body.time ? String(body.time) : null;
    const paymentMethod = body.payment ? String(body.payment) : null;
    const towingMode = body.towingMode ? String(body.towingMode) : null;
    const towingAddress = body.towingAddress ? String(body.towingAddress).trim() : null;
    const services: string[] = Array.isArray(body.services) ? body.services : [];
    const giftInputs: { slug: string; bundleId: string }[] = Array.isArray(body.gifts)
      ? body.gifts
          .map((g: any) => ({ slug: String(g?.slug || ""), bundleId: String(g?.bundleId || "") }))
          .filter((g: any) => g.slug && g.bundleId)
      : [];
    const promoCodeInput = !partner && body.promoCode ? String(body.promoCode).trim() : null;

    // بيانات العميل (للزائر، أو نسخة احتياطية للمسجّل)
    const customerName = body.name ? String(body.name).trim() : null;
    const customerPhone = body.phone ? String(body.phone).trim() : null;
    const customerEmail = body.email ? String(body.email).trim() : null; // اختياري
    const customerCity = body.city ? String(body.city).trim() : null;
    const whatsappOptIn = body.whatsappOptIn === true;

    if (services.length === 0) return NextResponse.json({ ok: false, error: "no_services" }, { status: 400 });
    if (!customerName && !userId) return NextResponse.json({ ok: false, error: "customer_required" }, { status: 400 });

    // تكلفة النقل من القاعدة (لا نثق بقيمة من الواجهة)
    let towingCost = 0;
    if (towingMode) {
      const tw = await query<any>(`SELECT cost FROM towing_options WHERE code = $1`, [towingMode]);
      towingCost = Number(tw[0]?.cost) || 0;
    }

    // أسعار الخدمات حسب الحجم
    const priceRows = await query<any>(
      `SELECT s.id, s.slug, s.name, s.is_on_request,
              sp.price AS price, sp.old_price AS old_price
       FROM services s
       LEFT JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code = $2
       WHERE s.surface = 'catalog' AND s.slug = ANY($1)`,
      [services, sizeCode]
    );

    let subtotal = 0;
    let commissionTotal = 0;
    const items = priceRows.map((r) => {
      const baseP = Number(r.price) || 0;
      let unit = r.is_on_request ? 0 : baseP;
      let commission = 0;
      if (partnerMap) {
        const pp = partnerMap.get(priceKey(r.id, sizeCode));
        unit = r.is_on_request ? 0 : (pp ? pp.price : baseP);
        commission = r.is_on_request ? 0 : (pp ? pp.commission : 0);
      }
      subtotal += unit;
      commissionTotal += commission;
      const nameSnapshot = r.name ? JSON.stringify(r.name) : null;
      return { serviceId: r.id, slug: r.slug, unit, nameSnapshot, commission };
    });

    const beforePromo = subtotal + towingCost;

    // البرومو (للعملاء العاديين فقط)
    let promoCode: string | null = null;
    let promoKind: string | null = null;
    let promoDiscount = 0;
    let promoId: string | null = null;
    if (promoCodeInput) {
      const promo = await getPromoByCode(promoCodeInput);
      if (promo) {
        const invalid = await checkPromoValidity(promo, userId);
        if (!invalid) {
          const lines: PromoLine[] = items.filter((it) => it.unit > 0).map((it) => ({ serviceId: it.serviceId, unit: it.unit }));
          const comp = computePromo(promo, lines, beforePromo);
          if (!comp.error && comp.discount > 0) {
            promoId = promo.id; promoCode = promo.code; promoKind = promo.kind; promoDiscount = comp.discount;
          }
        }
      }
    }

    // ── هدايا البندلات — تُسعّر وتُتحقّق من جهة الخادم (نفس الموقع) ──
    type GiftLine = { serviceId: number; slug: string; nameSnapshot: string | null; unit: number; bundleId: string; giftValue: number };
    const giftLines: GiftLine[] = [];
    if (!partner && giftInputs.length > 0) {
      const bundleCache = new Map<string, Awaited<ReturnType<typeof getBundleById>>>();
      const giftSlugs = [...new Set(giftInputs.map((g) => g.slug))];
      const giftRows = await query<any>(
        `SELECT s.id, s.slug, s.name, sp.price
           FROM services s
           LEFT JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code = $2
          WHERE s.surface = 'catalog' AND s.slug = ANY($1)`,
        [giftSlugs, sizeCode]
      );
      const seen = new Set<string>();
      for (const g of giftInputs) {
        if (seen.has(g.slug)) continue;
        const row = giftRows.find((r) => r.slug === g.slug);
        if (!row) continue;
        if (!bundleCache.has(g.bundleId)) bundleCache.set(g.bundleId, await getBundleById(g.bundleId));
        const bundle = bundleCache.get(g.bundleId);
        if (!bundle || !bundle.giftIds.includes(Number(row.id))) continue;
        const full = Number(row.price) || 0;
        const unit = giftChargeFor(full, bundle.giftPercent);
        giftLines.push({
          serviceId: row.id, slug: row.slug, nameSnapshot: row.name ? JSON.stringify(row.name) : null,
          unit, bundleId: g.bundleId, giftValue: Math.max(0, full - unit),
        });
        seen.add(g.slug);
      }
    }
    const giftsCharge = giftLines.reduce((s, g) => s + g.unit, 0);

    const total = Math.max(0, beforePromo - promoDiscount) + giftsCharge;
    const paidImmediately = paymentMethod !== "cash";
    const paymentStatus = paidImmediately ? "paid" : "pending";

    const bookingRows = await query<{ id: string; reference: string }>(
      `INSERT INTO bookings
         (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
          branch_code, scheduled_date, scheduled_time, subtotal,
          towing_code, towing_cost, towing_address, total, payment_method_code, payment_status,
          promo_code, promo_discount, promo_kind,
          customer_name, customer_phone, customer_email, customer_city,
          partner_id, commission_total, notes,
          whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_in_text)
       VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25,$26,$27,
               $28, CASE WHEN $28 THEN now() ELSE NULL END, $29)
       RETURNING id, reference`,
      [
        userId, vehicleLabel, plate, brandId, model, sizeCode, colorCode,
        branchCode, date || null, time, subtotal,
        towingMode, towingCost, towingAddress, total, paymentMethod, paymentStatus,
        promoCode, promoDiscount, promoKind,
        customerName, customerPhone, customerEmail, customerCity,
        partner?.id ?? null, commissionTotal,
        `حجز يدوي بواسطة ${admin.name} من الداشبورد`,
        whatsappOptIn,
        whatsappOptIn ? "موافقة مأخوذة شفهيًا عند الحجز اليدوي بالداشبورد" : null,
      ]
    );
    const booking = bookingRows[0];

    for (const it of items) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,1,$6,$7)`,
        [booking.id, it.serviceId, it.slug, it.nameSnapshot, sizeCode, it.unit, it.commission]
      );
    }

    // عناصر الهدايا + سجلّها
    for (const g of giftLines) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,1,$6,0)`,
        [booking.id, g.serviceId, g.slug, g.nameSnapshot, sizeCode, g.unit]
      );
      await query(
        `INSERT INTO booking_bundle_gifts (booking_id, bundle_id, gift_service_id, gift_value)
         VALUES ($1,$2,$3,$4)`,
        [booking.id, g.bundleId, g.serviceId, g.giftValue]
      );
    }

    if (promoCode) {
      await recordRedemption({
        promoId, code: promoCode, bookingId: booking.id, userId,
        customerName, customerEmail,
        orderSubtotal: beforePromo, discountAmount: promoDiscount, orderTotal: total,
        paidImmediately,
      }).catch((e) => console.error("recordRedemption failed:", e));
    }

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1,'upcoming',0,$2)`,
      [booking.id, `أنشئ من الداشبورد بواسطة ${admin.name}`]
    ).catch(() => {});

    // واتساب: تأكيد + تذكير (إن وافق العميل) — يبقى في الطابور حتى يُفعَّل المزوّد.
    if (whatsappOptIn && customerPhone) {
      try {
        await enqueueBookingConfirm({
          bookingId: booking.id, reference: booking.reference,
          phone: customerPhone, name: customerName, userId: userId,
        });
        if (date) {
          await enqueueBookingReminder({
            bookingId: booking.id, reference: booking.reference,
            phone: customerPhone, name: customerName,
            scheduledDate: date, scheduledTime: time, userId: userId,
          });
        }
      } catch (e) { console.error("whatsapp enqueue failed:", e); }
    }

    return NextResponse.json({ ok: true, reference: booking.reference, total, giftsCharge, commissionTotal });
  } catch (err) {
    console.error("POST /api/admin/bookings/create failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}