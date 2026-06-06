'use client';

/**
 * TestimonialsSection
 * Path: components/sections/testimonials-section.tsx  (export `TestimonialsSection`)
 *
 * - No photos. Each speaker is represented by an elegant monogram (initials),
 *   in the house display face — cleaner and more editorial than avatars.
 * - 3D rotating ring is desktop-only; mobile gets clear prev / dots / next nav.
 * - Autoplay pauses when off-screen or tab hidden.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { testimonials } from '@/lib/site-config';

export function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const total = testimonials.length;
  const radius = 360;
  const angleStep = 360 / total;

  const goTo = (i: number) => setActive(((i % total) + total) % total);
  const prev = () => goTo(active - 1);
  const next = () => goTo(active + 1);

  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setActive((a) => (a + 1) % total);
    }, 5500);
    return () => clearInterval(id);
  }, [total, inView]);

  const current = testimonials[active];

  return (
    <section ref={sectionRef} className="section relative overflow-hidden" id="testimonials">
      <div className="absolute inset-0 grid-lines opacity-30" />

      <div className="container relative">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-14 grid items-center gap-12 md:mt-20 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          {/* Left — current quote (animated) */}
          <div>
            <div className="relative flex min-h-[280px] items-center md:min-h-[360px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  <Quote className="reversible-icon mb-5 h-10 w-10 text-platinum/30 md:mb-6 md:h-12 md:w-12" />

                  <p className="balance font-display text-2xl leading-tight tracking-tight text-ivory md:text-3xl lg:text-4xl">
                    &ldquo;{current.quote}&rdquo;
                  </p>

                  <div className="mt-8 flex items-center gap-4 md:mt-10 md:gap-5">
                    <Monogram name={current.name} size={58} />
                    <div className="min-w-0">
                      <div className="truncate font-display text-base uppercase tracking-tight text-ivory">{current.name}</div>
                      <div className="mt-1 text-[0.62rem] uppercase tracking-[0.26em] text-platinum/70">{current.role}</div>
                    </div>
                    <div className="ms-auto flex flex-none items-center gap-0.5">
                      {Array.from({ length: current.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-platinum text-platinum" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation — mobile/tablet (the 3D ring is the nav on desktop) */}
            <div className="mt-8 flex items-center gap-4 lg:hidden">
              <button onClick={prev} data-cursor="hover" aria-label="Previous"
                className="grid h-10 w-10 flex-none place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
                <ChevronLeft className="reversible-icon h-4 w-4" strokeWidth={1.8} />
              </button>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                {testimonials.map((tm, i) => {
                  const on = i === active;
                  return (
                    <button key={i} onClick={() => goTo(i)} data-cursor="hover" aria-label={tm.name}
                      className={`h-1.5 rounded-full transition-all duration-500 ${on ? 'w-7 bg-platinum' : 'w-1.5 bg-white/25 hover:bg-white/45'}`} />
                  );
                })}
              </div>

              <button onClick={next} data-cursor="hover" aria-label="Next"
                className="grid h-10 w-10 flex-none place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
                <ChevronRight className="reversible-icon h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* Right — 3D rotating card carousel (desktop only) */}
          <div className="relative hidden h-[560px] items-center justify-center [perspective:1800px] lg:flex">
            <div
              className="relative h-72 w-64 transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d]"
              style={{ transform: `translateZ(-${radius}px) rotateY(${-active * angleStep}deg)` }}
            >
              {testimonials.map((tm, i) => {
                const distance = Math.min(Math.abs(i - active), total - Math.abs(i - active));
                return (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="group absolute inset-0 overflow-hidden rounded-2xl text-start glass-strong [backface-visibility:hidden]"
                    style={{
                      transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                      opacity: distance > 2 ? 0 : 1 - distance * 0.25,
                      filter: distance === 0 ? 'none' : `blur(${distance}px) brightness(${1 - distance * 0.18})`,
                      transition: 'opacity 1s ease, filter 1s ease',
                    }}
                    data-cursor="hover"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
                    <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 font-display text-[7rem] leading-none text-white/[0.06]">&rdquo;</span>
                    <div className="relative flex h-full flex-col justify-between p-5">
                      <div className="flex items-center gap-3">
                        <Monogram name={tm.name} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-display text-xs uppercase leading-none tracking-tight text-ivory">{tm.name.split(' ')[0]}</div>
                          <div className="mt-1 truncate text-[0.55rem] uppercase tracking-[0.25em] text-platinum/60">{tm.role.split('·')[0]?.trim()}</div>
                        </div>
                      </div>
                      <p className="pretty line-clamp-5 text-xs leading-relaxed text-platinum/85">
                        &ldquo;{tm.quote.substring(0, 110)}…&rdquo;
                      </p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: tm.rating }).map((_, k) => (
                          <Star key={k} className="h-2.5 w-2.5 fill-platinum text-platinum" />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Elegant initials monogram — replaces avatar photos. */
function Monogram({ name, size }: { name: string; size: number }) {
  const initials =
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '—';
  return (
    <span
      className="relative grid flex-none place-items-center rounded-full border border-white/15 bg-gradient-to-br from-white/[0.1] to-white/[0.02] shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]"
      style={{ height: size, width: size }}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-full border border-white/[0.06]" />
      <span className="font-display uppercase leading-none tracking-wide text-platinum" style={{ fontSize: size * 0.36 }}>
        {initials}
      </span>
    </span>
  );
}