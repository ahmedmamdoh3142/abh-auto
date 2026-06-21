'use client';

/**
 * Hero — ABH Auto · cinematic stage
 * Path: components/sections/hero.tsx  (export `Hero`)
 *
 * استراتيجية الأداء (نهج المواقع العالمية):
 *  • الموبايل: صورة poster ثابتة فقط — لا فيديو إطلاقًا. الصورة هي عنصر LCP وتظهر
 *    في ~1ث، فيرتفع سكور الموبايل بقوة. (الفيديو الثقيل لا يُحمَّل أصلًا على الموبايل.)
 *  • اللاب/التابلت (>=768px): الفيديو يعمل كالمعتاد فوق صورة الـ poster.
 *  • نكتشف الجهاز بعد التركيب (mounted) ثم نقرر هل نُركّب الفيديو أم لا.
 *  • صورة الموبايل (posterUrlMobile) منفصلة عن الديسكتوب — لو فاضية تُستخدم
 *    صورة الديسكتوب. الاختيار يتم بعد اكتشاف الجهاز.
 *  • الـ poster يُعمل له preload بأولوية عالية (يعمل في App Router).
 *  • نص الهيرو يتحرّك بـ CSS لا framer-motion.
 */
import { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ArrowDown } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;
const INTRO = 0.35;
const STAGGER = 0.1;

export interface HeroVideoSources {
  webm: string | null;
  mp4: string | null;
}
export interface HeroMedia {
  desktop: HeroVideoSources;
  mobile: HeroVideoSources;
  posterUrl: string | null;
  /** صورة poster مخصّصة للموبايل — اختيارية؛ لو فاضية تُستخدم posterUrl. */
  posterUrlMobile?: string | null;
}

export function Hero({ media }: { media?: HeroMedia }) {
  const t = useTranslations('hero');
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  const posterDesktop = media?.posterUrl ?? '/images/hero-bg.webp';
  // صورة الموبايل: لو محدّدة نستخدمها، وإلا نرجع لصورة الديسكتوب.
  const posterMobile = media?.posterUrlMobile ?? posterDesktop;

  // نعمل preload للاتنين بأولوية عالية (عنصر LCP يختلف حسب الجهاز).
  ReactDOM.preload(posterDesktop, { as: 'image', fetchPriority: 'high' });
  if (posterMobile !== posterDesktop) {
    ReactDOM.preload(posterMobile, { as: 'image', fetchPriority: 'high' });
  }

  const desktop = media?.desktop ?? { webm: null, mp4: null };
  const mobile = media?.mobile ?? { webm: null, mp4: null };
  const hasDesktopVid = !!(desktop.webm || desktop.mp4);
  const hasMobileVid = !!(mobile.webm || mobile.mp4);

  // null = لسه مش متحدد (SSR / أول رندر). true = ديسكتوب. false = موبايل.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // صورة الـ poster المعروضة: على الموبايل المؤكّد (isDesktop===false) نستخدم صورة
  // الموبايل؛ غير كده (ديسكتوب أو قبل الاكتشاف) نستخدم صورة الديسكتوب — لتفادي
  // وميض الصورة الخطأ، نُبقي الديسكتوب كافتراضي حتى يتأكد أنه موبايل.
  const poster = isDesktop === false ? posterMobile : posterDesktop;

  // الفيديو يُركَّب فقط على الديسكتوب (وبدون reduced-motion).
  // نختار مصدر الديسكتوب؛ ولو مش موجود نستخدم مصدر الموبايل على اللاب فقط.
  const deskSrc: HeroVideoSources = hasDesktopVid ? desktop : mobile;
  const showVideo = isDesktop === true && !reduce && !!(deskSrc.webm || deskSrc.mp4);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !showVideo) return;
    const tryPlay = () => { v.play().catch(() => {}); };
    if (v.readyState >= 2) tryPlay();
    v.addEventListener('canplay', tryPlay, { once: true });
    return () => v.removeEventListener('canplay', tryPlay);
  }, [showVideo]);

  const wordmark = Array.from(t('brandLine'));

  return (
    <section data-section="hero" className="relative h-[100svh] w-full overflow-hidden bg-obsidian">
      {/* ── الـ poster: خلفية ثابتة دائمًا. على الموبايل هي العنصر الوحيد (وعنصر LCP). ── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${poster}')`, filter: 'grayscale(0.18) brightness(0.82) contrast(1.05)' }}
      />

      {/* ── الفيديو: على اللاب فقط، فوق الـ poster ── */}
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'grayscale(0.18) brightness(0.82) contrast(1.05)' }}
          autoPlay muted loop playsInline preload="auto"
          poster={poster}
        >
          {deskSrc.webm && <source src={deskSrc.webm} type="video/webm" />}
          {deskSrc.mp4 && <source src={deskSrc.mp4} type="video/mp4" />}
        </video>
      )}

      {/* ══════════════ الغمامة السينمائية ══════════════ */}
      <div aria-hidden className="absolute inset-0 bg-obsidian/25" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-obsidian/75 via-obsidian/20 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent" />
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 42%, transparent 38%, rgba(0,0,0,0.5) 100%)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(60% 50% at 50% 55%, rgba(203,205,205,0.05), transparent 70%)' }} />

      {/* noise veil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <PassePartout />

      {/* ── المحتوى ── */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center">
        <div className="anim-rise mb-10 flex items-center gap-5" style={{ animationDelay: '0.05s' }}>
          <span className="block h-px w-14 bg-gradient-to-r from-transparent to-platinum/55" />
          <span
            dir="ltr"
            className="text-[0.62rem] font-medium uppercase tracking-[0.5em] text-platinum/85"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            {t('eyebrow')}
          </span>
          <span className="block h-px w-14 bg-gradient-to-l from-transparent to-platinum/55" />
        </div>

        <h1 dir="ltr" className="relative">
          <bdi
            className="flex items-center justify-center font-display font-normal uppercase leading-[0.9]"
            style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', letterSpacing: '0.12em' }}
          >
            {wordmark.map((ch, i) => (
              <span
                key={i}
                className={
                  ch === ' '
                    ? 'inline-block w-[0.3em]'
                    : 'anim-letter inline-block bg-gradient-to-b from-ivory via-platinum to-ivory bg-clip-text text-transparent'
                }
                style={{
                  textShadow: ch === ' ' ? 'none' : '0 4px 30px rgba(0,0,0,0.5)',
                  animationDelay: `${0.05 + i * 0.05}s`,
                }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </bdi>
        </h1>

        <p
          className="anim-rise mt-8 font-editorial font-normal italic leading-tight text-platinum/85"
          style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)', animationDelay: '0.18s' }}
        >
          {t('tagline')}
        </p>

        <p
          className="anim-rise mt-6 max-w-[40ch] text-[1.05rem] leading-relaxed text-platinum/70"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)', animationDelay: '0.28s' }}
        >
          {t('subline')}
        </p>

        <div
          className="anim-rise mt-11 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: '0.4s' }}
        >
          <PrimaryCTA href="/booking">{t('cta_primary')}</PrimaryCTA>
          <GhostCTA href="/services">{t('cta_secondary')}</GhostCTA>
        </div>
      </div>

      {/* scroll hint */}
      <div
        className="anim-rise pointer-events-none absolute inset-x-0 bottom-9 z-30 flex justify-center"
        style={{ animationDelay: '0.6s' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.45em] text-platinum/50">{t('scroll')}</span>
          <span className="anim-scrollbar block h-3 w-px origin-center bg-platinum/70" />
          <span className="flex items-center gap-1 text-[0.5rem] uppercase tracking-[0.4em] text-platinum/40">
            <ArrowDown className="h-2.5 w-2.5" strokeWidth={1.5} />
            {t('discover')}
          </span>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />
    </section>
  );
}

/* ── إطار خفيف ── */
function PassePartout() {
  const draw = { duration: 1.6, delay: 0.4, ease: EASE };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-10 z-20 hidden md:block">
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={draw}
        className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={draw}
        className="absolute inset-y-0 end-0 w-px origin-top bg-gradient-to-b from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={draw}
        className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-r from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={draw}
        className="absolute inset-y-0 start-0 w-px origin-bottom bg-gradient-to-b from-transparent via-platinum/25 to-transparent" />
    </div>
  );
}

/* ── CTAs ── */
function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/85 via-platinum/40 to-ivory/55" />
      <span
        className="relative inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 group-hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #cbcdcd 50%, #ffffff 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 60px -15px rgba(203,205,205,0.6)' }}
      >
        {children}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function GhostCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover"
      className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} />
    </Link>
  );
}