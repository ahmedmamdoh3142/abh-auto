import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// يرجع كل النصوص للغة المطلوبة: { hero:{...}, banner:{...}, footer:{...}, ... }
// أو namespace واحد فقط عبر ?key=hero
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const key = url.searchParams.get("key");

  try {
    const rows = key
      ? await query(
          `SELECT key, value->$2 AS content FROM content_blocks WHERE key = $1`,
          [key, locale]
        )
      : await query(
          `SELECT key, value->$1 AS content FROM content_blocks ORDER BY key`,
          [locale]
        );

    const content: Record<string, unknown> = {};
    for (const r of rows as { key: string; content: unknown }[]) {
      content[r.key] = r.content;
    }

    return NextResponse.json({ ok: true, locale, content });
  } catch (err) {
    console.error("GET /api/content failed:", err);
    return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
  }
}
