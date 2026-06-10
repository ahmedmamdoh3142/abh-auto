/**
 * lib/admin/guard.ts — حارس صفحات لوحة التحكم (SERVER ONLY).
 * يعيد استخدام getCurrentUser الموجود، ويسمح بالدخول لـ admin و staff فقط.
 */
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ALLOWED = new Set(["admin", "staff"]);

/** يستخدَم في بداية أي صفحة/راوت إدارية. يحوّل للصفحة الرئيسية لو مش مصرّح. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user || !ALLOWED.has((user as AdminUser).role)) {
    redirect("/");
  }
  return user as AdminUser;
}

/** نسخة للـ API routes: ترجع null بدل redirect. */
export async function getAdminOrNull(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user || !ALLOWED.has((user as AdminUser).role)) return null;
  return user as AdminUser;
}
