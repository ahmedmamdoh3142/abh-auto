/**
 * app/admin/content/page.tsx — نصوص الصفحات (content_blocks) ثنائية اللغة (SERVER).
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { toLoc } from "@/lib/admin/i18n-json";
import ContentClient from "./content-client";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  await requireAdmin();
  const rows = await query<any>(`SELECT key, value FROM content_blocks ORDER BY key`);
  return (
    <ContentClient
      initial={rows.map((r) => ({ key: r.key, value: toLoc(r.value) }))}
    />
  );
}
