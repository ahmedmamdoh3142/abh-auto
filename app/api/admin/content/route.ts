/**
 * app/api/admin/content/route.ts — تحديث نص في content_blocks (jsonb {en,ar}).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { cleanLoc, type Loc } from "@/lib/admin/i18n-json";

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = (await request.json()) as { key: string; value: Loc };
    if (!b.key) return NextResponse.json({ ok: false, error: "key_required" }, { status: 400 });

    await query(
      `INSERT INTO content_blocks (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [b.key, JSON.stringify(cleanLoc(b.value))]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/content failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
