/**
 * app/admin/accounts/page.tsx — إدارة الحسابات (SERVER)
 * يجلب كل المستخدمين مع أدوارهم وأسماء شركاتهم، ويمررها للـ client.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import AccountsClient from "./accounts-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT u.id, u.name, u.email, u.phone, u.city_code, u.role, u.member_since,
            p.id AS partner_id, p.company_name, p.is_active AS partner_active
       FROM users u
       LEFT JOIN partners p ON p.user_id = u.id
      ORDER BY u.created_at DESC`
  );

  // قائمة المدن للاختيار (اختياري عند الإنشاء)
  const cities = await query<any>(`SELECT code, name FROM cities WHERE is_active = true ORDER BY sort, code`).catch(() => []);

  return (
    <AccountsClient
      locale={locale}
      cities={(cities as any[]).map((c) => ({ code: c.code, label: locale === "ar" ? (c.name?.ar ?? c.code) : (c.name?.en ?? c.code) }))}
      accounts={rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        city: u.city_code ?? "",
        role: u.role,
        since: u.member_since ? new Date(u.member_since).toISOString() : null,
        partnerId: u.partner_id ?? null,
        companyName: u.company_name ?? "",
        partnerActive: u.partner_active,
      }))}
    />
  );
}
