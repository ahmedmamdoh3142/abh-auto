'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { setLocale } from '@/lib/actions';
import { locales, localeLabels, type Locale } from '@/lib/locales';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      setLocale(next);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-2 h-10 px-3.5 rounded-full glass text-[0.65rem] uppercase tracking-[0.22em] transition-colors hover:text-ivory',
          pending && 'opacity-60',
        )}
        data-cursor="hover"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[10rem] glass-strong rounded-2xl p-2">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => change(l)}
            className={cn(
              'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors',
              locale === l ? 'bg-white/[0.06] text-ivory' : 'text-platinum/70 hover:bg-white/[0.04] hover:text-ivory',
            )}
          >
            <span>{localeLabels[l]}</span>
            <span className="text-[0.6rem] tracking-[0.22em] uppercase opacity-60">{l}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
