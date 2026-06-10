/**
 * app/api/admin/services/route.ts — CRUD لجدول services (سطح الكتالوج).
 * يكتب الحقول الثنائية كـ jsonb {en,ar}. التسعير حسب pricing_model='multiplier' و base_price + discount_percent.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { cleanLoc, type Loc } from "@/lib/admin/i18n-json";

type Body = {
  id?: number; categoryId: number | null; slug: string;
  name: Loc; tagline: Loc; duration: Loc; warranty: Loc;
  image?: string; badge?: string; basePrice?: number; discount?: number;
  onRequest?: boolean; featured?: boolean; active?: boolean; sort?: number;
};

const j = (v: Loc) => JSON.stringify(cleanLoc(v));

export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = (await request.json()) as Body;
    if (!b.slug || (!b.name?.ar && !b.name?.en)) return NextResponse.json({ ok: false, error: "name_slug_required" }, { status: 400 });

    const rows = await query<{ id: number }>(
      `INSERT INTO services
        (category_id, surface, slug, name, tagline, duration, warranty_duration,
         image, badge, pricing_model, base_price, discount_percent, is_on_request, is_featured, is_active, sort)
       VALUES ($1,'catalog',$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,
         $7,$8,'multiplier',$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [b.categoryId, b.slug.trim(), j(b.name), j(b.tagline), j(b.duration), j(b.warranty),
       b.image || null, b.badge || null, b.basePrice || 0, b.discount || 0,
       !!b.onRequest, !!b.featured, b.active !== false, b.sort || 0]
    );
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = (await request.json()) as Body;
    if (!b.id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    await query(
      `UPDATE services SET
         category_id=$2, slug=$3, name=$4::jsonb, tagline=$5::jsonb,
         duration=$6::jsonb, warranty_duration=$7::jsonb, image=$8, badge=$9,
         base_price=$10, discount_percent=$11, is_on_request=$12, is_featured=$13,
         is_active=$14, updated_at=now()
       WHERE id=$1`,
      [b.id, b.categoryId, b.slug?.trim(), j(b.name), j(b.tagline), j(b.duration), j(b.warranty),
       b.image || null, b.badge || null, b.basePrice || 0, b.discount || 0,
       !!b.onRequest, !!b.featured, b.active !== false]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    await query(`DELETE FROM services WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
