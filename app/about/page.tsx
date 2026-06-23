/**
 * About — a film, not a page.  (perf-optimized)
 *
 * ColdOpen (أعلى الطية / عنصر الـLCP) يُحمَّل eager. باقي الفصول 01–07 تُؤجَّل
 * داخل <AboutChapters/> عبر next/dynamic + IntersectionObserver، فلا تُركَّب إلا
 * عند الاقتراب منها — وهذا أكبر مكسب لـTBT.
 *
 *   00 · Cold Open       — black screen, a single word   (eager)
 *   01 · The Obsession   — sticky manifesto               (deferred)
 *   02 · Close-Up        — horizontal scroll              (deferred)
 *   03 · The Hand        — full-bleed portrait            (deferred)
 *   04 · The Standard    — 3 rules, hard cut              (deferred)
 *   05 · The Room        — parallax atelier               (deferred)
 *   06 · What Remains    — numbers, monumental            (deferred)
 *   07 · Invitation      — quiet close, one CTA           (deferred)
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ColdOpen } from '@/components/sections/about/chapter-00-cold-open';
import { AboutProgress } from '@/components/sections/about/about-progress';
import { AboutChapters } from '@/components/sections/about/about-chapters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about.meta');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AboutPage() {
  return (
    <>
      <AboutProgress />
      <ColdOpen />
      <AboutChapters />
    </>
  );
}