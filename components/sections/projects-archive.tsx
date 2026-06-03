'use client';

/**
 * ProjectsArchive — dedicated /projects (أعمالنا) experience.
 * Path: components/sections/projects-archive.tsx
 *
 * Structure:
 *   1. SUBPAGE HERO — an inner-page header band (NOT a full-screen landing
 *      hero): breadcrumb, large editorial title, lead line, a 3-up meta row
 *      (cars / established / projects) and a drawn baseline. Short, static,
 *      refined — the way studio sites treat secondary-page headers.
 *   2. GALLERY      — centered header; tall monochrome cards (Offers/Services
 *      DNA + useSpotlight). Clicking a card opens the dossier modal.
 *   3. CTA          — image-backed cinematic close, centered.
 *
 * PROJECT DOSSIER MODAL:
 *   - a STICKY top bar (project no. + name + close ✕) that stays pinned while
 *     the body scrolls — the close is always reachable.
 *   - SEPARATE before / after image figures (side by side, no slider), each
 *     labelled and captioned.
 *   - specification grid + numbered "what happened in the atelier" list.
 *   - chrome CTA. Closes via ✕ / scrim / ESC.
 *
 * Strict palette (obsidian/ivory/platinum/steel). next/image, framer-motion,
 * deterministic particles, full RTL.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, X } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { useSpotlight } from '@/hooks/use-mouse';

const CTA_IMAGE = '/images/cta-bg.png'; // any cinematic shot; lib/site-config is read-only
const BOOKING_IMAGE = '/images/hero-bg.png';

/* ── Data ───────────────────────────────────────────────────────────── */
type Craft = 'ceramic' | 'ppf' | 'armor' | 'tracking' | 'detailing';

interface Project {
  id: number;
  model: string;
  craft: Craft;
  year: number;
  image: string;   // after
  before: string;  // before
  cat: { en: string; ar: string };
  specs?: { en: [string, string][]; ar: [string, string][] };
}

const PROJECTS: Project[] = [
  { id: 1, model: 'Pagani Huayra',        craft: 'detailing', year: 2024, image: '/images/project-1.png', before: '/images/project-1-before.png', cat: { en: 'Carbon Restoration',  ar: 'ترميم كربون' } },
  { id: 2, model: 'Rolls-Royce Spectre',  craft: 'ceramic',   year: 2024, image: '/images/project-2.png', before: '/images/project-2-before.png', cat: { en: 'Diamond Suite',       ar: 'باقة الألماس' } },
  { id: 3, model: 'Ferrari SF90',         craft: 'ppf',       year: 2023, image: '/images/project-3.png', before: '/images/project-3-before.png', cat: { en: 'Track Specification', ar: 'مواصفات الحلبة' } },
  { id: 4, model: 'Bentley Bacalar',      craft: 'detailing', year: 2024, image: '/images/project-4.png', before: '/images/project-4-before.png', cat: { en: 'Concours Prep',       ar: 'تحضير كونكور' } },
  { id: 5, model: 'Aston Martin DBX',     craft: 'armor',     year: 2023, image: '/images/project-5.png', before: '/images/project-5-before.png', cat: { en: 'Armored B6',          ar: 'تدريع B6' } },
  { id: 6, model: 'Porsche 911 GT3',      craft: 'ppf',       year: 2024, image: '/images/project-6.png', before: '/images/project-6-before.png', cat: { en: 'PPF Application',     ar: 'تطبيق أفلام الحماية' } },
  { id: 7, model: 'Mercedes-AMG G63',     craft: 'tracking',  year: 2023, image: '/images/project-7.png', before: '/images/project-7-before.png', cat: { en: 'Stealth Tracking',    ar: 'تتبّع خفي' } },
  { id: 8, model: 'Lamborghini Revuelto', craft: 'ceramic',   year: 2024, image: '/images/project-8.png', before: '/images/project-8-before.png', cat: { en: 'Ceramic · 12yr',      ar: 'سيراميك · ١٢ سنة' } },
];

const FILTERS: ('all' | Craft)[] = ['all', 'ceramic', 'ppf', 'armor', 'tracking', 'detailing'];
const FILTER_LABELS: Record<string, { en: string; ar: string }> = {
  all:       { en: 'All',        ar: 'الكل' },
  ceramic:   { en: 'Ceramic',    ar: 'سيراميك' },
  ppf:       { en: 'Paint film', ar: 'حماية الطلاء' },
  armor:     { en: 'Armor',      ar: 'تدريع' },
  tracking:  { en: 'Tracking',   ar: 'تتبّع' },
  detailing: { en: 'Detailing',  ar: 'تلميع' },
};

const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.9 };
const pad2 = (n: number) => String(n).padStart(2, '0');

/* ════════════════════════════════════════════════════════════════════ */
export function ProjectsArchive() {
  const t = useTranslations('projects');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [active, setActive] = useState<'all' | Craft>('all');
  const [openId, setOpenId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: PROJECTS.length };
    for (const p of PROJECTS) c[p.craft] = (c[p.craft] ?? 0) + 1;
    return c;
  }, []);
  const visible = useMemo(
    () => (active === 'all' ? PROJECTS : PROJECTS.filter((p) => p.craft === active)),
    [active],
  );
  const openProject = openId != null ? PROJECTS.find((p) => p.id === openId) ?? null : null;

  return (
    <>
      {/* ── INNER-PAGE HERO ───────────────────────────────────────── */}
      <SubpageHero isAr={isAr} t={t} />

      {/* ── GALLERY ───────────────────────────────────────────────── */}
      <section className="section pt-8 md:pt-12" id="archive">
        <div className="container">
          <SectionHeader
            eyebrow={t('archiveEyebrow')}
            title={t('archiveTitle')}
            subtitle={t('archiveSub')}
            align="center"
            className="mx-auto max-w-3xl"
          />

          <div className="mb-12 mt-16 flex flex-wrap items-center justify-center gap-2.5">
            {FILTERS.map((f) => {
              const on = active === f;
              return (
                <button
                  key={f}
                  data-cursor="hover"
                  onClick={() => setActive(f)}
                  className={[
                    'relative rounded-full border px-4 py-2.5 text-[0.64rem] uppercase tracking-[0.2em] transition-all duration-300',
                    on
                      ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian shadow-[0_10px_34px_-10px_rgba(203,205,205,0.5)]'
                      : 'border-white/10 text-steel hover:border-white/25 hover:text-ivory',
                  ].join(' ')}
                >
                  {FILTER_LABELS[f][isAr ? 'ar' : 'en']}
                  <span className="ms-2 tabular-nums opacity-55">{pad2(counts[f] ?? 0)}</span>
                </button>
              );
            })}
          </div>

          <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <AnimatePresence mode="popLayout">
              {visible.map((p, i) => (
                <GalleryCard
                  key={p.id}
                  project={p}
                  index={i}
                  isAr={isAr}
                  openLabel={t('open')}
                  onOpen={() => setOpenId(p.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <PlatinumDivider />

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <ArchiveCta t={t} />

      {/* ── DOSSIER MODAL ─────────────────────────────────────────── */}
      <ProjectModal project={openProject} isAr={isAr} t={t} onClose={() => setOpenId(null)} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Inner-page hero band (BookingHero style)                            */
/* ════════════════════════════════════════════════════════════════════ */
function SubpageHero({ isAr, t }: { isAr: boolean; t: ReturnType<typeof useTranslations> }) {
  const meta = [
    { v: '400+', k: t('metaCars') },
    { v: '2022', k: t('metaEst') },
    { v: '12',   k: t('metaProjects') },
  ];

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
  }));

  return (
    <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44">
      {/* faint cinematic plate behind the band */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={BOOKING_IMAGE}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.18]"
          style={{ filter: 'grayscale(0.5) brightness(0.5) contrast(1.1)' }}
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.8, 0], y: [10, -50, -100] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="container">
        {/* breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.28em] text-steel"
        >
          <Link href="/" data-cursor="hover" className="transition-colors hover:text-platinum">
            {t('navHome')}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-platinum">{t('navWorks')}</span>
        </motion.nav>

        {/* eyebrow — BookingHero style */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('eyebrow')}
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        {/* title — line reveal */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: EASE }}
              className="inline-block"
            >
              {t('title')}
            </motion.span>
          </span>
        </h1>

        {/* lead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg"
        >
          {t('subtitle')}
        </motion.p>

        {/* meta row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
          className="mt-10 flex items-center justify-center gap-6 md:gap-14"
        >
          {meta.map((m, i) => (
            <div key={m.k} className="flex items-center gap-6 md:gap-14">
              {i > 0 && (
                <span
                  aria-hidden
                  className="h-9 w-px bg-gradient-to-b from-transparent via-platinum/30 to-transparent"
                />
              )}
              <div className="text-center">
                <div
                  dir="ltr"
                  className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-light leading-none text-ivory tabular-nums"
                >
                  {m.v}
                </div>
                <div className="mt-2 text-[0.55rem] uppercase tracking-[0.26em] text-steel">
                  {m.k}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* drawn baseline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.7, ease: EASE }}
          className="mx-auto mt-10 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent"
        />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Gallery card                                                          */
/* ════════════════════════════════════════════════════════════════════ */
function GalleryCard({
  project,
  index,
  isAr,
  openLabel,
  onOpen,
}: {
  project: Project;
  index: number;
  isAr: boolean;
  openLabel: string;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useSpotlight(ref);

  return (
    <motion.button
      ref={ref}
      layout
      onClick={onOpen}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...SPRING, delay: (index % 3) * 0.08 }}
      data-cursor="hover"
      className="spotlight group relative h-[460px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-obsidian text-start md:h-[560px]"
    >
      <Image
        src={project.image}
        alt={`${project.model} — ${isAr ? project.cat.ar : project.cat.en}`}
        fill
        loading="lazy"
        sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw"
        className="scale-[1.08] object-cover brightness-[0.8] grayscale transition-[transform,filter] duration-[1600ms] ease-out group-hover:scale-[1.16] group-hover:brightness-90 group-hover:grayscale-[0.1]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/70" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.10), transparent 60%)',
        }}
      />

      <div
        aria-hidden
        className="absolute top-5 end-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] font-display text-lg text-ivory ring-1 ring-white/15 backdrop-blur-md transition-all duration-500 group-hover:bg-ivory group-hover:text-obsidian group-hover:ring-white/40"
      >
        {pad2(project.id)}
      </div>
      <span className="absolute top-6 start-6 z-10 text-[0.58rem] tracking-[0.22em] text-platinum/70 tabular-nums">
        {project.year}
      </span>

      <div className="absolute inset-x-0 bottom-0 z-10 p-7 md:p-8">
        <span className="mb-2.5 inline-flex items-center gap-2 text-[0.56rem] uppercase tracking-[0.26em] text-platinum">
          <span className="h-1.5 w-1.5 rounded-full bg-platinum" />
          {isAr ? project.cat.ar : project.cat.en}
        </span>
        <h3 className="font-display text-2xl font-light uppercase leading-[1.05] tracking-tight text-ivory md:text-3xl">
          {project.model}
        </h3>
        <div className="mt-4 flex items-center gap-3">
          <span className="block h-px w-8 bg-platinum/60 transition-all duration-700 group-hover:w-16 group-hover:bg-ivory" />
          <span className="inline-flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.26em] text-ivory">
            {openLabel}
            <ArrowUpRight
              className="reversible-icon h-3 w-3 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2}
            />
          </span>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          boxShadow:
            'inset 0 0 90px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.10)',
        }}
      />
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Project dossier modal                                                 */
/* ════════════════════════════════════════════════════════════════════ */
function ProjectModal({
  project,
  isAr,
  t,
  onClose,
}: {
  project: Project | null;
  isAr: boolean;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (project) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [project, onClose]);

  const specs: [string, string][] =
    project?.specs?.[isAr ? 'ar' : 'en'] ?? (t.raw('mSpecs') as [string, string][]);
  const steps = t.raw('mSteps') as [string, string][];

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-obsidian/80 backdrop-blur-xl"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-10 flex max-h-[92svh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[26px] border border-white/10 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)]"
            style={{ background: 'linear-gradient(180deg,#0c0d0e,#060607)' }}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            {/* STICKY top bar — close always visible */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-gradient-to-b from-[rgba(10,11,12,0.95)] via-[rgba(10,11,12,0.7)] to-transparent px-5 py-4 backdrop-blur-md md:px-10">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="font-display text-base text-platinum tabular-nums">
                  {pad2(project.id)}
                </span>
                <span className="h-px w-8 bg-platinum/40" />
                <span className="truncate font-display text-base uppercase tracking-wide text-ivory">
                  {project.model}
                </span>
              </div>
              <button
                onClick={onClose}
                data-cursor="hover"
                aria-label={t('mClose')}
                className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.05] text-ivory transition-all duration-300 hover:rotate-90 hover:bg-ivory hover:text-obsidian"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            {/* scrollable body */}
            <div className="overflow-y-auto">
              {/* head */}
              <div className="px-6 pt-8 text-center md:px-10 md:pt-12">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <span className="font-display text-lg text-platinum tabular-nums">
                    {pad2(project.id)}
                  </span>
                  <span className="h-px w-12 bg-platinum/50" />
                  <span className="text-[0.56rem] uppercase tracking-[0.3em] text-steel">
                    {t('mChapter')} · {project.year}
                  </span>
                </div>
                <h2 className="font-display text-3xl font-light uppercase leading-none tracking-tight md:text-5xl">
                  {project.model}
                </h2>
                <span className="tag mt-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-platinum" />
                  {isAr ? project.cat.ar : project.cat.en}
                </span>
              </div>

              {/* SEPARATE before / after */}
              <div className="mx-6 mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mx-10 md:gap-4">
                <BAFigure
                  src={project.before}
                  variant="before"
                  label={t('mBefore')}
                  caption={t('mBeforeCap')}
                />
                <BAFigure
                  src={project.image}
                  variant="after"
                  label={t('mAfter')}
                  caption={t('mAfterCap')}
                />
              </div>

              {/* body */}
              <div className="px-6 pb-12 pt-8 md:px-10">
                <p className="mx-auto max-w-[64ch] text-center text-base leading-[1.9] text-platinum/84 md:text-lg">
                  {t('mLead')}
                </p>

                <ModalSectionHeading>{t('mSpecsH')}</ModalSectionHeading>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {specs.map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <small className="mb-2 block text-[0.54rem] uppercase tracking-[0.22em] text-steel">
                        {k}
                      </small>
                      <b className="font-display text-2xl font-normal text-ivory">{v}</b>
                    </div>
                  ))}
                </div>

                <ModalSectionHeading>{t('mWorkH')}</ModalSectionHeading>
                <div>
                  {steps.map(([title, desc], i) => (
                    <div
                      key={title}
                      className="flex gap-4 border-b border-white/[0.07] py-4"
                    >
                      <span className="min-w-[2.2rem] font-display text-lg text-steel tabular-nums">
                        {pad2(i + 1)}
                      </span>
                      <div>
                        <div className="mb-1 text-base text-ivory">{title}</div>
                        <div className="text-sm leading-[1.75] text-platinum/60">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link href="/contact" data-cursor="hover">
                    <PrimaryPill>{t('mView')}</PrimaryPill>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BAFigure({
  src,
  variant,
  label,
  caption,
}: {
  src: string;
  variant: 'before' | 'after';
  label: string;
  caption: string;
}) {
  const isBefore = variant === 'before';
  return (
    <figure
      data-cursor="hover"
      className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-obsidian"
    >
      <Image
        src={src}
        alt={label}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        className={[
          'object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105',
          isBefore
            ? 'brightness-[0.72] grayscale-[0.7] contrast-[1.05]'
            : 'brightness-100 grayscale-[0.1]',
        ].join(' ')}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 to-transparent" />
      <span
        className={[
          'absolute top-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.55rem] uppercase tracking-[0.26em] backdrop-blur-md start-4',
          isBefore
            ? 'border border-white/20 bg-black/55 text-platinum/85'
            : 'border border-white bg-white/90 text-obsidian',
        ].join(' ')}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
        {label}
      </span>
      <figcaption className="absolute bottom-4 start-4 text-[0.6rem] text-ivory/85">
        {caption}
      </figcaption>
    </figure>
  );
}

function ModalSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 mt-10 flex items-center gap-4">
      <span className="whitespace-nowrap text-[0.62rem] uppercase tracking-[0.3em] text-platinum">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-platinum/30 to-transparent" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  CTA                                                                   */
/* ════════════════════════════════════════════════════════════════════ */
function ArchiveCta({ t }: { t: ReturnType<typeof useTranslations> }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
  }));

  return (
    <section
      ref={ref}
      id="cta"
      className="relative flex min-h-[82svh] items-center justify-center overflow-hidden text-center isolate"
    >
      <motion.div className="absolute inset-0 -z-30" style={{ y: bgY }}>
        <Image
          src={CTA_IMAGE}
          alt=""
          fill
          sizes="100vw"
          className="scale-[1.06] object-cover"
          style={{ filter: 'grayscale(0.35) brightness(0.5) contrast(1.1)' }}
        />
      </motion.div>
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.7)_80%)]" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-obsidian via-transparent to-obsidian" />
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-[42rem] w-[42rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.06] blur-[140px]"
      />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.8, 0], y: [20, -60, -120] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[880px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 flex items-center justify-center gap-3 text-[0.62rem] uppercase tracking-[0.45em] text-platinum/70"
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('ctaEyebrow')}
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE }}
          className="font-display text-hero-sm font-light leading-[0.98] tracking-tight md:text-hero"
        >
          {t('ctaLine')}
          <span className="mt-2 block font-editorial text-[0.58em] italic text-platinum">
            {t('ctaSub')}
          </span>
        </motion.h2>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-5">
          <Link href="/booking" data-cursor="hover">
            <PrimaryPill>{t('ctaPrimary')}</PrimaryPill>
          </Link>
          <Link href="/contact" data-cursor="hover">
            <GhostPill>{t('ctaSecondary')}</GhostPill>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Shared                                                                */
/* ════════════════════════════════════════════════════════════════════ */
function PlatinumDivider() {
  return (
    <div className="relative mx-auto h-px max-w-[1440px] bg-gradient-to-r from-transparent via-platinum/20 to-transparent">
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum shadow-[0_0_18px_2px_rgba(203,205,205,0.5)]" />
    </div>
  );
}

function PrimaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/btn relative inline-block">
      <span
        aria-hidden
        className="absolute -inset-3 rounded-full bg-gradient-to-r from-platinum/50 via-ivory/40 to-platinum/50 opacity-0 blur-2xl transition-opacity duration-700 group-hover/btn:opacity-100"
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/80 via-platinum/40 to-ivory/55"
      />
      <span
        className="relative inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 group-hover/btn:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.9),0 18px 60px -15px rgba(203,205,205,0.6)',
        }}
      >
        {children}
        <ArrowUpRight
          className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
          strokeWidth={2.2}
        />
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
      </span>
    </span>
  );
}

function GhostPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/btn relative inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
      {children}
      <ArrowUpRight
        className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
        strokeWidth={1.8}
      />
    </span>
  );
}