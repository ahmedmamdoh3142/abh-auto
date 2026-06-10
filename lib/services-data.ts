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
  includes: Array<{ en: string; ar: string }>;
  warranty: {
    duration: { en: string; ar: string };
    notes: Array<{ en: string; ar: string }>;
  };
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

export const services: Service[] = [
  // COATINGS (3 services)
  {
    slug: 'ceramic-pro',
    category: 'coatings',
    name: { en: 'Ceramic Pro Elite', ar: 'سيراميك برو إليت' },
    tagline: { en: 'The ultimate in nano-ceramic protection', ar: 'القمة في حماية النانو سيراميك' },
    description: {
      en: 'Multi-layer ceramic coating system applied in a controlled environment for maximum gloss and protection lasting up to 10 years.',
      ar: 'نظام طلاء سيراميك متعدد الطبقات يُطبق في بيئة محكومة للحصول على أقصى لمعان وحماية تدوم حتى 10 سنوات.',
    },
    image: '/images/service-ceramic.webp',
    badge: 'signature',
    duration: { en: '3-5 days', ar: '3-5 أيام' },
    prices: { s: 4500, m: 5500, l: 6500 },
    includes: [
      { en: 'Full paint decontamination', ar: 'إزالة شوائب الطلاء بالكامل' },
      { en: 'Single-stage polish', ar: 'تلميع مرحلة واحدة' },
      { en: '4 ceramic layers', ar: '4 طبقات سيراميك' },
      { en: 'Wheel coating', ar: 'طلاء الجنوط' },
      { en: 'Glass coating', ar: 'طلاء الزجاج' },
    ],
    warranty: {
      duration: { en: '10 Years', ar: '10 سنوات' },
      notes: [
        { en: 'Manufacturer backed', ar: 'ضمان المصنع' },
        { en: 'Transferable', ar: 'قابل للنقل' },
      ],
    },
  },
  {
    slug: 'graphene-coating',
    category: 'coatings',
    name: { en: 'Graphene Shield', ar: 'درع الجرافين' },
    tagline: { en: 'Next-generation graphene-infused protection', ar: 'حماية الجيل القادم بالجرافين' },
    description: {
      en: 'Advanced graphene-ceramic hybrid coating offering superior heat dissipation and anti-static properties.',
      ar: 'طلاء هجين متقدم من الجرافين والسيراميك يوفر تبديد حرارة فائق وخصائص مضادة للكهرباء الساكنة.',
    },
    image: '/images/service-ceramic.webp',
    badge: 'new',
    duration: { en: '4-6 days', ar: '4-6 أيام' },
    prices: { s: 5500, m: 6500, l: 7500 },
    includes: [
      { en: 'Full paint correction', ar: 'تصحيح الطلاء الكامل' },
      { en: 'Graphene base layer', ar: 'طبقة أساس الجرافين' },
      { en: '3 ceramic top coats', ar: '3 طبقات سيراميك علوية' },
      { en: 'Interior coating', ar: 'طلاء داخلي' },
    ],
    warranty: {
      duration: { en: '7 Years', ar: '7 سنوات' },
      notes: [{ en: 'Heat resistant', ar: 'مقاوم للحرارة' }],
    },
  },
  {
    slug: 'glass-coating',
    category: 'coatings',
    name: { en: 'Crystal Glass Coat', ar: 'طلاء الزجاج الكريستالي' },
    tagline: { en: 'Hydrophobic vision enhancement', ar: 'تعزيز الرؤية بالطلاء المائي' },
    description: {
      en: 'Advanced hydrophobic glass coating that repels water, improves visibility in rain, and makes cleaning effortless.',
      ar: 'طلاء زجاج متقدم طارد للماء يحسن الرؤية في المطر ويجعل التنظيف سهلاً.',
    },
    image: '/images/service-ceramic.webp',
    duration: { en: '1 day', ar: 'يوم واحد' },
    prices: { s: 800, m: 1000, l: 1200 },
    includes: [
      { en: 'All glass surfaces', ar: 'جميع أسطح الزجاج' },
      { en: 'Deep cleaning', ar: 'تنظيف عميق' },
      { en: 'Nano coating application', ar: 'تطبيق طلاء النانو' },
      { en: 'Mirror treatment', ar: 'معالجة المرايا' },
    ],
    warranty: {
      duration: { en: '2 Years', ar: 'سنتان' },
      notes: [{ en: 'Water beading guaranteed', ar: 'تكوّن قطرات مضمون' }],
    },
  },
  // PROTECTION (3 services)
  {
    slug: 'ppf-full',
    category: 'protection',
    name: { en: 'Full Body PPF', ar: 'PPF كامل' },
    tagline: { en: 'Complete invisible armor for your vehicle', ar: 'درع كامل غير مرئي لسيارتك' },
    description: {
      en: 'Premium self-healing paint protection film covering all painted surfaces for ultimate chip and scratch resistance.',
      ar: 'فيلم حماية طلاء متميز ذاتي الشفاء يغطي جميع الأسطح المطلية لمقاومة فائقة للخدوش والرقائق.',
    },
    image: '/images/service-ppf.webp',
    badge: 'signature',
    duration: { en: '5-7 days', ar: '5-7 أيام' },
    prices: { s: 12000, m: 15000, l: 18000 },
    includes: [
      { en: 'Full body coverage', ar: 'تغطية كاملة للجسم' },
      { en: 'Self-healing film', ar: 'فيلم ذاتي الشفاء' },
      { en: 'Precision cut', ar: 'قص دقيق' },
      { en: 'Edge sealing', ar: 'ختم الحواف' },
    ],
    warranty: {
      duration: { en: '10 Years', ar: '10 سنوات' },
      notes: [{ en: 'Against yellowing & cracking', ar: 'ضد الاصفرار والتشقق' }],
    },
  },
  {
    slug: 'ppf-front',
    category: 'protection',
    name: { en: 'Front End PPF', ar: 'PPF أمامي' },
    tagline: { en: 'Essential protection for high-impact areas', ar: 'حماية أساسية للمناطق عالية التأثير' },
    description: {
      en: 'Strategic coverage of hood, fenders, bumper, and mirrors — the areas most vulnerable to road debris.',
      ar: 'تغطية استراتيجية للغطاء المحرك والرفارف والصدام والمرايا — المناطق الأكثر عرضة لحطام الطريق.',
    },
    image: '/images/service-ppf.webp',
    duration: { en: '2-3 days', ar: '2-3 أيام' },
    prices: { s: 5500, m: 6500, l: 7500 },
    includes: [
      { en: 'Hood protection', ar: 'حماية الغطاء' },
      { en: 'Front bumper', ar: 'الصدام الأمامي' },
      { en: 'Fenders', ar: 'الرفارف' },
      { en: 'Side mirrors', ar: 'المرايا الجانبية' },
    ],
    warranty: {
      duration: { en: '7 Years', ar: '7 سنوات' },
      notes: [{ en: 'Professional installation', ar: 'تركيب احترافي' }],
    },
  },
  {
    slug: 'ppf-matte',
    category: 'protection',
    name: { en: 'Matte PPF', ar: 'PPF مطفي' },
    tagline: { en: 'Satin finish protection film', ar: 'فيلم حماية بلمسة ساتان' },
    description: {
      en: 'Transform your glossy paint to a stunning matte finish while providing full protection against chips and scratches.',
      ar: 'حوّل طلاءك اللامع إلى لمسة مطفية مذهلة مع توفير حماية كاملة ضد الخدوش والرقائق.',
    },
    image: '/images/service-ppf.webp',
    badge: 'new',
    duration: { en: '5-7 days', ar: '5-7 أيام' },
    prices: { s: 14000, m: 17000, l: 20000 },
    includes: [
      { en: 'Full body matte film', ar: 'فيلم مطفي كامل' },
      { en: 'Self-healing technology', ar: 'تقنية الشفاء الذاتي' },
      { en: 'Anti-fingerprint', ar: 'مضاد لبصمات الأصابع' },
      { en: 'UV protection', ar: 'حماية من الأشعة فوق البنفسجية' },
    ],
    warranty: {
      duration: { en: '8 Years', ar: '8 سنوات' },
      notes: [{ en: 'Matte finish guarantee', ar: 'ضمان اللمسة المطفية' }],
    },
  },
  // SECURITY (3 services)
  {
    slug: 'smart-track',
    category: 'security',
    name: { en: 'Smart Tracking Pro', ar: 'تتبع ذكي برو' },
    tagline: { en: 'Real-time monitoring & control', ar: 'مراقبة وتحكم في الوقت الفعلي' },
    description: {
      en: 'Advanced GPS tracking system with real-time alerts, geofencing, and remote engine disable capabilities.',
      ar: 'نظام تتبع GPS متقدم مع تنبيهات فورية وتحديد جغرافي وإمكانية إيقاف المحرك عن بُعد.',
    },
    image: '/images/service-detailing.webp',
    duration: { en: '1 day', ar: 'يوم واحد' },
    prices: { s: 2500, m: 2500, l: 2500 },
    includes: [
      { en: 'GPS tracker installation', ar: 'تركيب جهاز GPS' },
      { en: 'Mobile app setup', ar: 'إعداد التطبيق' },
      { en: '1 year subscription', ar: 'اشتراك سنة' },
      { en: 'Geofencing alerts', ar: 'تنبيهات الحدود' },
    ],
    warranty: {
      duration: { en: '2 Years', ar: 'سنتان' },
      notes: [{ en: 'Hardware warranty', ar: 'ضمان الجهاز' }],
    },
  },
  {
    slug: 'dash-cam',
    category: 'security',
    name: { en: 'Premium Dash Cam', ar: 'كاميرا داش متميزة' },
    tagline: { en: '4K recording with parking mode', ar: 'تسجيل 4K مع وضع الركن' },
    description: {
      en: 'Professional-grade dual dash camera system with front and rear 4K recording, night vision, and cloud backup.',
      ar: 'نظام كاميرا داش مزدوج احترافي مع تسجيل أمامي وخلفي بدقة 4K ورؤية ليلية ونسخ احتياطي سحابي.',
    },
    image: '/images/service-detailing.webp',
    badge: 'new',
    duration: { en: '4-6 hours', ar: '4-6 ساعات' },
    prices: { s: 3500, m: 3500, l: 3500 },
    includes: [
      { en: 'Front & rear cameras', ar: 'كاميرا أمامية وخلفية' },
      { en: 'Hidden wiring', ar: 'أسلاك مخفية' },
      { en: '128GB storage', ar: 'تخزين 128 جيجا' },
      { en: 'Mobile app access', ar: 'وصول التطبيق' },
    ],
    warranty: {
      duration: { en: '3 Years', ar: '3 سنوات' },
      notes: [{ en: 'Full replacement', ar: 'استبدال كامل' }],
    },
  },
  {
    slug: 'alarm-system',
    category: 'security',
    name: { en: 'Smart Alarm System', ar: 'نظام إنذار ذكي' },
    tagline: { en: 'Advanced theft deterrent', ar: 'رادع سرقة متقدم' },
    description: {
      en: 'State-of-the-art alarm system with motion sensors, shock detection, and smartphone notifications.',
      ar: 'نظام إنذار متطور مع حساسات حركة وكشف الصدمات وإشعارات الهاتف الذكي.',
    },
    image: '/images/service-detailing.webp',
    duration: { en: '1 day', ar: 'يوم واحد' },
    prices: { s: 1800, m: 1800, l: 1800 },
    includes: [
      { en: 'Motion sensors', ar: 'حساسات حركة' },
      { en: 'Shock sensors', ar: 'حساسات صدمات' },
      { en: 'Remote start', ar: 'تشغيل عن بُعد' },
      { en: '2-way pager', ar: 'جهاز إنذار ثنائي الاتجاه' },
    ],
    warranty: {
      duration: { en: '2 Years', ar: 'سنتان' },
      notes: [{ en: 'Parts & labor', ar: 'قطع غيار وعمالة' }],
    },
  },
  // DETAILING (3 services)
  {
    slug: 'paint-correction',
    category: 'detailing',
    name: { en: 'Paint Correction', ar: 'تصحيح الطلاء' },
    tagline: { en: 'Restore your paint to showroom perfection', ar: 'استعد طلاءك لكمال صالة العرض' },
    description: {
      en: 'Multi-stage machine polishing to remove swirls, scratches, and oxidation, revealing the true depth of your paint.',
      ar: 'تلميع آلي متعدد المراحل لإزالة الدوامات والخدوش والأكسدة، كاشفاً عن العمق الحقيقي لطلائك.',
    },
    image: '/images/service-detailing.webp',
    badge: 'signature',
    duration: { en: '2-3 days', ar: '2-3 أيام' },
    prices: { s: 2000, m: 2500, l: 3000 },
    includes: [
      { en: 'Full wash & clay', ar: 'غسيل كامل وتنظيف طيني' },
      { en: '3-stage polish', ar: 'تلميع 3 مراحل' },
      { en: 'Paint depth readings', ar: 'قراءات عمق الطلاء' },
      { en: 'Final inspection', ar: 'فحص نهائي' },
    ],
    warranty: {
      duration: { en: '6 Months', ar: '6 أشهر' },
      notes: [{ en: 'With proper care', ar: 'مع العناية الصحيحة' }],
    },
  },
  {
    slug: 'interior-detail',
    category: 'detailing',
    name: { en: 'Interior Detailing', ar: 'تفصيل داخلي' },
    tagline: { en: 'Deep clean & rejuvenation', ar: 'تنظيف عميق وتجديد' },
    description: {
      en: 'Comprehensive interior cleaning including leather conditioning, fabric shampooing, and dashboard restoration.',
      ar: 'تنظيف داخلي شامل يشمل ترطيب الجلد وغسيل الأقمشة واستعادة لوحة القيادة.',
    },
    image: '/images/service-detailing.webp',
    duration: { en: '1 day', ar: 'يوم واحد' },
    prices: { s: 800, m: 1000, l: 1200 },
    includes: [
      { en: 'Leather treatment', ar: 'معالجة الجلد' },
      { en: 'Fabric cleaning', ar: 'تنظيف الأقمشة' },
      { en: 'Odor elimination', ar: 'إزالة الروائح' },
      { en: 'Dashboard care', ar: 'العناية بلوحة القيادة' },
    ],
    warranty: {
      duration: { en: '30 Days', ar: '30 يوماً' },
      notes: [{ en: 'Satisfaction guaranteed', ar: 'الرضا مضمون' }],
    },
  },
  {
    slug: 'engine-detail',
    category: 'detailing',
    name: { en: 'Engine Bay Detail', ar: 'تفصيل حجرة المحرك' },
    tagline: { en: 'Showroom-ready engine bay', ar: 'حجرة محرك جاهزة للعرض' },
    description: {
      en: 'Safe and thorough engine bay cleaning and dressing, making your engine compartment look factory-fresh.',
      ar: 'تنظيف وتلميع آمن وشامل لحجرة المحرك، مما يجعل حجرة محركك تبدو كالمصنع.',
    },
    image: '/images/service-detailing.webp',
    duration: { en: '4-6 hours', ar: '4-6 ساعات' },
    prices: { s: 500, m: 600, l: 700 },
    includes: [
      { en: 'Safe degreasing', ar: 'إزالة الشحوم الآمنة' },
      { en: 'Plastic restoration', ar: 'استعادة البلاستيك' },
      { en: 'Hose dressing', ar: 'تلميع الخراطيم' },
      { en: 'Final protection', ar: 'حماية نهائية' },
    ],
    warranty: {
      duration: { en: '30 Days', ar: '30 يوماً' },
      notes: [{ en: 'Weather dependent', ar: 'حسب الطقس' }],
    },
  },
  // BUNDLES (3 services)
  {
    slug: 'ultimate-protection',
    category: 'bundles',
    name: { en: 'Ultimate Protection', ar: 'الحماية القصوى' },
    tagline: { en: 'The complete protection experience', ar: 'تجربة الحماية الكاملة' },
    description: {
      en: 'Our most comprehensive package combining full PPF, ceramic coating, interior protection, and smart tracking.',
      ar: 'باقتنا الأكثر شمولاً تجمع بين PPF الكامل وطلاء السيراميك والحماية الداخلية والتتبع الذكي.',
    },
    image: '/images/service-ceramic.webp',
    badge: 'signature',
    duration: { en: '10-14 days', ar: '10-14 يوماً' },
    prices: { s: 22000, m: 27000, l: 32000 },
    includes: [
      { en: 'Full body PPF', ar: 'PPF كامل للجسم' },
      { en: 'Ceramic coating', ar: 'طلاء سيراميك' },
      { en: 'Interior protection', ar: 'حماية داخلية' },
      { en: 'Glass coating', ar: 'طلاء زجاج' },
      { en: 'Smart tracking', ar: 'تتبع ذكي' },
    ],
    warranty: {
      duration: { en: '10 Years', ar: '10 سنوات' },
      notes: [
        { en: 'Full coverage', ar: 'تغطية كاملة' },
        { en: 'Priority service', ar: 'خدمة أولوية' },
      ],
    },
  },
  {
    slug: 'new-car-bundle',
    category: 'bundles',
    name: { en: 'New Car Bundle', ar: 'باقة السيارة الجديدة' },
    tagline: { en: 'Start your ownership right', ar: 'ابدأ ملكيتك بشكل صحيح' },
    description: {
      en: 'Essential protection package for new vehicles including front PPF, ceramic coating, and interior protection.',
      ar: 'باقة حماية أساسية للسيارات الجديدة تشمل PPF أمامي وطلاء سيراميك وحماية داخلية.',
    },
    image: '/images/service-ppf.webp',
    badge: 'new',
    duration: { en: '5-7 days', ar: '5-7 أيام' },
    prices: { s: 12000, m: 14000, l: 16000 },
    includes: [
      { en: 'Front end PPF', ar: 'PPF أمامي' },
      { en: 'Full ceramic coat', ar: 'طلاء سيراميك كامل' },
      { en: 'Interior coating', ar: 'طلاء داخلي' },
      { en: 'Glass treatment', ar: 'معالجة الزجاج' },
    ],
    warranty: {
      duration: { en: '7 Years', ar: '7 سنوات' },
      notes: [{ en: 'Comprehensive coverage', ar: 'تغطية شاملة' }],
    },
  },
  {
    slug: 'maintenance-bundle',
    category: 'bundles',
    name: { en: 'Annual Maintenance', ar: 'الصيانة السنوية' },
    tagline: { en: 'Keep your protection pristine', ar: 'حافظ على حمايتك نقية' },
    description: {
      en: 'Annual maintenance package to refresh and maintain your existing ceramic coating and PPF protection.',
      ar: 'باقة صيانة سنوية لتجديد والحفاظ على طلاء السيراميك وحماية PPF الحالية.',
    },
    image: '/images/service-detailing.webp',
    duration: { en: '1-2 days', ar: '1-2 أيام' },
    prices: { s: 1500, m: 1800, l: 2100 },
    includes: [
      { en: 'Full decontamination', ar: 'إزالة الشوائب الكاملة' },
      { en: 'Coating inspection', ar: 'فحص الطلاء' },
      { en: 'Top-up layer', ar: 'طبقة تجديد' },
      { en: 'Interior refresh', ar: 'تجديد داخلي' },
    ],
    warranty: {
      duration: { en: '1 Year', ar: 'سنة واحدة' },
      notes: [{ en: 'Extends original warranty', ar: 'يمدد الضمان الأصلي' }],
    },
  },
];

export function servicesByCategory(category: CategorySlug): Service[] {
  return services.filter((s) => s.category === category);
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}
