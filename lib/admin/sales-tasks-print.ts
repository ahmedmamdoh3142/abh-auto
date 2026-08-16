/**
 * lib/admin/sales-tasks-print.ts — طباعة/تصدير PDF لتقرير العملاء المحتملين
 * (الاسم + التليفون + الإيميل + مستوى الاهتمام) — لإعادة الاستهداف في الحملات الإعلانية.
 * نفس هوية ABH AUTO المستخدمة في pricelist-print.ts.
 */

const logo_SRC = "/images/logo3.webp";

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface SalesTaskReportRow {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerCity: string | null;
  quality: "hot" | "warm" | "cold" | null;
  stage: string;
  services: string[];
  createdAt: string;
}
export interface SalesTasksReportInput {
  rows: SalesTaskReportRow[];
  isAr: boolean;
  title: string;
  subtitle?: string;
}

const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  contacted: { ar: "تم التواصل", en: "Contacted" },
  follow_up: { ar: "قيد المتابعة", en: "Follow-up" },
  negotiating: { ar: "تفاوض", en: "Negotiating" },
  won: { ar: "تم الحجز", en: "Won" },
  lost: { ar: "مرفوض", en: "Lost" },
};
const QUALITY_LABEL: Record<string, { ar: string; en: string }> = {
  hot: { ar: "مستعد للشراء", en: "Hot" },
  warm: { ar: "مهتم", en: "Warm" },
  cold: { ar: "استفسار فقط", en: "Cold" },
};

function logoBlock() {
  const fallback = `<div style="line-height:1;">
      <div style="font:700 34px Georgia,serif;letter-spacing:2px;color:#fff;">ABH<span style="color:#c2a04e;">.</span></div>
      <div style="font-size:10px;letter-spacing:8px;color:#cbcdcd;margin-top:5px;">A&nbsp;U&nbsp;T&nbsp;O</div>
    </div>`;
  const fb = JSON.stringify(fallback).replace(/"/g, "&quot;");
  return `<img src="${logo_SRC}" alt="ABH AUTO" style="height:64px;width:auto;display:block;" onerror="this.outerHTML=${fb}"/>`;
}

function buildHtml(d: SalesTasksReportInput) {
  const T = (a: string, e: string) => (d.isAr ? a : e);
  const dir = d.isAr ? "rtl" : "ltr";
  const sA = d.isAr ? "right" : "left";
  const eA = d.isAr ? "left" : "right";
  const issued = new Date().toLocaleDateString(d.isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const hot = d.rows.filter((r) => r.quality === "hot").length;
  const warm = d.rows.filter((r) => r.quality === "warm").length;
  const withEmail = d.rows.filter((r) => r.customerEmail).length;

  const rowsHtml = d.rows.map((r, i) => {
    const bg = i % 2 ? "#ffffff" : "#fbfaf7";
    const q = r.quality ? QUALITY_LABEL[r.quality] : null;
    const qColor = r.quality === "hot" ? "#c0392b" : r.quality === "warm" ? "#9a7a1f" : "#5a6b7a";
    const stageMeta = STAGE_LABEL[r.stage] || { ar: r.stage, en: r.stage };
    return `<tr style="background:${bg};">
      <td style="padding:9px 12px;font-size:11.5px;color:#15161a;font-weight:600;border-bottom:1px solid #ece9e1;text-align:${sA};">${esc(r.customerName)}</td>
      <td dir="ltr" style="padding:9px 12px;font-size:11px;color:#15161a;border-bottom:1px solid #ece9e1;text-align:center;">${esc(r.customerPhone)}</td>
      <td dir="ltr" style="padding:9px 12px;font-size:10.5px;color:${r.customerEmail ? "#15161a" : "#bcbfc3"};border-bottom:1px solid #ece9e1;text-align:${eA === "right" ? "left" : "right"};">${esc(r.customerEmail || "—")}</td>
      <td style="padding:9px 12px;font-size:10.5px;color:#5a6b7a;border-bottom:1px solid #ece9e1;text-align:center;">${esc(r.customerCity || "—")}</td>
      <td style="padding:9px 12px;font-size:10px;text-align:center;border-bottom:1px solid #ece9e1;">
        ${q ? `<span style="border-radius:999px;padding:3px 9px;font-size:9.5px;font-weight:700;color:${qColor};background:${qColor}15;border:1px solid ${qColor}40;">${esc(d.isAr ? q.ar : q.en)}</span>` : "—"}
      </td>
      <td style="padding:9px 12px;font-size:10px;color:#5a6b7a;border-bottom:1px solid #ece9e1;text-align:center;">${esc(d.isAr ? stageMeta.ar : stageMeta.en)}</td>
      <td style="padding:9px 12px;font-size:10px;color:#5a6b7a;border-bottom:1px solid #ece9e1;text-align:${sA};">${esc(r.services.slice(0, 3).join("، ") || "—")}</td>
    </tr>`;
  }).join("");

  return `
  <div style="width:277mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <div style="background:#0c0d0e;padding:22px 30px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoBlock()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 18px Georgia,serif;letter-spacing:3px;color:#fff;">${esc(d.title)}</div>
        ${d.subtitle ? `<div style="font-size:10.5px;color:#aeb2b7;margin-top:5px;">${esc(d.subtitle)}</div>` : ""}
        <div style="font-size:9.5px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "Issued")} ${esc(issued)}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>

    <div style="padding:16px 30px 6px;display:flex;gap:10px;">
      <div style="flex:1;border-radius:10px;border:1px solid #ece9e1;background:#fbfaf7;padding:10px 14px;text-align:center;">
        <div style="font-size:19px;font-weight:700;color:#0c0d0e;">${d.rows.length}</div>
        <div style="font-size:9px;color:#6c7077;letter-spacing:.5px;margin-top:2px;">${T("إجمالي العملاء", "Total leads")}</div>
      </div>
      <div style="flex:1;border-radius:10px;border:1px solid #ece9e1;background:#fbfaf7;padding:10px 14px;text-align:center;">
        <div style="font-size:19px;font-weight:700;color:#c0392b;">${hot}</div>
        <div style="font-size:9px;color:#6c7077;letter-spacing:.5px;margin-top:2px;">${T("مستعدين للشراء", "Hot leads")}</div>
      </div>
      <div style="flex:1;border-radius:10px;border:1px solid #ece9e1;background:#fbfaf7;padding:10px 14px;text-align:center;">
        <div style="font-size:19px;font-weight:700;color:#9a7a1f;">${warm}</div>
        <div style="font-size:9px;color:#6c7077;letter-spacing:.5px;margin-top:2px;">${T("مهتمين", "Warm leads")}</div>
      </div>
      <div style="flex:1;border-radius:10px;border:1px solid #ece9e1;background:#fbfaf7;padding:10px 14px;text-align:center;">
        <div style="font-size:19px;font-weight:700;color:#3e7c53;">${withEmail}</div>
        <div style="font-size:9px;color:#6c7077;letter-spacing:.5px;margin-top:2px;">${T("لديهم إيميل", "With email")}</div>
      </div>
    </div>

    <div style="padding:10px 30px 22px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #ece9e1;">
        <thead>
          <tr style="background:#0c0d0e;">
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:${sA};">${T("اسم العميل", "Customer name")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:center;">${T("رقم التليفون", "Phone")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:center;">${T("الإيميل / اسم الحساب", "Email / account")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:center;">${T("المدينة", "City")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:center;">${T("مستوى الاهتمام", "Interest")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:center;">${T("المرحلة", "Stage")}</th>
            <th style="padding:9px 12px;font-size:9.5px;letter-spacing:1px;color:#fff;text-align:${sA};">${T("الخدمات المهتم بها", "Interested in")}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || `<tr><td colspan="7" style="padding:24px;text-align:center;color:#6c7077;font-size:13px;">${T("لا توجد بيانات", "No data")}</td></tr>`}</tbody>
      </table>
      <p style="margin:12px 2px 0;font-size:9.5px;color:#6c7077;line-height:1.7;">
        ${T("هذا التقرير سرّي — للاستخدام الداخلي فقط في حملات إعادة الاستهداف الإعلاني.", "This report is confidential — for internal use in retargeting ad campaigns only.")}
      </p>
    </div>

    <div style="border-top:1px solid #ece9e1;padding:12px 30px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:#6c7077;">${T("ABH AUTO — تقرير عملاء محتملين.", "ABH AUTO — prospective customers report.")}</div>
      <div dir="ltr" style="font-size:10px;color:#9a9ea4;letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة A4 أفقي بتقرير العملاء المحتملين. */
export function printSalesTasksReport(input: SalesTasksReportInput): void {
  const body = buildHtml(input);
  const doc = `<!doctype html><html lang="${input.isAr ? "ar" : "en"}" dir="${input.isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(input.title)}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
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
  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) { alert(input.isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}

/* ═════════════════ تقرير تفصيلي كامل — كل تاسك بكل بياناته وكل الكومنتات ═════════════════ */

export interface SalesTaskFullNote {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}
export interface SalesTaskFullRow {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerCity: string | null;
  services: { name: string }[];
  quality: "hot" | "warm" | "cold" | null;
  priceObjection: boolean;
  initialNote: string | null;
  leadSource: "facebook" | "tiktok" | "instagram" | "whatsapp" | null;
  vehicleBrandName: string | null;
  vehicleModel: string | null;
  vehicleSize: "small" | "medium" | "large" | null;
  stage: string;
  assignedName: string | null;
  createdName: string | null;
  createdAt: string;
  updatedAt: string;
  closeResult: "won" | "lost" | null;
  closeReason: string | null;
  closeNote: string | null;
  closedAt: string | null;
  followUpDate: string | null;
  followUpNote: string | null;
  followUpCancelledAt: string | null;
  followUpCancelReason: string | null;
  notes: SalesTaskFullNote[];
}
export interface SalesTasksFullReportInput {
  tasks: SalesTaskFullRow[];
  isAr: boolean;
  title: string;
  subtitle?: string;
}

const LEAD_SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  facebook: { ar: "فيسبوك", en: "Facebook" },
  instagram: { ar: "انستجرام", en: "Instagram" },
  tiktok: { ar: "تيك توك", en: "TikTok" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
};
const SIZE_LABEL: Record<string, { ar: string; en: string }> = {
  small: { ar: "صغيرة", en: "Small" }, medium: { ar: "متوسطة", en: "Medium" }, large: { ar: "كبيرة", en: "Large" },
};
const LOST_REASON_LABEL: Record<string, { ar: string; en: string }> = {
  price: { ar: "اعتراض على السعر", en: "Price objection" },
  timing: { ar: "التوقيت غير مناسب", en: "Bad timing" },
  no_response: { ar: "لم يردّ / اختفى", en: "No response" },
  chose_competitor: { ar: "اختار منافس", en: "Chose competitor" },
  not_interested: { ar: "غير مهتم أصلًا", en: "Not interested" },
  other: { ar: "سبب آخر", en: "Other" },
};

function fmtFullDT(iso: string | null, isAr: boolean) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return String(iso);
  return d.toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function taskCardHtml(t: SalesTaskFullRow, isAr: boolean) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const sA = isAr ? "right" : "left";
  const stage = STAGE_LABEL[t.stage] || { ar: t.stage, en: t.stage };
  const q = t.quality ? QUALITY_LABEL[t.quality] : null;
  const qColor = t.quality === "hot" ? "#c0392b" : t.quality === "warm" ? "#9a7a1f" : "#5a6b7a";
  const src = t.leadSource ? LEAD_SOURCE_LABEL[t.leadSource] : null;
  const vehicle = t.vehicleBrandName
    ? `${esc(t.vehicleBrandName)} ${esc(t.vehicleModel || "")}${t.vehicleSize ? ` · ${esc(isAr ? SIZE_LABEL[t.vehicleSize].ar : SIZE_LABEL[t.vehicleSize].en)}` : ""}`
    : T("غير محدد", "Not specified");
  const services = (t.services || []).map((s) => esc(s.name)).join("، ") || T("لا توجد", "None");

  const infoRow = (label: string, value: string) => `
    <div style="flex:1;min-width:150px;">
      <div style="font-size:8.5px;letter-spacing:.5px;color:#8b8f95;text-transform:uppercase;">${esc(label)}</div>
      <div style="font-size:11.5px;color:#15161a;font-weight:600;margin-top:2px;">${value}</div>
    </div>`;

  const closedBlock = t.closeResult ? `
    <div style="margin-top:10px;border-radius:8px;border:1px solid ${t.closeResult === "won" ? "#3e7c5355" : "#c0392b55"};background:${t.closeResult === "won" ? "#3e7c5312" : "#c0392b12"};padding:9px 12px;">
      <div style="font-size:11.5px;font-weight:700;color:${t.closeResult === "won" ? "#3e7c53" : "#c0392b"};">
        ${t.closeResult === "won" ? T("✅ تم الحجز", "✅ Won") : T(`❌ مرفوض — ${t.closeReason ? (LOST_REASON_LABEL[t.closeReason]?.ar ?? t.closeReason) : ""}`, `❌ Lost — ${t.closeReason ? (LOST_REASON_LABEL[t.closeReason]?.en ?? t.closeReason) : ""}`)}
      </div>
      ${t.closeNote ? `<div style="font-size:10.5px;color:#4a4d52;margin-top:3px;">${esc(t.closeNote)}</div>` : ""}
      <div style="font-size:9px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "On")} ${fmtFullDT(t.closedAt, isAr)}</div>
    </div>` : "";

  const followUpActive = t.followUpDate && !t.followUpCancelledAt;
  const followUpBlock = followUpActive ? `
    <div style="margin-top:10px;border-radius:8px;border:1px solid #6ba8f555;background:#6ba8f512;padding:9px 12px;">
      <div style="font-size:11px;font-weight:700;color:#3a6fa8;">${T("📅 متابعة مجدولة", "📅 Scheduled follow-up")}: <span dir="ltr">${esc(t.followUpDate!)}</span></div>
      ${t.followUpNote ? `<div style="font-size:10.5px;color:#4a4d52;margin-top:3px;">${esc(t.followUpNote)}</div>` : ""}
    </div>` : (t.followUpCancelledAt ? `
    <div style="margin-top:10px;border-radius:8px;border:1px solid #ccc;background:#f7f7f5;padding:9px 12px;">
      <div style="font-size:10.5px;color:#5a6b7a;">${T("🚫 متابعة مُلغاة", "🚫 Follow-up cancelled")}${t.followUpCancelReason ? ` — ${esc(t.followUpCancelReason)}` : ""}</div>
    </div>` : "");

  const notesHtml = (t.notes || []).length === 0
    ? `<div style="padding:12px;text-align:center;font-size:10.5px;color:#8b8f95;">${T("لا يوجد نشاط بعد", "No activity yet")}</div>`
    : t.notes.map((n) => `
      <div style="display:flex;gap:8px;padding:7px 0;border-top:1px solid #ece9e1;">
        <div style="width:3px;border-radius:3px;background:#c2a04e;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <span style="font-size:10.5px;font-weight:700;color:#15161a;">${esc(n.authorName)}</span>
            <span style="font-size:9px;color:#8b8f95;flex-shrink:0;">${fmtFullDT(n.createdAt, isAr)}</span>
          </div>
          <div style="font-size:10.5px;color:#333;white-space:pre-line;line-height:1.6;margin-top:2px;">${esc(n.body)}</div>
        </div>
      </div>`).join("");

  return `
  <div style="page-break-inside:avoid;border:1px solid #ece9e1;border-radius:12px;margin-bottom:14px;overflow:hidden;">
    <div style="background:#0c0d0e;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:15px;color:#fff;font-weight:700;">${esc(t.customerName)}</div>
        <div dir="ltr" style="font-size:10.5px;color:#aeb2b7;margin-top:2px;">${esc(t.customerPhone)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span style="border-radius:999px;padding:4px 10px;font-size:9.5px;font-weight:700;color:#0c0d0e;background:#cbcdcd;">${esc(isAr ? stage.ar : stage.en)}</span>
        ${q ? `<span style="border-radius:999px;padding:4px 10px;font-size:9.5px;font-weight:700;color:#fff;background:${qColor};">${esc(isAr ? q.ar : q.en)}</span>` : ""}
      </div>
    </div>
    <div style="padding:12px 16px;">
      <div style="display:flex;flex-wrap:wrap;gap:10px;padding-bottom:10px;border-bottom:1px solid #ece9e1;">
        ${infoRow(T("الإيميل", "Email"), esc(t.customerEmail || "—"))}
        ${infoRow(T("المدينة", "City"), esc(t.customerCity || "—"))}
        ${infoRow(T("مصدر الليد", "Lead source"), esc(src ? (isAr ? src.ar : src.en) : "—"))}
        ${infoRow(T("السيارة", "Vehicle"), vehicle)}
        ${infoRow(T("اعتراض على السعر", "Price objection"), t.priceObjection ? T("نعم", "Yes") : T("لا", "No"))}
        ${infoRow(T("موجّه لـ", "Assigned to"), esc(t.assignedName || T("غير موجّه", "Unassigned")))}
        ${infoRow(T("أنشأه", "Created by"), esc(t.createdName || "—"))}
        ${infoRow(T("تاريخ الإنشاء", "Created at"), fmtFullDT(t.createdAt, isAr))}
      </div>
      <div style="margin-top:8px;">
        <div style="font-size:8.5px;letter-spacing:.5px;color:#8b8f95;text-transform:uppercase;">${T("الخدمات المهتم بها", "Interested services")}</div>
        <div style="font-size:11px;color:#15161a;margin-top:2px;">${services}</div>
      </div>
      ${t.initialNote ? `
      <div style="margin-top:10px;border-radius:8px;border:1px solid #e8cf9a55;background:#e8cf9a15;padding:9px 12px;">
        <div style="font-size:9px;color:#9a7a1f;font-weight:700;">${T("ملاحظة الإنشاء", "Note at creation")}</div>
        <div style="font-size:10.5px;color:#4a4d52;margin-top:3px;">${esc(t.initialNote)}</div>
      </div>` : ""}
      ${closedBlock}
      ${followUpBlock}
      <div style="margin-top:12px;">
        <div style="font-size:9px;letter-spacing:1px;color:#8b8f95;text-transform:uppercase;margin-bottom:4px;">${T("سجلّ النشاط الكامل", "Full activity log")} (${(t.notes || []).length})</div>
        ${notesHtml}
      </div>
    </div>
  </div>`;
}

function buildFullHtml(d: SalesTasksFullReportInput) {
  const T = (a: string, e: string) => (d.isAr ? a : e);
  const dir = d.isAr ? "rtl" : "ltr";
  const sA = d.isAr ? "right" : "left";
  const eA = d.isAr ? "left" : "right";
  const issued = new Date().toLocaleDateString(d.isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const cardsHtml = d.tasks.map((t) => taskCardHtml(t, d.isAr)).join("");

  return `
  <div style="width:210mm;margin:0 auto;background:#fff;color:#15161a;font-family:'Helvetica Neue',Arial,'Segoe UI','Tahoma',sans-serif;direction:${dir};">
    <div style="background:#0c0d0e;padding:22px 30px;display:flex;align-items:center;justify-content:space-between;">
      <div style="text-align:${sA};">${logoBlock()}</div>
      <div style="text-align:${eA};">
        <div style="font:300 18px Georgia,serif;letter-spacing:3px;color:#fff;">${esc(d.title)}</div>
        ${d.subtitle ? `<div style="font-size:10.5px;color:#aeb2b7;margin-top:5px;">${esc(d.subtitle)}</div>` : ""}
        <div style="font-size:9.5px;color:#8b8f95;margin-top:3px;">${T("بتاريخ", "Issued")} ${esc(issued)} · ${T("عدد التاسكات", "Tasks")}: ${d.tasks.length}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#c2a04e,#f3ead0,#c2a04e);"></div>
    <div style="padding:18px 20px;">
      ${cardsHtml || `<div style="padding:40px;text-align:center;color:#8b8f95;">${T("لا توجد بيانات", "No data")}</div>`}
    </div>
    <div style="border-top:1px solid #ece9e1;padding:12px 30px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:#6c7077;">${T("ABH AUTO — تقرير تفصيلي لتاسكات المبيعات.", "ABH AUTO — detailed sales tasks report.")}</div>
      <div dir="ltr" style="font-size:10px;color:#9a9ea4;letter-spacing:1px;">abh-auto.com</div>
    </div>
    <div style="height:5px;background:#0c0d0e;"></div>
  </div>`;
}

/** يفتح نافذة طباعة A4 عمودي بتقرير تفصيلي كامل (بيانات + كل الكومنتات) لكل تاسك. */
export function printSalesTaskDetailedReport(input: SalesTasksFullReportInput): void {
  const body = buildFullHtml(input);
  const doc = `<!doctype html><html lang="${input.isAr ? "ar" : "en"}" dir="${input.isAr ? "rtl" : "ltr"}"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>ABH ${esc(input.title)}</title>
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
  if (!w) { alert(input.isAr ? "اسمح بالنوافذ المنبثقة للطباعة" : "Please allow pop-ups to print"); return; }
  w.document.open(); w.document.write(doc); w.document.close();
}