import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const offers = await query(
      `SELECT slug, tag->>$1 AS tag, title->>$1 AS title, copy->>$1 AS copy,
              discount_label, image
       FROM offers WHERE collection='home' AND is_active=true ORDER BY sort`,
      [locale]
    );

    const projects = await query(
      `SELECT slug, title, category_label->>$1 AS category, craft, year,
              image_after, image_before
       FROM projects WHERE is_active=true ORDER BY sort`,
      [locale]
    );

    const testimonials = await query(
      `SELECT name, role->>$1 AS role, quote->>$1 AS quote, rating, avatar_url
       FROM testimonials WHERE is_active=true ORDER BY sort`,
      [locale]
    );

    const stats = await query(
      `SELECT code, value, suffix, label->>$1 AS label FROM stats ORDER BY sort`,
      [locale]
    );

    const marquee = await query(
      `SELECT label->>$1 AS label FROM marquee_items ORDER BY sort`,
      [locale]
    );

    const imagesRow = await query(`SELECT value FROM settings WHERE key='images'`);
    const images = imagesRow[0]?.value ?? {};

    return NextResponse.json({
      ok: true, locale,
      offers, projects, testimonials, stats, marquee,
      images, // فيه why / offers / service / projects
    });
  } catch (err) {
    console.error("GET /api/home failed:", err);
    return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
  }
}