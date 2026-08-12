/**
 * app/admin/bookings/[id]/page.tsx — تفاصيل الحجز / أمر العمل (SERVER).
 * يجلب الحجز كاملًا + العميل + الخدمات + بيانات الاستلام الحالية (لو مُستلَم)،
 * ويمرّرها لـ ReceiveClient الذي يعرض شاشة الاستلام (المرحلة الأولى).
 */
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import ReceiveClient from "./receive-client";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bookings");
  const { id } = await params;
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT b.id, b.reference, b.status, b.stage, b.work_stage, b.work_order_no,
            b.vehicle_label, b.plate, b.brand_id, b.size_code, b.color_code, b.branch_code,
            b.scheduled_date, b.scheduled_time,
            b.subtotal, b.towing_cost, b.total,
            b.payment_method_code, b.payment_status,
            b.supervisor_notes, b.payment_proof_url, b.received_at, b.odometer_km,
            COALESCE(b.customer_name, u.name)      AS customer_name,
            COALESCE(b.customer_phone, u.phone)    AS customer_phone,
            COALESCE(b.customer_email, u.email::text) AS customer_email,
            COALESCE((
              SELECT json_agg(json_build_object('name', bi.name_snapshot, 'slug', bi.service_slug, 'price', bi.line_total) ORDER BY bi.id)
              FROM booking_items bi WHERE bi.booking_id = b.id
            ), '[]') AS items
       FROM bookings b
       LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1`,
    [id]
  );
  if (!rows[0]) notFound();
  const b = rows[0];

  // بيانات الاستلام الموجودة (لو المرحلة اتعملت قبل كده — نعرضها للقراءة)
  const photos = await query<any>(
    `SELECT url, comment FROM booking_inspection_photos
      WHERE booking_id = $1 AND phase = 'intake' ORDER BY sort, id`,
    [id]
  ).catch(() => []);
  const sig = await query<any>(
    `SELECT image_url, signer_name FROM booking_signatures
      WHERE booking_id = $1 AND phase = 'intake' ORDER BY signed_at DESC LIMIT 1`,
    [id]
  ).catch(() => []);

  // طرق الدفع النشطة (للاختيار)
  const payMethods = await query<any>(
    `SELECT code, name FROM payment_methods WHERE is_active = true ORDER BY sort, code`
  ).catch(() => []);

  // كل خدمات الكتالوج (للاختيار عند التعديل) بأسعار حجم هذا الحجز
  const sizeCode = ["small", "medium", "large"].includes(b.size_code) ? b.size_code : "large";
  const catalog = await query<any>(
    `SELECT s.id, s.slug, s.name, s.is_on_request, s.is_active, c.name AS cat_name,
            COALESCE(sp.price, 0) AS price
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       LEFT JOIN service_prices sp ON sp.service_id = s.id AND sp.size_code = $1
      WHERE s.surface = 'catalog'
      ORDER BY c.sort, s.is_active DESC, s.sort`,
    [sizeCode]
  ).catch(() => []);

  const branchName = await query<any>(`SELECT code, name FROM branches WHERE code = $1`, [b.branch_code]).catch(() => []);

  const booking = {
    id: b.id,
    reference: b.reference,
    status: b.status,
    stage: b.stage ?? 0,
    workStage: b.work_stage || null,
    workOrderNo: b.work_order_no ?? null,
    vehicle: b.vehicle_label || "—",
    plate: b.plate || "",
    brandId: b.brand_id || "",
    size: b.size_code || "",
    branch: branchName[0] ? pick(branchName[0].name, locale) : (b.branch_code || "—"),
    customer: b.customer_name || "—",
    phone: b.customer_phone || "",
    email: b.customer_email || "",
    date: b.scheduled_date ? new Date(b.scheduled_date).toISOString().slice(0, 10) : "",
    time: b.scheduled_time || "",
    subtotal: Number(b.subtotal) || 0,
    towing: Number(b.towing_cost) || 0,
    total: Number(b.total) || 0,
    paymentMethod: b.payment_method_code || "",
    payment: b.payment_status,
    supervisorNotes: b.supervisor_notes || "",
    paymentProofUrl: b.payment_proof_url || "",
    receivedAt: b.received_at ? new Date(b.received_at).toISOString() : null,
    odometerKm: b.odometer_km != null ? Number(b.odometer_km) : null,
    services: (Array.isArray(b.items) ? b.items : []).map((it: any) => ({
      name: pick(it.name, locale) || it.slug || "",
      price: Number(it.price) || 0,
      slug: it.slug || "",
    })).filter((s: any) => s.name),
    // slugs الخدمات العادية فقط (للتعديل) — نستبعد custom.
    serviceSlugs: (Array.isArray(b.items) ? b.items : [])
      .filter((it: any) => it.slug && it.slug !== "custom")
      .map((it: any) => it.slug),
    existingPhotos: (photos as any[]).map((p) => ({ url: p.url, comment: p.comment || "" })),
    existingSignature: sig[0]?.image_url || "",
  };

  return (
    <ReceiveClient
      booking={booking}
      locale={locale}
      payMethods={(payMethods as any[]).map((p) => ({ code: p.code, label: pick(p.name, locale) }))}
      catalog={(catalog as any[]).map((s) => ({
        id: Number(s.id), slug: s.slug, name: pick(s.name, locale),
        category: pick(s.cat_name, locale), onRequest: !!s.is_on_request,
        active: !!s.is_active, price: Number(s.price) || 0,
      }))}
    />
  );
}