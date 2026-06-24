// app/api/account/promos/route.ts — أكواد الخصم الموجّهة للعميل الحالي (لصفحة /account).
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    // الأكواد المُرسلة لهذا المستخدم عبر حملة موجّهة + اسم المناسبة (label).
    // نأخذ الاسم من الحملة إن وُجد، وإلا من label المخزّن على الكود نفسه.
    const rows = await query<any>(
      `SELECT pc.code, pc.kind, COALESCE(pc.discount_percent,0) AS discount_percent, pc.fixed_amount,
              pc.min_order, pc.expires_at, pc.is_active, pc.used_count, pc.max_uses,
              COALESCE(c.label, pc.label) AS occasion
       FROM promo_codes pc
       LEFT JOIN promo_campaigns c ON c.id = pc.campaign_id
       WHERE pc.recipient_user_id = $1 
       ORDER BY pc.created_at DESC`,
      [user.id]
    );
    const now = Date.now();
    const promos = rows.map((p) => {
      const expired = !!p.expires_at && new Date(p.expires_at).getTime() < now;
      const used = Number(p.used_count) > 0;
      return {
        code: p.code,
        label: p.occasion ?? null,          // (طلب 7) اسم المناسبة
        kind: p.kind,
        discountPercent: Number(p.discount_percent) || 0,
        fixedAmount: Number(p.fixed_amount) || 0,
        minOrder: Number(p.min_order) || 0,
        expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
        status: used ? "used" : expired ? "expired" : !p.is_active ? "inactive" : "active",
      };
    });
    return NextResponse.json({ ok: true, promos });
  } catch (err) {
    console.error("GET /api/account/promos failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}