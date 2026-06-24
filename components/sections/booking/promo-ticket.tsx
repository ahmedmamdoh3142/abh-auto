'use client';

/**
 * BookingPromoTicket — تذكرة الكود التلقائي العام داخل صفحة الحجز.
 * Path: components/sections/booking/promo-ticket.tsx
 *
 * تظهر كتذكرة فاخرة قابلة للنسخ: نسبة/قيمة الخصم + الكود + زر نسخ.
 * مصدرها /api/promo/auto. لو مفيش كود نشط → ما تظهرش.
 *
 * الاستخدام المقترَح: أعلى خطوة الخدمات (StepServices) — العميل يشوف العرض وهو
 * بيبني طلبه، وبيطبّقه في خطوة الدفع. ممرّر onApply اختياري لو حابب تعبّي الكود
 * تلقائيًا في حقل البرومو.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Tag, Copy, Check, Sparkles, Ticket } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;
const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

type AutoPromo = {
  code: string;
  kind: 'percentage' | 'fixed';
  discountPercent: number;
  fixedAmount: number;
  minOrder: number;
  label: string | null;
  expiresAt: string | null;
};

export function BookingPromoTicket({ onApply }: { onApply?: (code: string) => void }) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = T('ريال', 'SAR');

  const [promo, setPromo] = useState<AutoPromo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/promo/auto?surface=booking').then((r) => r.json());
        if (alive && j?.ok && j.promo) setPromo(j.promo);
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
  }, []);

  if (!promo) return null;

  const value = promo.kind === 'fixed' ? `${fmt(promo.fixedAmount)} ${ccy}` : `${promo.discountPercent}%`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onApply?.(promo.code);
    } catch { /* تجاهل */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="relative mb-8 overflow-hidden rounded-[20px] border border-platinum/25 bg-gradient-to-br from-platinum/[0.08] to-white/[0.01]">
      {/* قصّات التذكرة */}
      <span aria-hidden className="absolute -start-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-obsidian" />
      <span aria-hidden className="absolute -end-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-obsidian" />
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -end-4 -top-4 opacity-[0.06]"><Ticket className="h-28 w-28" strokeWidth={0.8} /></span>

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        {/* اليسار: العرض */}
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl border border-platinum/30 bg-platinum/[0.08]">
            <Sparkles className="h-6 w-6 text-platinum" strokeWidth={1.5} />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.22em] text-platinum/70">
              <Tag className="h-3 w-3" strokeWidth={1.8} />
              {promo.label || T('عرض خاص لحجز الموقع', 'Online booking offer')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span dir="ltr" className="font-display text-3xl leading-none text-ivory tabular-nums">{value}</span>
              <span className="text-[0.62rem] uppercase tracking-[0.16em] text-platinum/60">{T('خصم', 'off')}</span>
            </div>
            {promo.minOrder > 0 && (
              <div className="mt-1.5 text-[0.66rem] text-platinum/55">
                {T(`بحد أدنى ${fmt(promo.minOrder)} ${ccy} للطلب`, `Min order ${fmt(promo.minOrder)} ${ccy}`)}
              </div>
            )}
          </div>
        </div>

        {/* اليمين: الكود + نسخ */}
        <button onClick={copy} data-cursor="hover"
          className="group/code flex items-center justify-between gap-3 rounded-2xl border border-dashed border-platinum/40 bg-obsidian/30 px-4 py-3 transition-colors hover:border-platinum/70 sm:min-w-[220px]">
          <span dir="ltr" className="font-display text-lg tracking-[0.18em] text-ivory">{promo.code}</span>
          <span className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em]"
            style={{ color: copied ? '#9fd4b0' : 'rgba(203,205,205,0.75)' }}>
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} />{T('تم النسخ', 'Copied')}
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />{T('نسخ', 'Copy')}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </button>
      </div>

      <div className="relative border-t border-white/[0.06] px-5 py-2.5 text-center text-[0.62rem] text-platinum/50 md:px-6">
        {T('انسخ الكود وألصقه في خانة كود الخصم عند الدفع.', 'Copy the code and paste it at the payment step.')}
      </div>
    </motion.div>
  );
}

export default BookingPromoTicket;