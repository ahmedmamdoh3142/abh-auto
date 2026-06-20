/**
 * Services Page — DB-driven + partner pricing
 *
 * لو المستخدم الحالي شركة: تُعرض كل الخدمات بأسعاره الخاصة، بدون أسعار قديمة/خصومات.
 */
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { ServicesAtelier } from '@/components/sections/services/services-atelier';
import { Navbar } from '@/components/layout/navbar';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';
import { getServicesData } from '@/lib/services-data-db';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Services',
  description: 'ABH Atelier — ceramic, protection, polish and concierge services in detail.',
};

export default async function ServicesPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const { categories, services } = await getServicesData(locale as 'en' | 'ar', user?.id ?? null);

  return (
    <>
      <Navbar />
      <ServicesAtelier categories={categories as any} services={services as any} />
      <WhatsAppFab />
    </>
  );
}
