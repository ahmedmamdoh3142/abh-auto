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

/**
 * دمج عميق (recursive): بيحافظ على أي مفتاح موجود في base وناقص في override،
 * وبيدّي الأولوية لقيم override لما نفس المفتاح موجود في الاتنين.
 * الـ arrays بتتستبدل كاملة (مش بتتدمج عنصر بعنصر) عشان ده السلوك المتوقع لمصفوفات زي items/detail/all.
 */
function deepMerge<T extends Record<string, any>>(base: T, override: Record<string, any>): T {
  const result: Record<string, any> = { ...base };

  for (const key of Object.keys(override)) {
    const baseVal = base?.[key];
    const overrideVal = override[key];

    const isPlainObject = (v: unknown) =>
      typeof v === 'object' && v !== null && !Array.isArray(v);

    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else {
      result[key] = overrideVal;
    }
  }

  return result as T;
}

async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  // نجيب الـ JSON والداتابيز في نفس الوقت بدل واحد ورا التاني
  const [base, rows] = await Promise.all([
    import(`../messages/${locale}.json`)
      .then((m) => m.default as Record<string, any>)
      .catch((err) => {
        console.error(`Failed to load messages/${locale}.json:`, err);
        return {} as Record<string, any>;
      }),
    query<{ key: string; content: any }>(
      `SELECT key, value->$1 AS content FROM content_blocks`,
      [locale]
    ).catch((err) => {
      console.error(`content_blocks query failed (locale=${locale}):`, err);
      return [] as { key: string; content: any }[];
    }),
  ]);

  // نجمّع كل صفوف الداتابيز في object واحد، وبعدين دمج عميق مرة واحدة فوق base
  const dbOverrides: Record<string, any> = {};
  for (const row of rows) {
    if (row.content != null) dbOverrides[row.key] = row.content;
  }

  return deepMerge(base, dbOverrides);
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