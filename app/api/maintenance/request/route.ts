/**
 * app/api/maintenance/request/route.ts — يرسل طلب صيانة ضمان (مجاني) من العميل.
 * يتطلّب تسجيل دخول ويتحقّق من صلاحية الضمان في الخادم (لا نثق بأي شيء من الواجهة).
 * الطلب يدخل بحالة pending وينتظر مراجعة الموظف من /admin/maintenance.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function normalizePlate(p: string): string {
  return (p || "").replace(/[^0-9A-Za-z\u0621-\u064A]/g, "").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });

    const body = await request.json();
    const plate = String(body.plate || "").trim();
    const problemDescription = String(body.problemDescription || "").trim();
    const bookingItemId = body.bookingItemId != null ? Number(body.bookingItemId) : null;

    if (!plate || problemDescription.length < 8) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    // ── تحقّق من الخادم: البند ده فعلًا للعميل ده، وضمانه لسه ساري ──
    let warrantyServiceId: number | null = null;
    let warrantyServiceName: any = null;
    let warrantyExpiresAt: string | null = null;
    let sourceBookingId: string | null = null;

    if (bookingItemId) {
      const rows = await query<any>(
        `SELECT bi.id, bi.service_id, bi.name_snapshot, bi.warranty_expires_at,
                b.id AS booking_id, b.plate, b.user_id
           FROM booking_items bi
           JOIN bookings b ON b.id = bi.booking_id
          WHERE bi.id = $1
          LIMIT 1`,
        [bookingItemId]
      );
      const r = rows[0];
      const valid =
        r &&
        r.user_id === user.id &&
        normalizePlate(r.plate) === normalizePlate(plate) &&
        r.warranty_expires_at &&
        new Date(r.warranty_expires_at).getTime() > Date.now();
      if (!valid) return NextResponse.json({ ok: false, error: "warranty_not_valid" }, { status: 400 });
      warrantyServiceId = r.service_id;
      warrantyServiceName = r.name_snapshot;
      warrantyExpiresAt = r.warranty_expires_at;
      sourceBookingId = r.booking_id;
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO maintenance_requests
         (user_id, source_booking_id, source_booking_item_id, vehicle_label, plate, brand_id, model, size_code, color_code,
          warranty_service_id, warranty_service_name, warranty_expires_at,
          problem_description, branch_code, preferred_date, preferred_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending')
       RETURNING id`,
      [
        user.id,
        sourceBookingId,
        bookingItemId,
        body.vehicleLabel || null,
        plate,
        body.brandId || null,
        body.model || null,
        body.size || null,
        body.colorKey || null,
        warrantyServiceId,
        warrantyServiceName ? JSON.stringify(warrantyServiceName) : null,
        warrantyExpiresAt,
        problemDescription,
        body.branch || null,
        body.date || null,
        body.time || null,
      ]
    );

    return NextResponse.json({
      ok: true,
      requestId: rows[0].id,
      reference: `MR-${rows[0].id.slice(0, 6).toUpperCase()}`,
    });
  } catch (err) {
    console.error("POST /api/maintenance/request failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}