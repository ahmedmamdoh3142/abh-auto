// دوال أسعار الحجز + النوع — آمنة للاستيراد في الـ client (لا تلمس قاعدة البيانات)
import type { ServiceMeta, VehicleSize } from "@/lib/booking-data";

export interface DbServiceMeta extends ServiceMeta {
  id: number;            // معرّف الخدمة في القاعدة — مطلوب لربط أكواد الخصم بالخدمات
  name: string;
  desc: string;
  prices: Record<VehicleSize, number>;
  oldPrices: Record<VehicleSize, number | null>;
  discountPercent: number; // لم يعد مستخدمًا في الحساب — الخصم يُحسب لكل حجم
}

// السعر الحالي (بعد الخصم) للحجم
export function dbPriceFor(service: DbServiceMeta, size: VehicleSize): number {
  if (service.onRequest) return 0;
  return service.prices[size] ?? service.prices.large ?? 0;
}

// السعر القديم (قبل الخصم) للحجم — يُرجَع فقط لو موجود وأكبر فعلاً من الجديد (عشان يتشطب عليه)
export function dbOldPriceFor(service: DbServiceMeta, size: VehicleSize): number | null {
  if (service.onRequest) return null;
  const old = service.oldPrices[size] ?? null;
  const now = service.prices[size] ?? service.prices.large ?? 0;
  return old != null && old > now ? old : null;
}

// نسبة الخصم لهذا الحجم — تُحسب أوتوماتيك من (القديم − الجديد) ÷ القديم لكل حجم على حدة
export function dbDiscountPct(service: DbServiceMeta, size: VehicleSize): number {
  if (service.onRequest) return 0;
  const now = service.prices[size] ?? service.prices.large ?? 0;
  const old = service.oldPrices[size] ?? null;
  if (old == null || old <= now) return 0;
  return Math.round((1 - now / old) * 100);
}