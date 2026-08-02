"use client";
/**
 * components/sections/my-work/my-work.tsx — شاشة الفني (CLIENT).
 * كروت مهام جريد صغيرة احترافية. بدء/إنهاء + محادثة مع المشرف (أسئلة/طلبات).
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { brandImg } from "@/lib/brand-image";

const Ic = {
  play: (s = 16) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>),
  check: (s = 16) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>),
  clock: (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>),
  box: (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>),
  chat: (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  logout: (s = 15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>),
  car: (s = 14) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M5 17h10" /></svg>),
  send: (s = 15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>),
  x: (s = 15) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>),
  translate: (s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h9M9 6v2M13 8a12 12 0 0 1-5 7M8 15a11 11 0 0 0 5-6M2 20l6-6M16 14l6 6M20 12v8M17 16h6" /></svg>),
};

type Task = {
  id: number; name: string; status: string; estimatedMinutes: number | null;
  startedAt: string | null; confirmedAt: string | null;
  bookingId: string; workOrderNo: number | null; reference: string;
  vehicle: string; plate: string; brandId: string; customer: string;
  materials: { name: any; unit: string; quantity: number }[];
  unread: number;
  qcRejected?: boolean;
  qcNote?: string | null;
};

export default function MyWorkClient({ technicianName, locale }: { technicianName: string; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const nm = (n: any) => (!n ? "" : typeof n === "string" ? n : (isAr ? (n.ar ?? n.en) : (n.en ?? n.ar)) ?? "");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);

  const flash = (msg: string, bad = false) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 2600); };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const j = await fetch(`/api/technician/tasks?locale=${isAr ? "ar" : "en"}`).then((r) => r.json());
      if (j?.ok) setTasks(j.tasks);
    } finally { if (!silent) setLoading(false); }
  }, [isAr]);
  useEffect(() => { load(); }, [load]);

  async function act(task: Task, action: "start" | "finish") {
    setBusy(task.id);
    try {
      const res = await fetch("/api/technician/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      flash(action === "start" ? T("بدأت المهمة", "Started") : T("تم إنهاء المهمة", "Finished"));
      await load(true);
    } catch { flash(T("حصل خطأ، حاول تاني", "Something went wrong"), true); }
    finally { setBusy(null); }
  }

  const groups = tasks.reduce((acc: Record<string, { info: Task; items: Task[] }>, t) => {
    if (!acc[t.bookingId]) acc[t.bookingId] = { info: t, items: [] };
    acc[t.bookingId].items.push(t);
    return acc;
  }, {});
  const groupList = Object.values(groups);
  const activeCount = tasks.filter((t) => !t.confirmedAt).length;

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "radial-gradient(ellipse 90% 40% at 50% 0%, rgba(203,205,205,.06), transparent 70%), linear-gradient(180deg,#000,#050608 25%,#07080b 60%,#000)", color: "#fff", fontFamily: "'IBM Plex Sans Arabic','Hanken Grotesk',system-ui,sans-serif" }}>
      <style>{`
        .mw-display{font-family:'Cormorant Garamond',serif}
        .mw-num{font-variant-numeric:tabular-nums;font-family:'Cormorant Garamond',serif}
        @keyframes mwUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .mw-card{animation:mwUp .5s cubic-bezier(.16,1,.3,1) both}
        .mw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
      `}</style>

      {/* رأس */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.72)", backdropFilter: "blur(14px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "15px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "grid", placeItems: "center", height: 40, width: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.02))" }}><span className="mw-display" style={{ fontSize: 18 }}>A</span></span>
            <div style={{ lineHeight: 1.15 }}>
              <div className="mw-display" style={{ fontSize: 17, letterSpacing: ".1em", textTransform: "uppercase" }}>{T("شغلي", "My work")}</div>
              <div style={{ fontSize: 11, color: "#8a9099" }}>{technicianName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {activeCount > 0 && <span style={{ fontSize: 12, color: "#f5993d", border: "1px solid rgba(245,153,61,.3)", background: "rgba(245,153,61,.08)", borderRadius: 999, padding: "6px 12px" }}>{activeCount} {T("نشطة", "active")}</span>}
            <a href="/api/auth/logout" title={T("خروج", "Logout")} style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", color: "#cbcdcd" }}>{Ic.logout(15)}</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 22px 70px" }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: "center", color: "#8a9099" }}>{T("جارٍ التحميل…", "Loading…")}</div>
        ) : groupList.length === 0 ? (
          <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 70, textAlign: "center", color: "#8a9099", marginTop: 30 }}>
            <div style={{ marginBottom: 12, opacity: .5, display: "flex", justifyContent: "center" }}>{Ic.check(40)}</div>
            {T("مفيش مهام حاليًا — استنى المشرف يكلّفك.", "No tasks yet.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            {groupList.map((g, gi) => (
              <div key={g.info.bookingId} className="mw-card" style={{ animationDelay: `${gi * 0.05}s` }}>
                {/* رأس السيارة */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <span style={{ height: 46, width: 66, borderRadius: 10, flexShrink: 0, backgroundImage: `url('${brandImg(g.info.brandId, g.info.plate || g.info.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.7)" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mw-display" style={{ fontSize: 19, textTransform: "uppercase", lineHeight: 1 }}>{g.info.vehicle}</div>
                    <div style={{ fontSize: 11.5, color: "#8a9099", marginTop: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{Ic.car(12)}{g.info.customer}</span>
                      {g.info.plate && <span dir="ltr">· {g.info.plate}</span>}
                      {g.info.workOrderNo && <span className="mw-num" dir="ltr">· WO-{g.info.workOrderNo}</span>}
                    </div>
                  </div>
                </div>

                {/* كروت المهام — جريد */}
                <div className="mw-grid">
                  {g.items.map((task) => {
                    const done = !!task.confirmedAt;
                    const inProgress = !!task.startedAt && !done;
                    return (
                      <div key={task.id} style={{ borderRadius: 16, border: `1px solid ${task.qcRejected ? "rgba(224,70,75,.45)" : done ? "rgba(62,205,142,.3)" : inProgress ? "rgba(245,153,61,.3)" : "rgba(255,255,255,.08)"}`, background: task.qcRejected ? "rgba(224,70,75,.03)" : done ? "rgba(62,205,142,.04)" : "rgba(255,255,255,.02)", padding: 15, display: "flex", flexDirection: "column" }}>
                        {/* الرأس */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 14.5, color: "#fff", minWidth: 0 }}>{task.name}</div>
                          {done ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#3ecd8e", flexShrink: 0 }}>{Ic.check(12)}{T("تم", "Done")}</span>
                            : inProgress ? <span style={{ fontSize: 10, color: "#f5993d", flexShrink: 0 }}>{T("شغّال", "Active")}</span> : null}
                        </div>

                        {/* تنبيه رفض الجودة */}
                        {task.qcRejected && (
                          <div style={{ borderRadius: 10, border: "1px solid rgba(224,70,75,.35)", background: "rgba(224,70,75,.08)", padding: "9px 11px", marginBottom: 10 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#e0464b", marginBottom: 4 }}>
                              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
                              {T("المشرف رجّع المهمة", "Returned by supervisor")}
                            </div>
                            <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.5 }}>{task.qcNote}</div>
                          </div>
                        )}

                        {/* معلومات */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: "#8a9099", marginBottom: task.materials.length ? 10 : 12 }}>
                          {task.estimatedMinutes != null && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{Ic.clock(11)}{task.estimatedMinutes} {T("دقيقة", "min")}</span>}
                          {task.materials.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{Ic.box(11)}{task.materials.length} {T("خامة", "mat")}</span>}
                        </div>

                        {/* الخامات */}
                        {task.materials.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                            {task.materials.map((m, i) => (
                              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 7, padding: "3px 8px", fontSize: 10.5, color: "#cbcdcd", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                                {nm(m.name)}<span className="mw-num" dir="ltr">×{m.quantity}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* الأزرار */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                          {!done ? (
                            !task.startedAt ? (
                              <button onClick={() => act(task, "start")} disabled={busy === task.id}
                                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 11, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", color: "#0b0c0e", background: "linear-gradient(135deg,#fff,#cbcdcd)", opacity: busy === task.id ? .6 : 1 }}>
                                {Ic.play(14)}{busy === task.id ? "…" : T("ابدأ", "Start")}
                              </button>
                            ) : (
                              <button onClick={() => act(task, "finish")} disabled={busy === task.id}
                                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 11, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", color: "#0b0c0e", background: "linear-gradient(135deg,#9fd4b0,#7fc49a)", opacity: busy === task.id ? .6 : 1 }}>
                                {Ic.check(14)}{busy === task.id ? "…" : T("خلّصت", "Finish")}
                              </button>
                            )
                          ) : <span style={{ flex: 1 }} />}

                          {/* أيقونة التعليقات — ببادج غير المقروء */}
                          <button onClick={() => setChatTask(task)} title={T("محادثة المشرف", "Chat")}
                            style={{ position: "relative", display: "grid", placeItems: "center", height: 42, width: 42, borderRadius: 11, cursor: "pointer", border: `1px solid ${task.unread > 0 ? "rgba(224,70,75,.5)" : "rgba(255,255,255,.12)"}`, background: task.unread > 0 ? "rgba(224,70,75,.08)" : "rgba(255,255,255,.02)", color: task.unread > 0 ? "#e0464b" : "#cbcdcd", flexShrink: 0 }}>
                            {Ic.chat(17)}
                            {task.unread > 0 && (
                              <span style={{ position: "absolute", top: -5, insetInlineEnd: -5, minWidth: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 5px", fontSize: 10, fontWeight: 700, color: "#fff", background: "#e0464b", border: "2px solid #07080b" }}>
                                {task.unread}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال المحادثة */}
      {chatTask && <ChatModal task={chatTask} isAr={isAr} T={T} onClose={() => { setChatTask(null); load(true); }} flash={flash} />}

      {/* توست */}
      {toast && (
        <div style={{ position: "fixed", insetInline: 0, bottom: 24, display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none" }}>
          <div style={{ borderRadius: 999, padding: "12px 22px", fontSize: 13.5, border: `1px solid ${toast.bad ? "rgba(231,180,180,.4)" : "rgba(159,212,176,.4)"}`, background: toast.bad ? "rgba(42,20,20,.95)" : "rgba(16,24,19,.95)", color: toast.bad ? "#e7b4b4" : "#9fd4b0", backdropFilter: "blur(12px)" }}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

/* مودال المحادثة مع المشرف — مع ترجمة تلقائية */
function ChatModal({ task, isAr, T, onClose, flash }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tr, setTr] = useState<Record<number, { text?: string; loading?: boolean; showOriginal?: boolean }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const loc = isAr ? "ar-EG" : "en-US";
  const myLang: "ar" | "en" = isAr ? "ar" : "en";
  const fmtT = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  const detectLocal = (s: string): "ar" | "en" => (arabicPattern.test(s) ? "ar" : "en");

  const load = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch(`/api/technician/tasks/${task.id}/comments`).then((r) => r.json()); if (j?.ok) setComments(j.comments); }
    finally { setLoading(false); }
  }, [task.id]);
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
      const j = await fetch(`/api/technician/tasks/${task.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
      }).then((r) => r.json());
      if (!j.ok) throw new Error();
      setText(""); await load();
    } catch { flash(T("فشل الإرسال", "Send failed"), true); }
    finally { setSending(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", padding: "0" }}>
      <div onClick={(e) => e.stopPropagation()} dir={isAr ? "rtl" : "ltr"} style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", borderRadius: "22px 22px 0 0", border: "1px solid rgba(255,255,255,.1)", borderBottom: "none", background: "#0c0d0e", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, color: "#fff" }}>{task.name}</div>
            <div style={{ fontSize: 11, color: "#8a9099", marginTop: 2 }}>{T("محادثة مع المشرف", "Chat with supervisor")}</div>
          </div>
          <button onClick={onClose} style={{ display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "#cbcdcd", cursor: "pointer", flexShrink: 0 }}>{Ic.x(16)}</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
          {loading ? (
            <div style={{ margin: "auto", color: "#8a9099", fontSize: 13 }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : comments.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "#8a9099", fontSize: 13, lineHeight: 1.7 }}>{T("لسه مفيش رسائل.\nاكتب سؤالك أو طلبك للمشرف.", "No messages yet.\nAsk the supervisor anything.")}</div>
          ) : (
            comments.map((c) => {
              const st = tr[c.id];
              const showTranslated = !!st?.text && !st?.showOriginal;
              const shown = showTranslated ? st!.text : c.body;
              return (
                <div key={c.id} style={{ alignSelf: c.isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <div style={{ borderRadius: 14, padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5, color: c.isMe ? "#0b0c0e" : "#fff", background: c.isMe ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.05)", border: c.isMe ? "none" : "1px solid rgba(255,255,255,.08)" }}>
                    {shown}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, justifyContent: c.isMe ? (isAr ? "flex-start" : "flex-end") : (isAr ? "flex-end" : "flex-start"), flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9.5, color: "#8a9099" }}>
                      {c.fromSupervisor ? `${c.authorName} · ${T("مشرف", "Supervisor")}` : T("أنا", "Me")} · {fmtT(c.createdAt)}
                    </span>
                    {st?.loading && <span style={{ fontSize: 9.5, color: "#6ba8f5", display: "inline-flex", alignItems: "center", gap: 3 }}>{Ic.translate(10)}{T("جارٍ الترجمة…", "Translating…")}</span>}
                    {!!st?.text && (
                      <button onClick={() => setTr((s) => ({ ...s, [c.id]: { ...s[c.id], showOriginal: !s[c.id]?.showOriginal } }))}
                        style={{ fontSize: 9.5, color: "#6ba8f5", background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, padding: 0 }}>
                        {Ic.translate(10)}{showTranslated ? T("عرض الأصل", "See original") : T("عرض الترجمة", "See translation")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={T("اكتب رسالتك…", "Type a message…")} dir={isAr ? "rtl" : "ltr"}
            style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "12px 14px", fontSize: 14, color: "#fff", outline: "none" }} />
          <button onClick={send} disabled={!text.trim() || sending}
            style={{ display: "grid", placeItems: "center", height: 44, width: 44, borderRadius: 12, border: "none", background: text.trim() ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.06)", color: text.trim() ? "#0b0c0e" : "#8a9099", cursor: text.trim() ? "pointer" : "default", flexShrink: 0, transform: isAr ? "scaleX(-1)" : "none" }}>
            {Ic.send(16)}
          </button>
        </div>
      </div>
    </div>
  );
}