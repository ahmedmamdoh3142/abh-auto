import Link from 'next/link';
import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { query } from '@/lib/db';
import { currencyFmt } from '@/lib/booking-data';

export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const t = await getTranslations('booking.paymentResult');
  const tc = await getTranslations('booking');

  const rows = ref
    ? await query<any>(
        `SELECT reference, vehicle_label, total FROM v_bookings_summary WHERE reference = $1 LIMIT 1`,
        [ref],
      )
    : [];
  const booking = rows[0];

  return (
    <section className="section relative flex min-h-[78vh] items-center justify-center overflow-hidden px-6 py-28 text-center">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.07] blur-[120px]" />

      <div className="max-w-lg">
        <div className="relative mx-auto mb-10 h-24 w-24">
          <span aria-hidden className="pr-ring absolute inset-0 rounded-full opacity-70"
            style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.6), transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(6px)' }} />
          <span aria-hidden className="absolute inset-2 rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70" />
          <span className="absolute inset-[8px] grid place-items-center rounded-full bg-gradient-to-br from-obsidian via-obsidian to-[#0b0c0d]">
            <Check className="h-8 w-8 text-ivory pr-pop" strokeWidth={1.8} />
          </span>
        </div>

        <h1 className="font-display text-3xl font-light uppercase tracking-tight text-ivory md:text-4xl">
          {t('successTitle')}
        </h1>
        <p className="mx-auto mt-4 max-w-[42ch] text-platinum/70">{t('successSubtitle')}</p>

        {booking && (
          <div className="mx-auto mt-10 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] px-8 py-7 text-start backdrop-blur-sm">
            <Row label={t('refLabel')} value={booking.reference} mono />
            {booking.vehicle_label && <Row label={t('vehicleLabel')} value={booking.vehicle_label} />}
            <Row
              label={t('totalLabel')}
              value={`${currencyFmt(Number(booking.total))} ${tc('currency')}`}
              mono
              big
            />
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/account"
            className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
            {t('viewBookings')}
          </Link>
          <Link href="/booking"
            className="rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-300 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: '0 18px 60px -15px rgba(203,205,205,0.6)' }}>
            {t('newBooking')}
          </Link>
        </div>
      </div>

      <style>{`
        .pr-ring{animation:prSpin 22s linear infinite}
        .pr-pop{animation:prPop .5s cubic-bezier(.16,1,.3,1) .2s both}
        @keyframes prSpin{to{transform:rotate(360deg)}}
        @keyframes prPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        @media (prefers-reduced-motion: reduce){.pr-ring{animation:none}.pr-pop{animation:none}}
      `}</style>
    </section>
  );
}

function Row({ label, value, mono, big }: { label: string; value: string; mono?: boolean; big?: boolean }) {
  return (
    <div>
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{label}</div>
      <div dir={mono ? 'ltr' : undefined}
        className={`mt-1.5 text-ivory ${mono ? 'font-display tracking-[0.1em] tabular-nums' : ''} ${big ? 'text-xl' : 'text-base'}`}>
        {value}
      </div>
    </div>
  );
}