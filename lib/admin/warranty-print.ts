/**
 * lib/admin/warranty-print.ts — طباعة "بطاقة/شهادة الضمان" الرسمية لـ ABH AUTO.
 *
 * نفس فلسفة invoice-print.ts (نافذة طباعة حقيقية، RTL صحيح، لوجو كصورة،
 * تروح لـPDF أو ورق بضغطة) لكن للضمان بدل الفاتورة:
 *   • تُطبع فقط بعد تأكيد الدفع (استدعِها بعد pay.paid === true).
 *   • تعرض مدة الضمان الفعلية لكل خدمة في الحجز (booking_items.warranty_months
 *     / warranty_expires_at) — مش نص ثابت.
 *   • تتضمن كل بنود سياسة الضمان الرسمية: تعريف العيب المشمول، الاستثناءات،
 *     التزامات الشركة، مسؤولية العميل، وآلية التفعيل والمطالبة.
 *   • رقم وثيقة ضمان مبني على رقم الفاتورة (بعد الدفع) + QR للتحقق.
 *
 * الاستخدام:
 *   printBookingWarranty(b, { isAr, ccy });
 */

/* ══════════════ إعدادات الشركة ══════════════ */
const COMPANY = {
  name: "ABH AUTO",
  unifiedNumber: "7034913488",
  vatNumber: "311829832800003",
  website: "https://abh-auto.com/",
};

const LOGO_LIGHT_SRC = "/images/logo3.webp";
const LOGO_DARK_SRC = "/images/logo-black.webp";

/* ══════════════ نصوص السياسة (من وثيقة الضمان الرسمية) ══════════════ */
const PRINCIPLE = {
  ar: "يُفعَّل الضمان من لحظة استلام العميل لمركبته وُيرسَل للعميل على هاتفه من النظام. يُطبَّق حصرًا عند وجود خلل مصنعي في المادة أو خطأ فني نتج عن التركيب، وُيثبَت بالفحص المادي من فريقنا الفني. كل حالة لا تندرج ضمن هذه التعريفات تقع خارج نطاق الضمان.",
  en: "The warranty is activated the moment the customer receives their vehicle, and an electronic notice is sent to the customer's phone. It applies exclusively to a manufacturing defect in the material or an installation error, verified by physical inspection by our technical team. Any case outside these definitions falls outside the warranty scope.",
};

const MANUFACTURING_DEFECTS = {
  ar: [
    "ظهور فقاعات هوائية في الطبقة أو الفيلم",
    "تقشر أو انفصال الطبقة دون تدخل خارجي",
    "اصفرار أو تغير اللون بشكل غير متجانس من داخل المادة",
    "فقدان خاصية طرد الماء أو المعالجة الذاتية",
    "تكسّر أو تشقق الفيلم الناتج عن عيب في المادة",
  ],
  en: [
    "Air bubbles appearing under the coating or film",
    "Peeling or separation of the layer without external interference",
    "Uneven yellowing or discoloration from within the material",
    "Loss of hydrophobic / self-healing properties",
    "Cracking of the film caused by a material defect",
  ],
};
const INSTALLATION_DEFECTS = {
  ar: [
    "خطوط أو آثار أدوات التركيب ظهرت قبل أو أثناء التسليم",
    "عدم استواء الحواف أو ظهور فراغات عند أطراف الفيلم",
    "تداخل أو تجعد في الفيلم",
    "أي خلل يُثبَت بالفحص أن مصدره عملية التطبيق",
  ],
  en: [
    "Tool marks or lines visible before or during handover",
    "Uneven edges or gaps at the film's borders",
    "Film overlap or wrinkling",
    "Any defect proven by inspection to originate from the application process",
  ],
};

const EXCLUSIONS: { titleAr: string; titleEn: string; ar: string[]; en: string[] }[] = [
  {
    titleAr: "أضرار الاستخدام والإهمال الشخصي", titleEn: "Usage & personal neglect damage",
    ar: [
      "الخدوش الناتجة عن الاستخدام اليومي أو الغسيل الآلي بالفراشي",
      "استخدام مواد تنظيف تحتوي على مواد حمضية أو قلوية شديدة غير موصى بها",
      "الخدوش العميقة التي تخترق طبقة الفيلم بفعل ضغط خارجي",
      "فقدان لمعان السيراميك الناتج عن إهمال الصيانة السنوية",
      "التلف الناتج عن وقوف السيارة في أماكن مكشوفة دون عناية مناسبة",
    ],
    en: [
      "Scratches from daily use or automatic brush car washes",
      "Use of cleaning products with strong acidic/alkaline agents not recommended by us",
      "Deep scratches that penetrate the film due to external pressure",
      "Loss of ceramic gloss due to neglecting annual maintenance",
      "Damage from parking in exposed areas without proper care",
    ],
  },
  {
    titleAr: "أضرار الحوادث والقوة القاهرة", titleEn: "Accidents & force majeure",
    ar: [
      "أي ضرر ناتج عن حادث سير أو اصطدام أو سقوط جسم صلب",
      "أضرار حوادث الطبيعة: البَرَد، الفيضانات، الحرائق، العواصف الرملية",
      "التشوهات الناتجة عن درجات حرارة قصوى غير عادية",
      "الأضرار الناتجة عن مواد كيميائية حارقة كالقطران والأصباغ",
    ],
    en: [
      "Any damage from a traffic accident, collision, or falling object",
      "Damage from natural events: hail, floods, fires, sandstorms",
      "Deformation caused by unusual extreme temperatures",
      "Damage from corrosive chemicals such as tar and paint",
    ],
  },
  {
    titleAr: "التدخل الخارجي وإسقاط الضمان", titleEn: "External tampering (voids warranty)",
    ar: [
      "إجراء أي إصلاح أو تعديل على الفيلم من جهة غير مصرح بها منّا كتابةً",
      "محاولة إزالة الفيلم ذاتيًا أو من ورشة أخرى دون إشعارنا مسبقًا",
      "تطبيق أي مادة كيميائية على الطبقة المضمونة دون الرجوع إلينا",
      "إجراء أعمال طلاء أو إصلاح هيكلي مجاور دون حماية مناطق الضمان",
      "نقل ملكية السيارة دون تحديث بيانات الضمان باسم المالك الجديد في النظام",
    ],
    en: [
      "Repair or modification of the film by a party not authorized by us in writing",
      "Attempting to remove the film yourself or at another shop without prior notice",
      "Applying any chemical to the warrantied coating without consulting us",
      "Nearby paint or structural repair work without protecting the warrantied areas",
      "Transferring vehicle ownership without updating the warranty record in the system",
    ],
  },
  {
    titleAr: "استثناءات النانو سيراميك تحديدًا", titleEn: "Nano ceramic — specific exclusions",
    ar: [
      "البهتان التدريجي الطبيعي الناتج عن التعرض المستمر للأشعة فوق البنفسجية",
      "عدم التوهج في حال عدم إجراء الصيانة السنوية في موعدها المحدد",
    ],
    en: [
      "Natural gradual fading from continuous UV exposure",
      "Loss of gloss if the annual maintenance is not performed on schedule",
    ],
  },
];

const COMMITMENTS: { titleAr: string; titleEn: string; ar: string; en: string }[] = [
  { titleAr: "الإصلاح المجاني", titleEn: "Free repair", ar: "نتكفل بإصلاح أي عيب مشمول دون أي تكلفة، شاملًا قيمة المادة ويد العمل.", en: "We cover the repair of any covered defect at no cost, including material and labor." },
  { titleAr: "الاستبدال الكامل", titleEn: "Full replacement", ar: "في حال تعذّر الإصلاح، نستبدل الطبقة أو الفيلم كاملًا بمواد من الدرجة ذاتها أو أعلى.", en: "If repair isn't possible, we fully replace the coating or film with material of the same or higher grade." },
  { titleAr: "الفحص المجاني", titleEn: "Free inspection", ar: "يحق للعميل طلب فحص فني في أي وقت خلال مدة الضمان عبر حجز موعد في النظام.", en: "The customer may request a technical inspection at any time during the warranty period via the system." },
  { titleAr: "توثيق الحالة", titleEn: "Condition documentation", ar: "نوثّق حالة العمل بالصور عند التسليم وعند المطالبة بالضمان لحماية حق الطرفين.", en: "We document the work with photos at handover and at any claim, to protect both parties." },
  { titleAr: "الشفافية الكاملة", titleEn: "Full transparency", ar: "في حال رفض المطالبة، نقدّم تقريرًا مكتوبًا يوضح السبب مع الصور الداعمة.", en: "If a claim is declined, we provide a written report explaining why, with supporting photos." },
];

const RESPONSIBILITIES: { titleAr: string; titleEn: string; ar: string; en: string }[] = [
  { titleAr: "الإبلاغ الفوري عن العيوب", titleEn: "Immediate defect reporting", ar: "يجب الإبلاغ عن أي عيب فور اكتشافه؛ التأخر يُصعّب الإثبات وقد يؤثر على قبول الطلب.", en: "Any defect must be reported as soon as discovered; delay complicates proof and may affect approval." },
  { titleAr: "استخدام منتجات موصى بها", titleEn: "Use recommended products", ar: "الالتزام بمواد التنظيف المتوافقة الموضحة في وثيقة الضمان الإلكترونية.", en: "Only compatible cleaning products listed in the electronic warranty document may be used." },
  { titleAr: "الحفاظ على وثيقة الضمان", titleEn: "Keep the warranty document", ar: "الوثيقة الإلكترونية من النظام هي المرجع الرسمي؛ لا تُقبل طلبات بدون رقم الوثيقة.", en: "The system's electronic document is the official reference; claims without a document number are not accepted." },
];

const ACTIVATION_STEPS: { ar: string; en: string }[] = [
  { ar: "الإبلاغ عن العيب — تواصل عبر القنوات الرسمية فور اكتشاف العيب، مع صور واضحة ورقم وثيقة الضمان.", en: "Report the defect — contact us via official channels as soon as it's found, with clear photos and the document number." },
  { ar: "التقييم الأولي — نرد خلال 24 ساعة عمل ونحدد إن كان العيب يستدعي زيارة فعلية.", en: "Initial assessment — we respond within 24 business hours and decide if an in-person visit is needed." },
  { ar: "حجز موعد الفحص — يحجز العميل موعدًا في النظام ويحضر للمركز؛ الفحص مجاني بالكامل.", en: "Book an inspection — the customer schedules a visit in the system; inspection is fully free." },
  { ar: "القرار الرسمي — نصدر قرارًا مكتوبًا بالقبول أو الرفض مع مبرراته والصور الداعمة.", en: "Official decision — a written decision (approve/decline) is issued with reasoning and supporting photos." },
  { ar: "الإصلاح أو الاستبدال — يتم التنفيذ، وتستمر مدة الضمان المتبقية سارية دون انقطاع.", en: "Repair or replacement — carried out; the remaining warranty period continues uninterrupted." },
];

/* ══════════════ الأنواع ══════════════ */
type WarrantyService = {
  name: string;
  isGift?: boolean;
  warrantyMonths?: number | null;
  warrantyExpiresAt?: string | null;
};
export type WarrantyBooking = {
  reference: string;
  invoiceNumber?: number;
  vehicle?: string;
  plate?: string;
  size?: string;
  customer?: string;
  phone?: string;
  email?: string;
  city?: string;
  branch?: string;
  date?: string;
  time?: string;
  deliveredAt?: string;
  services?: WarrantyService[];
};

/* ══════════════ أدوات مساعدة ══════════════ */
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fmtDate(iso: string | undefined, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso); if (isNaN(+d)) return iso;
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function addMonths(iso: string, months: number) {
  const d = new Date(iso); if (isNaN(+d)) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}
function durationLabel(months: number | null | undefined, isAr: boolean) {
  const m = Number(months) || 0;
  if (m <= 0) return isAr ? "غير محدد" : "Not specified";
  if (m % 12 === 0) {
    const y = m / 12;
    if (isAr) return y === 1 ? "سنة واحدة" : y === 2 ? "سنتان" : `${y} سنوات`;
    return `${y} ${y === 1 ? "year" : "years"}`;
  }
  if (isAr) return m === 1 ? "شهر واحد" : m === 2 ? "شهرين" : `${m} أشهر`;
  return `${m} ${m === 1 ? "month" : "months"}`;
}
function resolveWarrantyNo(b: WarrantyBooking): string {
  if (b.invoiceNumber != null && Number(b.invoiceNumber) > 0) {
    return `WR-${String(Math.trunc(Number(b.invoiceNumber))).padStart(6, "0")}`;
  }
  return `WR-${b.reference || "—"}`;
}
function coverageHeadline(services: WarrantyService[], isAr: boolean) {
  const withWarranty = services.filter((s) => Number(s.warrantyMonths) > 0);
  if (withWarranty.length === 0) {
    return { hasCoverage: false, label: "", sub: isAr ? "مدة الضمان تختلف حسب كل خدمة — التفاصيل بالجدول بالأسفل" : "Warranty length varies per service — see the table below" };
  }
  const max = Math.max(...withWarranty.map((s) => Number(s.warrantyMonths)));
  if (max % 12 === 0) return { hasCoverage: true, label: String(max / 12), sub: isAr ? "سنة ضمان (أعلى تغطية)" : "years warranty (max coverage)" };
  return { hasCoverage: true, label: String(max), sub: isAr ? "شهر ضمان (أعلى تغطية)" : "months warranty (max coverage)" };
}
function warrantyQrPayload(b: WarrantyBooking): string {
  try {
    return `${COMPANY.website}?warranty=${encodeURIComponent(resolveWarrantyNo(b))}&ref=${encodeURIComponent(b.reference || "")}`;
  } catch { return ""; }
}
function logoLight(height = 66) {
  const fallback = `<div style="line-height:1;"><div style="font:700 24px Georgia,serif;letter-spacing:1.5px;color:#fff;">ABH<span style="color:#c2a04e;">.</span></div><div style="font-size:8px;letter-spacing:6px;color:#cbcdcd;margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div></div>`;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${LOGO_LIGHT_SRC}" alt="ABH AUTO" style="height:${height}px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}

/* ══════════════ توليد الـHTML ══════════════ */
function warrantyHtml(b: WarrantyBooking, isAr: boolean) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";
  const gold = "#c2a04e";
  const services = (b.services || []).filter((s) => s && s.name);
  const docNo = resolveWarrantyNo(b);
  const issuedDate = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const startDate = b.deliveredAt || b.date || "";
  const headline = coverageHeadline(services, isAr);
  const qr = warrantyQrPayload(b);

  const cardOpen = (title: string) => `
    <div style="border:1px solid #e7e3d8;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 0 #f2efe6;margin-bottom:16px;">
      <div style="background:linear-gradient(90deg,#faf8f2,#fff);border-bottom:1px solid #efe9db;padding:9px 16px;display:flex;align-items:center;gap:8px;">
        <span style="height:8px;width:8px;border-radius:99px;background:${gold};display:inline-block;"></span>
        <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${gold};font-weight:700;">${esc(title)}</span>
      </div>
      <div style="padding:14px 16px;">`;
  const cardClose = `</div></div>`;

  const info = (l: string, v: string, ltr = false) =>
    `<div style="margin-bottom:9px;"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:2px;">${esc(l)}</div><div ${ltr ? 'dir="ltr"' : ""} style="font-size:13px;color:#15161a;text-align:${sA};font-weight:600;">${esc(v || "—")}</div></div>`;

  /* صفوف جدول الخدمات المضمونة الفعلية في هذا الحجز */
  const serviceRows = services.length === 0
    ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const months = Number(s.warrantyMonths) || 0;
        const expires = s.warrantyExpiresAt || (months > 0 && startDate ? addMonths(startDate, months) : null);
        return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:11px 14px;font-size:12.5px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;font-weight:600;">${esc(s.name)}${s.isGift ? ` <span style="font-size:9px;color:${gold};">(${T("هدية", "Gift")})</span>` : ""}</td>
          <td dir="ltr" style="padding:11px 14px;font-size:12.5px;color:${months > 0 ? "#1f9d6b" : "#9a9ea4"};text-align:center;border-bottom:1px solid #ece9e1;font-weight:700;white-space:nowrap;">${esc(durationLabel(months, isAr))}</td>
          <td dir="ltr" style="padding:11px 14px;font-size:11.5px;color:#6c7077;text-align:${eA};border-bottom:1px solid #ece9e1;white-space:nowrap;">${expires ? esc(fmtDate(expires, isAr)) : "—"}</td>
        </tr>`;
      }).join("");

  const bulletList = (items: string[]) =>
    `<ul style="margin:0;padding-inline-start:18px;font-size:11.5px;line-height:1.85;color:#4a4d52;text-align:${sA};">${items.map((p) => `<li style="margin-bottom:5px;">${esc(p)}</li>`).join("")}</ul>`;

  const exclusionBlocks = EXCLUSIONS.map((g) => `
    <div style="margin-bottom:12px;">
      <div style="font-size:11.5px;font-weight:700;color:#a23b30;margin-bottom:6px;">${esc(isAr ? g.titleAr : g.titleEn)}</div>
      ${bulletList(isAr ? g.ar : g.en)}
    </div>`).join("");

  const commitmentRows = COMMITMENTS.map((c) => `
    <div style="display:flex;gap:10px;margin-bottom:11px;">
      <span style="flex:0 0 auto;height:20px;width:20px;border-radius:99px;background:#e7f7ef;color:#1f9d6b;display:grid;place-items:center;font-size:11px;font-weight:800;">✓</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:#15161a;">${esc(isAr ? c.titleAr : c.titleEn)}</div>
        <div style="font-size:11px;color:#6c7077;line-height:1.6;margin-top:2px;">${esc(isAr ? c.ar : c.en)}</div>
      </div>
    </div>`).join("");

  const responsibilityRows = RESPONSIBILITIES.map((r) => `
    <div style="display:flex;gap:10px;margin-bottom:11px;">
      <span style="flex:0 0 auto;height:20px;width:20px;border-radius:99px;background:#e7f7ef;color:#1f9d6b;display:grid;place-items:center;font-size:11px;font-weight:800;">✓</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:#15161a;">${esc(isAr ? r.titleAr : r.titleEn)}</div>
        <div style="font-size:11px;color:#6c7077;line-height:1.6;margin-top:2px;">${esc(isAr ? r.ar : r.en)}</div>
      </div>
    </div>`).join("");

  const stepRows = ACTIVATION_STEPS.map((s, i) => `
    <div style="display:flex;gap:11px;margin-bottom:11px;">
      <span style="flex:0 0 auto;height:22px;width:22px;border-radius:99px;background:#0c0d0e;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;">${i + 1}</span>
      <div style="font-size:11.5px;color:#3a3d42;line-height:1.7;padding-top:1px;">${esc(isAr ? s.ar : s.en)}</div>
    </div>`).join("");

  return `
  <div style="width:190mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <!-- الهيدر -->
    <div style="background:#0c0d0e;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoLight()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 19px Georgia,serif;letter-spacing:5px;color:#fff;">${T("شهادة ضمان", "WARRANTY CERTIFICATE")}</div>
        <div dir="ltr" style="font-size:12px;color:#e4c979;margin-top:7px;text-align:${eA};font-weight:700;">${T("وثيقة", "Doc")} #${esc(docNo)}</div>
        <div dir="ltr" style="font-size:11px;color:#aeb2b7;margin-top:3px;text-align:${eA};">${T("حجز", "Booking")} ${esc(b.reference)}</div>
        <div style="font-size:10.5px;color:#8b8f95;margin-top:2px;">${T("بتاريخ", "Issued")} ${esc(issuedDate)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>

    <div style="background:#faf8f2;border-bottom:1px solid #efe9db;padding:11px 32px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 26px;font-size:11.5px;color:#3a3d42;">
      <span style="font-weight:800;color:#0c0d0e;letter-spacing:.5px;">${esc(COMPANY.name)}</span>
      <span>${T("الرقم الموحّد", "Unified No.")}: <b dir="ltr" style="color:#0c0d0e;">${esc(COMPANY.unifiedNumber)}</b></span>
      <span>${T("الرقم الضريبي", "VAT No.")}: <b dir="ltr" style="color:#0c0d0e;">${esc(COMPANY.vatNumber)}</b></span>
    </div>

    <div style="padding:22px 32px;">

      <!-- شريط التغطية الرئيسي -->
      <div style="display:flex;gap:18px;align-items:stretch;margin-bottom:18px;">
        ${headline.hasCoverage ? `<div style="width:150px;flex:0 0 auto;border:1.5px solid ${gold};border-radius:16px;padding:16px 10px;text-align:center;background:linear-gradient(180deg,#fff,#faf8f2);">
          <div dir="ltr" class="abh-num" style="font-size:40px;font-weight:800;color:#0c0d0e;line-height:1;">${esc(headline.label)}</div>
          <div style="font-size:9.5px;color:#6c7077;margin-top:8px;line-height:1.5;">${esc(headline.sub)}</div>
        </div>` : ""}
        <div style="flex:1;border:1px solid #e7e3d8;border-radius:16px;padding:16px 18px;background:#fff;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:6px;">${T("بداية سريان الضمان", "Warranty starts")}</div>
          <div style="font-size:15px;color:#15161a;font-weight:700;">${startDate ? esc(fmtDate(startDate, isAr)) : T("تُحدَّد عند استلام العميل لمركبته", "Set upon vehicle handover to customer")}</div>
          <div style="font-size:11px;color:#6c7077;margin-top:8px;line-height:1.7;">${esc(PRINCIPLE[isAr ? "ar" : "en"])}</div>
          ${!headline.hasCoverage ? `<div style="font-size:11px;color:${gold};margin-top:10px;line-height:1.6;font-weight:700;">${esc(headline.sub)}</div>` : ""}
        </div>
      </div>

      <!-- بيانات العميل + السيارة -->
      <div style="display:flex;gap:18px;margin-bottom:6px;">
        <div style="flex:1;">
          ${cardOpen(T("بيانات العميل", "Customer"))}
            ${info(T("الاسم", "Name"), b.customer || "—")}
            ${info(T("التليفون", "Phone"), b.phone || "—", true)}
            ${info(T("المدينة", "City"), b.city || "—")}
          ${cardClose}
        </div>
        <div style="flex:1;">
          ${cardOpen(T("السيارة والفرع", "Vehicle & branch"))}
            ${info(T("السيارة", "Vehicle"), b.vehicle || "—")}
            ${info(T("اللوحة", "Plate"), b.plate || "—", true)}
            ${info(T("الفرع", "Branch"), b.branch || "—")}
          ${cardClose}
        </div>
      </div>

      <!-- جدول الخدمات المضمونة فعليًا -->
      ${cardOpen(T("الخدمات المضمونة في هذا الحجز", "Services covered in this booking"))}
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#0c0d0e;">
            <th style="padding:9px 14px;font-size:9.5px;letter-spacing:1.5px;color:#fff;text-align:${sA};">${T("الخدمة", "Service")}</th>
            <th style="padding:9px 14px;font-size:9.5px;letter-spacing:1.5px;color:#fff;text-align:center;">${T("مدة الضمان", "Warranty")}</th>
            <th style="padding:9px 14px;font-size:9.5px;letter-spacing:1.5px;color:#fff;text-align:${eA};">${T("ينتهي في", "Expires")}</th>
          </tr></thead>
          <tbody>${serviceRows}</tbody>
        </table>
      ${cardClose}

      <!-- المبدأ + العيب المشمول -->
      ${cardOpen(T("العيب المشمول بالضمان", "What's covered"))}
        <div style="font-size:11.5px;font-weight:700;color:#1f9d6b;margin-bottom:6px;">${T("عيب مصنعي", "Manufacturing defect")}</div>
        ${bulletList(isAr ? MANUFACTURING_DEFECTS.ar : MANUFACTURING_DEFECTS.en)}
        <div style="height:1px;background:#ece9e1;margin:10px 0;"></div>
        <div style="font-size:11.5px;font-weight:700;color:#1f9d6b;margin-bottom:6px;">${T("خطأ التركيب", "Installation error")}</div>
        ${bulletList(isAr ? INSTALLATION_DEFECTS.ar : INSTALLATION_DEFECTS.en)}
      ${cardClose}

      <!-- ما لا يشمله الضمان -->
      ${cardOpen(T("ما لا يشمله الضمان", "What's not covered"))}
        ${exclusionBlocks}
      ${cardClose}

      <!-- التزاماتنا -->
      ${cardOpen(T("التزاماتنا تجاه العميل", "Our commitments to you"))}
        ${commitmentRows}
      ${cardClose}

      <!-- مسؤولية العميل -->
      ${cardOpen(T("مسؤولية العميل للحفاظ على الضمان", "Customer responsibilities"))}
        ${responsibilityRows}
      ${cardClose}

      <!-- آلية المطالبة -->
      ${cardOpen(T("آلية تفعيل الضمان والمطالبة", "Warranty activation & claim process"))}
        ${stepRows}
      ${cardClose}

      <!-- QR + توثيق -->
      <div style="display:flex;align-items:center;gap:16px;border:1px solid #e7e3d8;border-radius:14px;padding:14px 16px;margin-bottom:6px;">
        ${qr ? `<div id="warranty-qr" style="width:88px;height:88px;flex:0 0 auto;"></div>` : ""}
        <div style="font-size:10.5px;color:#9a9ea4;line-height:1.7;">
          ${T("امسح للتحقّق من صلاحية بطاقة الضمان إلكترونيًا", "Scan to verify this warranty card electronically")}<br/>
          ${T("هذه الوثيقة الإلكترونية الصادرة من النظام هي المرجع الرسمي الوحيد المعتمد.", "This system-issued electronic document is the sole official reference.")}
        </div>
      </div>
    </div>

    <!-- الفوتر -->
    <div style="border-top:1px solid #ece9e1;padding:15px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="font-size:11.5px;color:#3a3d42;font-weight:600;">${T("شكرًا لثقتك في ABH AUTO", "Thank you for trusting ABH AUTO")}</div>
      <a href="${esc(COMPANY.website)}" dir="ltr" style="font-size:11px;color:#c2a04e;letter-spacing:1px;text-decoration:none;font-weight:700;">${esc(COMPANY.website)}</a>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة فورية ببطاقة الضمان (A4). استدعِها فقط بعد تأكيد الدفع. */
export function printBookingWarranty(b: WarrantyBooking, opts: { isAr: boolean; ccy?: string }): void {
  const { isAr } = opts;
  const body = warrantyHtml(b, isAr);
  const qrData = warrantyQrPayload(b);
  const docNo = resolveWarrantyNo(b);

  const doc = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(docNo)}</title>
    ${qrData ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>` : ""}
    <style>
      @page { size: A4; margin: 8mm; }
      *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
      html,body{ margin:0; padding:0; background:#fff; }
      #warranty-qr img, #warranty-qr canvas{ display:block; margin:0 auto; }
      @media screen { body{ padding:14px; background:#e9e9e6; } }
    </style></head>
    <body>${body}
    <script>
      (function(){
        var qrData = ${JSON.stringify(qrData)};
        var qrEl = document.getElementById('warranty-qr');
        if (qrData && qrEl && typeof QRCode !== 'undefined') {
          try { new QRCode(qrEl, { text: qrData, width: qrEl.clientWidth || 88, height: qrEl.clientHeight || 88, correctLevel: QRCode.CorrectLevel.M }); } catch (e) {}
        }
        function go(){ window.focus(); window.print(); }
        function waitImages(){
          var imgs = Array.prototype.slice.call(document.images || []);
          var pending = imgs.filter(function(im){ return !im.complete; });
          if (pending.length === 0){ setTimeout(go, 80); return; }
          var left = pending.length;
          function done(){ if(--left <= 0) setTimeout(go, 80); }
          pending.forEach(function(im){ im.addEventListener('load', done); im.addEventListener('error', done); });
          setTimeout(go, 2000);
        }
        setTimeout(waitImages, qrData ? 250 : 40);
      })();
    </script>
    </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert(isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open();
  w.document.write(doc);
  w.document.close();
}