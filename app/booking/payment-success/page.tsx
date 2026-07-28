import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { query } from '@/lib/db';
import { currencyFmt } from '@/lib/booking-data';

export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;   // ← استخدم await
  const t = await getTranslations('booking.paymentResult');
  const tc = await getTranslations('booking');

  const rows = ref
    ? await query<any>(
        `SELECT reference, vehicle_label, total, payment_status
           FROM v_bookings_summary WHERE reference = $1 LIMIT 1`,
        [ref],
      )
    : [];
  const booking = rows[0];

  return (
    <section className="section flex min-h-[70vh] items-center justify-center px-6 py-28 text-center">
      <div className="max-w-lg">
        <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70">
          <CheckCircle2 className="h-10 w-10 text-obsidian" strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-3xl font-light uppercase tracking-tight text-ivory md:text-4xl">
          {t('successTitle')}
        </h1>
        <p className="mt-4 text-platinum/70">{t('successSubtitle')}</p>

        {booking && (
          <div className="mx-auto mt-10 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] px-8 py-7 text-start">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('refLabel')}</div>
              <div dir="ltr" className="mt-1.5 font-display text-xl tracking-[0.14em] text-ivory">
                {booking.reference}
              </div>
            </div>
            {booking.vehicle_label && (
              <div>
                <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('vehicleLabel')}</div>
                <div className="mt-1.5 text-ivory">{booking.vehicle_label}</div>
              </div>
            )}
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('totalLabel')}</div>
              <div dir="ltr" className="mt-1.5 font-display text-xl text-ivory tabular-nums">
                {currencyFmt(Number(booking.total))} <span className="text-sm text-platinum/70">{tc('currency')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/account"
            className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-ivory transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]"
          >
            {t('viewBookings')}
          </Link>
          <Link
            href="/booking"
            className="rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian"
            style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)' }}
          >
            {t('newBooking')}
          </Link>
        </div>
      </div>
    </section>
  );
}