"use client";
/**
 * app/admin/admin-shell.tsx — هيكل لوحة التحكم (sidebar + topbar + الحاوية).
 * - السايدبار يظهر يمينًا في العربي ويسارًا في الإنجليزي تلقائيًا (عبر dir على الحاوية + ترتيب طبيعي للعناصر).
 * - مسافات الكروت مضبوطة (gap أفقي ورأسي صريح في الكلاسات).
 *
 * تعديل نظام الشركاء: أضيفت مجموعة «الشركاء والحسابات» (الشركاء + الحسابات) لمصفوفة NAV.
 */
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ic, IconBtn, ToastHost } from "@/components/admin/ui";

type NavItem = { href: string; label: string; icon: (p: any) => React.ReactNode; badge?: number };
type NavGroup = { group: string; items: NavItem[] };

export default function AdminShell({
  children, user, locale, dir, pending = 0, unread = 0,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
  locale: "en" | "ar";
  dir: "rtl" | "ltr";
  pending?: number;
  unread?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const NAV: NavGroup[] = [
    { group: t("الواجهة", "Overview"), items: [
      { href: "/admin", label: t("نظرة عامة", "Overview"), icon: Ic.grid },
      { href: "/admin/bookings", label: t("الحجوزات", "Bookings"), icon: Ic.calendar, badge: pending },
      { href: "/admin/bookings/new", label: t("حجز جديد", "New booking"), icon: Ic.plus },
    ]},
    { group: t("الشركاء والحسابات", "Partners & accounts"), items: [
      { href: "/admin/partners", label: t("الشركاء", "Partners"), icon: Ic.trending },
      { href: "/admin/accounts", label: t("الحسابات", "Accounts"), icon: Ic.users },
    ]},
    { group: t("محتوى الموقع", "Site content"), items: [
      { href: "/admin/content", label: t("نصوص الصفحات", "Page content"), icon: Ic.type },
      { href: "/admin/services", label: t("الخدمات والأسعار", "Services & pricing"), icon: Ic.sliders },
      { href: "/admin/price-files", label: t("ملفات الأسعار", "Price files"), icon: Ic.calendar },
      { href: "/admin/promos", label: t("أكواد الخصم", "Promo codes"), icon: Ic.clock },
      { href: "/admin/offers", label: t("العروض والولاء", "Offers & loyalty"), icon: Ic.sparkle },
    ]},
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/bookings") return pathname === "/admin/bookings";
    return pathname === href || pathname.startsWith(href + "/");
  };
  const SidebarInner = (
    <aside style={{ width: collapsed ? 78 : 268, flexShrink: 0, transition: "width .4s var(--abh-ease)", display: "flex", flexDirection: "column", borderInlineStart: "1px solid rgba(255,255,255,.06)", borderInlineEnd: "1px solid rgba(255,255,255,.06)", height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: collapsed ? "22px 0" : "22px 24px", display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.15)", background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.02))" }}><span className="abh-display" style={{ fontSize: 17, color: "var(--abh-ivory)" }}>A</span></span>
          {!collapsed && <div style={{ lineHeight: 1.1 }}><div className="abh-display" style={{ fontSize: 18, letterSpacing: ".12em", color: "var(--abh-ivory)", textTransform: "uppercase" }}>ABH AUTO</div><div style={{ fontSize: 9, letterSpacing: ".28em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{t("لوحة التحكم", "Admin")}</div></div>}
        </div>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "4px 12px" : "4px 16px" }}>
        {NAV.map((g) => (
          <div key={g.group} style={{ marginBottom: 22 }}>
            {!collapsed && <div style={{ padding: "0 12px 8px", fontSize: 9.5, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{g.group}</div>}
            {g.items.map((it) => {
              const on = isActive(it.href);
              return (
                <Link key={it.href} href={it.href} onClick={() => setMobileOpen(false)} title={it.label} style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 12, borderRadius: 13, padding: collapsed ? "12px 0" : "11px 12px", justifyContent: collapsed ? "center" : "flex-start", marginBottom: 3, textDecoration: "none", color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.6)", background: on ? "rgba(255,255,255,.06)" : "transparent", border: `1px solid ${on ? "rgba(255,255,255,.1)" : "transparent"}`, transition: "all .25s var(--abh-ease)" }}>
                  {on && !collapsed && <span style={{ position: "absolute", insetInlineStart: 0, top: "50%", transform: "translateY(-50%)", height: 18, width: 3, borderRadius: 999, background: "linear-gradient(180deg,#fff,#cbcdcd)" }} />}
                  <it.icon s={18} sw={on ? 1.9 : 1.7} />
                  {!collapsed && <span style={{ flex: 1, textAlign: dir === "rtl" ? "right" : "left", fontSize: 13.5 }}>{it.label}</span>}
                  {!collapsed && it.badge ? <span style={{ minWidth: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 6px", fontSize: 10.5, fontWeight: 600, color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)" }}>{it.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: collapsed ? "12px" : "16px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: collapsed ? "center" : "flex-start" }}>
          <span style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 999, flexShrink: 0, border: "1px solid rgba(255,255,255,.15)", background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.02))" }}><span className="abh-display" style={{ fontSize: 13, color: "var(--abh-platinum)", textTransform: "uppercase" }}>{(user.name || "A")[0]}</span></span>
          {!collapsed && <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name} · {user.role === "admin" ? t("مدير", "Admin") : t("موظّف", "Staff")}</div><div style={{ fontSize: 10.5, color: "var(--abh-steel)", direction: "ltr" }}>{user.email}</div></div>}
          {!collapsed && <a href="/api/auth/logout" title={t("خروج", "logout")} style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", color: "var(--abh-platinum)" }}><Ic.logout s={15} /></a>}
        </div>
      </div>
    </aside>
  );

  return (
    <ToastHost>
      <div className="abh-admin" dir={dir}>
        <style>{ADMIN_CSS}</style>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* السايدبار أول عنصر → مع dir=rtl يطلع يمين، ومع dir=ltr يطلع شمال تلقائيًا */}
          <div className="abh-desk">{SidebarInner}</div>

          {mobileOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 90 }} className="abh-mob">
              <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" }} />
              <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 280, background: "rgba(12,13,14,.98)" }}>{SidebarInner}</div>
            </div>
          )}

          <main style={{ flex: 1, minWidth: 0, padding: "0 clamp(16px,3vw,40px) 56px" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "18px 0", marginBottom: 10, background: "linear-gradient(180deg,rgba(0,0,0,.92),rgba(0,0,0,.5) 70%,transparent)", backdropFilter: "blur(8px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <button onClick={() => { setCollapsed((c) => !c); }} className="abh-desk" style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer" }}><Ic.menu s={17} /></button>
                <button onClick={() => setMobileOpen(true)} className="abh-mob-btn" style={{ placeItems: "center", height: 38, width: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer" }}><Ic.menu s={17} /></button>
                <span style={{ flex: 1 }} />
                <IconBtn icon={Ic.bell} label={t("تنبيهات", "Alerts")} />
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </ToastHost>
  );
}

const ADMIN_CSS = `
.abh-admin{
  --abh-ivory:#fff; --abh-platinum:#cbcdcd; --abh-steel:#666a6e;
  --abh-ease:cubic-bezier(0.16,1,0.3,1);
  --abh-ok:#9fd4b0; --abh-warn:#e8cf9a; --abh-bad:#e7b4b4;
  color:var(--abh-ivory);
  font-family:'IBM Plex Sans Arabic','Hanken Grotesk',system-ui,sans-serif;
  background-color:#000; min-height:100vh;
  background-image:
    radial-gradient(ellipse 90% 40% at 50% 0%, rgba(203,205,205,.06), transparent 70%),
    linear-gradient(180deg,#000,#050608 25%,#07080b 60%,#000);
}
.abh-admin .abh-display{font-family:'Cormorant Garamond',serif;}
.abh-admin .abh-num{font-variant-numeric:tabular-nums;font-family:'Cormorant Garamond',serif;}
.abh-admin .abh-flip{transform:scaleX(-1);}
.abh-admin .abh-lift{transition:transform .5s var(--abh-ease),border-color .4s var(--abh-ease),box-shadow .5s var(--abh-ease);}
.abh-admin .abh-lift:hover{transform:translateY(-4px);border-color:rgba(255,255,255,.18)!important;box-shadow:0 30px 70px -30px rgba(0,0,0,.8);}
.abh-admin .abh-imgcard:hover .abh-imgzoom{transform:scale(1.08);filter:grayscale(0) brightness(.62) contrast(1.05)!important;}
.abh-admin .abh-imgcard:hover .abh-img-actions{opacity:1!important;transform:translateY(0)!important;}
.abh-admin .abh-imgzoom{transition:transform 1.2s var(--abh-ease),filter 1.2s var(--abh-ease);}
@keyframes abh-ping{75%,100%{transform:scale(2.2);opacity:0;}}
@keyframes abh-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.7}100%{transform:translateY(-60px);opacity:0}}
@keyframes abh-fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes abh-scaleIn{from{opacity:0;transform:scale(.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes abh-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes abh-growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.abh-admin .abh-fade-up{animation:abh-fadeUp .55s var(--abh-ease) both;}
.abh-admin .abh-scale-in{animation:abh-scaleIn .4s var(--abh-ease) both;}
/* الشبكات — مسافات أفقية ورأسية صريحة (إصلاح تلاصق الكروت) */
.abh-admin .abh-grid-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:18px;row-gap:18px;}
.abh-admin .abh-grid-2-1{display:grid;grid-template-columns:1.6fr 1fr;column-gap:24px;row-gap:24px;}
.abh-admin .abh-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px;row-gap:24px;}
.abh-admin .abh-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));column-gap:24px;row-gap:24px;}
.abh-admin .abh-col{display:flex;flex-direction:column;gap:24px;}
.abh-admin .abh-mob-btn{display:none;}
@media (max-width:1100px){
  .abh-admin .abh-grid-kpi{grid-template-columns:repeat(2,minmax(0,1fr));}
  .abh-admin .abh-grid-2-1{grid-template-columns:1fr;}
  .abh-admin .abh-grid-2{grid-template-columns:1fr;}
}
@media (max-width:980px){
  .abh-admin .abh-desk{display:none!important;}
  .abh-admin .abh-mob-btn{display:grid!important;}
}
@media (min-width:981px){ .abh-admin .abh-mob{display:none!important;} }
@media (max-width:560px){ .abh-admin .abh-grid-kpi{grid-template-columns:1fr;} }
`;
