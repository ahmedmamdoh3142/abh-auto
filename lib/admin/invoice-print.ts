/**
 * lib/admin/invoice-print.ts — طباعة فاتورة ABH AUTO الضريبية عبر نافذة طباعة حقيقية.
 *
 * ليه الطريقة دي؟ المتصفّح بيرسم العربي والـRTL صح 100% (مفيش html2canvas يبوّظه)،
 * واللوجو بيتحط كصورة، والطباعة بتروح لـPDF أو ورق بضغطة. فيه حجمين:
 *   • A4       — فاتورة ضريبية كاملة (كروت مبرزة + QR ZATCA + سياسة الاسترجاع)
 *   • إيصال 80mm — فاتورة ضريبية مبسّطة (شكل الكاشير، كروت + QR + سياسة مختصرة)
 *
 * (تعديلات هذه النسخة)
 *   1) بيانات الشركة: الاسم + الرقم الموحّد + الرقم الضريبي في رأس الفاتورة.
 *   2) سياسة الاسترجاع والاستبدال في كرت مستقل بالفاتورتين.
 *   3) تفكيك الضريبة: الإجمالي قبل الضريبة + ض.ق.م 15% + الإجمالي شامل الضريبة.
 *   4) تبريز كل قسم على شكل كرت (خصوصًا إيصال الكاشير).
 *   5) رسالة الشكر + رابط الموقع.
 *   6) ترقيم فاتورة (1001…100000) — ثابت لكل حجز (أو يُمرَّر من الداتابيز).
 *   7) إيصال الكاشير: الهيدر كما هو (لوجو أسود بلا كونتينر على خلفية بيضاء)،
 *      وباقي الأقسام أُعيد تصميمها ككروت فخمة بعناوين ذهبية وصندوق إجمالي
 *      بصف أسود — نفس هوية الـPDF.
 *   + QR كود متوافق مع ZATCA (المرحلة الأولى) للفاتورة المبسّطة.
 *
 * الاستخدام:
 *   printBookingInvoice(b, { isAr, ccy, size: "a4" });      // أو size: "receipt"
 */

/* ══════════════ إعدادات الشركة (عدّلها من هنا) ══════════════ */
const COMPANY = {
  name: "ABH AUTO",
  nameAr: "ABH AUTO",
  unifiedNumber: "7034913488",         // الرقم الموحّد
  vatNumber: "311829832800003",        // الرقم الضريبي (VAT)
  website: "https://abh-auto.com/",
  websiteLabel: "abh-auto.com",
};

const VAT_RATE = 0.15;                  // 15% ضريبة القيمة المضافة
// ملاحظة: ترقيم الفواتير أصبح مُدارًا من الداتابيز (SEQUENCE + trigger) —
// الرقم يُصرَف لحظة تأكيد الدفع. الحجز غير المدفوع يُطبع كـ«فاتورة مبدئية».

// اللوجو الأبيض (للخلفية الغامقة — هيدر A4)
const LOGO_LIGHT_SRC = "/images/logo3.webp";
// اللوجو الأسود (للخلفية الفاتحة — هيدر إيصال الكاشير) — نفس مجلد اللوجو الأبيض
const LOGO_DARK_SRC = "/images/logo-black.webp";

/* سياسة الاسترجاع والاستبدال (تظهر في الفاتورتين) */
const RETURN_POLICY = {
  titleAr: "سياسة الاسترجاع والاستبدال",
  titleEn: "Refund & Exchange Policy",
  itemsAr: [
    "يحق للعميل طلب استرجاع المبلغ المدفوع خلال 7 أيام عمل من تاريخ الدفع، شريطة أن يكون الطلب قبل تنفيذ الخدمة.",
    "لا يُقبل أي طلب استرجاع بعد تنفيذ الخدمة أو بعد انتهاء فترة الاسترجاع المنصوص عليها، وذلك بصرف النظر عن السبب.",
    "يُعاد المبلغ المستحق إلى حساب العميل عبر وسيلة الدفع الأصلية خلال مدة لا تتجاوز 15 يوم عمل من تاريخ قبول الطلب.",
    "يحق للعميل استبدال الخدمة المحجوزة بخدمة أخرى قبل استلام المركبة، وفي حال كانت الخدمة البديلة أعلى سعرًا يلزم العميل بسداد فرق السعر.",
    "تسري صلاحية الحجز لمدة 3 أشهر من تاريخ الدفع، وفي حال انقضت المدة دون تنفيذ الخدمة يتم استرجاع مبلغ العميل بعد استقطاع ضريبة القيمة المضافة إلى حسابه البنكي أو محفظته الإلكترونية.",
    "لا تخضع المشتريات التي تمت بالقسائم الشرائية أو رموز الخصم لسياسة الاسترجاع بأي حال من الأحوال.",
    "لا تخضع العروض والباقات الخاصة للاسترجاع، ويُتاح الاستبدال بباقة مماثلة أو أعلى مع سداد فرق السعر.",
    "تُعد هذه السياسة جزءًا لا يتجزأ من عقد الخدمة، وإتمام الدفع يُعد قبولًا صريحًا لجميع بنودها.",
  ],
  itemsEn: [
    "A refund of the paid amount may be requested within 7 business days from the payment date, provided the request is made before the service is performed.",
    "No refund request is accepted after the service is performed or after the stated refund period ends, regardless of the reason.",
    "The due amount is returned to the customer via the original payment method within no more than 15 business days from the date the request is accepted.",
    "The customer may exchange the booked service for another before the vehicle is handed over; if the alternative service is of higher price, the customer pays the difference.",
    "The booking is valid for 3 months from the payment date. If the period lapses without the service being performed, the amount is refunded — after deducting VAT — to the customer's bank account or e-wallet.",
    "Purchases made with vouchers or discount codes are not subject to the refund policy under any circumstances.",
    "Special offers and packages are non-refundable; exchange is available for an equal or higher package with payment of the price difference.",
    "This policy is an integral part of the service contract, and completing payment is an explicit acceptance of all its terms.",
  ],
};

/* ══════════════ الأنواع ══════════════ */
type InvoiceService = { name: string; price: number; isGift?: boolean };
export type InvoiceBooking = {
  reference: string;
  invoiceNumber?: number; // (اختياري) رقم فاتورة من الداتابيز — لو موجود يُستخدم كما هو
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
  total: number;          // الإجمالي المدفوع (شامل ض.ق.م)
  paymentMethod?: string;
  payment?: string;
  status?: string;
  cancelReason?: string;
  services?: InvoiceService[];
};

type PrintSize = "a4" | "receipt";

/* ══════════════ أدوات مساعدة ══════════════ */
const money = (n: number | undefined) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
const money2 = (n: number | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** تفكيك الضريبة من إجمالي شامل ض.ق.م. */
function vatBreakdown(totalInclVat: number | undefined) {
  const total = Number(totalInclVat) || 0;
  const net = total / (1 + VAT_RATE);
  const vat = total - net;
  return { total, net, vat };
}

/**
 * حالة الفاتورة:
 *   • issued=true  → رقم ضريبي حقيقي من الداتابيز (الحجز مدفوع) → فاتورة ضريبية + QR.
 *   • issued=false → لا رقم بعد (غير مدفوع) → فاتورة مبدئية (Pro-forma) بدون QR.
 */
function resolveInvoice(b: InvoiceBooking): { issued: boolean; no: string | null } {
  if (b.invoiceNumber != null && Number.isFinite(Number(b.invoiceNumber)) && Number(b.invoiceNumber) > 0) {
    return { issued: true, no: String(Math.trunc(Number(b.invoiceNumber))).padStart(6, "0") };
  }
  return { issued: false, no: null };
}

function payInfo(status: string | undefined, isAr: boolean) {
  switch (status) {
    case "paid": return { label: isAr ? "مدفوع" : "Paid", color: "#1f9d6b", bg: "#e7f7ef" };
    case "refunded": return { label: isAr ? "مُسترَد" : "Refunded", color: "#6b7077", bg: "#eef0f2" };
    case "pay_at_branch": return { label: isAr ? "دفع بالفرع" : "Pay at branch", color: "#b9810f", bg: "#fdf3df" };
    default: return { label: isAr ? "بانتظار الدفع" : "Awaiting payment", color: "#b9810f", bg: "#fdf3df" };
  }
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

/** ترميز TLV → Base64 لِـ QR متوافق مع ZATCA (المرحلة الأولى). */
function zatcaQrBase64(totalInclVat: number, vatAmount: number): string {
  try {
    const enc = new TextEncoder();
    const fields: [number, string][] = [
      [1, COMPANY.name],
      [2, COMPANY.vatNumber],
      [3, new Date().toISOString()],
      [4, (Math.round(totalInclVat * 100) / 100).toFixed(2)],
      [5, (Math.round(vatAmount * 100) / 100).toFixed(2)],
    ];
    const bytes: number[] = [];
    for (const [tag, val] of fields) {
      const v = enc.encode(val);
      bytes.push(tag, v.length, ...Array.from(v));
    }
    let bin = "";
    for (const byte of bytes) bin += String.fromCharCode(byte);
    return btoa(bin);
  } catch { return ""; }
}

/* شعار أبيض (على خلفية غامقة): صورة لو متوفّرة، وإلا نص فخم احتياطي. */
function logoLight(height = 66) {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 26px Georgia,serif;letter-spacing:1.5px;color:#fff;">ABH<span style="color:#c2a04e;">.</span></div>
      <div style="font-size:9px;letter-spacing:7px;color:#cbcdcd;margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  if (!LOGO_LIGHT_SRC) return fallback;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${LOGO_LIGHT_SRC}" alt="ABH AUTO" style="height:${height}px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}
/* لوجو أسود للإيصال — أكبر وبدون كونتينر (على خلفية بيضاء). */
function logoDark(height = 86) {
  const fallback = `<div style="line-height:1;text-align:center;">
      <div style="font:800 30px Georgia,serif;letter-spacing:1.5px;color:#000;">ABH<span style="color:#000;">.</span></div>
      <div style="font-size:10px;letter-spacing:8px;color:#000;margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  if (!LOGO_DARK_SRC) return fallback;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${LOGO_DARK_SRC}" alt="ABH AUTO" style="height:${height}px;width:auto;display:block;margin:0 auto;" onerror="this.outerHTML=${fb}"/>`;
}

/* ═════════════════════════ A4 ═════════════════════════ */
function a4Html(b: InvoiceBooking, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";
  const services = (b.services || []).filter((s) => s && s.name);
  const pay = payInfo(b.payment, isAr);
  const issuedDate = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const inv = resolveInvoice(b);
  const proforma = !inv.issued;
  const { total, net, vat } = vatBreakdown(b.total);
  // QR ZATCA يُصدر فقط للفاتورة الضريبية الحقيقية (المدفوعة).
  const qr = inv.issued ? zatcaQrBase64(total, vat) : "";

  const gold = "#c2a04e";
  const cardOpen = (title: string) => `
    <div style="border:1px solid #e7e3d8;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 0 #f2efe6;">
      <div style="background:linear-gradient(90deg,#faf8f2,#fff);border-bottom:1px solid #efe9db;padding:9px 16px;display:flex;align-items:center;gap:8px;">
        <span style="height:8px;width:8px;border-radius:99px;background:${gold};display:inline-block;"></span>
        <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${gold};font-weight:700;">${esc(title)}</span>
      </div>
      <div style="padding:14px 16px;">`;
  const cardClose = `</div></div>`;

  const info = (l: string, v: string, ltr = false) =>
    `<div style="margin-bottom:9px;"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:2px;">${esc(l)}</div><div ${ltr ? 'dir="ltr"' : ""} style="font-size:13px;color:#15161a;text-align:${sA};font-weight:600;">${esc(v || "—")}</div></div>`;

  const rows = services.length === 0
    ? `<tr><td colspan="2" style="padding:16px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const gift = !!s.isGift;
        const price = gift && (Number(s.price) || 0) === 0
          ? `<b style="color:${gold};">${T("مجانية", "Free")}</b>`
          : (Number(s.price) > 0 ? `${money(s.price)} <span style="color:#9a9ea4;font-size:11px;">${esc(ccy)}</span>` : T("حسب الطلب", "On request"));
        const chip = gift ? ` <span style="padding:1px 7px;border-radius:99px;font-size:10px;color:${gold};background:#f3ead0;border:1px solid ${gold}55;">${T("هدية", "Gift")}</span>` : "";
        return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:12px 16px;font-size:13px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;font-weight:600;">${esc(s.name)}${chip}</td>
          <td style="padding:12px 16px;font-size:13px;color:#15161a;text-align:${eA};white-space:nowrap;border-bottom:1px solid #ece9e1;">${price}</td>
        </tr>`;
      }).join("");

  const policyItems = (isAr ? RETURN_POLICY.itemsAr : RETURN_POLICY.itemsEn)
    .map((p) => `<li style="margin-bottom:6px;padding-inline-start:2px;">${esc(p)}</li>`).join("");

  return `
  <div style="width:190mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <!-- الهيدر -->
    <div style="background:#0c0d0e;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoLight()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 20px Georgia,serif;letter-spacing:5px;color:#fff;">${proforma ? T("فاتورة مبدئية", "PRO-FORMA") : T("فاتورة ضريبية", "TAX INVOICE")}</div>
        ${inv.issued
          ? `<div dir="ltr" style="font-size:12px;color:#e4c979;margin-top:7px;text-align:${eA};font-weight:700;">${T("فاتورة", "Invoice")} #${esc(inv.no)}</div>`
          : `<div style="font-size:10px;color:#e4c979;margin-top:7px;text-align:${eA};font-weight:700;">${T(" ضريبية — تُصدر بعد الدفع", "Tax — issued after payment")}</div>`}
        <div dir="ltr" style="font-size:11px;color:#aeb2b7;margin-top:3px;text-align:${eA};">${T("حجز", "Booking")} ${esc(b.reference)}</div>
        <div style="font-size:10.5px;color:#8b8f95;margin-top:2px;">${T("بتاريخ", "Issued")} ${esc(issuedDate)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>

    <!-- شريط بيانات الشركة -->
    <div style="background:#faf8f2;border-bottom:1px solid #efe9db;padding:11px 32px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 26px;font-size:11.5px;color:#3a3d42;">
      <span style="font-weight:800;color:#0c0d0e;letter-spacing:.5px;">${esc(COMPANY.name)}</span>
      <span>${T("الرقم الموحّد", "Unified No.")}: <b dir="ltr" style="color:#0c0d0e;">${esc(COMPANY.unifiedNumber)}</b></span>
      <span>${T("الرقم الضريبي", "VAT No.")}: <b dir="ltr" style="color:#0c0d0e;">${esc(COMPANY.vatNumber)}</b></span>
    </div>

    <div style="padding:22px 32px;">
      <!-- كروت العميل + السيارة -->
      <div style="display:flex;gap:18px;margin-bottom:18px;">
        <div style="flex:1;">
          ${cardOpen(T("بيانات العميل", "Customer"))}
            ${info(T("الاسم", "Name"), b.customer || "—")}
            ${info(T("التليفون", "Phone"), b.phone || "—", true)}
            ${info(T("الإيميل", "Email"), b.email || "—", true)}
            ${info(T("المدينة", "City"), b.city || "—")}
          ${cardClose}
        </div>
        <div style="flex:1;">
          ${cardOpen(T("السيارة والموعد", "Vehicle & schedule"))}
            ${info(T("السيارة", "Vehicle"), b.vehicle || "—")}
            ${info(T("اللوحة", "Plate"), b.plate || "—", true)}
            ${info(T("الفرع", "Branch"), b.branch || "—")}
            ${info(T("الموعد", "Date & time"), `${fmtDate(b.date, isAr)}${b.time ? " · " + b.time : ""}`)}
          ${cardClose}
        </div>
      </div>

      <!-- كرت الخدمات -->
      <div style="margin-bottom:18px;">
        ${cardOpen(T("تفاصيل الخدمات", "Services"))}
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#0c0d0e;">
              <th style="padding:9px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${sA};border-radius:${isAr ? "0 6px 6px 0" : "6px 0 0 6px"};">${T("الخدمة", "Service")}</th>
              <th style="padding:9px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${eA};border-radius:${isAr ? "6px 0 0 6px" : "0 6px 6px 0"};">${T("السعر", "Price")}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        ${cardClose}
      </div>

      <!-- الدفع + الإجمالي (تفكيك الضريبة) + QR -->
      <div style="display:flex;gap:18px;align-items:stretch;margin-bottom:18px;">
        <div style="flex:1;">
          ${cardOpen(T("الدفع", "Payment"))}
            <span style="display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:99px;background:${pay.bg};color:${pay.color};font-size:11.5px;font-weight:700;">
              <span style="height:8px;width:8px;border-radius:99px;background:${pay.color};"></span>${esc(pay.label)}
            </span>
            <div style="margin-top:12px;font-size:11.5px;color:#6c7077;line-height:2;">
              ${T("طريقة الدفع", "Payment method")}: <b style="color:#15161a;">${esc(payMethodLabel(b.paymentMethod, isAr))}</b>
            </div>
            ${qr ? `<div style="margin-top:14px;display:flex;align-items:center;gap:12px;border-top:1px dashed #e7e3d8;padding-top:12px;">
              <div id="zatca-qr" style="width:96px;height:96px;flex:0 0 auto;"></div>
              <div style="font-size:10px;color:#9a9ea4;line-height:1.7;">${T("امسح للتحقّق من الفاتورة الضريبية", "Scan to verify this tax invoice")}<br/>${T("متوافق مع هيئة الزكاة والضريبة (ZATCA)", "ZATCA compliant")}</div>
            </div>` : ""}
          ${cardClose}
        </div>
        <div style="width:280px;">
          <div style="border:1px solid #e7e3d8;border-radius:14px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;padding:11px 16px;font-size:12.5px;color:#6c7077;background:#fff;"><span>${T("الإجمالي قبل الضريبة", "Total (excl. VAT)")}</span><span dir="ltr" style="color:#15161a;font-weight:600;">${money2(net)} ${esc(ccy)}</span></div>
            ${Number(b.towing) > 0 ? `<div style="display:flex;justify-content:space-between;padding:0 16px 10px;font-size:11.5px;color:#9a9ea4;"><span>${T("منها النقل", "incl. towing")}</span><span dir="ltr">${money(b.towing)} ${esc(ccy)}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;padding:11px 16px;font-size:12.5px;color:#6c7077;border-top:1px solid #f0ede4;background:#faf9f6;"><span>${T("ض.ق.م", "VAT")} (${VAT_RATE * 100}%)</span><span dir="ltr" style="color:#15161a;font-weight:600;">${money2(vat)} ${esc(ccy)}</span></div>
            <div style="background:#0c0d0e;display:flex;justify-content:space-between;align-items:baseline;padding:14px 16px;">
              <span style="font-size:10px;letter-spacing:1.5px;color:#cbcdcd;">${T("الإجمالي شامل الضريبة", "TOTAL (incl. VAT)")}</span>
              <span dir="ltr" style="font-size:21px;font-weight:800;color:#fff;">${money2(total)} <span style="font-size:11px;color:#e4c979;">${esc(ccy)}</span></span>
            </div>
          </div>
          <div style="margin-top:8px;font-size:10px;color:#9a9ea4;text-align:${eA};line-height:1.6;">${T(`جميع الأسعار شاملة ضريبة القيمة المضافة ${VAT_RATE * 100}%.`, `All prices are inclusive of ${VAT_RATE * 100}% VAT.`)}</div>
        </div>
      </div>

      ${b.status === "cancelled" && b.cancelReason ? `<div style="margin-bottom:18px;border:1px solid #f0c6c0;background:#fdeeec;border-radius:12px;padding:11px 15px;font-size:12px;color:#a23b30;"><b>${T("سبب الإلغاء", "Cancellation reason")}:</b> ${esc(b.cancelReason)}</div>` : ""}

      <!-- كرت سياسة الاسترجاع -->
      ${cardOpen(isAr ? RETURN_POLICY.titleAr : RETURN_POLICY.titleEn)}
        <ol style="margin:0;padding-inline-start:18px;font-size:11px;line-height:1.75;color:#4a4d52;text-align:${sA};">
          ${policyItems}
        </ol>
      ${cardClose}
    </div>

    <!-- الفوتر -->
    <div style="border-top:1px solid #ece9e1;padding:15px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="font-size:11.5px;color:#3a3d42;font-weight:600;">${T("شكرًا لاختيارك ABH AUTO", "Thank you for choosing ABH AUTO")}</div>
      <a href="${esc(COMPANY.website)}" dir="ltr" style="font-size:11px;color:#c2a04e;letter-spacing:1px;text-decoration:none;font-weight:700;">${esc(COMPANY.website)}</a>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/* ═════════════════ إيصال 80mm (فاتورة ضريبية مبسّطة — كروت بهوية الـPDF) ═════════════════ */
function receiptHtml(b: InvoiceBooking, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";
  const services = (b.services || []).filter((s) => s && s.name);
  const pay = payInfo(b.payment, isAr);
  const issued = new Date().toLocaleString(isAr ? "ar-EG" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const inv = resolveInvoice(b);
  const proforma = !inv.issued;
  const { total, net, vat } = vatBreakdown(b.total);
  const qr = inv.issued ? zatcaQrBase64(total, vat) : "";

  const gold = "#c2a04e";

  // كرت بعنوان ذهبي (نفس هوية الـA4)
  const cardOpen = (title: string) => `
    <div style="border:1px solid #e7e3d8;border-radius:12px;overflow:hidden;background:#fff;margin-top:8px;box-shadow:0 1px 0 #f2efe6;">
      <div style="background:linear-gradient(90deg,#faf8f2,#fff);border-bottom:1px solid #efe9db;padding:6px 10px;display:flex;align-items:center;gap:6px;">
        <span style="height:7px;width:7px;border-radius:99px;background:${gold};display:inline-block;"></span>
        <span style="font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:${gold};font-weight:700;">${esc(title)}</span>
      </div>
      <div style="padding:9px 11px;">`;
  const cardClose = `</div></div>`;

  // سطر معلومة (label يسار خافت / value يمين غامق)
  const info = (l: string, v: string, ltr = false) =>
    `<div style="display:flex;justify-content:space-between;gap:8px;margin:4px 0;font-size:11.5px;line-height:1.5;"><span style="color:#6c7077;">${esc(l)}</span><span ${ltr ? 'dir="ltr"' : ""} style="color:#15161a;font-weight:700;text-align:${eA};">${esc(v || "—")}</span></div>`;

  // صفوف جدول الخدمات (صف رأس أسود زي A4)
  const rows = services.length === 0
    ? `<tr><td colspan="2" style="padding:12px;text-align:center;color:#6c7077;font-size:11px;">${T("لا توجد خدمات", "No services")}</td></tr>`
    : services.map((s, i) => {
        const gift = !!s.isGift;
        const price = gift && (Number(s.price) || 0) === 0
          ? `<b style="color:${gold};">${T("مجانية", "Free")}</b>`
          : (Number(s.price) > 0 ? `${money(s.price)} <span style="color:#9a9ea4;font-size:9px;">${esc(ccy)}</span>` : T("حسب الطلب", "On req."));
        const chip = gift ? ` <span style="padding:1px 6px;border-radius:99px;font-size:8px;color:${gold};background:#f3ead0;border:1px solid ${gold}55;">${T("هدية", "Gift")}</span>` : "";
        return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:7px 10px;font-size:11px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;font-weight:600;">${esc(s.name)}${chip}</td>
          <td style="padding:7px 10px;font-size:11px;color:#15161a;text-align:${eA};white-space:nowrap;border-bottom:1px solid #ece9e1;">${price}</td>
        </tr>`;
      }).join("");

  const policyItems = (isAr ? RETURN_POLICY.itemsAr : RETURN_POLICY.itemsEn)
    .map((p) => `<li style="margin-bottom:5px;">${esc(p)}</li>`).join("");

  return `
  <div style="width:76mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Tahoma','Segoe UI',sans-serif;direction:${dir};padding:3mm 2mm;">
    <!-- ═══ الهيدر (كما هو: لوجو أسود بلا كونتينر) ═══ -->
    <div style="text-align:center;margin-bottom:6px;">${logoDark(86)}</div>

    <!-- بيانات الشركة -->
    <div style="text-align:center;font-size:11px;color:#000;line-height:1.6;font-weight:600;">
      <div style="font-size:13px;font-weight:800;letter-spacing:.5px;">${esc(COMPANY.name)}</div>
      <div>${T("الرقم الموحّد", "Unified No.")}: <b dir="ltr">${esc(COMPANY.unifiedNumber)}</b></div>
      <div>${T("الرقم الضريبي", "VAT No.")}: <b dir="ltr">${esc(COMPANY.vatNumber)}</b></div>
    </div>

    <!-- شريط العنوان + فاصل ذهبي (هوية الـPDF) -->
    <div style="text-align:center;font-size:12px;font-weight:800;color:#fff;background:#0c0d0e;letter-spacing:1px;margin-top:8px;padding:6px 0;border-radius:7px 7px 0 0;">${proforma ? T("فاتورة مبدئية", "PRO-FORMA INVOICE") : T("فاتورة ضريبية مبسّطة", "SIMPLIFIED TAX INVOICE")}</div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);border-radius:0 0 3px 3px;"></div>

    <!-- ═══ الكروت (بهوية الـPDF) ═══ -->

    <!-- كرت بيانات الحجز -->
    ${cardOpen(T("بيانات الحجز", "Booking"))}
      ${inv.issued
        ? info(T("رقم الفاتورة", "Invoice No."), `#${inv.no}`, true)
        : info(T("الحالة", "Status"), T("غير ضريبية — تُصدر بعد الدفع", "Non-tax — after payment"))}
      ${info(T("رقم الحجز", "Reference"), b.reference || "—", true)}
      ${info(T("التاريخ", "Date"), issued, true)}
    ${cardClose}

    <!-- كرت العميل -->
    ${cardOpen(T("بيانات العميل", "Customer"))}
      ${info(T("الاسم", "Name"), b.customer || "—")}
      ${b.phone ? info(T("التليفون", "Phone"), b.phone, true) : ""}
    ${cardClose}

    <!-- كرت السيارة والموعد -->
    ${cardOpen(T("السيارة والموعد", "Vehicle & schedule"))}
      ${b.vehicle ? info(T("السيارة", "Vehicle"), b.vehicle) : ""}
      ${b.plate ? info(T("اللوحة", "Plate"), b.plate, true) : ""}
      ${b.branch ? info(T("الفرع", "Branch"), b.branch) : ""}
      ${(b.date || b.time) ? info(T("الموعد", "When"), `${fmtDate(b.date, isAr)} ${b.time || ""}`.trim()) : ""}
    ${cardClose}

    <!-- كرت الخدمات (جدول بصف رأس أسود) -->
    <div style="border:1px solid #e7e3d8;border-radius:12px;overflow:hidden;background:#fff;margin-top:8px;box-shadow:0 1px 0 #f2efe6;">
      <div style="background:linear-gradient(90deg,#faf8f2,#fff);border-bottom:1px solid #efe9db;padding:6px 10px;display:flex;align-items:center;gap:6px;">
        <span style="height:7px;width:7px;border-radius:99px;background:${gold};display:inline-block;"></span>
        <span style="font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;color:${gold};font-weight:700;">${T("تفاصيل الخدمات", "Services")}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0c0d0e;">
          <th style="padding:6px 10px;font-size:8.5px;letter-spacing:1px;color:#fff;text-align:${sA};font-weight:700;">${T("الخدمة", "Service")}</th>
          <th style="padding:6px 10px;font-size:8.5px;letter-spacing:1px;color:#fff;text-align:${eA};font-weight:700;">${T("السعر", "Price")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- صندوق الإجمالي (تفكيك الضريبة + صف أسود) -->
    <div style="border:1px solid #e7e3d8;border-radius:12px;overflow:hidden;margin-top:8px;">
      <div style="display:flex;justify-content:space-between;padding:8px 11px;font-size:11.5px;color:#6c7077;background:#fff;"><span>${T("الإجمالي قبل الضريبة", "Total (excl. VAT)")}</span><span dir="ltr" style="color:#15161a;font-weight:700;">${money2(net)} ${esc(ccy)}</span></div>
      ${Number(b.towing) > 0 ? `<div style="display:flex;justify-content:space-between;padding:0 11px 8px;font-size:10px;color:#9a9ea4;"><span>${T("منها النقل", "incl. towing")}</span><span dir="ltr">${money(b.towing)} ${esc(ccy)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:8px 11px;font-size:11.5px;color:#6c7077;border-top:1px solid #f0ede4;background:#faf9f6;"><span>${T("ض.ق.م", "VAT")} (${VAT_RATE * 100}%)</span><span dir="ltr" style="color:#15161a;font-weight:700;">${money2(vat)} ${esc(ccy)}</span></div>
      <div style="background:#0c0d0e;display:flex;justify-content:space-between;align-items:baseline;padding:11px;">
        <span style="font-size:9px;letter-spacing:1px;color:#cbcdcd;">${T("الإجمالي شامل الضريبة", "TOTAL (incl. VAT)")}</span>
        <span dir="ltr" style="font-size:18px;font-weight:800;color:#fff;">${money2(total)} <span style="font-size:9px;color:#e4c979;">${esc(ccy)}</span></span>
      </div>
    </div>
    <div style="text-align:center;font-size:8.5px;color:#9a9ea4;margin-top:5px;">${T(`الأسعار شاملة ض.ق.م ${VAT_RATE * 100}%`, `Prices incl. ${VAT_RATE * 100}% VAT`)}</div>

    <!-- كرت الدفع (شارة ملوّنة زي A4) -->
    ${cardOpen(T("الدفع", "Payment"))}
      <div style="text-align:center;">
        <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:99px;background:${pay.bg};color:${pay.color};font-size:11.5px;font-weight:700;"><span style="height:7px;width:7px;border-radius:99px;background:${pay.color};"></span>${esc(pay.label)}</span>
      </div>
      <div style="margin-top:9px;font-size:11px;color:#6c7077;line-height:1.9;text-align:center;">
        ${T("طريقة الدفع", "Method")}: <b style="color:#15161a;">${esc(payMethodLabel(b.paymentMethod, isAr))}</b>
      </div>
    ${cardClose}

    ${qr ? `<!-- QR ZATCA -->
    <div style="text-align:center;margin-top:10px;border:1px solid #e7e3d8;border-radius:12px;padding:11px;background:#fff;">
      <div id="zatca-qr" style="width:120px;height:120px;margin:0 auto;"></div>
      <div style="font-size:9px;color:#6c7077;margin-top:6px;font-weight:600;line-height:1.5;">${T("امسح للتحقّق من الفاتورة الضريبية", "Scan to verify this tax invoice")}<br/>${T("متوافق مع هيئة الزكاة والضريبة (ZATCA)", "ZATCA compliant")}</div>
    </div>` : ""}

    ${b.status === "cancelled" && b.cancelReason ? `<div style="margin-top:8px;border:1px solid #f0c6c0;background:#fdeeec;border-radius:12px;padding:9px 11px;font-size:10.5px;color:#a23b30;"><b>${T("سبب الإلغاء", "Cancellation reason")}:</b> ${esc(b.cancelReason)}</div>` : ""}

    <!-- كرت سياسة الاسترجاع -->
    ${cardOpen(isAr ? RETURN_POLICY.titleAr : RETURN_POLICY.titleEn)}
      <ol style="margin:0;padding-inline-start:16px;font-size:9px;line-height:1.6;color:#4a4d52;text-align:${sA};font-weight:500;">
        ${policyItems}
      </ol>
    ${cardClose}

    <!-- الفوتر -->
    <div style="text-align:center;margin-top:12px;padding-top:10px;border-top:1px dashed #d8d3c6;">
      <div style="font-size:11.5px;font-weight:700;color:#15161a;">${T("شكرًا لاختيارك ABH AUTO", "Thank you for choosing ABH AUTO")}</div>
      <a href="${esc(COMPANY.website)}" dir="ltr" style="font-size:11px;font-weight:700;color:#c2a04e;text-decoration:none;letter-spacing:.5px;">${esc(COMPANY.website)}</a>
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

  // بيانات الـQR (تُحقن في نافذة الطباعة) — فقط للفاتورة الضريبية الحقيقية (المدفوعة)
  const inv = resolveInvoice(b);
  const { total, vat } = vatBreakdown(b.total);
  const qrData = inv.issued ? zatcaQrBase64(total, vat) : "";
  const titleNo = inv.no ?? b.reference;

  const pageCss = isReceipt
    ? `@page { size: 80mm auto; margin: 0; }`
    : `@page { size: A4; margin: 8mm; }`;

  const doc = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(titleNo)}</title>
    ${qrData ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>` : ""}
    <style>
      ${pageCss}
      *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
      html,body{ margin:0; padding:0; background:#fff; }
      #zatca-qr img, #zatca-qr canvas{ display:block; margin:0 auto; }
      @media screen { body{ padding:14px; background:#e9e9e6; } }
    </style></head>
    <body>${body}
    <script>
      (function(){
        var qrData = ${JSON.stringify(qrData)};
        var qrEl = document.getElementById('zatca-qr');
        // توليد QR (متوافق ZATCA) إن توفّرت المكتبة
        if (qrData && qrEl && typeof QRCode !== 'undefined') {
          try {
            new QRCode(qrEl, {
              text: qrData,
              width: qrEl.clientWidth || 118,
              height: qrEl.clientHeight || 118,
              correctLevel: QRCode.CorrectLevel.M
            });
          } catch (e) {}
        }
        function go(){ window.focus(); window.print(); }
        function waitImages(){
          var imgs = Array.prototype.slice.call(document.images || []);
          var pending = imgs.filter(function(im){ return !im.complete; });
          if (pending.length === 0){ setTimeout(go, 80); return; }
          var left = pending.length;
          function done(){ if(--left <= 0) setTimeout(go, 80); }
          pending.forEach(function(im){ im.addEventListener('load', done); im.addEventListener('error', done); });
          setTimeout(go, 2000); // احتياطي لو صورة/الـQR اتأخّروا
        }
        // مهلة صغيرة لرسم الـQR ثم انتظار الصور
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