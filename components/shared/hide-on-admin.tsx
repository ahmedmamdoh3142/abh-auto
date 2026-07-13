"use client";
/**
 * components/shared/hide-on-admin.tsx
 * يخفي أي محتوى (Navbar / Footer / WhatsApp FAB) داخل مسارات /admin.
 * الاستخدام في app/[locale]/layout.tsx (أو الـ root layout):
 *
 *   import HideOnAdmin from "@/components/shared/hide-on-admin";
 *   ...
 *   <HideOnAdmin><Navbar /></HideOnAdmin>
 *   {children}
 *   <HideOnAdmin><Footer /></HideOnAdmin>
 *   <HideOnAdmin><WhatsAppFab /></HideOnAdmin>
 */
import { usePathname } from "next/navigation";

export default function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // بيشيل البريفكس بتاع اللغة (/ar/admin أو /en/admin) ويتأكد من /admin
  const isAdmin = /(^|\/)admin(\/|$)/.test(pathname || "");
  const isMyWork = /(^|\/)my-work(\/|$)/.test(pathname || "");
  if (isAdmin || isMyWork) return null;
  return <>{children}</>;
}