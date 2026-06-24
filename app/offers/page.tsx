'use client';

/**
 * OffersPage — صفحة العروض /offers (سلفر + أداء + تصميم باقات احترافي)
 * Path: app/[locale]/offers/page.tsx  (أو app/offers/page.tsx)
 *
 * تحديثات:
 *  • مسافات أقل بين الأقسام (إيقاع رأسي مضغوط).
 *  • سكشن الباقات أُعيد تصميمه: خطوتان واضحتان (١ اختر خدمة أساسية مطلوبة →
 *    ٢ استلم هديتك) + جريد كروت هدايا صغيرة احترافية (٣–٤ بالصف على اللاب).
 *  • أداء: العجلة/الإحالة بـ next/dynamic، صورة الهيرو priority، لا أنيميشن لانهائي ثقيل.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Sparkles, Gift, Crown, ArrowUpRight, Check, Phone, Plus, Lock } from 'lucide-react';

import { currencyFmt } from '@/lib/booking-data';
import { BookingPromoTicket } from '@/components/sections/booking/promo-ticket';

const EASE = [0.16, 1, 0.3, 1] as const;
const HERO = '/images/cta-bg.webp';
const CTA_BG = '/images/cta-service.webp';

const LuckyWheel = dynamic(
  () => import('@/components/sections/wheel/lucky-wheel').then((m) => m.LuckyWheel),
  { ssr: false, loading: () => <WheelSkeleton /> },
);
const ReferralPanel = dynamic(
  () => import('@/components/sections/offers/referral-panel').then((m) => m.ReferralPanel),
  { ssr: false, loading: () => null },
);

interface Svc { id: number; name: any; image: string | null; price: number; charge?: number }
interface OBundle {
  id: string; title: { ar?: string; en?: string } | null;
  giftMode: 'free' | 'percent'; giftPercent: number; minTriggerCount: number; maxGifts: number;
  triggers: Svc[]; gifts: Svc[];
}

export default function OffersPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const nm = (s: Svc) => (isAr ? s.name?.ar : s.name?.en) || s.name?.ar || s.name?.en || '';

  const [bundles, setBundles] = useState<OBundle[]>([]);
  const [bundlesLoaded, setBundlesLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/offers').then((r) => r.json());
        if (alive && j?.ok) setBundles(j.bundles ?? []);
      } catch { /* */ } finally { if (alive) setBundlesLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="relative">
      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pt-44">
        <div aria-hidden className="absolute inset-0 -z-20">
          <Image src={HERO} alt="" fill priority sizes="100vw" quality={45}
            className="object-cover opacity-[0.14]" style={{ filter: 'grayscale(0.7) brightness(0.5) contrast(1.1)' }} />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/65 via-obsidian/35 to-obsidian" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-platinum/[0.06] blur-[120px]" />
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
            className="mb-6 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
            {T('نادي ABH للمكافآت', 'ABH Rewards')}
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
          </motion.div>
          <h1 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] font-light uppercase leading-[0.95] tracking-tight">
            <span className="block overflow-hidden">
              <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1, ease: EASE }} className="inline-block text-metallic">
                {T('عناية تستحقها سيارتك', 'Rewards worthy of your car')}
              </motion.span>
            </span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="mx-auto mt-5 max-w-[50ch] text-base leading-[1.9] text-platinum/70 md:text-lg">
            {T('عجلة حظ أسبوعية، هدية مع كل باقة، وكوبونات خاصة — كلها في مكان واحد، ومصمَّمة تكافئ ولاءك وتدلّل سيارتك.',
               'A weekly lucky wheel, a gift with every package, and private coupons — all in one place, crafted to reward your loyalty.')}
          </motion.p>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
            className="mx-auto mt-8 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent" />
        </div>
      </section>

      {/* ── عجلة الحظ ── */}
      <section className="relative pb-12 pt-6 md:pb-16">
        <div className="container"><LuckyWheel /></div>
      </section>

      {/* ── الباقات (خطوتان + جريد هدايا) ── */}
      {bundlesLoaded && bundles.length > 0 && (
        <section className="relative py-12 md:py-16">
          <div className="container">
            <SectionHead icon={Gift}
              eyebrow={T('خدمة + هدية', 'Service + Gift')}
              title={T('اختر باقتك، وخد هديتك', 'Pick a package, claim a gift')} />
            <div className="mx-auto mt-9 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {bundles.map((b, i) => <BundleBlock key={b.id} b={b} i={i} isAr={isAr} T={T} nm={nm} />)}
            </div>
          </div>
        </section>
      )}
      {!bundlesLoaded && (
        <section className="relative py-12 md:py-16"><div className="container mx-auto max-w-5xl"><BundleSkeleton /></div></section>
      )}

      {/* ── الكود التلقائي ── */}
      <section className="relative py-12 md:py-16">
        <div className="container max-w-3xl">
          <SectionHead icon={Sparkles}
            eyebrow={T('كوبون اللحظة', 'Today’s coupon')}
            title={T('كود خصم جاهز ليك', 'A code ready for you')} />
          <div className="mt-8"><BookingPromoTicket /></div>
          <p className="mt-4 text-center text-[0.72rem] text-steel">
            {T('انسخ الكود واستخدمه في خطوة الدفع عند الحجز.', 'Copy the code and use it at checkout.')}
          </p>
        </div>
      </section>

      {/* ── الإحالة ── */}
      <section className="relative py-12 md:py-16">
        <div className="container"><ReferralPanel /></div>
      </section>

      {/* ── CTA سينمائي ── */}
      <OffersCta T={T} />
    </main>
  );
}

/* ════════════ عنوان قسم ════════════ */
function SectionHead({ icon: Icon, eyebrow, title }: { icon: React.ElementType; eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 text-[0.58rem] uppercase tracking-[0.34em] text-platinum/70">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />
        <Icon className="h-3.5 w-3.5 text-platinum" strokeWidth={1.8} />{eyebrow}
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-platinum/60" />
      </div>
      <h2 className="mt-4 font-display text-[clamp(1.9rem,4.5vw,3rem)] font-light uppercase leading-none tracking-tight text-ivory">{title}</h2>
    </div>
  );
}

/* ════════════ بلوك الباقة: خطوة ١ (أساسي مطلوب) → خطوة ٢ (الهدايا جريد) ════════════ */
function BundleBlock({ b, i, isAr, T, nm }: {
  b: OBundle; i: number; isAr: boolean; T: (a: string, e: string) => string; nm: (s: Svc) => string;
}) {
  const title = (isAr ? b.title?.ar : b.title?.en) || T('خدها وخد هدية', 'Buy & get a gift');
  const isFree = b.giftMode === 'free';
  const pickN = b.minTriggerCount > 1
    ? T(`اختر ${b.minTriggerCount} خدمات`, `Choose ${b.minTriggerCount} services`)
    : T('اختر خدمة واحدة', 'Choose one service');

  return (
    <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
      className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.1] bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-transparent p-6 md:p-8">
      <span aria-hidden className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-platinum/55 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-platinum/[0.05] blur-3xl" />

      {/* رأس */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-platinum/35 bg-platinum/[0.08] text-platinum">
            <Gift className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <div>
            <h3 className="font-display text-2xl uppercase leading-none text-ivory">{title}</h3>
            <p className="mt-1.5 text-[0.72rem] text-platinum/60">
              {T('اشترِ خدمة مؤهِّلة، والهدية عليناً.', 'Buy a qualifying service — the gift is on us.')}
            </p>
          </div>
        </div>
        <span className="flex-none rounded-full border border-platinum/35 bg-platinum/[0.08] px-4 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-platinum">
          {isFree ? T('هدية مجانية', 'Free gift') : T(`خصم ${b.giftPercent}%`, `${b.giftPercent}% off`)}
        </span>
      </div>

      {/* خطوة ١ — خدمة أساسية مطلوبة */}
      <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.015] p-4 md:p-5">
        <StepLabel n="1" text={T('اختر خدمتك الأساسية', 'Pick your base service')}
          hint={T('مطلوبة لتفعيل الهدية', 'Required to unlock the gift')} req />
        <div className="mt-3.5 flex flex-wrap gap-2">
          {b.triggers.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-2 rounded-xl border border-platinum/25 bg-platinum/[0.05] px-3 py-2 text-[0.78rem] text-ivory/90">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-platinum/20 text-platinum"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
              {nm(s)}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[0.66rem] text-platinum/45">{pickN}</p>
      </div>

      {/* رابط بصري بين الخطوتين */}
      <div className="my-5 flex items-center justify-center gap-3 text-platinum/40">
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-platinum/30" />
        <span className="grid h-8 w-8 place-items-center rounded-full border border-platinum/30 bg-white/[0.03]">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-platinum/30" />
      </div>

      {/* خطوة ٢ — الهدايا (جريد) */}
      <div>
        <StepLabel n="2" text={T('استلم هديتك', 'Get your gift')}
          hint={isFree ? T('مجانًا بالكامل', 'Completely free') : T(`بخصم ${b.giftPercent}%`, `${b.giftPercent}% off`)} />
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          {b.gifts.map((g) => <GiftCard key={g.id} g={g} T={T} nm={nm} />)}
        </div>
        {b.maxGifts > 0 && b.gifts.length > 1 && (
          <p className="mt-3 text-[0.66rem] text-platinum/45">
            {T(`تقدر تختار حتى ${b.maxGifts} ${b.maxGifts > 1 ? 'هدايا' : 'هدية'}.`, `Pick up to ${b.maxGifts} gift${b.maxGifts > 1 ? 's' : ''}.`)}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto pt-7">
        <Link href="/booking" data-cursor="hover"
          className="group/btn flex items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-obsidian transition-transform duration-500 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#fff,#cbcdcd)', boxShadow: '0 18px 50px -18px rgba(203,205,205,0.55)' }}>
          {T('احجز واحصل على هديتك', 'Book & claim your gift')}
          <ArrowUpRight className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={2.2} />
        </Link>
      </div>
    </motion.div>
  );
}

function StepLabel({ n, text, hint, req }: { n: string; text: string; hint?: string; req?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-platinum/45 bg-platinum/[0.1] font-display text-[0.7rem] text-platinum">{n}</span>
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-ivory/90">{text}</span>
      {req && <span className="rounded-full border border-platinum/30 bg-platinum/[0.06] px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.14em] text-platinum/80">{'مطلوب'}</span>}
      {hint && <span className="text-[0.62rem] text-platinum/50">· {hint}</span>}
    </div>
  );
}

/* كرت هدية صغير احترافي */
function GiftCard({ g, T, nm }: { g: Svc; T: (a: string, e: string) => string; nm: (s: Svc) => string }) {
  const free = (g.charge ?? 0) === 0;
  const off = g.price > 0 ? Math.round((1 - (g.charge ?? 0) / g.price) * 100) : 0;
  return (
    <div className="group/g relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all duration-400 hover:-translate-y-1 hover:border-platinum/35 hover:bg-white/[0.03]">
      <div className="relative h-24 overflow-hidden md:h-28">
        {g.image
          ? <span className="absolute inset-0 bg-cover bg-center grayscale-[0.15] transition-transform duration-700 group-hover/g:scale-110" style={{ backgroundImage: `url('${g.image}')` }} />
          : <span className="absolute inset-0 grid place-items-center bg-white/[0.04] text-platinum/40"><Gift className="h-6 w-6" /></span>}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0b0c] via-[#0a0b0c]/30 to-transparent" />
        <span className="absolute end-2 top-2 rounded-full border border-platinum/40 bg-obsidian/70 px-2 py-0.5 text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-platinum backdrop-blur-sm">
          {free ? T('مجانًا', 'Free') : `−${off}%`}
        </span>
      </div>
      <div className="p-3">
        <div className="truncate text-[0.82rem] text-ivory/90">{nm(g)}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          {g.price > 0 && <span dir="ltr" className="text-[0.66rem] tabular-nums text-steel line-through decoration-platinum/40">{currencyFmt(g.price)}</span>}
          <span dir="ltr" className="font-display text-[0.92rem] tabular-nums text-ivory">{free ? T('مجانًا', 'Free') : currencyFmt(g.charge ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════ CTA سينمائي ════════════ */
function OffersCta({ T }: { T: (a: string, e: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.06, 1, 1.06]);

  return (
    <section ref={ref} className="relative isolate mt-4 flex min-h-[62svh] items-center overflow-hidden">
      <motion.div className="absolute inset-0 -z-30" style={{ y: bgY, scale: bgScale }}>
        <Image src={CTA_BG} alt="" fill sizes="100vw" quality={50} className="object-cover object-center" style={{ filter: 'grayscale(0.4) brightness(0.5)' }} />
      </motion.div>
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_85%)]" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-obsidian/70 via-obsidian/45 to-obsidian/95" />
      <div className="grid-lines absolute inset-0 -z-10 opacity-25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.05] blur-[130px]" />

      <div className="container relative z-10 py-16 text-center md:py-20">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: EASE }}
          className="flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.45em] text-platinum/70">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-platinum/60" />
          <Crown className="h-3.5 w-3.5 text-platinum" strokeWidth={1.7} />{T('عضوية بمستويات', 'Tiered membership')}
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        <h2 className="mx-auto mt-7 max-w-4xl font-display text-[clamp(2rem,5vw,3.6rem)] font-light uppercase leading-[0.95] tracking-tight text-ivory">
          {T('كل ما تحجز أكتر،', 'The more you book,')}<br />
          <span className="text-metallic">{T('تكسب أكتر', 'the more you earn')}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[52ch] text-platinum/65">
          {T('كل مستوى عضوية يفتحلك خصمًا دائمًا ومزايا حصرية. شوف مستواك ومكافآتك وكوبوناتك في مكان واحد.',
             'Each membership tier unlocks a standing discount and exclusive perks. See your tier, rewards, and coupons in one place.')}
        </p>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <ChromeButton href="/account">{T('شوف عضويتي', 'View my membership')}</ChromeButton>
          <GlassButton href="/booking"><Phone className="h-3.5 w-3.5" strokeWidth={1.6} />{T('احجز الآن', 'Book now')}</GlassButton>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-b from-transparent to-obsidian" />
    </section>
  );
}

function ChromeButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      <span aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-r from-platinum/50 via-ivory/40 to-platinum/50 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
      <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/80 via-platinum/40 to-ivory/50" />
      <span className="relative inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-10 py-5 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_22px_70px_-15px_rgba(203,205,205,0.65)] transition-all duration-500 group-hover:-translate-y-0.5">
        {children}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function GlassButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-9 py-5 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
      {children}
      <ArrowUpRight className="reversible-icon h-4 w-4 text-platinum transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ivory" strokeWidth={1.8} />
    </Link>
  );
}

/* ════════════ سكيلِتون ════════════ */
function WheelSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10">
      <div className="h-4 w-40 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="relative aspect-square w-[min(80vw,360px)] animate-pulse rounded-full border border-white/[0.06] bg-white/[0.02]">
        <div className="absolute inset-8 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-[42%] rounded-full bg-white/[0.05]" />
      </div>
      <div className="h-11 w-40 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}
function BundleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mx-auto h-7 w-64 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-8">
        <div className="h-6 w-48 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />)}
        </div>
      </div>
    </div>
  );
}