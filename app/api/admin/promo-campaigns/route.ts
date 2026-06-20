// app/api/admin/promo-campaigns/route.ts — إنشاء حملات الأكواد الموجّهة + عرضها.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCampaign } from "@/lib/promo-campaigns";

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;
  return user;
}

/** GET — قائمة الحملات + ملخّص استخدام كل حملة. */
export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await query<any>(
      `SELECT c.id, c.label, c.kind, c.discount_percent, c.fixed_amount, c.min_order,
              c.expires_at, c.audience, c.recipients, c.created_at,
              COUNT(pc.id)::int                                   AS codes,
              COUNT(pc.id) FILTER (WHERE pc.used_count > 0)::int  AS used
       FROM promo_campaigns c
       LEFT JOIN promo_codes pc ON pc.campaign_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    const campaigns = rows.map((c) => ({
      id: c.id, label: c.label, kind: c.kind,
      discountPercent: Number(c.discount_percent) || 0,
      fixedAmount: Number(c.fixed_amount) || 0,
      minOrder: Number(c.min_order) || 0,
      expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null,
      audience: c.audience, recipients: Number(c.recipients) || 0,
      codes: Number(c.codes) || 0, used: Number(c.used) || 0,
      createdAt: new Date(c.created_at).toISOString(),
    }));
    return NextResponse.json({ ok: true, campaigns });
  } catch (err) {
    console.error("GET /api/admin/promo-campaigns failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** POST — إنشاء حملة جديدة وتوليد الأكواد. */
export async function POST(request: Request) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    const kind = b.kind === "fixed" ? "fixed" : "percentage";
    const label = String(b.label ?? "").trim();
    if (!label) return NextResponse.json({ ok: false, error: "label_required" });

    const audience = b.audience === "user" ? "user" : "all";
    if (audience === "user" && !b.userId) return NextResponse.json({ ok: false, error: "user_required" });

    const res = await createCampaign({
      label, kind,
      discountPercent: Math.max(0, Math.min(100, Number(b.discountPercent) || 0)),
      fixedAmount: Math.max(0, Number(b.fixedAmount) || 0),
      minOrder: Math.max(0, Number(b.minOrder) || 0),
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      audience, userId: b.userId ?? null, createdBy: admin.id,
    });

    if (res.recipients === 0) return NextResponse.json({ ok: false, error: "no_recipients" });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("POST /api/admin/promo-campaigns failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** DELETE ?id= — حذف حملة (وأكوادها عبر CASCADE). */
export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });
    await query(`DELETE FROM promo_campaigns WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/promo-campaigns failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}