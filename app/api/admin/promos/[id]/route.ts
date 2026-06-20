// app/api/admin/promos/[id]/route.ts — إحصائيات تفصيلية لكود واحد.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ترجمة حقل اسم متعدّد اللغات (jsonb {ar,en}) إلى نص حسب اللغة.
function pick(j: any, locale: string): string {
  if (!j) return "";
  if (typeof j === "string") return j;
  return j[locale] ?? j.ar ?? j.en ?? "";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "ar";

    const pr = await query<any>(
      `SELECT id, code, kind, label, description,
              COALESCE(discount_percent,0) AS discount_percent,
              fixed_amount, min_order, max_uses, used_count, per_user_limit,
              is_active, starts_at, expires_at, created_at
       FROM promo_codes WHERE id = $1 LIMIT 1`,
      [id]
    );
    const p = pr[0];
    if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // ملخّص
    const sumRows = await query<any>(
      `SELECT count(*)::int AS redemptions,
              COALESCE(sum(discount_amount),0) AS total_discount,
              COALESCE(sum(order_total),0)     AS total_revenue,
              COALESCE(avg(order_total),0)     AS avg_order,
              count(DISTINCT user_id)::int     AS unique_users
       FROM promo_redemptions WHERE promo_id = $1`,
      [id]
    );
    const summary = sumRows[0] ?? {};

    // الاستخدام عبر الوقت (آخر 30 يوم) — للرسم البياني
    const series = await query<any>(
      `SELECT to_char(date_trunc('day', redeemed_at), 'YYYY-MM-DD') AS day,
              count(*)::int AS uses,
              COALESCE(sum(discount_amount),0) AS discount
       FROM promo_redemptions
       WHERE promo_id = $1 AND redeemed_at >= now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`,
      [id]
    );

    // سجل الاستخدام (آخر 100)
    const redemptions = await query<any>(
      `SELECT r.id, r.code, r.customer_name, r.customer_email,
              r.order_subtotal, r.discount_amount, r.order_total, r.redeemed_at,
              b.reference
       FROM promo_redemptions r
       LEFT JOIN bookings b ON b.id = r.booking_id
       WHERE r.promo_id = $1
       ORDER BY r.redeemed_at DESC LIMIT 100`,
      [id]
    );

    // خدمات الكود
    const svc = await query<any>(
      `SELECT s.id AS service_id, s.name AS name_raw, ps.amount_mode, ps.value
       FROM promo_code_services ps
       JOIN services s ON s.id = ps.service_id
       WHERE ps.promo_id = $1`,
      [id]
    );

    return NextResponse.json({
      ok: true,
      promo: {
        id: p.id, code: p.code, kind: p.kind, label: p.label, description: p.description,
        discountPercent: Number(p.discount_percent) || 0,
        fixedAmount: Number(p.fixed_amount) || 0,
        minOrder: Number(p.min_order) || 0,
        maxUses: p.max_uses != null ? Number(p.max_uses) : null,
        usedCount: Number(p.used_count) || 0,
        perUserLimit: p.per_user_limit != null ? Number(p.per_user_limit) : null,
        isActive: !!p.is_active,
        startsAt: p.starts_at ? new Date(p.starts_at).toISOString() : null,
        expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
        createdAt: new Date(p.created_at).toISOString(),
      },
      summary: {
        redemptions: Number(summary.redemptions) || 0,
        totalDiscount: Number(summary.total_discount) || 0,
        totalRevenue: Number(summary.total_revenue) || 0,
        avgOrder: Number(summary.avg_order) || 0,
        uniqueUsers: Number(summary.unique_users) || 0,
        remaining: p.max_uses != null ? Math.max(0, Number(p.max_uses) - Number(p.used_count)) : null,
      },
      series: series.map((s) => ({ day: s.day, uses: Number(s.uses), discount: Number(s.discount) })),
      redemptions: redemptions.map((r) => ({
        id: String(r.id), code: r.code, reference: r.reference ?? null,
        customerName: r.customer_name ?? null, customerEmail: r.customer_email ?? null,
        orderSubtotal: Number(r.order_subtotal) || 0,
        discountAmount: Number(r.discount_amount) || 0,
        orderTotal: Number(r.order_total) || 0,
        redeemedAt: new Date(r.redeemed_at).toISOString(),
      })),
      services: svc.map((s) => ({
        serviceId: Number(s.service_id),
        name: pick(s.name_raw, locale),
        amountMode: s.amount_mode,
        value: Number(s.value),
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/promos/[id] failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}