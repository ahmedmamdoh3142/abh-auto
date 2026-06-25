/**
 * lib/admin/invoice-pdf.ts — توليد فاتورة/إيصال PDF فاخر لحجز واحد بهوية ABH AUTO.
 *
 * يبني عقدة HTML أنيقة (خلفية فاتحة، شريط أوبسيديان أعلى، شعار ABH AUTO، خط ذهبي،
 * جدول خدمات، إجماليات، شارة حالة الدفع، تذييل) ثم يحوّلها لـPDF عبر html2pdf.js.
 * العربية تُشكَّل صح لأن المتصفّح هو اللي بيرسم النص قبل الالتقاط.
 *
 * التثبيت لمرة واحدة:  npm i html2pdf.js
 */

type InvoiceService = { name: string; price: number; isGift?: boolean };
export type InvoiceBooking = {
  reference: string;
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
  subtotal?: number;
  towing?: number;
  total: number;
  paymentMethod?: string;
  payment?: string;   // payment_status
  status?: string;    // booking status
  cancelReason?: string;
  services?: InvoiceService[];
};

const BRAND = {
  obsidian: "#0c0d0e",
  paper: "#ffffff",
  panel: "#faf9f6",
  ink: "#15161a",
  sub: "#6c7077",
  line: "#e9e8e2",
  platinum: "#9a9ea4",
  gold: "#c2a04e",
  goldSoft: "#f3ead0",
  green: "#1f9d6b",
  amber: "#c98a14",
  gray: "#7c8088",
};

const money = (n: number | undefined) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function payInfo(status: string | undefined, isAr: boolean) {
  switch (status) {
    case "paid": return { label: isAr ? "مدفوع" : "Paid", color: BRAND.green, bg: "#e7f7ef" };
    case "refunded": return { label: isAr ? "مُسترَد" : "Refunded", color: BRAND.gray, bg: "#eef0f2" };
    case "pay_at_branch": return { label: isAr ? "دفع بالفرع" : "Pay at branch", color: BRAND.amber, bg: "#fdf3df" };
    default: return { label: isAr ? "بانتظار الدفع" : "Awaiting payment", color: BRAND.amber, bg: "#fdf3df" };
  }
}

function statusLabel(status: string | undefined, isAr: boolean) {
  const m: Record<string, [string, string]> = {
    upcoming: ["قادم", "Upcoming"],
    active: ["قيد التنفيذ", "In progress"],
    completed: ["مكتمل", "Completed"],
    cancelled: ["ملغي", "Cancelled"],
  };
  const v = m[status || ""] || ["—", "—"];
  return isAr ? v[0] : v[1];
}

function payMethodLabel(code: string | undefined, isAr: boolean) {
  const m: Record<string, [string, string]> = {
    cash: ["نقدًا بالفرع", "Cash at branch"],
    applePay: ["Apple Pay", "Apple Pay"],
    tabby: ["Tabby", "Tabby"],
    tamara: ["Tamara", "Tamara"],
  };
  const v = m[code || ""];
  return v ? (isAr ? v[0] : v[1]) : (code || "—");
}

function fmtDate(iso: string | undefined, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function invoiceHtml(b: InvoiceBooking, isAr: boolean, ccy: string): string {
  const dir = isAr ? "rtl" : "ltr";
  const startA = isAr ? "right" : "left";
  const endA = isAr ? "left" : "right";
  const T = (ar: string, en: string) => (isAr ? ar : en);

  const services = (b.services || []).filter((s) => s && s.name);
  const subtotal = b.subtotal != null ? b.subtotal : services.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const pay = payInfo(b.payment, isAr);
  const issued = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const rows = services.length === 0
    ? `<tr><td colspan="2" style="padding:16px 18px;color:${BRAND.sub};font-size:13px;text-align:center;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const gift = !!s.isGift;
        const price = gift && (Number(s.price) || 0) === 0
          ? `<span style="color:${BRAND.gold};font-weight:600;">${T("مجانية", "Free")}</span>`
          : (Number(s.price) > 0 ? `${money(s.price)} <span style="color:${BRAND.sub};font-size:11px;">${esc(ccy)}</span>` : T("حسب الطلب", "On request"));
        const giftChip = gift
          ? ` <span style="display:inline-block;margin-inline-start:8px;padding:2px 8px;border-radius:999px;font-size:10px;color:${BRAND.gold};background:${BRAND.goldSoft};border:1px solid ${BRAND.gold}55;vertical-align:middle;">${T("هدية", "Gift")}</span>`
          : "";
        return `<tr style="background:${i % 2 ? BRAND.panel : "#fff"};">
          <td style="padding:13px 18px;font-size:13.5px;color:${BRAND.ink};text-align:${startA};border-bottom:1px solid ${BRAND.line};">${esc(s.name)}${giftChip}</td>
          <td style="padding:13px 18px;font-size:13.5px;color:${BRAND.ink};text-align:${endA};white-space:nowrap;border-bottom:1px solid ${BRAND.line};">${price}</td>
        </tr>`;
      }).join("");

  const infoCell = (label: string, value: string, ltr = false) => `
    <div style="margin-bottom:11px;">
      <div style="font-size:9.5px;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.platinum};margin-bottom:3px;">${esc(label)}</div>
      <div ${ltr ? 'dir="ltr"' : ""} style="font-size:13.5px;color:${BRAND.ink};text-align:${startA};">${esc(value || "—")}</div>
    </div>`;

  return `
  <div style="width:794px;background:${BRAND.paper};color:${BRAND.ink};font-family:'Helvetica Neue',Arial,'Segoe UI',sans-serif;direction:${dir};overflow:hidden;">
    <!-- الهيدر -->
    <div style="background:${BRAND.obsidian};padding:34px 46px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${startA};">
        <div style="font:700 32px Georgia,'Times New Roman',serif;letter-spacing:1.5px;color:#fff;line-height:1;">ABH<span style="color:${BRAND.gold};">.</span></div>
        <div style="font-size:11px;letter-spacing:9px;color:#cbcdcd;margin-top:5px;">A&nbsp;U&nbsp;T&nbsp;O</div>
      </div>
      <div style="text-align:${endA};">
        <div style="font:300 22px Georgia,serif;letter-spacing:5px;color:#fff;">${T("فاتورة", "INVOICE")}</div>
        <div dir="ltr" style="font-size:12.5px;color:#aeb2b7;margin-top:7px;text-align:${endA};">${esc(b.reference)}</div>
        <div style="font-size:11px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "Issued")} ${esc(issued)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,${BRAND.gold},${BRAND.goldSoft},${BRAND.gold});"></div>

    <!-- الجسم -->
    <div style="padding:34px 46px 30px;">
      <!-- العميل + السيارة -->
      <div style="display:flex;gap:34px;margin-bottom:26px;">
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${BRAND.gold};margin-bottom:13px;border-bottom:1px solid ${BRAND.line};padding-bottom:7px;">${T("بيانات العميل", "Customer")}</div>
          ${infoCell(T("الاسم", "Name"), b.customer || "—")}
          ${infoCell(T("التليفون", "Phone"), b.phone || "—", true)}
          ${infoCell(T("الإيميل", "Email"), b.email || "—", true)}
          ${infoCell(T("المدينة", "City"), b.city || "—")}
        </div>
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${BRAND.gold};margin-bottom:13px;border-bottom:1px solid ${BRAND.line};padding-bottom:7px;">${T("السيارة والموعد", "Vehicle & schedule")}</div>
          ${infoCell(T("السيارة", "Vehicle"), b.vehicle || "—")}
          ${infoCell(T("اللوحة", "Plate"), b.plate || "—", true)}
          ${infoCell(T("الفرع", "Branch"), b.branch || "—")}
          ${infoCell(T("الموعد", "Date & time"), `${fmtDate(b.date, isAr)}${b.time ? " · " + b.time : ""}`)}
        </div>
      </div>

      <!-- جدول الخدمات -->
      <table style="width:100%;border-collapse:collapse;border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:${BRAND.obsidian};">
            <th style="padding:11px 18px;font-size:10px;letter-spacing:2px;font-weight:600;color:#fff;text-align:${startA};">${T("الخدمة", "Service")}</th>
            <th style="padding:11px 18px;font-size:10px;letter-spacing:2px;font-weight:600;color:#fff;text-align:${endA};">${T("السعر", "Price")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- الإجماليات + الدفع -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-top:24px;">
        <div style="flex:1;padding-top:4px;">
          <div style="display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:${pay.bg};color:${pay.color};font-size:12px;font-weight:600;">
            <span style="height:8px;width:8px;border-radius:999px;background:${pay.color};display:inline-block;"></span>${esc(pay.label)}
          </div>
          <div style="margin-top:12px;font-size:11.5px;color:${BRAND.sub};line-height:1.9;">
            ${T("طريقة الدفع", "Payment method")}: <strong style="color:${BRAND.ink};">${esc(payMethodLabel(b.paymentMethod, isAr))}</strong><br/>
            ${T("حالة الحجز", "Booking status")}: <strong style="color:${BRAND.ink};">${esc(statusLabel(b.status, isAr))}</strong>
          </div>
        </div>
        <div style="width:300px;border:1px solid ${BRAND.line};border-radius:12px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;padding:11px 18px;font-size:13px;color:${BRAND.sub};">
            <span>${T("إجمالي الخدمات", "Subtotal")}</span><span dir="ltr" style="color:${BRAND.ink};">${money(subtotal)} ${esc(ccy)}</span>
          </div>
          ${Number(b.towing) > 0 ? `<div style="display:flex;justify-content:space-between;padding:0 18px 11px;font-size:13px;color:${BRAND.sub};"><span>${T("النقل / السطحة", "Towing")}</span><span dir="ltr" style="color:${BRAND.ink};">${money(b.towing)} ${esc(ccy)}</span></div>` : ""}
          <div style="background:${BRAND.obsidian};display:flex;justify-content:space-between;align-items:baseline;padding:15px 18px;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cbcdcd;">${T("الإجمالي", "Total")}</span>
            <span dir="ltr" style="font-size:23px;font-weight:700;color:#fff;">${money(b.total)} <span style="font-size:12px;color:#9aa0a6;">${esc(ccy)}</span></span>
          </div>
        </div>
      </div>

      ${b.status === "cancelled" && b.cancelReason ? `<div style="margin-top:20px;border:1px solid #f0c6c0;background:#fdeeec;border-radius:10px;padding:12px 16px;font-size:12.5px;color:#a23b30;"><strong>${T("سبب الإلغاء", "Cancellation reason")}:</strong> ${esc(b.cancelReason)}</div>` : ""}
    </div>

    <!-- التذييل -->
    <div style="border-top:1px solid ${BRAND.line};padding:18px 46px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:${BRAND.sub};">${T("شكرًا لاختيارك ABH AUTO — عناية تليق بسيارتك.", "Thank you for choosing ABH AUTO — care your car deserves.")}</div>
      <div dir="ltr" style="font-size:11px;color:${BRAND.platinum};letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:6px;background:${BRAND.obsidian};"></div>
  </div>`;
}

/** يولّد وينزّل فاتورة PDF للحجز. */
export async function exportBookingPdf(
  b: InvoiceBooking,
  opts: { isAr: boolean; ccy: string }
): Promise<void> {
  const { isAr, ccy } = opts;

  // @ts-ignore — html2pdf.js بدون أنواع
  const mod = await import("html2pdf.js");
  const html2pdf = (mod as any).default || (mod as any);

  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-99999px";
  holder.style.top = "0";
  holder.style.zIndex = "-1";
  holder.innerHTML = invoiceHtml(b, isAr, ccy);
  document.body.appendChild(holder);

  const target = holder.firstElementChild as HTMLElement;

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: `ABH-${(b.reference || "invoice").replace(/[^\w.-]/g, "")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "avoid-all"] },
      })
      .from(target)
      .save();
  } finally {
    document.body.removeChild(holder);
  }
}