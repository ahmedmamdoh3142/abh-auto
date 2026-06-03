/**
 * About — a film, not a page.
 *
 * Seven chapters, each with its own personality, each cutting hard to
 * the next. Read top-to-bottom like a short film.
 *
 *   00 · Cold Open       — black screen, a single word
 *   01 · The Obsession   — sticky manifesto, line-by-line
 *   02 · Close-Up        — horizontal scroll through 4 details
 *   03 · The Hand        — full-bleed portrait, camera pull-back
 *   04 · The Standard    — 3 rules, hard cut transitions
 *   05 · The Room        — parallax atelier reveal
 *   06 · What Remains    — numbers, one at a time, monumental
 *   07 · Invitation      — quiet close, one CTA
 *
 * The AboutProgress scrubber tracks the active chapter on the right
 * edge of the screen, giving the user a "you are here in the film."
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ColdOpen } from '@/components/sections/about/chapter-00-cold-open';
import { ChapterObsession } from '@/components/sections/about/chapter-01-obsession';
import { ChapterCloseUp } from '@/components/sections/about/chapter-02-closeup';
import { ChapterHand } from '@/components/sections/about/chapter-03-hand';
import { ChapterStandard } from '@/components/sections/about/chapter-04-standard';
import { ChapterRoom } from '@/components/sections/about/chapter-05-room';
import { ChapterRemains } from '@/components/sections/about/chapter-06-remains';
import { ChapterInvitation } from '@/components/sections/about/chapter-07-invitation';
import { AboutProgress } from '@/components/sections/about/about-progress';

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
      <ChapterObsession />
      <ChapterCloseUp />
      <ChapterHand />
      <ChapterStandard />
      <ChapterRoom />
      <ChapterRemains />
      <ChapterInvitation />
    </>
  );
}