'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

export function MarqueeStrip() {
  const t = useTranslations();
  const items = t.raw('marquee') as string[];
  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div className="relative py-10 overflow-hidden border-y border-white/[0.06] bg-obsidian/60">
      <div className="absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-obsidian to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-obsidian to-transparent pointer-events-none" />

      <div className="flex marquee-track">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-16 shrink-0">
            <div className="flex items-center gap-4">
              <Sparkles className="h-3.5 w-3.5 text-platinum/60" />
              <span className="font-display text-2xl md:text-4xl tracking-tight text-ivory/30 uppercase whitespace-nowrap">
                {item}
              </span>
            </div>
            <span className="h-px w-12 bg-platinum/20" />
          </div>
        ))}
      </div>
    </div>
  );
}
