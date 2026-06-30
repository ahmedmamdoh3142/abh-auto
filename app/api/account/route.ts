import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// تحويل أكواد الأحجام: القاعدة → الواجهة
const SIZE_DB_TO_UI: Record<string, string> = { small: "s", medium: "m", large: "l" };

function mapPayment(methodCode: string | null, status: string): "paid" | "branch" {
  if (status === "paid") return "paid";
  return "branch";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: true, vehicles: [], bookings: [] });

    // العربيات
    const vRows = await query<any>(
      `SELECT id, brand_id, model, color_code, plate, year
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
    const vehicles = vRows.map((v) => ({
      id: v.id,
      brandId: v.brand_id ?? "",
      model: v.model ?? "",
      colorKey: v.color_code ?? "",
      plate: v.plate ?? "",
      year: v.year ?? "",
    }));

    // الحجوزات مع أسماء الخدمات من booking_items.name_snapshot
    const bRows = await query<any>(
      `SELECT b.id, b.reference, b.status, b.vehicle_label, b.plate, b.brand_id,
              b.size_code, b.branch_code, b.scheduled_date, b.scheduled_time,
              b.total, b.payment_method_code, b.payment_status, b.stage, b.created_at,
              COALESCE(
                (SELECT json_agg(json_build_object('slug', bi.service_slug, 'name', bi.name_snapshot) ORDER BY bi.id)
                 FROM booking_items bi WHERE bi.booking_id = b.id),
                '[]'
              ) AS services_with_names
       FROM bookings b
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [user.id]
    );

    const bookings = bRows.map((b) => {
      const servicesWithNames = b.services_with_names || [];
      const serviceSlugs = servicesWithNames.map((s: any) => s.slug);
      const serviceSnapshots = servicesWithNames.map((s: any) => s.name || { ar: s.slug, en: s.slug });
      return {
        id: b.reference,            // الواجهة تستخدم reference كمعرّف ظاهر
        dbId: b.id,                 // UUID للعمليات
        status: b.status,
        vehicleLabel: b.vehicle_label ?? "",
        plate: b.plate ?? "",
        brandId: b.brand_id ?? "",
        serviceSlugs,
        serviceSnapshots,
        branchKey: b.branch_code ?? "",
        date: b.scheduled_date ? new Date(b.scheduled_date).toISOString().slice(0, 10) : "",
        time: b.scheduled_time ?? "",
        total: Number(b.total) || 0,
        payment: mapPayment(b.payment_method_code, b.payment_status),
        size: SIZE_DB_TO_UI[b.size_code] ?? b.size_code ?? "large",
        stage: b.stage ?? 0,
        createdAt: b.created_at,
      };
    });

    return NextResponse.json({ ok: true, vehicles, bookings });
  } catch (err) {
    console.error("GET /api/account failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}