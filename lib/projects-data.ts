import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";

async function block(key: string, locale: Locale) {
  const rows = await query(`SELECT value->$2 AS content FROM content_blocks WHERE key=$1`, [key, locale]);
  return (rows[0]?.content as Record<string, any>) ?? {};
}

// بيانات صفحة /projects: المشاريع + نصوص القسم
export async function getProjectsData(locale: Locale) {
  const [projects, text] = await Promise.all([
    query(
      `SELECT slug, title, category_label->>$1 AS category, craft, year, image_after, image_before
       FROM projects WHERE is_active=true ORDER BY sort`,
      [locale]
    ),
    block("projects", locale),
  ]);

  return { projects, text };
}