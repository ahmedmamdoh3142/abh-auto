/**
 * next-intl request config — SERVER ONLY.
 *
 * - الأساس: قاعدة البيانات (content_blocks).
 * - أي مفتاح غير موجود في القاعدة يُستكمل من ملفات messages/*.json.
 * - اللغة الافتراضية عربية، نحترم كوكي NEXT_LOCALE فقط.
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from './locales';
import { query } from './db';

export { locales, defaultLocale, localeDirection, localeLabels } from './locales';
export type { Locale } from './locales';

async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  // 1. جهّز base من ملف JSON (كل المفاتيح مضمونة)
  let base: Record<string, any>;
  try {
    base = (await import(`../messages/${locale}.json`)).default;
  } catch {
    base = {};
  }

  // 2. اجلب مفاتيح قاعدة البيانات وغطِّ بها فوق base (DB له الأولوية)
  try {
    const rows = await query<{ key: string; content: any }>(
      `SELECT key, value->$1 AS content FROM content_blocks`,
      [locale]
    );
    for (const row of rows) {
      if (row.content != null) {
        base[row.key] = row.content; // يعدّل أو يضيف
      }
    }
  } catch (err) {
    console.error('DB merge failed, using JSON baseline:', err);
  }

  return base;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  const candidate = (cookieLocale ?? defaultLocale) as string;
  const locale: Locale = (locales as readonly string[]).includes(candidate)
    ? (candidate as Locale)
    : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});