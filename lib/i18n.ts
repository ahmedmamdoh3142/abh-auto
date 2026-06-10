/**
 * next-intl request config — SERVER ONLY.
 * الرسائل تأتي الآن من قاعدة البيانات (content_blocks) بدل ملفات messages/*.json.
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './locales';
import { query } from './db';

export { locales, defaultLocale, localeDirection, localeLabels } from './locales';
export type { Locale } from './locales';

// يبني كائن الرسائل من جدول content_blocks للّغة المطلوبة
async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  try {
    const rows = await query<{ key: string; content: any }>(
      `SELECT key, value->$1 AS content FROM content_blocks`,
      [locale]
    );
    const messages: Record<string, any> = {};
    for (const row of rows) {
      if (row.content != null) messages[row.key] = row.content;
    }
    // لو القاعدة فاضية لأي سبب، ارجع لملف JSON كاحتياطي
    if (Object.keys(messages).length === 0) {
      return (await import(`../messages/${locale}.json`)).default;
    }
    return messages;
  } catch (err) {
    console.error('loadMessages from DB failed, falling back to JSON:', err);
    return (await import(`../messages/${locale}.json`)).default;
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const headerLocale = headersList.get('accept-language')?.split(',')[0]?.split('-')[0];

  const candidate = (cookieLocale ?? headerLocale ?? defaultLocale) as string;
  const locale: Locale = (locales as readonly string[]).includes(candidate)
    ? (candidate as Locale)
    : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});