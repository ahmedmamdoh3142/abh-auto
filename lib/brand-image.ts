/**
 * lib/brand-image.ts — صورة خلفية الكرت حسب ماركة السيارة.
 *
 * الفكرة: كل ماركة لها صورة ثابتة واحدة في public/brands/<brand_id>.webp
 * (الاسم = نفس id الماركة في جدول brands، مثل mercedes_benz.webp).
 * كل سيارات نفس الماركة تاخد نفس الصورة بغضّ النظر عن الموديل.
 *
 * لو الماركة غير معروفة أو مالهاش صورة → نرجع لصورة محايدة واحدة
 * (public/brands/_default.webp) بدل أي صورة عشوائية — أنضف بصريًا
 * وثابت دائمًا، فالكرت ما يبقاش فاضي ولا عشوائي.
 *
 * الاستخدام:
 *   import { brandImg } from "@/lib/brand-image";
 *   const bg = brandImg(booking.brandId);
 */

/** قائمة معرّفات الماركات اللي عندها صورة مرفوعة في public/brands/.
 *  أي ماركة هنا = الكرت هياخد /brands/<id>.webp.
 *  (مطابقة لمعرّفات جدول brands.) */
const BRANDS_WITH_IMAGE = new Set<string>([
  "baic", "dongfeng", "foton", "gwm", "isuzu", "jac", "jaecoo", "mini",
  "omoda", "opel", "peugeot", "renault", "skoda", "subaru", "tank", "xpeng",
  "zeekr", "aston_martin", "audi", "bmw", "byd", "bentley", "cadillac",
  "changan", "chery", "chevrolet", "dodge", "exeed", "ferrari", "ford",
  "gac", "gmc", "geely", "genesis", "haval", "honda", "hongqi", "hyundai",
  "infiniti", "jaguar", "jeep", "jetour", "kia", "lamborghini", "land_rover",
  "lexus", "lincoln", "lucid", "mg", "maserati", "mazda", "mclaren",
  "mercedes_benz", "mitsubishi", "nissan", "porsche", "ram", "rolls_royce",
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