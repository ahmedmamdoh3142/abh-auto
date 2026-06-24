// app/api/admin/auto-code/route.ts — التحكّم في «الكود التلقائي» (تذكرة الحجز).
//   GET  → الأكواد العامة (مش حملة ولا لعميل) مع حالة auto_show.
//   POST → يفعّل كودًا واحدًا كتذكرة ويُلغي الباقي (تذكرة واحدة فعّالة).
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
      `SELECT id, code, label, kind,
              COALESCE(discount_percent,0) AS discount_percent, fixed_amount,
              is_active, COALESCE(auto_show,false) AS auto_show, COALESCE(auto_show_surface,'booking') AS surface,
              expires_at
         FROM promo_codes
        WHERE campaign_id IS NULL AND recipient_user_id IS NULL
        ORDER BY auto_show DESC, created_at DESC`
    );
    return NextResponse.json({
      ok: true,
      codes: rows.map((r) => ({
        id: r.id, code: r.code, label: r.label ?? null, kind: r.kind,
        discountPercent: Number(r.discount_percent) || 0,
        fixedAmount: r.fixed_amount != null ? Number(r.fixed_amount) : null,
        isActive: !!r.is_active, autoShow: !!r.auto_show, surface: r.surface,
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/auto-code failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const autoShow = body.autoShow === true;
    const surface = String(body.surface ?? "booking");
    if (!code) return NextResponse.json({ ok: false, error: "code_required" });

    if (autoShow) {
      // تذكرة واحدة فعّالة: ألغِ الباقي ثم فعّل المختار.
      await query(`UPDATE promo_codes SET auto_show = false WHERE auto_show = true`);
      await query(
        `UPDATE promo_codes SET auto_show = true, auto_show_surface = $2
          WHERE lower(code) = lower($1) AND campaign_id IS NULL AND recipient_user_id IS NULL`,
        [code, surface]
      );
    } else {
      await query(`UPDATE promo_codes SET auto_show = false WHERE lower(code) = lower($1)`, [code]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/auto-code failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}