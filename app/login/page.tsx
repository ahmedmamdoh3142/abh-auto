/**
 * /login — Member portal for ABH Auto.
 *
 * Renders the two-act LoginFlow inside the global chrome (Navbar/Footer come
 * from the root layout). Metadata reads the login.meta i18n keys.
 *
 * Path: app/login/page.tsx
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginFlow } from '@/components/sections/login/login-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('login.meta');
  return { title: t('title'), description: t('description') };
}

export default function LoginPage() {
  return <LoginFlow />;
}