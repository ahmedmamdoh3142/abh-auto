// app/api/brand-models/route.ts
// إضافة موديل سيارة يدوي لو مش موجود بالقائمة — يُستخدم من الموقع والداشبورد.
// لو الموديل موجود بالفعل بنفس الاسم (بدون حساسية لحالة الأحرف) بيرجّعه بدل التكرار.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const SIZE_OK = new Set(["small", "medium", "large"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brandId = body.brandId ? String(body.brandId).trim() : "";
    const name = body.name ? String(body.name).trim() : "";
    const size = SIZE_OK.has(body.size) ? String(body.size) : "large";

    if (!brandId || !name) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    if (name.length > 80) {
      return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });
    }

    const brandRows = await query<any>(
      `SELECT id FROM brands WHERE id = $1 AND is_active = true`,
      [brandId]
    );
    if (brandRows.length === 0) {
      return NextResponse.json({ ok: false, error: "brand_not_found" }, { status: 404 });
    }

    // موجود بالفعل؟ (بدون حساسية لحالة الأحرف) — نرجّعه بدل تكرار الإدخال
    const existing = await query<any>(
      `SELECT id, name, size_code FROM brand_models WHERE brand_id = $1 AND lower(name) = lower($2) LIMIT 1`,
      [brandId, name]
    );
    if (existing[0]) {
      return NextResponse.json({
        ok: true,
        existed: true,
        model: { id: existing[0].id, name: existing[0].name, size: existing[0].size_code },
      });
    }

    const inserted = await query<any>(
      `INSERT INTO brand_models (brand_id, name, size_code, sort, is_active)
       VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort) FROM brand_models WHERE brand_id = $1), -1) + 1, true)
       RETURNING id, name, size_code`,
      [brandId, name, size]
    );

    return NextResponse.json({
      ok: true,
      existed: false,
      model: { id: inserted[0].id, name: inserted[0].name, size: inserted[0].size_code },
    });
  } catch (err) {
    console.error("POST /api/brand-models failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}