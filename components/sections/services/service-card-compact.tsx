'use client';

/**
 * ServiceCardCompact — "Ledger Row"
 *
 * تحديث هذه النسخة (محاذاة الأسعار):
 *  • السعر متستّك في عمود ثابت — السعر القديم المشطوب + شارة الخصم في سطر فوق،
 *    والسعر الجديد في سطر تحته يبدأ دايمًا من نفس المكان (بعد كلمة "من")، بغض
 *    النظر عن طول الرقم. فالأسعار بتتحاذى من نفس البداية في كل الكروت.
 *  • RTL: البداية = أقصى اليمين (تلقائيًا). الأرقام نفسها LTR عشان تتقري صح.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowUpRight, Star, Plus } from 'lucide-react';

import { formatPrice, type Service } from '@/lib/services-data';

/* نفس لون التنبيه للخصم المستخدم في الكرت الكبير */
const ACCENT = '#d2453f';

interface Props {
  service: Service;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export function ServiceCardCompact({ service, isActive, onClick, index }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const reduce = useReducedMotion();

  const newP = service.prices.s;
  const oldP = service.oldPrices?.s;
  const hasDiscount = typeof oldP === 'number' && oldP > newP;
  const pct = hasDiscount ? Math.round((1 - newP / (oldP as number)) * 100) : 0;

  return (
    <button
      onClick={onClick}
      aria-current={isActive}
      className={`group relative w-full min-w-[260px] overflow-hidden rounded-2xl border p-px text-start transition-all duration-500 lg:min-w-0 ${
        isActive ? 'border-platinum/30' : 'border-white/[0.06] hover:border-white/[0.14]'
      }`}
    >
      {isActive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-platinum/40 via-transparent to-platinum/10"
        />
      )}

      <span
        className={`relative flex items-stretch gap-3 rounded-[15px] p-4 transition-colors duration-500 ${
          isActive
            ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02]'
            : 'bg-white/[0.015] group-hover:bg-white/[0.035]'
        }`}
      >
        {/* index + accent */}
        <span className="relative flex w-8 shrink-0 items-center justify-center">
          <motion.span
            aria-hidden
            initial={false}
            animate={{ scaleY: isActive ? 1 : 0.2, opacity: isActive ? 1 : 0.25 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-1 start-0 w-0.5 origin-center rounded-full bg-gradient-to-b from-platinum/70 via-ivory to-platinum/40"
          />
          <span
            dir="ltr"
            className={`font-display tabular-nums transition-all duration-300 ${
              isActive ? 'text-metallic scale-110 text-3xl' : 'text-3xl text-platinum/25 group-hover:text-platinum/45'
            }`}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </span>

        {/* body */}
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {/* name + badge */}
          <span className="flex items-center gap-2">
            <span
              className={`truncate font-display text-lg leading-tight tracking-tight transition-colors ${
                isActive ? 'text-ivory' : 'text-platinum/75 group-hover:text-ivory'
              }`}
            >
              {service.name[isAr ? 'ar' : 'en']}
            </span>
            {service.badge && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5rem] ${
                  service.badge === 'signature'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {service.badge === 'signature' ? (
                  <Star className="h-2 w-2" fill="currentColor" />
                ) : (
                  <Plus className="h-2 w-2" strokeWidth={3} />
                )}
              </span>
            )}
          </span>

          {/* price — متستّك ومتحاذي من نفس البداية */}
          <span className="flex flex-col gap-0.5">
            {/* سطر علوي: السعر القديم + نسبة الخصم (ثابت مكانه) */}
            {hasDiscount && (
              <span className="flex items-center gap-1.5">
                <span
                  dir="ltr"
                  className="font-mono text-[0.7rem] tabular-nums text-platinum/45 line-through"
                  style={{ textDecorationColor: ACCENT, textDecorationThickness: '2px' }}
                >
                  {formatPrice(oldP as number)}
                </span>
                <span
                  className="rounded-full px-1.5 py-px font-mono text-[0.5rem] font-semibold tabular-nums text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  −{pct}%
                </span>
              </span>
            )}

            {/* سطر السعر الجديد: يبدأ دايمًا من نفس المكان */}
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-platinum/40">
                {isAr ? 'من' : 'From'}
              </span>
              <span
                dir="ltr"
                className={`font-display text-xl tabular-nums transition-colors ${
                  isActive ? 'text-ivory' : 'text-platinum/75'
                }`}
              >
                {formatPrice(newP)}
              </span>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-platinum/40">SAR</span>
            </span>
          </span>
        </span>

        {/* arrow */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full border transition-all duration-300 ${
            isActive
              ? 'border-platinum/30 bg-platinum/10 text-ivory'
              : 'border-white/[0.08] text-platinum/35 group-hover:border-platinum/20 group-hover:text-platinum/70'
          }`}
        >
          <ArrowUpRight
            className={`h-4 w-4 transition-transform ${
              isActive ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
            }`}
          />
        </span>

        {/* hover sheen */}
        {!reduce && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
        )}
      </span>
    </button>
  );
}