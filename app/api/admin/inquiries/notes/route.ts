/**
 * app/api/admin/inquiries/notes/route.ts — سجل متابعة الاستفسار (contact_message_notes)
 * إضافة ملاحظة على استفسار "جديد/مشوفة" بتحوّل حالته تلقائيًا لـ"تم التواصل".
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

export async function GET(request: Request) {
  try {
    const admin = await getAdminWithPerm("inquiries");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ ok: false, error: "message_id_required" }, { status: 400 });

    const notes = await query<any>(
      `SELECT id, author_id, author_name, body, created_at
         FROM contact_message_notes WHERE message_id = $1 ORDER BY created_at ASC`,
      [messageId]
    );
    return NextResponse.json({ ok: true, notes });
  } catch (err) {
    console.error("GET /api/admin/inquiries/notes failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminWithPerm("inquiries");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = await request.json();
    const messageId = b.messageId ? String(b.messageId) : "";
    const body = b.body ? String(b.body).trim() : "";
    if (!messageId || !body) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });

    const rows = await query<{ id: number }>(
      `INSERT INTO contact_message_notes (message_id, author_id, author_name, body)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [messageId, admin.id, admin.name, body]
    );

    // أول ملاحظة على استفسار جديد/مشوفة → يتحول تلقائيًا لـ"تم التواصل"
    await query(
      `UPDATE contact_messages
          SET status = CASE WHEN status IN ('new','read') THEN 'responded' ELSE status END,
              handled_by = COALESCE(handled_by, $2),
              handled_at = COALESCE(handled_at, now())
        WHERE id = $1`,
      [messageId, admin.id]
    );

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/admin/inquiries/notes failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}