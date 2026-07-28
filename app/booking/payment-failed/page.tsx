import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;  // ← تحويل إلى Promise
}) {
  const { ref } = await searchParams;        // ← استخراج القيم باستخدام await
  const t = await getTranslations('booking.paymentResult');

  const rows = ref
    ? await query<any>(`SELECT reference FROM v_bookings_summary WHERE reference = $1 LIMIT 1`, [ref])
    : [];
  const booking = rows[0];

  return (
    <section className="section flex min-h-[70vh] items-center justify-center px-6 py-28 text-center">
      <div className="max-w-lg">
        <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full border border-[#7c1a1a]/40 bg-[#7c1a1a]/[0.08]">
          <XCircle className="h-10 w-10 text-[#e7b4b4]" strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-3xl font-light uppercase tracking-tight text-ivory md:text-4xl">
          {t('failedTitle')}
        </h1>
        <p className="mt-4 text-platinum/70">{t('failedSubtitle')}</p>

        {booking ? (
          <div className="mx-auto mt-8 inline-flex flex-col gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('refLabel')}</div>
            <div dir="ltr" className="font-display text-lg tracking-[0.14em] text-ivory">{booking.reference}</div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://wa.me/966570888803"
            className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-ivory transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]"
          >
            {t('contactSupport')}
          </Link>
          <Link
            href="/booking"
            className="rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian"
            style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)' }}
          >
            {t('tryAgain')}
          </Link>
        </div>
      </div>
    </section>
  );
}