// app/api/promo/validate/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false, error: "empty" });

    const rows = await query<any>(
      `SELECT code, discount_percent, is_active, max_uses, used_count, expires_at
       FROM promo_codes WHERE upper(code) = $1 LIMIT 1`,
      [code]
    );
    const p = rows[0];

    if (!p) return NextResponse.json({ ok: false, error: "not_found" });
    if (!p.is_active) return NextResponse.json({ ok: false, error: "inactive" });
    if (p.expires_at && new Date(p.expires_at).getTime() < Date.now())
      return NextResponse.json({ ok: false, error: "expired" });
    if (p.max_uses != null && Number(p.used_count) >= Number(p.max_uses))
      return NextResponse.json({ ok: false, error: "used_up" });

    return NextResponse.json({ ok: true, code: p.code, percent: Number(p.discount_percent) });
  } catch (err) {
    console.error("POST /api/promo/validate failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}