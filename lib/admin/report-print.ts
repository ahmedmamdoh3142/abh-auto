/**
 * lib/admin/report-print.ts — تقرير أمر العمل النهائي (PDF عبر نافذة طباعة).
 *
 * نفس هوية فاتورة ABH: هيدر أسود + لوجو + فاصل ذهبي + كروت بعناوين ذهبية.
 * يوثّق: بيانات السيارة والعميل، الخدمات، تفاصيل التنفيذ (الفنيون/الأوقات/الخامات)،
 * صور الاستلام والتسليم (قبل/بعد)، الملاحظات، التوقيعان، وسجل العمليات.
 *
 * الاستخدام: printWorkOrderReport(report, { isAr, ccy });
 */

const COMPANY = {
  name: "ABH AUTO",
  unifiedNumber: "7034913488",
  vatNumber: "311829832800003",
  website: "https://abh-auto.com/",
};

const LOGO_LIGHT_SRC = "/images/logo3.webp";

export type ReportData = {
  reference: string;
  workOrderNo: number | null;
  invoiceNumber?: string | null;
  customer: string;
  phone: string;
  vehicle: string;
  plate: string;
  size?: string;
  total: number;
  receivedAt: string | null;
  receivedBy: string;
  deliveredAt: string | null;
  supervisorNotes: string;
  qcNotes: string;
  services: { name: string; price: number }[];
  tasks: {
    name: string;
    estimatedMinutes: number | null;
    actualMinutes: number | null;
    qcStatus: string | null;
    reworkCount: number;
    technicians: { name: string; startedAt: string | null; doneAt: string | null }[];
    materials: { name: string; unit: string; quantity: number }[];
  }[];
  intakePhotos: { url: string; comment: string | null }[];
  deliveryPhotos: { url: string; comment: string | null }[];
  intakeSignature: { url: string; name: string | null; at: string | null } | null;
  deliverySignature: { url: string; name: string | null; at: string | null } | null;
  events: { event: string; at: string; actor: string }[];
  totalActualMinutes: number;
};

const money = (n: number | undefined) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GOLD = "#c2a04e";

function logoLight(height = 46) {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 24px Georgia,serif;letter-spacing:1.5px;color:#fff;">ABH<span style="color:${GOLD};">.</span></div>
      <div style="font-size:8px;letter-spacing:7px;color:#cbcdcd;margin-top:4px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${LOGO_LIGHT_SRC}" alt="ABH AUTO" style="height:${height}px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}

function fmtDT(iso: string | null, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return "—";
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    + " · " + d.toLocaleTimeString(isAr ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(m: number | null) {
  if (m == null) return "—";
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

const EVENT_LABEL: Record<string, [string, string]> = {
  received: ["استلام السيارة", "Vehicle received"],
  work_started: ["بدء التشغيل", "Work started"],
  all_tasks_done: ["اكتمال المهام", "Tasks completed"],
  qc_passed: ["اجتياز فحص الجودة", "Quality check passed"],
  qc_rejected: ["رفض في فحص الجودة", "Rejected in QC"],
  delivered: ["تسليم السيارة", "Vehicle delivered"],
};

function reportHtml(r: ReportData, isAr: boolean, ccy: string) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const dir = isAr ? "rtl" : "ltr";
  const sA = isAr ? "right" : "left";
  const eA = isAr ? "left" : "right";

  const cardOpen = (title: string) => `
    <div style="border:1px solid #e7e3d8;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 0 #f2efe6;margin-bottom:16px;break-inside:avoid;">
      <div style="background:linear-gradient(90deg,#faf8f2,#fff);border-bottom:1px solid #efe9db;padding:9px 16px;display:flex;align-items:center;gap:8px;">
        <span style="height:8px;width:8px;border-radius:99px;background:${GOLD};display:inline-block;"></span>
        <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">${esc(title)}</span>
      </div>
      <div style="padding:14px 16px;">`;
  const cardClose = `</div></div>`;

  const info = (l: string, v: string, ltr = false) =>
    `<div style="margin-bottom:9px;"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:2px;">${esc(l)}</div><div ${ltr ? 'dir="ltr"' : ""} style="font-size:13px;color:#15161a;text-align:${sA};font-weight:600;">${esc(v || "—")}</div></div>`;

  /* الخدمات */
  const svcRows = r.services.length === 0
    ? `<tr><td colspan="2" style="padding:16px;text-align:center;color:#6c7077;font-size:13px;">${T("لا خدمات", "No services")}</td></tr>`
    : r.services.map((s, i) => `
        <tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
          <td style="padding:11px 16px;font-size:13px;color:#15161a;text-align:${sA};border-bottom:1px solid #ece9e1;font-weight:600;">${esc(s.name)}</td>
          <td style="padding:11px 16px;font-size:13px;color:#15161a;text-align:${eA};white-space:nowrap;border-bottom:1px solid #ece9e1;">${money(s.price)} <span style="color:#9a9ea4;font-size:11px;">${esc(ccy)}</span></td>
        </tr>`).join("");

  /* المهام */
  const taskCards = r.tasks.map((t) => {
    const techs = t.technicians.map((x) =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;background:#f4f2ec;color:#4a4d52;border:1px solid #e7e3d8;font-weight:600;margin:0 3px 3px 0;">${esc(x.name)}</span>`
    ).join("");
    const mats = t.materials.map((m) =>
      `<span style="display:inline-block;padding:3px 9px;border-radius:7px;font-size:10.5px;background:#fff;color:#6c7077;border:1px solid #ece9e1;margin:0 3px 3px 0;">${esc(m.name)} <b dir="ltr" style="color:#15161a;">×${m.quantity}</b> <span style="color:#9a9ea4;">${esc(m.unit)}</span></span>`
    ).join("");
    const over = t.estimatedMinutes != null && t.actualMinutes != null && t.actualMinutes > t.estimatedMinutes;
    const approved = t.qcStatus === "approved";

    return `
      <div style="border:1px solid #ece9e1;border-radius:11px;padding:12px 14px;margin-bottom:10px;background:#fdfdfc;break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px;">
          <span style="font-size:13.5px;font-weight:700;color:#15161a;">${esc(t.name)}</span>
          <span style="display:inline-flex;align-items:center;gap:10px;font-size:11.5px;">
            <span dir="ltr" style="font-weight:700;color:${over ? "#c0393e" : "#15161a"};">${fmtDur(t.actualMinutes)}${t.estimatedMinutes != null ? `<span style="color:#9a9ea4;font-weight:400;"> / ${fmtDur(t.estimatedMinutes)}</span>` : ""}</span>
            ${approved ? `<span style="color:#1f9d6b;font-weight:700;">✓ ${T("معتمدة", "Approved")}</span>` : ""}
          </span>
        </div>
        ${techs ? `<div style="margin-bottom:${mats ? "7px" : "0"};"><span style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9ea4;margin-inline-end:6px;">${T("الفنيون", "Technicians")}</span>${techs}</div>` : ""}
        ${mats ? `<div><span style="font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9ea4;margin-inline-end:6px;">${T("الخامات", "Materials")}</span>${mats}</div>` : ""}
        ${t.reworkCount > 0 ? `<div style="margin-top:7px;font-size:10.5px;color:#b9810f;font-weight:600;">${T(`أُعيد العمل ${t.reworkCount} مرة`, `Reworked ${t.reworkCount}×`)}</div>` : ""}
      </div>`;
  }).join("");

  /* الصور */
  const photoGrid = (list: { url: string; comment: string | null }[]) =>
    `<div style="display:flex;flex-wrap:wrap;gap:8px;">` + list.map((p) => `
      <figure style="margin:0;width:104px;">
        <img src="${esc(p.url)}" alt="" style="width:104px;height:78px;object-fit:cover;border-radius:8px;border:1px solid #e7e3d8;display:block;"/>
        ${p.comment ? `<figcaption style="font-size:8.5px;color:#9a9ea4;margin-top:3px;line-height:1.3;">${esc(p.comment)}</figcaption>` : ""}
      </figure>`).join("") + `</div>`;

  const photosCard = (r.intakePhotos.length || r.deliveryPhotos.length) ? `
    ${cardOpen(T("توثيق الحالة — قبل وبعد", "Condition — before & after"))}
      ${r.intakePhotos.length ? `<div style="margin-bottom:${r.deliveryPhotos.length ? "14px" : "0"};">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:8px;font-weight:700;">${T("قبل — عند الاستلام", "Before — at intake")}</div>
        ${photoGrid(r.intakePhotos)}
      </div>` : ""}
      ${r.deliveryPhotos.length ? `<div>
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#1f9d6b;margin-bottom:8px;font-weight:700;">${T("بعد — عند التسليم", "After — at delivery")}</div>
        ${photoGrid(r.deliveryPhotos)}
      </div>` : ""}
    ${cardClose}` : "";

  /* التوقيعات */
  const sigBox = (title: string, sig: any, green = false) => sig ? `
    <div style="flex:1;">
      <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:${green ? "#1f9d6b" : "#9a9ea4"};margin-bottom:6px;font-weight:700;">${esc(title)}</div>
      <img src="${esc(sig.url)}" alt="" style="width:100%;height:72px;object-fit:contain;background:#fff;border:1px solid ${green ? "#bfe3cf" : "#e7e3d8"};border-radius:8px;display:block;"/>
      <div style="font-size:10.5px;color:#4a4d52;margin-top:5px;font-weight:600;">${esc(sig.name || r.customer)}</div>
      <div style="font-size:9px;color:#9a9ea4;">${esc(fmtDT(sig.at, isAr))}</div>
    </div>` : "";

  /* الأحداث */
  const evRows = r.events.map((e, i) => {
    const lb = EVENT_LABEL[e.event] || [e.event, e.event];
    return `<tr style="background:${i % 2 ? "#faf9f6" : "#fff"};">
      <td style="padding:8px 14px;font-size:12px;color:#15161a;text-align:${sA};border-bottom:1px solid #f0ede4;font-weight:600;">${esc(isAr ? lb[0] : lb[1])}</td>
      <td style="padding:8px 14px;font-size:11.5px;color:#6c7077;text-align:${sA};border-bottom:1px solid #f0ede4;">${esc(e.actor)}</td>
      <td style="padding:8px 14px;font-size:10.5px;color:#9a9ea4;text-align:${eA};white-space:nowrap;border-bottom:1px solid #f0ede4;">${esc(fmtDT(e.at, isAr))}</td>
    </tr>`;
  }).join("");

  return `
  <div style="width:190mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <!-- الهيدر -->
    <div style="background:#0c0d0e;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoLight()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 19px Georgia,serif;letter-spacing:4px;color:#fff;">${T("تقرير أمر العمل", "WORK ORDER REPORT")}</div>
        ${r.workOrderNo ? `<div dir="ltr" style="font-size:12px;color:#e4c979;margin-top:7px;font-weight:700;">WO-${esc(r.workOrderNo)}</div>` : ""}
        <div dir="ltr" style="font-size:11px;color:#aeb2b7;margin-top:3px;">${esc(r.reference)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,${GOLD},#f3ead0,${GOLD});"></div>

    <!-- شريط الشركة -->
    <div style="background:#faf8f2;border-bottom:1px solid #efe9db;padding:10px 32px;display:flex;flex-wrap:wrap;gap:6px 26px;font-size:11px;color:#3a3d42;">
      <span style="font-weight:800;color:#0c0d0e;">${esc(COMPANY.name)}</span>
      <span>${T("الرقم الموحّد", "Unified No.")}: <b dir="ltr">${esc(COMPANY.unifiedNumber)}</b></span>
      <span>${T("الرقم الضريبي", "VAT No.")}: <b dir="ltr">${esc(COMPANY.vatNumber)}</b></span>
    </div>

    <div style="padding:20px 32px;">
      <!-- بيانات العميل والسيارة -->
      <div style="display:flex;gap:16px;">
        <div style="flex:1;">
          ${cardOpen(T("بيانات العميل", "Customer"))}
            ${info(T("الاسم", "Name"), r.customer)}
            ${info(T("التليفون", "Phone"), r.phone, true)}
          ${cardClose}
        </div>
        <div style="flex:1;">
          ${cardOpen(T("السيارة", "Vehicle"))}
            ${info(T("الموديل", "Model"), r.vehicle)}
            ${info(T("اللوحة", "Plate"), r.plate, true)}
          ${cardClose}
        </div>
      </div>

      <!-- توقيتات أمر العمل -->
      ${cardOpen(T("توقيتات أمر العمل", "Work order timeline"))}
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:150px;">${info(T("الاستلام", "Received"), fmtDT(r.receivedAt, isAr))}</div>
          <div style="flex:1;min-width:150px;">${info(T("المستلِم", "Received by"), r.receivedBy)}</div>
          <div style="flex:1;min-width:150px;">${info(T("التسليم", "Delivered"), fmtDT(r.deliveredAt, isAr))}</div>
          <div style="flex:1;min-width:150px;">${info(T("وقت العمل الفعلي", "Actual work time"), fmtDur(r.totalActualMinutes) + " " + T("س:د", "h:m"), true)}</div>
        </div>
      ${cardClose}

      <!-- الخدمات -->
      ${cardOpen(T("الخدمات المنفّذة", "Services performed"))}
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#0c0d0e;">
            <th style="padding:8px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${sA};">${T("الخدمة", "Service")}</th>
            <th style="padding:8px 16px;font-size:10px;letter-spacing:2px;color:#fff;text-align:${eA};">${T("السعر", "Price")}</th>
          </tr></thead>
          <tbody>${svcRows}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:baseline;background:#0c0d0e;border-radius:8px;padding:12px 16px;margin-top:12px;">
          <span style="font-size:10px;letter-spacing:1.5px;color:#cbcdcd;">${T("الإجمالي", "TOTAL")}</span>
          <span dir="ltr" style="font-size:19px;font-weight:800;color:#fff;">${money(r.total)} <span style="font-size:11px;color:#e4c979;">${esc(ccy)}</span></span>
        </div>
      ${cardClose}

      <!-- تفاصيل التنفيذ -->
      ${cardOpen(T("تفاصيل التنفيذ", "Execution details"))}
        ${taskCards || `<div style="text-align:center;color:#6c7077;font-size:12px;padding:10px;">${T("لا مهام", "No tasks")}</div>`}
      ${cardClose}

      <!-- الصور -->
      ${photosCard}

      <!-- الملاحظات -->
      ${(r.supervisorNotes || r.qcNotes) ? `
      ${cardOpen(T("الملاحظات", "Notes"))}
        ${r.supervisorNotes ? `<div style="margin-bottom:${r.qcNotes ? "12px" : "0"};">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:4px;">${T("ملاحظات الاستلام", "Intake notes")}</div>
          <div style="font-size:12.5px;color:#15161a;line-height:1.75;">${esc(r.supervisorNotes)}</div>
        </div>` : ""}
        ${r.qcNotes ? `<div>
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9a9ea4;margin-bottom:4px;">${T("ملاحظات التسليم", "Delivery notes")}</div>
          <div style="font-size:12.5px;color:#15161a;line-height:1.75;">${esc(r.qcNotes)}</div>
        </div>` : ""}
      ${cardClose}` : ""}

      <!-- التوقيعات -->
      ${(r.intakeSignature || r.deliverySignature) ? `
      ${cardOpen(T("التوقيعات", "Signatures"))}
        <div style="display:flex;gap:20px;">
          ${sigBox(T("توقيع الاستلام", "Intake signature"), r.intakeSignature)}
          ${sigBox(T("توقيع التسليم", "Delivery signature"), r.deliverySignature, true)}
        </div>
      ${cardClose}` : ""}

      <!-- سجل العمليات -->
      ${r.events.length ? `
      ${cardOpen(T("سجل العمليات", "Activity log"))}
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${evRows}</tbody>
        </table>
      ${cardClose}` : ""}
    </div>

    <!-- الفوتر -->
    <div style="border-top:1px solid #ece9e1;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div style="font-size:11px;color:#3a3d42;font-weight:600;">${T("شكرًا لاختيارك ABH AUTO", "Thank you for choosing ABH AUTO")}</div>
      <a href="${esc(COMPANY.website)}" dir="ltr" style="font-size:11px;color:${GOLD};letter-spacing:1px;text-decoration:none;font-weight:700;">${esc(COMPANY.website)}</a>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة بتقرير أمر العمل (A4). */
export function printWorkOrderReport(r: ReportData, opts: { isAr: boolean; ccy: string }): void {
  const { isAr, ccy } = opts;
  const body = reportHtml(r, isAr, ccy);
  const title = r.workOrderNo ? `WO-${r.workOrderNo}` : r.reference;

  const doc = `<!doctype html><html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <title>ABH ${esc(title)}</title>
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
        var imgs = Array.prototype.slice.call(document.images || []);
        var pending = imgs.filter(function(im){ return !im.complete; });
        if (pending.length === 0){ setTimeout(go, 120); return; }
        var left = pending.length;
        function done(){ if(--left <= 0) setTimeout(go, 150); }
        pending.forEach(function(im){ im.addEventListener('load', done); im.addEventListener('error', done); });
        setTimeout(go, 4000); // احتياطي لو الصور اتأخّرت
      })();
    </script>
    </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert(isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open();
  w.document.write(doc);
  w.document.close();
}