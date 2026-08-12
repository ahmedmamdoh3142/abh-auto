/**
 * Services Data — Central source of truth for all service information.
 */

export const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export type CategorySlug = 'coatings' | 'protection' | 'security' | 'detailing' | 'bundles';
export type SizeSlug = 's' | 'm' | 'l';

export interface Category {
  slug: CategorySlug;
  numeral: string;
  short: { en: string; ar: string };
  tagline: { en: string; ar: string };
}

export interface Size {
  slug: SizeSlug;
  label: { en: string; ar: string };
  examples: { en: string; ar: string };
}

import type { TierCode } from './shared/tier';

export interface Service {
  slug: string;
  category: CategorySlug;
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  description: { en: string; ar: string };
  image: string;
  badge?: 'signature' | 'new';
  duration: { en: string; ar: string };
  prices: Record<SizeSlug, number>;
  oldPrices?: Partial<Record<SizeSlug, number>>; 
  includes: Array<{ en: string; ar: string }>;
  warranty: {
    duration: { en: string; ar: string };
    notes: Array<{ en: string; ar: string }>;
  };
  /** (جديد) خط الخامة — Signature أو Essential */
  tier: TierCode;
}

export const categories: Category[] = [
  {
    slug: 'coatings',
    numeral: 'I',
    short: { en: 'Coatings', ar: 'الطلاءات' },
    tagline: { en: 'Ceramic & nano protection systems', ar: 'أنظمة السيراميك والنانو' },
  },
  {
    slug: 'protection',
    numeral: 'II',
    short: { en: 'Protection', ar: 'الحماية' },
    tagline: { en: 'Paint protection film & armoring', ar: 'أفلام الحماية والتدريع' },
  },
  {
    slug: 'security',
    numeral: 'III',
    short: { en: 'Security', ar: 'الأمان' },
    tagline: { en: 'Smart tracking & access control', ar: 'التتبع الذكي والتحكم' },
  },
  {
    slug: 'detailing',
    numeral: 'IV',
    short: { en: 'Detailing', ar: 'التفاصيل' },
    tagline: { en: 'Paint correction & interior care', ar: 'تصحيح الطلاء والعناية الداخلية' },
  },
  {
    slug: 'bundles',
    numeral: 'V',
    short: { en: 'Bundles', ar: 'الباقات' },
    tagline: { en: 'Complete protection packages', ar: 'باقات الحماية الشاملة' },
  },
];

export const sizes: Size[] = [
  {
    slug: 's',
    label: { en: 'Small', ar: 'صغير' },
    examples: { en: 'Sedan, Coupe', ar: 'سيدان، كوبيه' },
  },
  {
    slug: 'm',
    label: { en: 'Medium', ar: 'متوسط' },
    examples: { en: 'SUV, Crossover', ar: 'دفع رباعي' },
  },
  {
    slug: 'l',
    label: { en: 'Large', ar: 'كبير' },
    examples: { en: 'Full-size SUV', ar: 'SUV كبير' },
  },
];



export function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}
