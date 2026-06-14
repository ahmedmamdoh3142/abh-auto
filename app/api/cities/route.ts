// app/api/cities/route.ts
// يرجّع المدن النشطة من جدول cities (مش static) لاستخدامها في فورم التسجيل.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query<any>(
      `SELECT code, name FROM cities WHERE is_active = true ORDER BY sort, code`
    );
    const cities = rows.map((c) => ({
      code: c.code,
      // name jsonb {ar,en}
      name: typeof c.name === "string" ? { ar: c.name, en: c.name } : (c.name ?? {}),
    }));
    return NextResponse.json({ ok: true, cities });
  } catch (err) {
    console.error("GET /api/cities failed:", err);
    return NextResponse.json({ ok: false, error: "server_error", cities: [] }, { status: 500 });
  }
}