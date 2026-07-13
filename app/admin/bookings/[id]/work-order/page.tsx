/**
 * app/admin/bookings/[id]/work-order/page.tsx — أمر العمل / التخصيص (SERVER).
 * يجلب بيانات الحجز الأساسية ويمرّرها للكلاينت الذي يدير المهام والتخصيص.
 */
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import WorkOrderClient from "./work-order-client";

export const dynamic = "force-dynamic";

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bookings");
  const { id } = await params;
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT b.id, b.reference, b.work_order_no, b.work_stage, b.status,
            b.vehicle_label, b.plate, b.brand_id, b.size_code,
            COALESCE(b.customer_name, u.name) AS customer_name
       FROM bookings b LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1`,
    [id]
  );
  if (!rows[0]) notFound();
  const b = rows[0];

  const booking = {
    id: b.id,
    reference: b.reference,
    workOrderNo: b.work_order_no ?? null,
    workStage: b.work_stage || null,
    status: b.status,
    vehicle: b.vehicle_label || "—",
    plate: b.plate || "",
    brandId: b.brand_id || "",
    size: b.size_code || "",
    customer: b.customer_name || "—",
  };

  return <WorkOrderClient booking={booking} locale={locale} />;
}