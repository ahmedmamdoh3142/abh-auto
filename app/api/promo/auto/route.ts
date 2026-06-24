// app/api/promo/auto/route.ts — الكود التلقائي العام (تذكرة في صفحة الحجز).
// يرجّع أحدث كود نشط معلّم auto_show=true وعام (مش حملة ولا لعميل بعينه)،
// وساري زمنيًا. الواجهة تعرضه كتذكرة قابلة للنسخ.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const surface = new URL(request.url).searchParams.get("surface") || "booking";
    const rows = await query<any>(
      `SELECT code, kind, COALESCE(discount_percent,0) AS discount_percent,
              fixed_amount, min_order, label, expires_at
         FROM promo_codes
        WHERE auto_show = true
          AND is_active = true
          AND COALESCE(auto_show_surface,'booking') = $1
          AND campaign_id IS NULL
          AND recipient_user_id IS NULL
          AND kind IN ('percentage','fixed')
          AND (starts_at  IS NULL OR starts_at  <= now())
          AND (expires_at IS NULL OR expires_at >  now())
          AND (max_uses   IS NULL OR used_count <  max_uses)
        ORDER BY created_at DESC
        LIMIT 1`,
      [surface]
    );
    const p = rows[0];
    if (!p) return NextResponse.json({ ok: true, promo: null });

    return NextResponse.json({
      ok: true,
      promo: {
        code: p.code,
        kind: p.kind,
        discountPercent: Number(p.discount_percent) || 0,
        fixedAmount: Number(p.fixed_amount) || 0,
        minOrder: Number(p.min_order) || 0,
        label: p.label ?? null,
        expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
      },
    });
  } catch (err) {
    console.error("GET /api/promo/auto failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}