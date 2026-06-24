// app/admin/offers/page.tsx — هب العروض والولاء (SERVER guard + بيانات الخدمات للـpickers).
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import OffersHub from "./offers-hub";

export const dynamic = "force-dynamic";

export default async function OffersAdminPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) redirect("/");

  const locale = (await getLocale()) as "ar" | "en";
  const svcRows = await query<any>(
    `SELECT s.id, s.name, s.is_on_request
       FROM services s
      WHERE s.surface = 'catalog' AND s.is_active = true
      ORDER BY s.sort, s.id`
  );
  const services = svcRows.map((s) => ({ id: Number(s.id), name: s.name, onRequest: !!s.is_on_request }));

  return <OffersHub services={services} locale={locale} />;
}