/**
 * app/api/admin/inquiries/route.ts — استفسارات الموقع (contact_messages) · حالة + حذف
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

const STATUSES = new Set(["new", "read", "responded", "archived"]);

export async function GET() {
  try {
    const admin = await getAdminWithPerm("inquiries");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const rows = await query<any>(
      `SELECT cm.id, cm.name, cm.intent, cm.vehicle, cm.email, cm.phone, cm.message,
              cm.consent, cm.locale, cm.status, cm.created_at,
              cm.handled_by, cm.handled_at, u.name AS handled_by_name,
              COALESCE((SELECT count(*) FROM contact_message_notes n WHERE n.message_id = cm.id), 0)::int AS notes_count
         FROM contact_messages cm
         LEFT JOIN users u ON u.id = cm.handled_by
        ORDER BY cm.created_at DESC`
    );
    return NextResponse.json({ ok: true, messages: rows });
  } catch (err) {
    console.error("GET /api/admin/inquiries failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminWithPerm("inquiries");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = await request.json();
    if (!b.id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    if (!b.status || !STATUSES.has(b.status)) return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });

    if (b.status === "responded") {
      await query(
        `UPDATE contact_messages SET status = $2, handled_by = $3, handled_at = now() WHERE id = $1`,
        [b.id, b.status, admin.id]
      );
    } else {
      await query(`UPDATE contact_messages SET status = $2 WHERE id = $1`, [b.id, b.status]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/inquiries failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminWithPerm("inquiries");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    await query(`DELETE FROM contact_message_notes WHERE message_id=$1`, [id]).catch(() => {});
    await query(`DELETE FROM contact_messages WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/inquiries failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}