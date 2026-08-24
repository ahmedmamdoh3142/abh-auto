"use client";
/**
 * app/admin/inquiries/inquiries-client.tsx — استفسارات الموقع (CLIENT)
 * فلاتر بالحالة + بحث + مودال تفاصيل فيه معلومات منظمة، خط سير الحالة، وسجل متابعة (Timeline).
 */
import React, { useMemo, useState, useEffect } from "react";
import { Pill, Ghost, IconBtn, Textarea, Chip, Modal, Confirm, useToast, Ic, PageHeader } from "@/components/admin/ui";

type Status = "new" | "read" | "responded" | "archived";
type Inquiry = {
  id: string; name: string; intent: string; vehicle: string;
  email: string; phone: string; message: string; consent: boolean; msgLocale: string;
  status: Status; createdAt: string;
  handledBy: string | null; handledByName: string; handledAt: string | null;
  notesCount: number;
};
type Note = { id: number; authorId: string | null; authorName: string; body: string; createdAt: string };

/* الترتيب المنطقي لدورة حياة الاستفسار — يُستخدم في الفلاتر وخط السير داخل المودال */
const STATUS_ORDER: Status[] = ["new", "read", "responded", "archived"];

const STATUS_META: Record<Status, { ar: string; en: string; tone: any; color: string }> = {
  new: { ar: "جديد", en: "New", tone: "warn", color: "#e0a940" },
  read: { ar: "تمت المراجعة", en: "Reviewed", tone: "neutral", color: "#6c9bd1" },
  responded: { ar: "تم الرد", en: "Responded", tone: "ok", color: "#5cb87a" },
  archived: { ar: "مؤرشف", en: "Archived", tone: "neutral", color: "rgba(203,205,205,.5)" },
};

export default function InquiriesClient({ initial, locale }: { initial: Inquiry[]; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();

  const [list, setList] = useState<Inquiry[]>(initial);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Inquiry | null>(null);
  const [confirm, setConfirm] = useState<Inquiry | null>(null);

  const counts = useMemo(() => {
    const c: Record<Status | "all", number> = { all: list.length, new: 0, read: 0, responded: 0, archived: 0 };
    for (const m of list) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [list]);

  const filters: { id: Status | "all"; label: string }[] = [
    { id: "all", label: T("الكل", "All") },
    { id: "new", label: T("جديدة", "New") },
    { id: "read", label: T("تمت المراجعة", "Reviewed") },
    { id: "responded", label: T("تم الرد", "Responded") },
    { id: "archived", label: T("مؤرشفة", "Archived") },
  ];

  const shown = useMemo(
    () => list.filter((m) =>
      (statusFilter === "all" || m.status === statusFilter) &&
      (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q))
    ),
    [list, statusFilter, q]
  );

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(+d) ? "—" : d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const fmtDateShort = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(+d) ? "—" : d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short" });
  };

  async function setStatus(m: Inquiry, status: Status) {
    setList((ls) => ls.map((x) => (x.id === m.id ? { ...x, status } : x)));
    setOpen((o) => (o && o.id === m.id ? { ...o, status } : o));
    try {
      const res = await fetch("/api/admin/inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, status }) });
      const data = await res.json();
      if (!data.ok) throw new Error();
    } catch { toast(T("فشل تحديث الحالة", "Failed to update status"), "bad"); }
  }

  async function remove(m: Inquiry) {
    try {
      const res = await fetch(`/api/admin/inquiries?id=${m.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setList((ls) => ls.filter((x) => x.id !== m.id));
      toast(T("تم حذف الاستفسار", "Inquiry deleted"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }

  function openInquiry(m: Inquiry) {
    setOpen(m);
    if (m.status === "new") setStatus(m, "read");
  }

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("الاستفسارات", "Inquiries")} subtitle={T("رسائل التواصل الواردة من الموقع — تابع كل رسالة، سجّل ملاحظاتك، وحدّد حالتها.", "Contact messages from the website — follow up on each one, log notes, and set its status.")} seed="inquiries-hero" />

      <div className="abh-col" style={{ gap: 20 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", flexWrap: "wrap" }}>
            {filters.map((f) => {
              const on = statusFilter === f.id;
              const n = counts[f.id] ?? 0;
              const dotColor = f.id === "all" ? null : STATUS_META[f.id as Status].color;
              return (
                <button key={f.id} onClick={() => setStatusFilter(f.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: on ? 600 : 500, border: "none", color: on ? "#000" : "rgba(203,205,205,.65)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", cursor: "pointer", transition: "all .2s" }}>
                  {dotColor && <span style={{ width: 6, height: 6, borderRadius: 999, background: on ? "#000" : dotColor, opacity: on ? 0.4 : 1, flexShrink: 0 }} />}
                  {f.label}
                  <span style={{ fontSize: 10.5, fontWeight: 600, opacity: on ? 0.55 : 0.4 }}>{n}</span>
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative", minWidth: 240, flex: "0 1 320px" }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={16} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالاسم، الإيميل، أو الموبايل…", "Search by name, email, or phone…")}
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 16px", paddingInlineStart: 40, fontSize: 13.5, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
        </div>

        <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          {shown.map((m, i) => {
            const sm = STATUS_META[m.status];
            return (
              <div key={m.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px 16px 22px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", background: i % 2 ? "rgba(255,255,255,.012)" : "transparent", cursor: "pointer" }}
                onClick={() => openInquiry(m)}>
                <span style={{ position: "absolute", insetInlineStart: 0, top: 10, bottom: 10, width: 3, borderRadius: 999, background: sm.color, opacity: m.status === "archived" ? .35 : .9 }} />
                <span style={{ display: "grid", placeItems: "center", height: 42, width: 42, borderRadius: 999, flexShrink: 0, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))" }}>
                  <span className="abh-display" style={{ fontSize: 16, color: "var(--abh-platinum)" }}>{(m.name || "?")[0]?.toUpperCase()}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, color: "var(--abh-ivory)", fontWeight: 500 }}>{m.name}</span>
                    <Chip tone={sm.tone}>{isAr ? sm.ar : sm.en}</Chip>
                    {m.notesCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--abh-steel)" }}>
                        <Ic.eye s={11} /> {m.notesCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 3, direction: "ltr", textAlign: isAr ? "right" : "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.email || m.phone || "—"}{m.vehicle ? ` · ${m.vehicle}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--abh-steel)", whiteSpace: "nowrap" }} className="abh-desk">{fmtDate(m.createdAt)}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <IconBtn icon={Ic.eye} label={T("عرض", "View")} onClick={() => openInquiry(m)} />
                  <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} danger onClick={() => setConfirm(m)} />
                </div>
              </div>
            );
          })}
          {shown.length === 0 && (
            <div style={{ padding: 56, textAlign: "center" }}>
              <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", marginBottom: 4 }}>{T("لا توجد استفسارات مطابقة", "No matching inquiries")}</div>
              <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("جرّب تغيير الفلتر أو كلمة البحث.", "Try a different filter or search term.")}</div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <InquiryModal m={open} isAr={isAr} T={T} fmtDate={fmtDate} fmtDateShort={fmtDateShort} onClose={() => setOpen(null)}
          onStatus={(s) => setStatus(open, s)}
          onNoteAdded={() => {
            setList((ls) => ls.map((x) => (x.id === open.id ? { ...x, notesCount: x.notesCount + 1, status: (x.status === "new" || x.status === "read") ? "responded" : x.status } : x)));
            setOpen((o) => (o ? { ...o, notesCount: o.notesCount + 1, status: (o.status === "new" || o.status === "read") ? "responded" : o.status } : o));
          }} />
      )}

      {confirm && (
        <Confirm title={T("حذف استفسار", "Delete inquiry")}
          body={T(`متأكد من حذف استفسار «${confirm.name}»؟ هيتشال مع كل ملاحظات المتابعة الخاصة بيه.`, `Delete “${confirm.name}”'s inquiry? All its follow-up notes will be removed too.`)}
          onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />
      )}
    </div>
  );
}

/* ═════════════════ مودال تفاصيل الاستفسار + سجل المتابعة ═════════════════ */
function InquiryModal({ m, isAr, T, fmtDate, fmtDateShort, onClose, onStatus, onNoteAdded }: {
  m: Inquiry; isAr: boolean; T: (ar: string, en: string) => string;
  fmtDate: (iso: string | null) => string; fmtDateShort: (iso: string | null) => string;
  onClose: () => void; onStatus: (s: Status) => void; onNoteAdded: () => void;
}) {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingNotes(true);
    fetch(`/api/admin/inquiries/notes?messageId=${m.id}`)
      .then((r) => r.json())
      .then((data) => { if (alive) setNotes(data?.ok ? data.notes.map((n: any) => ({ id: n.id, authorId: n.author_id, authorName: n.author_name, body: n.body, createdAt: n.created_at })) : []); })
      .catch(() => { if (alive) setNotes([]); })
      .finally(() => { if (alive) setLoadingNotes(false); });
    return () => { alive = false; };
  }, [m.id]);

  async function sendNote() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/inquiries/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id, body }) });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setNotes((ns) => [...(ns ?? []), { id: data.id, authorId: null, authorName: T("أنت", "You"), body, createdAt: new Date().toISOString() }]);
      setDraft("");
      onNoteAdded();
    } catch { toast(T("فشل حفظ الملاحظة", "Failed to save note"), "bad"); }
    setSending(false);
  }

  const sm = STATUS_META[m.status];
  const refId = m.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const currentIdx = STATUS_ORDER.indexOf(m.status);

  return (
    <Modal title={m.name} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 22 }}>
        {/* ترويسة: الاسم، الحالة، الرقم المرجعي، تاريخ الإرسال */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "grid", placeItems: "center", height: 44, width: 44, borderRadius: 999, flexShrink: 0, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))" }}>
              <span className="abh-display" style={{ fontSize: 17, color: "var(--abh-platinum)" }}>{(m.name || "?")[0]?.toUpperCase()}</span>
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15.5, color: "var(--abh-ivory)", fontWeight: 600 }}>{m.name}</span>
                <Chip tone={sm.tone}>{isAr ? sm.ar : sm.en}</Chip>
              </div>
              <div style={{ fontSize: 11, color: "var(--abh-steel)", marginTop: 2, direction: "ltr", textAlign: isAr ? "right" : "left" }}>
                #{refId} · {fmtDate(m.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* بيانات التواصل */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          <InfoRow label={T("الإيميل", "Email")} value={m.email || "—"} />
          <InfoRow label={T("الموبايل", "Phone")} value={m.phone || "—"} />
          <InfoRow label={T("الغرض", "Intent")} value={m.intent || "—"} />
          <InfoRow label={T("السيارة", "Vehicle")} value={m.vehicle || "—"} />
          <InfoRow label={T("لغة الرسالة", "Message language")} value={m.msgLocale === "en" ? "English" : "عربي"} />
          <InfoRow label={T("الموافقة على التواصل", "Consent to contact")} value={m.consent ? T("موافق", "Given") : T("غير موافق", "Not given")} />
        </div>

        {/* الرسالة */}
        {m.message && (
          <div>
            <SectionLabel>{T("الرسالة", "Message")}</SectionLabel>
            <div style={{ position: "relative", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "14px 16px 14px 20px", fontSize: 13.5, color: "rgba(203,205,205,.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              <span style={{ position: "absolute", insetInlineStart: 0, top: 4, bottom: 4, width: 2.5, borderRadius: 999, background: "rgba(203,205,205,.25)" }} />
              {m.message}
            </div>
          </div>
        )}

        {/* خط سير الحالة */}
        <div>
          <SectionLabel>{T("حالة الاستفسار", "Inquiry status")}</SectionLabel>
          <div style={{ display: "flex", alignItems: "center" }}>
            {STATUS_ORDER.map((s, idx) => {
              const meta = STATUS_META[s];
              const isDone = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <React.Fragment key={s}>
                  {idx > 0 && (
                    <div style={{ flex: 1, height: 2, background: idx <= currentIdx ? meta.color : "rgba(255,255,255,.08)", opacity: idx <= currentIdx ? .55 : 1, transition: "background .2s" }} />
                  )}
                  <button type="button" onClick={() => onStatus(s)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 2px", flexShrink: 0 }}>
                    <span style={{
                      width: isCurrent ? 14 : 10, height: isCurrent ? 14 : 10, borderRadius: 999,
                      background: isDone ? meta.color : "transparent",
                      border: isDone ? "none" : "2px solid rgba(255,255,255,.15)",
                      boxShadow: isCurrent ? `0 0 0 4px ${meta.color}26` : "none",
                      transition: "all .2s",
                    }} />
                    <span style={{ fontSize: 10.5, whiteSpace: "nowrap", color: isCurrent ? "var(--abh-ivory)" : "var(--abh-steel)", fontWeight: isCurrent ? 600 : 400 }}>
                      {isAr ? meta.ar : meta.en}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          {m.handledByName && (
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--abh-steel)" }}>
              {T("آخر تحديث بواسطة", "Last handled by")} <span style={{ color: "var(--abh-platinum)" }}>{m.handledByName}</span> {m.handledAt ? `· ${fmtDate(m.handledAt)}` : ""}
            </div>
          )}
        </div>

        {/* سجل المتابعة */}
        <div>
          <SectionLabel>{T("سجل المتابعة", "Follow-up log")}</SectionLabel>
          {loadingNotes ? (
            <div style={{ fontSize: 12, color: "var(--abh-steel)", padding: "10px 2px" }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : notes && notes.length > 0 ? (
            <div style={{ position: "relative", marginBottom: 14 }}>
              <div style={{ position: "absolute", insetInlineStart: 5, top: 6, bottom: 6, width: 1, background: "rgba(255,255,255,.1)" }} />
              <div className="abh-col" style={{ gap: 14 }}>
                {notes.map((n) => (
                  <div key={n.id} style={{ position: "relative", paddingInlineStart: 22 }}>
                    <span style={{ position: "absolute", insetInlineStart: 0, top: 5, width: 11, height: 11, borderRadius: 999, background: "var(--abh-bg, #0a0a0a)", border: "2px solid var(--abh-platinum)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: "var(--abh-ivory)", fontWeight: 600 }}>{n.authorName}</span>
                      <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{fmtDate(n.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(203,205,205,.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--abh-steel)", padding: "6px 2px 14px" }}>{T("مفيش متابعات مسجّلة لسه. أول ملاحظة تسجّلها هتتحط هنا.", "No follow-ups logged yet. Your first note will appear here.")}</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Textarea rows={2} value={draft} onChange={(e: any) => setDraft(e.target.value)} placeholder={T("اكتب ملاحظة متابعة… (مين كلّم العميل وقال إيه)", "Write a follow-up note… (who contacted the customer and what was said)")} />
            </div>
            <Pill onClick={sendNote}>{sending ? T("جارٍ الحفظ…", "Saving…") : T("إضافة", "Add")}</Pill>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <Ghost onClick={onClose}>{T("إغلاق", "Close")}</Ghost>
        </div>
      </div>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--abh-ivory)" }} dir="auto">{value}</div>
    </div>
  );
}