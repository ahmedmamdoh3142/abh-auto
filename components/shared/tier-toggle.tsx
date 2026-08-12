'use client';

import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Gem, Sparkles } from 'lucide-react';
import { TIERS, type TierCode } from '@/lib/shared/tier';

const TIER_ICON: Record<TierCode, React.ElementType> = {
  signature: Gem,
  essential: Sparkles,
};

export function TierToggle({
  active,
  onChange,
  className = '',
}: {
  active: TierCode;
  onChange: (t: TierCode) => void;
  className?: string;
}) {
  const isAr = useLocale() === 'ar';
  const activeMeta = TIERS.find((t) => t.code === active);

  return (
    <div className={className}>
      <div className="relative mx-auto flex w-full max-w-md items-center rounded-full border border-white/12 bg-white/[0.03] p-1.5 backdrop-blur-md">
        <motion.span
          aria-hidden
          className="absolute inset-y-1.5 w-[calc(50%-6px)] rounded-full bg-gradient-to-br from-white to-platinum shadow-[0_10px_30px_-10px_rgba(203,205,205,0.7)]"
          animate={{ insetInlineStart: active === 'signature' ? 6 : 'calc(50%)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
        {TIERS.map((t) => {
          const Icon = TIER_ICON[t.code];
          const on = active === t.code;
          return (
            <button
              key={t.code}
              type="button"
              data-cursor="hover"
              onClick={() => onChange(t.code)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
                on ? 'text-obsidian' : 'text-platinum/70 hover:text-ivory'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isAr ? t.label.ar : t.label.en}
            </button>
          );
        })}
      </div>
      {activeMeta && (
        <p className="mt-3 text-center font-editorial text-sm italic text-platinum/55">
          {isAr ? activeMeta.tagline.ar : activeMeta.tagline.en}
        </p>
      )}
    </div>
  );
}