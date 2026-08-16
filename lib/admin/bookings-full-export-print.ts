/**
 * lib/admin/bookings-full-export-print.ts — تقرير PDF تفصيلي كامل لكل الحجوزات المعروضة
 * (نفس بيانات تصدير CSV لكن كل حجز كارت منفصل بكل التفاصيل: العميل، السيارة، الخدمات،
 * الفوترة، الدفع، سجل المتابعة الكامل).
 */

const LOGO_SRC = "/images/logo3.webp";

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  upcoming: { ar: "قادم", en: "Upcoming" },
  active: { ar: "قيد التنفيذ", en: "In progress" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};
const PAY_LABEL: Record<string, { ar: string; en: string }> = {
  paid: { ar: "مدفوع", en: "Paid" },
  pay_at_branch: { ar: "دفع بالفرع", en: "Pay at branch" },
  pending: { ar: "بانتظار الدفع", en: "Awaiting payment" },
  refunded: { ar: "مُسترَد", en: "Refunded" },
};
const WORK_STAGE_LABEL: Record<string, { ar: string; en: string }> = {
  received: { ar: "مُستلمة", en: "Received" },
  in_service: { ar: "قيد التشغيل", en: "In service" },
  quality_check: { ar: "فحص الجودة", en: "Quality check" },
  ready: { ar: "جاهزة للتسليم", en: "Ready" },
};
const FOLLOWUP_CHANNEL_LABEL: Record<string, { ar: string; en: string }> = {
  call: { ar: "مكالمة", en: "Call" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  sms: { ar: "رسالة نصية", en: "SMS" },
  in_person: { ar: "شخصيًا", en: "In person" },
  note: { ar: "ملاحظة", en: "Note" },
};
const FOLLOWUP_OUTCOME_LABEL: Record<string, { ar: string; en: string }> = {
  confirmed: { ar: "أكّد الحضور", en: "Confirmed coming" },
  not_coming: { ar: "لن يأتي / اعتذر", en: "Not coming" },
  rescheduled: { ar: "طلب تأجيل", en: "Requested reschedule" },
  no_response: { ar: "لا يوجد رد", en: "No response" },
  other: { ar: "أخرى", en: "Other" },
};

function fmtFullDT(iso: string | null | undefined, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return String(iso);
  return d.toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function logoBlock() {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 34px Georgia,serif;letter-spacing:2px;color:#fff;">ABH<span style="color:#c2a04e;">.</span></div>
      <div style="font-size:10px;letter-spacing:8px;color:#cbcdcd;margin-top:5px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${LOGO_SRC}" alt="ABH AUTO" style="height:64px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}

export interface BookingsFullReportOpts {
  isAr: boolean;
  ccy: string;
  title?: string;
  subtitle?: string;
}

function bookingCardHtml(b: any, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const st = STATUS_LABEL[b.status] || { ar: b.status, en: b.status };
  const pay = PAY_LABEL[b.payment] || { ar: b.payment, en: b.payment };
  const ws = b.workStage ? WORK_STAGE_LABEL[b.workStage] : null;
  const stColor = b.status === "completed" ? "#3ecd8e" : b.status === "cancelled" ? "#ef5a4d" : b.status === "active" ? "#f5993d" : "#8a9099";

  const infoRow = (label: string, value: string) => `
    <div style="flex:1;min-width:140px;">
      <div style="font-size:8.5px;letter-spacing:.5px;color:#8b8f95;text-transform:uppercase;">${esc(label)}</div>
      <div style="font-size:11px;color:#15161a;font-weight:600;margin-top:2px;">${value}</div>
    </div>`;

  const servicesHtml = (b.services || []).length === 0
    ? `<div style="font-size:10.5px;color:#8b8f95;">${T("لا توجد خدمات", "No services")}</div>`
    : (b.services || []).map((s: any) => `
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0efe9;font-size:10.5px;">
        <span style="color:#15161a;">${esc(s.name)}${s.isGift ? ` (${T("هدية", "Gift")})` : ""}</span>
        <span dir="ltr" style="color:#5a6b7a;">${s.isGift && !s.price ? T("مجانية", "Free") : `${Number(s.price || 0).toLocaleString()} ${esc(ccy)}`}</span>
      </div>`).join("");

  const servicesTotal = (b.services || []).reduce((s: number, x: any) => s + (Number(x.price) || 0), 0);
  const manualDiscountAmount = Number(b.manualDiscountAmount) || 0;
  const promoDiscount = Number(b.promoDiscount) || 0;

  const billingHtml = `
    <div style="border-radius:8px;border:1px solid #ece9e1;background:#fbfaf7;padding:10px 12px;margin-top:8px;">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0;"><span style="color:#5a6b7a;">${T("إجمالي الخدمات", "Services subtotal")}</span><span dir="ltr">${(servicesTotal || Number(b.subtotal) || 0).toLocaleString()} ${esc(ccy)}</span></div>
      ${b.towing ? `<div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0;"><span style="color:#5a6b7a;">${T("السطحة / النقل", "Towing")}</span><span dir="ltr">${Number(b.towing).toLocaleString()} ${esc(ccy)}</span></div>` : ""}
      ${promoDiscount ? `<div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0;"><span style="color:#5a6b7a;">${T("خصم الكود", "Promo")}${b.promoCode ? ` (${esc(b.promoCode)})` : ""}</span><span dir="ltr" style="color:#3e7c53;">−${promoDiscount.toLocaleString()} ${esc(ccy)}</span></div>` : ""}
      ${manualDiscountAmount ? `<div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0;"><span style="color:#5a6b7a;">${T("خصم يدوي/بنكي", "Manual/bank discount")}${b.manualDiscountReason ? ` — ${esc(b.manualDiscountReason)}` : ""}</span><span dir="ltr" style="color:#3e7c53;">−${manualDiscountAmount.toLocaleString()} ${esc(ccy)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding-top:6px;margin-top:4px;border-top:1px solid #ece9e1;"><span>${T("الإجمالي", "Total")}</span><span dir="ltr">${Number(b.total || 0).toLocaleString()} ${esc(ccy)}</span></div>
      <div style="font-size:9.5px;color:#8b8f95;margin-top:4px;">${T("طريقة الدفع", "Payment method")}: ${esc(b.paymentMethod || "—")} · ${T("رقم الفاتورة", "Invoice #")}: ${esc(b.invoiceNumber ?? "—")}</div>
    </div>`;

  const followups: any[] = b.followups || [];
  const followupsHtml = followups.length === 0
    ? `<div style="font-size:10.5px;color:#8b8f95;padding:8px 0;">${T("لا توجد متابعات", "No follow-ups")}</div>`
    : followups.map((f) => {
        const ch = FOLLOWUP_CHANNEL_LABEL[f.channel] || { ar: f.channel, en: f.channel };
        return `
        <div style="display:flex;gap:8px;padding:6px 0;border-top:1px solid #ece9e1;">
          <div style="width:3px;border-radius:3px;background:#6ba8f5;flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;gap:8px;">
              <span style="font-size:10px;font-weight:700;color:#15161a;">${esc(isAr ? ch.ar : ch.en)}${f.author ? ` · ${esc(f.author)}` : ""}</span>
              <span style="font-size:9px;color:#8b8f95;flex-shrink:0;">${fmtFullDT(f.createdAt, isAr)}</span>
            </div>
            <div style="font-size:10.5px;color:#333;white-space:pre-line;line-height:1.6;margin-top:2px;">${esc(f.note)}</div>
          </div>
        </div>`;
      }).join("");

  const followupStatusLine = b.followupStatus === "closed"
    ? `${T("قرار المتابعة النهائي", "Final follow-up outcome")}: ${esc(b.followupOutcome ? (isAr ? FOLLOWUP_OUTCOME_LABEL[b.followupOutcome]?.ar : FOLLOWUP_OUTCOME_LABEL[b.followupOutcome]?.en) ?? b.followupOutcome : "—")} — ${fmtFullDT(b.followupClosedAt, isAr)}`
    : (b.followupStatus === "open" ? T("قيد المتابعة حاليًا", "Currently following up") : T("بدون متابعة", "No follow-up"));

  return `
  <div style="page-break-inside:avoid;border:1px solid #ece9e1;border-radius:12px;margin-bottom:14px;overflow:hidden;">
    <div style="background:#0c0d0e;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:15px;color:#fff;font-weight:700;text-transform:uppercase;">${esc(b.vehicle)}</div>
        <div dir="ltr" style="font-size:10.5px;color:#aeb2b7;margin-top:2px;">${esc(b.reference)}${b.plate ? ` · ${esc(b.plate)}` : ""}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span style="border-radius:999px;padding:4px 10px;font-size:9.5px;font-weight:700;color:#fff;background:${stColor};">${esc(ws ? (isAr ? ws.ar : ws.en) : (isAr ? st.ar : st.en))}</span>
        <span style="border-radius:999px;padding:4px 10px;font-size:9.5px;font-weight:700;color:#0c0d0e;background:#cbcdcd;">${esc(isAr ? pay.ar : pay.en)}</span>
      </div>
    </div>
    <div style="padding:12px 16px;">
      <div style="display:flex;flex-wrap:wrap;gap:10px;padding-bottom:10px;border-bottom:1px solid #ece9e1;">
        ${infoRow(T("العميل", "Customer"), esc(b.customer))}
        ${infoRow(T("التليفون", "Phone"), esc(b.phone || "—"))}
        ${infoRow(T("الإيميل", "Email"), esc(b.email || "—"))}
        ${infoRow(T("المدينة", "City"), esc(b.city || "—"))}
        ${infoRow(T("الفرع", "Branch"), esc(b.branch || "—"))}
        ${infoRow(T("الموعد", "Date & time"), `${esc(b.date || "—")} ${esc(b.time || "")}`)}
        ${infoRow(T("أُنشئ في", "Created"), fmtFullDT(b.createdAt, isAr))}
        ${b.deliveredAt ? infoRow(T("تاريخ التسليم", "Delivered"), fmtFullDT(b.deliveredAt, isAr)) : ""}
        ${infoRow(T("نوع الحساب", "Account type"), b.isGuest ? T("زائر", "Guest") : T("عميل مسجّل", "Registered"))}
        ${b.viaPartner ? infoRow(T("عن طريق شريك", "Via partner"), esc(b.viaPartner)) : ""}
      </div>
      ${b.status === "cancelled" && b.cancelReason ? `
      <div style="margin-top:10px;border-radius:8px;border:1px solid #ef5a4d55;background:#ef5a4d12;padding:9px 12px;">
        <div style="font-size:9px;color:#c0392b;font-weight:700;">${T("سبب الإلغاء", "Cancellation reason")}</div>
        <div style="font-size:10.5px;color:#4a4d52;margin-top:3px;">${esc(b.cancelReason)}</div>
      </div>` : ""}
      <div style="margin-top:10px;">
        <div style="font-size:9px;letter-spacing:1px;color:#8b8f95;text-transform:uppercase;margin-bottom:4px;">${T("الخدمات", "Services")}</div>
        ${servicesHtml}
      </div>
      ${billingHtml}
      <div style="margin-top:12px;">
        <div style="font-size:9px;letter-spacing:1px;color:#8b8f95;text-transform:uppercase;margin-bottom:4px;">${T("المتابعة", "Follow-up")} — ${esc(followupStatusLine)}</div>
        ${followupsHtml}
      </div>
      ${b.notes ? `
      <div style="margin-top:10px;border-radius:8px;border:1px solid #ece9e1;background:#fbfaf7;padding:9px 12px;">
        <div style="font-size:9px;color:#8b8f95;font-weight:700;">${T("ملاحظات عامة", "General notes")}</div>
        <div style="font-size:10.5px;color:#4a4d52;margin-top:3px;">${esc(b.notes)}</div>
      </div>` : ""}
    </div>
  </div>`;
}

function buildHtml(bookings: any[], opts: BookingsFullReportOpts) {
  const { isAr, ccy } = opts;
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";
  const issued = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const title = opts.title || T("تقرير تفصيلي للحجوزات", "Detailed Bookings Report");
  const subtitle = opts.subtitle || T("كل بيانات كل حجز — العميل، الخدمات، الفوترة، والمتابعة", "Full detail per booking — customer, services, billing, and follow-up");
  const cardsHtml = bookings.map((b) => bookingCardHtml(b, isAr, ccy)).join("");

  return `
  <div style="width:210mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <div style="background:#0c0d0e;padding:22px 30px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoBlock()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 18px Georgia,serif;letter-spacing:3px;color:#fff;">${esc(title)}</div>
        <div style="font-size:10.5px;color:#aeb2b7;margin-top:5px;">${esc(subtitle)}</div>
        <div style="font-size:9.5px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "Issued")} ${esc(issued)} · ${T("عدد الحجوزات", "Bookings")}: ${bookings.length}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>
    <div style="padding:18px 20px;">
      ${cardsHtml || `<div style="padding:40px;text-align:center;color:#8b8f95;">${T("لا توجد بيانات", "No data")}</div>`}
    </div>
    <div style="border-top:1px solid #ece9e1;padding:12px 30px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:#6c7077;">${T("ABH AUTO — تقرير تفصيلي للحجوزات.", "ABH AUTO — detailed bookings report.")}</div>
      <div dir="ltr" style="font-size:10px;color:#9a9ea4;letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة A4 عمودي بتقرير تفصيلي كامل لكل الحجوزات الممرَّرة. */
export function printBookingsFullReport(bookings: any[], opts: BookingsFullReportOpts): void {
  const body = buildHtml(bookings, opts);
  const title = opts.title || (opts.isAr ? "تقرير تفصيلي للحجوزات" : "Detailed Bookings Report");
  const doc = `<!doctype html><html lang="${opts.isAr ? "ar" : "en"}" dir="${opts.isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(title)}</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
      html,body{ margin:0; padding:0; background:#fff; }
      @media screen { body{ padding:14px; background:#e9e9e6; } }
    </style></head>
    <body>${body}
    <script>
      (function(){
        function go(){ window.focus(); window.print(); }
        var imgs = Array.prototype.slice.call(document.images || []);
        var pending = imgs.filter(function(im){ return !im.complete; });
        if (pending.length === 0){ setTimeout(go, 60); return; }
        var left = pending.length;
        pending.forEach(function(im){ im.addEventListener('load', done); im.addEventListener('error', done); });
        function done(){ if(--left <= 0) setTimeout(go, 60); }
        setTimeout(go, 1500);
      })();
    </script>
    </body></html>`;
  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) { alert(opts.isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}