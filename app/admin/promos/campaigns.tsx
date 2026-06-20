"use client";
/**
 * app/admin/promos/campaigns.tsx — حملات الأكواد الموجّهة (CLIENT).
 *
 * يُدمج داخل صفحة أكواد الخصم: زر «حملة موجّهة» + قائمة الحملات + مودال الإنشاء.
 * الحملة: تبعت لكل العملاء أو لعميل واحد، كل واحد يأخذ كودًا فريدًا يبدأ بـ abh-،
 * كلهم بنفس الخصم (% أو مبلغ) ونفس تاريخ الانتهاء. single-use عالميًا.
 *
 * استخدم هذه المكوّنات داخل promos-client عبر:
 *   import { CampaignsSection } from "./campaigns";
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Pill, Ghost, Field, Selectbox, Chip, Modal, Confirm, useToast, Ic, EGP } from "@/components/admin/ui";

type Campaign = {
  id: string; label: string; kind: "percentage" | "fixed";
  discountPercent: number; fixedAmount: number; minOrder: number;
  expiresAt: string | null; audience: "all" | "user"; recipients: number;
  codes: number; used: number; createdAt: string;
};
type UserLite = { id: string; name: string; email: string };

export function CampaignsSection({ T, ccy, isAr, loc }: {
  T: (a: string, e: string) => string; ccy: string; isAr: boolean; loc: string;
}) {
  const toast = useToast();
  const fmtDate = (iso: string | null) => { if (!iso) return T("بلا انتهاء", "No expiry"); const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); };
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/promo-campaigns").then((r) => r.json()); if (j?.ok) setList(j.campaigns); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(c: Campaign) {
    try {
      const r = await fetch(`/api/admin/promo-campaigns?id=${c.id}`, { method: "DELETE" }).then((r) => r.json());
      if (!r.ok) throw new Error();
      setList((ls) => ls.filter((x) => x.id !== c.id));
      toast(T("تم حذف الحملة وأكوادها", "Campaign & codes deleted"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }

  return (
    <div className="abh-col" style={{ gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{T("الحملات الموجّهة", "Targeted campaigns")}</div>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 3 }}>{T("ابعت كودًا فريدًا لكل عميل — نفس الخصم، أكواد مختلفة تبدأ بـ abh-", "Send each customer a unique abh- code — same discount, different codes.")}</div>
        </div>
        <Pill icon={Ic.plus} onClick={() => setAdding(true)}>{T("حملة جديدة", "New campaign")}</Pill>
      </div>

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : list.length === 0 ? (
        <div style={{ borderRadius: 18, border: "1px dashed rgba(255,255,255,.12)", padding: 40, textAlign: "center", color: "var(--abh-steel)" }}>
          {T("لا توجد حملات بعد — اضغط «حملة جديدة» لإرسال أكواد لعملائك.", "No campaigns yet — click “New campaign” to send codes to your customers.")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {list.map((c, i) => (
            <CampaignCard key={c.id} c={c} i={i} T={T} ccy={ccy} isAr={isAr} fmtDate={fmtDate} onDelete={() => setConfirm(c)} />
          ))}
        </div>
      )}

      {adding && <CampaignModal T={T} ccy={ccy} isAr={isAr} onClose={() => setAdding(false)}
        onDone={(n) => { setAdding(false); toast(T(`تم إنشاء ${n} كود وإرسالها`, `Generated & sent ${n} codes`)); load(); }} />}
      {confirm && <Confirm title={T("حذف حملة", "Delete campaign")}
        body={T(`حذف «${confirm.label}»؟ كل أكوادها (${confirm.codes}) ستُحذف وتختفي من حسابات العملاء.`, `Delete “${confirm.label}”? All its ${confirm.codes} codes will be removed from customer accounts.`)}
        onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />}
    </div>
  );
}

function CampaignCard({ c, i, T, ccy, isAr, fmtDate, onDelete }: {
  c: Campaign; i: number; T: (a: string, e: string) => string; ccy: string; isAr: boolean;
  fmtDate: (s: string | null) => string; onDelete: () => void;
}) {
  const align = isAr ? "right" : "left";
  const value = c.kind === "fixed" ? `${EGP(c.fixedAmount)} ${ccy}` : `${c.discountPercent}%`;
  const usedPct = c.codes > 0 ? Math.round((c.used / c.codes) * 100) : 0;
  return (
    <div className="abh-lift" style={{ position: "relative", overflow: "hidden", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: 18, animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
      <span aria-hidden style={{ position: "absolute", insetInlineEnd: -28, top: -28, height: 84, width: 84, borderRadius: 999, background: "radial-gradient(circle,rgba(203,205,205,.1),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
          <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 3 }}>
            {c.audience === "all" ? T("لكل العملاء", "All customers") : T("عميل محدّد", "Specific customer")} · {fmtDate(c.createdAt)}
          </div>
        </div>
        <span className="abh-num" dir="ltr" style={{ fontSize: 22, color: "var(--abh-ivory)", flexShrink: 0 }}>{value}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <Cell label={T("أكواد", "Codes")} value={String(c.codes)} align={align} />
        <Cell label={T("مُستخدَمة", "Used")} value={String(c.used)} align={align} />
        <Cell label={T("انتهاء", "Expiry")} value={fmtDate(c.expiresAt)} align={align} small />
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${usedPct}%`, borderRadius: 999, background: "linear-gradient(90deg,#8a8d90,#fff)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{T(`${usedPct}% مُستخدَم`, `${usedPct}% redeemed`)}</span>
          <button onClick={onDelete} title={T("حذف", "Delete")} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#e7b4b4", background: "transparent", border: "none", cursor: "pointer" }}><Ic.trash s={13} />{T("حذف", "Delete")}</button>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, align, small }: { label: string; value: string; align: any; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{label}</div>
      <div className="abh-num" dir="ltr" style={{ fontSize: small ? 11 : 16, color: "var(--abh-ivory)", marginTop: 3, textAlign: align }}>{value}</div>
    </div>
  );
}

function CampaignModal({ T, ccy, isAr, onClose, onDone }: {
  T: (a: string, e: string) => string; ccy: string; isAr: boolean; onClose: () => void; onDone: (n: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"percentage" | "fixed">("percentage");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [audience, setAudience] = useState<"all" | "user">("all");
  const [saving, setSaving] = useState(false);

  // اختيار عميل
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserLite[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (audience !== "user") return;
    let alive = true; setSearching(true);
    const t = setTimeout(async () => {
      try { const j = await fetch(`/api/admin/users-lite?q=${encodeURIComponent(q)}`).then((r) => r.json()); if (alive && j?.ok) setUsers(j.users); }
      finally { if (alive) setSearching(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, audience]);

  const valid = label.trim() && (kind === "percentage" ? discountPercent > 0 : fixedAmount > 0) && (audience === "all" || userId);

  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/promo-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(), kind, discountPercent, fixedAmount, minOrder,
          expiresAt: expiresAt || null, audience, userId: audience === "user" ? userId : null,
        }),
      }).then((r) => r.json());
      if (r?.ok) onDone(r.recipients);
      else setSaving(false);
    } catch { setSaving(false); }
  }

  return (
    <Modal title={T("حملة أكواد موجّهة", "Targeted campaign")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        {/* الجمهور */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("المستلِمون", "Recipients")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([["all", T("كل العملاء", "All customers"), T("كل عضو يأخذ كودًا فريدًا", "Every member gets a unique code")],
               ["user", T("عميل محدّد", "Specific customer"), T("ابحث واختر عميلًا واحدًا", "Search & pick one")]] as const).map(([val, ttl, desc]) => {
              const on = audience === val;
              return (
                <button key={val} onClick={() => setAudience(val as any)} style={{ textAlign: "start", borderRadius: 14, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: 13, cursor: "pointer", transition: "all .2s" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)" }}>
                    <Ic.users s={16} /><span style={{ fontSize: 12.5, fontWeight: on ? 600 : 400 }}>{ttl}</span>
                  </span>
                  <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 5 }}>{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* بحث العميل */}
        {audience === "user" && (
          <Field label={T("اختر العميل", "Pick customer")}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
              <input value={q} onChange={(e) => { setQ(e.target.value); setUserId(""); }} placeholder={T("ابحث بالاسم أو الإيميل…", "Search name or email…")}
                style={{ ...inp, paddingInlineStart: 36 }} />
            </div>
            <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)" }}>
              {searching ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("جارٍ البحث…", "Searching…")}</div>
                : users.length === 0 ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("لا نتائج", "No results")}</div>
                : users.map((u) => {
                  const on = userId === u.id;
                  return (
                    <button key={u.id} onClick={() => setUserId(u.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid rgba(255,255,255,.04)", background: on ? "rgba(203,205,205,.1)" : "transparent", cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, color: "var(--abh-ivory)" }}>{u.name}</span>
                        <span dir="ltr" style={{ display: "block", fontSize: 10.5, color: "var(--abh-steel)" }}>{u.email}</span>
                      </span>
                      {on && <Ic.check s={15} />}
                    </button>
                  );
                })}
            </div>
          </Field>
        )}

        {/* نوع الخصم */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("نوع الخصم", "Discount type")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([["percentage", T("نسبة %", "Percentage")], ["fixed", T("مبلغ ثابت", "Fixed amount")]] as const).map(([val, ttl]) => {
              const on = kind === val;
              return (
                <button key={val} onClick={() => setKind(val as any)} style={{ borderRadius: 12, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: "11px 14px", cursor: "pointer", color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", fontSize: 13, fontWeight: on ? 600 : 400, transition: "all .2s" }}>{ttl}</button>
              );
            })}
          </div>
        </div>

        {/* القيمة */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label={T("اسم الحملة", "Campaign name")} hint={T("داخلي فقط", "Internal only")}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={T("عرض رمضان", "Ramadan offer")} style={inp} />
          </Field>
          {kind === "percentage" ? (
            <Field label={T("نسبة الخصم %", "Discount %")}>
              <input type="number" min={1} max={100} value={discountPercent || ""} onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, +e.target.value)))} dir="ltr" style={inp} />
            </Field>
          ) : (
            <Field label={T("مبلغ الخصم", "Amount")} hint={ccy}>
              <input type="number" min={0} value={fixedAmount || ""} onChange={(e) => setFixedAmount(Math.max(0, +e.target.value))} dir="ltr" style={inp} />
            </Field>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label={T("حد أدنى للطلب", "Min order")} hint={T("اختياري", "Optional")}>
            <input type="number" min={0} value={minOrder || ""} onChange={(e) => setMinOrder(Math.max(0, +e.target.value))} dir="ltr" placeholder="0" style={inp} />
          </Field>
          <Field label={T("تاريخ الانتهاء", "Expires at")} hint={T("فارغ = بلا انتهاء", "Empty = never")}>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} dir="ltr" style={inp} />
          </Field>
        </div>

        <div style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.2)", background: "rgba(203,205,205,.05)", padding: "11px 14px", fontSize: 11.5, color: "var(--abh-platinum)", lineHeight: 1.6 }}>
          {T("كل مستلِم يأخذ كودًا فريدًا يبدأ بـ abh- ويُستخدم مرة واحدة فقط (يصلح لأي شخص يستخدمه أولًا).", "Each recipient gets a unique abh- code, usable once (whoever redeems first).")}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={submit}>{saving ? T("جارٍ الإرسال…", "Sending…") : T("إنشاء وإرسال", "Create & send")}</Pill>
        </div>
      </div>
    </Modal>
  );
}