"use client";
/**
 * app/admin/inquiries/inquiries-client.tsx — استفسارات الموقع (CLIENT)
 * فلاتر بالحالة + بحث + مودال تفاصيل فيه سجل متابعة (ملاحظات متعددة) وتغيير الحالة.
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

const STATUS_META: Record<Status, { ar: string; en: string; tone: any }> = {
  new: { ar: "جديدة", en: "New", tone: "warn" },
  read: { ar: "مشوفة", en: "Read", tone: "neutral" },
  responded: { ar: "تم التواصل", en: "Responded", tone: "ok" },
  archived: { ar: "مؤرشفة", en: "Archived", tone: "neutral" },
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
    { id: "read", label: T("مشوفة", "Read") },
    { id: "responded", label: T("تم التواصل", "Responded") },
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filters.map((f) => {
              const on = statusFilter === f.id;
              const n = counts[f.id] ?? 0;
              return (
                <button key={f.id} onClick={() => setStatusFilter(f.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "8px 10px 8px 16px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.4)" : "rgba(255,255,255,.1)"}`, color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.65)", background: on ? "rgba(203,205,205,.08)" : "transparent", cursor: "pointer", transition: "all .2s" }}>
                  {f.label}
                  <span className="abh-num" style={{ display: "inline-grid", placeItems: "center", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, lineHeight: 1, color: on ? "#000" : "var(--abh-platinum)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.06)", border: on ? "none" : "1px solid rgba(255,255,255,.08)" }}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative", minWidth: 240, flex: "0 1 320px" }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={16} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث…", "Search…")}
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 16px", paddingInlineStart: 40, fontSize: 13.5, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
        </div>

        <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          {shown.map((m, i) => {
            const sm = STATUS_META[m.status];
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", background: i % 2 ? "rgba(255,255,255,.012)" : "transparent", cursor: "pointer" }}
                onClick={() => openInquiry(m)}>
                <span style={{ display: "grid", placeItems: "center", height: 42, width: 42, borderRadius: 999, flexShrink: 0, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))" }}>
                  <span className="abh-display" style={{ fontSize: 16, color: "var(--abh-platinum)" }}>{(m.name || "?")[0]?.toUpperCase()}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, color: "var(--abh-ivory)" }}>{m.name}</span>
                    <Chip tone={sm.tone}>{isAr ? sm.ar : sm.en}</Chip>
                    {m.notesCount > 0 && <Chip tone="platinum">{m.notesCount} {T("ملاحظة", "notes")}</Chip>}
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
          {shown.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد استفسارات مطابقة.", "No matching inquiries.")}</div>}
        </div>
      </div>

      {open && (
        <InquiryModal m={open} isAr={isAr} T={T} fmtDate={fmtDate} onClose={() => setOpen(null)}
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
function InquiryModal({ m, isAr, T, fmtDate, onClose, onStatus, onNoteAdded }: {
  m: Inquiry; isAr: boolean; T: (ar: string, en: string) => string; fmtDate: (iso: string | null) => string;
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

  const statusBtns: { id: Status; label: string }[] = [
    { id: "new", label: T("جديدة", "New") },
    { id: "read", label: T("مشوفة", "Read") },
    { id: "responded", label: T("تم التواصل", "Responded") },
    { id: "archived", label: T("أرشفة", "Archive") },
  ];

  return (
    <Modal title={m.name} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <InfoRow label={T("الإيميل", "Email")} value={m.email || "—"} />
          <InfoRow label={T("الموبايل", "Phone")} value={m.phone || "—"} />
          <InfoRow label={T("الغرض", "Intent")} value={m.intent || "—"} />
          <InfoRow label={T("السيارة", "Vehicle")} value={m.vehicle || "—"} />
          <InfoRow label={T("تاريخ الإرسال", "Sent")} value={fmtDate(m.createdAt)} />
          <InfoRow label={T("اللغة", "Locale")} value={m.msgLocale === "en" ? "English" : "عربي"} />
        </div>

        {m.message && (
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 8 }}>{T("الرسالة", "Message")}</div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 14, fontSize: 13.5, color: "rgba(203,205,205,.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.message}</div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 8 }}>{T("الحالة", "Status")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {statusBtns.map((s) => {
              const on = m.status === s.id;
              return (
                <button key={s.id} type="button" onClick={() => onStatus(s.id)}
                  style={{ borderRadius: 999, padding: "8px 16px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.6)", background: on ? "rgba(203,205,205,.1)" : "transparent", cursor: "pointer" }}>
                  {s.label}
                </button>
              );
            })}
          </div>
          {m.handledByName && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--abh-steel)" }}>
              {T("آخر تحديث بواسطة", "Last handled by")} {m.handledByName} {m.handledAt ? `· ${fmtDate(m.handledAt)}` : ""}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 8 }}>{T("سجل المتابعة", "Follow-up log")}</div>
          {loadingNotes ? (
            <div style={{ fontSize: 12, color: "var(--abh-steel)", padding: "10px 2px" }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : notes && notes.length > 0 ? (
            <div className="abh-col" style={{ gap: 10, marginBottom: 12 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--abh-ivory)", fontWeight: 600 }}>{n.authorName}</span>
                    <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{fmtDate(n.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(203,205,205,.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--abh-steel)", padding: "6px 2px 12px" }}>{T("مفيش متابعات مسجّلة لسه.", "No follow-ups logged yet.")}</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Textarea rows={2} value={draft} onChange={(e: any) => setDraft(e.target.value)} placeholder={T("اكتب ملاحظة متابعة… (مين كلّم العميل وقال إيه)", "Write a follow-up note… (who contacted the customer and what was said)")} />
            </div>
            <Pill onClick={sendNote}>{sending ? T("جارٍ الحفظ…", "Saving…") : T("إضافة", "Add")}</Pill>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <Ghost onClick={onClose}>{T("إغلاق", "Close")}</Ghost>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--abh-ivory)" }} dir="auto">{value}</div>
    </div>
  );
}