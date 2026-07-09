// app/admin/promos/page.tsx — صفحة أكواد الخصم (server).
import { getLocale } from "next-intl/server";
import { requirePermission } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import PromosClient from "./promos-client";

export const dynamic = "force-dynamic";

export default async function PromosPage() {
  await requirePermission("promos");

  const locale = (await getLocale()) as "ar" | "en";

  // قائمة الخدمات لفورم الربط
  const svcRows = await query<any>(
    `SELECT s.id, s.name AS name_raw, c.name AS cat_raw, s.is_on_request
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.surface='catalog' AND s.is_active = true
     ORDER BY c.sort, s.sort`
  );
  const pick = (j: any) => (!j ? "" : typeof j === "string" ? j : (j[locale] ?? j.ar ?? j.en ?? ""));
  const services = svcRows.map((r) => ({
    id: Number(r.id), name: pick(r.name_raw), category: pick(r.cat_raw), onRequest: !!r.is_on_request,
  }));

  return <PromosClient services={services} locale={locale} />;
}