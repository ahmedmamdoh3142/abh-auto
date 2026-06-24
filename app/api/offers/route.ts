// app/api/offers/route.ts — بيانات صفحة العروض (عام، جاهزة للعرض).
// يرجّع البندلات النشطة بأسماء وصور وأسعار خدماتها + الكود التلقائي العام + حالة العجلة.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getActiveBundles, giftChargeFor } from "@/lib/bundles";

export async function GET() {
  try {
    const bundles = await getActiveBundles();

    // اجمع كل معرّفات الخدمات (triggers + gifts) لجلب بياناتها مرة واحدة.
    const ids = [...new Set(bundles.flatMap((b) => [...b.triggerIds, ...b.giftIds]))];
    const svc = new Map<number, { id: number; name: any; image: string | null; price: number }>();
    if (ids.length) {
      const rows = await query<any>(
        `SELECT s.id, s.name, s.image, sp.price
           FROM services s
           LEFT JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code = 'large'
          WHERE s.id = ANY($1)`,
        [ids]
      );
      for (const r of rows) svc.set(Number(r.id), { id: Number(r.id), name: r.name, image: r.image ?? null, price: Number(r.price) || 0 });
    }

    const bundlesOut = bundles.map((b) => ({
      id: b.id,
      title: b.title,
      giftMode: b.giftMode,
      giftPercent: b.giftPercent,
      minTriggerCount: b.minTriggerCount,
      maxGifts: b.maxGifts,
      triggers: b.triggerIds.map((id) => svc.get(id)).filter(Boolean),
      gifts: b.giftIds
        .map((id) => { const s = svc.get(id); return s ? { ...s, charge: giftChargeFor(s.price, b.giftPercent) } : null; })
        .filter(Boolean),
    }));

    // الكود التلقائي العام
    const codeRows = await query<any>(
      `SELECT code, kind, COALESCE(discount_percent,0) AS discount_percent, fixed_amount, min_order, label, expires_at
         FROM promo_codes
        WHERE auto_show = true AND is_active = true
          AND campaign_id IS NULL AND recipient_user_id IS NULL
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY created_at DESC LIMIT 1`
    );
    const c = codeRows[0];
    const autoCode = c ? {
      code: c.code, kind: c.kind,
      discountPercent: Number(c.discount_percent) || 0,
      fixedAmount: c.fixed_amount != null ? Number(c.fixed_amount) : null,
      minOrder: Number(c.min_order) || 0,
      label: c.label ?? null,
      expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null,
    } : null;

    const wheelRows = await query<any>(`SELECT is_active FROM wheel_config WHERE id = 1`);
    const wheelActive = !!wheelRows[0]?.is_active;

    return NextResponse.json({ ok: true, bundles: bundlesOut, autoCode, wheelActive });
  } catch (err) {
    console.error("GET /api/offers failed:", err);
    return NextResponse.json({ ok: false, error: "server_error", bundles: [], autoCode: null, wheelActive: false }, { status: 500 });
  }
}