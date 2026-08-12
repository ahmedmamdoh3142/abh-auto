/**
 * app/admin/maintenance/page.tsx — طلبات صيانة الضمان (SERVER).
 * نفس نمط app/admin/bookings/page.tsx عندك: يجلب البيانات من القاعدة مباشرة
 * ويمرّرها لصفحة الكلاينت. التعديلات (قبول/رفض) بتروح على
 * app/api/admin/maintenance/route.ts.
 */
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import MaintenanceClient from "./maintenance-client";
import { requirePermission } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requirePermission("maintenance");
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT mr.id, mr.vehicle_label, mr.plate, mr.brand_id, mr.model, mr.size_code,
            mr.warranty_service_name, mr.warranty_expires_at, mr.problem_description,
            mr.branch_code, mr.preferred_date, mr.preferred_time, mr.odometer_km,
            mr.status, mr.rejection_reason, mr.reviewed_at, mr.resulting_booking_id, mr.created_at,
            u.name AS customer_name, u.phone AS customer_phone, u.email::text AS customer_email,
            rv.name AS reviewed_by_name, b.reference AS resulting_reference,
            -- (جديد) عداد الحجز الأصلي وقت استلامه + سقف الكيلومترات الخاص بالخدمة —
            -- عشان نحسب المسافة المقطوعة منذ الخدمة ونقارنها بسقف الضمان.
            sb.odometer_km AS service_odometer_km,
            sbi.warranty_km_limit AS warranty_km_limit
       FROM maintenance_requests mr
       LEFT JOIN users u ON u.id = mr.user_id
       LEFT JOIN users rv ON rv.id = mr.reviewed_by
       LEFT JOIN bookings b ON b.id = mr.resulting_booking_id
       LEFT JOIN bookings sb ON sb.id = mr.source_booking_id
       LEFT JOIN booking_items sbi ON sbi.id = mr.source_booking_item_id
      ORDER BY mr.created_at DESC
      LIMIT 300`
  );

  const requests = rows.map((r) => {
    const odometerKm = r.odometer_km != null ? Number(r.odometer_km) : null;
    const serviceOdometerKm = r.service_odometer_km != null ? Number(r.service_odometer_km) : null;
    const warrantyKmLimit = r.warranty_km_limit != null ? Number(r.warranty_km_limit) : null;
    // المسافة المقطوعة منذ الخدمة الأصلية — تُحسب فقط لو معانا القراءتين.
    const kmDriven = odometerKm != null && serviceOdometerKm != null ? Math.max(0, odometerKm - serviceOdometerKm) : null;
    // ضمن سقف الكيلومترات؟ لو مفيش سقف أصلًا، يبقى غير محدود بالكيلومترات (بيعتمد بس على التاريخ).
    const withinKmLimit = warrantyKmLimit == null || kmDriven == null ? null : kmDriven <= warrantyKmLimit;

    return {
      id: r.id,
      customerName: r.customer_name || "—",
      customerPhone: r.customer_phone || "",
      customerEmail: r.customer_email || "",
      vehicleLabel: r.vehicle_label || `${r.brand_id ?? ""} ${r.model ?? ""}`.trim(),
      plate: r.plate || "",
      warrantyServiceName: r.warranty_service_name
        ? locale === "ar"
          ? r.warranty_service_name.ar || r.warranty_service_name.en
          : r.warranty_service_name.en || r.warranty_service_name.ar
        : "",
      warrantyExpiresAt: r.warranty_expires_at ? new Date(r.warranty_expires_at).toISOString() : null,
      odometerKm, serviceOdometerKm, warrantyKmLimit, kmDriven, withinKmLimit,
      problemDescription: r.problem_description,
      branchCode: r.branch_code || "",
      preferredDate: r.preferred_date ? new Date(r.preferred_date).toISOString().slice(0, 10) : "",
      preferredTime: r.preferred_time || "",
      status: r.status as "pending" | "approved" | "rejected",
      rejectionReason: r.rejection_reason || "",
      reviewedByName: r.reviewed_by_name || "",
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      resultingReference: r.resulting_reference || "",
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    };
  });

  return <MaintenanceClient initial={requests} locale={locale} />;
}