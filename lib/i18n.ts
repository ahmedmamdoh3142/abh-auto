/**
 * next-intl request config — SERVER ONLY.
 *
 * This file uses `next/headers` and must never be imported from a client
 * component. Client code should import locale constants from `./locales`.
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './locales';

export { locales, defaultLocale, localeDirection, localeLabels } from './locales';
export type { Locale } from './locales';

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
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
