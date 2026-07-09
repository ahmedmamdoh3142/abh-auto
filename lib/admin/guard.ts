/**
 * lib/admin/guard.ts — حارس صفحات لوحة التحكم (SERVER ONLY).
 * admin/staff فقط، مع تحميل الصلاحيات (permissions + is_super_admin) والتحقق منها.
 */
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPerm, firstAllowedPage, type PermKey } from "@/lib/admin/permissions";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
};

const ALLOWED = new Set(["admin", "staff"]);

/** يحمّل المستخدم الإداري بصلاحياته من الجلسة. */
async function loadAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user || !ALLOWED.has((user as any).role)) return null;

  const permissions = (user as any).permissions;
  return {
    id: (user as any).id,
    name: (user as any).name,
    email: (user as any).email,
    role: (user as any).role,
    jobTitle: (user as any).job_title ?? null,
    permissions: Array.isArray(permissions) ? permissions : [],
    isSuperAdmin: !!(user as any).is_super_admin,
  };
}

/** بداية أي صفحة إدارية: يتأكد من الدخول (بدون صلاحية صفحة محددة). */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await loadAdminUser();
  if (!user) redirect("/");
  return user;
}

/** يتأكد من صلاحية صفحة معيّنة؛ لو ممنوع يوجّه لأول صفحة مسموحة (أو الرئيسية). */
export async function requirePermission(key: PermKey): Promise<AdminUser> {
  const user = await loadAdminUser();
  if (!user) redirect("/");
  if (!hasPerm(user, key)) {
    const first = firstAllowedPage(user);
    redirect(first ? first.href : "/");
  }
  return user;
}

/** نسخة API: ترجع null بدل redirect. */
export async function getAdminOrNull(): Promise<AdminUser | null> {
  return loadAdminUser();
}

/** نسخة API مع صلاحية: ترجع المستخدم أو null لو ممنوع. */
export async function getAdminWithPerm(key: PermKey): Promise<AdminUser | null> {
  const user = await loadAdminUser();
  if (!user || !hasPerm(user, key)) return null;
  return user;
}