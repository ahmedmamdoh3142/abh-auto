"use client";
/**
 * app/admin/accounts/accounts-client.tsx — إدارة الحسابات (CLIENT)
 * إنشاء/تعديل/حذف حسابات (member / staff / admin / partner).
 *
 * (تعديل) الدخول باسم المستخدم — لا إيميل في الفورم.
 * (جديد) للموظّف/المدير: مسمّى وظيفي (نص حر) + صلاحيات صفحات (checkboxes).
 *   الصلاحيات تحدّد الصفحات التي يراها ويدخلها. super admin يرى الكل دائمًا
 *   (لا تظهر له الشبكة). العميل/الشركة لا مسمّى ولا صلاحيات.
 */
import React, { useMemo, useState, useEffect } from "react";
import { Pill, Ghost, IconBtn, Field, Input, Selectbox, Chip, Modal, Confirm, useToast, Ic, PageHeader } from "@/components/admin/ui";
import { PhoneInput, isValidPhone } from "@/components/admin/phone-input";
import { ADMIN_PAGES, type PermKey } from "@/lib/admin/permissions";

/* ───────── هوك media query (للتجاوب مع الموبايل) ───────── */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return matches;
}

/* يجبر جذر PhoneInput على ملء عرض الخلية ومنع الطفح في الـRTL */
const PHONE_FIX_CSS = `
.abh-phone-wrap{ width:100%; min-width:0; }
.abh-phone-wrap > *{ width:100% !important; min-width:0 !important; box-sizing:border-box; max-width:100%; }
.abh-phone-wrap input{ min-width:0 !important; }
`;

type Role = "member" | "staff" | "admin" | "partner";
type Account = {
  id: string; name: string; email: string; phone: string; city: string;
  role: Role; since: string | null;
  partnerId: string | null; companyName: string; partnerActive: boolean | null;
  jobTitle: string; permissions: string[]; isSuperAdmin: boolean;
};
type City = { code: string; label: string };

const ROLE_META: Record<Role, { ar: string; en: string; tone: any }> = {
  member: { ar: "عميل", en: "Member", tone: "neutral" },
  staff: { ar: "موظّف", en: "Staff", tone: "platinum" },
  admin: { ar: "مدير", en: "Admin", tone: "warn" },
  partner: { ar: "شركة", en: "Partner", tone: "ok" },
};

export default function AccountsClient({ accounts: initial, cities, locale }: {
  accounts: Account[]; cities: City[]; locale: string;
}) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();

  const [list, setList] = useState<Account[]>(initial);
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Account | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [q, setQ] = useState("");

  // أعداد كل دور (تُحسب من القائمة الكاملة، لا تتأثر بالبحث الحالي).
  const counts = useMemo(() => {
    const c: Record<Role | "all", number> = { all: list.length, member: 0, staff: 0, admin: 0, partner: 0 };
    for (const a of list) c[a.role] = (c[a.role] ?? 0) + 1;
    return c;
  }, [list]);

  const filters: { id: Role | "all"; label: string }[] = [
    { id: "all", label: T("الكل", "All") },
    { id: "partner", label: T("الشركات", "Partners") },
    { id: "member", label: T("العملاء", "Members") },
    { id: "admin", label: T("المدراء", "Admins") },
    { id: "staff", label: T("الموظّفون", "Staff") },
  ];

  const shown = useMemo(
    () => list.filter((a) => (roleFilter === "all" || a.role === roleFilter)
      && (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.email.toLowerCase().includes(q.toLowerCase()) || a.companyName.toLowerCase().includes(q.toLowerCase()))),
    [list, roleFilter, q]
  );

  const fmtDate = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }); };

  async function save(acc: any, isNew: boolean) {
    try {
      const res = await fetch("/api/admin/accounts", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acc),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg: Record<string, string> = {
          name_taken: T("اسم المستخدم مستخدم بالفعل", "Username already in use"),
          email_taken: T("الإيميل مستخدم بالفعل", "Email already in use"),
          weak_password: T("الباسوورد قصير (8 أحرف على الأقل)", "Password too short (min 8)"),
          company_name_required: T("اسم الشركة مطلوب", "Company name required"),
          missing_fields: T("بيانات ناقصة", "Missing fields"),
          protected_super_admin: T("لا يمكن تعديل صلاحيات المدير الأعلى", "Cannot modify the super admin"),
        };
        throw new Error(msg[data.error] || T("فشل الحفظ", "Save failed"));
      }
      const refreshed = await fetch("/api/admin/accounts").then((r) => r.json()).catch(() => null);
      if (refreshed?.ok) {
        setList(refreshed.accounts.map((u: any) => ({
          id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city,
          role: u.role, since: u.since, partnerId: u.partnerId, companyName: u.companyName ?? "", partnerActive: u.partnerActive,
          jobTitle: u.jobTitle ?? "", permissions: u.permissions ?? [], isSuperAdmin: !!u.isSuperAdmin,
        })));
      }
      toast(isNew ? T("تم إنشاء الحساب", "Account created") : T("تم تحديث الحساب", "Account updated"));
      setAdding(false); setEditing(null);
    } catch (e: any) {
      toast(e.message || T("فشل الحفظ", "Save failed"), "bad");
    }
  }

  async function remove(acc: Account) {
    try {
      const res = await fetch(`/api/admin/accounts?id=${acc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setList((ls) => ls.filter((x) => x.id !== acc.id));
      toast(T("تم حذف الحساب", "Account deleted"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("الحسابات", "Accounts")} subtitle={T("أنشئ وعدّل حسابات العملاء والموظّفين والمدراء والشركات. صلاحيات الموظّفين والمدراء تُحدّد الصفحات التي يرونها.", "Create and edit members, staff, admins and partner companies. Staff/admin permissions control which pages they see.")} seed="accounts-hero"
        action={<Pill icon={Ic.plus} onClick={() => setAdding(true)}>{T("حساب جديد", "New account")}</Pill>} />

      <div className="abh-col" style={{ gap: 20 }}>
        {/* فلاتر + بحث */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filters.map((f) => {
              const on = roleFilter === f.id;
              const n = counts[f.id] ?? 0;
              return (
                <button key={f.id} onClick={() => setRoleFilter(f.id)}
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

        {/* جدول الحسابات */}
        <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
          {shown.map((a, i) => {
            const rm = ROLE_META[a.role];
            const contactLine = a.email && !a.email.endsWith("@abh-auto.local") ? a.email : (a.phone || "—");
            const isTeam = a.role === "admin" || a.role === "staff";
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", background: i % 2 ? "rgba(255,255,255,.012)" : "transparent" }}>
                <span style={{ display: "grid", placeItems: "center", height: 42, width: 42, borderRadius: 999, flexShrink: 0, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))" }}>
                  <span className="abh-display" style={{ fontSize: 16, color: "var(--abh-platinum)" }}>{(a.companyName || a.name || "?")[0]?.toUpperCase()}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, color: "var(--abh-ivory)" }}>{a.role === "partner" && a.companyName ? a.companyName : a.name}</span>
                    <Chip tone={rm.tone}>{isAr ? rm.ar : rm.en}</Chip>
                    {a.isSuperAdmin && <Chip tone="warn">{T("مدير أعلى", "Super")}</Chip>}
                    {a.role === "partner" && a.partnerActive === false && <Chip tone="bad">{T("شراكة موقوفة", "Paused")}</Chip>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 3, direction: "ltr", textAlign: isAr ? "right" : "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isTeam && a.jobTitle ? `${a.jobTitle} · ` : ""}{contactLine}{a.role === "partner" && a.companyName ? ` · ${a.name}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--abh-steel)", whiteSpace: "nowrap" }} className="abh-desk">{fmtDate(a.since)}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <IconBtn icon={Ic.pencil} label={T("تعديل", "Edit")} onClick={() => setEditing(a)} />
                  <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} danger onClick={() => setConfirm(a)} />
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد حسابات مطابقة.", "No matching accounts.")}</div>}
        </div>
      </div>

      {(adding || editing) && <AccountModal acc={editing} cities={cities} isAr={isAr} T={T} onClose={() => { setAdding(false); setEditing(null); }} onSave={save} />}
      {confirm && <Confirm title={T("حذف حساب", "Delete account")}
        body={T(`متأكد من حذف حساب «${confirm.companyName || confirm.name}»؟ ${confirm.role === "partner" ? "هتتحذف أسعاره الخاصة كمان، لكن حجوزاته القديمة هتفضل محفوظة." : ""}`,
                `Delete “${confirm.companyName || confirm.name}”? ${confirm.role === "partner" ? "Its private prices will be removed too, but past bookings stay." : ""}`)}
        onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />}
    </div>
  );
}

/* ═══════════ مودال إنشاء/تعديل حساب ═══════════ */
function AccountModal({ acc, cities, isAr, T, onClose, onSave }: {
  acc: Account | null; cities: City[]; isAr: boolean; T: (ar: string, en: string) => string;
  onClose: () => void; onSave: (acc: any, isNew: boolean) => void;
}) {
  const isNew = !acc;
  const mobile = useMediaQuery("(max-width: 640px)");
  const twoCol = mobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)";

  const [f, setF] = useState({
    id: acc?.id ?? "",
    name: acc?.name ?? "",
    email: acc?.email ?? "",
    phone: acc?.phone ?? "",
    city: acc?.city ?? "",
    role: (acc?.role ?? "member") as Role,
    companyName: acc?.companyName ?? "",
    password: "",
    jobTitle: acc?.jobTitle ?? "",
    permissions: (acc?.permissions ?? []) as string[],
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const [touched, setTouched] = useState(false);
  const isPartner = f.role === "partner";
  const isTeam = f.role === "admin" || f.role === "staff"; // من يملك صلاحيات
  const lockedSuper = !!acc?.isSuperAdmin; // المدير الأعلى: لا نعرض/نعدّل صلاحياته

  const passOk = isNew ? f.password.length >= 8 : (f.password === "" || f.password.length >= 8);
  const phoneOk = !f.phone.trim() || isValidPhone(f.phone);
  const valid = f.name.trim() && passOk && phoneOk && (!isPartner || f.companyName.trim());

  const inputStyle = { textAlign: isAr ? "right" as const : "left" as const };

  const togglePerm = (key: PermKey) => set({
    permissions: f.permissions.includes(key)
      ? f.permissions.filter((k) => k !== key)
      : [...f.permissions, key],
  });

  // مجموعات الصفحات للعرض المنظّم
  const groups = useMemo(() => {
    const map = new Map<string, typeof ADMIN_PAGES>();
    for (const p of ADMIN_PAGES) {
      const g = isAr ? p.group.ar : p.group.en;
      const arr = map.get(g) ?? []; arr.push(p); map.set(g, arr);
    }
    return Array.from(map.entries());
  }, [isAr]);

  const allKeys = ADMIN_PAGES.map((p) => p.key);
  const allOn = allKeys.every((k) => f.permissions.includes(k));

  return (
    <Modal title={isNew ? T("حساب جديد", "New account") : T("تعديل حساب", "Edit account")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 16 }}>
        {/* الدور */}
        <Field label={T("نوع الحساب", "Account type")}>
          <Selectbox value={f.role} onChange={(v: Role) => set({ role: v })}
            options={[
              { value: "member", label: T("عميل", "Member") },
              { value: "partner", label: T("شركة (أسعار خاصة)", "Partner (private pricing)") },
              { value: "staff", label: T("موظّف", "Staff") },
              { value: "admin", label: T("مدير", "Admin") },
            ]} placeholder={T("اختر", "Select")} />
        </Field>

        {/* اسم الشركة (للشركات فقط) */}
        {isPartner && (
          <Field label={T("اسم الشركة", "Company name")} hint={T("يظهر في صفحة الشركاء وفي اختيار التسعير.", "Shown in Partners page and pricing selector.")}>
            <Input value={f.companyName} onChange={(e: any) => set({ companyName: e.target.value })} placeholder={T("مثال: شركة الخليج للسيارات", "e.g. Gulf Motors Co.")} style={inputStyle} />
          </Field>
        )}

        {/* اسم المستخدم */}
        <Field label={T("اسم المستخدم", "Username")} hint={T("يُستخدم لتسجيل الدخول.", "Used to sign in.")}>
          <Input value={f.name} onChange={(e: any) => set({ name: e.target.value })} placeholder={T("اسم الدخول", "Login username")} style={inputStyle} />
        </Field>

        {/* المسمى الوظيفي — للموظّف/المدير فقط */}
        {isTeam && (
          <Field label={T("المسمى الوظيفي", "Job title")} hint={T("نص حر، مثال: مدير مالي، محاسب، خدمة عملاء.", "Free text, e.g. Finance Manager, Accountant.")}>
            <Input value={f.jobTitle} onChange={(e: any) => set({ jobTitle: e.target.value })} placeholder={T("مثال: مدير مالي", "e.g. Finance Manager")} style={inputStyle} />
          </Field>
        )}

        <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <Field label={T("الهاتف", "Phone")}>
              <div className="abh-phone-wrap">
                <PhoneInput isAr={isAr} value={f.phone} onChange={(p) => set({ phone: p })}
                  error={touched && f.phone.trim() && !isValidPhone(f.phone) ? T("رقم غير صحيح", "Invalid number") : null} />
              </div>
            </Field>
          </div>
          <div style={{ minWidth: 0 }}>
            <Field label={T("المدينة (اختياري)", "City (optional)")}>
              <Selectbox value={f.city} onChange={(v: string) => set({ city: v })}
                options={[{ value: "", label: T("بدون", "None") }, ...cities.map((c) => ({ value: c.code, label: c.label }))]}
                placeholder={T("اختر", "Select")} />
            </Field>
          </div>
        </div>

        <Field label={isNew ? T("كلمة المرور", "Password") : T("كلمة مرور جديدة (اتركها فارغة لعدم التغيير)", "New password (leave blank to keep)")}
          hint={T("8 أحرف على الأقل.", "At least 8 characters.")}>
          <Input dir="ltr" type="text" value={f.password} onChange={(e: any) => set({ password: e.target.value })}
            placeholder={isNew ? "••••••••" : T("بدون تغيير", "unchanged")} style={{ textAlign: "left" }} />
        </Field>

        {/* الصلاحيات — للموظّف/المدير فقط، وتختفي للمدير الأعلى */}
        {isTeam && (
          lockedSuper ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(232,207,154,.35)", background: "rgba(232,207,154,.06)", padding: 14, fontSize: 12.5, color: "var(--abh-warn)" }}>
              {T("هذا الحساب مدير أعلى — يملك كل الصلاحيات دائمًا ولا يمكن تقييده.", "This is a super admin — always has full access and can't be restricted.")}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("الصلاحيات (الصفحات المسموح بها)", "Permissions (allowed pages)")}</span>
                <button type="button" onClick={() => set({ permissions: allOn ? [] : allKeys })}
                  style={{ borderRadius: 999, border: "1px solid rgba(203,205,205,.35)", background: "rgba(203,205,205,.08)", color: "var(--abh-ivory)", padding: "5px 12px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {allOn ? T("إلغاء الكل", "Clear all") : T("تحديد الكل", "Select all")}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--abh-steel)", marginBottom: 12 }}>
                {T("سيرى المستخدم الصفحات المحددة فقط، ويُوجَّه لأول صفحة مسموحة عند الدخول.", "The user sees only checked pages, and lands on the first allowed page on login.")}
              </div>
              <div className="abh-col" style={{ gap: 14 }}>
                {groups.map(([label, pages]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                      {pages.map((p) => {
                        const on = f.permissions.includes(p.key);
                        return (
                          <button key={p.key} type="button" onClick={() => togglePerm(p.key)}
                            style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: "10px 12px", cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
                            <span style={{ display: "grid", placeItems: "center", height: 20, width: 20, flexShrink: 0, borderRadius: 6, border: on ? "none" : "1px solid rgba(255,255,255,.2)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: "#000" }}>{on && <Ic.check s={12} />}</span>
                            <span style={{ fontSize: 13, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)" }}>{isAr ? p.ar : p.en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill onClick={() => { setTouched(true); if (valid) onSave(f, isNew); }}>{T("حفظ", "Save")}</Pill>
        </div>
        {!valid && (
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--abh-steel)", textAlign: "end" }}>
            {T("أكمل الحقول المطلوبة (اسم المستخدم، باسوورد 8+ أحرف، واسم الشركة للشركات).",
               "Complete required fields (username, 8+ char password, company name for partners).")}
          </p>
        )}
      </div>

      <style>{PHONE_FIX_CSS}</style>
    </Modal>
  );
}