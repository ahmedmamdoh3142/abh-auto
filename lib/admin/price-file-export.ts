/**
 * lib/admin/price-file-export.ts — تصدير ملف أسعار كـExcel (CSV/XLSX متوافق) وPDF احترافي.
 *
 *  exportPriceFileExcel(opts)  → ينزّل ملف .xls (HTML-table flavour يفتح في Excel مباشرة، عربي سليم).
 *  exportPriceFilePDF(opts)    → يفتح نافذة طباعة A4 احترافية (Save as PDF من المتصفح).
 *
 *  مفيش أي dependency خارجي — كله Blob + window.print، يشتغل في المتصفح فورًا.
 */

export type ExportSize = { code: string; label: string };
export type ExportRow = {
  name: string;
  onRequest?: boolean;
  // لكل size: القيم
  cells: Record<string, { price: number; old?: number; commission?: number }>;
};
export type ExportGroup = { category: string; rows: ExportRow[] };

export type PriceFileExportOpts = {
  fileName: string;        // اسم الملف (للعنوان واسم التنزيل)
  fileDate: string;        // تاريخ منسّق للعرض
  categoryLabel: string;   // اسم الفئة بالعربي/الإنجليزي
  mode: "public" | "partner" | "rep";
  sizes: ExportSize[];
  groups: ExportGroup[];
  isAr: boolean;
  ccy: string;
  approved?: boolean;
  logoUrl?: string;        // مسار اللوجو (مثلاً "/images/logo.webp") — يظهر في رأس الـPDF
};

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nf = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
const safeFile = (s: string) => s.replace(/[^\w\u0600-\u06FF\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "price-file";

/* ═══════════════════════ Excel (.xls) ═══════════════════════ */
export function exportPriceFileExcel(opts: PriceFileExportOpts) {
  const { fileName, fileDate, categoryLabel, mode, sizes, groups, isAr, ccy } = opts;
  const showCommission = mode !== "public";
  const dir = isAr ? "rtl" : "ltr";

  const head = (label: string) => `<th style="background:#111;color:#fff;border:1px solid #333;padding:8px 10px;font-weight:700;">${esc(label)}</th>`;

  // أعمدة: الخدمة + (لكل حجم: سعر [+ قديم للموقع] [+ عمولة للشركاء/مناديب])
  let header = `<tr>${head(isAr ? "الخدمة" : "Service")}`;
  for (const s of sizes) {
    header += head(`${s.label} — ${isAr ? "السعر" : "Price"}`);
    if (mode === "public") header += head(`${s.label} — ${isAr ? "قديم" : "Old"}`);
    if (showCommission) header += head(`${s.label} — ${isAr ? "عمولة" : "Comm."}`);
  }
  header += `</tr>`;

  let bodyRows = "";
  for (const g of groups) {
    const span = 1 + sizes.length * (1 + (mode === "public" ? 1 : 0) + (showCommission ? 1 : 0));
    bodyRows += `<tr><td colspan="${span}" style="background:#e9e9e9;border:1px solid #ccc;padding:8px 10px;font-weight:800;">${esc(g.category)}</td></tr>`;
    for (const r of g.rows) {
      let tds = `<td style="border:1px solid #ccc;padding:7px 10px;">${esc(r.name)}</td>`;
      for (const s of sizes) {
        const c = r.cells[s.code] || { price: 0 };
        if (r.onRequest) {
          const inner = isAr ? "عند الطلب" : "On request";
          const cols = 1 + (mode === "public" ? 1 : 0) + (showCommission ? 1 : 0);
          tds += `<td colspan="${cols}" style="border:1px solid #ccc;padding:7px 10px;color:#777;">${inner}</td>`;
        } else {
          tds += `<td style="border:1px solid #ccc;padding:7px 10px;">${c.price ? nf(c.price) : "—"}</td>`;
          if (mode === "public") tds += `<td style="border:1px solid #ccc;padding:7px 10px;color:#999;">${c.old ? nf(c.old) : "—"}</td>`;
          if (showCommission) tds += `<td style="border:1px solid #ccc;padding:7px 10px;">${c.commission ? nf(c.commission) : "—"}</td>`;
        }
      }
      bodyRows += `<tr>${tds}</tr>`;
    }
  }

  const html = `<html dir="${dir}"><head><meta charset="utf-8"></head><body>
    <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
      <tr><td colspan="99" style="padding:10px;font-size:16px;font-weight:800;">ABH AUTO — ${esc(fileName)}</td></tr>
      <tr><td colspan="99" style="padding:4px 10px;color:#555;">${esc(categoryLabel)} · ${esc(fileDate)} · ${esc(ccy)}</td></tr>
      <tr><td colspan="99"></td></tr>
      ${header}${bodyRows}
    </table></body></html>`;

  const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFile(fileName)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ═══════════════════════ PDF (طباعة A4 احترافية) ═══════════════════════ */
export function exportPriceFilePDF(opts: PriceFileExportOpts) {
  const { fileName, fileDate, categoryLabel, mode, sizes, groups, isAr, ccy, approved, logoUrl } = opts;
  const showCommission = mode !== "public";
  const dir = isAr ? "rtl" : "ltr";
  const T = (ar: string, en: string) => (isAr ? ar : en);

  // عدد الأعمدة الفرعية لكل حجم (سعر + [قديم] + [عمولة])
  const subCols = 1 + (mode === "public" ? 1 : 0) + (showCommission ? 1 : 0);

  // ── رأس بصفّين: صف للأحجام (مدموج) + صف لنوع القيمة ──
  // صف 1: الخدمة (rowspan=2) + كل حجم (colspan=subCols)
  let headRow1 = `<th rowspan="2" class="hsvc">${esc(T("الخدمة", "Service"))}</th>`;
  for (const s of sizes) headRow1 += `<th colspan="${subCols}" class="hsize">${esc(s.label)}</th>`;

  // صف 2: تحت كل حجم → الأعمدة الفرعية بنفس الترتيب بالظبط
  let headRow2 = "";
  for (const _ of sizes) {
    headRow2 += `<th class="hsub">${esc(T("السعر", "Price"))}</th>`;
    if (mode === "public") headRow2 += `<th class="hsub">${esc(T("قديم", "Old"))}</th>`;
    if (showCommission) headRow2 += `<th class="hsub">${esc(T("عمولة", "Comm."))}</th>`;
  }

  const header = `<tr>${headRow1}</tr><tr>${headRow2}</tr>`;

  // ── الجسم: نفس ترتيب الأعمدة الفرعية بالظبط ──
  let body = "";
  for (const g of groups) {
    const span = 1 + sizes.length * subCols;
    body += `<tr class="cat"><td colspan="${span}">${esc(g.category)}</td></tr>`;
    for (const r of g.rows) {
      let tds = `<td class="svc">${esc(r.name)}</td>`;
      for (const s of sizes) {
        const c = r.cells[s.code] || { price: 0 };
        if (r.onRequest) {
          tds += `<td colspan="${subCols}" class="req">${T("عند الطلب", "On request")}</td>`;
        } else {
          tds += `<td class="num">${c.price ? nf(c.price) : "—"}</td>`;
          if (mode === "public") tds += `<td class="num old">${c.old ? nf(c.old) : "—"}</td>`;
          if (showCommission) tds += `<td class="num">${c.commission ? nf(c.commission) : "—"}</td>`;
        }
      }
      body += `<tr>${tds}</tr>`;
    }
  }

  const badge = approved ? `<span class="approved">★ ${T("معتمد", "APPROVED")}</span>` : "";
  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" class="logo" alt="ABH AUTO" />`
    : `<div class="brand">ABH AUTO<small>${T("قائمة أسعار", "PRICE LIST")}</small></div>`;

  const html = `<!doctype html><html dir="${dir}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8">
<title>${esc(fileName)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans Arabic','Segoe UI',Arial,sans-serif; color:#0d0d0d; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .wrap { padding: 4px; }
  .top { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0d0d0d; padding-bottom:12px; margin-bottom:4px; gap:20px; }
  .logo { height:76px; width:auto; object-fit:contain; }
  .brand { font-size:26px; font-weight:800; letter-spacing:.18em; }
  .brand small { display:block; font-size:9px; letter-spacing:.34em; color:#888; font-weight:600; margin-top:3px; }
  .meta { text-align:${isAr ? "left" : "right"}; font-size:11px; color:#555; line-height:1.7; }
  .meta .fname { font-size:15px; font-weight:800; color:#0d0d0d; }
  .approved { display:inline-block; margin-top:5px; padding:3px 12px; border:2px solid #c2a04e; color:#9c7d2f; border-radius:999px; font-size:10px; font-weight:800; letter-spacing:.14em; }
  table { width:100%; border-collapse:collapse; margin-top:14px; table-layout:fixed; }
  th { background:#0d0d0d; color:#fff; padding:6px 6px; border:1px solid #0d0d0d; text-align:center; }
  th.hsvc { text-align:${isAr ? "right" : "left"}; vertical-align:middle; width:24%; font-size:11px; font-weight:700; }
  th.hsize { font-size:11.5px; font-weight:800; border-bottom:1px solid #444; letter-spacing:.02em; }
  th.hsub { font-size:8.5px; font-weight:600; color:#cfcfcf; background:#1a1a1a; letter-spacing:.04em; }
  td { padding:6px 6px; border:1px solid #ddd; font-size:11px; }
  tr.cat td { background:#efefef; font-weight:800; font-size:11px; letter-spacing:.04em; border-color:#ccc; text-align:${isAr ? "right" : "left"}; }
  td.svc { font-weight:600; text-align:${isAr ? "right" : "left"}; }
  td.num { text-align:center; font-variant-numeric:tabular-nums; direction:ltr; unicode-bidi:plaintext; }
  td.old { color:#aaa; text-decoration:line-through; font-size:10px; }
  td.req { color:#888; font-style:italic; text-align:center; }
  tbody tr:nth-child(even) td:not(.cat) { background:#fafafa; }
  .foot { margin-top:18px; padding-top:10px; border-top:1px solid #ddd; font-size:9.5px; color:#999; display:flex; justify-content:space-between; }
</style></head>
<body><div class="wrap">
  <div class="top">
    ${logo}
    <div class="meta">
      <div class="fname">${esc(fileName)}</div>
      <div>${esc(categoryLabel)} · ${esc(fileDate)}</div>
      <div>${T("العملة", "Currency")}: ${esc(ccy)}</div>
      ${badge}
    </div>
  </div>
  <table>
    <thead>${header}</thead>
    <tbody>${body}</tbody>
  </table>
  <div class="foot">
    <span>ABH AUTO · ${esc(categoryLabel)}</span>
    <span>${T("طُبع في", "Printed")}: ${esc(new Date().toLocaleString(isAr ? "ar-SA" : "en-US"))}</span>
  </div>
</div>
<script>
  window.onload=function(){
    var imgs = document.images, done = 0, total = imgs.length;
    function go(){ setTimeout(function(){ window.print(); }, 350); }
    if (!total) return go();
    for (var i=0;i<total;i++){
      if (imgs[i].complete) { if(++done===total) go(); }
      else { imgs[i].onload = imgs[i].onerror = function(){ if(++done===total) go(); }; }
    }
  };
</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { alert(T("فضلاً اسمح بالنوافذ المنبثقة للطباعة.", "Please allow pop-ups to print.")); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}