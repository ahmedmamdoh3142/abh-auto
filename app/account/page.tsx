/**
 * /account — Member dashboard for ABH Auto.
 *
 * Overview · Bookings · Garage · Profile. Renders inside the global chrome
 * (Navbar/Footer from the root layout). Guarded client-side: visitors without
 * a session are sent to /login.
 *
 * الألوان تُجلب من جدول colors في القاعدة وتُمرَّر للعرض (بدل ملفات الترجمة).
 *
 * Path: app/account/page.tsx
 */
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';

import { AccountView } from '@/components/sections/account/account-view';
import { getColors } from '@/lib/booking-data-db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.meta');
  return { title: t('title'), description: t('description') };
}

export default async function AccountPage() {
  const locale = await getLocale();
  const colors = await getColors(locale as 'en' | 'ar');
  return <AccountView colors={colors} />;
}