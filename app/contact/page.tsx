/**
 * Contact — A letter to the atelier.
 *
 * Five cinematic sections, each with its own personality:
 *
 *   01 · Overture     — grand opening title, no form yet
 *   02 · Compose      — Mad Libs letter form (signature creative)
 *   03 · Channels     — three image "doors" (Visit / Call / Message)
 *   04 · Location     — typography + real Google Maps embed
 *   05 · Closing      — full-bleed atelier + hours overlay
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Overture } from '@/components/sections/contact/section-01-overture';
import { Compose } from '@/components/sections/contact/section-02-compose';
import { Channels } from '@/components/sections/contact/section-03-channels';
import { Location } from '@/components/sections/contact/section-04-location';
import { ClosingScene } from '@/components/sections/contact/section-05-closing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact.meta');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ContactPage() {
  return (
    <>
      <Overture />
      <Compose />
      <div className="bg-zone-cool">
        <Channels />
      </div>
      <Location />
      <ClosingScene />
    </>
  );
}