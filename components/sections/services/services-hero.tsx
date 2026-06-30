'use client';

/**
 * ServicesHero — immersive hero.
 *
 * إصلاح جذري للأداء على الموبايل (NO_LCP + FCP 3.7s):
 *  المشكلة الأساسية كانت إن كل محتوى الهيرو (العنوان/النص) كان متحرّك بـframer،
 *  وframer بيكتب الحالة الابتدائية (opacity:0 / translateY) في الـSSR HTML — يعني
 *  النص بيتولد "مخفي" في الـHTML، وما بيظهرش غير لما الـJS الضخم يـhydrate ويشغّل
 *  framer. على الموبايل ده بياخد ثوانٍ → الـLCP ما بيتسجّلش أصلًا (NO_LCP).
 *
 *  الحل: شِلنا framer من الهيرو خالص وحوّلنا كل الحركة لـCSS keyframes. دلوقتي
 *  النص بيتولد ظاهر في الـHTML وبيتحرّك على الـcompositor فور أول رسم — بدون أي
 *  انتظار للـJS. فالـFCP/LCP بقوا يعتمدوا على HTML+CSS بس (سريع جدًا).
 */
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

const BOOKING_IMAGE = '/images/hero-bg.webp';

export function ServicesHero() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
  }));

  return (
    <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44">
      <style>{`
        /* دخول العناصر — CSS بدل framer (يبدأ فور أول رسم، بدون انتظار JS) */
        .shero-rise{opacity:0;transform:translateY(16px);animation:sheroRise .7s cubic-bezier(.16,1,.3,1) forwards;}
        @keyframes sheroRise{to{opacity:1;transform:none}}

        /* العنوان: clip-reveal لكن النص موجود وظاهر في الـHTML من الأول */
        .shero-line{display:inline-block;transform:translateY(110%);animation:sheroLine .85s cubic-bezier(.16,1,.3,1) forwards;}
        @keyframes sheroLine{to{transform:translateY(0)}}

        .shero-base{transform:scaleX(0);transform-origin:center;animation:sheroBase 1.2s cubic-bezier(.16,1,.3,1) .45s forwards;}
        @keyframes sheroBase{to{transform:scaleX(1)}}

        .shero-d1{animation-delay:.06s}
        .shero-d2{animation-delay:.16s}
        .shero-d3{animation-delay:.28s}
        .shero-d4{animation-delay:.9s}

        /* جزيئات + مؤشر التمرير */
        .shero-particle{animation-name:sheroFloat;animation-timing-function:ease-out;animation-iteration-count:infinite;}
        @keyframes sheroFloat{0%{opacity:0;transform:translateY(10px)}50%{opacity:.8}100%{opacity:0;transform:translateY(-100px)}}
        .shero-scroll{animation:sheroScroll 2s ease-in-out infinite;}
        @keyframes sheroScroll{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}

        @media (prefers-reduced-motion: reduce){
          .shero-rise,.shero-line,.shero-base{animation:none;opacity:1;transform:none}
          .shero-particle{animation:none;opacity:.4}
          .shero-scroll{animation:none}
        }
      `}</style>

      {/* اللوحة السينمائية الخلفية — عنصر LCP محتمل: priority */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={BOOKING_IMAGE}
          alt=""
          fill
          priority
          quality={40}
          sizes="100vw"
          className="object-cover opacity-[0.18]"
          style={{ filter: 'grayscale(0.5) brightness(0.5) contrast(1.1)' }}
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian"
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="shero-particle absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="container">
        {/* Eyebrow with badge */}
        <div className="shero-rise mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          <span className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-platinum/80" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-platinum/80">
              {isAr ? 'المركز · جدّة' : 'The Center · Jeddah'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </div>

        {/* Main heading — النص موجود وظاهر في الـHTML */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <span className="shero-line shero-d1 bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
              {isAr ? 'خدمات احترافية' : 'Premium Services'}
            </span>
          </span>
          <span className="mt-1 block overflow-hidden md:mt-2">
            <span className="shero-line shero-d2 font-editorial italic text-platinum/85">
              {isAr ? 'تعكس فخامة سيارتك.' : 'That Reflect Your Vehicle’s Prestige.'}
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="shero-rise shero-d3 pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg">
          {isAr
            ? 'استكشف حلول العناية والتجهيز المصممة للحفاظ على المظهر المثالي والأداء الاستثنائي.'
            : 'Explore advanced detailing and care solutions designed to maintain a flawless look and exceptional presence.'}
        </p>

        {/* Drawn baseline */}
        <div className="shero-base mx-auto mt-10 h-px w-[min(420px,70%)] bg-gradient-to-r from-transparent via-platinum/40 to-transparent" />

        {/* Scroll indicator */}
        <div className="shero-rise shero-d4 mt-16 flex flex-col items-center gap-3">
          <span className="shero-scroll block h-12 w-px bg-gradient-to-b from-transparent via-platinum/50 to-transparent" />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.5em] text-platinum/40">
            {isAr ? 'استكشف' : 'Explore'}
          </span>
        </div>
      </div>
    </section>
  );
}