'use client';

/**
 * Hero — ABH Auto · cinematic slider
 * Path: components/sections/hero.tsx  (export `Hero`)
 *
 * ── استراتيجية الأداء (لا تلمسها) ─────────────────────────────────────────
 *  1. سلايد ٠ فقط هي الموجودة في الـ HTML الأولي، بـ priority + fetchPriority=high.
 *     هي عنصر الـ LCP. باقي السلايدات غير موجودة في الـ DOM إطلاقًا في البداية.
 *  2. بعد requestIdleCallback (أو 1.2s كحد أقصى) نبدأ نركّب باقي السلايدات،
 *     ونحمّل الحالية + التالية فقط — مش الـ 9 كلهم.
 *  3. lazy loading العادي لا يكفي هنا: كل السلايدات داخل الـ viewport (مخفية
 *     بـ opacity فقط)، فالـ IntersectionObserver بتاع next/image هيحمّلها كلها
 *     على طول. لذلك الحل الوحيد الصحيح = عدم رندرتها من الأساس.
 *  4. الأوتوبلاي يقف لو: التاب مخفي / الهيرو خارج الشاشة / hover / reduced-motion.
 *
 * ── سلوك المحتوى ──────────────────────────────────────────────────────────
 *  • السلايد الأولى: eyebrow + wordmark + tagline + subline + الزرارين.
 *  • باقي السلايدات: الزرارين فقط. الكلام ينكمش بـ grid-template-rows 1fr→0fr
 *    (الطريقة الوحيدة لعمل height transition ناعم)، والزرارين يعوموا للمنتصف.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import type { HeroSlide } from '@/lib/hero-data';

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 6500;
const FADE_MS = 1100;

export interface HeroVideoSources { webm: string | null; mp4: string | null; }
export interface HeroMedia {
  desktop: HeroVideoSources;
  mobile: HeroVideoSources;
  posterUrl: string | null;
  posterUrlMobile?: string | null;
}

export function Hero({ media, slides = [] }: { media?: HeroMedia; slides?: HeroSlide[] }) {
  const t = useTranslations('hero');
  const locale = useLocale();
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);

  /* ── مصدر السلايدات ── */
  const posterDesktop = media?.posterUrl ?? '/images/hero-bg.webp';
  const posterMobile = media?.posterUrlMobile ?? posterDesktop;

  const deck: HeroSlide[] = slides.length
    ? slides
    : [{ id: 0, imageDesktop: posterDesktop, imageMobile: posterMobile, alt: { ar: '', en: '' }, href: null }];

  const count = deck.length;
  const hasSlider = count > 1;

  /* ── حالة ── */
  const [index, setIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [awake, setAwake] = useState(false);            // بعد الـ idle: نسمح برندرة باقي السلايدات
  const [mounted, setMounted] = useState<Set<number>>(new Set([0]));
  const [hoverPaused, setHoverPaused] = useState(false);   // hover على شريط المؤشرات فقط
  const [tabVisible, setTabVisible] = useState(true);
  const [inView, setInView] = useState(true);
  const [tick, setTick] = useState(0);                      // يعيد تصفير عدّاد الأوتوبلاي

  /* ── الجهاز ── */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const on = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* ── التاب ظاهر؟ (يوقف الأوتوبلاي ويرجّعه — مش يقتله) ── */
  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  /* ── إيقاظ السلايدر بعد ما الصفحة تهدأ (حماية الـ LCP) ── */
  useEffect(() => {
    if (!hasSlider) return;
    const wake = () => {
      setAwake(true);
      setMounted((s) => new Set(s).add(1 % count));      // نجهّز التالية فقط
    };
    const ric = (window as any).requestIdleCallback;
    const id = ric ? ric(wake, { timeout: 1200 }) : window.setTimeout(wake, 1200);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else clearTimeout(id as number);
    };
  }, [hasSlider, count]);

  /* ── تركيب الحالية + التالية عند كل تغيير ── */
  useEffect(() => {
    if (!awake) return;
    setMounted((s) => {
      const n = new Set(s);
      n.add(index);
      n.add((index + 1) % count);
      return n;
    });
  }, [index, awake, count]);

  /* ── الهيرو داخل الشاشة؟ ── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !hasSlider) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasSlider]);

  /* ── الأوتوبلاي ──
   * مهم: مفيش hover-pause على الـ section — الهيرو بياخد الشاشة كلها (100svh)،
   * فالماوس عملياً دايمًا جواه على الديسكتوب وكان بيقفل الأوتوبلاي للأبد.
   * الـ pause اتنقل لشريط المؤشرات بس.
   */
  const running = hasSlider && awake && inView && tabVisible && !hoverPaused && !reduce;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [running, count, index, tick]);   // tick → إعادة تصفير التايمر بعد تنقل يدوي

  /** تنقّل يدوي: يروح للسلايد ويصفّر عدّاد الأوتوبلاي من الأول. */
  const goTo = useCallback((i: number) => {
    setIndex(((i % count) + count) % count);
    setTick((t) => t + 1);
  }, [count]);

  /* ── سحب بالإصبع + كيبورد ── */
  const touchX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) < 55) return;
    const rtl = locale === 'ar';
    const fwd = rtl ? dx > 0 : dx < 0;
    goTo(index + (fwd ? 1 : -1));
  };
  useEffect(() => {
    if (!hasSlider) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(index + (locale === 'ar' ? -1 : 1));
      if (e.key === 'ArrowLeft') goTo(index + (locale === 'ar' ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSlider, index, goTo, locale]);

  const wordmark = Array.from(t('brandLine'));
  const isFirst = index === 0;
  const mobile = isDesktop === false;

  return (
    <section
      ref={rootRef}
      data-section="hero"
      className="relative h-[100svh] w-full overflow-hidden bg-obsidian"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription={hasSlider ? 'carousel' : undefined}
    >
      {/* ══════════════ السلايدات ══════════════ */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ filter: 'grayscale(0.06) brightness(0.96) contrast(1.04)' }}
      >
        {deck.map((s, i) => {
          const first = i === 0;
          if (!first && !mounted.has(i)) return null;   // ← مفتاح الـ LCP
          const src = mobile ? s.imageMobile : s.imageDesktop;
          const active = i === index;
          return (
            <div
              key={s.id}
              className="absolute inset-0"
              style={{
                opacity: active ? 1 : 0,
                transition: `opacity ${FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
                willChange: 'opacity',
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={first}
                fetchPriority={first ? 'high' : 'auto'}
                loading={first ? 'eager' : 'lazy'}
                sizes="100vw"
                quality={50}
                className="object-contain object-center md:object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* ══════════════ الغمامة السينمائية ══════════════ */}
      <div aria-hidden className="absolute inset-0 bg-obsidian/10" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-obsidian/55 via-obsidian/10 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-obsidian/85 via-obsidian/25 to-transparent" />
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(125% 95% at 50% 45%, transparent 55%, rgba(0,0,0,0.30) 100%)' }} />
      {/* السكرين المركزي: يقوى على السلايد الأولى (خلف الكلام) ويخف على الباقي */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(62% 52% at 50% 48%, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.26) 42%, transparent 74%)',
          opacity: isFirst ? 1 : 0.35,
          transition: `opacity ${FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={{ background: 'radial-gradient(60% 50% at 50% 55%, rgba(203,205,205,0.05), transparent 70%)' }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      <PassePartout />

      {/* لينك السلايد (لو موجود) — تحت المحتوى، فوق الصورة */}
      {deck[index]?.href && !isFirst && (
        <Link
          href={deck[index].href!}
          aria-label={deck[index].alt[locale as 'ar' | 'en'] || undefined}
          className="absolute inset-0 z-20"
        />
      )}

      {/* ══════════════ المحتوى ══════════════ */}
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center">
        {/* الكلام — ينكمش على السلايدات التانية */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: isFirst ? '1fr' : '0fr',
            transition: `grid-template-rows ${FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
          }}
          aria-hidden={!isFirst}
        >
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <div
              style={{
                opacity: isFirst ? 1 : 0,
                transform: isFirst ? 'translateY(0)' : 'translateY(-10px)',
                transition: `opacity 600ms ease, transform ${FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
              }}
            >
              <div className="anim-rise mb-10 flex items-center justify-center gap-5" style={{ animationDelay: '0.05s' }}>
                <span className="block h-px w-14 bg-gradient-to-r from-transparent to-platinum/55" />
                <span dir="ltr" className="text-[0.62rem] font-medium uppercase tracking-[0.5em] text-platinum/85" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.55)' }}>
                  {t('eyebrow')}
                </span>
                <span className="block h-px w-14 bg-gradient-to-l from-transparent to-platinum/55" />
              </div>

              <h1 dir="ltr" className="relative">
                <bdi
                  className="flex items-center justify-center font-display font-normal uppercase leading-[0.9]"
                  style={{ fontSize: 'clamp(2.9rem, 8.5vw, 7rem)', letterSpacing: '0.12em' }}
                >
                  {wordmark.map((ch, i) => (
                    <span
                      key={i}
                      className={ch === ' ' ? 'inline-block w-[0.3em]' : 'anim-letter inline-block bg-gradient-to-b from-ivory via-platinum to-ivory bg-clip-text text-transparent'}
                      style={{ textShadow: ch === ' ' ? 'none' : '0 4px 30px rgba(0,0,0,0.55)', animationDelay: `${0.05 + i * 0.05}s` }}
                    >
                      {ch === ' ' ? '\u00A0' : ch}
                    </span>
                  ))}
                </bdi>
              </h1>

              <p className="anim-rise mt-8 font-editorial font-normal italic leading-tight text-platinum/85" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', textShadow: '0 4px 30px rgba(0,0,0,0.55)', animationDelay: '0.18s' }}>
                {t('tagline')}
              </p>

              <p className="anim-rise mx-auto mt-6 max-w-[40ch] text-[1.05rem] leading-relaxed text-platinum/70" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.55)', animationDelay: '0.28s' }}>
                {t('subline')}
              </p>

              <div className="h-11" />
            </div>
          </div>
        </div>

        {/* الزرارين — ثابتين على كل السلايدات */}
        <div className="anim-rise pointer-events-auto flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: '0.4s' }}>
          <PrimaryCTA href="/booking">{t('cta_primary')}</PrimaryCTA>
          <GhostCTA href="/offers">{t('cta_secondary')}</GhostCTA>
        </div>
      </div>

      {/* ══════════════ المؤشرات ══════════════ */}
      {hasSlider && (
        <div className="absolute inset-x-0 bottom-9 z-40 flex justify-center px-6">
          <div
            className="pointer-events-auto flex items-center gap-2.5"
            role="tablist"
            aria-label="Hero slides"
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
          >
            {deck.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${count}`}
                onClick={() => goTo(i)}
                data-cursor="hover"
                className="group relative h-6 px-0.5"
              >
                <span className="relative block h-px w-8 overflow-hidden bg-platinum/25 transition-colors duration-300 group-hover:bg-platinum/50 md:w-11">
                  <span
                    className="absolute inset-y-0 start-0 block bg-ivory"
                    style={{
                      width: i === index ? '100%' : '0%',
                      transition: i === index && running ? `width ${AUTOPLAY_MS}ms linear` : 'width 350ms ease',
                    }}
                  />
                </span>
              </button>
            ))}
            <span dir="ltr" className="ms-3 text-[0.55rem] font-medium tracking-[0.3em] text-platinum/45 tabular-nums">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* scroll hint — يبقى على السلايد الأولى فقط لتفادي الزحمة */}
      {!hasSlider && (
        <div className="anim-rise pointer-events-none absolute inset-x-0 bottom-9 z-30 flex justify-center" style={{ animationDelay: '0.6s' }}>
          <div className="flex flex-col items-center gap-3">
            <span className="text-[0.55rem] uppercase tracking-[0.45em] text-platinum/50">{t('scroll')}</span>
            <span className="anim-scrollbar block h-3 w-px origin-center bg-platinum/70" />
            <span className="flex items-center gap-1 text-[0.5rem] uppercase tracking-[0.4em] text-platinum/40">
              <ArrowDown className="h-2.5 w-2.5" strokeWidth={1.5} />
              {t('discover')}
            </span>
          </div>
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />
    </section>
  );
}

/* ── إطار خفيف ── */
function PassePartout() {
  const draw = { duration: 1.6, delay: 0.4, ease: EASE };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-10 z-20 hidden md:block">
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={draw} className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={draw} className="absolute inset-y-0 end-0 w-px origin-top bg-gradient-to-b from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={draw} className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-r from-transparent via-platinum/25 to-transparent" />
      <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={draw} className="absolute inset-y-0 start-0 w-px origin-bottom bg-gradient-to-b from-transparent via-platinum/25 to-transparent" />
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
    <Link
      href={href}
      data-cursor="hover"
      className="group relative inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-white/80 bg-white/[0.06] px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white/[0.12]"
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 14px 40px -18px rgba(0,0,0,0.65)' }}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} />
    </Link>
  );
}