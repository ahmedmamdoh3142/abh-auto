"use client";
/**
 * app/admin/bookings/[id]/work-order/work-order-client.tsx — أمر العمل (CLIENT).
 * كروت مهام جريد متوسطة بتقسيمة احترافية: فنيون + وقت + خامات.
 * صرف الخامات من الوسيط، وطلب الناقص من نفس الشاشة (لا ينقل للمخازن — فصل صلاحيات).
 */
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { card, Ic, Pill, Ghost, Field, Modal, useToast } from "@/components/admin/ui";
import { brandImg } from "@/lib/brand-image";

export default function WorkOrderClient({ booking, locale }: { booking: any; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const router = useRouter();
  const nm = (n: any) => (!n ? "" : typeof n === "string" ? n : (isAr ? (n.ar ?? n.en) : (n.en ?? n.ar)) ?? "");

  const [tasks, setTasks] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]); // كل الخامات (للطلب)
  const [workStage, setWorkStage] = useState<string | null>(booking.workStage);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matModal, setMatModal] = useState<any>(null);
  const [reqModal, setReqModal] = useState(false);
  const [chatTask, setChatTask] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now()); // لتحديث العدّاد الحيّ
  const [qcModal, setQcModal] = useState<any>(null); // {task, action}

  const started = !!workStage && workStage !== "received";
  const inQC = workStage === "quality_check";
  const isReady = workStage === "ready";

  // silent=true → تحديث في الخلفية بدون شاشة تحميل (يمنع وميض الكروت)
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tj, uj, ij] = await Promise.all([
        fetch(`/api/admin/bookings/${booking.id}/tasks?locale=${isAr ? "ar" : "en"}`).then((r) => r.json()),
        fetch("/api/admin/technicians").then((r) => r.json()),
        fetch("/api/admin/inventory").then((r) => r.json()),
      ]);
      if (tj?.ok) { setTasks(tj.tasks); setAvailable(tj.availableMaterials || []); setWorkStage(tj.workStage); setTimeline(tj.timeline || []); }
      if (uj?.ok) setTechs(uj.technicians);
      if (ij?.ok) setAllItems(ij.items || []);
    } finally { if (!silent) setLoading(false); }
  }, [booking.id, isAr]);
  useEffect(() => { load(); }, [load]);
  // عدّاد حيّ + تحديث دوري أثناء التشغيل
  useEffect(() => {
    if (!started) return;
    const tick = setInterval(() => setNow(Date.now()), 30_000);      // يحدّث العدّاد
    const poll = setInterval(() => load(true), 60_000);                  // يجيب تحديثات الفنيين
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [started, load]);

  async function taskAction(taskId: number, body: any) {
    const res = await fetch(`/api/admin/bookings/${booking.id}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      if (data.error === "insufficient_stock") throw new Error(T(`رصيد غير كافٍ بالوسيط (متاح ${data.have})`, `Insufficient (have ${data.have})`));
      throw new Error(T("فشل التنفيذ", "Action failed"));
    }
    return data;
  }

  async function toggleTech(task: any, tech: any) {
    const has = task.technicians.some((t: any) => t.id === tech.id);
    // تحديث محلي فوري (بدون إعادة تحميل الصفحة)
    setTasks((prev) => prev.map((t) => t.id !== task.id ? t : {
      ...t,
      technicians: has
        ? t.technicians.filter((x: any) => x.id !== tech.id)
        : [...t.technicians, { id: tech.id, name: tech.name, confirmedAt: null }],
    }));
    // حدّث عدّاد حِمل الفني محليًا كمان
    setTechs((prev) => prev.map((x) => x.id !== tech.id ? x : { ...x, activeTasks: Math.max(0, x.activeTasks + (has ? -1 : 1)) }));
    try {
      await taskAction(task.id, { action: has ? "unassign_tech" : "assign_tech", technicianId: tech.id });
    } catch (e: any) {
      toast(e.message, "bad");
      load(true); // في حالة الفشل فقط، نعيد المزامنة مع السيرفر
    }
  }
  async function setTime(task: any, mins: string) {
    const v = mins === "" ? null : Math.max(0, Number(mins) || 0);
    try { await taskAction(task.id, { action: "set_time", estimatedMinutes: v }); }
    catch (e: any) { toast(e.message, "bad"); }
  }
  async function setRoll(task: any, usesRoll: boolean, rollNo: string) {
    setTasks((prev) => prev.map((t) => t.id !== task.id ? t : { ...t, usesRoll, rollNo }));
    try { await taskAction(task.id, { action: "set_roll", usesRoll, rollNo }); }
    catch (e: any) { toast(e.message, "bad"); load(true); }
  }
  async function issueMaterial(task: any, itemId: number, quantity: number) {
    try { await taskAction(task.id, { action: "issue_material", itemId, quantity }); toast(T("تم صرف الخامة", "Issued")); setMatModal(null); await load(true); }
    catch (e: any) { toast(e.message, "bad"); }
  }
  async function returnMaterial(task: any, materialId: number) {
    try { await taskAction(task.id, { action: "return_material", materialId }); await load(true); }
    catch (e: any) { toast(e.message, "bad"); }
  }

  async function sendRequest(items: { itemId: number; quantity: number }[], note: string) {
    try {
      const r = await fetch("/api/admin/inventory/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || T("طلب من شاشة أمر العمل", "From work order"), items }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error();
      toast(T("تم إرسال الطلب للمخزن — بانتظار الموافقة", "Request sent — pending approval"));
      setReqModal(false);
    } catch { toast(T("فشل الإرسال", "Send failed"), "bad"); }
  }

  async function startWork() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/start-work`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "tasks_unassigned") throw new Error(T("لازم تخصّص فني لكل مهمة أولًا", "Assign a technician to every task first"));
        throw new Error(T("فشل بدء التشغيل", "Failed"));
      }
      toast(T("بدأ التشغيل — المهام متاحة للفنيين", "Work started"));
      router.push("/admin/bookings"); router.refresh();
    } catch (e: any) { toast(e.message, "bad"); }
    finally { setBusy(false); }
  }

  async function qcAction(task: any, action: "approve" | "reject", note?: string) {
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/qc`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action, note: note || null }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "note_required") throw new Error(T("لازم تكتب سبب الرفض", "Rejection reason required"));
        throw new Error(T("فشل التنفيذ", "Failed"));
      }
      toast(action === "approve" ? T("تم اعتماد المهمة", "Task approved") : T("رجعت للفني للإصلاح", "Sent back to technician"));
      setQcModal(null);
      await load(true);
    } catch (e: any) { toast(e.message, "bad"); }
  }

  const allAssigned = tasks.length > 0 && tasks.every((t) => t.technicians.length > 0);
  const STATUS: Record<string, { ar: string; en: string; color: string }> = {
    pending: { ar: "بانتظار البدء", en: "Pending", color: "#8a9099" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress", color: "#f5993d" },
    done: { ar: "منتهية", en: "Done", color: "#3ecd8e" },
  };

  // ── دوال المتابعة ──
  // الوقت المنقضي للمهمة (من أول بدء فني حتى الآن، أو حتى آخر تأكيد لو خلصت)
  const elapsedMin = (task: any) => {
    const starts = task.technicians.map((t: any) => t.startedAt).filter(Boolean).map((s: string) => new Date(s).getTime());
    if (starts.length === 0) return null;
    const first = Math.min(...starts);
    const dones = task.technicians.map((t: any) => t.confirmedAt).filter(Boolean).map((s: string) => new Date(s).getTime());
    const end = task.status === "done" && dones.length ? Math.max(...dones) : now;
    return Math.max(0, Math.round((end - first) / 60000));
  };
  // صيغة رقمية بحتة (HH:MM) — تظهر مرتّبة في RTL و LTR
  const fmtDur = (m: number) => {
    const h = Math.floor(m / 60), r = m % 60;
    return `${h}:${String(r).padStart(2, "0")}`;
  };

  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDT = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };

  const EVENT_LABEL: Record<string, { ar: string; en: string; color: string }> = {
    received: { ar: "استُلمت السيارة", en: "Vehicle received", color: "#cbcdcd" },
    work_started: { ar: "بدأ التشغيل", en: "Work started", color: "#f5993d" },
    task_started: { ar: "بدأ المهمة", en: "started task", color: "#f5993d" },
    task_done: { ar: "أنهى المهمة", en: "finished task", color: "#3ecd8e" },
    all_tasks_done: { ar: "اكتملت كل المهام", en: "All tasks done", color: "#3ecd8e" },
    stage_change: { ar: "تغيّرت المرحلة", en: "Stage changed", color: "#8a9099" },
  };

  return (
    <div className="abh-fade-up" style={{ paddingBottom: 40 }}>
      {/* رأس */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => router.push("/admin/bookings")} style={{ display: "grid", placeItems: "center", height: 40, width: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer", flexShrink: 0, transform: isAr ? "none" : "scaleX(-1)" }}><Ic.chevDown s={17} extra="abh-flip" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="abh-display" style={{ margin: 0, fontSize: 26, fontWeight: 300, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1 }}>{T("أمر العمل", "Work order")}</h1>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 4 }} dir="ltr">{booking.workOrderNo ? `WO-${booking.workOrderNo} · ` : ""}{booking.reference}</div>
        </div>
        {started && (() => {
          const SM: Record<string, { ar: string; en: string; c: string }> = {
            in_service: { ar: "قيد التشغيل", en: "In service", c: "#f5993d" },
            quality_check: { ar: "فحص الجودة", en: "Quality check", c: "#6ba8f5" },
            ready: { ar: "جاهزة للتسليم", en: "Ready", c: "#3ecd8e" },
          };
          const s = SM[workStage || "in_service"] || SM.in_service;
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: s.c, border: `1px solid ${s.c}4d`, background: `${s.c}14`, borderRadius: 999, padding: "6px 12px", flexShrink: 0 }}>
              <span style={{ height: 6, width: 6, borderRadius: 999, background: s.c }} />{isAr ? s.ar : s.en}
            </span>
          );
        })()}
      </div>

      {/* شريط معلومات مضغوط (بدل البانر الكبير) */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", marginBottom: 18 }}>
        <span style={{ height: 44, width: 62, borderRadius: 10, flexShrink: 0, backgroundImage: `url('${brandImg(booking.brandId, booking.plate || booking.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.7)" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="abh-display" style={{ fontSize: 18, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1 }}>{booking.vehicle}</div>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 3 }}>{booking.customer}{booking.plate && <span dir="ltr"> · {booking.plate}</span>}</div>
        </div>
        {!loading && tasks.length > 0 && (
          <div style={{ textAlign: isAr ? "left" : "right", flexShrink: 0 }}>
            {started ? (
              <>
                <div className="abh-num" dir="ltr" style={{ fontSize: 18, color: "#3ecd8e" }}>{tasks.filter((t) => t.status === "done").length}/{tasks.length}</div>
                <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("مكتملة", "completed")}</div>
              </>
            ) : (
              <>
                <div className="abh-num" dir="ltr" style={{ fontSize: 18, color: "var(--abh-ivory)" }}>{tasks.filter((t) => t.technicians.length > 0).length}/{tasks.length}</div>
                <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("مخصّصة", "assigned")}</div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : tasks.length === 0 ? (
        <div style={{ ...card, borderStyle: "dashed", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا مهام.", "No tasks.")}</div>
      ) : (
        <>
          {/* شبكة الكروت */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 16, marginBottom: 18 }}>
            {tasks.map((task) => {
              const st = STATUS[task.status] || STATUS.pending;
              const locked = started;
              const assignedCount = task.technicians.length;
              return (
                <div key={task.id} style={{ ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {/* رأس الكرت */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", background: assignedCount > 0 ? "rgba(159,212,176,.04)" : "transparent" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ color: "var(--abh-platinum)", flexShrink: 0 }}>{Ic.sparkle({ s: 15 })}</span>
                      <span style={{ fontSize: 14.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</span>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {/* أيقونة التعليقات — ببادج غير المقروء */}
                      <button onClick={() => setChatTask(task)} title={T("محادثة الفني", "Chat")}
                        style={{ position: "relative", display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 8, cursor: "pointer", border: `1px solid ${task.unread > 0 ? "rgba(224,70,75,.5)" : "rgba(255,255,255,.12)"}`, background: task.unread > 0 ? "rgba(224,70,75,.08)" : "rgba(255,255,255,.02)", color: task.unread > 0 ? "#e0464b" : "var(--abh-platinum)" }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {task.unread > 0 && (
                          <span style={{ position: "absolute", top: -5, insetInlineEnd: -5, minWidth: 16, height: 16, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 4px", fontSize: 9, fontWeight: 700, color: "#fff", background: "#e0464b", border: "2px solid #101113" }}>{task.unread}</span>
                        )}
                      </button>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "4px 9px", fontSize: 10, color: st.color, border: `1px solid ${st.color}55`, background: `${st.color}12` }}>
                        <span style={{ height: 5, width: 5, borderRadius: 999, background: st.color }} />{isAr ? st.ar : st.en}
                      </span>
                    </span>
                  </div>

                  {/* القسم 1: الفنيون */}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 10 }}>{T("الفنيون", "Technicians")}</div>
                    {techs.length === 0 ? (
                      <div style={{ fontSize: 11.5, color: "var(--abh-steel)" }}>{T("لا فنيون — أضفهم من الحسابات.", "No technicians.")}</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {techs.map((tech) => {
                          const on = task.technicians.some((t: any) => t.id === tech.id);
                          return (
                            <button key={tech.id} onClick={() => !locked && toggleTech(task, tech)} disabled={locked}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 11px", fontSize: 12, cursor: locked ? "default" : "pointer", border: `1px solid ${on ? "rgba(159,212,176,.45)" : "rgba(255,255,255,.12)"}`, background: on ? "rgba(159,212,176,.1)" : "rgba(255,255,255,.02)", color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", transition: "all .2s", opacity: locked && !on ? 0.5 : 1 }}>
                              {on ? <span style={{ color: "#9fd4b0", display: "inline-flex" }}>{Ic.check({ s: 12 })}</span> : Ic.plus({ s: 12 })}
                              {tech.name}
                              <span style={{ fontSize: 9, borderRadius: 999, padding: "0 5px", background: tech.activeTasks > 0 ? "rgba(245,153,61,.16)" : "rgba(255,255,255,.06)", color: tech.activeTasks > 0 ? "#f5993d" : "var(--abh-steel)" }}>{tech.activeTasks}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* القسم 2: الوقت المقدّر */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--abh-steel)" }}>{Ic.clock({ s: 13 })}{T("الوقت المقدّر", "Est. time")}</span>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <input type="number" min={0} disabled={locked} defaultValue={task.estimatedMinutes ?? ""} onBlur={(e) => !locked && setTime(task, e.target.value)}
                        placeholder="0" dir="ltr" style={{ width: 72, borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "7px 10px", fontSize: 13, color: "var(--abh-ivory)", outline: "none", textAlign: "center", opacity: locked ? 0.6 : 1 }} />
                      <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{T("دقيقة", "min")}</span>
                    </div>
                  </div>
                  {/* رول القص (فينيل/رابر) */}
                  <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: task.usesRoll ? 9 : 0 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--abh-steel)" }}>{Ic.sparkle({ s: 13 })}{T("قص من رول؟", "Cut from a roll?")}</span>
                      <button onClick={() => setRoll(task, !task.usesRoll, task.usesRoll ? "" : task.rollNo)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 12px", fontSize: 10.5, cursor: "pointer", border: `1px solid ${task.usesRoll ? "rgba(232,207,154,.4)" : "rgba(255,255,255,.15)"}`, background: task.usesRoll ? "rgba(232,207,154,.1)" : "transparent", color: task.usesRoll ? "#e8cf9a" : "var(--abh-platinum)" }}>
                        {task.usesRoll ? T("نعم", "Yes") : T("لا", "No")}
                      </button>
                    </div>
                    {task.usesRoll && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input defaultValue={task.rollNo || ""} dir="ltr" placeholder={T("رقم الرول", "Roll number")}
                          onBlur={(e) => setRoll(task, true, e.target.value.trim())}
                          style={{ flex: 1, borderRadius: 9, border: "1px solid rgba(232,207,154,.35)", background: "rgba(232,207,154,.05)", padding: "8px 12px", fontSize: 13, color: "var(--abh-ivory)", outline: "none", textAlign: "center" }} />
                      </div>
                    )}
                  </div>

                  {/* وضع المتابعة: التقدّم + حالة الفنيين */}
                  {started && (() => {
                    const el = elapsedMin(task);
                    const est = task.estimatedMinutes;
                    const pct = est && el != null ? Math.min(100, Math.round((el / est) * 100)) : 0;
                    const over = est != null && el != null && el > est;
                    const done = task.status === "done";
                    return (
                      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.01)" }}>
                        {/* شريط التقدّم */}
                        {el != null && (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                              <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{done ? T("الوقت الفعلي", "Actual") : T("الوقت المنقضي", "Elapsed")}</span>
                              <span dir="ltr" style={{ display: "inline-flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap", fontFamily: "'Hanken Grotesk',system-ui,sans-serif", fontVariantNumeric: "tabular-nums" }}>
                                <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, color: done ? "#3ecd8e" : over ? "#e0464b" : "var(--abh-ivory)" }}>{fmtDur(el)}</span>
                                {est != null && est > 0 && (
                                  <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>/ {fmtDur(est)}</span>
                                )}
                                <span style={{ fontSize: 9.5, color: "var(--abh-steel)", marginInlineStart: 2 }}>{T("س:د", "h:m")}</span>
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                              <span style={{ display: "block", height: "100%", width: `${est ? pct : 100}%`, borderRadius: 999, background: done && !over ? "linear-gradient(90deg,#7fc49a,#3ecd8e)" : over ? "linear-gradient(90deg,#c0393e,#e0464b)" : "linear-gradient(90deg,#8a8d90,#fff)", transition: "width .6s" }} />
                            </div>
                            {/* تنبيه التأخير — يفضل ظاهر حتى بعد الانتهاء */}
                            {over && est != null && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, borderRadius: 8, padding: "4px 9px", fontSize: 10.5, color: "#e0464b", background: "rgba(224,70,75,.08)", border: "1px solid rgba(224,70,75,.25)" }}>
                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
                                <span>{done ? T("تأخير", "Late by") : T("تعدّى بـ", "Over by")}</span>
                                <span dir="ltr" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtDur(el - est)}</span>
                              </div>
                            )}
                          </>
                        )}
                        {el == null && <div style={{ fontSize: 11, color: "var(--abh-steel)" }}>{T("لم يبدأ أي فني بعد", "No technician started yet")}</div>}

                        {/* حالة كل فني */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
                          {task.technicians.map((tech: any) => {
                            const s = tech.confirmedAt ? "done" : tech.startedAt ? "working" : "waiting";
                            const c = s === "done" ? "#3ecd8e" : s === "working" ? "#f5993d" : "#8a9099";
                            return (
                              <span key={tech.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 10px", fontSize: 11, color: c, border: `1px solid ${c}44`, background: `${c}10` }}>
                                <span style={{ height: 5, width: 5, borderRadius: 999, background: c }} />
                                {tech.name}
                                <span style={{ fontSize: 9, opacity: .8 }}>{s === "done" ? T("خلّص", "done") : s === "working" ? T("شغّال", "working") : T("مستني", "idle")}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* وضع فحص الجودة: اعتماد أو رفض */}
                  {(inQC || isReady) && task.status === "done" && (
                    <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)", background: task.qcStatus === "approved" ? "rgba(62,205,142,.05)" : "rgba(107,168,245,.05)" }}>
                      {task.qcStatus === "approved" ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#3ecd8e" }}>{Ic.check({ s: 14 })}{T("معتمدة", "Approved")}</span>
                          {task.qcNote && <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{task.qcNote}</span>}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#6ba8f5", marginBottom: 10 }}>{T("فحص الجودة", "Quality check")}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => qcAction(task, "approve")}
                              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", color: "#0b0c0e", background: "linear-gradient(135deg,#9fd4b0,#7fc49a)" }}>
                              {Ic.check({ s: 13 })}{T("اعتماد", "Approve")}
                            </button>
                            <button onClick={() => setQcModal({ task })}
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, padding: "9px 14px", fontSize: 12, cursor: "pointer", border: "1px solid rgba(231,180,180,.4)", background: "rgba(231,180,180,.08)", color: "#e7b4b4" }}>
                              {Ic.x({ s: 13 })}{T("رفض", "Reject")}
                            </button>
                          </div>
                        </>
                      )}
                      {task.reworkCount > 0 && (
                        <div style={{ marginTop: 8, fontSize: 10, color: "#e8cf9a" }}>
                          {T(`أُعيد العمل ${task.reworkCount} مرة`, `Reworked ${task.reworkCount}×`)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* القسم 3: الخامات */}
                  <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,.05)", marginTop: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: task.materials.length ? 9 : 0 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--abh-steel)" }}>{Ic.grid({ s: 13 })}{T("الخامات", "Materials")}</span>
                      {!locked && (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => setReqModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "5px 11px", fontSize: 10.5, cursor: "pointer", border: "1px solid rgba(232,207,154,.35)", background: "rgba(232,207,154,.08)", color: "#e8cf9a" }}>{Ic.trending({ s: 11 })}{T("طلب", "Request")}</button>
                          <button onClick={() => setMatModal({ task })} style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "5px 11px", fontSize: 10.5, cursor: "pointer", border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.06)", color: "var(--abh-platinum)" }}>{Ic.plus({ s: 11 })}{T("صرف", "Issue")}</button>
                        </span>
                      )}
                    </div>
                    {task.materials.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--abh-steel)" }}>{T("لا خامات مصروفة", "None issued")}</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {task.materials.map((m: any) => (
                          <span key={m.materialId} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "5px 9px", fontSize: 11, color: "var(--abh-ivory)", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                            {nm(m.name)}<span className="abh-num" dir="ltr" style={{ color: "var(--abh-platinum)" }}>×{m.quantity}</span>
                            {!locked && <button onClick={() => returnMaterial(task, m.materialId)} title={T("إرجاع", "Return")} style={{ display: "grid", placeItems: "center", height: 15, width: 15, borderRadius: 999, border: "none", background: "rgba(231,180,180,.15)", color: "#e7b4b4", cursor: "pointer" }}>{Ic.x({ s: 9 })}</button>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* التايم لاين — وضع المتابعة */}
          {started && timeline.length > 0 && (
            <div style={{ ...card, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 16 }}>{T("سجلّ العمليات", "Activity log")}</div>
              <div style={{ position: "relative", paddingInlineStart: 20 }}>
                <span style={{ position: "absolute", insetInlineStart: 4, top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,.1)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {timeline.map((ev, i) => {
                    const meta = EVENT_LABEL[ev.type] || { ar: ev.type, en: ev.type, color: "#8a9099" };
                    return (
                      <div key={i} style={{ position: "relative" }}>
                        <span style={{ position: "absolute", insetInlineStart: -20, top: 5, height: 9, width: 9, borderRadius: 999, background: meta.color, border: "2px solid #101113" }} />
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, color: "var(--abh-ivory)" }}>
                            {ev.role === "technician" && ev.task
                              ? <><span style={{ color: meta.color }}>{ev.actor}</span> {isAr ? meta.ar : meta.en} <span style={{ color: "var(--abh-platinum)" }}>«{ev.task}»</span></>
                              : <>{isAr ? meta.ar : meta.en}{ev.actor !== "—" && <span style={{ color: "var(--abh-steel)", fontSize: 11.5 }}> · {ev.actor}</span>}</>}
                          </span>
                          <span style={{ fontSize: 10.5, color: "var(--abh-steel)", whiteSpace: "nowrap" }}>{fmtDT(ev.at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* شريط الجاهزية للتسليم */}
          {isReady && (
            <div style={{ ...card, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", border: "1px solid rgba(62,205,142,.35)", background: "linear-gradient(160deg,rgba(62,205,142,.08),rgba(255,255,255,.01))", marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: "#3ecd8e", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {Ic.check({ s: 16 })}{T("كل المهام اعتُمدت — السيارة جاهزة للتسليم", "All approved — ready for delivery")}
              </span>
              <Pill icon={Ic.check} onClick={() => router.push(`/admin/bookings/${booking.id}/delivery`)}>{T("بدء التسليم", "Start delivery")}</Pill>
            </div>
          )}

          {/* شريط بدء التشغيل */}
          {!started && (
            <div style={{ ...card, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", position: "sticky", bottom: 16, background: "rgba(16,17,19,.96)", backdropFilter: "blur(12px)" }}>
              <span style={{ fontSize: 12.5, color: allAssigned ? "var(--abh-ok)" : "var(--abh-steel)", display: "inline-flex", alignItems: "center", gap: 7 }}>
                {allAssigned ? <>{Ic.check({ s: 14 })}{T("كل المهام مخصّصة — جاهز للتشغيل", "All assigned — ready")}</> : T("• خصّص فني لكل مهمة قبل التشغيل", "• Assign a technician to each task")}
              </span>
              <Pill icon={Ic.check} onClick={startWork}>{busy ? T("جارٍ…", "…") : T("بدء التشغيل", "Start work")}</Pill>
            </div>
          )}
        </>
      )}

      {matModal && (
        <IssueMaterialModal task={matModal.task} available={available} T={T} isAr={isAr} nm={nm}
          onClose={() => setMatModal(null)} onIssue={issueMaterial} onRequest={() => { setReqModal(true); setMatModal(null); }} />
      )}
      {reqModal && (
        <RequestMaterialModal items={allItems} T={T} isAr={isAr} nm={nm}
          onClose={() => setReqModal(false)} onSend={sendRequest} />
      )}
      {chatTask && (
        <TaskChatModal bookingId={booking.id} task={chatTask} T={T} isAr={isAr}
          onClose={() => { setChatTask(null); load(true); }} toast={toast} />
      )}
      {qcModal && (
        <QcRejectModal task={qcModal.task} T={T} isAr={isAr}
          onClose={() => setQcModal(null)}
          onReject={(note: string) => qcAction(qcModal.task, "reject", note)} />
      )}
    </div>
  );
}

/* مودال صرف خامة من الوسيط */
function IssueMaterialModal({ task, available, T, isAr, nm, onClose, onIssue, onRequest }: any) {
  const [itemId, setItemId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [q, setQ] = useState("");
  const sel = available.find((a: any) => a.id === itemId);
  const shown = available.filter((a: any) => !q || nm(a.name).toLowerCase().includes(q.toLowerCase()));
  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  return (
    <Modal title={T("صرف خامة للمهمة", "Issue material")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-platinum)" }}>{T("المهمة", "Task")}: <span style={{ color: "var(--abh-ivory)" }}>{task.name}</span></div>
        {available.length === 0 ? (
          <div style={{ borderRadius: 12, border: "1px solid rgba(232,207,154,.3)", background: "rgba(232,207,154,.06)", padding: 16, fontSize: 12.5, color: "#e8cf9a", lineHeight: 1.7 }}>
            {T("لا خامات متاحة في المخزن الوسيط.", "No materials in intermediate warehouse.")}
          </div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث…", "Search…")} style={{ ...inp, paddingInlineStart: 36 }} />
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)", padding: 8 }}>
              {shown.map((a: any) => {
                const on = itemId === a.id;
                return (
                  <button key={a.id} onClick={() => { setItemId(a.id); setQty(1); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", borderRadius: 10, padding: "10px 12px", border: "none", background: on ? "rgba(203,205,205,.1)" : "transparent", cursor: "pointer", textAlign: isAr ? "right" : "left", marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, color: "var(--abh-ivory)" }}>{nm(a.name)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span className="abh-num" dir="ltr" style={{ fontSize: 11.5, color: "var(--abh-steel)" }}>{T("متاح", "have")} {a.qty} {a.unit}</span>
                      {on && <Ic.check s={14} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {sel && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "12px 14px" }}>
                <span style={{ flex: 1, fontSize: 13.5, color: "var(--abh-ivory)" }}>{nm(sel.name)}</span>
                <input type="number" min={1} max={sel.qty} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(sel.qty, +e.target.value || 1)))} dir="ltr"
                  style={{ width: 80, textAlign: "center", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "9px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
                <span style={{ fontSize: 11.5, color: "var(--abh-steel)" }}>{sel.unit}</span>
              </div>
            )}
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => { console.log("REQUEST CLICKED"); onRequest(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--abh-platinum)", background: "transparent", border: "none", cursor: "pointer" }}>{Ic.trending({ s: 13 })}{T("خامة ناقصة؟ اطلبها", "Missing? Request it")}</button>
          <div style={{ display: "flex", gap: 10 }}>
            <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
            <Pill icon={Ic.check} onClick={() => sel && onIssue(task, sel.id, qty)}>{T("صرف", "Issue")}</Pill>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* مودال طلب خامات (يرسل طلب للمخزن — لا يوافق) */
function RequestMaterialModal({ items, T, isAr, nm, onClose, onSend }: any) {
  const [sel, setSel] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = items.filter((it: any) => !q || nm(it.name).toLowerCase().includes(q.toLowerCase()));
  const chosen = Object.entries(sel).filter(([, v]) => Number(v) > 0);
  const setQty = (id: number, v: number) => setSel((s) => ({ ...s, [id]: Math.max(0, v) }));
  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };
  const qBtn: React.CSSProperties = { display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)", cursor: "pointer", fontSize: 15, lineHeight: 1 };

  async function submit() {
    if (chosen.length === 0 || busy) return;
    setBusy(true);
    await onSend(chosen.map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity: Number(quantity) })), note);
    setBusy(false);
  }

  return (
    <Modal title={T("طلب خامات من المخزن", "Request materials")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.2)", background: "rgba(203,205,205,.05)", padding: "11px 14px", fontSize: 11.5, color: "var(--abh-platinum)", lineHeight: 1.6 }}>
          {T("سيُرسَل طلبك للمخزن ويُنقل للوسيط بعد موافقة مسؤول المخزن.", "Your request goes to the warehouse and moves to intermediate after approval.")}
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث عن خامة…", "Search…")} style={{ ...inp, paddingInlineStart: 36 }} />
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)", padding: 12 }}>
          <div className="abh-col" style={{ gap: 8 }}>
            {shown.map((it: any) => {
              const qty = sel[it.id] || 0; const on = qty > 0;
              return (
                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 11, border: `1px solid ${on ? "rgba(203,205,205,.35)" : "rgba(255,255,255,.06)"}`, background: on ? "rgba(203,205,205,.05)" : "rgba(255,255,255,.02)", padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(it.name)}</div>
                    <div style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 2 }}>{T("بالرئيسي", "Main")}: <span className="abh-num" dir="ltr">{it.mainQty}</span> · {T("الوسيط", "Interm.")}: <span className="abh-num" dir="ltr">{it.interQty}</span></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setQty(it.id, qty - 1)} disabled={qty <= 0} style={qBtn}>−</button>
                    <input value={qty || ""} onChange={(e) => setQty(it.id, Math.max(0, +e.target.value || 0))} placeholder="0" dir="ltr"
                      style={{ width: 50, textAlign: "center", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "6px 4px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
                    <button onClick={() => setQty(it.id, qty + 1)} style={qBtn}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Field label={T("ملاحظة (اختياري)", "Note (optional)")}>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("سبب الطلب…", "Reason…")} style={inp} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--abh-platinum)" }}>{T(`${chosen.length} خامة`, `${chosen.length} items`)}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
            <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ الإرسال…", "Sending…") : T("إرسال الطلب", "Send request")}</Pill>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const IcTranslate = (s = 12) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h9M9 6v2M13 8a12 12 0 0 1-5 7M8 15a11 11 0 0 0 5-6M2 20l6-6M16 14l6 6M20 12v8M17 16h6" /></svg>);

/* مودال محادثة المهمة (المشرف يرد على الفني) — مع ترجمة تلقائية */
function TaskChatModal({ bookingId, task, T, isAr, onClose, toast }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tr, setTr] = useState<Record<number, { text?: string; loading?: boolean; showOriginal?: boolean }>>({});
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const loc = isAr ? "ar-EG" : "en-US";
  const myLang: "ar" | "en" = isAr ? "ar" : "en";
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  const detectLocal = (s: string): "ar" | "en" => (arabicPattern.test(s) ? "ar" : "en");
  const fmtT = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch(`/api/admin/bookings/${bookingId}/tasks/${task.id}/comments`).then((r) => r.json()); if (j?.ok) setComments(j.comments); }
    finally { setLoading(false); }
  }, [bookingId, task.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [comments, tr]);

  async function translateOne(c: any) {
    if (tr[c.id]?.text || tr[c.id]?.loading) return;
    setTr((s) => ({ ...s, [c.id]: { ...s[c.id], loading: true } }));
    try {
      const j = await fetch("/api/translate/comment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: c.id, target: myLang }),
      }).then((r) => r.json());
      if (j?.ok && !j.sameLang) setTr((s) => ({ ...s, [c.id]: { text: j.translated, loading: false } }));
      else setTr((s) => ({ ...s, [c.id]: { loading: false } }));
    } catch { setTr((s) => ({ ...s, [c.id]: { loading: false } })); }
  }

  useEffect(() => {
    comments.forEach((c) => {
      if (!c.isMe && detectLocal(c.body) !== myLang && !tr[c.id]) translateOne(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const j = await fetch(`/api/admin/bookings/${bookingId}/tasks/${task.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
      }).then((r) => r.json());
      if (!j.ok) throw new Error();
      setText(""); await load();
    } catch { toast(T("فشل الإرسال", "Send failed"), "bad"); }
    finally { setSending(false); }
  }

  return (
    <Modal title={T("محادثة المهمة", "Task chat")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 14 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-platinum)" }}>{task.name}</div>

        <div ref={scrollRef} style={{ maxHeight: 340, minHeight: 180, overflowY: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.18)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ margin: "auto", color: "var(--abh-steel)", fontSize: 13 }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : comments.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--abh-steel)", fontSize: 12.5, lineHeight: 1.7 }}>{T("لا رسائل بعد.", "No messages yet.")}</div>
          ) : (
            comments.map((c) => {
              const st = tr[c.id];
              const showTranslated = !!st?.text && !st?.showOriginal;
              const shown = showTranslated ? st!.text : c.body;
              return (
                <div key={c.id} style={{ alignSelf: c.isMe ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                  <div style={{ borderRadius: 13, padding: "9px 13px", fontSize: 13, lineHeight: 1.5, color: c.isMe ? "#0b0c0e" : "var(--abh-ivory)", background: c.isMe ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.05)", border: c.isMe ? "none" : "1px solid rgba(255,255,255,.08)" }}>
                    {shown}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: c.isMe ? (isAr ? "flex-start" : "flex-end") : (isAr ? "flex-end" : "flex-start") }}>
                    <span style={{ fontSize: 9.5, color: "var(--abh-steel)" }}>
                      {c.fromTechnician ? `${c.authorName} · ${T("فني", "Tech")}` : (c.isMe ? T("أنا", "Me") : c.authorName)} · {fmtT(c.createdAt)}
                    </span>
                    {st?.loading && <span style={{ fontSize: 9.5, color: "#6ba8f5", display: "inline-flex", alignItems: "center", gap: 3 }}>{IcTranslate(10)}{T("جارٍ الترجمة…", "Translating…")}</span>}
                    {!!st?.text && (
                      <button onClick={() => setTr((s) => ({ ...s, [c.id]: { ...s[c.id], showOriginal: !s[c.id]?.showOriginal } }))}
                        style={{ fontSize: 9.5, color: "#6ba8f5", background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, padding: 0 }}>
                        {IcTranslate(10)}{showTranslated ? T("عرض الأصل", "See original") : T("عرض الترجمة", "See translation")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={T("اكتب ردّك للفني…", "Reply to technician…")} dir={isAr ? "rtl" : "ltr"}
            style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "12px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" }} />
          <button onClick={send} disabled={!text.trim() || sending}
            style={{ display: "grid", placeItems: "center", height: 44, width: 44, borderRadius: 12, border: "none", background: text.trim() ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.06)", color: text.trim() ? "#0b0c0e" : "var(--abh-steel)", cursor: text.trim() ? "pointer" : "default", flexShrink: 0, transform: isAr ? "scaleX(-1)" : "none" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* مودال رفض المهمة في فحص الجودة */
function QcRejectModal({ task, T, isAr, onClose, onReject }: any) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal title={T("رفض المهمة", "Reject task")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ fontSize: 13.5, color: "var(--abh-ivory)" }}>{task.name}</div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(231,180,180,.3)", background: "rgba(231,180,180,.06)", padding: "12px 14px", fontSize: 12, color: "#e7b4b4", lineHeight: 1.7 }}>
          {T("المهمة هترجع للفني تاني مع سبب الرفض، والسيارة هترجع «قيد التشغيل».", "The task returns to the technician with your reason, and the vehicle goes back to In service.")}
        </div>
        <Field label={T("سبب الرفض *", "Reason *")}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
            placeholder={T("مثال: في خدوش لسه في الرفرف الشمال / اللمعة مش متساوية…", "e.g. Scratches remain on left fender…")}
            style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "12px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", resize: "vertical", textAlign: isAr ? "right" : "left", fontFamily: "inherit" }} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <button disabled={!note.trim() || busy} onClick={async () => { setBusy(true); await onReject(note.trim()); setBusy(false); }}
            style={{ opacity: !note.trim() || busy ? .4 : 1, pointerEvents: !note.trim() || busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#f0c9c9", background: "rgba(42,20,20,.6)", border: "1px solid rgba(239,90,77,.5)", cursor: "pointer" }}>
            {Ic.x({ s: 15 })}{busy ? T("جارٍ…", "…") : T("رفض وإرجاع للفني", "Reject & return")}
          </button>
        </div>
      </div>
    </Modal>
  );
}