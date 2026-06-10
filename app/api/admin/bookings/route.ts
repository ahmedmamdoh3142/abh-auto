/**
 * app/api/admin/bookings/route.ts
 * PATCH: تحديث مرحلة/حالة الحجز أو إلغاؤه. يسجّل في booking_status_history.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const b = await request.json();
    const id = String(b.id ?? "");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    // إلغاء
    if (b.action === "cancel") {
      const rows = await query<any>(
        `UPDATE bookings SET status='cancelled', updated_at=now() WHERE id=$1
         RETURNING status, stage`,
        [id]
      );
      if (!rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note) VALUES ($1,'cancelled',$2,$3)`,
        [id, rows[0].stage ?? 0, `أُلغِي بواسطة ${admin.name}`]
      ).catch(() => {});
      return NextResponse.json({ ok: true, booking: { status: "cancelled" } });
    }

    // تحديث المرحلة (0..3). المرحلة 3 = مكتمل، وأي مرحلة أثناء "قادم" تنقله لـ "قيد التنفيذ".
    if (b.stage != null) {
      const stage = Math.max(0, Math.min(3, Number(b.stage)));
      const rows = await query<any>(
        `UPDATE bookings
         SET stage = $2,
             status = CASE
               WHEN $2 >= 3 THEN 'completed'::booking_status
               WHEN status = 'upcoming' THEN 'active'::booking_status
               ELSE status
             END,
             updated_at = now()
         WHERE id = $1
         RETURNING status, stage`,
        [id, stage]
      );
      if (!rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note) VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage, `تحديث مرحلة بواسطة ${admin.name}`]
      ).catch(() => {});
      return NextResponse.json({ ok: true, booking: { status: rows[0].status, stage: rows[0].stage } });
    }

    return NextResponse.json({ ok: false, error: "no_op" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/admin/bookings failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
