'use client';

/**
 * Contact · Location — العنوان + خريطة حقيقية + مواعيد العمل.
 * بيانات ABH Auto: جدة · التحلية · شارع الأمير محمد بن عبد العزيز.
 * المواعيد: السبت–الخميس 10ص–9م، الجمعة إجازة.
 */
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocale } from 'next-intl';
import { MapPin, Phone, MessageCircle, ArrowUpRight, Clock } from 'lucide-react';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';

const EASE = [0.16, 1, 0.3, 1] as const;

const LAT = 21.5433;
const LNG = 39.1728;
const PHONE = '+966 57 088 8803';
const PHONE_RAW = '+966570888803';
const MAPS_SHORT = 'https://maps.app.goo.gl/XGn5z3oAdghRhqNB6';
const MAPS_EMBED = `https://www.google.com/maps?q=${LAT},${LNG}&hl=ar&z=16&output=embed`;

const ADDRESS = {
  en: ['ABH Auto — Center', 'Prince Mohammed bin Abdulaziz St (Al Tahlia)', 'Jeddah, Saudi Arabia'],
  ar: ['ABH Auto — المركز', 'شارع الأمير محمد بن عبد العزيز (التحلية)', 'جدة، المملكة العربية السعودية'],
};
const HOURS = {
  en: [{ d: 'Saturday – Thursday', h: '10:00 AM – 9:00 PM', open: true }, { d: 'Friday', h: 'Closed', open: false }],
  ar: [{ d: 'السبت – الخميس', h: '١٠ ص – ٩ م', open: true }, { d: 'الجمعة', h: 'إجازة', open: false }],
};
const T = {
  eyebrow: { en: 'Find us', ar: 'مكاننا' },
  titleA: { en: 'Jeddah', ar: 'جدة' },
  titleB: { en: 'Al Tahlia', ar: 'التحلية' },
  subtitle: { en: 'The center sits on Prince Mohammed bin Abdulaziz Street.', ar: 'المركز في شارع الأمير محمد بن عبد العزيز.' },
  hoursTitle: { en: 'Opening hours', ar: 'مواعيد العمل' },
  directions: { en: 'Open in Maps', ar: 'افتح على الخريطة' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  call: { en: 'Call', ar: 'اتصال' },
};

export function Location() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const L = (o: { en: string; ar: string }) => o[isAr ? 'ar' : 'en'];
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const slateOp = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative w-full overflow-hidden py-28 md:py-40" data-section="location">
      <ChapterSlate number="03" label={L(T.eyebrow)} opacity={slateOp} variant="dark" />
      <AtelierMark opacity={slateOp} variant="dark" />

      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* LEFT */}
          <div className="flex flex-col">
            <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, ease: EASE }} className="flex items-center gap-4">
              <span className="block h-px w-12 bg-platinum/40" />
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.45em] text-platinum/70">{L(T.eyebrow)}</span>
            </motion.div>

            <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.15 }} className="mt-10 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-tight">
              <motion.span initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.25, ease: EASE }} className="block bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">{L(T.titleA)}</motion.span>
              <motion.span initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.45, ease: EASE }} className="block font-editorial italic text-platinum/85">{L(T.titleB)}</motion.span>
            </motion.h2>

            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.6 }} className="mt-8 max-w-md font-editorial text-base italic leading-relaxed text-platinum/70">{L(T.subtitle)}</motion.p>

            {/* address */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.7 }} className="mt-10 flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full border border-white/[0.1] text-platinum/70"><MapPin className="h-3.5 w-3.5" strokeWidth={1.7} /></span>
              <div className="flex flex-col gap-1">
                {ADDRESS[isAr ? 'ar' : 'en'].map((line, i) => (
                  <span key={i} className={`text-sm leading-relaxed ${i === 0 ? 'font-medium text-ivory' : 'text-platinum/75'}`}>{line}</span>
                ))}
              </div>
            </motion.div>

            {/* hours card */}
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.8 }} className="mt-7 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02]">
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-3.5">
                <Clock className="h-3.5 w-3.5 text-platinum/70" strokeWidth={1.7} />
                <span className="text-[0.55rem] font-medium uppercase tracking-[0.4em] text-platinum/75">{L(T.hoursTitle)}</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {HOURS[isAr ? 'ar' : 'en'].map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <span className="text-sm text-ivory/85">{row.d}</span>
                    <span className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.1em] ${row.open ? 'text-ivory' : 'text-[#c98a8a]'}`} dir="ltr">
                      <span className={`h-1.5 w-1.5 rounded-full ${row.open ? 'bg-emerald-400/80' : 'bg-[#c98a8a]'}`} />{row.h}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* phone + whatsapp */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.9 }} className="mt-7 flex flex-col gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]">
              <LinkRow href={`https://wa.me/${PHONE_RAW.replace(/[^\d]/g, '')}`} label={L(T.whatsapp)} value={PHONE} icon={<MessageCircle className="reversible-icon h-3.5 w-3.5" strokeWidth={1.6} />} external />
              <LinkRow href={`tel:${PHONE_RAW}`} label={L(T.call)} value={PHONE} icon={<Phone className="reversible-icon h-3.5 w-3.5" strokeWidth={1.6} />} />
            </motion.div>
          </div>

          {/* RIGHT — real map */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1.2, ease: EASE }} className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/[0.08] lg:aspect-auto lg:min-h-[640px]">
            <iframe src={MAPS_EMBED} title="ABH Auto — Jeddah" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full" style={{ filter: 'invert(0.92) hue-rotate(180deg) brightness(0.85) contrast(0.95)', border: 0 }} />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-obsidian/50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-obsidian/50 to-transparent" />
            <span className="pointer-events-none absolute start-5 top-5 z-20 h-4 w-4 border-s border-t border-ivory/50" />
            <span className="pointer-events-none absolute end-5 top-5 z-20 h-4 w-4 border-e border-t border-ivory/50" />
            <span className="pointer-events-none absolute start-5 bottom-5 z-20 h-4 w-4 border-s border-b border-ivory/50" />
            <span className="pointer-events-none absolute end-5 bottom-5 z-20 h-4 w-4 border-e border-b border-ivory/50" />

            <div className="pointer-events-none absolute start-8 top-8 z-20 inline-flex items-center gap-2 rounded-full border border-white/[0.2] bg-obsidian/65 px-3 py-1.5 backdrop-blur-md" dir="ltr">
              <MapPin className="h-3 w-3 text-ivory" strokeWidth={1.8} />
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-ivory/85">ABH AUTO · JEDDAH</span>
            </div>

            <Link href={MAPS_SHORT} target="_blank" rel="noopener noreferrer" data-cursor="hover"
              className="group absolute bottom-8 end-8 z-20 inline-flex items-center gap-3 rounded-full border border-white/[0.2] bg-obsidian/75 px-5 py-3 backdrop-blur-md transition-all duration-500 hover:border-ivory/50 hover:bg-obsidian/90">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-ivory">{L(T.directions)}</span>
              <ArrowUpRight className="reversible-icon h-3.5 w-3.5 text-ivory transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function LinkRow({ href, label, value, icon, external }: { href: string; label: string; value: string; icon: React.ReactNode; external?: boolean }) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} data-cursor="hover"
      className="group flex items-center justify-between gap-4 bg-obsidian/30 px-5 py-4 transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.1] text-platinum/70 transition-all duration-500 group-hover:border-platinum/50 group-hover:text-ivory">{icon}</span>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-platinum/55">{label}</span>
          <span className="font-mono text-xs tracking-[0.12em] text-ivory" dir="ltr">{value}</span>
        </div>
      </div>
      <ArrowUpRight className="reversible-icon h-3.5 w-3.5 text-platinum/40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ivory" strokeWidth={2} />
    </Link>
  );
}