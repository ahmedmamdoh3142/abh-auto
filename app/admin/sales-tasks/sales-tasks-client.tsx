"use client";
/**
 * app/admin/sales-tasks/sales-tasks-client.tsx — متابعة المبيعات (Sales Follow-up).
 *
 * كل تاسك بيبقى موجّه لموظف مبيعات واحد بس (assigned_to). كل حد بيدخل الصفحة يشوف
 * تاسكاته هو بس افتراضيًا؛ الأدمن بس هو اللي يقدر يبدّل لـ"كل التاسكات" ويفلتر حسب الموظف.
 * كل تعديل (حالة/توجيه/بيانات/ملاحظة/إغلاق) بيتسجّل تلقائيًا في سجل النشاط بمين وإمتى بالظبط.
 * "راكد" (Stale): أي تاسك مفتوح ماتلمسش من 48 ساعة بيتعلّم بحد أصفر.
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { card, Pill, Ghost, Field, Input, Textarea, Selectbox, Chip, Modal, useToast, Ic, PageHeader, ImageCard, carImg } from "@/components/admin/ui";
import { PhoneInput, isValidPhone } from "@/components/admin/phone-input";
import { printSalesTasksReport } from "@/lib/admin/sales-tasks-print";

type Stage = "new" | "contacted" | "follow_up" | "negotiating" | "won" | "lost";
type Quality = "hot" | "warm" | "cold" | null;
type VehicleSize = "small" | "medium" | "large";
type LeadSource = "facebook" | "tiktok" | "instagram" | "whatsapp" | null;
type Service = { id: number; slug: string; name: string };
type Model = { name: string; size: VehicleSize };
type Brand = { id: string; name: string; models: Model[] };
type StaffMember = { id: string; name: string };
type Note = { id: number; authorId: string | null; authorName: string; body: string; createdAt: string };
type Task = {
  id: string;
  customerName: string; customerPhone: string; customerEmail: string | null; customerCity: string | null;
  services: { id: number; slug: string; name: string }[];
  quality: Quality; priceObjection: boolean; initialNote: string | null; leadSource: LeadSource;
  vehicleBrandId: string | null; vehicleBrandName: string | null; vehicleModel: string | null; vehicleSize: VehicleSize | null;
  stage: Stage;
  assignedTo: string | null; assignedName: string | null;
  createdBy: string; createdName: string | null; createdAt: string; updatedAt: string;
  closeResult: "won" | "lost" | null; closeReason: string | null; closeNote: string | null;
  closedAt: string | null; notesCount: number; lastActivityAt: string | null;
  followUpDate: string | null; followUpNote: string | null;
  followUpCancelledAt: string | null; followUpCancelReason: string | null;
};

const STAGE_META: Record<Stage, { ar: string; en: string; color: string }> = {
  new:         { ar: "جديد",         en: "New",         color: "#cbcdcd" },
  contacted:   { ar: "تم التواصل",   en: "Contacted",   color: "#9cc3e0" },
  follow_up:   { ar: "قيد المتابعة", en: "Follow-up",   color: "#e8cf9a" },
  negotiating: { ar: "تفاوض",        en: "Negotiating", color: "#d9b25f" },
  won:         { ar: "تم الحجز",     en: "Won",         color: "#9fd4b0" },
  lost:        { ar: "مرفوض",        en: "Lost",        color: "#e7b4b4" },
};
const OPEN_STAGES: Stage[] = ["new", "contacted", "follow_up", "negotiating"];
const STALE_MS = 48 * 60 * 60 * 1000; // 48 ساعة

const QUALITY_META: Record<string, { ar: string; en: string; color: string }> = {
  hot:  { ar: "مستعد للشراء", en: "Ready to buy", color: "#e7b4b4" },
  warm: { ar: "مهتم",         en: "Interested",   color: "#e8cf9a" },
  cold: { ar: "استفسار فقط",  en: "Just inquiring", color: "#9cc3e0" },
};

const LEAD_SOURCE_META: Record<string, { ar: string; en: string; color: string }> = {
  facebook:  { ar: "فيسبوك",   en: "Facebook",  color: "#6ea8e0" },
  instagram: { ar: "انستجرام", en: "Instagram", color: "#d97aa8" },
  tiktok:    { ar: "تيك توك",  en: "TikTok",    color: "#7fd6d0" },
  whatsapp:  { ar: "واتساب",   en: "WhatsApp",  color: "#8fd19e" },
};

const SIZE_META: Record<VehicleSize, { ar: string; en: string }> = {
  small: { ar: "صغيرة", en: "Small" }, medium: { ar: "متوسطة", en: "Medium" }, large: { ar: "كبيرة", en: "Large" },
};

const LOST_REASONS: { code: string; ar: string; en: string }[] = [
  { code: "price",            ar: "اعتراض على السعر",       en: "Price objection" },
  { code: "timing",           ar: "التوقيت غير مناسب",      en: "Bad timing" },
  { code: "no_response",      ar: "لم يردّ / اختفى",         en: "No response" },
  { code: "chose_competitor", ar: "اختار منافس",            en: "Chose competitor" },
  { code: "not_interested",   ar: "غير مهتم أصلًا",          en: "Not interested" },
  { code: "other",            ar: "سبب آخر",                 en: "Other" },
];

const AVATAR_PALETTE = ["#9cc3e0", "#e8cf9a", "#9fd4b0", "#e7b4b4", "#d9b25f", "#cbcdcd", "#b39ddb"];
function avatarColor(name: string) {
  let sum = 0;
  for (let k = 0; k < name.length; k++) sum += name.charCodeAt(k);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

/* أيقونات مخصصة */
const phoneIco = (s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
const flameIco = (s = 12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 1 1-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
const closeIco = (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>);
const checkIco = (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>);
const carIco = (s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 1 0 0 .01M19 17a2 2 0 1 0 0 .01M5 17V9l2-5h10l2 5v8"/></svg>);
const staleIco = (s = 12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>);
const userIco = (s = 11) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const reportIco = (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>);
const calIco = (s = 12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
const chatIco = (s = 12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>);

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function isFollowUpActive(t: Task): boolean { return !!t.followUpDate && !t.followUpCancelledAt; }
function isFollowUpDue(t: Task): boolean { return isFollowUpActive(t) && t.followUpDate! <= todayStr(); }
function fmtFollowUpLabel(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr + "T00:00:00"); const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return isAr ? "متابعة اليوم" : "Due today";
  if (diff < 0) return isAr ? `متأخر ${Math.abs(diff)} يوم` : `${Math.abs(diff)}d overdue`;
  if (diff === 1) return isAr ? "متابعة غدًا" : "Due tomorrow";
  return isAr ? `بعد ${diff} يوم` : `In ${diff}d`;
}
const FOLLOWUP_CANCEL_REASONS: { code: string; ar: string; en: string }[] = [
  { code: "done", ar: "تم التواصل مع العميل", en: "Already contacted customer" },
  { code: "no_answer", ar: "العميل ماردش خالص", en: "Customer unreachable" },
  { code: "rescheduled", ar: "هتحدد متابعة تانية بدلها", en: "Rescheduling instead" },
  { code: "other", ar: "سبب آخر", en: "Other reason" },
];

export default function SalesTasksClient({ locale, services, brands, staff, currentUserId, currentUserName, currentUserRole }: {
  locale?: string; services: Service[]; brands: Brand[]; staff: StaffMember[];
  currentUserId: string; currentUserName: string; currentUserRole: string;
}) {
  const isAr = locale !== "en";
  const T = useCallback((ar: string, en: string) => (isAr ? ar : en), [isAr]);
  const toast = useToast();
  const isFullAccess = currentUserRole === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "list">("board");

  const [fStage, setFStage] = useState<Stage | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<"mine" | "all">(isFullAccess ? "all" : "mine");
  const [assignedFilter, setAssignedFilter] = useState("");

  const [creating, setCreating] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const [stats, setStats] = useState<{ total: number; won: number; lost: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pillCounts, setPillCounts] = useState<Record<string, number>>({});

  // (جديد) المتابعات المجدولة
  const [followUpMode, setFollowUpMode] = useState(false);
  const [followUpTasks, setFollowUpTasks] = useState<Task[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [dueFollowUpCount, setDueFollowUpCount] = useState(0);
  const [notesPeekTask, setNotesPeekTask] = useState<Task | null>(null);
  const [followUpModalTask, setFollowUpModalTask] = useState<Task | null>(null);
  const [followUpCancelTask, setFollowUpCancelTask] = useState<Task | null>(null);

  // (جديد) نطاق تقرير إعادة الاستهداف — يصدّر بناءً على القائمة المعروضة حاليًا (بعد أي فلاتر)
  const [reportScope, setReportScope] = useState<"all" | "hot_warm" | "hot">("all");

  // withStage=true لتحميل الليست المعروضة (بتتفلتر بالمرحلة).
  // withStage=false لحساب الأرقام والإحصائيات — البحث/المصدر/التاريخ بيفضلوا شغالين، المرحلة نفسها لأ،
  // عشان أرقام التابات متتغيرش لما تفتح تاب "تم الحجز" مثلاً.
  const buildParams = (withStage: boolean) => {
    const params = new URLSearchParams();
    params.set("scope", scope);
    if (scope === "all" && assignedFilter) params.set("assignedTo", assignedFilter);
    if (withStage && fStage !== "all") params.set("stage", fStage);
    if (sourceFilter) params.set("leadSource", sourceFilter);
    if (q.trim()) params.set("q", q.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params;
  };

  const loadAbortRef = useRef<AbortController | null>(null);
  const statsAbortRef = useRef<AbortController | null>(null);
  const followUpAbortRef = useRef<AbortController | null>(null);

  const load = async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    try {
      const j = await fetch(`/api/admin/sales-tasks?${buildParams(true)}`, { signal: controller.signal }).then((r) => r.json());
      if (j?.ok) setTasks(j.tasks);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      if (loadAbortRef.current === controller) setLoading(false);
    }
  };
  const loadStats = async () => {
    statsAbortRef.current?.abort();
    const controller = new AbortController();
    statsAbortRef.current = controller;
    setStatsLoading(true);
    try {
      const j = await fetch(`/api/admin/sales-tasks?${buildParams(false)}`, { signal: controller.signal }).then((r) => r.json());
      if (j?.ok) {
        const all: Task[] = j.tasks;
        setStats({ total: all.length, won: all.filter((t) => t.stage === "won").length, lost: all.filter((t) => t.stage === "lost").length });
        const c: Record<string, number> = { all: all.length };
        for (const t of all) c[t.stage] = (c[t.stage] ?? 0) + 1;
        setPillCounts(c);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      if (statsAbortRef.current === controller) setStatsLoading(false);
    }
  };

  const loadFollowUps = async () => {
    followUpAbortRef.current?.abort();
    const controller = new AbortController();
    followUpAbortRef.current = controller;
    setFollowUpLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("scope", scope);
      if (scope === "all" && assignedFilter) params.set("assignedTo", assignedFilter);
      params.set("followUp", "all");
      const j = await fetch(`/api/admin/sales-tasks?${params}`, { signal: controller.signal }).then((r) => r.json());
      if (j?.ok) {
        setFollowUpTasks(j.tasks);
        setDueFollowUpCount(j.tasks.filter((t: Task) => isFollowUpDue(t)).length);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      if (followUpAbortRef.current === controller) setFollowUpLoading(false);
    }
  };
  const refreshAll = () => { load(); loadStats(); loadFollowUps(); };

  // (جديد) تصدير تقرير PDF بأسماء وأرقام وإيميلات العملاء المهتمين — لإعادة الاستهداف الإعلاني
  const exportReport = () => {
    const source = tasks.filter((t) => {
      if (reportScope === "hot") return t.quality === "hot";
      if (reportScope === "hot_warm") return t.quality === "hot" || t.quality === "warm";
      return true;
    });
    printSalesTasksReport({
      isAr,
      title: T("تقرير العملاء المحتملين", "Prospective Customers Report"),
      subtitle: T("لإعادة الاستهداف في الحملات الإعلانية", "For retargeting in ad campaigns"),
      rows: source.map((t) => ({
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        customerEmail: t.customerEmail,
        customerCity: t.customerCity,
        quality: t.quality,
        stage: t.stage,
        services: t.services.map((s) => s.name),
        createdAt: t.createdAt,
      })),
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fStage, sourceFilter, dateFrom, dateTo, scope, assignedFilter]);
  useEffect(() => { loadStats(); /* eslint-disable-next-line */ }, [sourceFilter, dateFrom, dateTo, scope, assignedFilter]);
  useEffect(() => { loadFollowUps(); /* eslint-disable-next-line */ }, [scope, assignedFilter]);
  useEffect(() => {
    const t = setTimeout(() => { load(); loadStats(); }, 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [q]);

  const boardStages = useMemo<Stage[]>(() => {
    if (fStage === "won" || fStage === "lost") return [fStage];
    return OPEN_STAGES;
  }, [fStage]);

  // شيل الـ counts القديمة خالص — استبدلت بـ pillCounts اللي جايه من loadStats

  const columns = useMemo(() => {
    const map = new Map<Stage, Task[]>();
    for (const s of boardStages) map.set(s, []);
    for (const t of tasks) if (map.has(t.stage)) map.get(t.stage)!.push(t);
    return map;
  }, [tasks, boardStages]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;
  const winRate = stats && (stats.won + stats.lost) > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : null;
  const showClosedGrid = fStage === "won" || fStage === "lost";

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("متابعة المبيعات", "Sales Follow-up")}
        subtitle={T("تاسكات العملاء المحتملين — كل تاسك موجّه لموظف مسؤول عنه.", "Prospective customer tasks — each task is routed to one responsible staff member.")}
        seed="sales-tasks-hero"
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={reportScope} onChange={(e) => setReportScope(e.target.value as any)}
              style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "9px 12px", fontSize: 11.5, color: "var(--abh-ivory)", outline: "none", cursor: "pointer" }}>
              <option value="all" style={{ background: "#0c0d0e" }}>{T("كل العملاء", "All leads")}</option>
              <option value="hot_warm" style={{ background: "#0c0d0e" }}>{T("مستعدين + مهتمين", "Hot + warm")}</option>
              <option value="hot" style={{ background: "#0c0d0e" }}>{T("مستعدين للشراء فقط", "Hot only")}</option>
            </select>
            <Ghost icon={() => reportIco(15)} onClick={exportReport}>{T("تقرير الاستهداف PDF", "Retargeting PDF")}</Ghost>
            <span style={{ position: "relative" }}>
              <button onClick={() => setFollowUpMode((v) => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "9px 16px", fontSize: 12, cursor: "pointer",
                  border: `1px solid ${followUpMode ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)"}`,
                  background: followUpMode ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.03)",
                  color: followUpMode ? "#000" : "var(--abh-ivory)", fontWeight: followUpMode ? 600 : 400 }}>
                {calIco(14)} {T("المتابعات المجدولة", "Scheduled follow-ups")}
              </button>
              {dueFollowUpCount > 0 && (
                <span style={{ position: "absolute", top: -6, insetInlineEnd: -6, background: "#e7b4b4", color: "#000", fontSize: 9.5, fontWeight: 700, borderRadius: 999, minWidth: 17, height: 17, display: "grid", placeItems: "center", padding: "0 4px", boxShadow: "0 0 0 2px #0c0d0e" }}>
                  {dueFollowUpCount}
                </span>
              )}
            </span>
            <Pill icon={Ic.plus} onClick={() => setCreating(true)}>{T("تاسك جديد", "New task")}</Pill>
          </div>
        } />

      {/* فلتر التاريخ + إحصائيات */}
      <div style={{ ...card, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: stats ? 16 : 0 }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("الفترة", "Period")}</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} dir="ltr" style={dateInputStyle} />
          <span style={{ color: "var(--abh-steel)", fontSize: 12 }}>{T("إلى", "to")}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} dir="ltr" style={dateInputStyle} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "var(--abh-steel)", padding: "7px 14px", fontSize: 11.5, cursor: "pointer" }}>{T("مسح", "Clear")}</button>
          )}
          <div style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}>
            <button onClick={() => setThisMonth(setDateFrom, setDateTo)} style={quickBtnStyle}>{T("هذا الشهر", "This month")}</button>
            <button onClick={() => setLast7Days(setDateFrom, setDateTo)} style={quickBtnStyle}>{T("آخر 7 أيام", "Last 7 days")}</button>
          </div>
        </div>
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
            <StatBox label={T("عملاء جدد في الفترة", "New leads in period")} value={stats.total} color="var(--abh-ivory)" loading={statsLoading} />
            <StatBox label={T("تم إقناعهم (Won)", "Convinced (Won)")} value={stats.won} color="#9fd4b0" loading={statsLoading} />
            <StatBox label={T("مرفوضين (Lost)", "Lost")} value={stats.lost} color="#e7b4b4" loading={statsLoading} />
            <StatBox label={T("نسبة التحويل", "Conversion rate")} value={winRate != null ? `${winRate}%` : "—"} color="#e8cf9a" loading={statsLoading}
              hint={T("محجوز ÷ (محجوز + مرفوض) — من التاسكات المُقفلة بس", "Won ÷ (Won + Lost) — closed tasks only")} />
          </div>
        )}
      </div>

      {followUpMode ? (
        <FollowUpBoard tasks={followUpTasks} loading={followUpLoading} isAr={isAr} T={T} currentUserId={currentUserId}
          onOpen={setOpenTaskId} onPeekNotes={setNotesPeekTask}
          onSetFollowUp={setFollowUpModalTask} onCancelFollowUp={setFollowUpCancelTask} />
      ) : (
      <>
      {/* تبديل النطاق: تاسكاتي / كل التاسكات — للأدمن بس */}
      {isFullAccess && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", padding: 3, background: "rgba(255,255,255,.02)" }}>
            {(["mine", "all"] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                style={{ borderRadius: 999, padding: "7px 16px", fontSize: 11.5, border: "none", cursor: "pointer", transition: "all .15s",
                  background: scope === s ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent",
                  color: scope === s ? "#000" : "var(--abh-platinum)", fontWeight: scope === s ? 600 : 400 }}>
                {s === "mine" ? T("تاسكاتي", "My tasks") : T("كل التاسكات", "All tasks")}
              </button>
            ))}
          </div>
          {scope === "all" && (
            <div style={{ minWidth: 210 }}>
              <Selectbox value={assignedFilter} onChange={setAssignedFilter}
                options={[{ value: "", label: T("كل الموظفين", "All staff") }, { value: "unassigned", label: T("غير موجّه", "Unassigned") }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
                placeholder={T("فلترة حسب التوجيه", "Filter by assignee")} />
            </div>
          )}
        </div>
      )}

      {/* فلاتر المرحلة/البحث */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([["all", T("الكل", "All")], ...Object.entries(STAGE_META).map(([k, v]) => [k, isAr ? v.ar : v.en])] as [string, string][]).map(([id, label]) => {
            const on = fStage === id;
            const n = id === "all" ? pillCounts.all ?? 0 : pillCounts[id] ?? 0;
            return (
              <button key={id} onClick={() => setFStage(id as Stage | "all")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999,
                  padding: "8px 10px 8px 16px", fontSize: 11.5,
                  border: `1px solid ${on ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.1)"}`,
                  color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.65)",
                  background: on ? "rgba(255,255,255,.07)" : "transparent",
                  boxShadow: on ? "0 2px 10px rgba(0,0,0,.25)" : "none",
                  cursor: "pointer", transition: "all .15s ease",
                }}>
                {label}
                <span className="abh-num" style={{ display: "inline-grid", placeItems: "center", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, color: on ? "#000" : "var(--abh-platinum)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.06)", transition: "all .15s ease" }}>{n}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 170 }}>
            <Selectbox value={sourceFilter} onChange={setSourceFilter}
              options={[{ value: "", label: T("كل المصادر", "All sources") }, ...Object.entries(LEAD_SOURCE_META).map(([k, v]) => ({ value: k, label: isAr ? v.ar : v.en }))]}
              placeholder={T("مصدر الليد", "Lead source")} />
          </div>
          <div style={{ position: "relative", minWidth: 220 }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالاسم أو التليفون…", "Search name or phone…")}
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "10px 14px", paddingInlineStart: 38, fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
          {!showClosedGrid && (
            <button onClick={() => setView(view === "board" ? "list" : "board")}
              style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", padding: "9px 16px", fontSize: 12, cursor: "pointer" }}>
              {view === "board" ? T("عرض قائمة", "List view") : T("عرض Kanban", "Board view")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : showClosedGrid ? (
        <ClosedGrid tasks={tasks} isAr={isAr} T={T} onOpen={setOpenTaskId} />
      ) : view === "board" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${boardStages.length}, minmax(270px,1fr))`, gap: 16, overflowX: "auto" }}>
          {boardStages.map((stage) => {
            const meta = STAGE_META[stage];
            const items = columns.get(stage) ?? [];
            return (
              <div key={stage} style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.008))", padding: 14, minWidth: 270, position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", insetInline: 0, top: 0, height: 2, background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 600, letterSpacing: ".04em", color: "var(--abh-ivory)", textTransform: "uppercase" }}>
                    <span style={{ height: 8, width: 8, borderRadius: 999, background: meta.color, boxShadow: `0 0 10px ${meta.color}90` }} />
                    {isAr ? meta.ar : meta.en}
                  </span>
                  <span className="abh-num" style={{ display: "inline-grid", placeItems: "center", minWidth: 22, height: 22, borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#000", background: `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)` }}>{items.length}</span>
                </div>
                <div className="abh-col" style={{ gap: 10 }}>
                  {items.map((t) => <TaskCard key={t.id} t={t} isAr={isAr} T={T} currentUserId={currentUserId} id={t.id} onOpen={setOpenTaskId}
                    onPeekNotes={setNotesPeekTask} onSetFollowUp={setFollowUpModalTask} onCancelFollowUp={setFollowUpCancelTask} />)}
                  {items.length === 0 && <div style={{ fontSize: 11.5, color: "var(--abh-steel)", textAlign: "center", padding: "24px 0" }}>{T("لا تاسكات", "No tasks")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          {tasks.map((t, i) => <ListRow key={t.id} t={t} i={i} isAr={isAr} T={T} currentUserId={currentUserId} id={t.id} onOpen={setOpenTaskId} onPeekNotes={setNotesPeekTask} />)}
          {tasks.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد تاسكات مطابقة.", "No matching tasks.")}</div>}
        </div>
      )}
      </>
      )}

      {creating && (
        <CreateTaskModal services={services} brands={brands} staff={staff} isAr={isAr} T={T} currentUserId={currentUserId} currentUserName={currentUserName}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refreshAll(); }} />
      )}

      {openTask && (
        <TaskDrawer task={openTask} services={services} brands={brands} staff={staff} isAr={isAr} T={T}
          currentUserId={currentUserId} currentUserName={currentUserName}
          onClose={() => setOpenTaskId(null)}
          onChanged={refreshAll}
          onScheduleFollowUp={() => setFollowUpModalTask(openTask)}
          onCancelFollowUp={() => setFollowUpCancelTask(openTask)} />
      )}

      {notesPeekTask && (
        <NotesPeekModal task={notesPeekTask} isAr={isAr} T={T}
          onClose={() => setNotesPeekTask(null)}
          onOpenFull={() => { setOpenTaskId(notesPeekTask.id); setNotesPeekTask(null); }} />
      )}
      {followUpModalTask && (
        <FollowUpModal task={followUpModalTask} isAr={isAr} T={T}
          onClose={() => setFollowUpModalTask(null)}
          onSaved={() => { setFollowUpModalTask(null); refreshAll(); }} />
      )}
      {followUpCancelTask && (
        <FollowUpCancelModal task={followUpCancelTask} isAr={isAr} T={T}
          onClose={() => setFollowUpCancelTask(null)}
          onCancelled={() => { setFollowUpCancelTask(null); refreshAll(); }} />
      )}
    </div>
  );
}

const quickBtnStyle: React.CSSProperties = { borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", padding: "7px 13px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" };
const dateInputStyle: React.CSSProperties = { borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "9px 12px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" };
function setThisMonth(setFrom: (v: string) => void, setTo: (v: string) => void) {
  const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1);
  setFrom(first.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10));
}
function setLast7Days(setFrom: (v: string) => void, setTo: (v: string) => void) {
  const now = new Date(); const from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  setFrom(from.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10));
}
function StatBox({ label, value, color, loading, hint }: { label: string; value: number | string; color: string; loading: boolean; hint?: string }) {
  return (
    <div className="abh-lift" style={{
      position: "relative", overflow: "hidden", borderRadius: 16,
      border: "1px solid rgba(255,255,255,.07)",
      background: "linear-gradient(160deg, rgba(255,255,255,.035), rgba(255,255,255,.01))",
      padding: "16px 18px",
    }}>
      <span style={{ position: "absolute", insetInlineStart: 0, top: 0, height: 3, width: "100%", background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: .8 }} />
      <div style={{ fontSize: 10.5, letterSpacing: ".04em", color: "var(--abh-steel)", marginBottom: 10 }}>{label}</div>
      <div className="abh-num" style={{ fontSize: 28, fontWeight: 600, color, opacity: loading ? 0.4 : 1, transition: "opacity .2s", lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ fontSize: 9.5, color: "var(--abh-steel)", marginTop: 8, opacity: .75, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}
function isStale(t: Task): boolean {
  if (t.stage === "won" || t.stage === "lost") return false;
  const ref = t.lastActivityAt ?? t.createdAt;
  return Date.now() - new Date(ref).getTime() > STALE_MS;
}

/* ═══════ أفاتار بالاسم ═══════ */
const Avatar = React.memo(function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const color = avatarColor(name || "?");
  const initials = (name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span style={{ display: "grid", placeItems: "center", height: size, width: size, flexShrink: 0, borderRadius: 999, border: `1px solid ${color}55`, background: `${color}18` }}>
      <span className="abh-display" style={{ fontSize: size * 0.42, color }}>{initials}</span>
    </span>
  );
});

/* ═══════ كارت التاسك المفتوح ═══════ */
const TaskCard = React.memo(function TaskCard({ t, isAr, T, currentUserId, id, onOpen, onPeekNotes, onSetFollowUp, onCancelFollowUp }: {
  t: Task; isAr: boolean; T: (a: string, e: string) => string; currentUserId?: string; id: string; onOpen: (id: string) => void;
  onPeekNotes?: (t: Task) => void; onSetFollowUp?: (t: Task) => void; onCancelFollowUp?: (t: Task) => void;
}) {
  const q = t.quality ? QUALITY_META[t.quality] : null;
  const stale = isStale(t);
  const followUpDue = isFollowUpDue(t);
  const createdByMe = !!currentUserId && t.createdBy === currentUserId && t.assignedTo !== currentUserId;
  const accent = followUpDue ? "#e7b4b4" : stale ? "#e8cf9a" : q?.color ?? "rgba(255,255,255,.18)";
  return (
    <button onClick={() => onOpen(id)} className="abh-lift"
      style={{
        textAlign: isAr ? "right" : "left", display: "flex", flexDirection: "column", gap: 11,
        borderRadius: 18, border: `1px solid ${followUpDue ? "rgba(231,180,180,.55)" : stale ? "rgba(232,207,154,.5)" : "rgba(255,255,255,.08)"}`,
        background: followUpDue ? "linear-gradient(160deg,rgba(231,180,180,.07),rgba(255,255,255,.02))" : stale ? "linear-gradient(160deg,rgba(232,207,154,.06),rgba(255,255,255,.02))" : "rgba(255,255,255,.022)",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        padding: "15px 16px", cursor: "pointer", width: "100%", position: "relative", overflow: "hidden",
      }}>
      <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${accent}, ${accent}55)` }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ position: "relative", flexShrink: 0 }}>
          <Avatar name={t.customerName} />
          {t.quality === "hot" && (
            <span style={{ position: "absolute", bottom: -2, insetInlineEnd: -2, display: "grid", placeItems: "center", height: 15, width: 15, borderRadius: 999, background: "#0c0d0e", border: "1px solid rgba(231,180,180,.5)", color: "#e7b4b4" }}>
              {flameIco(9)}
            </span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--abh-ivory)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customerName}</div>
          <div dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--abh-steel)", marginTop: 2 }}>{phoneIco(10)}{t.customerPhone}</div>
        </div>
        {q && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 9.5, color: q.color }}>
            <span style={{ height: 6, width: 6, borderRadius: 999, background: q.color, boxShadow: `0 0 6px ${q.color}` }} />
            {isAr ? q.ar : q.en}
          </span>
        )}
      </div>

      {(t.notesCount > 0 || isFollowUpActive(t)) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {t.notesCount > 0 && (
            <span onClick={(e) => { e.stopPropagation(); onPeekNotes?.(t); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: "4px 10px", cursor: "pointer",
                color: "#e8cf9a", border: "1px solid rgba(232,207,154,.55)", background: "rgba(232,207,154,.1)" }}>
              {chatIco(10)} {t.notesCount}
            </span>
          )}
          {isFollowUpActive(t) && (
            <span onClick={(e) => { e.stopPropagation(); onSetFollowUp?.(t); }}
              title={T("دوس لتعديل تاريخ المتابعة", "Tap to edit follow-up date")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: "4px 10px", cursor: "pointer",
                color: followUpDue ? "#e7b4b4" : "#9cc3e0", border: `1px solid ${followUpDue ? "rgba(231,180,180,.55)" : "rgba(156,195,224,.45)"}`,
                background: followUpDue ? "rgba(231,180,180,.1)" : "rgba(156,195,224,.08)" }}>
              {calIco(10)} {fmtFollowUpLabel(t.followUpDate!, isAr)}
            </span>
          )}
        </div>
      )}

      {createdByMe && (
        <span style={{ alignSelf: isAr ? "flex-end" : "flex-start", fontSize: 9.5, color: "#9cc3e0", borderRadius: 999, border: "1px solid rgba(156,195,224,.4)", background: "rgba(156,195,224,.1)", padding: "2px 9px" }}>
          {T("أنشأتها انت وموجّهة لزميل", "Created by you, routed to a colleague")}
        </span>
      )}

      {(t.vehicleBrandName || (t.leadSource && LEAD_SOURCE_META[t.leadSource])) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignSelf: isAr ? "flex-end" : "flex-start" }}>
          {t.vehicleBrandName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", backdropFilter: "blur(8px)", padding: "3px 10px", color: "var(--abh-platinum)" }}>
              {carIco(11)}{t.vehicleBrandName} {t.vehicleModel}
              {t.vehicleSize && <span style={{ opacity: .6 }}>· {isAr ? SIZE_META[t.vehicleSize].ar : SIZE_META[t.vehicleSize].en}</span>}
            </span>
          )}
          {t.leadSource && LEAD_SOURCE_META[t.leadSource] && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, borderRadius: 999, border: `1px solid ${LEAD_SOURCE_META[t.leadSource].color}55`, background: `${LEAD_SOURCE_META[t.leadSource].color}12`, backdropFilter: "blur(8px)", padding: "3px 10px", color: LEAD_SOURCE_META[t.leadSource].color }}>
              {isAr ? LEAD_SOURCE_META[t.leadSource].ar : LEAD_SOURCE_META[t.leadSource].en}
            </span>
          )}
        </div>
      )}

      {t.services.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {t.services.slice(0, 2).map((s) => <span key={s.id} style={{ fontSize: 9.5, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", padding: "2px 8px", color: "var(--abh-platinum)" }}>{s.name}</span>)}
          {t.services.length > 2 && <span style={{ fontSize: 9.5, color: "var(--abh-steel)" }}>+{t.services.length - 2}</span>}
        </div>
      )}

      {t.priceObjection && <span style={{ fontSize: 10, color: "#e7b4b4" }}>{T("⚠ معترض على السعر", "⚠ Price objection")}</span>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2, paddingTop: 11, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: t.assignedName ? "var(--abh-steel)" : "#e8cf9a" }}>
          {userIco(10)}
          <strong style={{ color: t.assignedName ? "var(--abh-platinum)" : "#e8cf9a", fontWeight: 600 }}>{t.assignedName ?? T("غير موجّه", "Unassigned")}</strong>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {t.stage !== "won" && t.stage !== "lost" && !isFollowUpActive(t) && (
            <span onClick={(e) => { e.stopPropagation(); onSetFollowUp?.(t); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "var(--abh-steel)", cursor: "pointer" }}>
              {calIco(10)}{T("حدد متابعة", "Set follow-up")}
            </span>
          )}
          {stale ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#e8cf9a", fontWeight: 600 }}>{staleIco(11)}{T("راكد", "Stale")}</span>
          ) : (
            <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{fmtAgo(t.lastActivityAt ?? t.createdAt, isAr)}</span>
          )}
        </div>
      </div>
    </button>
  );
});

/* ═══════ كارت احترافي للتاسكات المُقفلة (محجوز/مرفوض) — Grid ═══════ */
const ClosedTaskCard = React.memo(function ClosedTaskCard({ t, isAr, T, id, onOpen }: { t: Task; isAr: boolean; T: (a: string, e: string) => string; id: string; onOpen: (id: string) => void }) {
  const won = t.closeResult === "won";
  const reason = t.closeReason ? LOST_REASONS.find((r) => r.code === t.closeReason) : null;
  return (
    <div onClick={() => onOpen(id)} style={{ cursor: "pointer" }}>
      <ImageCard
        seed={t.vehicleBrandName || t.customerName}
        height={236}
        dim={won ? 0.42 : 0.3}
        badge={won ? T("تم الحجز", "Won") : T("مرفوض", "Lost")}
        topRight={
          t.quality ? (
            <Chip tone={t.quality === "hot" ? "bad" : t.quality === "warm" ? "warn" : "neutral"} dot>
              {isAr ? QUALITY_META[t.quality].ar : QUALITY_META[t.quality].en}
            </Chip>
          ) : undefined
        }>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar name={t.customerName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="abh-display" style={{ fontSize: 18, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1.1 }}>{t.customerName}</div>
            <div dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "rgba(203,205,205,.75)", marginTop: 3 }}>{phoneIco(10)}{t.customerPhone}</div>
          </div>
        </div>
        {t.vehicleBrandName && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(203,205,205,.8)", marginBottom: 4 }}>
            {carIco(11)}{t.vehicleBrandName} {t.vehicleModel}
          </div>
        )}
        {!won && reason && <div style={{ fontSize: 11.5, color: "#e7b4b4", fontWeight: 600 }}>{isAr ? reason.ar : reason.en}</div>}
        {won && t.closeNote && <div style={{ fontSize: 11, color: "rgba(203,205,205,.8)", lineHeight: 1.5 }}>{t.closeNote}</div>}
      </ImageCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px 0" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--abh-steel)" }}>{userIco(10)}{t.assignedName ?? T("—", "—")}</span>
        <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{fmtFull(t.closedAt ?? t.updatedAt, isAr)}</span>
      </div>
    </div>
  );
});
function ClosedGrid({ tasks, isAr, T, onOpen }: { tasks: Task[]; isAr: boolean; T: (a: string, e: string) => string; onOpen: (id: string) => void }) {
  if (tasks.length === 0) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد تاسكات في هذه القائمة.", "No tasks in this list.")}</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
      {tasks.map((t) => <ClosedTaskCard key={t.id} t={t} isAr={isAr} T={T} id={t.id} onOpen={onOpen} />)}
    </div>
  );
}

/* ═══════ صف عرض القائمة ═══════ */
const ListRow = React.memo(function ListRow({ t, i, isAr, T, currentUserId, id, onOpen, onPeekNotes }: { t: Task; i: number; isAr: boolean; T: (a: string, e: string) => string; currentUserId?: string; id: string; onOpen: (id: string) => void; onPeekNotes?: (t: Task) => void }) {
  const meta = STAGE_META[t.stage];
  const stale = isStale(t);
  const followUpDue = isFollowUpDue(t);
  const createdByMe = !!currentUserId && t.createdBy === currentUserId && t.assignedTo !== currentUserId;
  return (
    <button onClick={() => onOpen(id)} style={{ width: "100%", textAlign: isAr ? "right" : "left", display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", borderInlineStart: followUpDue ? "3px solid rgba(231,180,180,.6)" : "3px solid transparent", background: i % 2 ? "rgba(255,255,255,.012)" : "transparent", cursor: "pointer" }}>
      <span style={{ height: 8, width: 8, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, color: "var(--abh-ivory)" }}>{t.customerName}</span>
        <span dir="ltr" style={{ marginInlineStart: 10, fontSize: 11, color: "var(--abh-steel)" }}>{t.customerPhone}</span>
      </div>
      {t.notesCount > 0 && (
        <span onClick={(e) => { e.stopPropagation(); onPeekNotes?.(t); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: "3px 9px", cursor: "pointer", color: "#e8cf9a", border: "1px solid rgba(232,207,154,.55)", background: "rgba(232,207,154,.1)", flexShrink: 0 }}>
          {chatIco(10)}{t.notesCount}
        </span>
      )}
      {isFollowUpActive(t) && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 600, color: followUpDue ? "#e7b4b4" : "#9cc3e0", flexShrink: 0 }}>
          {calIco(10)}{fmtFollowUpLabel(t.followUpDate!, isAr)}
        </span>
      )}
      {createdByMe && <span style={{ fontSize: 9.5, color: "#9cc3e0", borderRadius: 999, border: "1px solid rgba(156,195,224,.4)", background: "rgba(156,195,224,.1)", padding: "2px 8px", flexShrink: 0 }}>{T("من إنشائك", "By you")}</span>}
      {stale && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#e8cf9a" }}>{staleIco(11)}{T("راكد", "Stale")}</span>}
      <span style={{ fontSize: 11.5, color: "var(--abh-platinum)", flexShrink: 0 }}>{isAr ? meta.ar : meta.en}</span>
      <span style={{ fontSize: 11, color: "var(--abh-steel)", flexShrink: 0, minWidth: 90, textAlign: isAr ? "left" : "right" }}>{t.assignedName ?? T("غير موجّه", "Unassigned")}</span>
    </button>
  );
});

/* ═══════ اختيار الماركة/الموديل — يحسب الحجم أوتوماتيك ═══════ */
function VehiclePicker({ brands, isAr, T, brandId, model, onChange }: {
  brands: Brand[]; isAr: boolean; T: (a: string, e: string) => string;
  brandId: string; model: string; onChange: (v: { brandId: string; brandName: string; model: string; size: VehicleSize | null }) => void;
}) {
  const brand = brands.find((b) => b.id === brandId);
  const size = brand?.models.find((m) => m.name === model)?.size ?? null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label={T("ماركة السيارة (اختياري)", "Vehicle brand (optional)")}>
        <Selectbox value={brandId} onChange={(v: string) => onChange({ brandId: v, brandName: brands.find((b) => b.id === v)?.name ?? "", model: "", size: null })}
          options={[{ value: "", label: T("بدون", "None") }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} placeholder={T("اختر", "Select")} />
      </Field>
      <Field label={T("الموديل", "Model")}>
        <Selectbox value={model} onChange={(v: string) => onChange({ brandId, brandName: brand?.name ?? "", model: v, size: brand?.models.find((m) => m.name === v)?.size ?? null })}
          options={[{ value: "", label: T("اختر الماركة أولًا", "Pick brand first") }, ...(brand?.models.map((m) => ({ value: m.name, label: m.name })) ?? [])]}
          placeholder={T("اختر", "Select")} />
      </Field>
      {size && (
        <div style={{ gridColumn: "1 / -1", display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", borderRadius: 999, border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.06)", padding: "5px 13px", fontSize: 11.5, color: "var(--abh-platinum)" }}>
          {carIco(12)}{T("حجم السيارة", "Vehicle size")}: <strong style={{ color: "var(--abh-ivory)" }}>{isAr ? SIZE_META[size].ar : SIZE_META[size].en}</strong>
        </div>
      )}
    </div>
  );
}

/* ═══════ مودال إنشاء تاسك ═══════ */
function CreateTaskModal({ services, brands, staff, isAr, T, currentUserId, currentUserName, onClose, onCreated }: {
  services: Service[]; brands: Brand[]; staff: StaffMember[]; isAr: boolean; T: (a: string, e: string) => string; currentUserId: string; currentUserName: string;
  onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [leadSource, setLeadSource] = useState("");
  const [brandId, setBrandId] = useState(""); const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState(""); const [size, setSize] = useState<VehicleSize | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [quality, setQuality] = useState<Quality>(null);
  const [priceObjection, setPriceObjection] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const staffOptions = useMemo(() => {
    if (staff.some((s) => s.id === currentUserId)) return staff;
    return [{ id: currentUserId, name: `${currentUserName} (${T("أنا", "Me")})` }, ...staff];
  }, [staff, currentUserId, currentUserName]); // eslint-disable-line

  const toggleSvc = (id: number) => setSelectedServices((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const phoneOk = phone.trim() && isValidPhone(phone);
  const valid = name.trim() && phoneOk;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const svcPayload = services.filter((s) => selectedServices.has(s.id)).map((s) => ({ id: s.id, slug: s.slug, name: s.name }));
      const res = await fetch("/api/admin/sales-tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name, customerPhone: phone, customerEmail: email || null, customerCity: city || null,
          services: svcPayload, quality, priceObjection, initialNote: note.trim() || null,
          vehicleBrandId: brandId || null, vehicleBrandName: brandName || null, vehicleModel: model || null, vehicleSize: size,
          assignedTo: assignedTo || null, leadSource: leadSource || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      toast(T("تم إنشاء التاسك", "Task created"));
      onCreated();
    } catch { toast(T("فشل إنشاء التاسك", "Failed to create task"), "bad"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={T("تاسك عميل محتمل جديد", "New prospective customer task")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 16 }}>
        <Field label={T("اسم العميل", "Customer name")}>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder={T("اسم العميل", "Customer name")} />
        </Field>
        <Field label={T("رقم التليفون", "Phone")}>
          <PhoneInput isAr={isAr} value={phone} onChange={setPhone} error={phone.trim() && !phoneOk ? T("رقم غير صحيح", "Invalid number") : null} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={T("التاسك موجّه لـ", "Task assigned to")}>
            <Selectbox value={assignedTo} onChange={setAssignedTo}
              options={[{ value: "", label: T("بدون توجيه", "Unassigned") }, ...staffOptions.map((s) => ({ value: s.id, label: s.name }))]}
              placeholder={T("اختر موظف مبيعات", "Select a staff member")} />
          </Field>
          <Field label={T("مصدر الليد", "Lead source")}>
            <Selectbox value={leadSource} onChange={setLeadSource}
              options={[{ value: "", label: T("غير محدد", "Not specified") }, ...Object.entries(LEAD_SOURCE_META).map(([k, v]) => ({ value: k, label: isAr ? v.ar : v.en }))]}
              placeholder={T("منين جاء العميل؟", "Where did the lead come from?")} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={T("اسم الحساب / الإيميل (اختياري)", "Account name / email (optional)")}>
            <Input dir="ltr" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder={T("مثال: ahmed_2024", "e.g. ahmed_2024")} style={{ textAlign: "left" }} />
          </Field>
          <Field label={T("المدينة (اختياري)", "City (optional)")}>
            <Input value={city} onChange={(e: any) => setCity(e.target.value)} placeholder={T("جدة", "Jeddah")} />
          </Field>
        </div>

        <VehiclePicker brands={brands} isAr={isAr} T={T} brandId={brandId} model={model}
          onChange={(v) => { setBrandId(v.brandId); setBrandName(v.brandName); setModel(v.model); setSize(v.size); }} />

        <Field label={T("الخدمة أو الخدمات اللي مهتم بيها", "Service(s) they're interested in")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {services.map((s) => {
              const on = selectedServices.has(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSvc(s.id)}
                  style={{ borderRadius: 999, padding: "7px 14px", fontSize: 12, cursor: "pointer", border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: on ? "rgba(203,205,205,.1)" : "rgba(255,255,255,.02)", color: on ? "var(--abh-ivory)" : "var(--abh-platinum)" }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={T("مستوى الاهتمام", "Interest level")}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["hot", "warm", "cold"] as const).map((k) => {
              const m = QUALITY_META[k]; const on = quality === k;
              return (
                <button key={k} type="button" onClick={() => setQuality(on ? null : k)}
                  style={{ flex: 1, borderRadius: 12, padding: "10px 8px", fontSize: 12, cursor: "pointer", border: `1px solid ${on ? m.color : "rgba(255,255,255,.1)"}`, background: on ? `${m.color}15` : "rgba(255,255,255,.02)", color: on ? m.color : "var(--abh-platinum)" }}>
                  {isAr ? m.ar : m.en}
                </button>
              );
            })}
          </div>
        </Field>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={priceObjection} onChange={(e) => setPriceObjection(e.target.checked)} />
          <span style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{T("معترض على السعر", "Objected to the price")}</span>
        </label>

        <Field label={T("ملاحظاتك (اختياري)", "Your notes (optional)")}>
          <Textarea value={note} onChange={(e: any) => setNote(e.target.value)} rows={3}
            placeholder={T("مثال: العميل عايز عرض سعر لباقة السيراميك، هيرد يوم الخميس…", "e.g. Customer wants a quote for the ceramic package, will call back Thursday…")} />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill onClick={submit}>{busy ? T("جارٍ الإنشاء…", "Creating…") : T("إنشاء التاسك", "Create task")}</Pill>
        </div>
        {!valid && <p style={{ margin: 0, fontSize: 11.5, color: "var(--abh-steel)", textAlign: "end" }}>{T("اسم العميل ورقم تليفون صحيح مطلوبين.", "Customer name and a valid phone are required.")}</p>}
      </div>
    </Modal>
  );
}

function SectionTitle({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: accent ? "var(--abh-ivory)" : "var(--abh-platinum)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontWeight: accent ? 700 : 400 }}>
      {label}
      <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(255,255,255,.12),transparent)" }} />
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
      <span style={{ fontSize: 11.5, color: "var(--abh-steel)", flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--abh-ivory)", fontWeight: 500, textAlign: "end" }}>{value}</span>
    </div>
  );
}

/* ═══════ درج تفاصيل التاسك — بروفايل ثابت للعرض + بانل حالة/توجيه قابل للتعديل ═══════ */
function TaskDrawer({ task, services, brands, staff, isAr, T, currentUserId, currentUserName, onClose, onChanged, onScheduleFollowUp, onCancelFollowUp }: {
  task: Task; services: Service[]; brands: Brand[]; staff: StaffMember[]; isAr: boolean; T: (a: string, e: string) => string;
  currentUserId: string; currentUserName: string;
  onClose: () => void; onChanged: () => void; onScheduleFollowUp: () => void; onCancelFollowUp: () => void;
}) {
  const toast = useToast();
  const isClosed = task.stage === "won" || task.stage === "lost";

  const [draft, setDraft] = useState({
    stage: task.stage,
    assignedTo: task.assignedTo ?? "",
    leadSource: task.leadSource ?? "",
  });
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => draft.stage !== task.stage || draft.assignedTo !== (task.assignedTo ?? "") || draft.leadSource !== (task.leadSource ?? ""), [draft, task.stage, task.assignedTo, task.leadSource]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [closingKind, setClosingKind] = useState<"won" | "lost" | null>(null);

  const loadNotes = async () => {
    setLoadingNotes(true);
    try {
      const j = await fetch(`/api/admin/sales-tasks/${task.id}/notes-list`).then((r) => r.json()).catch(() => null);
      if (j?.ok) setNotes(j.notes);
    } finally { setLoadingNotes(false); }
  };
  useEffect(() => { loadNotes(); /* eslint-disable-next-line */ }, [task.id]);

  const saveChanges = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sales-tasks/${task.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: draft.stage,
          assignedTo: draft.assignedTo || null,
          assignedToName: staff.find((s) => s.id === draft.assignedTo)?.name ?? (draft.assignedTo === currentUserId ? currentUserName : null),
          leadSource: draft.leadSource || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      toast(T("تم حفظ التعديلات", "Changes saved"));
      onChanged(); loadNotes();
    } catch { toast(T("فشل الحفظ", "Failed to save"), "bad"); }
    finally { setSaving(false); }
  };

  const addNote = async () => {
    if (!newNote.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/admin/sales-tasks/${task.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: newNote.trim() }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      setNotes((n) => [...n, { id: j.id, authorId: currentUserId, authorName: currentUserName, body: newNote.trim(), createdAt: j.createdAt }]);
      setNewNote(""); onChanged();
    } catch { toast(T("فشل إضافة الملاحظة", "Failed to add note"), "bad"); }
    finally { setPosting(false); }
  };

  const vehicleLabel = task.vehicleBrandName
    ? `${task.vehicleBrandName} ${task.vehicleModel ?? ""}${task.vehicleSize ? " · " + (isAr ? SIZE_META[task.vehicleSize].ar : SIZE_META[task.vehicleSize].en) : ""}`
    : T("غير محدد", "Not specified");

  return (
    <>
      <Modal title={task.customerName} onClose={onClose} wide>
        <div className="abh-col" style={{ gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Chip tone="platinum" dot>{isAr ? STAGE_META[task.stage].ar : STAGE_META[task.stage].en}</Chip>
            {task.quality && <Chip tone={task.quality === "hot" ? "bad" : task.quality === "warm" ? "warn" : "neutral"} dot>{isAr ? QUALITY_META[task.quality].ar : QUALITY_META[task.quality].en}</Chip>}
            {task.priceObjection && <Chip tone="bad" dot>{T("معترض على السعر", "Price objection")}</Chip>}
            <span style={{ marginInlineStart: "auto", fontSize: 10.5, color: "var(--abh-steel)" }}>
              {T("أنشأه", "Created by")} {task.createdName ?? "—"} · {fmtFull(task.createdAt, isAr)}
            </span>
          </div>

          {isClosed ? (
            <div style={{ borderRadius: 14, border: `1px solid ${task.closeResult === "won" ? "rgba(159,212,176,.4)" : "rgba(231,180,180,.4)"}`, background: task.closeResult === "won" ? "rgba(159,212,176,.08)" : "rgba(231,180,180,.08)", padding: 16 }}>
              <div style={{ fontSize: 14, color: task.closeResult === "won" ? "#9fd4b0" : "#e7b4b4", fontWeight: 600 }}>
                {task.closeResult === "won" ? T("✅ تم الحجز", "✅ Won") : T(`❌ مرفوض — ${LOST_REASONS.find((r) => r.code === task.closeReason)?.ar ?? task.closeReason}`, `❌ Lost — ${LOST_REASONS.find((r) => r.code === task.closeReason)?.en ?? task.closeReason}`)}
              </div>
              {task.closeNote && <div style={{ fontSize: 12.5, color: "var(--abh-platinum)", marginTop: 6 }}>{task.closeNote}</div>}
              <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 8 }}>{fmtFull(task.closedAt!, isAr)}</div>
            </div>
          ) : null}

          {/* ── 1) بروفايل العميل — بيانات ثابتة للعرض بس ── */}
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.02)", padding: 20 }}>
            <SectionTitle label={T("بيانات العميل", "Customer profile")} />
            <div className="abh-col" style={{ gap: 0 }}>
              <InfoRow label={T("اسم العميل", "Customer name")} value={task.customerName} />
              <InfoRow label={T("التليفون", "Phone")} value={<span dir="ltr">{task.customerPhone}</span>} />
              {task.customerEmail && <InfoRow label={T("الإيميل", "Email")} value={<span dir="ltr">{task.customerEmail}</span>} />}
              {task.customerCity && <InfoRow label={T("المدينة", "City")} value={task.customerCity} />}
              <InfoRow label={T("السيارة", "Vehicle")} value={vehicleLabel} />
              <InfoRow label={T("مصدر الليد", "Lead source")} value={task.leadSource && LEAD_SOURCE_META[task.leadSource] ? (isAr ? LEAD_SOURCE_META[task.leadSource].ar : LEAD_SOURCE_META[task.leadSource].en) : "—"} />
              <InfoRow label={T("مستوى الاهتمام", "Interest level")} value={task.quality ? (isAr ? QUALITY_META[task.quality].ar : QUALITY_META[task.quality].en) : "—"} />
              <InfoRow label={T("اعتراض على السعر", "Price objection")} value={task.priceObjection ? T("نعم", "Yes") : T("لا", "No")} />
              <InfoRow label={T("الخدمات المهتم بها", "Interested services")} value={
                task.services.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: isAr ? "flex-end" : "flex-start" }}>
                    {task.services.map((s) => <span key={s.id} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", padding: "3px 10px", fontSize: 11 }}>{s.name}</span>)}
                  </div>
                ) : T("لا توجد", "None")
              } />
            </div>
            {task.initialNote && (
              <div style={{ marginTop: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 12 }}>
                <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginBottom: 4 }}>{T("ملاحظة الإنشاء الأولى", "Initial note at creation")}</div>
                <div style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{task.initialNote}</div>
              </div>
            )}
          </div>

          {/* ── 2) الحالة والتوجيه — القابل للتعديل، وتحته زرار الحفظ ── */}
          {!isClosed && (
            <div style={{ borderRadius: 18, border: "1px solid rgba(203,205,205,.25)", background: "rgba(203,205,205,.04)", padding: 20 }}>
              <SectionTitle label={T("الحالة والتوجيه — قابل للتعديل", "Status & routing — editable")} accent />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field label={T("المرحلة", "Stage")}>
                  <Selectbox value={draft.stage} onChange={(v: Stage) => setDraft((d) => ({ ...d, stage: v }))}
                    options={OPEN_STAGES.map((s) => ({ value: s, label: isAr ? STAGE_META[s].ar : STAGE_META[s].en }))} placeholder="" />
                </Field>
                <Field label={T("موجّه لـ", "Assigned to")}>
                  <Selectbox value={draft.assignedTo} onChange={(v: string) => setDraft((d) => ({ ...d, assignedTo: v }))}
                    options={[
                      { value: "", label: T("بدون توجيه", "Unassigned") },
                      ...staff.map((s) => ({ value: s.id, label: s.name })),
                      ...(staff.some((s) => s.id === currentUserId) ? [] : [{ value: currentUserId, label: `${currentUserName} (${T("أنا", "Me")})` }]),
                    ]}
                    placeholder={T("اختر موظف", "Select staff")} />
                </Field>
                <Field label={T("مصدر الليد", "Lead source")}>
                  <Selectbox value={draft.leadSource} onChange={(v: string) => setDraft((d) => ({ ...d, leadSource: v }))}
                    options={[{ value: "", label: T("غير محدد", "Not specified") }, ...Object.entries(LEAD_SOURCE_META).map(([k, v]) => ({ value: k, label: isAr ? v.ar : v.en }))]}
                    placeholder={T("اختر المصدر", "Select source")} />
                </Field>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <span style={{ opacity: !dirty || saving ? 0.45 : 1, pointerEvents: !dirty || saving ? "none" : "auto", transition: "opacity .2s" }}>
                    <Pill onClick={saveChanges}>
                    {saving ? T("جارٍ الحفظ…", "Saving…") : dirty ? T("حفظ التعديلات", "Save changes") : T("لا تعديلات", "No changes")}
                    </Pill>
                </span>
                </div>
            </div>
          )}

          {/* ── متابعة مجدولة ── */}
          {!isClosed && (
            <div style={{ borderRadius: 18, border: `1px solid ${isFollowUpActive(task) ? (isFollowUpDue(task) ? "rgba(231,180,180,.4)" : "rgba(156,195,224,.35)") : "rgba(255,255,255,.09)"}`,
              background: isFollowUpActive(task) ? (isFollowUpDue(task) ? "rgba(231,180,180,.06)" : "rgba(156,195,224,.05)") : "rgba(255,255,255,.02)", padding: 20 }}>
              <SectionTitle label={T("المتابعة", "Follow-up")} accent={isFollowUpActive(task)} />
              {isFollowUpActive(task) ? (
                <div className="abh-col" style={{ gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: isFollowUpDue(task) ? "#e7b4b4" : "#9cc3e0" }}>
                    {calIco(14)} {fmtFollowUpLabel(task.followUpDate!, isAr)} · <span dir="ltr">{task.followUpDate}</span>
                  </div>
                  {task.followUpNote && <div style={{ fontSize: 12.5, color: "var(--abh-platinum)" }}>{task.followUpNote}</div>}
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <Ghost onClick={onScheduleFollowUp}>{T("تعديل الموعد", "Reschedule")}</Ghost>
                    <Ghost onClick={onCancelFollowUp}>{T("إلغاء المتابعة", "Cancel follow-up")}</Ghost>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>{T("مفيش متابعة محددة لسه.", "No follow-up scheduled yet.")}</span>
                  <Pill onClick={onScheduleFollowUp}>{T("تحديد متابعة", "Schedule follow-up")}</Pill>
                </div>
              )}
              {task.followUpCancelledAt && task.followUpCancelReason && (
                <div style={{ marginTop: 12, fontSize: 11, color: "var(--abh-steel)" }}>
                  {T("آخر متابعة اتلغت — السبب:", "Last follow-up cancelled — reason:")} {task.followUpCancelReason}
                </div>
              )}
            </div>
          )}

          {/* زراري الإغلاق */}
          {!isClosed && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setClosingKind("won")} className="abh-lift"
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, border: "1px solid rgba(159,212,176,.4)", background: "linear-gradient(160deg, rgba(159,212,176,.14), rgba(159,212,176,.05))", color: "var(--abh-ok)", padding: "13px 0", fontSize: 13, fontWeight: 600, letterSpacing: ".04em", cursor: "pointer" }}>
                {checkIco(15)}{T("تم الحجز", "Mark as Won")}
              </button>
              <button onClick={() => setClosingKind("lost")} className="abh-lift"
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, border: "1px solid rgba(231,180,180,.4)", background: "linear-gradient(160deg, rgba(231,180,180,.14), rgba(231,180,180,.05))", color: "#e7b4b4", padding: "13px 0", fontSize: 13, fontWeight: 600, letterSpacing: ".04em", cursor: "pointer" }}>
                {closeIco(15)}{T("رفض", "Mark as Lost")}
              </button>
            </div>
          )}

          {/* سجل النشاط */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("سجلّ النشاط الكامل", "Full activity log")}</div>
            <div className="abh-col" style={{ gap: 8, maxHeight: 260, overflowY: "auto", paddingInlineEnd: 4 }}>
              {loadingNotes ? (
                <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
              ) : notes.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("لا نشاط بعد.", "No activity yet.")}</div>
              ) : notes.slice().reverse().map((n) => (
                <div key={n.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.012)", padding: 11, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "var(--abh-platinum)", fontWeight: 600 }}>{n.authorName}</span>
                    <span style={{ color: "var(--abh-steel)", fontSize: 10.5 }}>{fmtFull(n.createdAt, isAr)}</span>
                  </div>
                  <div style={{ color: "var(--abh-ivory)", whiteSpace: "pre-line", lineHeight: 1.6 }}>{n.body}</div>
                </div>
              ))}
            </div>
          </div>

          {!isClosed && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={T("أضف ملاحظة متابعة…", "Add a follow-up note…")}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 15px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
              <button onClick={addNote} disabled={posting || !newNote.trim()}
                style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.4)", background: "rgba(203,205,205,.1)", color: "var(--abh-ivory)", padding: "11px 20px", fontSize: 12.5, cursor: posting || !newNote.trim() ? "not-allowed" : "pointer", opacity: posting || !newNote.trim() ? 0.5 : 1 }}>
                {T("إضافة", "Add")}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {closingKind && (
        <CloseReasonModal kind={closingKind} taskId={task.id} isAr={isAr} T={T}
          onClose={() => setClosingKind(null)}
          onClosed={() => { setClosingKind(null); onChanged(); onClose(); }} />
      )}
    </>
  );
}

/* ═══════ مودال صغير منفصل: اختيار سبب الإغلاق ═══════ */
function CloseReasonModal({ kind, taskId, isAr, T, onClose, onClosed }: {
  kind: "won" | "lost"; taskId: string; isAr: boolean; T: (a: string, e: string) => string;
  onClose: () => void; onClosed: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (kind === "lost" && !reason) { toast(T("اختر سبب الرفض", "Select a lost reason"), "bad"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales-tasks/${taskId}/close`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: kind, reason: kind === "lost" ? reason : null, note: note.trim() || null }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      toast(kind === "won" ? T("تم إغلاق التاسك — محجوز 🎉", "Task closed — won 🎉") : T("تم إغلاق التاسك — مرفوض", "Task closed — lost"));
      onClosed();
    } catch { toast(T("فشل إغلاق التاسك", "Failed to close task"), "bad"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={kind === "won" ? T("تأكيد الحجز 🎉", "Confirm booking 🎉") : T("سبب الرفض", "Reason for lost")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        {kind === "lost" && (
          <Field label={T("السبب", "Reason")}>
            <Selectbox value={reason} onChange={setReason}
              options={LOST_REASONS.map((r) => ({ value: r.code, label: isAr ? r.ar : r.en }))}
              placeholder={T("اختر السبب", "Select reason")} />
          </Field>
        )}
        <Field label={T("تفاصيل إضافية (اختياري)", "Additional details (optional)")}>
          <Textarea rows={3} value={note} onChange={(e: any) => setNote(e.target.value)}
            placeholder={kind === "won" ? T("مثال: رقم الحجز ABH-1234", "e.g. Booking ref ABH-1234") : T("مثال: هيقارن أسعار وهيرجع بعد أسبوع", "e.g. Comparing prices, will come back in a week")} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Ghost onClick={onClose}>{T("تراجع", "Back")}</Ghost>
          <Pill onClick={confirm}>{busy ? T("جارٍ التأكيد…", "Confirming…") : T("تأكيد", "Confirm")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════ بوب-أب ملاحظات سريع (بيتفتح من الكارت) ═══════ */
function NotesPeekModal({ task, isAr, T, onClose, onOpenFull }: {
  task: Task; isAr: boolean; T: (a: string, e: string) => string; onClose: () => void; onOpenFull: () => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/sales-tasks/${task.id}/notes-list`).then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setNotes(j.notes); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [task.id]);

  return (
    <Modal title={T(`الملاحظات — ${task.customerName}`, `Notes — ${task.customerName}`)} onClose={onClose}>
      <div className="abh-col" style={{ gap: 14 }}>
        <div style={{ fontSize: 11, color: "var(--abh-steel)" }}>
          {T("اقرأها قبل ما تكلم العميل — يمكن يكون فيه حاجة مهمة اتقالت قبل كده.", "Read these before calling — something important might already be noted.")}
        </div>
        {task.initialNote && (
          <div style={{ borderRadius: 12, border: "1px solid rgba(232,207,154,.4)", background: "rgba(232,207,154,.08)", padding: 12 }}>
            <div style={{ fontSize: 10.5, color: "#e8cf9a", marginBottom: 4, fontWeight: 600 }}>{T("ملاحظة الإنشاء", "Note at creation")}</div>
            <div style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{task.initialNote}</div>
          </div>
        )}
        <div className="abh-col" style={{ gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : notes.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("لا ملاحظات بعد.", "No notes yet.")}</div>
          ) : notes.slice().reverse().map((n) => (
            <div key={n.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.012)", padding: 11, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "var(--abh-platinum)", fontWeight: 600 }}>{n.authorName}</span>
                <span style={{ color: "var(--abh-steel)", fontSize: 10.5 }}>{fmtFull(n.createdAt, isAr)}</span>
              </div>
              <div style={{ color: "var(--abh-ivory)", whiteSpace: "pre-line", lineHeight: 1.6 }}>{n.body}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Ghost onClick={onOpenFull}>{T("فتح التاسك بالكامل", "Open full task")}</Ghost>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════ تحديد / إعادة جدولة متابعة ═══════ */
function FollowUpModal({ task, isAr, T, onClose, onSaved }: {
  task: Task; isAr: boolean; T: (a: string, e: string) => string; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const todays = todayStr();
  const [date, setDate] = useState(task.followUpDate && !task.followUpCancelledAt && task.followUpDate >= todays ? task.followUpDate : todays);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const presets = [
    { label: T("غدًا", "Tomorrow"), days: 1 },
    { label: T("بعد 3 أيام", "In 3 days"), days: 3 },
    { label: T("الأسبوع الجاي", "Next week"), days: 7 },
  ];
  const applyPreset = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); setDate(d.toISOString().slice(0, 10)); };

  const submit = async () => {
    if (!date || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales-tasks/${task.id}/follow-up`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: note.trim() || null }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      toast(T("تم تحديد المتابعة", "Follow-up scheduled"));
      onSaved();
    } catch { toast(T("فشل تحديد المتابعة", "Failed to schedule follow-up"), "bad"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={T("تحديد تاريخ متابعة", "Schedule follow-up")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>{task.customerName} · <span dir="ltr">{task.customerPhone}</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {presets.map((p) => <button key={p.days} type="button" onClick={() => applyPreset(p.days)} style={quickBtnStyle}>{p.label}</button>)}
        </div>
        <Field label={T("تاريخ المتابعة", "Follow-up date")}>
          <input type="date" value={date} min={todays} onChange={(e) => setDate(e.target.value)} dir="ltr" style={dateInputStyle} />
        </Field>
        <Field label={T("ملاحظة (اختياري)", "Note (optional)")}>
          <Textarea rows={3} value={note} onChange={(e: any) => setNote(e.target.value)}
            placeholder={T("مثال: العميل هيرد بعد ما يفكر ", "e.g. Customer will confirm with spouse first")} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill onClick={submit}>{busy ? T("جارٍ الحفظ…", "Saving…") : T("تحديد المتابعة", "Schedule")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════ إلغاء متابعة بسبب ═══════ */
function FollowUpCancelModal({ task, isAr, T, onClose, onCancelled }: {
  task: Task; isAr: boolean; T: (a: string, e: string) => string; onClose: () => void; onCancelled: () => void;
}) {
  const toast = useToast();
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reasonCode || busy) return;
    setBusy(true);
    try {
      const preset = FOLLOWUP_CANCEL_REASONS.find((r) => r.code === reasonCode);
      const reasonText = reasonCode === "other" ? (note.trim() || T("سبب آخر", "Other")) : (isAr ? preset?.ar : preset?.en) ?? reasonCode;
      const res = await fetch(`/api/admin/sales-tasks/${task.id}/follow-up`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error();
      toast(T("تم إلغاء المتابعة", "Follow-up cancelled"));
      onCancelled();
    } catch { toast(T("فشل إلغاء المتابعة", "Failed to cancel follow-up"), "bad"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={T("إلغاء المتابعة", "Cancel follow-up")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <Field label={T("السبب", "Reason")}>
          <Selectbox value={reasonCode} onChange={setReasonCode}
            options={FOLLOWUP_CANCEL_REASONS.map((r) => ({ value: r.code, label: isAr ? r.ar : r.en }))}
            placeholder={T("اختر السبب", "Select reason")} />
        </Field>
        {reasonCode === "other" && (
          <Field label={T("التفاصيل", "Details")}>
            <Textarea rows={2} value={note} onChange={(e: any) => setNote(e.target.value)} />
          </Field>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Ghost onClick={onClose}>{T("تراجع", "Back")}</Ghost>
          <Pill onClick={submit}>{busy ? T("جارٍ الإلغاء…", "Cancelling…") : T("تأكيد الإلغاء", "Confirm cancel")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════ شاشة المتابعات المجدولة — متأخرة/اليوم أول حاجة ═══════ */
function FollowUpBoard({ tasks, loading, isAr, T, currentUserId, onOpen, onPeekNotes, onSetFollowUp, onCancelFollowUp }: {
  tasks: Task[]; loading: boolean; isAr: boolean; T: (a: string, e: string) => string; currentUserId?: string;
  onOpen: (id: string) => void; onPeekNotes: (t: Task) => void; onSetFollowUp: (t: Task) => void; onCancelFollowUp: (t: Task) => void;
}) {
  const sorted = useMemo(() => tasks.slice().sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? "")), [tasks]);
  const today = todayStr();
  const due = sorted.filter((t) => (t.followUpDate ?? "") <= today);
  const upcoming = sorted.filter((t) => (t.followUpDate ?? "") > today);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>;
  if (sorted.length === 0) return <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد متابعات مجدولة حاليًا.", "No scheduled follow-ups right now.")}</div>;

  const grid = (list: Task[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
      {list.map((t) => (
        <TaskCard key={t.id} t={t} isAr={isAr} T={T} currentUserId={currentUserId} id={t.id} onOpen={onOpen}
          onPeekNotes={onPeekNotes} onSetFollowUp={onSetFollowUp} onCancelFollowUp={onCancelFollowUp} />
      ))}
    </div>
  );

  return (
    <div className="abh-col" style={{ gap: 28 }}>
      {due.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11.5, fontWeight: 700, color: "#e7b4b4", textTransform: "uppercase", letterSpacing: ".06em" }}>
            {staleIco(13)} {T(`لازم تكلمهم النهارده (${due.length})`, `Due now (${due.length})`)}
          </div>
          {grid(due)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--abh-platinum)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
            {T(`قادمة (${upcoming.length})`, `Upcoming (${upcoming.length})`)}
          </div>
          {grid(upcoming)}
        </div>
      )}
    </div>
  );
}

function fmtAgo(iso: string, isAr: boolean): string {
  const d = new Date(iso).getTime(); const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isAr ? "الآن" : "now";
  if (mins < 60) return isAr ? `منذ ${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isAr ? `منذ ${hrs} س` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isAr ? `منذ ${days} يوم` : `${days}d ago`;
}
function fmtFull(iso: string, isAr: boolean): string {
  const d = new Date(iso);
  return d.toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}