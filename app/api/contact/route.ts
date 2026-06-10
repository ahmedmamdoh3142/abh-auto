import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const intent = body.intent ? String(body.intent).trim() : null;
    const vehicle = body.vehicle ? String(body.vehicle).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const message = body.message ? String(body.message).trim() : null;
    const consent = Boolean(body.consent);
    const locale = body.locale === "en" ? "en" : "ar";

    // تحقّق أساسي من جانب الخادم
    if (!name || !email) {
      return NextResponse.json({ ok: false, error: "name and email are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ ok: false, error: "consent required" }, { status: 400 });
    }

    const rows = await query(
      `INSERT INTO contact_messages (name, intent, vehicle, email, phone, message, consent, locale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [name, intent, vehicle, email, phone, message, consent, locale]
    );

    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error("POST /api/contact failed:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}