/**
 * lib/analytics.ts — طبقة تتبّع مركزية لـ ABH Auto (GA4 عبر Google Tag Manager).
 *
 * الفكرة: بدل ما تكتب gtag/dataLayer في كل مكان، تستدعي دالة واضحة (مثلاً
 * trackBeginCheckout) وهي اللي بتبعت الحدث للـ dataLayer بصيغة GA4 القياسية.
 *
 * • الأحداث بتتبعت بس لو المستخدم وافق على الكوكيز (hasConsent).
 * • أسماء الأحداث القياسية لـ GA4 (page_view, begin_checkout, purchase…)
 *   عشان تشتغل مع التقارير الجاهزة، + أحداث مخصّصة لخطوات الحجز.
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";   // مثال: GTM-XXXXXXX
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || "";   // مثال: G-XXXXXXXXXX

type DL = Record<string, any>;

// مفتاح تخزين موافقة الكوكيز
export const CONSENT_KEY = "abh_cookie_consent";

declare global {
  interface Window {
    dataLayer?: DL[];
  }
}

/** هل المستخدم وافق على التتبّع؟ (يُقرأ من localStorage) */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

/** دفع أي حدث للـ dataLayer (لو فيه موافقة فقط). */
export function pushEvent(event: string, params: DL = {}): void {
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/* ════════════════ أحداث عامّة ════════════════ */

/** مشاهدة صفحة (تُستدعى عند تغيير المسار في App Router). */
export function trackPageView(url: string, title?: string): void {
  pushEvent("page_view", { page_path: url, page_title: title ?? (typeof document !== "undefined" ? document.title : "") });
}

/* ════════════════ قمع الحجز (Booking Funnel) ════════════════
   الترتيب: view → begin_checkout → اختيار خدمة → بيانات السيارة →
   بيانات العميل → اختيار الموعد → محاولة الدفع → نجاح (purchase).
   كل خطوة بتتسجّل عشان تعرف مين وقف فين.
*/

/** دخل صفحة الحجز (بداية القمع). */
export function trackBookingView(): void {
  pushEvent("booking_view", { funnel: "booking", step: 0, step_name: "view" });
}

/** بدأ فعليًا في الحجز (begin_checkout القياسي لـ GA4). */
export function trackBeginCheckout(meta: DL = {}): void {
  pushEvent("begin_checkout", { funnel: "booking", step: 1, step_name: "begin", ...meta });
}

/** اختار خدمة/خدمات. */
export function trackSelectServices(services: { name: string; price?: number }[], total?: number): void {
  pushEvent("select_services", {
    funnel: "booking", step: 2, step_name: "services",
    items: services.map((s) => ({ item_name: s.name, price: s.price ?? 0 })),
    value: total ?? 0, currency: "SAR",
  });
}

/** أدخل بيانات السيارة (ماركة/موديل/مقاس). */
export function trackVehicleInfo(meta: DL = {}): void {
  pushEvent("vehicle_info", { funnel: "booking", step: 3, step_name: "vehicle", ...meta });
}

/** أدخل بيانات العميل (اسم/تليفون). */
export function trackCustomerInfo(meta: DL = {}): void {
  pushEvent("add_customer_info", { funnel: "booking", step: 4, step_name: "customer", ...meta });
}

/** اختار الموعد والفرع. */
export function trackSchedule(meta: DL = {}): void {
  pushEvent("select_schedule", { funnel: "booking", step: 5, step_name: "schedule", ...meta });
}

/** ضغط «تأكيد/إنشاء الحجز» (محاولة). */
export function trackBookingSubmit(meta: DL = {}): void {
  pushEvent("booking_submit", { funnel: "booking", step: 6, step_name: "submit", ...meta });
}

/** نجح الحجز فعليًا (purchase القياسي لـ GA4 — يظهر في تقارير التحويل). */
export function trackBookingSuccess(args: {
  reference: string;
  value: number;
  services?: { name: string; price?: number }[];
  paymentMethod?: string;
}): void {
  pushEvent("purchase", {
    funnel: "booking", step: 7, step_name: "success",
    transaction_id: args.reference,
    value: args.value,
    currency: "SAR",
    payment_type: args.paymentMethod ?? "",
    items: (args.services ?? []).map((s) => ({ item_name: s.name, price: s.price ?? 0 })),
  });
}

/** فشل الحجز (عشان تعرف نسبة الأخطاء). */
export function trackBookingError(reason: string): void {
  pushEvent("booking_error", { funnel: "booking", step_name: "error", reason });
}

/* ════════════════ أحداث إضافية مفيدة ════════════════ */

/** لفّ عجلة الحظ. */
export function trackWheelSpin(won: boolean, prize?: string): void {
  pushEvent("wheel_spin", { won, prize: prize ?? "" });
}

/** طبّق كود خصم. */
export function trackPromoApplied(code: string, ok: boolean): void {
  pushEvent("promo_applied", { promo_code: code, success: ok });
}

/** ضغط واتساب / اتصال. */
export function trackContact(channel: "whatsapp" | "call" | "email"): void {
  pushEvent("contact_click", { channel });
}