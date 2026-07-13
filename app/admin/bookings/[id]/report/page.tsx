import { requirePermission } from "@/lib/admin/guard";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import ReportClient from "./report-client";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bookings");
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  return <ReportClient bookingId={id} locale={locale} />;
}