// app/api/admin/promos/route.ts — إدارة أكواد الخصم (admin CRUD).
// (جديد) يرجّع بيانات المستلِم (recipient) للأكواد الموجّهة لشخص بعينه —
//   اسم + تليفون + إيميل + هل الكود من حملة — عشان يبان في الكرت مين الكود رايحله.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;
  return user;
}

/** GET — قائمة كل الأكواد + ملخّص استخدام لكل كود + بيانات المستلِم لو موجّه. */
export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await query<any>(
      `SELECT p.id, p.code, p.kind, p.label, p.description,
              COALESCE(p.discount_percent,0) AS discount_percent,
              p.fixed_amount, p.min_order, p.max_uses, p.used_count,
              p.per_user_limit, p.is_active, p.starts_at, p.expires_at, p.created_at,
              p.recipient_user_id, p.campaign_id,
              ru.name  AS recipient_name,
              ru.phone AS recipient_phone,
              ru.email AS recipient_email,
              c.label  AS campaign_label,
              COALESCE(r.redemptions,0)      AS redemptions,
              COALESCE(r.total_discount,0)   AS total_discount,
              COALESCE(r.total_revenue,0)    AS total_revenue,
              r.last_used_at
       FROM promo_codes p
       LEFT JOIN users ru ON ru.id = p.recipient_user_id
       LEFT JOIN promo_campaigns c ON c.id = p.campaign_id
       LEFT JOIN (
         SELECT promo_id,
                count(*)            AS redemptions,
                sum(discount_amount) AS total_discount,
                sum(order_total)     AS total_revenue,
                max(redeemed_at)     AS last_used_at
         FROM promo_redemptions GROUP BY promo_id
       ) r ON r.promo_id = p.id
       ORDER BY p.created_at DESC`
    );

    // خدمات كل كود (لأنواع service_*)
    const svc = await query<any>(
      `SELECT promo_id, service_id, amount_mode, value FROM promo_code_services`
    );
    const svcByPromo = new Map<string, any[]>();
    for (const s of svc) {
      const arr = svcByPromo.get(s.promo_id) ?? [];
      arr.push({ serviceId: Number(s.service_id), amountMode: s.amount_mode, value: Number(s.value) });
      svcByPromo.set(s.promo_id, arr);
    }

    const promos = rows.map((p) => ({
      id: p.id, code: p.code, kind: p.kind, label: p.label, description: p.description,
      discountPercent: Number(p.discount_percent) || 0,
      fixedAmount: Number(p.fixed_amount) || 0,
      minOrder: Number(p.min_order) || 0,
      maxUses: p.max_uses != null ? Number(p.max_uses) : null,
      usedCount: Number(p.used_count) || 0,
      perUserLimit: p.per_user_limit != null ? Number(p.per_user_limit) : null,
      isActive: !!p.is_active,
      startsAt: p.starts_at ? new Date(p.starts_at).toISOString() : null,
      expiresAt: p.expires_at ? new Date(p.expires_at).toISOString() : null,
      createdAt: new Date(p.created_at).toISOString(),
      redemptions: Number(p.redemptions) || 0,
      totalDiscount: Number(p.total_discount) || 0,
      totalRevenue: Number(p.total_revenue) || 0,
      lastUsedAt: p.last_used_at ? new Date(p.last_used_at).toISOString() : null,
      services: svcByPromo.get(p.id) ?? [],
      // ── (جديد) المستلِم: لو الكود موجّه لشخص بعينه (عجلة الحظ/ريفيرال/حملة) ──
      recipient: p.recipient_user_id ? {
        id: String(p.recipient_user_id),
        name: p.recipient_name ?? null,
        phone: p.recipient_phone ?? null,
        email: p.recipient_email ?? null,
      } : null,
      campaignId: p.campaign_id ?? null,
      campaignLabel: p.campaign_label ?? null,
    }));

    return NextResponse.json({ ok: true, promos });
  } catch (err) {
    console.error("GET /api/admin/promos failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** صياغة الحقول المشتركة من جسم الطلب. */
function parseBody(b: any) {
  const kind = String(b.kind ?? "percentage");
  return {
    code: String(b.code ?? "").trim(),
    kind,
    label: b.label ? String(b.label).trim() : null,
    description: b.description ? String(b.description).trim() : null,
    discountPercent: kind === "percentage" || kind === "service_percent" ? Math.max(0, Math.min(100, Number(b.discountPercent) || 0)) : 0,
    fixedAmount: kind === "fixed" ? Math.max(0, Number(b.fixedAmount) || 0) : 0,
    minOrder: Math.max(0, Number(b.minOrder) || 0),
    maxUses: b.maxUses != null && b.maxUses !== "" ? Math.max(1, Number(b.maxUses)) : null,
    perUserLimit: b.perUserLimit != null && b.perUserLimit !== "" ? Math.max(1, Number(b.perUserLimit)) : null,
    isActive: b.isActive !== false,
    startsAt: b.startsAt ? new Date(b.startsAt).toISOString() : null,
    expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
    services: Array.isArray(b.services) ? b.services.map((s: any) => ({
      serviceId: Number(s.serviceId),
      amountMode: s.amountMode === "fixed" ? "fixed" : "percent",
      value: Math.max(0, Number(s.value) || 0),
    })) : [],
  };
}

async function syncServices(promoId: string, kind: string, services: any[]) {
  await query(`DELETE FROM promo_code_services WHERE promo_id = $1`, [promoId]);
  if (kind !== "service_percent" && kind !== "service_each") return;
  for (const s of services) {
    if (!s.serviceId) continue;
    await query(
      `INSERT INTO promo_code_services (promo_id, service_id, amount_mode, value)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (promo_id, service_id) DO UPDATE SET amount_mode = EXCLUDED.amount_mode, value = EXCLUDED.value`,
      [promoId, s.serviceId, s.amountMode, s.value]
    );
  }
}

/** POST — إنشاء كود جديد (الاسم من الأدمن، مش تلقائي). */
export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const f = parseBody(await request.json());
    if (!f.code) return NextResponse.json({ ok: false, error: "code_required" });

    const dup = await query<any>(`SELECT 1 FROM promo_codes WHERE lower(code) = lower($1) LIMIT 1`, [f.code]);
    if (dup[0]) return NextResponse.json({ ok: false, error: "duplicate" });

    const rows = await query<{ id: string }>(
      `INSERT INTO promo_codes
         (code, kind, label, description, discount_percent, fixed_amount, min_order,
          max_uses, per_user_limit, is_active, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [f.code, f.kind, f.label, f.description, f.discountPercent, f.fixedAmount, f.minOrder,
       f.maxUses, f.perUserLimit, f.isActive, f.startsAt, f.expiresAt]
    );
    const id = rows[0].id;
    await syncServices(id, f.kind, f.services);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("POST /api/admin/promos failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** PATCH — تعديل كود (يشمل تفعيل/إيقاف). يقبل id. */
export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });

    // تبديل سريع للحالة فقط
    if (body.toggleActive != null && Object.keys(body).length <= 2) {
      await query(`UPDATE promo_codes SET is_active = $2, updated_at = now() WHERE id = $1`, [id, !!body.toggleActive]);
      return NextResponse.json({ ok: true });
    }

    const f = parseBody(body);
    if (!f.code) return NextResponse.json({ ok: false, error: "code_required" });
    const dup = await query<any>(`SELECT 1 FROM promo_codes WHERE lower(code)=lower($1) AND id<>$2 LIMIT 1`, [f.code, id]);
    if (dup[0]) return NextResponse.json({ ok: false, error: "duplicate" });

    await query(
      `UPDATE promo_codes SET
         code=$2, kind=$3, label=$4, description=$5, discount_percent=$6, fixed_amount=$7,
         min_order=$8, max_uses=$9, per_user_limit=$10, is_active=$11, starts_at=$12, expires_at=$13,
         updated_at=now()
       WHERE id=$1`,
      [id, f.code, f.kind, f.label, f.description, f.discountPercent, f.fixedAmount,
       f.minOrder, f.maxUses, f.perUserLimit, f.isActive, f.startsAt, f.expiresAt]
    );
    await syncServices(id, f.kind, f.services);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/promos failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** DELETE ?id= — حذف كود (والخدمات/السجل عبر ON DELETE). */
export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });
    await query(`DELETE FROM promo_codes WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/promos failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}