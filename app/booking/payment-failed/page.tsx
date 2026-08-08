import Link from 'next/link';
import { X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const t = await getTranslations('booking.paymentResult');

  const rows = ref
    ? await query<any>(`SELECT reference FROM v_bookings_summary WHERE reference = $1 LIMIT 1`, [ref])
    : [];
  const booking = rows[0];

  return (
    <section className="section relative flex min-h-[78vh] items-center justify-center overflow-hidden px-6 py-28 text-center">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c1a1a]/[0.08] blur-[120px]" />

      <div className="max-w-lg">
        <div className="pr-pop mx-auto mb-10 grid h-24 w-24 place-items-center rounded-full border border-[#7c1a1a]/40 bg-[#7c1a1a]/[0.08]">
          <X className="h-9 w-9 text-[#e7b4b4]" strokeWidth={1.8} />
        </div>

        <h1 className="font-display text-3xl font-light uppercase tracking-tight text-ivory md:text-4xl">
          {t('failedTitle')}
        </h1>
        <p className="mx-auto mt-4 max-w-[42ch] text-platinum/70">{t('failedSubtitle')}</p>

        {booking && (
          <div className="mx-auto mt-10 inline-flex flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('refLabel')}</div>
            <div dir="ltr" className="font-display text-lg tracking-[0.14em] text-ivory">{booking.reference}</div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="https://wa.me/966570888803"
            className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
            {t('contactSupport')}
          </Link>
          <Link href="/booking"
            className="rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-300 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: '0 18px 60px -15px rgba(203,205,205,0.6)' }}>
            {t('tryAgain')}
          </Link>
        </div>
      </div>

      <style>{`
        .pr-pop{animation:prPop .5s cubic-bezier(.16,1,.3,1) .1s both}
        @keyframes prPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        @media (prefers-reduced-motion: reduce){.pr-pop{animation:none}}
      `}</style>
    </section>
  );
}