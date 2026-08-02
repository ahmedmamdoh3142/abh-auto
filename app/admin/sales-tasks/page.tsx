import { requirePermission } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import SalesTasksClient from "./sales-tasks-client";

export const dynamic = "force-dynamic";

export default async function AdminSalesTasksPage() {
  const admin = await requirePermission("sales_tasks");
  const locale = (await getLocale()) as Locale;

  const svcRows = await query<any>(
    `SELECT s.id, s.slug, s.name FROM services s WHERE s.surface = 'catalog' AND s.is_active = true ORDER BY s.sort`
  );
  const services = svcRows.map((s) => ({ id: Number(s.id), slug: s.slug, name: pick(s.name, locale) }));

  const brandRows = await query<any>(
    `SELECT b.id, b.name,
            COALESCE(
              json_agg(json_build_object('name', m.name, 'size', m.size_code) ORDER BY m.sort)
              FILTER (WHERE m.id IS NOT NULL), '[]'
            ) AS models
     FROM brands b
     LEFT JOIN brand_models m ON m.brand_id = b.id AND m.is_active = true
     WHERE b.is_active = true
     GROUP BY b.id, b.name, b.sort
     ORDER BY b.sort, b.name`
  );
  const brands = brandRows.map((r) => ({
    id: r.id,
    name: r.name,
    models: (r.models ?? []).map((m: any) => ({
      name: m.name,
      size: (["small", "medium", "large"].includes(m.size) ? m.size : "large") as "small" | "medium" | "large",
    })),
  }));

  // موظفين المبيعات بس (مش فنيين، مش شركاء، مش أدمن) — دول اللي ينفع نوجّهلهم تاسك
  const staffRows = await query<any>(`SELECT id, name FROM users WHERE role = 'staff' ORDER BY name`);
  const staff = staffRows.map((u) => ({ id: u.id as string, name: u.name as string }));

  return (
    <SalesTasksClient
      locale={locale}
      services={services}
      brands={brands}
      staff={staff}
      currentUserId={admin.id}
      currentUserName={admin.name}
      currentUserRole={(admin as any).role ?? "staff"}
    />
  );
}