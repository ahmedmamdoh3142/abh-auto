export type TierCode = 'signature' | 'essential';

export interface TierMeta {
  code: TierCode;
  label: { en: string; ar: string };
  tagline: { en: string; ar: string };
}

export const TIERS: TierMeta[] = [
  {
    code: 'signature',
    label: { en: 'Premium', ar: 'بريميوم' },
    tagline: {
      en: 'Our flagship materials, with the longest warranty terms',
      ar: 'خاماتنا الرائدة، بأطول مدد الضمان',
    },
  },
  {
    code: 'essential', // الكود الداخلي ثابت — بيتخزن في tier_code بالداتابيز، متلمسوش
    label: { en: 'Classic', ar: 'كلاسيك' },
    tagline: {
      en: 'Same craftsmanship, carefully curated materials, a different warranty term',
      ar: 'نفس الحرفية، خامات مُنتقاة بعناية، بمدة ضمان مختلفة',
    },
  },
];

export function tierLabel(code: TierCode, isAr: boolean): string {
  const t = TIERS.find((x) => x.code === code);
  return t ? (isAr ? t.label.ar : t.label.en) : code;
}