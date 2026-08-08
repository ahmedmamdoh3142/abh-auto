/**
 * app/api/admin/bookings/create/route.ts — إنشاء حجز من الداشبورد (موظّف/أدمن).
 *
 * زي حجز الموقع بالظبط لكن:
 *   • يُنسب الحجز للعميل المختار (userId) لو مسجّل، أو يُحفظ كزائر ببياناته.
 *   • لو زائر ببيانات جديدة → نسجّله كعميل في users (lead capture) ونربط
 *     الحجز بيه عشان يظهر في «العملاء» ويتاح للاستهداف لاحقًا — نفس منطق الموقع.
 *   • الأسعار تُحسب في الخادم حسب حجم السيارة (size) — لا نثق بأي سعر من الواجهة.
 *   • لو العميل المختار شركة (partner): تُطبّق أسعاره الخاصة وعمولته (تُجمّد).
 *   • هدايا البندلات (خدمة + هدية): تُسعّر وتُتحقّق من الخادم وتُسجّل في
 *     booking_items + booking_bundle_gifts — نفس الموقع.
 *   • الدفع: cash → pending (معلّق)، غيره → paid. والبرومو يتبع نفس قاعدة الدفع.
 *   • (جديد) خصم بنك العميل (BIN-based) — يلغي الخصم اليدوي تمامًا لو اتحقق.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";
import { getBundleById, giftChargeFor } from "@/lib/bundles";
import { enqueueBookingConfirm, enqueueBookingReminder } from "@/lib/whatsapp";
import { matchBankBin } from "@/lib/bank-discount";

const SIZE_OK = new Set(["small", "medium", "large"]);
const onlyDigits = (s: string | null | undefined) => (s || "").replace(/[^0-9]/g, "");

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
    // خدمات مؤقتة (يكتبها الأدمن لهذا الحجز فقط) — اسم + سعر، بدون ربط بخدمة دائمة.
    const customItems: { name: string; price: number }[] = Array.isArray(body.customItems)
      ? body.customItems
          .map((c: any) => ({ name: String(c?.name || "").trim(), price: Math.max(0, Math.round(Number(c?.price) || 0)) }))
          .filter((c: any) => c.name)
      : [];
    const giftInputs: { slug: string; bundleId: string }[] = Array.isArray(body.gifts)
      ? body.gifts
          .map((g: any) => ({ slug: String(g?.slug || ""), bundleId: String(g?.bundleId || "") }))
          .filter((g: any) => g.slug && g.bundleId)
      : [];

    const bankCardDigits = !partner && body.bankCardDigits
      ? String(body.bankCardDigits).replace(/\D/g, "").slice(0, 8)
      : null;

    // (جديد) خصم يدوي يطبّقه الموظف مباشرة بدل كود الخصم — نسبة أو مبلغ ثابت.
    // معطّل تمامًا لو خصم البنك اتحقق (bankCardDigits موجود وهيتأكد تحت).
    const manualDiscountInputRaw = !partner && body.manualDiscount && (body.manualDiscount.kind === "percent" || body.manualDiscount.kind === "fixed")
      ? {
          kind: body.manualDiscount.kind as "percent" | "fixed",
          value: Math.max(0, Number(body.manualDiscount.value) || 0),
          reason: body.manualDiscount.reason ? String(body.manualDiscount.reason).trim().slice(0, 200) : null,
        }
      : null;

    // بيانات العميل (للزائر، أو نسخة احتياطية للمسجّل)
    const customerName = body.name ? String(body.name).trim() : null;
    const customerPhone = body.phone ? String(body.phone).trim() : null;
    const customerEmail = body.email ? String(body.email).trim() : null; // اختياري
    const customerCity = body.city ? String(body.city).trim() : null;
    const whatsappOptIn = body.whatsappOptIn === true;

    if (services.length === 0 && customItems.length === 0) return NextResponse.json({ ok: false, error: "no_services" }, { status: 400 });
    if (!customerName && !userId) return NextResponse.json({ ok: false, error: "customer_required" }, { status: 400 });

    // ════════════ التقاط العميل الزائر وتسجيله في users ════════════
    async function captureLeadCustomer(): Promise<string | null> {
      const digits = onlyDigits(customerPhone);
      const email = customerEmail ? customerEmail.toLowerCase() : null;

      if (digits) {
        const r = await query<{ id: string; name: string | null }>(
          `SELECT id, name FROM users WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') = $1 LIMIT 1`,
          [digits]
        );
        if (r[0]) {
          if (!r[0].name && customerName) await query(`UPDATE users SET name = $2 WHERE id = $1`, [r[0].id, customerName]);
          return r[0].id;
        }
      }
      if (email) {
        const r = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [email]);
        if (r[0]) return r[0].id;
      }
      const leadEmail = email || (digits ? `${digits}@lead.abh-auto.com` : null);
      if (!leadEmail) return null;
      const noLoginHash = `nologin:${randomBytes(24).toString("hex")}`;
      try {
        const ins = await query<{ id: string }>(
          `INSERT INTO users (name, email, phone, city_code, password_hash, role)
           VALUES ($1, $2, $3, $4, $5, 'member') RETURNING id`,
          [customerName || "عميل", leadEmail, customerPhone, customerCity, noLoginHash]
        );
        return ins[0]?.id ?? null;
      } catch (e: any) {
        if (String(e?.code) !== "23505") throw e;
        if (digits) {
          const r = await query<{ id: string }>(
            `SELECT id FROM users WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') = $1 LIMIT 1`,
            [digits]
          );
          if (r[0]) return r[0].id;
        }
        const r2 = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [leadEmail]);
        return r2[0]?.id ?? null;
      }
    }

    let effectiveUserId: string | null = userId;
    let customerCaptured = false;
    if (!userId && (onlyDigits(customerPhone) || customerEmail)) {
      const leadId = await captureLeadCustomer().catch((e) => { console.error("lead capture failed:", e); return null; });
      if (leadId) { effectiveUserId = leadId; customerCaptured = true; }
    }

    // تكلفة النقل من القاعدة (لا نثق بقيمة من الواجهة)
    let towingCost = 0;
    if (towingMode) {
      const tw = await query<any>(`SELECT cost FROM towing_options WHERE code = $1`, [towingMode]);
      towingCost = Number(tw[0]?.cost) || 0;
    }

    // أسعار الخدمات حسب الحجم
    const priceRows = await query<any>(
      `SELECT s.id, s.slug, s.name, s.is_on_request, s.warranty_months,
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
      // (جديد) ضمان البند — من تاريخ الحجز المجدول + مدة ضمان الخدمة بالشهور.
      const warrantyMonths = r.warranty_months != null ? Number(r.warranty_months) : null;
      let warrantyExpiresAt: string | null = null;
      if (warrantyMonths && warrantyMonths > 0) {
        const start = date ? new Date(date) : new Date();
        start.setMonth(start.getMonth() + warrantyMonths);
        warrantyExpiresAt = start.toISOString();
      }
      return { serviceId: r.id, slug: r.slug, unit, nameSnapshot, commission, warrantyMonths, warrantyExpiresAt };
    });

    const beforePromo = subtotal + towingCost;

    // ── (جديد) خصم بنك العميل — يلغي الخصم اليدوي تمامًا لو اتحقق ──
    let bankDiscount = 0;
    let bankCode: string | null = null;
    let bankBinMatched: string | null = null;
    if (bankCardDigits) {
      const match = await matchBankBin(bankCardDigits);
      if (match) {
        bankCode = match.bankCode;
        bankBinMatched = bankCardDigits;
        bankDiscount = Math.round((beforePromo * match.percent) / 100);
      }
    }

    // الخصم اليدوي — يُحسب في السيرفر بنفس القيمة المُدخَلة فقط، ولا نثق
    // بأي مبلغ خصم جاهز من الواجهة. معطّل تمامًا لو فيه خصم بنك مؤكّد.
    const manualDiscountInput = bankCode ? null : manualDiscountInputRaw;
    let manualDiscountKind: string | null = null;
    let manualDiscountValue: number | null = null;
    let manualDiscountAmount = 0;
    let manualDiscountReason: string | null = null;
    if (manualDiscountInput && manualDiscountInput.value > 0) {
      manualDiscountKind = manualDiscountInput.kind;
      manualDiscountValue = manualDiscountInput.value;
      manualDiscountReason = manualDiscountInput.reason;
      manualDiscountAmount = manualDiscountInput.kind === "percent"
        ? Math.round((beforePromo * Math.min(100, manualDiscountInput.value)) / 100)
        : Math.min(manualDiscountInput.value, beforePromo);
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
    const customTotal = customItems.reduce((s, c) => s + c.price, 0);

    const total = Math.max(0, beforePromo - manualDiscountAmount - bankDiscount) + giftsCharge + customTotal;
    const paidImmediately = paymentMethod !== "cash";
    const paymentStatus = paidImmediately ? "paid" : "pending";

    const bookingRows = await query<{ id: string; reference: string }>(
      `INSERT INTO bookings
         (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
          branch_code, scheduled_date, scheduled_time, subtotal,
          towing_code, towing_cost, towing_address, total, payment_method_code, payment_status,
          manual_discount_kind, manual_discount_value, manual_discount_amount, manual_discount_reason,
          manual_discount_by, manual_discount_at,
          customer_name, customer_phone, customer_email, customer_city,
          partner_id, commission_total, notes,
          whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_in_text,
          bank_discount_amount, bank_code, bank_bin_matched)
       VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
               $18,$19,$20,$21,
               $22::uuid, CASE WHEN $22::uuid IS NOT NULL THEN now() ELSE NULL END,
               $23,$24,$25,$26,
               $27,$28,$29,
               $30, CASE WHEN $30 THEN now() ELSE NULL END, $31,
               $32, $33, $34)
       RETURNING id, reference`,
      [
        effectiveUserId, vehicleLabel, plate, brandId, model, sizeCode, colorCode,
        branchCode, date || null, time, subtotal,
        towingMode, towingCost, towingAddress, total, paymentMethod, paymentStatus,
        manualDiscountKind, manualDiscountValue, manualDiscountAmount, manualDiscountReason,
        manualDiscountKind ? admin.id : null,
        customerName, customerPhone, customerEmail, customerCity,
        partner?.id ?? null, commissionTotal,
        `حجز يدوي بواسطة ${admin.name} من الداشبورد`,
        whatsappOptIn,
        whatsappOptIn ? "موافقة مأخوذة شفهيًا عند الحجز اليدوي بالداشبورد" : null,
        bankDiscount, bankCode, bankBinMatched,
      ]
    );
    const booking = bookingRows[0];

    // ── (جديد) حفظ السيارة تلقائيًا في جراج العميل لو عنده حساب (مسجّل أو زائر التقطناه) ──
    if (effectiveUserId && brandId && model) {
      const plateDigitsSave = (plate || "").match(/[0-9\u0660-\u0669]/g)?.join("") ?? "";
      const plateLettersSave = (plate || "").replace(/[0-9\u0660-\u0669]/g, "").replace(/\s+/g, " ").trim();
      try {
        const existingVehicle = await query<{ id: string }>(
          `SELECT id FROM vehicles
            WHERE user_id = $1 AND brand_id = $2 AND lower(model) = lower($3)
              AND ($4 = '' OR plate_digits = $4)
            LIMIT 1`,
          [effectiveUserId, brandId, model, plateDigitsSave]
        );
        if (!existingVehicle[0]) {
          await query(
            `INSERT INTO vehicles (user_id, brand_id, model, color_code, plate, plate_digits, plate_letters)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [effectiveUserId, brandId, model, colorCode, plate, plateDigitsSave, plateLettersSave]
          );
        }
      } catch (e) { console.error("auto-save vehicle failed:", e); }
    }

    for (const it of items) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot,
            warranty_months, warranty_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,1,$6,$7,$8,$9)`,
        [booking.id, it.serviceId, it.slug, it.nameSnapshot, sizeCode, it.unit, it.commission, it.warrantyMonths, it.warrantyExpiresAt]
      );
    }

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

    for (const c of customItems) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1, NULL, 'custom', $2, $3, $4, 1, $4, 0)`,
        [booking.id, JSON.stringify({ ar: c.name, en: c.name }), sizeCode, c.price]
      );
    }

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1,'upcoming',0,$2)`,
      [booking.id, `أنشئ من الداشبورد بواسطة ${admin.name}` +
        (manualDiscountKind ? ` — خصم ${manualDiscountKind === "percent" ? `${manualDiscountValue}%` : `${manualDiscountValue} ريال`} (${manualDiscountReason || "بدون سبب مذكور"})` : "") +
        (bankCode ? ` — خصم عملاء البنك الأهلي السعودي` : "")]
    ).catch(() => {});

    if (whatsappOptIn && customerPhone) {
      try {
        await enqueueBookingConfirm({
          bookingId: booking.id, reference: booking.reference,
          phone: customerPhone, name: customerName, userId: effectiveUserId,
        });
        if (date) {
          await enqueueBookingReminder({
            bookingId: booking.id, reference: booking.reference,
            phone: customerPhone, name: customerName,
            scheduledDate: date, scheduledTime: time, userId: effectiveUserId,
          });
        }
      } catch (e) { console.error("whatsapp enqueue failed:", e); }
    }

    return NextResponse.json({
      ok: true, bookingId: booking.id, reference: booking.reference, total, giftsCharge, customTotal, commissionTotal,
      customerCaptured, manualDiscountAmount, bankDiscount, bankCode,
    });
  } catch (err) {
    console.error("POST /api/admin/bookings/create failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}