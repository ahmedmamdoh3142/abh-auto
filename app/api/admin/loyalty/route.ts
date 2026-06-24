// app/api/admin/loyalty/route.ts — تعديل مستويات الولاء (العتبات/الخصومات/المزايا).
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const u = await getCurrentUser();
  return u && (u.role === "admin" || u.role === "staff") ? u : null;
}

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await query<any>(
      `SELECT code, name, threshold, discount_percent, perks, hex, icon, sort, is_active
         FROM loyalty_tiers ORDER BY sort, threshold`
    );
    return NextResponse.json({
      ok: true,
      tiers: rows.map((r) => ({
        code: r.code, name: r.name, threshold: Number(r.threshold) || 0,
        discountPercent: Number(r.discount_percent) || 0,
        perks: r.perks ?? { ar: [], en: [] }, hex: r.hex, icon: r.icon,
        sort: Number(r.sort) || 0, isActive: !!r.is_active,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/loyalty failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** PATCH — تحديث مستوى واحد. */
export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    const code = String(b.code ?? "");
    if (!code) return NextResponse.json({ ok: false, error: "code_required" });

    const threshold = Math.max(0, Number(b.threshold) || 0);
    const discount = Math.max(0, Math.min(100, Number(b.discountPercent) || 0));
    const perks = b.perks && (Array.isArray(b.perks.ar) || Array.isArray(b.perks.en))
      ? { ar: (b.perks.ar ?? []).filter(Boolean), en: (b.perks.en ?? []).filter(Boolean) }
      : null;
    const isActive = b.isActive !== false;

    await query(
      `UPDATE loyalty_tiers
          SET threshold = $2, discount_percent = $3,
              perks = COALESCE($4, perks), is_active = $5, updated_at = now()
        WHERE code = $1`,
      [code, threshold, discount, perks ? JSON.stringify(perks) : null, isActive]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/loyalty failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}