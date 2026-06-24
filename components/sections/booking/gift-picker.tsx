'use client';

/**
 * Gift bundles — أدوات «خدمة + هدية» في صفحة الحجز.
 * Path: components/sections/booking/gift-picker.tsx
 *
 * يصدّر:
 *   • useBundles()                     → يجلب البندلات النشطة مرة واحدة
 *   • isTriggerService(bundles, id)    → هل الخدمة مؤهِّلة لهدية؟
 *   • unlockedBundles(bundles, ids)    → البندلات اللي اتفتحت (اختار triggers كفاية)
 *   • giftChargeFor(price, percent)    → سعر الهدية بعد الخصم (free → 0)
 *   • <GiftBadge/>                     → شارة صغيرة على كرت الخدمة المؤهِّلة
 *   • <GiftPicker/>                    → مودال اختيار الهدية/الهدايا
 *
 * نوع الهدية المختارة: { slug, bundleId, unit } — unit = السعر المحمَّل (0 لو مجانية).
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Check, X, Sparkles } from 'lucide-react';

import { currencyFmt, type VehicleSize } from '@/lib/booking-data';
import { dbPriceFor, type DbServiceMeta } from '@/lib/booking-pricing';

const EASE = [0.16, 1, 0.3, 1] as const;

export interface Bundle {
  id: string;
  title: { ar?: string; en?: string } | null;
  giftMode: 'free' | 'percent';
  giftPercent: number;
  minTriggerCount: number;
  maxGifts: number;
  stackable: boolean;
  triggerIds: number[];
  giftIds: number[];
}
export interface ChosenGift { slug: string; bundleId: string; unit: number; }

export function giftChargeFor(fullPrice: number, giftPercent: number): number {
  return Math.max(0, Math.round(fullPrice * (1 - (Number(giftPercent) || 0) / 100)));
}

/** يجلب البندلات النشطة مرة واحدة. */
export function useBundles(): Bundle[] {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/bundles/active').then((r) => r.json());
        if (alive && j?.ok && Array.isArray(j.bundles)) setBundles(j.bundles);
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
  }, []);
  return bundles;
}

/** هل هذه الخدمة مؤهِّلة لأي بندل نشط؟ */
export function isTriggerService(bundles: Bundle[], serviceId: number): boolean {
  return bundles.some((b) => b.triggerIds.includes(serviceId));
}

/** البندلات اللي «اتفتحت» بناءً على عدد الـtriggers المختارة. */
export function unlockedBundles(bundles: Bundle[], selectedServiceIds: number[]): Bundle[] {
  const sel = new Set(selectedServiceIds);
  return bundles.filter((b) => b.triggerIds.filter((id) => sel.has(id)).length >= b.minTriggerCount);
}

/* ─── شارة على كرت الخدمة المؤهِّلة ─── */
export function GiftBadge({ isAr }: { isAr: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9b25f]/45 bg-[#d9b25f]/[0.12] px-2.5 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-[#e8d6a8] backdrop-blur-sm">
      <Gift className="h-2.5 w-2.5" strokeWidth={2} />
      {isAr ? 'خدها وخد هدية' : 'Get a gift'}
    </span>
  );
}

/* ─── مودال اختيار الهدية ─── */
export function GiftPicker({
  bundle, services, size, isAr, chosenSlugs, onConfirm, onClose,
}: {
  bundle: Bundle;
  services: DbServiceMeta[];
  size: VehicleSize;
  isAr: boolean;
  chosenSlugs: string[];
  onConfirm: (gifts: ChosenGift[]) => void;
  onClose: () => void;
}) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = T('ريال', 'SAR');

  const gifts = bundle.giftIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is DbServiceMeta => !!s && !s.onRequest);

  const [picked, setPicked] = useState<string[]>(() => chosenSlugs.filter((sl) => gifts.some((g) => g.slug === sl)));

  const toggle = (slug: string) => {
    setPicked((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= bundle.maxGifts) {
        // وصل الحد: استبدل الأقدم
        return [...prev.slice(1), slug];
      }
      return [...prev, slug];
    });
  };

  const confirm = () => {
    const out: ChosenGift[] = picked.map((slug) => {
      const svc = gifts.find((g) => g.slug === slug)!;
      const full = dbPriceFor(svc, size);
      return { slug, bundleId: bundle.id, unit: giftChargeFor(full, bundle.giftPercent) };
    });
    onConfirm(out);
  };

  const title = (isAr ? bundle.title?.ar : bundle.title?.en) || T('اختر هديتك', 'Pick your gift');
  const limitNote = bundle.maxGifts > 1
    ? T(`اختر حتى ${bundle.maxGifts} هدايا`, `Choose up to ${bundle.maxGifts} gifts`)
    : T('اختر هدية واحدة', 'Choose one gift');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="glass-strong relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/[0.1] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.85)]">
        {/* الرأس */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-[#0c0d0e]/90 px-6 py-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d9b25f]/40 bg-[#d9b25f]/[0.1] text-[#e8d6a8]">
              <Gift className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <h3 className="font-display text-lg font-light uppercase tracking-tight text-ivory md:text-xl">{title}</h3>
              <p className="text-[0.62rem] text-platinum/55">{limitNote}</p>
            </div>
          </div>
          <button data-cursor="hover" onClick={onClose} aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* قائمة الهدايا */}
        <div className="space-y-2.5 p-6 md:p-8">
          {gifts.map((g) => {
            const on = picked.includes(g.slug);
            const full = dbPriceFor(g, size);
            const charge = giftChargeFor(full, bundle.giftPercent);
            return (
              <button key={g.slug} data-cursor="hover" onClick={() => toggle(g.slug)}
                className={['flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-300',
                  on ? 'border-[#d9b25f]/45 bg-[#d9b25f]/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/25'].join(' ')}>
                <span className="relative h-14 w-14 flex-none overflow-hidden rounded-xl">
                  <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${g.img}')` }} />
                  <span className="absolute inset-0 bg-obsidian/30" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base uppercase leading-tight text-ivory">{g.name}</span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <span dir="ltr" className="font-display text-sm text-steel line-through decoration-[#c98a8a]/60 tabular-nums">{currencyFmt(full)}</span>
                    <span dir="ltr" className="font-display text-base text-[#e8d6a8] tabular-nums">
                      {charge === 0 ? T('مجانًا', 'Free') : `${currencyFmt(charge)} ${ccy}`}
                    </span>
                  </span>
                </span>
                <span className={['grid h-6 w-6 flex-none place-items-center rounded-full border transition-all duration-300',
                  on ? 'border-transparent bg-gradient-to-br from-[#f0dca6] to-[#d9b25f] text-obsidian' : 'border-white/20'].join(' ')}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                </span>
              </button>
            );
          })}

          {gifts.length === 0 && (
            <p className="py-8 text-center text-sm text-steel">{T('لا توجد هدايا متاحة حاليًا.', 'No gifts available right now.')}</p>
          )}
        </div>

        {/* التذييل */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0c0d0e]/90 px-6 py-4 backdrop-blur-md md:px-8">
          <span className="text-[0.66rem] text-platinum/60">
            {picked.length > 0
              ? T(`${picked.length} هدية مختارة`, `${picked.length} selected`)
              : T('لم تختر بعد', 'Nothing selected')}
          </span>
          <button data-cursor="hover" onClick={confirm}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-obsidian transition-transform duration-500 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#f0dca6,#d9b25f)', boxShadow: '0 16px 50px -15px rgba(217,178,95,0.5)' }}>
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            {picked.length > 0 ? T('أضف الهدية', 'Add gift') : T('تخطّى', 'Skip')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}