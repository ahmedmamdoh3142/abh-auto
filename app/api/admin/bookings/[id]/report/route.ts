/**
 * app/api/admin/bookings/[id]/report/route.ts — بيانات التقرير النهائي الكامل.
 * يجمع: الحجز + الخدمات + المهام (الفنيين، الأوقات الفعلية، الخامات) +
 *        صور الاستلام والتسليم + التوقيعين + الملاحظات + سجل العمليات.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";
import { pick } from "@/lib/admin/i18n-json";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "ar") as "ar" | "en";

    // الحجز
    const bk = await query<any>(
      `SELECT b.*, COALESCE(b.customer_name, u.name) AS cust_name,
              COALESCE(b.customer_phone, u.phone) AS cust_phone,
              rb.name AS received_by_name
         FROM bookings b
         LEFT JOIN users u ON u.id = b.user_id
         LEFT JOIN users rb ON rb.id = b.received_by
        WHERE b.id = $1`,
      [id]
    );
    if (!bk[0]) return bad("not_found", 404);
    const b = bk[0];

    // المهام + الفنيين + الخامات
    const taskRows = await query<any>(
      `SELECT t.id, t.name_snapshot, t.estimated_minutes, t.status, t.qc_status, t.qc_note, t.rework_count,
              t.uses_roll, t.roll_no,
              COALESCE((
                SELECT json_agg(json_build_object('name', u.name, 'startedAt', tt.started_at, 'doneAt', tt.confirmed_done_at) ORDER BY tt.id)
                FROM task_technicians tt JOIN users u ON u.id = tt.technician_id WHERE tt.task_id = t.id
              ), '[]') AS technicians,
              COALESCE((
                SELECT json_agg(json_build_object('name', i.name, 'unit', i.unit, 'quantity', tm.quantity) ORDER BY tm.id)
                FROM task_materials tm JOIN inventory_items i ON i.id = tm.item_id WHERE tm.task_id = t.id
              ), '[]') AS materials
         FROM booking_tasks t WHERE t.booking_id = $1 ORDER BY t.sort, t.id`,
      [id]
    );

    const tasks = taskRows.map((t) => {
      const techs = Array.isArray(t.technicians) ? t.technicians : [];
      const starts = techs.map((x: any) => x.startedAt).filter(Boolean).map((s: string) => new Date(s).getTime());
      const dones = techs.map((x: any) => x.doneAt).filter(Boolean).map((s: string) => new Date(s).getTime());
      const actualMin = starts.length && dones.length ? Math.round((Math.max(...dones) - Math.min(...starts)) / 60000) : null;
      return {
        name: pick(t.name_snapshot, locale) || "—",
        estimatedMinutes: t.estimated_minutes != null ? Number(t.estimated_minutes) : null,
        actualMinutes: actualMin,
        qcStatus: t.qc_status,
        reworkCount: Number(t.rework_count) || 0,
        usesRoll: !!t.uses_roll,
        rollNo: t.roll_no || "",
        technicians: techs.map((x: any) => ({ name: x.name, startedAt: x.startedAt, doneAt: x.doneAt })),
        materials: (Array.isArray(t.materials) ? t.materials : []).map((m: any) => ({
          name: pick(m.name, locale) || "—", unit: m.unit, quantity: Number(m.quantity) || 0,
        })),
      };
    });

    // الخدمات
    const svcRows = await query<any>(
      `SELECT name_snapshot, line_total FROM booking_items WHERE booking_id = $1 ORDER BY id`, [id]
    );
    const services = svcRows.map((s) => ({ name: pick(s.name_snapshot, locale) || "—", price: Number(s.line_total) || 0 }));

    // الصور (قبل / بعد)
    const photoRows = await query<any>(
      `SELECT phase, url, comment FROM booking_inspection_photos WHERE booking_id = $1 ORDER BY phase, sort`, [id]
    );
    const intakePhotos = photoRows.filter((p) => p.phase === "intake").map((p) => ({ url: p.url, comment: p.comment }));
    const deliveryPhotos = photoRows.filter((p) => p.phase === "delivery").map((p) => ({ url: p.url, comment: p.comment }));

    // التوقيعات (نرتّب بالـ id — أأمن من الاعتماد على اسم عمود وقت قد يختلف)
    const sigRows = await query<any>(
      `SELECT id, phase, image_url, signer_name FROM booking_signatures WHERE booking_id = $1 ORDER BY id`, [id]
    );
    const intakeSig = sigRows.find((s) => s.phase === "intake") || null;
    const deliverySig = sigRows.find((s) => s.phase === "delivery") || null;

    // سجل العمليات
    const evRows = await query<any>(
      `SELECT e.event, e.created_at, u.name AS actor FROM work_order_events e
       LEFT JOIN users u ON u.id = e.actor_id WHERE e.booking_id = $1 ORDER BY e.created_at`, [id]
    ).catch(() => []);

    const totalActualMin = tasks.reduce((s, t) => s + (t.actualMinutes || 0), 0);

    return NextResponse.json({
      ok: true,
      report: {
        reference: b.reference,
        workOrderNo: b.work_order_no,
        invoiceNumber: b.invoice_number || null,
        customer: b.cust_name || "—",
        phone: b.cust_phone || "",
        vehicle: b.vehicle_label || "—",
        plate: b.plate || "",
        brandId: b.brand_id || "",
        size: b.size_code || "",
        total: Number(b.total) || 0,
        payment: b.payment_status,
        receivedAt: b.received_at,
        receivedBy: b.received_by_name || "—",
        deliveredAt: b.delivered_at,
        supervisorNotes: b.supervisor_notes || "",
        qcNotes: b.qc_notes || "",
        services, tasks, intakePhotos, deliveryPhotos,
        // وقت التوقيع نستنتجه من الحجز (الاستلام/التسليم) — أدق من عمود قد لا يوجد.
        intakeSignature: intakeSig ? { url: intakeSig.image_url, name: intakeSig.signer_name, at: b.received_at } : null,
        deliverySignature: deliverySig ? { url: deliverySig.image_url, name: deliverySig.signer_name, at: b.delivered_at } : null,
        events: (evRows as any[]).map((e) => ({ event: e.event, at: e.created_at, actor: e.actor || "—" })),
        totalActualMinutes: totalActualMin,
      },
    });
  } catch (err) {
    console.error("GET report failed:", err);
    return bad("server_error", 500);
  }
}