/**
 * /booking — Reserve a session at ABH Auto. (DB-driven services + brands)
 */
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';

import { BookingFlow } from '@/components/sections/booking/booking-flow';
import { getBookingData } from '@/lib/booking-data-db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('booking.meta');
  return { title: t('title'), description: t('description') };
}

export default async function BookingPage() {
  const locale = await getLocale();
  const { categories, services, brands, modelSizes } = await getBookingData(locale as 'en' | 'ar');
  return (
    <BookingFlow
      categories={categories as any}
      services={services as any}
      brands={brands as any}
      modelSizes={modelSizes as any}
    />
  );
}