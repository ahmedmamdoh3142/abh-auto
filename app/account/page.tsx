/**
 * /account — Member dashboard for ABH Auto.
 *
 * Overview · Bookings · Garage · Profile. Renders inside the global chrome
 * (Navbar/Footer from the root layout). Guarded client-side: visitors without
 * a session are sent to /login.
 *
 * Path: app/account/page.tsx
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountView } from '@/components/sections/account/account-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.meta');
  return { title: t('title'), description: t('description') };
}

export default function AccountPage() {
  return <AccountView />;
}