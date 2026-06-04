'use client';

/**
 * Hero — ABH Auto · scroll-driven image sequence
 * Path in your repo: components/sections/hero.tsx  (export `Hero`)
 *
 * HOW IT WORKS
 *  - A tall "track" section (TRACK_VH) provides the scroll distance.
 *  - Inside it, a sticky 100svh "stage" stays pinned while you scroll.
 *  - A <canvas> paints one of FRAME_COUNT frames, chosen from scroll
 *    progress (0 → first frame, 1 → last frame). Apple-style scrubbing.
 *  - After the last frame the track ends and the page continues to the
 *    next section naturally.
 *
 * FRAMES
 *  - Put your images in:  public/frames/
 *  - Named exactly:       ezgif-frame-001.png … ezgif-frame-056.png
 *  - Tune FRAME_COUNT / TRACK_VH below.
 *
 * Notes
 *  - Canvas keeps it smooth and flicker-free; all frames are preloaded and
 *    the first frame paints as soon as it arrives (with a CSS poster behind
 *    to avoid any black flash before JS).
 *  - Brand wordmark + CTAs sit over the opening frames and fade out as the
 *    sequence begins, so the animation reads cleanly.
 *  - Uses existing i18n keys only (hero.*). No new keys.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ArrowDown } from 'lucide-react';

/* ── configuration ─────────────────────────────────────────────────── */
const FRAME_COUNT = 80;                 // number of frames in public/frames
const FRAME_DIR = '/frames';            // folder under /public
const TRACK_VH = 700;                   // scroll length; higher = slower scrub
const framePath = (i: number) => `${FRAME_DIR}/ezgif-frame-${String(i).padStart(3, '0')}.png`;
const FIRST_FRAME = framePath(1);

const EASE = [0.16, 1, 0.3, 1] as const;
const INTRO = 0.6;
const STAGGER = 0.14;

export function Hero() {
  const t = useTranslations('hero');
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const [ready, setReady] = useState(false);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  // Opening content fades out as the sequence starts.
  const contentOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.16], [0, -48]);
  const contentPE = useTransform(scrollYProgress, [0, 0.16, 0.1601], ['auto', 'auto', 'none'] as const);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  /* draw a frame onto the canvas with object-fit: cover behaviour */
  const draw = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[idx];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);

  /* size the canvas to the stage (capped DPR for memory) and repaint */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    draw(frameRef.current);
  }, [draw]);

  /* preload all frames; paint frame 1 the moment it lands */
  useEffect(() => {
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    let firstDone = false;
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = framePath(i);
      const onFirst = () => {
        if (firstDone) return;
        firstDone = true;
        resize();
        setReady(true);
      };
      if (i === 1) {
        if (img.complete) onFirst();
        else img.onload = onFirst;
      }
      imgs[i - 1] = img;
    }
    imagesRef.current = imgs;
    resize();
  }, [resize]);

  /* keep canvas sharp on viewport changes */
  useEffect(() => {
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [resize]);

  /* scrub frames from scroll progress */
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(v * (FRAME_COUNT - 1))));
    if (idx === frameRef.current) return;
    frameRef.current = idx;
    draw(idx);
  });

  const wordmark = Array.from(t('brandLine'));

  return (
    <section
      ref={trackRef}
      data-section="hero"
      className="relative w-full"
      style={{ height: `${TRACK_VH}vh` }}
    >
      {/* ── pinned stage ─────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-obsidian"
      >
        {/* CSS poster behind the canvas — no black flash before JS paints */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${FIRST_FRAME}')`, filter: 'grayscale(0.2) brightness(0.7) contrast(1.1)' }}
        />

        {/* frame canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
          style={{ filter: 'grayscale(0.2) brightness(0.7) contrast(1.1)' }}
        />

        {/* cinematic grade: top fade · centre vignette · side vignette */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-transparent to-obsidian" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_72%,rgba(0,0,0,0.92)_100%)]" />
        <div aria-hidden className="absolute inset-y-0 end-0 w-1/3 bg-gradient-to-l from-obsidian/70 to-transparent" />

        {/* noise veil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* frame chrome */}
        <PassePartout />
        <Crosshairs />

        {/* ── opening content (fades out as the sequence begins) ──────── */}
        <motion.div
          style={{ opacity: contentOpacity, y: contentY, pointerEvents: contentPE }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: INTRO, ease: EASE }}
            className="mb-10 flex items-center gap-5"
          >
            <span className="block h-px w-14 bg-gradient-to-r from-transparent to-platinum/55" />
            <span
              dir="ltr"
              className="text-[0.62rem] font-medium uppercase tracking-[0.5em] text-platinum/85"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
            >
              {t('eyebrow')}
            </span>
            <span className="block h-px w-14 bg-gradient-to-l from-transparent to-platinum/55" />
          </motion.div>

          <h1 dir="ltr" className="relative">
            <bdi
              className="flex items-center justify-center font-display font-normal uppercase leading-[0.9]"
              style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', letterSpacing: '0.12em' }}
            >
              {wordmark.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: INTRO + STAGGER + i * 0.05, ease: EASE }}
                  className={
                    ch === ' '
                      ? 'inline-block w-[0.3em]'
                      : 'inline-block bg-gradient-to-b from-ivory via-platinum to-ivory bg-clip-text text-transparent'
                  }
                  style={{ textShadow: ch === ' ' ? 'none' : '0 4px 30px rgba(0,0,0,0.4)' }}
                >
                  {ch === ' ' ? '\u00A0' : ch}
                </motion.span>
              ))}
            </bdi>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: INTRO + STAGGER * 2, ease: EASE }}
            className="mt-8 font-editorial font-normal italic leading-tight text-platinum/85"
            style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {t('tagline')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: INTRO + STAGGER * 3, ease: EASE }}
            className="mt-6 max-w-[40ch] text-[1.05rem] leading-relaxed text-platinum/70"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {t('subline')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: INTRO + STAGGER * 4, ease: EASE }}
            className="mt-11 flex flex-wrap items-center justify-center gap-4"
          >
            <PrimaryCTA href="/booking">{t('cta_primary')}</PrimaryCTA>
            <GhostCTA href="/services">{t('cta_secondary')}</GhostCTA>
          </motion.div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-9 z-30 flex justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: INTRO + STAGGER * 5 + 0.3, ease: EASE }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-[0.55rem] uppercase tracking-[0.45em] text-platinum/50">{t('scroll')}</span>
            <motion.span
              animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              className="block h-3 w-px origin-center bg-platinum/70"
            />
            <span className="flex items-center gap-1 text-[0.5rem] uppercase tracking-[0.4em] text-platinum/40">
              <ArrowDown className="h-2.5 w-2.5" strokeWidth={1.5} />
              {t('discover')}
            </span>
          </motion.div>
        </motion.div>

        {/* loading shimmer until the first frame paints */}
        {!ready && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-obsidian/40 backdrop-blur-sm">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-platinum" />
          </div>
        )}

        {/* bottom seam */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Decorative chrome
   ══════════════════════════════════════════════════════════════════════ */
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

function Crosshairs() {
  const arm = 'absolute bg-ivory/45';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-6 z-20 md:inset-10">
      <span className={`${arm} left-0 top-0 h-px w-4`} />
      <span className={`${arm} left-0 top-0 h-4 w-px`} />
      <span className={`${arm} right-0 top-0 h-px w-4`} />
      <span className={`${arm} right-0 top-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 left-0 h-px w-4`} />
      <span className={`${arm} bottom-0 left-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 right-0 h-px w-4`} />
      <span className={`${arm} bottom-0 right-0 h-4 w-px`} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CTAs
   ══════════════════════════════════════════════════════════════════════ */
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