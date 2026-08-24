/**
 * app/admin/inquiries/page.tsx — استفسارات الموقع (SERVER)
 */
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import { requirePermission } from "@/lib/admin/guard";
import InquiriesClient from "./inquiries-client";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  await requirePermission("inquiries");
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT cm.id, cm.name, cm.intent, cm.vehicle, cm.email, cm.phone, cm.message,
            cm.consent, cm.locale, cm.status, cm.created_at,
            cm.handled_by, cm.handled_at, u.name AS handled_by_name,
            COALESCE((SELECT count(*) FROM contact_message_notes n WHERE n.message_id = cm.id), 0)::int AS notes_count
       FROM contact_messages cm
       LEFT JOIN users u ON u.id = cm.handled_by
      ORDER BY cm.created_at DESC`
  );

  return (
    <InquiriesClient
      locale={locale}
      initial={rows.map((r) => ({
        id: r.id,
        name: r.name,
        intent: r.intent || "",
        vehicle: r.vehicle || "",
        email: r.email || "",
        phone: r.phone || "",
        message: r.message || "",
        consent: r.consent,
        msgLocale: r.locale || "ar",
        status: r.status,
        createdAt: r.created_at,
        handledBy: r.handled_by,
        handledByName: r.handled_by_name || "",
        handledAt: r.handled_at,
        notesCount: Number(r.notes_count) || 0,
      }))}
    />
  );
}