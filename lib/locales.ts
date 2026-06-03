/**
 * Locale constants — safe to import from both client and server components.
 *
 * Kept in a separate file so client components can import the type-only and
 * value constants without dragging in `next/headers` (which is server-only).
 */
export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];

export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};
