/**
 * app/api/admin/bookings/[id]/receive/route.ts — إتمام مرحلة الاستلام.
 *
 * POST { supervisorNotes, paymentMethod?, paymentProofUrl?, signatureUrl, signerName?,
 *        photos: [{ url, comment }] }
 *   • يتحقق: ملاحظات المشرف إجبارية + توقيع العميل إجباري.
 *   • يصرف work_order_no من السيكوينس (مرة واحدة لكل حجز).
 *   • يحفظ الصور والتوقيع، ويحدّث بيانات الاستلام + work_stage='received'.
 *   • يسجّل حدثًا في work_order_events.
 * ملاحظة: الصور تُرفع أولًا عبر /api/admin/upload (folder=inspections)،
 *   وهنا نستقبل المسارات الناتجة فقط.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const b = await request.json();
    const supervisorNotes = String(b.supervisorNotes ?? "").trim();
    const signatureUrl = String(b.signatureUrl ?? "").trim();
    const signerName = b.signerName ? String(b.signerName).trim() : null;
    const paymentMethod = b.paymentMethod ? String(b.paymentMethod).trim() : null;
    const paymentProofUrl = b.paymentProofUrl ? String(b.paymentProofUrl).trim() : null;
    const photos: { url: string; comment?: string }[] = Array.isArray(b.photos) ? b.photos : [];

    // بيانات قابلة للتعديل وقت الاستلام (تصحيح أي خطأ) — كلها اختيارية.
    const editCustomerName = b.customerName != null ? String(b.customerName).trim() : null;
    const editCustomerPhone = b.customerPhone != null ? String(b.customerPhone).trim() : null;
    const editVehicleLabel = b.vehicleLabel != null ? String(b.vehicleLabel).trim() : null;
    const editPlate = b.plate != null ? String(b.plate).trim() : null;

    // ── تحقّق: الملاحظات والتوقيع إجباريان ──
    if (!supervisorNotes) return bad("notes_required");
    if (!signatureUrl) return bad("signature_required");

    // نتأكد أن الحجز موجود ولم يُستلَم من قبل (لا نصرف رقم أمر عمل مرتين).
    const cur = await query<any>(
      `SELECT id, work_order_no, work_stage, status FROM bookings WHERE id = $1`,
      [id]
    );
    if (!cur[0]) return bad("not_found", 404);
    if (cur[0].status === "cancelled") return bad("booking_cancelled");

    // ── نصرف رقم أمر العمل مرة واحدة فقط ──
    let workOrderNo = cur[0].work_order_no as number | null;
    if (workOrderNo == null) {
      const seq = await query<{ n: string }>(`SELECT nextval('work_order_no_seq') AS n`);
      workOrderNo = Number(seq[0].n);
    }

    // ── تحديث بيانات الاستلام على الحجز ──
    // نحدّث payment_method فقط لو أُرسل. نبقي payment_status كما هو (يُؤكَّد لاحقًا/منفصلًا).
    await query(
      `UPDATE bookings
          SET work_order_no = $2,
              work_stage = 'received',
              received_at = now(),
              received_by = $3,
              supervisor_notes = $4,
              payment_proof_url = COALESCE($5, payment_proof_url),
              payment_method_code = COALESCE($6, payment_method_code),
              customer_name = COALESCE($7, customer_name),
              customer_phone = COALESCE($8, customer_phone),
              vehicle_label = COALESCE($9, vehicle_label),
              plate = COALESCE($10, plate),
              -- نبقي stage القديم متوافقًا: 0 = تم الاستلام
              stage = GREATEST(stage, 0),
              status = CASE WHEN status = 'upcoming' THEN 'active'::booking_status ELSE status END,
              updated_at = now()
        WHERE id = $1`,
      [id, workOrderNo, admin.id, supervisorNotes, paymentProofUrl, paymentMethod,
       editCustomerName, editCustomerPhone, editVehicleLabel, editPlate]
    );

    // ── حفظ الصور (path فقط) ──
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!p?.url) continue;
      await query(
        `INSERT INTO booking_inspection_photos (booking_id, phase, url, comment, sort, created_by)
         VALUES ($1, 'intake', $2, $3, $4, $5)`,
        [id, String(p.url), p.comment ? String(p.comment).trim() : null, i, admin.id]
      );
    }

    // ── حفظ التوقيع ──
    await query(
      `INSERT INTO booking_signatures (booking_id, phase, image_url, signer_name, stage_snapshot)
       VALUES ($1, 'intake', $2, $3, 'received')`,
      [id, signatureUrl, signerName]
    );

    // ── سجل الحدث + history القديم للتوافق ──
    await query(
      `INSERT INTO work_order_events (booking_id, event, actor_id, meta)
       VALUES ($1, 'received', $2, $3::jsonb)`,
      [id, admin.id, JSON.stringify({ workOrderNo, photos: photos.length })]
    ).catch(() => {});

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1, 'active', 0, $2)`,
      [id, `تم الاستلام بواسطة ${admin.name} — أمر عمل WO-${workOrderNo}`]
    ).catch(() => {});

    return NextResponse.json({
      ok: true,
      booking: { workOrderNo, workStage: "received", stage: 0, status: "active" },
    });
  } catch (err) {
    console.error("POST /api/admin/bookings/[id]/receive failed:", err);
    return bad("server_error", 500);
  }
}