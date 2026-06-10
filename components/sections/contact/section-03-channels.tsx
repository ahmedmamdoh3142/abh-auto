'use client';

/**
 * Contact · Channels — كروت تواصل أنيقة (Visit / WhatsApp / Message).
 * بيانات حقيقية لـ ABH Auto (جدة · التحلية) + صور مناسبة + ثنائي اللغة.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, MessageCircle, ArrowUpRight, Phone } from 'lucide-react';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';

const EASE = [0.16, 1, 0.3, 1] as const;

const WHATSAPP = '+966570888803';
const MAPS_URL = 'https://maps.app.goo.gl/XGn5z3oAdghRhqNB6';

type Loc = { en: string; ar: string };
interface Channel {
  tag: string;
  label: Loc;
  title: Loc;
  copy: Loc;
  value: string;
  valueLabel: Loc;
  href: string;
  external?: boolean;
  icon: React.ElementType;
  image: string;
}

const CHANNELS: Channel[] = [
  {
    tag: 'I',
    label: { en: 'Visit', ar: 'زيارة' },
    title: { en: 'The Center', ar: 'المركز' },
    copy: { en: 'Prince Mohammed bin Abdulaziz St — Al Tahlia, Jeddah.', ar: 'شارع الأمير محمد بن عبد العزيز — التحلية، جدة.' },
    value: 'Al Tahlia · Jeddah',
    valueLabel: { en: 'Open in Maps', ar: 'افتح على الخريطة' },
    href: MAPS_URL, external: true, icon: MapPin,
    image: '/images/abh.webp',
  },
  {
    tag: 'II',
    label: { en: 'WhatsApp', ar: 'واتساب' },
    title: { en: 'Talk to us', ar: 'كلّمنا' },
    copy: { en: 'Calls & WhatsApp — our team replies within minutes.', ar: 'مكالمات وواتساب — الفريق يرد خلال دقائق.' },
    value: '+966 57 088 8803',
    valueLabel: { en: 'Chat on WhatsApp', ar: 'دردشة واتساب' },
    href: `https://wa.me/${WHATSAPP.replace(/[^\d]/g, '')}`, external: true, icon: MessageCircle,
    image: '/images/watsapp.webp',
  },
  {
    tag: 'III',
    label: { en: 'Call', ar: 'اتصال' },
    title: { en: 'By phone', ar: 'بالهاتف' },
    copy: { en: 'Prefer voice? Reach us directly.', ar: 'بتفضّل المكالمة؟ كلّمنا مباشرة.' },
    value: '+966 57 088 8803',
    valueLabel: { en: 'Call now', ar: 'اتصل الآن' },
    href: `tel:${WHATSAPP.replace(/[^\d+]/g, '')}`, icon: Phone,
    image: '/images/call.webp',
  },
];

export function Channels() {
  const t = useTranslations('contact.channels');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const slateOp = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  let eyebrow = 'Reach us', title = 'Three ways in', subtitle = 'Choose the channel that suits you.';
  try { eyebrow = t('eyebrow'); title = t('title'); subtitle = t('subtitle'); } catch {}

  return (
    <section ref={ref} className="relative w-full overflow-hidden py-28 md:py-40" data-section="channels">
      <ChapterSlate number="02" label={eyebrow} opacity={slateOp} variant="dark" />
      <AtelierMark opacity={slateOp} variant="dark" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: EASE }} className="flex items-center justify-center gap-5">
            <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum/40 to-platinum/60" />
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.55em] text-platinum/85">{eyebrow}</span>
            <span className="block h-px w-12 bg-gradient-to-l from-transparent via-platinum/40 to-platinum/60" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }} className="mt-8 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] tracking-tight balance">
            <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">{title}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.3 }} className="mt-6 font-editorial text-base italic text-platinum/70">{subtitle}</motion.p>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-7">
          {CHANNELS.map((c, i) => <DoorCard key={i} item={c} index={i} isAr={isAr} />)}
        </div>
      </div>
    </section>
  );
}

function DoorCard({ item, index, isAr }: { item: Channel; index: number; isAr: boolean }) {
  const Icon = item.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 1, delay: index * 0.12, ease: EASE }}>
      <Link href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}
        data-cursor="hover" className="group relative block h-[560px] overflow-hidden rounded-3xl border border-white/[0.08]">
        <Image src={item.image} alt={item.title[isAr ? 'ar' : 'en']} fill sizes="(max-width: 768px) 100vw, 33vw"
          className="scale-[1.05] object-cover brightness-[0.78] grayscale-[0.35] transition-all duration-[1600ms] ease-out group-hover:scale-[1.12] group-hover:grayscale-0 group-hover:brightness-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/55" />

        {/* roman numeral */}
        <div className="absolute end-7 top-7 z-10 flex items-center gap-3" dir="ltr">
          <span className="block h-px w-6 bg-ivory/30 transition-all duration-700 group-hover:w-12 group-hover:bg-ivory/70" />
          <span className="font-display text-3xl leading-none text-ivory/55 transition-colors duration-700 group-hover:text-ivory">{item.tag}</span>
        </div>

        {/* label chip */}
        <div className="absolute start-7 top-7 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-obsidian/40 px-3 py-1.5 backdrop-blur-md">
          <Icon className="h-3 w-3 text-ivory" strokeWidth={1.8} />
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.4em] text-ivory/85">{item.label[isAr ? 'ar' : 'en']}</span>
        </div>

        {/* middle */}
        <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-7 text-center md:px-8">
          <h3 className="font-display text-3xl uppercase leading-[1] tracking-tight text-ivory md:text-[2.4rem]">{item.title[isAr ? 'ar' : 'en']}</h3>
          <p className="mx-auto mt-5 max-w-[22ch] text-sm leading-relaxed text-platinum/80 pretty">{item.copy[isAr ? 'ar' : 'en']}</p>
        </div>

        {/* bottom value */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-7 md:p-8">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="block h-px flex-1 bg-gradient-to-r from-transparent to-ivory/30 transition-colors duration-700 group-hover:to-ivory/60" />
            <span className="relative grid h-1.5 w-1.5 rotate-45 place-items-center bg-gradient-to-br from-ivory to-platinum opacity-50 transition-opacity duration-700 group-hover:opacity-100" />
            <span className="block h-px flex-1 bg-gradient-to-l from-transparent to-ivory/30 transition-colors duration-700 group-hover:to-ivory/60" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-[0.18em] text-ivory" dir="ltr">{item.value}</span>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.32em] text-ivory/55">{item.valueLabel[isAr ? 'ar' : 'en']}</span>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.2] bg-obsidian/40 backdrop-blur-md transition-all duration-700 group-hover:border-ivory group-hover:bg-ivory group-hover:text-obsidian">
              <ArrowUpRight className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.8} />
            </span>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ boxShadow: 'inset 0 0 90px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.1)' }} />
      </Link>
    </motion.div>
  );
}