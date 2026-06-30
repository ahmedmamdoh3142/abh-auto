/**
 * lib/brand-image.ts — صورة خلفية الكرت حسب ماركة السيارة.
 *
 * الفكرة: كل ماركة لها صورة ثابتة واحدة في public/brands/<brand_id>.webp
 * (الاسم = نفس id الماركة في جدول brands، مثل mercedes_benz.webp).
 * كل سيارات نفس الماركة تاخد نفس الصورة بغضّ النظر عن الموديل.
 *
 * أي ماركة مش موجودة في القائمة تحت (لسه ماترفعش صورتها) → تاخد صورة
 * محايدة واحدة public/brands/_default.webp بدل ما تبقى فاضية.
 *
 * مهم: القائمة دي لازم تحتوي بس على الماركات اللي صورتها موجودة فعلًا
 * في public/brands/. لو رفعت صورة ماركة جديدة، ضيف معرّفها هنا.
 *
 * الاستخدام:
 *   import { brandImg } from "@/lib/brand-image";
 *   const bg = brandImg(booking.brandId);
 */

/** معرّفات الماركات اللي صورتها موجودة فعلًا في public/brands/.
 *  (الـ17 ماركة الناقصة مش هنا، فتاخد _default تلقائيًا.) */
const BRANDS_WITH_IMAGE = new Set<string>([
  "gwm", "mini", "opel", "peugeot", "renault", "skoda", "subaru",
  "aston_martin", "audi", "bmw", "byd", "bentley", "cadillac",
  "changan", "chevrolet", "dodge", "ferrari", "ford",
  "gmc", "geely", "haval", "honda", "hyundai",
  "infiniti", "jaguar", "jeep", "jetour", "kia", "lamborghini", "land_rover",
  "lexus", "lucid", "mg", "maserati", "mazda", "mclaren",
  "mercedes_benz", "mitsubishi", "nissan", "porsche", "rolls_royce",
  "suzuki", "tesla", "toyota", "volkswagen",
]);

/** الصورة المحايدة لأي ماركة بدون صورة (أو حجز قديم بدون brand_id). */
const DEFAULT_IMAGE = "/brands/_default.webp";

/**
 * صورة خلفية الكرت حسب الماركة.
 * @param brandId  معرّف الماركة (brands.id) — مثل "mercedes_benz".
 * @param _seed    (غير مستخدم — مُبقى للتوافق مع النداءات القديمة فقط).
 */
export function brandImg(brandId?: string | null, _seed?: string | null): string {
  const id = (brandId || "").trim().toLowerCase();
  if (id && BRANDS_WITH_IMAGE.has(id)) {
    return `/brands/${id}.webp`;
  }
  return DEFAULT_IMAGE;
}

/** هل الماركة عندها صورة فعلًا؟ (لو احتجت تفرّق في العرض) */
export function hasBrandImg(brandId?: string | null): boolean {
  const id = (brandId || "").trim().toLowerCase();
  return !!id && BRANDS_WITH_IMAGE.has(id);
}