import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const rows = await query(
      `
      SELECT
        s.slug,
        s.name->>$1        AS name,
        s.tagline->>$1     AS tagline,
        s.description->>$1 AS description,
        s.image,
        s.badge,
        s.duration->>$1         AS duration,
        s.warranty_duration->>$1 AS warranty,
        cat.slug AS category,
        COALESCE(
          (SELECT jsonb_object_agg(sp.size_code, sp.price)
             FROM service_prices sp WHERE sp.service_id = s.id),
          '{}'::jsonb
        ) AS prices
      FROM services s
      LEFT JOIN service_categories cat ON cat.id = s.category_id
      WHERE s.surface = 'catalog' AND s.is_active = true
      ORDER BY cat.sort, s.sort
      `,
      [locale]
    );

    return NextResponse.json({ ok: true, locale, count: rows.length, services: rows });
  } catch (err) {
    console.error("GET /api/services failed:", err);
    return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
  }
}
