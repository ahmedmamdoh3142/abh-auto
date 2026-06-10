import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// يدمج جزئي اللوحة (أرقام + حروف) في نص واحد للعرض/التوافق
function joinPlate(digits?: string, letters?: string, fallback?: string): string {
  const d = (digits ?? "").trim();
  const l = (letters ?? "").trim();
  const combined = [d, l].filter(Boolean).join(" ");
  return combined || (fallback ?? "").trim();
}

// إضافة عربية
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const b = await request.json();
    const brandId = b.brandId ? String(b.brandId) : null;
    const model = b.model ? String(b.model) : null;
    const colorKey = b.colorKey ? String(b.colorKey) : null;
    const year = b.year ? String(b.year) : null;
    const plateDigits = b.plateDigits != null ? String(b.plateDigits).trim() : null;
    const plateLetters = b.plateLetters != null ? String(b.plateLetters).trim() : null;
    const plate = joinPlate(plateDigits ?? undefined, plateLetters ?? undefined, b.plate);

    const rows = await query<{ id: string }>(
      `INSERT INTO vehicles (user_id, brand_id, model, color_code, plate, plate_digits, plate_letters, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.id, brandId, model, colorKey, plate || null, plateDigits, plateLetters, year]
    );

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/account/vehicles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// تعديل عربية
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const b = await request.json();
    const id = String(b.id ?? "");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    const plateDigits = b.plateDigits != null ? String(b.plateDigits).trim() : null;
    const plateLetters = b.plateLetters != null ? String(b.plateLetters).trim() : null;
    const plate = joinPlate(plateDigits ?? undefined, plateLetters ?? undefined, b.plate);

    await query(
      `UPDATE vehicles
       SET brand_id = $1, model = $2, color_code = $3,
           plate = $4, plate_digits = $5, plate_letters = $6, year = $7
       WHERE id = $8 AND user_id = $9`,
      [
        b.brandId ?? null, b.model ?? null, b.colorKey ?? null,
        plate || null, plateDigits, plateLetters, b.year ?? null,
        id, user.id,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/account/vehicles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// حذف عربية
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    await query(`DELETE FROM vehicles WHERE id = $1 AND user_id = $2`, [id, user.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account/vehicles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}