/**
 * app/api/admin/services/route.ts — CRUD للخدمات (سطح الكتالوج) · v2
 * • name/description ثنائية اللغة؛ tagline = name (نفس القيمة بالظبط حسب الطلب).
 * • الأسعار لكل حجم في service_prices (price + old_price).
 * • المشمولات في service_includes (label jsonb ثنائي + sort).
 * • الضمان (سنوات) والمدة (أيام) تتبني جملهم الثنائية في الكود من رقم واحد.
 * • slug يتولّد تلقائيًا (اتشال من الواجهة).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { cleanLoc, type Loc } from "@/lib/admin/i18n-json";

type SizePrice = { price: number; old: number };
type Body = {
  id?: number; slug?: string; categoryId: number | null;
  name: Loc; description?: Loc;
  prices?: Record<string, SizePrice>;
  includes?: Loc[];
  warrantyYears?: number; durationDays?: number;
  image?: string; badge?: string;
  onRequest?: boolean; featured?: boolean; active?: boolean; sort?: number;
};

const SIZES = ["small", "medium", "large"] as const;
const j = (v: Loc | null) => (v ? JSON.stringify(cleanLoc(v)) : null);

/* بناء جملة الضمان/المدة الثنائية من رقم (الثوابت من الكود) */
function arYears(n: number) { return n === 1 ? "سنة" : n === 2 ? "سنتين" : n >= 3 && n <= 10 ? "سنوات" : "سنة"; }
function arDays(n: number) { return n === 1 ? "يوم" : n === 2 ? "يومين" : n >= 3 && n <= 10 ? "أيام" : "يوم"; }
const warrantyLoc = (y?: number): Loc | null => (y && y > 0 ? { ar: `ضمان ${y} ${arYears(y)}`, en: `${y}-Year Warranty` } : null);
const durationLoc = (d?: number): Loc | null => (d && d > 0 ? { ar: `${d} ${arDays(d)}`, en: `${d} ${d === 1 ? "day" : "days"}` } : null);

function makeSlug(b: Body): string {
  const base = (b.name?.en || b.name?.ar || "service")
    .toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "service";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function writePrices(serviceId: number, prices?: Record<string, SizePrice>, onRequest?: boolean) {
  await query(`DELETE FROM service_prices WHERE service_id = $1`, [serviceId]);
  if (onRequest || !prices) return;
  for (const size of SIZES) {
    const p = prices[size];
    if (!p || !(p.price > 0)) continue;
    await query(
      `INSERT INTO service_prices (service_id, size_code, price, old_price) VALUES ($1,$2,$3,$4)`,
      [serviceId, size, p.price, p.old && p.old > p.price ? p.old : null]
    );
  }
}
async function writeIncludes(serviceId: number, includes?: Loc[]) {
  await query(`DELETE FROM service_includes WHERE service_id = $1`, [serviceId]);
  if (!includes?.length) return;
  let sort = 0;
  for (const inc of includes) {
    const c = cleanLoc(inc);
    if (!c.ar && !c.en) continue;
    await query(`INSERT INTO service_includes (service_id, label, sort) VALUES ($1,$2::jsonb,$3)`, [serviceId, JSON.stringify(c), sort++]);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = (await request.json()) as Body;
    if (!b.name?.ar && !b.name?.en) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });

    const slug = makeSlug(b);
    const pricingModel = b.onRequest ? "on_request" : "fixed";

    const rows = await query<{ id: number }>(
      `INSERT INTO services
         (category_id, surface, slug, name, tagline, description, duration, warranty_duration,
          image, badge, pricing_model, is_on_request, is_featured, is_active, sort)
       VALUES ($1,'catalog',$2,$3::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,
               $7,$8,$9::public.pricing_model,$10,$11,$12,$13)
       RETURNING id`,
      [
        b.categoryId, slug, j(b.name), j(b.description ?? null), j(durationLoc(b.durationDays)), j(warrantyLoc(b.warrantyYears)),
        b.image || null, b.badge || null, pricingModel, !!b.onRequest, !!b.featured, b.active !== false, b.sort || 0,
      ]
    );
    const id = rows[0].id;
    await writePrices(id, b.prices, b.onRequest);
    await writeIncludes(id, b.includes);
    return NextResponse.json({ ok: true, id, slug });
  } catch (err) {
    console.error("POST /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const b = (await request.json()) as Body;
    if (!b.id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    const pricingModel = b.onRequest ? "on_request" : "fixed";
    await query(
      `UPDATE services SET
         category_id=$2, name=$3::jsonb, tagline=$3::jsonb, description=$4::jsonb,
         duration=$5::jsonb, warranty_duration=$6::jsonb, image=$7, badge=$8,
         pricing_model=$9::public.pricing_model, is_on_request=$10, is_featured=$11,
         is_active=$12, updated_at=now()
       WHERE id=$1`,
      [
        b.id, b.categoryId, j(b.name), j(b.description ?? null), j(durationLoc(b.durationDays)), j(warrantyLoc(b.warrantyYears)),
        b.image || null, b.badge || null, pricingModel, !!b.onRequest, !!b.featured, b.active !== false,
      ]
    );
    // الأسعار والمشمولات تتبعت بس لو موجودة في الطلب (التبديل السريع للحالة مايبعتش الكل)
    if (b.prices !== undefined) await writePrices(b.id, b.prices, b.onRequest);
    if (b.includes !== undefined) await writeIncludes(b.id, b.includes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    await query(`DELETE FROM service_prices WHERE service_id=$1`, [id]).catch(() => {});
    await query(`DELETE FROM service_includes WHERE service_id=$1`, [id]).catch(() => {});
    await query(`DELETE FROM services WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/services failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}