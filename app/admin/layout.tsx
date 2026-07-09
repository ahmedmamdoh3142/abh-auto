import { requireAdmin } from "@/lib/admin/guard";
import { getLocale } from "next-intl/server";
import { query } from "@/lib/db";
import { localeDirection, type Locale } from "@/lib/i18n";
import AdminShell from "./admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const locale = (await getLocale()) as Locale;
  const dir = localeDirection[locale] ?? "rtl";

  let pending = 0;
  let unread = 0;
  try {
    const rows = await query<{ pending: string; unread: string }>(
      `SELECT
         (SELECT count(*) FROM bookings WHERE status = 'upcoming') AS pending,
         (SELECT count(*) FROM contact_messages WHERE status = 'new') AS unread`
    );
    pending = Number(rows[0]?.pending) || 0;
    unread = Number(rows[0]?.unread) || 0;
  } catch {
    /* لو الجداول لسه فاضية */
  }

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role, permissions: user.permissions, isSuperAdmin: user.isSuperAdmin }}
      locale={locale} dir={dir} pending={pending} unread={unread}
    >
      {children}
    </AdminShell>
  );
}