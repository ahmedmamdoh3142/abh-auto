/**
 * app/admin/bookings/[id]/delivery/page.tsx — تسليم السيارة (SERVER).
 */
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import DeliveryClient from "./delivery-client";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bookings");
  const { id } = await params;
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT b.id, b.reference, b.work_order_no, b.work_stage, b.status,
            b.vehicle_label, b.plate, b.brand_id, b.total, b.payment_status,
            COALESCE(b.customer_name, u.name) AS customer_name,
            COALESCE(b.customer_phone, u.phone) AS customer_phone
       FROM bookings b LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1`,
    [id]
  );
  if (!rows[0]) notFound();
  const b = rows[0];

  // لازم تكون جاهزة للتسليم
  if (b.work_stage !== "ready" && b.status !== "completed") {
    redirect(`/admin/bookings/${id}/work-order`);
  }

  return (
    <DeliveryClient
      locale={locale}
      booking={{
        id: b.id,
        reference: b.reference,
        workOrderNo: b.work_order_no ?? null,
        vehicle: b.vehicle_label || "—",
        plate: b.plate || "",
        brandId: b.brand_id || "",
        customer: b.customer_name || "—",
        phone: b.customer_phone || "",
        total: Number(b.total) || 0,
        payment: b.payment_status,
        alreadyDelivered: b.status === "completed",
      }}
    />
  );
}