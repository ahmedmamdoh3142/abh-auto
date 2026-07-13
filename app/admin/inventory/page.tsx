/**
 * app/admin/inventory/page.tsx — المخازن (SERVER guard).
 * الصفحة كلها client-driven (تجلب بياناتها من الـAPI)، فنكتفي هنا بالحماية واللغة.
 */
import { requirePermission } from "@/lib/admin/guard";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import InventoryClient from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requirePermission("inventory");
  const locale = (await getLocale()) as Locale;
  return <InventoryClient locale={locale} />;
}