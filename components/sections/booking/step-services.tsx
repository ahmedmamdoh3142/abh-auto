'use client';

/**
 * StepServices — act 02. الخدمات والتصنيفات تأتي من القاعدة كـ props.
 * شريحة الحجم دلوقتي ديناميكية حسب data.size (مش ثابتة "كبيرة").
 *
 * إعادة تصميم الكرت (نهج Netflix/Behance):
 *  • الصورة فوق بنسبة ثابتة 4:3 — واضحة تمامًا بلا تغميق/grayscale (تُظهر تفاصيل الشغل).
 *  • لوحة سفلية صلبة (اسم + شيبس + سعر) على خلفية الكرت — تباين مثالي ونص مقروء دائمًا.
 *  • عند الهوفر: zoom خفيف للصورة + ظهور "يشمل" كـoverlay فوق الصورة (يُكشف عند الطلب).
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import {
  Check, X, Star, Shield, Layers, Sun, Lock, Sparkles, Truck, Clock, ArrowUpRight,
} from 'lucide-react';

import {
  BRANDS, COLORS, TOWING_COST, currencyFmt,
  type CategoryId, type TowingMode, type Category, type VehicleSize,
} from '@/lib/booking-data';
import { dbPriceFor, dbOldPriceFor, dbDiscountPct, type DbServiceMeta } from '@/lib/booking-pricing';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';
import { Heading } from './step-vehicle';
import { MapPicker } from './map-picker';

const EASE = [0.16, 1, 0.3, 1] as const;
const CAT_ICONS: Record<string, React.ElementType> = {
  star: Star, shield: Shield, layers: Layers, sun: Sun, lock: Lock, sparkles: Sparkles,
};

const SIZE_LABELS: Record<VehicleSize, { ar: string; en: string; tier: string }> = {
  small: { ar: 'صغيرة', en: 'Small', tier: 'Tier I' },
  medium: { ar: 'متوسطة', en: 'Medium', tier: 'Tier II' },
  large: { ar: 'كبيرة', en: 'Large', tier: 'Tier III' },
};

export function StepServices({
  t, isAr, data, set, total, categories, services: SERVICES, onBack, onNext,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  set: (patch: Partial<BookingState>) => void;
  total: { services: number; tow: number; grand: number; onReq: boolean; saved: number };
  categories: Category[];
  services: DbServiceMeta[];
  onBack: () => void; onNext: () => void;
}) {
  const brand = BRANDS.find((b) => b.id === data.brandId);
  const color = COLORS.find((c) => c.key === data.colorKey);
  const list = SERVICES.filter((s) => s.cat === data.activeCat);

  const sz = SIZE_LABELS[data.size] ?? SIZE_LABELS.large;
  const sizeChip = `${isAr ? sz.ar : sz.en} · ${sz.tier}`;

  const toggle = (slug: string) =>
    set({ services: data.services.includes(slug)
      ? data.services.filter((s) => s !== slug)
      : [...data.services, slug] });

  const towingValid = !data.towing || (!!data.towingMode && data.towingAddress.trim().length > 2);
  const canNext = data.services.length > 0 && towingValid;

  return (
    <div>
      <Heading index="02" label={t('steps.services')} title={t('step2.heading')} sub={t('step2.subheading')} />

      {/* ── Dossier · atelier pass ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
        className="dossier-pass relative mt-7 overflow-hidden rounded-[22px] border border-white/[0.1] bg-gradient-to-br from-white/[0.07] via-white/[0.025] to-transparent"
      >
        <span className="absolute inset-y-0 start-0 w-[3px] bg-gradient-to-b from-platinum/0 via-platinum/70 to-platinum/0" />
        <span className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-platinum/[0.06] blur-3xl" />
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />
        <span className="dossier-shimmer pointer-events-none absolute inset-0" />

        <div className="relative flex flex-col gap-5 p-5 ps-7 sm:flex-row sm:items-center sm:gap-7 md:p-6 md:ps-8">
          <div className="flex items-center gap-4">
            <div className="relative grid h-[68px] w-[68px] flex-none place-items-center rounded-full border border-white/12 bg-obsidian/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="absolute inset-1.5 rounded-full border border-white/[0.06]" />
              <span className="font-display text-[1.7rem] uppercase text-platinum">{(brand?.name ?? 'A').charAt(0)}</span>
              {color && <span className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full border-2 border-[#0a0b0c] shadow-lg" style={{ background: color.hex }} />}
            </div>
            <div className="sm:hidden">
              <StatusLabel t={t} />
              <div className="mt-1.5 font-display text-xl uppercase leading-none text-ivory">{brand?.name ?? '—'}</div>
              <div className="font-display text-sm uppercase text-platinum">{data.model}</div>
            </div>
          </div>

          <div className="hidden flex-1 sm:block">
            <StatusLabel t={t} />
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="font-display text-[1.7rem] uppercase leading-none text-ivory">{brand?.name ?? '—'}</span>
              <span className="font-display text-lg uppercase leading-none text-platinum">{data.model}</span>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {color && <SpecChip dot={color.hex}>{t(`colors.${color.key}`)}</SpecChip>}
              <SpecChip>{sizeChip}</SpecChip>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:hidden">
            {color && <SpecChip dot={color.hex}>{t(`colors.${color.key}`)}</SpecChip>}
            <SpecChip>{sizeChip}</SpecChip>
          </div>

          {data.plate && (
            <div dir="ltr" className="flex flex-none items-stretch self-start overflow-hidden rounded-[10px] border border-white/30 bg-gradient-to-b from-[#f6f6f4] to-[#d8d8d4] shadow-[0_12px_34px_-12px_rgba(0,0,0,0.75)] sm:self-center">
              <div className="flex flex-col items-center justify-center bg-obsidian px-2.5 py-2">
                <span className="text-[0.42rem] font-bold leading-none tracking-wider text-ivory">KSA</span>
                <span className="mt-0.5 text-[0.5rem] leading-none text-platinum">★</span>
              </div>
              <div className="flex items-center px-4"><span className="font-display text-xl font-semibold tracking-[0.22em] text-obsidian">{data.plate}</span></div>
            </div>
          )}
        </div>
      </motion.div>
      <style>{`
        .dossier-shimmer{background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,0.06) 50%,transparent 60%);background-size:280% 100%;animation:dossierSweep 7s ease-in-out infinite;}
        @keyframes dossierSweep{0%{background-position:140% 0}100%{background-position:-140% 0}}
      `}</style>

      <div className="mt-9 grid grid-cols-1 gap-11 lg:grid-cols-[1.55fr_1fr]">
        {/* ── Left: tabs + cards + towing ── */}
        <div>
          {/* category tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = data.activeCat === c.id;
              const count = data.services.filter((sl) => SERVICES.find((s) => s.slug === sl)?.cat === c.id).length;
              const Icon = CAT_ICONS[c.icon] ?? Star;
              return (
                <button
                  key={c.id}
                  data-cursor="hover"
                  onClick={() => set({ activeCat: c.id as CategoryId })}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[0.62rem] uppercase tracking-[0.14em] transition-all duration-300',
                    on
                      ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian shadow-[0_10px_30px_-12px_rgba(203,205,205,0.6)]'
                      : 'border-white/10 text-platinum/70 hover:border-white/25 hover:text-ivory',
                  ].join(' ')}
                >
                  <Icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
                  {c.label}
                  {count > 0 && (
                    <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.55rem] ${on ? 'bg-black/15' : 'bg-platinum/20 text-platinum'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* cards — صورة واضحة فوق + لوحة معلومات تحت + overlay عند الهوفر */}
          <AnimatePresence mode="wait">
            <motion.div
              key={data.activeCat}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {list.map((sv, i) => {
                const on = data.services.includes(sv.slug);
                const price = dbPriceFor(sv, data.size);
                const oldPrice = dbOldPriceFor(sv, data.size);
                const off = dbDiscountPct(sv, data.size);
                return (
                  <motion.button
                    key={sv.slug}
                    data-cursor="hover"
                    onClick={() => toggle(sv.slug)}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                    className={[
                      'svc-card group relative flex flex-col overflow-hidden rounded-[22px] border bg-obsidian text-start transition-all duration-500 hover:-translate-y-1',
                      on ? 'border-platinum/50 shadow-[0_30px_80px_-34px_rgba(203,205,205,0.55)]' : 'border-white/[0.08] hover:border-white/25',
                    ].join(' ')}
                  >
                    {/* ── الصورة — فوق، واضحة تمامًا (نسبة 4:3) ── */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <div
                        className="svc-img absolute inset-0 bg-cover bg-center transition-transform duration-[1100ms] ease-out group-hover:scale-[1.09]"
                        style={{ backgroundImage: `url('${sv.img}')` }}
                      />
                      {/* تدرّج خفيف أسفل الصورة لدمجها مع اللوحة */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-obsidian to-transparent" />

                      {/* الشارات */}
                      {sv.featured && (
                        <span className="absolute start-3.5 top-3.5 z-[3] inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-white to-platinum px-2.5 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-obsidian shadow-[0_8px_24px_-8px_rgba(203,205,205,0.6)]">
                          <Star className="h-2.5 w-2.5 fill-obsidian" strokeWidth={0} />{t('step2.mostChosen')}
                        </span>
                      )}
                      {off > 0 && (
                        <span className={`absolute z-[3] inline-flex items-center gap-1 rounded-full border border-[#c98a8a]/40 bg-[#2a1414]/70 px-2.5 py-1 text-[0.55rem] font-semibold tracking-[0.06em] text-[#e7b4b4] backdrop-blur-sm ${sv.featured ? 'start-3.5 top-[2.9rem]' : 'start-3.5 top-3.5'}`}>
                          −{off}%
                        </span>
                      )}
                      {/* زر الاختيار */}
                      <span className={`absolute end-3.5 top-3.5 z-[3] grid h-[30px] w-[30px] place-items-center rounded-full border backdrop-blur-sm transition-all duration-300 ${on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/25 bg-black/35 text-ivory'}`}>
                        {on ? <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> : <span className="text-lg leading-none">+</span>}
                      </span>

                      {/* overlay "يشمل" — يظهر عند الهوفر أو عند الاختيار (صفّان جنب بعض) */}
                      <div className={`svc-reveal absolute inset-0 z-[2] flex flex-col justify-center gap-2.5 bg-[#08090b]/85 p-5 backdrop-blur-[2px] transition-opacity duration-400 ${on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <span className="text-[0.5rem] uppercase tracking-[0.24em] text-platinum/70">{isAr ? 'يشمل' : 'Includes'}</span>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {sv.incl.map((x) => (
                            <span key={x} className="inline-flex items-start gap-1.5 text-[0.68rem] leading-snug text-ivory/85">
                              <Check className="mt-0.5 h-3 w-3 flex-none text-platinum" strokeWidth={2.4} />{x}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── اللوحة السفلية — صلبة، نص مقروء دائمًا ── */}
                    <div className="relative z-[1] flex flex-1 flex-col gap-3 bg-obsidian p-5">
                      <div className="flex gap-2">
                        <Chip icon={<Shield className="h-2.5 w-2.5" strokeWidth={1.8} />}>{sv.warranty}</Chip>
                        <Chip icon={<Clock className="h-2.5 w-2.5" strokeWidth={1.8} />}>{sv.dur}</Chip>
                      </div>
                      <h4 className="font-display text-[1.35rem] uppercase leading-[1.05] text-ivory">{sv.name}</h4>
                      <p className="text-[0.74rem] leading-[1.5] text-platinum/60 line-clamp-2">{sv.desc}</p>

                      <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-3.5">
                        {sv.onRequest ? (
                          <span className="font-display text-xl text-ivory">{t('onRequest')}</span>
                        ) : (
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-[0.5rem] uppercase tracking-[0.2em] text-steel">{t('from')}</span>
                            {oldPrice && (
                              <span dir="ltr" className="font-display text-sm text-steel line-through decoration-[#c98a8a]/70 tabular-nums">{currencyFmt(oldPrice)}</span>
                            )}
                            <span dir="ltr" className={`font-display text-[1.7rem] leading-[0.9] tabular-nums ${oldPrice ? 'text-[#e7b4b4]' : 'text-ivory'}`}>{currencyFmt(price)}</span>
                            <span className="text-[0.55rem] uppercase tracking-[0.18em] text-steel">{t('currency')}</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.2em] ${on ? 'text-ivory' : 'text-platinum'}`}>
                          {on ? t('step2.added') : t('step2.select')}
                          {on ? <Check className="h-3 w-3" strokeWidth={2.4} /> : <ArrowUpRight className="reversible-icon h-3 w-3" strokeWidth={2} />}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {data.services.length === 0 && (
            <p className="mt-4 text-[0.7rem] text-steel">{t('step2.selectAtLeast')}</p>
          )}

          {/* towing */}
          <div className="mt-10 overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.02]">
            <button
              data-cursor="hover"
              onClick={() => set({ towing: !data.towing, towingMode: !data.towing ? 'oneway' : null })}
              className="flex w-full items-center gap-4 p-5 text-start"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-platinum">
                <Truck className="reversible-icon h-5 w-5" strokeWidth={1.4} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-base uppercase text-ivory">{t('step2.towingTitle')}</span>
                <span className="mt-0.5 block text-xs text-platinum/55">{t('step2.towingDesc')}</span>
              </span>
              <span className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-300 ${data.towing ? 'bg-gradient-to-r from-platinum to-ivory' : 'bg-white/10'}`}>
                <motion.span className="absolute top-1 h-5 w-5 rounded-full bg-obsidian"
                  animate={{ insetInlineStart: data.towing ? 26 : 4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
              </span>
            </button>
            <AnimatePresence>
              {data.towing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
                  <div className="space-y-5 border-t border-white/[0.06] p-5">
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['oneway', 'return', 'both'] as TowingMode[]).map((m) => {
                        const on = data.towingMode === m;
                        const key = m === 'oneway' ? 'towingOneWay' : m === 'return' ? 'towingReturn' : 'towingBoth';
                        return (
                          <button key={m} data-cursor="hover" onClick={() => set({ towingMode: m })}
                            className={`rounded-2xl border px-3 py-3.5 text-center transition-all duration-300 ${on ? 'border-platinum/40 bg-platinum/[0.08] text-ivory' : 'border-white/10 bg-white/[0.02] text-platinum/70 hover:border-white/25'}`}>
                            <span className="block text-[0.62rem] uppercase tracking-[0.14em]">{t(`step2.${key}`)}</span>
                            <span dir="ltr" className="mt-1.5 block font-display text-sm text-platinum tabular-nums">+{currencyFmt(TOWING_COST[m])}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div>
                      <SubLabel>{t('step2.towingLocationTitle')}</SubLabel>
                      <div className="mt-4">
                        <MapPicker
                          value={{ lat: data.towingLat, lng: data.towingLng, address: data.towingAddress }}
                          onPick={(v) => set({ towingLat: v.lat, towingLng: v.lng, towingAddress: v.address })}
                          addressPlaceholder={t('step2.towingAddressPlaceholder')}
                          mapHint={t('step2.towingMapHint')}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-9"><button onClick={onBack} data-cursor="hover"><GhostPill>{t('step2.back')}</GhostPill></button></div>
        </div>

        {/* ── Right: sticky dock ── */}
        <div>
          <div className="sticky top-24 rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between">
              <span className="text-[0.55rem] uppercase tracking-[0.3em] text-platinum/70">{t('step2.yourBuild')}</span>
              <span className="rounded-full border border-platinum/25 px-2.5 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-platinum">
                {data.services.length} {data.services.length === 1 ? t('step2.item') : t('step2.items')}
              </span>
            </div>
            <div className="mt-4 flex max-h-[300px] flex-col gap-3 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {data.services.length === 0 && !data.towing && (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-steel">{t('step2.noServices')}</motion.p>
                )}
                {data.services.map((sl) => {
                  const m = SERVICES.find((s) => s.slug === sl)!;
                  return (
                    <motion.div key={sl} layout initial={{ opacity: 0, x: isAr ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 text-sm">
                      <span className="flex-1 text-ivory/85">{m?.name ?? sl}</span>
                      <span dir="ltr" className="font-display text-platinum tabular-nums">{m?.onRequest ? '—' : currencyFmt(dbPriceFor(m, data.size))}</span>
                      <button data-cursor="hover" onClick={(e) => { e.stopPropagation(); toggle(sl); }}
                        className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-white/12 text-steel transition-all duration-200 hover:border-[#7c1a1a]/60 hover:text-[#c98a8a]">
                        <X className="h-3 w-3" strokeWidth={1.8} />
                      </button>
                    </motion.div>
                  );
                })}
                {data.towing && data.towingMode && (
                  <motion.div key="tow" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 text-sm">
                    <span className="flex-1 text-ivory/85">{t('step2.towingCost')}</span>
                    <span dir="ltr" className="font-display text-platinum tabular-nums">{currencyFmt(total.tow)}</span>
                    <span className="w-[22px]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="my-[18px] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="flex items-end justify-between">
              <span className="text-[0.6rem] uppercase tracking-[0.24em] text-steel">{total.onReq && total.grand === 0 ? t('step4.estimate') : t('step2.total')}</span>
              <motion.span key={total.grand} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-1.5">
                {total.onReq && total.grand === 0 ? (
                  <span className="font-display text-2xl">{t('onRequest')}</span>
                ) : (
                  <>
                    <span dir="ltr" className="font-display text-3xl text-ivory tabular-nums">{currencyFmt(total.grand)}</span>
                    <span className="text-[0.6rem] uppercase tracking-[0.18em] text-platinum/70">{t('currency')}</span>
                  </>
                )}
              </motion.span>
            </div>
            {total.saved > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-full border border-[#c98a8a]/30 bg-[#2a1414]/40 px-3 py-2 text-[0.62rem] tracking-[0.04em] text-[#e7b4b4]">
                <Check className="h-[11px] w-[11px]" strokeWidth={2.4} />
                {t('step2.youSave', { amount: currencyFmt(total.saved) })}
              </div>
            )}
            <div className="mt-6"><button onClick={onNext} disabled={!canNext} data-cursor="hover" className={canNext ? '' : 'pointer-events-none opacity-40'}><PrimaryPill full>{t('step2.continue')}</PrimaryPill></button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusLabel({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-platinum opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-platinum" />
      </span>
      <span className="text-[0.5rem] uppercase tracking-[0.26em] text-platinum/70">{t('step2.dossierLabel')}</span>
    </div>
  );
}

function SpecChip({ children, dot }: { children: React.ReactNode; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-platinum/85">
      {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }} />}
      {children}
    </span>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/40 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-platinum/85 backdrop-blur-sm">
      {icon}{children}
    </span>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}