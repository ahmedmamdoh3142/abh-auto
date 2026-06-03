'use client';

/**
 * ProjectsSection — 360 deg rotating ring carousel.
 * Path: components/sections/projects-section.tsx  (export `ProjectsSection`)
 *
 * Borderless / seamless treatment:
 *  - The SECTION is fully transparent — no grid-lines, no drawn floor, no
 *    box edges. A top+bottom mask dissolves it into the sections above/below
 *    so it reads as one continuous dark field, not a bordered block.
 *  - Each CARD has NO border and is rounded only at the top; its bottom melts
 *    straight into its reflection (flush, no gap, no rounding, immediate
 *    feather) so card + reflection look like a single floating object.
 *  - Inactive cards lose opacity and gain a soft blur with distance, so they
 *    dissolve into the dark instead of looking like cut-out tiles.
 *
 * Mechanic is unchanged from the reference: full ring, drag-to-spin,
 * auto-play, circular SVG progress dial, RTL-aware keyboard.
 *
 * MONOCHROME only. next/image with sizes. Deterministic particles (no
 * hydration mismatch). Content reveal via `animate` (no AnimatePresence).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';

const PROJECTS = [
  { id: 1, title: 'Pagani Huayra', category: 'Carbon Restoration', image: '/images/project-1.png' },
  { id: 2, title: 'Rolls-Royce Spectre', category: 'Diamond Suite', image: '/images/project-2.png' },
  { id: 3, title: 'Ferrari SF90', category: 'Track Specification', image: '/images/project-3.png' },
  { id: 4, title: 'Bentley Bacalar', category: 'Concours Prep', image: '/images/project-4.png' },
  { id: 5, title: 'Aston Martin DBX', category: 'Armored B6', image: '/images/project-5.png' },
  { id: 6, title: 'Porsche 911 GT3', category: 'PPF Application', image: '/images/project-6.png' },
  { id: 7, title: 'Mercedes-AMG G63', category: 'Stealth Tracking', image: '/images/project-7.png' },
  { id: 8, title: 'Lamborghini Revuelto', category: 'Ceramic 12yr', image: '/images/project-8.png' },
];

const SPRING = { type: 'spring' as const, stiffness: 80, damping: 20, mass: 1 };
const RADIUS = 620;
const CARD_W = 380;
const CARD_H = 500;
const REFLECTION_H = 240;

export function ProjectsSection() {
  const t = useTranslations('projects');

  const [rotation, setRotation] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const dragStartX = useRef(0);
  const dragStartRotation = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = PROJECTS.length;
  const anglePerItem = 360 / total;

  const activeIndex = ((Math.round(-rotation / anglePerItem) % total) + total) % total;

  const next = useCallback(() => setRotation((p) => p - anglePerItem), [anglePerItem]);
  const prev = useCallback(() => setRotation((p) => p + anglePerItem), [anglePerItem]);

  const goTo = useCallback(
    (index: number) => {
      const target = ((index % total) + total) % total;
      const currentNorm = ((Math.round(-rotation / anglePerItem) % total) + total) % total;
      let diff = target - currentNorm;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      setRotation((p) => p - diff * anglePerItem);
    },
    [rotation, anglePerItem, total],
  );

  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = setInterval(() => {
      if (document.hidden || !inView.current) return;
      next();
    }, 4000);
    return () => clearInterval(id);
  }, [isAutoPlaying, next]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current) return;
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowLeft') (rtl ? next : prev)();
      if (e.key === 'ArrowRight') (rtl ? prev : next)();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, [next, prev]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const dragStart = (clientX: number) => {
    setIsDragging(true);
    setIsAutoPlaying(false);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    dragStartX.current = clientX;
    dragStartRotation.current = rotation;
  };
  const dragMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - dragStartX.current;
    setRotation(dragStartRotation.current + diff * 0.3);
  };
  const dragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setRotation((r) => -Math.round(r / anglePerItem) * anglePerItem);
    resumeTimer.current = setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  return (
    <section
      className="section relative overflow-hidden"
      id="projects"
      style={{
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
      }}
    >
      <div className="container relative">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {/* 3D ring stage — breaks out symmetrically wider than the text
            container via negative inline margins, so it stays perfectly
            centered in both LTR and RTL. Transparent, no frame. */}
        <div
          ref={containerRef}
          className="relative mx-auto mt-12 h-[720px] w-auto max-w-[1600px] cursor-grab touch-pan-y select-none active:cursor-grabbing md:mt-16 md:-mx-12 lg:-mx-24"
          style={{ perspective: '1500px' }}
          onMouseDown={(e) => dragStart(e.clientX)}
          onMouseMove={(e) => dragMove(e.clientX)}
          onMouseUp={dragEnd}
          onMouseLeave={dragEnd}
          onTouchStart={(e) => dragStart(e.touches[0].clientX)}
          onTouchMove={(e) => dragMove(e.touches[0].clientX)}
          onTouchEnd={dragEnd}
        >
          {/* Deterministic platinum particles (behind cards) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {[...Array(16)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-platinum/20"
                style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
                animate={{ y: [0, -460], opacity: [0, 0.7, 0] }}
                transition={{
                  duration: 12 + (i % 6),
                  repeat: Infinity,
                  ease: 'linear',
                  delay: (i % 5) * 1.1,
                }}
              />
            ))}
          </div>

          <div
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d', transform: `translateZ(-${RADIUS}px)` }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2 h-0 w-0"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: rotation }}
              transition={isDragging ? { duration: 0 } : SPRING}
            >
              {PROJECTS.map((project, index) => {
                const angle = index * anglePerItem;
                const isActive = index === activeIndex;
                const ringDist = Math.abs(((index - activeIndex + total) % total) - total / 2);
                const norm = Math.min(ringDist, total - ringDist);

                return (
                  <div
                    key={project.id}
                    className="absolute"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateY(${angle}deg) translateZ(${RADIUS}px)`,
                      left: `-${CARD_W / 2}px`,
                      top: `-${CARD_H / 2 + 70}px`,
                    }}
                    onClick={() => !isDragging && goTo(index)}
                    data-cursor="hover"
                  >
                    {/* Unit = card + reflection, animated together so they
                        move, scale, fade and blur as ONE floating object. */}
                    <motion.div
                      animate={{
                        scale: isActive ? 1 : 0.85,
                        opacity: isActive ? 1 : Math.max(0.22, 0.8 - norm * 0.24),
                        filter: isActive
                          ? 'grayscale(0.25) brightness(1) blur(0px)'
                          : `grayscale(0.7) brightness(${0.5 + (1 - norm / (total / 2)) * 0.3}) blur(${norm * 0.7}px)`,
                      }}
                      transition={{ duration: 0.5 }}
                      style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                    >
                      {/* Card body — no border, top-rounded only */}
                      <div
                        className="relative overflow-hidden rounded-t-2xl"
                        style={{ width: CARD_W, height: CARD_H }}
                      >
                        {/* Image (active gets ken-burns) */}
                        <motion.div
                          className="absolute inset-0"
                          animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={
                            isActive
                              ? { duration: 12, repeat: Infinity, ease: 'easeInOut' }
                              : { duration: 0.5 }
                          }
                        >
                          <Image
                            src={project.image}
                            alt={`${project.title} — ${project.category}`}
                            fill
                            sizes="320px"
                            className="object-cover"
                          />
                        </motion.div>

                        {/* Tonal grade + bottom feather into the reflection */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />

                        {/* Soft active glow (no hard ring) */}
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                          style={{
                            opacity: isActive ? 1 : 0,
                            boxShadow: '0 0 90px rgba(203,205,205,0.22)',
                          }}
                        />

                        {/* Chrome glass sheen */}
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-20"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
                          }}
                        />

                        {/* Content */}
                        <motion.div
                          className="absolute inset-x-0 bottom-0 p-6"
                          animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 24 }}
                          transition={{ duration: 0.5, delay: isActive ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-platinum ring-1 ring-white/15 backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-platinum" />
                            {project.category}
                          </div>
                          <h3 className="font-display text-3xl uppercase tracking-tight text-ivory">
                            {project.title}
                          </h3>
                        </motion.div>
                      </div>

                      {/* Reflection — flush under the card, mirrored, fades out
                          immediately so the seam between them disappears. */}
                      <div
                        aria-hidden
                        className="pointer-events-none overflow-hidden"
                        style={{
                          width: CARD_W,
                          height: REFLECTION_H,
                          transform: 'scaleY(-1)',
                          backgroundImage: `url(${project.image})`,
                          backgroundSize: `${CARD_W}px ${CARD_H}px`,
                          backgroundPosition: 'left bottom',
                          filter: 'grayscale(1) blur(3px)',
                          opacity: isActive ? 0.32 : 0.16,
                          maskImage:
                            'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.55) 78%)',
                          WebkitMaskImage:
                            'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.55) 78%)',
                        }}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative z-20 mx-auto mt-2 flex max-w-lg items-center justify-center gap-8">
          <RingButton label="Previous" onClick={prev}>
            <ChevronLeft className="reversible-icon h-5 w-5" />
          </RingButton>

          <div className="relative h-16 w-16">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#cbcdcd"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * 40) / total} ${2 * Math.PI * 40}`}
                animate={{ strokeDashoffset: -(activeIndex * (2 * Math.PI * 40)) / total }}
                transition={SPRING}
              />
              {PROJECTS.map((_, i) => {
                const a = (i * 360) / total - 90;
                const x = 50 + 40 * Math.cos((a * Math.PI) / 180);
                const y = 50 + 40 * Math.sin((a * Math.PI) / 180);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={i === activeIndex ? 5 : 3}
                    fill={i === activeIndex ? '#ffffff' : 'rgba(203,205,205,0.3)'}
                    className="cursor-pointer transition-all"
                    onClick={() => goTo(i)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span dir="ltr" className="font-mono text-sm font-semibold tabular-nums text-ivory">
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
            </div>
          </div>

          <RingButton label="Next" onClick={next}>
            <ChevronRight className="reversible-icon h-5 w-5" />
          </RingButton>
        </div>

        {/* Counter + archive */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <span dir="ltr" className="font-mono text-[0.65rem] uppercase tracking-[0.32em] tabular-nums text-platinum/70">
            {String(activeIndex + 1).padStart(2, '0')} <span className="text-platinum/30">/</span>{' '}
            {String(total).padStart(2, '0')}
          </span>
          <span className="block h-px w-10 bg-platinum/20" />
          <Link
            href="/projects"
            data-cursor="hover"
            className="link-magnetic inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-platinum/80"
          >
            {t('viewAll')}
            <ArrowUpRight className="reversible-icon h-3 w-3" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function RingButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      data-cursor="hover"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-platinum backdrop-blur-md transition-colors hover:border-white/25 hover:text-ivory"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: '0 0 30px rgba(203,205,205,0.35)' }}
      />
      {children}
    </motion.button>
  );
}