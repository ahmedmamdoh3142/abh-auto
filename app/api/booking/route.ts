// app/api/booking/route.ts  (+ partner pricing & commission + promo v2 + pending-on-unpaid)
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";
import { getPromoByCode, checkPromoValidity, computePromo, recordRedemption, type PromoLine } from "@/lib/promo";
import { enqueueBookingConfirm, enqueueBookingReminder, waEnabled } from "@/lib/whatsapp";

const SIZE_UI_TO_DB: Record<string, string> = { small: "small", medium: "medium", large: "large" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getCurrentUser();

    // هل المستخدم شركة؟ (نشطة)
    const partner = await getPartnerForUser(user?.id);
    const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

    const vehicleLabel = body.vehicleLabel ? String(body.vehicleLabel).trim() : null;
    const plate = body.plate ? String(body.plate).trim() : null;
    const brandId = body.brandId ? String(body.brandId) : null;
    const model = body.model ? String(body.model) : null;
    const sizeCode = SIZE_UI_TO_DB[body.size] ?? "large";
    const colorCode = body.colorKey ? String(body.colorKey) : null;
    const branchCode = body.branch ? String(body.branch) : null;
    const date = body.date ? String(body.date) : null;
    const time = body.time ? String(body.time) : null;
    const paymentMethod = body.payment ? String(body.payment) : null;
    const towingMode = body.towingMode ? String(body.towingMode) : null;
    const towingCost = Number(body.towingCost) || 0;
    const towingAddress = body.towingAddress ? String(body.towingAddress).trim() : null;
    const services: string[] = Array.isArray(body.services) ? body.services : [];
    // الشركاء لا يستخدمون أكواد الخصم الإعلانية إطلاقًا
    const promoCodeInput = !partner && body.promoCode ? String(body.promoCode).trim() : null;

    const customerName = body.name ? String(body.name).trim() : null;
    const customerPhone = body.phone ? String(body.phone).trim() : null;
    // الإيميل اختياري الآن (طلب 9)
    const customerEmail = body.email ? String(body.email).trim() : null;
    const customerCity = body.city ? String(body.city).trim() : null;
    const whatsappOptIn = body.whatsappOptIn === true;
    const whatsappOptInText = body.whatsappOptInText ? String(body.whatsappOptInText).trim() : null;

    if (services.length === 0) {
      return NextResponse.json({ ok: false, error: "no_services" }, { status: 400 });
    }

    // الأسعار الأساسية لكل خدمة حسب الحجم — مع s.id للدمج مع أسعار الشريك.
    const priceRows = await query<any>(
      `SELECT s.id, s.slug, s.name, s.is_on_request,
              sp.price      AS price,
              sp.old_price  AS old_price
       FROM services s
       LEFT JOIN service_prices sp
              ON sp.service_id = s.id AND sp.size_code = $2
       WHERE s.surface = 'catalog' AND s.slug = ANY($1)`,
      [services, sizeCode]
    );

    let subtotal = 0;
    let totalSaved = 0;
    let commissionTotal = 0;

    const items = priceRows.map((r) => {
      const baseP = Number(r.price) || 0;
      const baseOld = r.old_price != null ? Number(r.old_price) : null;

      let unit = baseP;
      let commission = 0;
      let oldForSave: number | null = baseOld;

      if (partnerMap) {
        const pp = partnerMap.get(priceKey(r.id, sizeCode));
        unit = r.is_on_request ? 0 : (pp ? pp.price : baseP);
        commission = r.is_on_request ? 0 : (pp ? pp.commission : 0);
        oldForSave = null;
      } else {
        unit = r.is_on_request ? 0 : baseP;
        if (!r.is_on_request && baseOld && baseOld > baseP) totalSaved += baseOld - baseP;
      }

      subtotal += unit;
      commissionTotal += commission;

      const nameSnapshot = r.name ? JSON.stringify(r.name) : null;
      return { serviceId: r.id, slug: r.slug, unit, oldPrice: oldForSave, nameSnapshot, commission };
    });

    const beforePromo = subtotal + towingCost;

    // ── كود الخصم (v2): للعملاء العاديين فقط ──
    let promoCode: string | null = null;
    let promoKind: string | null = null;
    let promoDiscount = 0;
    let promoId: string | null = null;

    if (promoCodeInput) {
      const promo = await getPromoByCode(promoCodeInput);
      if (promo) {
        const invalid = await checkPromoValidity(promo, user?.id);
        if (!invalid) {
          const lines: PromoLine[] = items
            .filter((it) => it.unit > 0)
            .map((it) => ({ serviceId: it.serviceId, unit: it.unit }));
          const comp = computePromo(promo, lines, beforePromo);
          if (!comp.error && comp.discount > 0) {
            promoId = promo.id;
            promoCode = promo.code;
            promoKind = promo.kind;
            promoDiscount = comp.discount;
          }
        }
      }
    }

    const total = Math.max(0, beforePromo - promoDiscount);
    // cash = دفع بالفرع → pending (لم يُدفع بعد). غير كده → paid (دفع أونلاين فوري).
    const paidImmediately = paymentMethod !== "cash";
    const paymentStatus = paidImmediately ? "paid" : "pending";

    const bookingRows = await query<{ id: string; reference: string }>(
      `INSERT INTO bookings
         (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
          branch_code, scheduled_date, scheduled_time, subtotal,
          towing_code, towing_cost, towing_address, total, payment_method_code, payment_status,
          promo_code, promo_discount, promo_kind,
          customer_name, customer_phone, customer_email, customer_city,
          partner_id, commission_total,
          whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_in_text)
       VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25,$26,
               $27, CASE WHEN $27 THEN now() ELSE NULL END, $28)
       RETURNING id, reference`,
      [
        user?.id ?? null, vehicleLabel, plate, brandId, model, sizeCode, colorCode,
        branchCode, date || null, time, subtotal,
        towingMode, towingCost, towingAddress, total, paymentMethod, paymentStatus,
        promoCode, promoDiscount, promoKind,
        customerName, customerPhone, customerEmail, customerCity,
        partner?.id ?? null, commissionTotal,
        whatsappOptIn, whatsappOptInText,
      ]
    );
    const booking = bookingRows[0];

    for (const it of items) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $6, $7)`,
        [booking.id, it.serviceId, it.slug, it.nameSnapshot, sizeCode, it.unit, it.commission]
      );
    }

    // تسجيل استخدام الكود — معلّقًا لو الدفع بالفرع، مؤكّدًا لو دُفع فورًا.
    if (promoCode) {
      await recordRedemption({
        promoId,
        code: promoCode,
        bookingId: booking.id,
        userId: user?.id ?? null,
        customerName,
        customerEmail,
        orderSubtotal: beforePromo,
        discountAmount: promoDiscount,
        orderTotal: total,
        paidImmediately,
      }).catch((e) => console.error("recordRedemption failed:", e));
    }

    // ── واتساب: جدولة تأكيد فوري + تذكير قبل الموعد (إن وافق العميل) ──
    // تُسجَّل في الطابور كـ'queued' ولا تُرسل فعليًا حتى يُفعَّل المزوّد (enabled=true).
    if (whatsappOptIn && customerPhone) {
      try {
        await enqueueBookingConfirm({
          bookingId: booking.id, reference: booking.reference,
          phone: customerPhone, name: customerName, userId: user?.id ?? null,
        });
        if (date) {
          await enqueueBookingReminder({
            bookingId: booking.id, reference: booking.reference,
            phone: customerPhone, name: customerName,
            scheduledDate: date, scheduledTime: time, userId: user?.id ?? null,
          });
        }
      } catch (e) { console.error("whatsapp enqueue failed:", e); }
    }

    return NextResponse.json({
      ok: true,
      reference: booking.reference,
      total,
      saved: totalSaved,
      promoCode,
      promoDiscount,
      isPartner: !!partner,
      commissionTotal,
    });
  } catch (err) {
    console.error("POST /api/booking failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}