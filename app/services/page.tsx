/**
 * Services Page — Stunning redesigned services showcase
 */
import type { Metadata } from 'next';

import { ServicesAtelier } from '@/components/sections/services/services-atelier';
import { Navbar } from '@/components/layout/navbar';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';

export const metadata: Metadata = {
  title: 'Services',
  description: 'ABH Atelier — ceramic, protection, polish and concierge services in detail.',
};

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <ServicesAtelier />
      <WhatsAppFab />
    </>
  );
}