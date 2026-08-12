/**
 * lib/admin/warranty-print.ts — طباعة "بطاقة/شهادة الضمان" الرسمية لـ ABH AUTO.
 *
 * نفس فلسفة invoice-print.ts (نافذة طباعة حقيقية، RTL صحيح، لوجو كصورة،
 * تروح لـPDF أو ورق بضغطة) لكن للضمان بدل الفاتورة:
 *   • تُطبع فقط بعد تأكيد الدفع (استدعِها بعد pay.paid === true).
 *   • تعرض مدة الضمان الفعلية لكل خدمة في الحجز (booking_items.warranty_months
 *     / warranty_expires_at) — مش نص ثابت.
 *   • تنتهي عند جدول الخدمات المضمونة في هذا الحجز (بدون شروط/استثناءات/QR —
 *     دي بقت موجودة في صفحة سياسة الضمان بالموقع بدل ما تتكرر في كل شهادة).
 *   • رقم وثيقة ضمان مبني على رقم الفاتورة (بعد الدفع).
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

/* ══════════════ نص المبدأ (من وثيقة الضمان الرسمية) ══════════════ */
const PRINCIPLE = {
  ar: "يُفعَّل الضمان من لحظة استلام العميل لمركبته وُيرسَل للعميل على هاتفه من النظام. يُطبَّق حصرًا عند وجود خلل مصنعي في المادة، وُيثبَت بالفحص من فريقنا الفني. كل حالة لا تندرج ضمن هذه التعريفات تقع خارج نطاق الضمان.",
  en: "The warranty is activated the moment the customer receives their vehicle, and an electronic notice is sent to the customer's phone. It applies exclusively to a manufacturing defect in the material, verified by inspection by our technical team. Any case outside these definitions falls outside the warranty scope.",
};

/* ══════════════ الأنواع ══════════════ */
type WarrantyService = {
  name: string;
  isGift?: boolean;
  warrantyMonths?: number | null;
  /** الحد الأقصى للكيلومترات المغطاة (أيهما أقرب مع warrantyMonths) — null يعني ضمان بالسنين فقط */
  warrantyKmLimit?: number | null;
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
  rolls?: { name?: string; rollNo: string }[];
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
/** تنسيق عدد الكيلومترات بفواصل الآلاف — "100,000 كم" / "100,000 km" */
function kmLabel(km: number | null | undefined, isAr: boolean) {
  const k = Number(km) || 0;
  if (k <= 0) return "";
  const formatted = k.toLocaleString(isAr ? "ar-EG" : "en-US");
  return isAr ? `${formatted} كم` : `${formatted} km`;
}
/** يدمج مدة الضمان بالسنين/الشهور مع سقف الكيلومترات (لو موجود) — "12 سنة أو 100,000 كم أيهما أقرب" */
function coverageLabel(months: number | null | undefined, km: number | null | undefined, isAr: boolean) {
  const durLbl = durationLabel(months, isAr);
  const kmLbl = kmLabel(km, isAr);
  if (!kmLbl) return durLbl;
  return isAr ? `${durLbl} أو ${kmLbl} — أيهما أقرب` : `${durLbl} or ${kmLbl} — whichever comes first`;
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
    return { hasCoverage: false, label: "", sub: isAr ? "مدة الضمان تختلف حسب كل خدمة — التفاصيل بالجدول بالأسفل" : "Warranty length varies per service — see the table below", kmLabel: "" };
  }
  const top = withWarranty.reduce((a, b) => (Number(b.warrantyMonths) > Number(a.warrantyMonths) ? b : a));
  const max = Number(top.warrantyMonths);
  const km = Number(top.warrantyKmLimit) || 0;
  const kmLbl = km > 0 ? kmLabel(km, isAr) : "";
  if (max % 12 === 0) {
    return {
      hasCoverage: true,
      label: String(max / 12),
      sub: isAr ? "سنة ضمان (أعلى تغطية)" : "years warranty (max coverage)",
      kmLabel: kmLbl ? (isAr ? `أو حتى ${kmLbl}` : `or up to ${kmLbl}`) : "",
    };
  }
  return {
    hasCoverage: true,
    label: String(max),
    sub: isAr ? "شهر ضمان (أعلى تغطية)" : "months warranty (max coverage)",
    kmLabel: kmLbl ? (isAr ? `أو حتى ${kmLbl}` : `or up to ${kmLbl}`) : "",
  };
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
    ? `<tr><td colspan="4" style="padding:16px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const months = Number(s.warrantyMonths) || 0;
        const km = Number(s.warrantyKmLimit) || 0;
        const expires = s.warrantyExpiresAt || (months > 0 && startDate ? addMonths(startDate, months) : null);
        return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:11px 14px;font-size:12.5px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;font-weight:600;">${esc(s.name)}${s.isGift ? ` <span style="font-size:9px;color:${gold};">(${T("هدية", "Gift")})</span>` : ""}</td>
          <td dir="ltr" style="padding:11px 14px;font-size:12.5px;color:${months > 0 ? "#1f9d6b" : "#9a9ea4"};text-align:center;border-bottom:1px solid #ece9e1;font-weight:700;white-space:nowrap;">${esc(durationLabel(months, isAr))}</td>
          <td dir="ltr" style="padding:11px 14px;font-size:12px;color:${km > 0 ? "#1f9d6b" : "#9a9ea4"};text-align:center;border-bottom:1px solid #ece9e1;font-weight:600;white-space:nowrap;">${km > 0 ? esc(kmLabel(km, isAr)) : "—"}</td>
          <td dir="ltr" style="padding:11px 14px;font-size:11.5px;color:#6c7077;text-align:${eA};border-bottom:1px solid #ece9e1;white-space:nowrap;">${expires ? esc(fmtDate(expires, isAr)) : "—"}</td>
        </tr>`;
      }).join("");

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
          ${headline.kmLabel ? `<div dir="ltr" style="font-size:9.5px;color:${gold};margin-top:6px;font-weight:700;border-top:1px dashed #e7e3d8;padding-top:6px;">${esc(headline.kmLabel)}</div>` : ""}
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
            <th style="padding:9px 14px;font-size:9.5px;letter-spacing:1.5px;color:#fff;text-align:center;">${T("سقف الكيلومترات", "KM limit")}</th>
            <th style="padding:9px 14px;font-size:9.5px;letter-spacing:1.5px;color:#fff;text-align:${eA};">${T("ينتهي في", "Expires")}</th>
          </tr></thead>
          <tbody>${serviceRows}</tbody>
        </table>
        <p style="margin:10px 2px 0;font-size:10px;color:#9a9ea4;text-align:${sA};line-height:1.6;">
          ${T("الضمان يسري حتى أول حد يتحقق من مدة السنوات أو سقف الكيلومترات الموضّح لكل خدمة، أيهما أقرب.", "Warranty is valid until the first of the year-limit or the km-limit shown per service is reached, whichever comes first.")}
        </p>
      ${cardClose}

      ${(b.rolls && b.rolls.length > 0) ? `
      <!-- رقم/أرقام الرول المستخدَم -->
      <div style="display:flex;align-items:center;gap:14px;border:1px solid #e7e3d8;border-radius:14px;padding:13px 18px;background:linear-gradient(180deg,#fff,#faf8f2);margin-bottom:16px;">
        <span style="display:grid;place-items:center;height:36px;width:36px;flex-shrink:0;border-radius:10px;background:#0c0d0e;color:${gold};font:700 13px Georgia,serif;">R</span>
        <div>
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:3px;">${T("رقم الرول المستخدَم", "Roll number used")}</div>
          <div style="font-size:13px;color:#15161a;font-weight:700;">
            ${b.rolls.map((r) => `${r.name ? `${esc(r.name)} — ` : ""}<span dir="ltr" style="color:${gold};">#${esc(r.rollNo)}</span>`).join(`&nbsp;&nbsp;|&nbsp;&nbsp;`)}
          </div>
        </div>
      </div>` : ""}

      <!-- مرجع سياسة الضمان الكاملة -->
      <div style="border:1px dashed #e7e3d8;border-radius:12px;padding:12px 16px;font-size:10.5px;color:#8b8f95;line-height:1.7;text-align:${sA};">
        ${T(
          `تخضع هذه الشهادة لسياسة وشروط الضمان الكاملة المعتمدة (تعريف العيب المشمول، الاستثناءات، والتزامات الطرفين)، المنشورة على ${COMPANY.website} وموافَق عليها من العميل عند الحجز.`,
          `This certificate is subject to the full approved warranty policy and terms (covered-defect definition, exclusions, and both parties' obligations), published at ${COMPANY.website} and agreed to by the customer at booking.`
        )}
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

/** يفتح نافذة طباعة فورية ببطاقة الضمان (A4) — تنتهي عند جدول الخدمات. استدعِها فقط بعد تأكيد الدفع. */
export function printBookingWarranty(b: WarrantyBooking, opts: { isAr: boolean; ccy?: string }): void {
  const { isAr } = opts;
  const body = warrantyHtml(b, isAr);
  const docNo = resolveWarrantyNo(b);

  const doc = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(docNo)}</title>
    <style>
      @page { size: A4; margin: 8mm; }
      *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
      html,body{ margin:0; padding:0; background:#fff; }
      @media screen { body{ padding:14px; background:#e9e9e6; } }
    </style></head>
    <body>${body}
    <script>
      (function(){
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
        setTimeout(waitImages, 40);
      })();
    </script>
    </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert(isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open();
  w.document.write(doc);
  w.document.close();
}