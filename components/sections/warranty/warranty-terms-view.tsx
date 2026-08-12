'use client';

/**
 * WarrantyTermsView — الصفحة المستقلة لـ«شروط وأحكام الضمان» الكاملة.
 * فُصلت عن صفحة سياسة الضمان الرئيسية (WarrantyPolicyView) لتكون صفحة قانونية
 * قائمة بذاتها — بنفس أسلوب صفحات الـTerms & Conditions في المواقع العالمية.
 */
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowLeft, XCircle, AlertTriangle, ClipboardCheck, ShieldCheck, Calendar, FileText, ScrollText, ChevronDown } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;
const ACCENT = '#cbcdcd';
const POLICY_VERSION = '1.0';

const PAGE = {
  kicker: { ar: 'ABH AUTO', en: 'ABH AUTO' },
  title: { ar: 'شروط وأحكام الضمان', en: 'Warranty terms & conditions' },
  lead: {
    ar: 'الوثيقة القانونية الكاملة لضمان ABH AUTO — الحالات غير المشمولة، طلاء المركبة، إجراءات الفحص والمطالبة، الحفاظ على الضمان، مدته، الشهادة الإلكترونية، والأحكام العامة.',
    en: "The complete legal document for the ABH AUTO warranty — exclusions, vehicle paintwork, inspection & claim handling, maintaining your warranty, its duration, the e-certificate, and general provisions.",
  },
  back: { ar: 'رجوع لسياسة الضمان', en: 'Back to warranty policy' },
  effective: { ar: 'الإصدار', en: 'Version' },
  effectiveDate: { ar: 'ساري من أغسطس 2026', en: 'Effective August 2026' },
};

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

export function WarrantyTermsView() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = <K extends { ar: string; en: string }>(o: K) => (isAr ? o.ar : o.en);

  return (
    <main className="relative pb-24 pt-32 md:pt-40" dir={isAr ? 'rtl' : 'ltr'}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-gradient-to-b from-white/[0.04] to-transparent" />

      <div className="container max-w-3xl">
        <Link href="/warranty-policy" data-cursor="hover"
          className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-platinum/60 transition-colors hover:text-ivory">
          <ArrowLeft className="reversible-icon h-3.5 w-3.5" strokeWidth={1.8} />
          {T(PAGE.back)}
        </Link>

        <div className="mt-6 flex items-center gap-3 text-[0.58rem] uppercase tracking-[0.34em]" style={{ color: `${ACCENT}cc` }}>
          <ScrollText className="h-3.5 w-3.5" strokeWidth={1.8} />
          {T(PAGE.kicker)}
        </div>
        <h1 className="mt-3.5 font-display text-[clamp(1.9rem,4.4vw,2.9rem)] font-light uppercase leading-[1.05] tracking-tight text-ivory">
          {T(PAGE.title)}
        </h1>
        <p className="mt-5 max-w-[62ch] text-[0.92rem] leading-relaxed text-platinum/65">{T(PAGE.lead)}</p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[0.6rem] uppercase tracking-[0.16em] text-platinum/60">
          <span>{T(PAGE.effective)} {POLICY_VERSION}</span>
          <span className="h-1 w-1 rounded-full bg-platinum/30" />
          <span>{T(PAGE.effectiveDate)}</span>
        </div>

        {/* الحالات غير المشمولة */}
        <section className="mt-16">
          <h2 className="font-display text-xl uppercase tracking-tight text-ivory md:text-2xl">
            {isAr ? 'الحالات غير المشمولة' : 'Not covered'}
          </h2>
          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#7c1a1a]/25 bg-[#2a1414]/[0.12]">
            <div className="flex items-center gap-3 border-b border-[#7c1a1a]/20 px-6 py-4">
              <AlertTriangle className="h-[18px] w-[18px] text-[#e7b4b4]" strokeWidth={1.7} />
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#e7b4b4]">
                {isAr ? 'الضمان مخصص للعيوب المرتبطة بالمنتج، ولا يشمل الأضرار الناتجة عن:' : 'The warranty covers product-related defects only; it excludes damage from:'}
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
              {EXCLUSIONS.map((it, i) => (
                <div key={i} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 flex-none text-[#c98a8a]" strokeWidth={1.8} />
                  <span className="text-[0.82rem] leading-relaxed text-platinum/70">{isAr ? it.ar : it.en}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* طلاء المركبة */}
        <section className="mt-8">
          <h2 className="font-display text-lg uppercase tracking-tight text-ivory">
            {isAr ? 'طلاء المركبة' : "Vehicle's paintwork"}
          </h2>
          <p className="mt-3 text-[0.86rem] leading-relaxed text-platinum/65">{T(EXCLUSIONS_PAINT)}</p>
        </section>

        {/* بقية الأحكام */}
        <section className="mt-16 space-y-3">
          {TERMS.map(({ icon: Icon, title, body }, i) => (
            <TermAccordion key={i} icon={Icon} title={isAr ? title.ar : title.en} body={isAr ? body.ar : body.en} defaultOpen={i === 0} />
          ))}
        </section>

        <div className="mt-16 flex flex-col items-center gap-3 border-t border-white/[0.08] pt-10 text-center">
          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[0.6rem] uppercase tracking-[0.16em] text-platinum/60">
            <span>{T(PAGE.effective)} {POLICY_VERSION}</span>
            <span className="h-1 w-1 rounded-full bg-platinum/30" />
            <span>{T(PAGE.effectiveDate)}</span>
          </div>
          <Link href="/warranty-policy" data-cursor="hover" className="text-[0.68rem] uppercase tracking-[0.18em] text-platinum/60 transition-colors hover:text-ivory">
            {T(PAGE.back)}
          </Link>
        </div>
      </div>
    </main>
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