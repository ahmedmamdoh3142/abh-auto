'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Quote, Star } from 'lucide-react';
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

  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.1,
    });
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
        <SectionHeader
          eyebrow={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="mt-20 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center">
          {/* Left — current quote (animated) */}
          <div className="relative min-h-[400px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <Quote className="reversible-icon h-12 w-12 text-platinum/30 mb-6" />

                <p className="font-display text-2xl md:text-3xl lg:text-4xl text-ivory leading-tight tracking-tight balance">
                  "{current.quote}"
                </p>

                <div className="mt-10 flex items-center gap-5">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden border border-white/15">
                    <Image src={current.avatar} alt={current.name} fill className="object-cover" sizes="64px" />
                  </div>
                  <div>
                    <div className="font-display text-base text-ivory uppercase tracking-tight">
                      {current.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] tracking-[0.28em] text-platinum/70 uppercase">
                      {current.role}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    {Array.from({ length: current.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-platinum text-platinum" />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right — 3D rotating card carousel */}
          <div className="relative h-[480px] md:h-[560px] [perspective:1800px] flex items-center justify-center">
            <div
              className="relative h-64 w-56 md:h-72 md:w-64 transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d]"
              style={{
                transform: `translateZ(-${radius}px) rotateY(${-active * angleStep}deg)`,
              }}
            >
              {testimonials.map((tm, i) => {
                const distance = Math.min(Math.abs(i - active), total - Math.abs(i - active));
                return (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="absolute inset-0 rounded-2xl overflow-hidden glass-strong cursor-pointer [backface-visibility:hidden] text-start group"
                    style={{
                      transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                      opacity: distance > 2 ? 0 : 1 - distance * 0.25,
                      filter: distance === 0 ? 'none' : `blur(${distance}px) brightness(${1 - distance * 0.18})`,
                      transition: 'opacity 1s ease, filter 1s ease',
                    }}
                    data-cursor="hover"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />

                    <div className="relative h-full flex flex-col justify-between p-5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border border-white/15">
                          <Image src={tm.avatar} alt={tm.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                          <div className="text-xs font-display text-ivory uppercase tracking-tight leading-none">
                            {tm.name.split(' ')[0]}
                          </div>
                          <div className="text-[0.55rem] tracking-[0.25em] text-platinum/60 uppercase mt-1">
                            {tm.role.split('·')[0]?.trim()}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-platinum/85 leading-relaxed line-clamp-5 pretty">
                        "{tm.quote.substring(0, 110)}…"
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
