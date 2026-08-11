'use client';

/**
 * WarrantyPolicyView — صفحة "سياسة وشروط الضمان" العامة لـ ABH AUTO.
 * (بدون زر "شهادتي الإلكترونية" وبدون فوتر مكرر – الفوتر موحد على الموقع)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  ShieldCheck, CheckCircle2, XCircle, PhoneCall, Search, Wrench, RefreshCcw,
  Sparkles, Sun, Droplets, FileText, ChevronDown,
  Calendar, ClipboardCheck, AlertTriangle, ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EASE = [0.16, 1, 0.3, 1] as const;
const ACCENT = '#cbcdcd';
const COVER_IMAGE = '/images/cta-bg.webp';
const COMPANY_PHONE_HREF = 'tel:+966000000000'; // TODO: رقم التواصل الفعلي
const POLICY_VERSION = '1.0';

/* ══════════════════════════ المحتوى (ar / en) ══════════════════════════ */

const PAGE = {
  eyebrow: { ar: 'ABH AUTO', en: 'ABH AUTO' },
  kicker: { ar: 'سياسة وشروط الضمان', en: 'Warranty Policy & Terms' },
  title: { ar: 'ثقة في الجودة… وضمان يمتد معك', en: 'Confidence in quality. A warranty that goes the distance.' },
  lead: {
    ar: 'في ABH AUTO نثق في جودة منتجاتنا والخدمات التي نقدمها، ولذلك نقدّم ضمانًا يصل إلى 12 سنة على مجموعة من خدمات الحماية والعناية بالمركبات. إذا ظهرت ملاحظة على إحدى الخدمات المشمولة، يراجع فريقنا الحالة ويفحصها عند الحاجة، وفي حال ثبوت أنها ضمن التغطية، نتولى معالجتها دون تكلفة على العميل، وفق شروط هذه السياسة.',
    en: 'At ABH AUTO we stand behind the quality of our products and services with a warranty of up to 12 years across our vehicle protection and care lineup. If a concern appears on a covered service, our team reviews and inspects the case, and once confirmed as covered, ABH AUTO handles it at no cost to the customer, under the terms of this policy.',
  },
  heroBadgeNum: { ar: '12', en: '12' },
  heroBadgeSub: { ar: 'سنة أقصى تغطية', en: 'years max coverage' },
  ctaContact: { ar: 'تواصل مع فريق الضمان', en: 'Contact warranty team' },
  effective: { ar: 'الإصدار', en: 'Version' },
  effectiveDate: { ar: 'ساري من أغسطس 2026', en: 'Effective August 2026' },
};

const TOC = [
  { id: 'coverage', ar: 'مدد الضمان', en: 'Coverage & duration' },
  { id: 'covered', ar: 'ماذا يغطي ضمانك', en: "What's covered" },
  { id: 'services', ar: 'تفاصيل كل خدمة', en: 'Per-service details' },
  { id: 'claim', ar: 'خطوات المطالبة', en: 'How to claim' },
  { id: 'exclusions', ar: 'غير المشمول', en: 'Not covered' },
  { id: 'terms', ar: 'أحكام عامة', en: 'General terms' },
];

const COVERAGE_ROWS: { ar: string; en: string; dur: { ar: string; en: string } }[] = [
  { ar: 'حماية الطلاء PPF — كامل', en: 'Full-body Paint Protection Film (PPF)', dur: { ar: '12 سنة', en: '12 years' } },
  { ar: 'حماية الطلاء PPF — نصفي', en: 'Half-body PPF', dur: { ar: '12 سنة', en: '12 years' } },
  { ar: 'حماية الطلاء PPF — جزئي', en: 'Partial PPF', dur: { ar: '12 سنة', en: '12 years' } },
  { ar: 'حماية الزجاج الأمامي', en: 'Windshield protection film', dur: { ar: 'سنة واحدة / 25 ألف كم', en: '1 year / 25,000 km' } },
  { ar: 'العازل الحراري — جميع الأنواع', en: 'Thermal insulation — all types', dur: { ar: '10 سنوات', en: '10 years' } },
  { ar: 'نانو سيراميك — طبقتان', en: 'Nano ceramic — 2 layers', dur: { ar: 'سنة واحدة', en: '1 year' } },
  { ar: 'نانو سيراميك — 4 طبقات', en: 'Nano ceramic — 4 layers', dur: { ar: '3 سنوات', en: '3 years' } },
  { ar: 'نانو سيراميك — 6 طبقات', en: 'Nano ceramic — 6 layers', dur: { ar: '5 سنوات', en: '5 years' } },
];
const COVERAGE_NOTE = {
  ar: 'تبدأ مدة الضمان من التاريخ المحدد في شهادة الضمان الإلكترونية الخاصة بالعميل.',
  en: "The warranty period starts from the date shown on the customer's electronic warranty certificate.",
};

const COVERED_ITEMS: { ar: string; en: string }[] = [
  { ar: 'التقشر أو الانفصال غير الطبيعي', en: 'Abnormal peeling or delamination' },
  { ar: 'الاصفرار أو تغيّر اللون غير الطبيعي الناتج عن المادة', en: 'Abnormal yellowing or discoloration originating from the material' },
  { ar: 'التشقق غير الطبيعي الناتج عن عيب في المادة', en: 'Abnormal cracking caused by a material defect' },
  { ar: 'انفصال طبقات المنتج الناتج عن عيب مصنعي', en: 'Layer separation caused by a manufacturing defect' },
  { ar: 'الفقاعات غير الطبيعية في المنتجات التي ينطبق عليها ذلك', en: 'Abnormal bubbling in applicable products' },
  { ar: 'الحالات الأخرى التي يثبت بالفحص الفني أنها ناتجة عن عيب مشمول بالضمان', en: 'Other cases proven by technical inspection to result from a covered defect' },
];
const COVERED_NOTE = {
  ar: 'يغطي ضمان ABH AUTO العيوب المصنعية والحالات المشمولة المرتبطة بالمنتج أو الخدمة، وتختلف طبيعة التغطية بحسب المنتج وخصائصه الفنية.',
  en: "ABH AUTO's warranty covers manufacturing defects and covered cases tied to the product or service; the exact coverage varies with each product's technical characteristics.",
};

const SERVICE_DETAILS: { icon: any; title: { ar: string; en: string }; body: { ar: string; en: string } }[] = [
  {
    icon: Sparkles,
    title: { ar: 'خاصية المعالجة الذاتية Self-Healing', en: 'Self-healing property' },
    body: {
      ar: 'أفلام حماية الطلاء PPF المزوّدة بخاصية Self-Healing مصمَّمة للمساعدة في معالجة الخدوش السطحية البسيطة ضمن قدرة الطبقة العلوية للفيلم وفي الظروف المناسبة. أما الخدوش العميقة أو القطع أو الثقوب أو آثار الصدمات فتتجاوز طبيعة هذه الخاصية، ويقوم فريقنا بفحص أي ملاحظة على الأداء وتقييم شمولها بالضمان.',
      en: "Self-healing PPF is designed to help minor surface scratches recede within the top layer's capacity, under suitable conditions. Deep scratches, cuts, punctures, or impact marks fall outside this property's scope; our team inspects any performance concern and assesses warranty coverage.",
    },
  },
  {
    icon: Sun,
    title: { ar: 'ضمان العازل الحراري', en: 'Thermal insulation warranty' },
    body: {
      ar: 'يشمل الضمان العيوب المصنعية المشمولة، مثل التقشر أو انفصال الطبقات أو الفقاعات غير الطبيعية أو التغيّر غير الطبيعي في الفيلم متى ثبت ارتباط الحالة بالمنتج. ولا يشمل الضمان الأضرار الناتجة عن الخدش أو القطع أو كسر الزجاج أو المؤثرات الخارجية.',
      en: 'Covers manufacturing defects such as peeling, layer separation, abnormal bubbling, or abnormal film change once proven product-related. Excludes damage from scratching, cutting, glass breakage, or external influences.',
    },
  },
  {
    icon: Droplets,
    title: { ar: 'ضمان حماية الزجاج الأمامي', en: 'Windshield protection warranty' },
    body: {
      ar: 'يغطي الضمان فيلم حماية الزجاج نفسه والحالات المشمولة المرتبطة بالمنتج. ولا يعني ضمان فيلم الحماية ضمان الزجاج نفسه ضد الكسر أو الشرخ أو الحوادث أو الصدمات أو ضربات الحصى والأجسام الخارجية.',
      en: "Covers the protection film itself and product-related covered cases. It does not extend to the windshield glass against breakage, cracking, accidents, impacts, or debris and stone strikes.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: 'ضمان النانو سيراميك', en: 'Nano ceramic warranty' },
    body: {
      ar: 'يغطي ضمان النانو سيراميك الحالات المشمولة المرتبطة بالمنتج والخدمة وفق الفئة المختارة ومدة ضمانها. ولا يعني ذلك أن طلاء المركبة غير قابل للخدش أو الاتساخ، وتخضع فئات النانو سيراميك لمتطلبات العناية والصيانة الدورية المحددة لها.',
      en: "Covers product- and service-related covered cases per the chosen tier and its warranty length. It does not mean the vehicle's paint becomes scratch- or dirt-proof, and nano ceramic tiers are subject to their required periodic care and maintenance.",
    },
  },
];

const CLAIM_STEPS: { icon: any; title: { ar: string; en: string }; body: { ar: string; en: string } }[] = [
  {
    icon: PhoneCall,
    title: { ar: 'تواصل معنا', en: 'Reach out' },
    body: { ar: 'تواصل مع ABH AUTO عبر القنوات الرسمية مع رقم شهادة الضمان وتفاصيل الحالة.', en: 'Contact ABH AUTO through official channels with your certificate number and case details.' },
  },
  {
    icon: Search,
    title: { ar: 'نفحص الحالة', en: 'We inspect' },
    body: { ar: 'يراجع فريقنا الحالة ويفحصها عند الحاجة، لتحديد سبب المشكلة ومدى شمولها بالضمان.', en: 'Our team reviews and inspects the case as needed to determine the cause and its warranty coverage.' },
  },
  {
    icon: Wrench,
    title: { ar: 'نعالج الحالة المشمولة', en: 'We remedy covered cases' },
    body: { ar: 'إذا ثبت أن الحالة مشمولة، نعالجها بالطريقة الفنية المناسبة: معالجة الجزء المتأثر أو إعادة تنفيذه أو استبداله.', en: "Once confirmed covered, we resolve it with the appropriate technical fix — repairing, redoing, or replacing the affected part." },
  },
  {
    icon: RefreshCcw,
    title: { ar: 'ضمانك مستمر', en: 'Your warranty continues' },
    body: { ar: 'تستمر المدة المتبقية من الضمان الأصلي بعد معالجة الحالة، وفق شروط الضمان والأنظمة المعمول بها.', en: 'The remaining term of the original warranty continues after the case is resolved, per these terms and applicable regulations.' },
  },
];

const EXCLUSIONS: { ar: string; en: string }[] = [
  { ar: 'الحوادث أو الصدمات والاحتكاكات', en: 'Accidents, collisions, and abrasion' },
  { ar: 'الخدوش العميقة أو القطع أو الثقوب الناتجة عن مؤثر خارجي', en: 'Deep scratches, cuts, or punctures from external causes' },
  { ar: 'ضربات الحصى والأجسام الخارجية', en: 'Stone chips and foreign-object impacts' },
  { ar: 'سوء الاستخدام أو الإهمال', en: 'Misuse or neglect' },
  { ar: 'الغسيل أو العناية بطرق أو أدوات غير مناسبة', en: 'Washing or care with unsuitable methods or tools' },
  { ar: 'استخدام مواد كيميائية أو منظفات غير ملائمة للمنتج', en: 'Chemicals or cleaners unsuitable for the product' },
  { ar: 'أعمال السمكرة أو الدهان أو الإصلاحات اللاحقة المؤثرة على المنتج', en: 'Bodywork, repainting, or later repairs affecting the product' },
  { ar: 'تدخل جهة أخرى متى تسبّب في الضرر أو أثّر على تحديد سببه', en: "A third party's intervention where it caused the damage or obscured its cause" },
  { ar: 'الظروف والعوامل الخارجية غير الاعتيادية', en: 'Unusual external conditions and factors' },
  { ar: 'الاستهلاك والتقادم الطبيعي المتناسب مع عمر المنتج واستخدامه', en: "Normal wear consistent with the product's age and use" },
];
const EXCLUSIONS_PAINT = {
  ar: 'ضمان أفلام الحماية لا يُعد ضمانًا لطلاء المركبة الأصلي أو المعاد طلاؤه أو إصلاحه سابقًا، ولا تشمل التغطية أضرارًا ناتجة عن ضعف تماسك الطلاء أو أعمال رش أو سمكرة أو إصلاحات سابقة متى لم يكن سببها المنتج المشمول.',
  en: "Film warranties do not warrant the vehicle's original, repainted, or previously repaired paintwork, nor damage from weak paint adhesion, spraying, bodywork, or prior repairs when the covered product isn't the cause.",
};

const TERMS: { icon: any; title: { ar: string; en: string }; body: { ar: string; en: string } }[] = [
  {
    icon: ClipboardCheck,
    title: { ar: 'الفحص ومعالجة الضمان', en: 'Inspection & claim handling' },
    body: {
      ar: 'يتم تقييم كل مطالبة وفق حالة المنتج وطبيعة المشكلة وسببها، وقد يتطلب ذلك حضور المركبة لإجراء الفحص الفني. ولا يعني ظهور ملاحظة خلال مدة الضمان أن الحالة مشمولة تلقائيًا؛ إذ يُتحقّق من سببها لضمان تطبيق التغطية الصحيحة. لا يستوجب وجود عيب في جزء محدد استبدال الأجزاء السليمة أو كامل الخدمة.',
      en: "Every claim is assessed by the product's condition and the nature and cause of the issue, which may require the vehicle to attend a technical inspection. A concern appearing during the warranty period is not automatically covered — its cause is verified first. A defect in one part does not require replacing sound parts or the entire service.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: 'الحفاظ على الضمان', en: 'Maintaining your warranty' },
    body: {
      ar: 'للمحافظة على الضمان، يلتزم العميل بتعليمات العناية والصيانة الخاصة بالمنتج، وبإبلاغ ABH AUTO عند اكتشاف المشكلة، وتمكينها من فحص الحالة قبل تغييرها أو إصلاحها متى كان ذلك ممكنًا. وتُطبَّق متطلبات الصيانة الدورية على المنتجات التي تشترط ذلك، ومنها فئات النانو سيراميك وفق برنامج العناية الخاص بها.',
      en: "To preserve the warranty, the customer follows the product's care and maintenance instructions, notifies ABH AUTO upon discovering an issue, and allows inspection before altering or repairing it where possible. Periodic maintenance requirements apply to products that require them, including nano ceramic tiers per their care program.",
    },
  },
  {
    icon: Calendar,
    title: { ar: 'مدة الضمان', en: 'Warranty duration' },
    body: {
      ar: 'مدة الضمان هي مدة تغطية للعيوب المشمولة وفق هذه السياسة، ولا تعني ضمان المنتج ضد جميع أنواع التلف أو الحوادث طوال هذه المدة. عند معالجة أو استبدال جزء مشمول، يستمر الضمان وفق المدة المتبقية من الضمان الأصلي.',
      en: "The warranty period covers defects included under this policy — it is not a guarantee against every type of damage or accident throughout that period. When a covered part is repaired or replaced, the warranty continues for the remaining term of the original coverage.",
    },
  },
  {
    icon: FileText,
    title: { ar: 'شهادة ضمان إلكترونية خاصة بمركبتك', en: 'Your electronic warranty certificate' },
    body: {
      ar: 'بعد تنفيذ الخدمة، تصدر ABH AUTO للعميل شهادة ضمان إلكترونية مرتبطة بمركبته تتضمن بيانات المركبة ورقم الوثيقة والخدمات المشمولة ومدة الضمان وتاريخ بدايته ونهايته. وتُعد شهادة الضمان وهذه السياسة مكمِّلتين لبعضهما.',
      en: "After the service, ABH AUTO issues an electronic warranty certificate tied to the vehicle, listing vehicle details, the document number, covered services, and the warranty's start and end dates. The certificate and this policy complement one another.",
    },
  },
  {
    icon: ScrollText,
    title: { ar: 'أحكام عامة', en: 'General provisions' },
    body: {
      ar: 'تخضع سياسة الضمان للأنظمة واللوائح المعمول بها في المملكة العربية السعودية، ولا تمس الحقوق الإلزامية المقررة للعميل نظامًا. تحتفظ ABH AUTO بإصدار سياسة الضمان المرتبط بالخدمة، وتُطبَّق على العميل الشروط السارية على خدمته وفق ما تقضي به الأنظمة.',
      en: "This policy is governed by the applicable laws and regulations of the Kingdom of Saudi Arabia and does not affect the customer's statutory rights. ABH AUTO retains the policy version tied to the service performed, and the terms in force at the time of that service apply to the customer.",
    },
  },
];

/* ══════════════════════════ Component ══════════════════════════ */

export function WarrantyPolicyView() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = <K extends { ar: string; en: string }>(o: K) => (isAr ? o.ar : o.en);
  const [active, setActive] = useState<string>(TOC[0].id);
  const reduce = useReducedMotion();

  useEffect(() => {
    const els = TOC.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const particles = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ id: i, left: (i * 61) % 100, top: ((i * 29) % 70) + 10, delay: (i % 6) * 0.6, duration: 6 + (i % 4) })),
    [],
  );

  return (
    <main className="relative" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="relative isolate overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40">
        <div aria-hidden className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${COVER_IMAGE}')`, filter: 'grayscale(0.75) brightness(0.32) contrast(1.1)' }} />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/92 via-obsidian/78 to-obsidian" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {!reduce && particles.map((p) => (
            <motion.span key={p.id} className="absolute h-0.5 w-0.5 rounded-full" style={{ left: `${p.left}%`, top: `${p.top}%`, background: ACCENT }}
              animate={{ opacity: [0, 0.7, 0], y: [10, -46, -92] }}
              transition={{ duration: p.duration, repeat: Infinity, ease: 'easeOut', delay: p.delay }} />
          ))}
          <div className="glow-orb h-[32rem] w-[32rem] -left-40 -top-24" style={{ background: 'rgba(203,205,205,0.08)' }} />
        </div>

        <div className="container">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-[0.58rem] uppercase tracking-[0.34em]" style={{ color: `${ACCENT}cc` }}>
                <span className="h-px w-8 bg-gradient-to-r from-transparent" style={{ backgroundImage: `linear-gradient(to ${isAr ? 'left' : 'right'}, transparent, ${ACCENT}99)` }} />
                {T(PAGE.kicker)}
              </div>
              <h1 className="mt-3.5 font-display text-[clamp(2.1rem,5.2vw,3.6rem)] font-light uppercase leading-[0.98] tracking-tight text-ivory">
                {T(PAGE.title)}
              </h1>
              <p className="mt-5 max-w-[58ch] text-[0.95rem] leading-relaxed text-platinum/70">{T(PAGE.lead)}</p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={COMPANY_PHONE_HREF} data-cursor="hover">
                  <Button variant="primary" size="md" arrow>{T(PAGE.ctaContact)}</Button>
                </a>
              </div>
            </div>

            {/* شارة التغطية القصوى */}
            <div className="relative flex-none self-stretch">
              <div className="relative flex h-full flex-col items-center justify-center gap-2 rounded-[28px] border px-10 py-9 text-center backdrop-blur-sm"
                style={{ borderColor: `${ACCENT}55`, background: 'linear-gradient(180deg, rgba(203,205,205,0.08), rgba(203,205,205,0.02))' }}>
                <span aria-hidden className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}aa, transparent)` }} />
                <ShieldCheck className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={1.5} />
                <div dir="ltr" className="font-display text-[3.6rem] leading-none text-ivory">{T(PAGE.heroBadgeNum)}</div>
                <div className="max-w-[14ch] text-[0.6rem] uppercase leading-relaxed tracking-[0.16em]" style={{ color: `${ACCENT}dd` }}>{T(PAGE.heroBadgeSub)}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sticky TOC */}
      <div className="sticky top-[84px] z-30 border-y border-white/[0.06] bg-obsidian/80 backdrop-blur-xl">
        <div className="container">
          <nav className="flex gap-1 overflow-x-auto py-3" aria-label={isAr ? 'محتويات السياسة' : 'Policy contents'}>
            {TOC.map((s) => {
              const on = active === s.id;
              return (
                <a key={s.id} href={`#${s.id}`} data-cursor="hover"
                  className="relative flex flex-none items-center rounded-full px-4 py-2.5 text-[0.66rem] uppercase tracking-[0.16em] transition-colors duration-300"
                  style={{ color: on ? '#f5f5f0' : 'rgba(203,205,205,0.6)' }}>
                  {on && (
                    <motion.span layoutId="policy-toc-pill" aria-hidden className="absolute inset-0 -z-10 rounded-full border"
                      style={{ borderColor: `${ACCENT}44`, background: `${ACCENT}14` }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                  )}
                  {isAr ? s.ar : s.en}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="container space-y-24 py-20 md:space-y-28 md:py-24">

        {/* مدد الضمان */}
        <section id="coverage" className="scroll-mt-40">
          <SectionHead eyebrow={isAr ? '01' : '01'} title={T(TOC[0])} />
          <div className="mt-8 overflow-hidden rounded-[28px] border" style={{ borderColor: `${ACCENT}30` }}>
            <div className="relative overflow-hidden px-6 py-5 md:px-9" style={{ background: 'linear-gradient(180deg, rgba(203,205,205,0.1), rgba(203,205,205,0.02))' }}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}88, transparent)` }} />
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={1.6} />
                <span className="font-display text-lg uppercase tracking-wide text-ivory">{isAr ? 'خدماتنا ومدد الضمان' : 'Services & warranty terms'}</span>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: `${ACCENT}1a` }}>
              {COVERAGE_ROWS.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 border-white/[0.05] px-6 py-5 transition-colors duration-300 hover:bg-white/[0.02] md:px-9"
                  style={{ borderColor: `${ACCENT}1a` }}>
                  <span className="text-[0.92rem] text-ivory/90">{isAr ? row.ar : row.en}</span>
                  <span dir="ltr" className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em]"
                    style={{ borderColor: `${ACCENT}40`, color: ACCENT, background: `${ACCENT}0f` }}>
                    {isAr ? row.dur.ar : row.dur.en}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 max-w-[70ch] text-[0.8rem] leading-relaxed text-platinum/55">{T(COVERAGE_NOTE)}</p>
        </section>

        {/* ماذا يغطي */}
        <section id="covered" className="scroll-mt-40">
          <SectionHead eyebrow="02" title={T(TOC[1])} />
          <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-platinum/65">{T(COVERED_NOTE)}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {COVERED_ITEMS.map((it, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease: EASE, delay: (i % 2) * 0.06 }}
                className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full" style={{ background: `${ACCENT}1f`, color: ACCENT }}>
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <span className="text-[0.86rem] leading-relaxed text-ivory/85">{isAr ? it.ar : it.en}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* تفاصيل كل خدمة */}
        <section id="services" className="scroll-mt-40">
          <SectionHead eyebrow="03" title={T(TOC[2])} />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {SERVICE_DETAILS.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, ease: EASE, delay: (i % 2) * 0.08 }}
                className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 md:p-7">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border" style={{ borderColor: `${ACCENT}35`, background: `${ACCENT}0f` }}>
                  <Icon className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={1.6} />
                </span>
                <h3 className="mt-4 font-display text-lg uppercase tracking-wide text-ivory">{isAr ? title.ar : title.en}</h3>
                <p className="mt-2.5 text-[0.84rem] leading-relaxed text-platinum/65">{isAr ? body.ar : body.en}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* خطوات المطالبة */}
        <section id="claim" className="scroll-mt-40">
          <SectionHead eyebrow="04" title={T(TOC[3])} />
          <div className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="pointer-events-none absolute top-6 hidden h-px lg:block"
              style={{ insetInlineStart: '12.5%', insetInlineEnd: '12.5%', background: `linear-gradient(to right, transparent, ${ACCENT}40, ${ACCENT}40, transparent)` }} />
            {CLAIM_STEPS.map(({ icon: Icon, title, body }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
                className="relative">
                <div className="relative z-10 flex items-center gap-3">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-full border-2 bg-obsidian" style={{ borderColor: ACCENT, color: ACCENT }}>
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span dir="ltr" className="font-display text-2xl text-platinum/30">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mt-4 font-display text-base uppercase tracking-wide text-ivory">{isAr ? title.ar : title.en}</h3>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-platinum/60">{isAr ? body.ar : body.en}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* غير المشمول */}
        <section id="exclusions" className="scroll-mt-40">
          <SectionHead eyebrow="05" title={T(TOC[4])} />
          <div className="mt-8 overflow-hidden rounded-[26px] border border-[#7c1a1a]/25 bg-[#2a1414]/[0.12]">
            <div className="flex items-center gap-3 border-b border-[#7c1a1a]/20 px-6 py-4 md:px-8">
              <AlertTriangle className="h-[18px] w-[18px] text-[#e7b4b4]" strokeWidth={1.7} />
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#e7b4b4]">
                {isAr ? 'الضمان مخصص للعيوب المرتبطة بالمنتج، ولا يشمل الأضرار الناتجة عن:' : 'The warranty covers product-related defects only; it excludes damage from:'}
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2 md:p-8">
              {EXCLUSIONS.map((it, i) => (
                <div key={i} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 flex-none text-[#c98a8a]" strokeWidth={1.8} />
                  <span className="text-[0.82rem] leading-relaxed text-platinum/70">{isAr ? it.ar : it.en}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="mb-1.5 text-[0.62rem] uppercase tracking-[0.2em] text-platinum/55">{isAr ? 'طلاء المركبة' : "Vehicle's paintwork"}</div>
            <p className="text-[0.82rem] leading-relaxed text-platinum/65">{T(EXCLUSIONS_PAINT)}</p>
          </div>
        </section>

        {/* أحكام عامة */}
        <section id="terms" className="scroll-mt-40">
          <SectionHead eyebrow="06" title={T(TOC[5])} />
          <div className="mt-8 space-y-3">
            {TERMS.map(({ icon: Icon, title, body }, i) => (
              <TermAccordion key={i} icon={Icon} title={isAr ? title.ar : title.en} body={isAr ? body.ar : body.en} defaultOpen={i === 0} />
            ))}
          </div>
        </section>

        {/* رقم الإصدار فقط – بدون فوتر */}
        <div className="flex flex-col items-center gap-3 border-t border-white/[0.08] pt-14 text-center">
          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[0.6rem] uppercase tracking-[0.16em] text-platinum/60">
            <span>{T(PAGE.effective)} {POLICY_VERSION}</span>
            <span className="h-1 w-1 rounded-full bg-platinum/30" />
            <span>{T(PAGE.effectiveDate)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ══════════════════════════ Helpers ══════════════════════════ */

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-end gap-4">
      <span dir="ltr" className="font-display text-sm leading-none" style={{ color: `${ACCENT}99` }}>{eyebrow}</span>
      <h2 className="font-display text-2xl font-light uppercase tracking-tight text-ivory md:text-[1.85rem]">{title}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/12 to-transparent" />
    </div>
  );
}

function TermAccordion({ icon: Icon, title, body, defaultOpen }: { icon: any; title: string; body: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <button type="button" data-cursor="hover" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-4 text-start md:px-6">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl border" style={{ borderColor: `${ACCENT}30`, background: `${ACCENT}0f` }}>
          <Icon className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.7} />
        </span>
        <span className="flex-1 text-[0.9rem] font-medium text-ivory/90">{title}</span>
        <ChevronDown className={`h-4 w-4 flex-none text-platinum/50 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden">
            <p className="px-5 pb-5 text-[0.82rem] leading-relaxed text-platinum/65 md:px-6 md:ps-[3.75rem]">{body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}