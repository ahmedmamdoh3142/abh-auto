/**
 * lib/admin/pricelist-print.ts — طباعة/تصدير PDF لدفتر أسعار الخدمات (A4).
 *
 * يشتغل في كل الأوضاع:
 *   • وضع الموقع العام  → جدول (الخدمة + سعر كل حجم + السعر القديم لو موجود).
 *   • وضع شركة/دفتر     → جدول (الخدمة + سعر كل حجم + عمولة كل حجم) + اسم الطرف.
 * مقسّم حسب التصنيف (عنوان لكل فئة ثم خدماتها). هوية ABH AUTO فاخرة.
 *
 * الاستخدام:
 *   printPriceList({ title, subtitle, sizes, groups, mode, isAr, ccy });
 */

const logo_SRC = "/images/logo2.webp";

export type PriceMode = "public" | "partner";

export interface PriceRow {
  name: string;
  onRequest: boolean;
  /** sizeCode → { price, old?, commission? } */
  cells: Record<string, { price: number; old?: number; commission?: number }>;
}
export interface PriceGroup {
  category: string;
  rows: PriceRow[];
}
export interface PriceListInput {
  title: string;          // عنوان المستند (اسم الشركة/الدفتر أو «قائمة الأسعار»)
  subtitle?: string;      // سطر ثانوي تحت العنوان
  sizes: { code: string; label: string }[];
  groups: PriceGroup[];
  mode: PriceMode;        // public = أسعار فقط | partner = أسعار + عمولات
  isAr: boolean;
  ccy: string;
}

const money = (n: number | undefined) =>
  new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function logoBlock() {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 24px Georgia,serif;letter-spacing:1.5px;color:#fff;">ABH<span style="color:#c2a04e;">.</span></div>
      <div style="font-size:8.5px;letter-spacing:6px;color:#cbcdcd;margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  if (!logo_SRC) return fallback;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${logo_SRC}" alt="ABH AUTO" style="height:42px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}

function buildHtml(d: PriceListInput) {
  const T = (a: string, e: string) => (d.isAr ? a : e);
  const dir = d.isAr ? "rtl" : "ltr";
  const sA = d.isAr ? "right" : "left";
  const eA = d.isAr ? "left" : "right";
  const isPartner = d.mode === "partner";
  const issued = new Date().toLocaleDateString(d.isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  // أعمدة الحجم: في وضع الشركة كل حجم = (سعر + عمولة)؛ في العام = سعر فقط
  const sizeCols = d.sizes;
  const colSpanPerSize = isPartner ? 2 : 1;
  const totalCols = 1 + sizeCols.length * colSpanPerSize;

  // رأس الجدول (صفّان في وضع الشركة: حجم ثم سعر/عمولة)
  const headTop = `
    <tr style="background:#0c0d0e;">
      <th rowspan="${isPartner ? 2 : 1}" style="padding:9px 14px;font-size:10px;letter-spacing:1.5px;color:#fff;text-align:${sA};border-${eA}:1px solid #2a2b2e;">${T("الخدمة", "Service")}</th>
      ${sizeCols.map((s) => `<th colspan="${colSpanPerSize}" style="padding:9px 12px;font-size:10px;letter-spacing:1px;color:#fff;text-align:center;border-${eA}:1px solid #2a2b2e;">${esc(s.label)}</th>`).join("")}
    </tr>`;
  const headSub = isPartner ? `
    <tr style="background:#1a1b1e;">
      ${sizeCols.map(() => `
        <th style="padding:6px 10px;font-size:8.5px;letter-spacing:.5px;color:#9fd4b0;text-align:center;">${T("سعر", "Price")}</th>
        <th style="padding:6px 10px;font-size:8.5px;letter-spacing:.5px;color:#c2a04e;text-align:center;border-${eA}:1px solid #2a2b2e;">${T("عمولة", "Comm.")}</th>
      `).join("")}
    </tr>` : "";

  // صفوف كل تصنيف
  const body = d.groups.map((g) => {
    const catRow = `<tr><td colspan="${totalCols}" style="padding:11px 14px 7px;background:#faf9f6;border-top:2px solid #c2a04e;border-bottom:1px solid #ece9e1;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;color:#0c0d0e;text-transform:uppercase;">${esc(g.category)}</span>
      </td></tr>`;

    const rows = g.rows.map((r, i) => {
      const bg = i % 2 ? "#ffffff" : "#fbfaf7";
      if (r.onRequest) {
        return `<tr style="background:${bg};">
          <td style="padding:10px 14px;font-size:12px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;">${esc(r.name)}</td>
          <td colspan="${totalCols - 1}" style="padding:10px 14px;font-size:11.5px;color:#9a7a1f;text-align:center;border-bottom:1px solid #ece9e1;">${T("حسب الطلب", "On request")}</td>
        </tr>`;
      }
      const cells = sizeCols.map((s) => {
        const c = r.cells[s.code] || { price: 0 };
        const price = c.price > 0
          ? `${money(c.price)}${c.old && c.old > c.price ? `<span style="color:#b9810f;font-size:9px;text-decoration:line-through;margin-${sA}:4px;">${money(c.old)}</span>` : ""}`
          : `<span style="color:#bcbfc3;">—</span>`;
        if (!isPartner) {
          return `<td style="padding:10px 12px;font-size:12px;color:#15161a;text-align:center;border-bottom:1px solid #ece9e1;border-${eA}:1px solid #f0ede5;" dir="ltr">${price}</td>`;
        }
        const comm = (c.commission ?? 0) > 0
          ? `<span style="color:#9a7a1f;">${money(c.commission)}</span>`
          : `<span style="color:#bcbfc3;">—</span>`;
        return `
          <td style="padding:10px 10px;font-size:12px;color:#15161a;text-align:center;border-bottom:1px solid #ece9e1;" dir="ltr">${price}</td>
          <td style="padding:10px 10px;font-size:12px;text-align:center;border-bottom:1px solid #ece9e1;border-${eA}:1px solid #f0ede5;" dir="ltr">${comm}</td>`;
      }).join("");
      return `<tr style="background:${bg};">
        <td style="padding:10px 14px;font-size:12px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;border-${eA}:1px solid #f0ede5;">${esc(r.name)}</td>
        ${cells}
      </tr>`;
    }).join("");

    return catRow + rows;
  }).join("");

  const note = isPartner
    ? T(`القيم بالـ${d.ccy}. «سعر» = ما يُدفع للطرف. «عمولة» = ما يخصّ الطرف على كل بيعة لكل حجم.`,
        `Values in ${d.ccy}. “Price” = paid amount. “Comm.” = earned per sale, per size.`)
    : T(`القيم بالـ${d.ccy}. الأسعار الظاهرة على الموقع لكل حجم سيارة.`,
        `Values in ${d.ccy}. Public website prices per vehicle size.`);

  return `
  <div style="width:190mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <div style="background:#0c0d0e;padding:24px 30px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoBlock()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 19px Georgia,serif;letter-spacing:4px;color:#fff;">${esc(d.title)}</div>
        ${d.subtitle ? `<div style="font-size:11px;color:#aeb2b7;margin-top:5px;">${esc(d.subtitle)}</div>` : ""}
        <div style="font-size:10px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "Issued")} ${esc(issued)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>

    <div style="padding:22px 30px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #ece9e1;">
        <thead>${headTop}${headSub}</thead>
        <tbody>${body || `<tr><td colspan="${totalCols}" style="padding:20px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد خدمات", "No services")}</td></tr>`}</tbody>
      </table>
      <p style="margin:12px 2px 0;font-size:10.5px;color:#6c7077;line-height:1.7;">${note}</p>
    </div>

    <div style="border-top:1px solid #ece9e1;padding:13px 30px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10.5px;color:#6c7077;">${T("ABH AUTO — قائمة أسعار رسمية.", "ABH AUTO — official price list.")}</div>
      <div dir="ltr" style="font-size:10.5px;color:#9a9ea4;letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة A4 بقائمة الأسعار. */
export function printPriceList(input: PriceListInput): void {
  const body = buildHtml(input);
  const doc = `<!doctype html><html lang="${input.isAr ? "ar" : "en"}" dir="${input.isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(input.title)}</title>
    <style>
      @page { size: A4; margin: 8mm; }
      *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
      html,body{ margin:0; padding:0; background:#fff; }
      table { page-break-inside:auto; }
      tr { page-break-inside:avoid; page-break-after:auto; }
      thead { display:table-header-group; }
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
  const w = window.open("", "_blank", "width=1000,height=1100");
  if (!w) { alert(input.isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}