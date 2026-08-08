/**
 * app/api/vehicles/warranty/route.ts — تحقّق من ضمانات سارية على لوحة معيّنة
 * لحساب المستخدم الحالي فقط. تُستخدم في خطوة السيارة بصفحة الحجز لعرض بانر
 * «صيانة الضمان» عند اختيار سيارة سبق شراء خدمة بضمان ساري لها.
 *
 * GET /api/vehicles/warranty?plate=1234ابج&locale=ar
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function normalizePlate(p: string): string {
  return (p || "").replace(/[^0-9A-Za-z\u0621-\u064A]/g, "").toLowerCase();
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ ok: true, warranties: [] });

    const { searchParams } = new URL(request.url);
    const plate = searchParams.get("plate") || "";
    const locale = searchParams.get("locale") === "en" ? "en" : "ar";
    const norm = normalizePlate(plate);
    if (!norm) return NextResponse.json({ ok: true, warranties: [] });

    const rows = await query<any>(
      `SELECT bi.id AS booking_item_id, bi.service_id, bi.name_snapshot, bi.warranty_expires_at,
              b.plate
         FROM booking_items bi
         JOIN bookings b ON b.id = bi.booking_id
        WHERE b.user_id = $1
          AND b.payment_status = 'paid'
          AND b.status <> 'cancelled'
          AND bi.warranty_expires_at IS NOT NULL
          AND bi.warranty_expires_at > now()
        ORDER BY bi.warranty_expires_at DESC`,
      [user.id]
    );

    const warranties = rows
      .filter((r) => normalizePlate(r.plate) === norm)
      .map((r) => ({
        bookingItemId: Number(r.booking_item_id),
        serviceId: r.service_id != null ? Number(r.service_id) : null,
        serviceName:
          (locale === "ar"
            ? r.name_snapshot?.ar || r.name_snapshot?.en
            : r.name_snapshot?.en || r.name_snapshot?.ar) || "",
        expiresAt: r.warranty_expires_at,
      }));

    return NextResponse.json({ ok: true, warranties });
  } catch (err) {
    console.error("GET /api/vehicles/warranty failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}