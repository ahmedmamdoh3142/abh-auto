/**
 * /booking — Reserve a session at ABH Auto.
 *
 * Renders the four-act BookingFlow inside the global chrome (Navbar/Footer
 * come from the root layout). Metadata reads the booking.meta i18n keys.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BookingFlow } from '@/components/sections/booking/booking-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('booking.meta');
  return { title: t('title'), description: t('description') };
}

export default function BookingPage() {
  return <BookingFlow />;
}