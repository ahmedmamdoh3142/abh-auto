'use client';

/**
 * components/shared/phone-field.tsx
 * حقل تليفون موحّد: منتقي كود الدولة (افتراضي السعودية +966) + رقم + فاليديشن.
 * القيمة بتترجع وتتسجّل كنص واحد: "‎+966 5XXXXXXXX" (الكود + الرقم جنب بعض، نفس المكان).
 *
 * طريقة الاستخدام:
 *   <PhoneField value={data.phone} onChange={(full) => set({ phone: full })}
 *               error={touched ? phoneError(data.phone) : null} />
 *
 * للفاليديشن من برّه (قبل الإرسال) استخدم phoneError(value) المُصدَّرة هنا.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Phone, ChevronDown, Check, Search } from 'lucide-react';

export type Country = { code: string; dial: string; ar: string; en: string; flag: string; min: number; max: number };

/* قائمة مختصرة بالخليج + الأكثر استخدامًا (السعودية أولًا/افتراضية) */
export const COUNTRIES: Country[] = [
  { code: 'SA', dial: '+966', ar: 'السعودية', en: 'Saudi Arabia', flag: '🇸🇦', min: 9, max: 9 },
  { code: 'AE', dial: '+971', ar: 'الإمارات', en: 'United Arab Emirates', flag: '🇦🇪', min: 9, max: 9 },
  { code: 'KW', dial: '+965', ar: 'الكويت', en: 'Kuwait', flag: '🇰🇼', min: 8, max: 8 },
  { code: 'QA', dial: '+974', ar: 'قطر', en: 'Qatar', flag: '🇶🇦', min: 8, max: 8 },
  { code: 'BH', dial: '+973', ar: 'البحرين', en: 'Bahrain', flag: '🇧🇭', min: 8, max: 8 },
  { code: 'OM', dial: '+968', ar: 'عُمان', en: 'Oman', flag: '🇴🇲', min: 8, max: 8 },
  { code: 'EG', dial: '+20', ar: 'مصر', en: 'Egypt', flag: '🇪🇬', min: 10, max: 10 },
  { code: 'JO', dial: '+962', ar: 'الأردن', en: 'Jordan', flag: '🇯🇴', min: 9, max: 9 },
  { code: 'LB', dial: '+961', ar: 'لبنان', en: 'Lebanon', flag: '🇱🇧', min: 7, max: 8 },
  { code: 'IQ', dial: '+964', ar: 'العراق', en: 'Iraq', flag: '🇮🇶', min: 10, max: 10 },
  { code: 'YE', dial: '+967', ar: 'اليمن', en: 'Yemen', flag: '🇾🇪', min: 9, max: 9 },
  { code: 'SY', dial: '+963', ar: 'سوريا', en: 'Syria', flag: '🇸🇾', min: 9, max: 9 },
  { code: 'SD', dial: '+249', ar: 'السودان', en: 'Sudan', flag: '🇸🇩', min: 9, max: 9 },
  { code: 'MA', dial: '+212', ar: 'المغرب', en: 'Morocco', flag: '🇲🇦', min: 9, max: 9 },
  { code: 'DZ', dial: '+213', ar: 'الجزائر', en: 'Algeria', flag: '🇩🇿', min: 9, max: 9 },
  { code: 'TN', dial: '+216', ar: 'تونس', en: 'Tunisia', flag: '🇹🇳', min: 8, max: 8 },
  { code: 'TR', dial: '+90', ar: 'تركيا', en: 'Turkey', flag: '🇹🇷', min: 10, max: 10 },
  { code: 'GB', dial: '+44', ar: 'بريطانيا', en: 'United Kingdom', flag: '🇬🇧', min: 10, max: 10 },
  { code: 'US', dial: '+1', ar: 'أمريكا', en: 'United States', flag: '🇺🇸', min: 10, max: 10 },
];

const DEFAULT = COUNTRIES[0];

/* يفصل قيمة محفوظة ("+966 512345678") لكود + رقم */
export function splitPhone(full: string): { country: Country; number: string } {
  const raw = (full || '').trim();
  if (raw) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const compact = raw.replace(/[\s-]/g, '');
    for (const c of sorted) {
      if (compact.startsWith(c.dial)) return { country: c, number: compact.slice(c.dial.length) };
    }
  }
  return { country: DEFAULT, number: raw.replace(/[^\d]/g, '') };
}

export function joinPhone(country: Country, number: string): string {
  const digits = (number || '').replace(/[^\d]/g, '');
  return digits ? `${country.dial} ${digits}` : '';
}

/* فاليديشن: يرجّع true لو الرقم سليم لطول دولته */
export function isValidPhone(full: string): boolean {
  const { country, number } = splitPhone(full);
  const len = number.replace(/[^\d]/g, '').length;
  return len >= country.min && len <= country.max;
}

export function PhoneField({
  value, onChange, placeholder, error, isAr = true,
}: {
  value: string; onChange: (full: string) => void;
  placeholder?: string; error?: string | null; isAr?: boolean;
}) {
  const init = useMemo(() => splitPhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(init.country);
  const [number, setNumber] = useState<string>(init.number);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const update = (c: Country, n: string) => { setCountry(c); setNumber(n); onChange(joinPhone(c, n)); };
  const filtered = COUNTRIES.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || c.ar.includes(q) || c.en.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s);
  });

  return (
    <div>
      <div dir="ltr" ref={ref} className="relative flex items-stretch gap-2">
        {/* منتقي كود الدولة */}
        <div className="relative">
          <button type="button" onClick={() => setOpen((o) => !o)}
            className={['flex h-full items-center gap-1.5 rounded-2xl border bg-white/[0.03] px-3 py-4 text-sm transition-colors duration-300',
              open ? 'border-platinum/50 bg-white/[0.05]' : 'border-white/12 hover:border-white/25'].join(' ')}>
            <span className="text-base leading-none">{country.flag}</span>
            <span className="font-display tabular-nums text-ivory">{country.dial}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
          </button>
          {open && (
            <div className="absolute z-40 mt-2 max-h-72 w-[260px] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/97 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                <Search className="h-3.5 w-3.5 text-steel" strokeWidth={1.8} />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder={isAr ? 'ابحث عن دولة…' : 'Search country…'}
                  className="w-full bg-transparent text-sm text-ivory placeholder:text-steel/60 outline-none" />
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {filtered.map((c) => {
                  const on = c.code === country.code;
                  return (
                    <button key={c.code} type="button"
                      onClick={() => { update(c, number); setOpen(false); setQ(''); }}
                      className={['flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm transition-colors duration-200',
                        on ? 'bg-white/[0.08] text-ivory' : 'text-platinum/80 hover:bg-white/[0.05] hover:text-ivory'].join(' ')}>
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{isAr ? c.ar : c.en}</span>
                      <span className="font-display tabular-nums text-steel">{c.dial}</span>
                      {on && <Check className="h-3.5 w-3.5 text-platinum" strokeWidth={2.4} />}
                    </button>
                  );
                })}
                {filtered.length === 0 && <div className="px-3 py-4 text-center text-xs text-steel">{isAr ? 'لا نتائج' : 'No results'}</div>}
              </div>
            </div>
          )}
        </div>

        {/* رقم التليفون */}
        <div className="relative flex-1">
          <Phone className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
          <input value={number} dir="ltr" inputMode="numeric" placeholder={placeholder || (isAr ? 'رقم الجوال' : 'Phone number')}
            onChange={(e) => update(country, e.target.value.replace(/[^\d]/g, '').slice(0, country.max))}
            className={['w-full rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-all duration-300',
              error ? 'border-[#7c1a1a]/70 focus:border-[#7c1a1a]' : 'border-white/12 focus:border-platinum/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(203,205,205,0.07)]'].join(' ')} />
        </div>
      </div>
      {error && <span className="mt-2 block text-[0.6rem] tracking-wide text-[#c98a8a]">{error}</span>}
    </div>
  );
}