// app/api/booking/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const SIZE_UI_TO_DB: Record<string, string> = { small: "small", medium: "medium", large: "large" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getCurrentUser();

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
    const promoCodeInput = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;

    // ── بيانات العميل من الفورم (تُحفظ دائمًا، وأساسية للزوّار بدون حساب) ──
    const customerName = body.name ? String(body.name).trim() : null;
    const customerPhone = body.phone ? String(body.phone).trim() : null;
    const customerEmail = body.email ? String(body.email).trim() : null;
    const customerCity = body.city ? String(body.city).trim() : null;

    if (services.length === 0) {
      return NextResponse.json({ ok: false, error: "no_services" }, { status: 400 });
    }

    // السعر قبل/بعد لكل خدمة حسب الحجم — مباشرة من service_prices.
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
    const items = priceRows.map((r) => {
      const price = Number(r.price) || 0;
      const oldPrice = r.old_price != null ? Number(r.old_price) : null;
      const unit = r.is_on_request ? 0 : price;
      if (!r.is_on_request && oldPrice && oldPrice > price) totalSaved += oldPrice - price;
      subtotal += unit;
      const nameSnapshot = r.name ? JSON.stringify(r.name) : null;
      return { serviceId: r.id, slug: r.slug, unit, oldPrice, nameSnapshot };
    });

    const beforePromo = subtotal + towingCost;

    // ── كود الخصم: نتحقق من القاعدة (ما نثقش في الكلاينت) ونطبّقه على الإجمالي ──
    let promoCode: string | null = null;
    let promoPercent = 0;
    let promoDiscount = 0;
    if (promoCodeInput) {
      const pr = await query<any>(
        `SELECT code, discount_percent, is_active, max_uses, used_count, expires_at
         FROM promo_codes WHERE upper(code) = $1 LIMIT 1`,
        [promoCodeInput]
      );
      const p = pr[0];
      const valid = p && p.is_active
        && (!p.expires_at || new Date(p.expires_at).getTime() >= Date.now())
        && (p.max_uses == null || Number(p.used_count) < Number(p.max_uses));
      if (valid) {
        promoCode = p.code;
        promoPercent = Number(p.discount_percent);
        promoDiscount = Math.round((beforePromo * promoPercent) / 100);
      }
    }

    const total = Math.max(0, beforePromo - promoDiscount);
    const paymentStatus = paymentMethod === "cash" ? "pending" : "paid";

    const bookingRows = await query<{ id: string; reference: string }>(
      `INSERT INTO bookings
         (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
          branch_code, scheduled_date, scheduled_time, subtotal,
          towing_code, towing_cost, towing_address, total, payment_method_code, payment_status,
          promo_code, promo_discount,
          customer_name, customer_phone, customer_email, customer_city)
       VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23)
       RETURNING id, reference`,
      [
        user?.id ?? null, vehicleLabel, plate, brandId, model, sizeCode, colorCode,
        branchCode, date || null, time, subtotal,
        towingMode, towingCost, towingAddress, total, paymentMethod, paymentStatus,
        promoCode, promoDiscount,
        customerName, customerPhone, customerEmail, customerCity,
      ]
    );
    const booking = bookingRows[0];

    for (const it of items) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $6)`,
        [booking.id, it.serviceId, it.slug, it.nameSnapshot, sizeCode, it.unit]
      );
    }

    // ── تعطيل/تحديث الكود بعد الاستخدام ──
    if (promoCode) {
      await query(
        `UPDATE promo_codes
         SET used_count = used_count + 1,
             is_active  = CASE WHEN max_uses IS NOT NULL AND used_count + 1 >= max_uses
                               THEN false ELSE is_active END
         WHERE upper(code) = $1`,
        [promoCode.toUpperCase()]
      ).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      reference: booking.reference,
      total,
      saved: totalSaved,
      promoCode,
      promoDiscount,
    });
  } catch (err) {
    console.error("POST /api/booking failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}