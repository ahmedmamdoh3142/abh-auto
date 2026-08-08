/**
 * app/api/admin/maintenance/route.ts — قبول/رفض طلبات صيانة الضمان (أدمن/موظّف).
 *
 * PATCH { id, action: 'approve' }              → ينشئ حجز صيانة حقيقي مجاني
 *        (total = 0, payment_status = 'paid') يدخل نفس مسار العمل العادي بالضبط
 *        (استلام → تشغيل → فحص جودة → تسليم) بدون أي فلوس.
 * PATCH { id, action: 'reject', reason }        → سبب إجباري.
 *
 * ملاحظة: القائمة نفسها (GET) بتتحمّل من app/admin/maintenance/page.tsx مباشرة
 * من القاعدة (نفس نمط app/admin/bookings/page.tsx عندك) — الراوت ده للتعديلات بس.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const id = String(b.id ?? "");
    const action = String(b.action ?? "");
    if (!id) return bad("id_required");

    const cur = await query<any>(`SELECT * FROM maintenance_requests WHERE id = $1`, [id]);
    if (!cur[0]) return bad("not_found", 404);
    if (cur[0].status !== "pending") return bad("already_reviewed");

    if (action === "reject") {
      const reason = String(b.reason ?? "").trim();
      if (!reason) return bad("reason_required");
      const rows = await query<any>(
        `UPDATE maintenance_requests
            SET status='rejected', rejection_reason=$2, reviewed_by=$3, reviewed_at=now(), updated_at=now()
          WHERE id=$1
        RETURNING status, rejection_reason`,
        [id, reason, admin.id]
      );
      return NextResponse.json({ ok: true, request: { status: rows[0].status, rejectionReason: rows[0].rejection_reason } });
    }

    if (action === "approve") {
      const r = cur[0];

      // ── ننشئ حجز صيانة حقيقي مجاني — نفس مسار الحجز العادي، بس total = 0 ──
      const bookingRows = await query<{ id: string; reference: string }>(
        `INSERT INTO bookings
           (user_id, status, vehicle_label, plate, brand_id, model, size_code, color_code,
            branch_code, scheduled_date, scheduled_time, subtotal, total,
            payment_method_code, payment_status, notes, is_maintenance, maintenance_request_id)
         VALUES ($1,'upcoming',$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,'cash','paid',$11,true,$12)
         RETURNING id, reference`,
        [
          r.user_id,
          r.vehicle_label,
          r.plate,
          r.brand_id,
          r.model,
          r.size_code,
          r.color_code,
          r.branch_code,
          r.preferred_date,
          r.preferred_time,
          `صيانة ضمان — تمت الموافقة بواسطة ${admin.name}`,
          id,
        ]
      );
      const booking = bookingRows[0];

      await query(
        `INSERT INTO booking_items
           (booking_id, service_id, service_slug, name_snapshot, size_code, unit_price, quantity, line_total, commission_snapshot)
         VALUES ($1, $2, 'warranty_maintenance', $3, $4, 0, 1, 0, 0)`,
        [
          booking.id,
          r.warranty_service_id,
          JSON.stringify({
            ar: `صيانة ضمان — ${r.problem_description}`.slice(0, 500),
            en: `Warranty service — ${r.problem_description}`.slice(0, 500),
          }),
          r.size_code,
        ]
      );

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,'upcoming',0,$2)`,
        [booking.id, `حجز صيانة ضمان — طلب رقم ${id} — تمت الموافقة بواسطة ${admin.name}`]
      ).catch(() => {});

      const rows = await query<any>(
        `UPDATE maintenance_requests
            SET status='approved', reviewed_by=$2, reviewed_at=now(), resulting_booking_id=$3, updated_at=now()
          WHERE id=$1
        RETURNING status`,
        [id, admin.id, booking.id]
      );

      return NextResponse.json({
        ok: true,
        request: { status: rows[0].status },
        booking: { id: booking.id, reference: booking.reference },
      });
    }

    return bad("no_op");
  } catch (err) {
    console.error("PATCH /api/admin/maintenance failed:", err);
    return bad("server_error", 500);
  }
}