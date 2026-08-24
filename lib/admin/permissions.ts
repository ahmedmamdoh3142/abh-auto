/**
 * lib/admin/permissions.ts — تعريف صفحات لوحة التحكم وصلاحياتها (مصدر الحقيقة).
 * الصلاحية = القدرة على دخول صفحة. نبدأ بمستوى الصفحة (لاحقًا نضيف أدق).
 *
 * يُستخدم على الخادم والعميل (لا server-only هنا).
 */
export type PermKey =
  | "overview"
  | "bookings"
  | "bookings_new"
  | "partners"
  | "accounts"
  | "content"
  | "services"
  | "price_files"
  | "inventory"
  | "promos"
  | "offers"
  | "sales_tasks"
  | "maintenance"
  | "inquiries";

export type AdminPage = {
  key: PermKey;
  href: string;
  ar: string;
  en: string;
  group: { ar: string; en: string };
};

/** ترتيب الصفحات = ترتيب الأولوية في التوجيه لأول صفحة مسموحة. */
export const ADMIN_PAGES: AdminPage[] = [
  { key: "overview",     href: "/admin",               ar: "نظرة عامة",       en: "Overview",           group: { ar: "الواجهة", en: "Overview" } },
  { key: "bookings",     href: "/admin/bookings",      ar: "الحجوزات",        en: "Bookings",           group: { ar: "الواجهة", en: "Overview" } },
  { key: "bookings_new", href: "/admin/bookings/new",  ar: "حجز جديد",        en: "New booking",        group: { ar: "الواجهة", en: "Overview" } },
  { key: "sales_tasks",  href: "/admin/sales-tasks",   ar: "متابعة المبيعات", en: "Sales follow-up",    group: { ar: "المبيعات", en: "Sales" } },
    { key: "maintenance",  href: "/admin/maintenance",   ar: "صيانة الضمان",    en: "Warranty maintenance", group: { ar: "التشغيل", en: "Operations" } },
  { key: "inquiries",    href: "/admin/inquiries",     ar: "الاستفسارات",     en: "Inquiries",          group: { ar: "التواصل", en: "Communication" } },
  { key: "partners",     href: "/admin/partners",      ar: "الشركاء",         en: "Partners",           group: { ar: "الشركاء والحسابات", en: "Partners & accounts" } },
  { key: "accounts",     href: "/admin/accounts",      ar: "الحسابات",        en: "Accounts",           group: { ar: "الشركاء والحسابات", en: "Partners & accounts" } },
  { key: "content",      href: "/admin/content",       ar: "نصوص الصفحات",    en: "Page content",       group: { ar: "محتوى الموقع", en: "Site content" } },
  { key: "services",     href: "/admin/services",      ar: "الخدمات والأسعار", en: "Services & pricing", group: { ar: "محتوى الموقع", en: "Site content" } },
  { key: "price_files",  href: "/admin/price-files",   ar: "ملفات الأسعار",   en: "Price files",        group: { ar: "محتوى الموقع", en: "Site content" } },
  { key: "promos",       href: "/admin/promos",        ar: "أكواد الخصم",     en: "Promo codes",        group: { ar: "محتوى الموقع", en: "Site content" } },
  { key: "inventory",    href: "/admin/inventory",     ar: "المخازن",         en: "Inventory",          group: { ar: "التشغيل", en: "Operations" } },
  { key: "offers",       href: "/admin/offers",        ar: "العروض والولاء",  en: "Offers & loyalty",   group: { ar: "محتوى الموقع", en: "Site content" } },
];

export const ALL_PERM_KEYS: PermKey[] = ADMIN_PAGES.map((p) => p.key);

/** يطابق مسارًا لصفحة (لأطول href مطابق — عشان /admin ما تلقفش كل حاجة). */
export function pageForPath(pathname: string): AdminPage | null {
  let best: AdminPage | null = null;
  for (const p of ADMIN_PAGES) {
    const match = p.href === "/admin"
      ? pathname === "/admin"
      : pathname === p.href || pathname.startsWith(p.href + "/");
    if (match && (!best || p.href.length > best.href.length)) best = p;
  }
  return best;
}

/** هل يملك المستخدم صلاحية مفتاح معيّن؟ (super admin يملك كل شيء.) */
export function hasPerm(
  user: { isSuperAdmin?: boolean; permissions?: string[] } | null | undefined,
  key: PermKey
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
}

/** أول صفحة مسموحة للمستخدم (للتوجيه بعد الدخول). */
export function firstAllowedPage(
  user: { isSuperAdmin?: boolean; permissions?: string[] } | null | undefined
): AdminPage | null {
  for (const p of ADMIN_PAGES) if (hasPerm(user, p.key)) return p;
  return null;
}