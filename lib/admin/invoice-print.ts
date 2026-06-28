/**
 * lib/admin/invoice-print.ts — طباعة فاتورة ABH AUTO عبر نافذة طباعة حقيقية.
 *
 * ليه الطريقة دي؟ المتصفّح بيرسم العربي والـRTL صح 100% (مفيش html2canvas يبوّظه)،
 * واللوجو بيتحط كصورة، والطباعة بتروح لـPDF أو ورق بضغطة. فيه حجمين:
 *   • A4 (فاتورة كاملة)
 *   • إيصال 80mm (شكل الكاشير)
 *
 * الاستخدام:
 *   printBookingInvoice(b, { isAr, ccy, size: "a4" });      // أو size: "receipt"
 */

// ✏️ عدّل ده لمسار اللوجو بتاعك في /public (مثال: "/logo.png" أو "/images/logo-white.png")
const logo_SRC = "/images/logo2.webp";
// اللوجو فاتح (أبيض) واللا غامق؟ لو أبيض هنحطّه على خلفية سوداء.
const logo_IS_LIGHT = true;

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
  payment?: string;
  status?: string;
  cancelReason?: string;
  services?: InvoiceService[];
};

type PrintSize = "a4" | "receipt";

const money = (n: number | undefined) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function payInfo(status: string | undefined, isAr: boolean) {
  switch (status) {
    case "paid": return { label: isAr ? "مدفوع" : "Paid", color: "#1f9d6b", bg: "#e7f7ef" };
    case "refunded": return { label: isAr ? "مُسترَد" : "Refunded", color: "#6b7077", bg: "#eef0f2" };
    case "pay_at_branch": return { label: isAr ? "دفع بالفرع" : "Pay at branch", color: "#b9810f", bg: "#fdf3df" };
    default: return { label: isAr ? "بانتظار الدفع" : "Awaiting payment", color: "#b9810f", bg: "#fdf3df" };
  }
}
function statusLabel(s: string | undefined, isAr: boolean) {
  const m: Record<string, [string, string]> = { upcoming: ["قادم", "Upcoming"], active: ["قيد التنفيذ", "In progress"], completed: ["مكتمل", "Completed"], cancelled: ["ملغي", "Cancelled"] };
  const v = m[s || ""] || ["—", "—"]; return isAr ? v[0] : v[1];
}
function payMethodLabel(c: string | undefined, isAr: boolean) {
  const m: Record<string, [string, string]> = { cash: ["نقدًا بالفرع", "Cash at branch"], applePay: ["Apple Pay", "Apple Pay"], tabby: ["Tabby", "Tabby"], tamara: ["Tamara", "Tamara"] };
  const v = m[c || ""]; return v ? (isAr ? v[0] : v[1]) : (c || "—");
}
function fmtDate(iso: string | undefined, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso); if (isNaN(+d)) return iso;
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* شعار: صورة لو متوفّرة، وإلا نص فخم احتياطي.
   لو اللوجو فاتح (أبيض) وبنعرضه على خلفية فاتحة (الإيصال) → نحطّه في مربع غامق يبان. */
function logoBlock(onDark: boolean) {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 26px Georgia,serif;letter-spacing:1.5px;color:${onDark ? "#fff" : "#0c0d0e"};">ABH<span style="color:#c2a04e;">.</span></div>
      <div style="font-size:9px;letter-spacing:7px;color:${onDark ? "#cbcdcd" : "#6c7077"};margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  if (!logo_SRC) return fallback;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  const img = `<img src="${logo_SRC}" alt="ABH AUTO" style="height:46px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
  // لوجو فاتح على خلفية فاتحة → لفّه بمربع غامق
  if (!onDark && logo_IS_LIGHT) {
    return `<div style="display:inline-block;background:#0c0d0e;padding:7px 12px;border-radius:8px;">${img.replace("height:46px", "height:34px")}</div>`;
  }
  return img;
}

/* ===================== A4 ===================== */
function a4Html(b: InvoiceBooking, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";
  const services = (b.services || []).filter((s) => s && s.name);
  const subtotal = b.subtotal != null ? b.subtotal : services.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const pay = payInfo(b.payment, isAr);
  const issued = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const rows = services.length === 0
    ? `<tr><td colspan="2" style="padding:16px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const gift = !!s.isGift;
        const price = gift && (Number(s.price) || 0) === 0
          ? `<b style="color:#c2a04e;">${T("مجانية", "Free")}</b>`
          : (Number(s.price) > 0 ? `${money(s.price)} <span style="color:#9a9ea4;font-size:11px;">${esc(ccy)}</span>` : T("حسب الطلب", "On request"));
        const chip = gift ? ` <span style="padding:1px 7px;border-radius:99px;font-size:10px;color:#c2a04e;background:#f3ead0;border:1px solid #c2a04e55;">${T("هدية", "Gift")}</span>` : "";
        return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:12px 16px;font-size:13px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;">${esc(s.name)}${chip}</td>
          <td style="padding:12px 16px;font-size:13px;color:#15161a;text-align:${eA};white-space:nowrap;border-bottom:1px solid #ece9e1;">${price}</td>
        </tr>`;
      }).join("");

  const info = (l: string, v: string, ltr = false) =>
    `<div style="margin-bottom:9px;"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:2px;">${esc(l)}</div><div ${ltr ? 'dir="ltr"' : ""} style="font-size:13px;color:#15161a;text-align:${sA};">${esc(v || "—")}</div></div>`;

  return `
  <div style="width:190mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <div style="background:#0c0d0e;padding:26px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoBlock(true)}</div>
      <div style="text-align:${eA};">
        <div style="font:300 20px Georgia,serif;letter-spacing:5px;color:#fff;">${T("فاتورة", "INVOICE")}</div>
        <div dir="ltr" style="font-size:12px;color:#aeb2b7;margin-top:6px;text-align:${eA};">${esc(b.reference)}</div>
        <div style="font-size:10.5px;color:#8b8f95;margin-top:2px;">${T("بتاريخ", "Issued")} ${esc(issued)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>

    <div style="padding:26px 32px;">
      <div style="display:flex;gap:30px;margin-bottom:22px;">
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c2a04e;border-bottom:1px solid #ece9e1;padding-bottom:6px;margin-bottom:11px;">${T("بيانات العميل", "Customer")}</div>
          ${info(T("الاسم", "Name"), b.customer || "—")}
          ${info(T("التليفون", "Phone"), b.phone || "—", true)}
          ${info(T("الإيميل", "Email"), b.email || "—", true)}
          ${info(T("المدينة", "City"), b.city || "—")}
        </div>
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c2a04e;border-bottom:1px solid #ece9e1;padding-bottom:6px;margin-bottom:11px;">${T("السيارة والموعد", "Vehicle & schedule")}</div>
          ${info(T("السيارة", "Vehicle"), b.vehicle || "—")}
          ${info(T("اللوحة", "Plate"), b.plate || "—", true)}
          ${info(T("الفرع", "Branch"), b.branch || "—")}
          ${info(T("الموعد", "Date & time"), `${fmtDate(b.date, isAr)}${b.time ? " · " + b.time : ""}`)}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;border:1px solid #ece9e1;">
        <thead><tr style="background:#0c0d0e;">
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${sA};">${T("الخدمة", "Service")}</th>
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${eA};">${T("السعر", "Price")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-top:22px;">
        <div style="flex:1;padding-top:2px;">
          <span style="display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:99px;background:${pay.bg};color:${pay.color};font-size:11.5px;font-weight:700;">
            <span style="height:8px;width:8px;border-radius:99px;background:${pay.color};"></span>${esc(pay.label)}
          </span>
          <div style="margin-top:11px;font-size:11px;color:#6c7077;line-height:1.9;">
            ${T("طريقة الدفع", "Payment method")}: <b style="color:#15161a;">${esc(payMethodLabel(b.paymentMethod, isAr))}</b><br/>
            ${T("حالة الحجز", "Booking status")}: <b style="color:#15161a;">${esc(statusLabel(b.status, isAr))}</b>
          </div>
        </div>
        <div style="width:270px;border:1px solid #ece9e1;">
          <div style="display:flex;justify-content:space-between;padding:10px 16px;font-size:12.5px;color:#6c7077;"><span>${T("إجمالي الخدمات", "Subtotal")}</span><span dir="ltr" style="color:#15161a;">${money(subtotal)} ${esc(ccy)}</span></div>
          ${Number(b.towing) > 0 ? `<div style="display:flex;justify-content:space-between;padding:0 16px 10px;font-size:12.5px;color:#6c7077;"><span>${T("النقل", "Towing")}</span><span dir="ltr" style="color:#15161a;">${money(b.towing)} ${esc(ccy)}</span></div>` : ""}
          <div style="background:#0c0d0e;display:flex;justify-content:space-between;align-items:baseline;padding:13px 16px;">
            <span style="font-size:10px;letter-spacing:2px;color:#cbcdcd;">${T("الإجمالي", "TOTAL")}</span>
            <span dir="ltr" style="font-size:20px;font-weight:700;color:#fff;">${money(b.total)} <span style="font-size:11px;color:#9a9ea4;">${esc(ccy)}</span></span>
          </div>
        </div>
      </div>

      ${b.status === "cancelled" && b.cancelReason ? `<div style="margin-top:18px;border:1px solid #f0c6c0;background:#fdeeec;padding:11px 15px;font-size:12px;color:#a23b30;"><b>${T("سبب الإلغاء", "Cancellation reason")}:</b> ${esc(b.cancelReason)}</div>` : ""}
    </div>

    <div style="border-top:1px solid #ece9e1;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10.5px;color:#6c7077;">${T("شكرًا لاختيارك ABH AUTO — عناية تليق بسيارتك.", "Thank you for choosing ABH AUTO.")}</div>
      <div dir="ltr" style="font-size:10.5px;color:#9a9ea4;letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/* ===================== إيصال 80mm (محسّن للطابعة الحرارية) ===================== */
function receiptHtml(b: InvoiceBooking, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const services = (b.services || []).filter((s) => s && s.name);
  const subtotal = b.subtotal != null ? b.subtotal : services.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const pay = payInfo(b.payment, isAr);
  const issued = new Date().toLocaleString(isAr ? "ar-EG" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  // فاصل صلب (أسود نقي) بدل المنقّط الرمادي اللي بيبهت
  const dash = `<div style="border-top:2px solid #000;margin:9px 0;"></div>`;
  const line = (l: string, v: string, big = false) =>
    `<div style="display:flex;justify-content:space-between;gap:8px;font-size:${big ? 19 : 15}px;font-weight:${big ? 800 : 600};margin:3px 0;color:#000;line-height:1.35;"><span>${esc(l)}</span><span dir="ltr">${v}</span></div>`;

  const items = services.length === 0
    ? `<div style="text-align:center;color:#000;font-size:14px;font-weight:600;">${T("لا توجد خدمات", "No services")}</div>`
    : services.map((s) => {
        const gift = !!s.isGift;
        const price = gift && (Number(s.price) || 0) === 0 ? T("مجانية", "Free") : (Number(s.price) > 0 ? `${money(s.price)}` : T("حسب الطلب", "On req."));
        return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:600;margin:4px 0;color:#000;line-height:1.35;">
          <span style="max-width:46mm;">${esc(s.name)}${gift ? ` <b>(${T("هدية", "Gift")})</b>` : ""}</span>
          <span dir="ltr">${price}</span>
        </div>`;
      }).join("");

  return `
  <div style="width:72mm;margin:0 auto;background:#fff;color:#000;font-family:'Courier New','Roboto Mono',ui-monospace,monospace;direction:${dir};padding:3mm 2mm;font-weight:600;">
    <div style="text-align:center;margin-bottom:7px;">
      <div style="display:inline-block;">${logoBlock(false)}</div>
    </div>
    <div style="text-align:center;font-size:14px;font-weight:800;color:#000;letter-spacing:1px;">${T("فاتورة حجز", "BOOKING INVOICE")}</div>
    ${dash}
    ${line(T("رقم الحجز", "Ref"), esc(b.reference))}
    ${line(T("التاريخ", "Date"), esc(issued))}
    ${line(T("العميل", "Customer"), esc(b.customer || "—"))}
    ${b.phone ? line(T("التليفون", "Phone"), esc(b.phone)) : ""}
    ${b.vehicle ? line(T("السيارة", "Vehicle"), esc(b.vehicle)) : ""}
    ${b.plate ? line(T("اللوحة", "Plate"), esc(b.plate)) : ""}
    ${b.branch ? line(T("الفرع", "Branch"), esc(b.branch)) : ""}
    ${(b.date || b.time) ? line(T("الموعد", "When"), esc(`${fmtDate(b.date, isAr)} ${b.time || ""}`.trim())) : ""}
    ${dash}
    <div style="font-size:13px;font-weight:800;color:#000;letter-spacing:1px;margin-bottom:4px;">${T("الخدمات", "SERVICES")}</div>
    ${items}
    ${dash}
    ${line(T("إجمالي الخدمات", "Subtotal"), `${money(subtotal)} ${esc(ccy)}`)}
    ${Number(b.towing) > 0 ? line(T("النقل", "Towing"), `${money(b.towing)} ${esc(ccy)}`) : ""}
    ${dash}
    ${line(T("الإجمالي", "TOTAL"), `${money(b.total)} ${esc(ccy)}`, true)}
    <div style="text-align:center;margin-top:8px;">
      <span style="display:inline-block;padding:4px 14px;border:2px solid #000;border-radius:4px;font-size:14px;color:#000;font-weight:800;">${esc(pay.label)}</span>
    </div>
    ${dash}
    <div style="text-align:center;font-size:12px;font-weight:600;color:#000;line-height:1.6;">
      ${T("شكرًا لاختيارك ABH AUTO", "Thank you for choosing ABH AUTO")}<br/>abh-auto.com
    </div>
  </div>`;
}

/** يفتح نافذة طباعة فورية بالفاتورة (A4 أو إيصال 80mm). */
export function printBookingInvoice(
  b: InvoiceBooking,
  opts: { isAr: boolean; ccy: string; size?: PrintSize }
): void {
  const { isAr, ccy, size = "a4" } = opts;
  const isReceipt = size === "receipt";
  const body = isReceipt ? receiptHtml(b, isAr, ccy) : a4Html(b, isAr, ccy);

  const pageCss = isReceipt
    ? `@page { size: 80mm auto; margin: 0; }`
    : `@page { size: A4; margin: 8mm; }`;

  const doc = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(b.reference)}</title>
    <style>
      ${pageCss}
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
        pending.forEach(function(im){
          im.addEventListener('load', done); im.addEventListener('error', done);
        });
        function done(){ if(--left <= 0) setTimeout(go, 60); }
        setTimeout(go, 1500); // احتياطي لو صورة اتأخّرت
      })();
    </script>
    </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert(isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open();
  w.document.write(doc);
  w.document.close();
}