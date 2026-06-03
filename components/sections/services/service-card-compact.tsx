'use client';

/**
 * ServiceCardCompact — Compact sidebar service card.
 * 
 * Features:
 * - Elegant minimal design
 * - Active state with glow effect
 * - Smooth hover transitions
 */
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ChevronRight, Star, Plus } from 'lucide-react';

import { formatPrice, type Service } from '@/lib/services-data';

interface Props {
  service: Service;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export function ServiceCardCompact({ service, isActive, onClick, index }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <button
      onClick={onClick}
      className={`group relative w-full min-w-[280px] overflow-hidden rounded-2xl border p-5 text-start transition-all duration-500 lg:min-w-0 ${
        isActive
          ? 'border-platinum/30 bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_0_40px_-10px_rgba(203,205,205,0.3)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      {/* Active glow */}
      {isActive && (
        <motion.div
          layoutId="active-card-glow"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(ellipse at 30% 0%, rgba(203,205,205,0.15), transparent 70%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Index number */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`font-mono text-[0.55rem] tabular-nums tracking-[0.3em] transition-colors ${
                isActive ? 'text-platinum/70' : 'text-platinum/40'
              }`}
              dir="ltr"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            
            {service.badge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5rem] ${
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
          </div>

          {/* Name */}
          <h3
            className={`font-display text-lg leading-tight tracking-tight transition-colors ${
              isActive ? 'text-ivory' : 'text-platinum/80 group-hover:text-ivory'
            }`}
          >
            {service.name[isAr ? 'ar' : 'en']}
          </h3>

          {/* Starting price */}
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-platinum/40">
              {isAr ? 'من' : 'From'}
            </span>
            <span
              className={`font-display text-xl tabular-nums transition-colors ${
                isActive ? 'text-ivory' : 'text-platinum/70'
              }`}
            >
              {formatPrice(service.prices.s)}
            </span>
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-platinum/40">
              SAR
            </span>
          </div>
        </div>

        {/* Arrow indicator */}
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ${
            isActive
              ? 'border-platinum/30 bg-platinum/10 text-ivory'
              : 'border-white/[0.08] text-platinum/40 group-hover:border-platinum/20 group-hover:text-platinum/70'
          }`}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              isActive ? 'translate-x-0' : '-translate-x-0.5 group-hover:translate-x-0'
            }`}
          />
        </span>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-platinum/60 via-ivory to-platinum/60"
        initial={{ width: 0 }}
        animate={{ width: isActive ? '100%' : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </button>
  );
}
