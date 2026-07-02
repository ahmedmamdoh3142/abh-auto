// app/api/booking/route.ts
// (+ partner pricing & commission + promo v2 + loyalty discount + pending-on-unpaid
//  + التقاط العميل: لو بيانات العميل مختلفة عنك يتسجّل كعميل lead للاستهداف،
//    لكن الحجز يفضل مربوطًا بحسابك أنت/الشريك كما هو.)
//  + (جديد) كوبون هدية عجلة الحظ (kind=gift_service): يضيف الخدمة المُهداة
//    مجانًا فوق الطلب بدل أي خصم.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";
import { getPromoByCode, checkPromoValidity, computePromo, recordRedemption, type PromoLine } from "@/lib/promo";
import { getLoyaltyDiscountPercent } from "@/lib/loyalty";
import { getBundleById, giftChargeFor } from "@/lib/bundles";
import { enqueueBookingConfirm, enqueueBookingReminder, waEnabled } from "@/lib/whatsapp";

const SIZE_UI_TO_DB: Record<string, string> = { small: "small", medium: "medium", large: "large" };
const onlyDigits = (s: string | null | undefined) => (s || "").replace(/[^0-9]/g, "");

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
    const giftInputs: { slug: string; bundleId: string }[] = Array.isArray(body.gifts)
      ? body.gifts
          .map((g: any) => ({ slug: String(g?.slug || ""), bundleId: String(g?.bundleId || "") }))
          .filter((g: any) => g.slug && g.bundleId)
      : [];
    const promoCodeInput = !partner && body.promoCode ? String(body.promoCode).trim() : null;

    const customerName = body.name ? String(body.name).trim() : null;
    const customerPhone = body.phone ? String(body.phone).trim() : null;
    const customerEmail = body.email ? String(body.email).trim() : null;
    const customerCity = body.city ? String(body.city).trim() : null;
    const whatsappOptIn = body.whatsappOptIn === true;
    const whatsappOptInText = body.whatsappOptInText ? String(body.whatsappOptInText).trim() : null;

    if (services.length === 0) {
      return NextResponse.json({ ok: false, error: "no_services" }, { status: 400 });
    }

    // ════════════ التقاط العميل للاستهداف (لا يغيّر ملكية الحجز) ════════════
    const digits = onlyDigits(customerPhone);
    const selfDigits = onlyDigits(user?.phone);
    const usableEmail =
      customerEmail && (!user?.email || customerEmail.toLowerCase() !== user.email.toLowerCase())
        ? customerEmail.toLowerCase()
        : null;

    const isDifferentPerson = (() => {
      if (!user) return !!(digits || usableEmail);
      if (digits && selfDigits) return digits !== selfDigits;
      if (usableEmail && user.email) return true;
      if (customerName && user.name) return customerName !== user.name.trim();
      return false;
    })();

    async function captureLeadCustomer(): Promise<void> {
      if (digits) {
        const r = await query<{ id: string; name: string | null }>(
          `SELECT id, name FROM users WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') = $1 LIMIT 1`,
          [digits]
        );
        if (r[0]) {
          if (!r[0].name && customerName) await query(`UPDATE users SET name = $2 WHERE id = $1`, [r[0].id, customerName]);
          return;
        }
      }
      if (usableEmail) {
        const r = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [usableEmail]);
        if (r[0]) return;
      }
      const leadEmail = usableEmail || (digits ? `${digits}@lead.abh-auto.com` : null);
      if (!leadEmail) return;
      const noLoginHash = `nologin:${randomBytes(24).toString("hex")}`;
      try {
        await query(
          `INSERT INTO users (name, email, phone, city_code, password_hash, role)
           VALUES ($1, $2, $3, $4, $5, 'member')`,
          [customerName || "عميل", leadEmail, customerPhone, customerCity, noLoginHash]
        );
      } catch (e: any) {
        if (String(e?.code) !== "23505") throw e;
      }
    }

    let customerCaptured = false;
    if (isDifferentPerson) {
      await captureLeadCustomer()
        .then(() => { customerCaptured = true; })
        .catch((e) => console.error("lead capture failed:", e));
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
    let giftCouponServiceId: number | null = null; // كوبون هدية → خدمة تتضاف مجانًا

    if (promoCodeInput) {
      const promo = await getPromoByCode(promoCodeInput);
      if (promo) {
        const invalid = await checkPromoValidity(promo, user?.id);
        if (!invalid) {
          if (promo.kind === "gift_service" && promo.giftServiceId) {
            // كوبون هدية: لا خصم — الخدمة تتضاف مجانًا (مع مراعاة الحد الأدنى لو موجود).
            if (!(promo.minOrder > 0 && beforePromo < promo.minOrder)) {
              promoId = promo.id; promoCode = promo.code; promoKind = promo.kind; promoDiscount = 0;
              giftCouponServiceId = promo.giftServiceId;
            }
          } else {
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
    }

    // ── خصم الولاء — على حسابك أنت صاحب الحجز (كما هو الأصل) ──
    let loyaltyDiscount = 0;
    if (!partner && !promoCode && user?.id) {
      const loyaltyPct = await getLoyaltyDiscountPercent(user.id);
      loyaltyDiscount = Math.round((subtotal * loyaltyPct) / 100);
    }

    // ── هدايا البندلات — تُسعّر وتُتحقّق من جهة الخادم ──
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

    const total = Math.max(0, beforePromo - promoDiscount - loyaltyDiscount) + giftsCharge;
    // مفيش بوابة دفع مفعّلة فعليًا بعد — كل الحجوزات تبقى "بانتظار الدفع"
    // (تُأكَّد يدويًا أو عند تفعيل بوابة تتحقق من الدفع فعلًا).
    const paidImmediately = false;
    const paymentStatus = "pending";

    // الحجز يفضل مربوطًا بحسابك أنت/الشريك (user.id) كما هو.
    const bookingRows = await query<{ id: string; reference: string }>(
      `INSERT INTO bookings
         (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
          branch_code, scheduled_date, scheduled_time, subtotal,
          towing_code, towing_cost, towing_address, total, payment_method_code, payment_status,
          promo_code, promo_discount, promo_kind,
          customer_name, customer_phone, customer_email, customer_city,
          partner_id, commission_total,
          whatsapp_opt_in, whatsapp_opt_in_at, whatsapp_opt_in_text, loyalty_discount)
       VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               $20,$21,$22,$23,$24,$25,$26,
               $27, CASE WHEN $27 THEN now() ELSE NULL END, $28, $29)
       RETURNING id, reference`,
      [
        user?.id ?? null, vehicleLabel, plate, brandId, model, sizeCode, colorCode,
        branchCode, date || null, time, subtotal,
        towingMode, towingCost, towingAddress, total, paymentMethod, paymentStatus,
        promoCode, promoDiscount, promoKind,
        customerName, customerPhone, customerEmail, customerCity,
        partner?.id ?? null, commissionTotal,
        whatsappOptIn, whatsappOptInText, loyaltyDiscount,
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

    for (const g of giftLines) {
      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $6, 0)`,
        [booking.id, g.serviceId, g.slug, g.nameSnapshot, sizeCode, g.unit]
      );
      await query(
        `INSERT INTO booking_bundle_gifts (booking_id, bundle_id, gift_service_id, gift_value)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, g.bundleId, g.serviceId, g.giftValue]
      );
    }

    // ── هدية كوبون عجلة الحظ — خدمة مجانية فوق الطلب (مش خصم) ──
    if (giftCouponServiceId) {
      const gr = await query<any>(
        `SELECT id, slug, name FROM services WHERE id = $1 LIMIT 1`,
        [giftCouponServiceId]
      );
      const g = gr[0];
      if (g) {
        await query(
          `INSERT INTO booking_items
             (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
           VALUES ($1, $2, $3, $4, $5, 0, 1, 0, 0)`,
          [booking.id, g.id, g.slug, g.name ? JSON.stringify(g.name) : null, sizeCode]
        );
        await query(
          `INSERT INTO booking_bundle_gifts (booking_id, bundle_id, gift_service_id, gift_value)
           VALUES ($1, NULL, $2, $3)`,
          [booking.id, g.id, 0]
        ).catch(() => {}); // لو bundle_id لا يقبل NULL، يتجاهل — البند المجاني اتسجّل بالفعل
      }
    }

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
      loyaltyDiscount,
      giftsCharge,
      isPartner: !!partner,
      commissionTotal,
      customerCaptured,
    });
  } catch (err) {
    console.error("POST /api/booking failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}