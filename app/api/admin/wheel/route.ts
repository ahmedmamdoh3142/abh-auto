// app/api/admin/wheel/route.ts — إدارة عجلة الحظ (الإعدادات + القطاعات).
//   GET    → الإعدادات + كل القطاعات (حتى غير النشطة)
//   PATCH  → تحديث الإعدادات (body.config)
//   POST   → إنشاء قطاع
//   PUT    → تعديل قطاع (body.id)
//   DELETE ?id= → حذف قطاع
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const u = await getCurrentUser();
  return u && (u.role === "admin" || u.role === "staff") ? u : null;
}

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const cfgRows = await query<any>(
      `SELECT is_active, title, subtitle, spin_day, per_user_cooldown_h, require_login, starts_at, expires_at
         FROM wheel_config WHERE id = 1`
    );
    const c = cfgRows[0] ?? {};
    const segs = await query<any>(
      `SELECT id, label, kind, value, gift_service_id, weight, hex, coupon_days, min_order, sort, is_active
         FROM wheel_segments ORDER BY sort, id`
    );
    return NextResponse.json({
      ok: true,
      config: {
        isActive: !!c.is_active,
        title: c.title ?? { ar: "عجلة الحظ", en: "Lucky Wheel" },
        subtitle: c.subtitle ?? { ar: "", en: "" },
        spinDay: Number(c.spin_day) ?? 5,
        cooldownH: Number(c.per_user_cooldown_h) || 168,
        requireLogin: c.require_login !== false,
        startsAt: c.starts_at ? new Date(c.starts_at).toISOString() : null,
        expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null,
      },
      segments: segs.map((s) => ({
        id: Number(s.id), label: s.label ?? { ar: "", en: "" }, kind: s.kind,
        value: Number(s.value) || 0, giftServiceId: s.gift_service_id != null ? Number(s.gift_service_id) : null,
        weight: Number(s.weight) || 0, hex: s.hex || "#cbcdcd",
        couponDays: Number(s.coupon_days) || 14, minOrder: Number(s.min_order) || 0,
        sort: Number(s.sort) || 0, isActive: !!s.is_active,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const { config: f } = await request.json();
    if (!f) return NextResponse.json({ ok: false, error: "config_required" });
    await query(
      `UPDATE wheel_config SET
         is_active = $1, title = $2, subtitle = $3, spin_day = $4,
         per_user_cooldown_h = $5, require_login = $6, starts_at = $7, expires_at = $8, updated_at = now()
       WHERE id = 1`,
      [
        f.isActive === true,
        JSON.stringify(f.title ?? { ar: "عجلة الحظ", en: "Lucky Wheel" }),
        f.subtitle ? JSON.stringify(f.subtitle) : null,
        Math.max(0, Math.min(6, Number(f.spinDay) || 0)),
        Math.max(1, Number(f.cooldownH) || 168),
        f.requireLogin !== false,
        f.startsAt ? new Date(f.startsAt).toISOString() : null,
        f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

function segParams(b: any) {
  const kind = ["promo_percent", "promo_fixed", "gift_service", "nothing"].includes(b.kind) ? b.kind : "promo_percent";
  return [
    JSON.stringify(b.label ?? { ar: "", en: "" }),
    kind,
    Math.max(0, Number(b.value) || 0),
    b.giftServiceId ? Number(b.giftServiceId) : null,
    Math.max(0, Number(b.weight) || 0),
    String(b.hex || "#cbcdcd"),
    Math.max(0, Number(b.couponDays) || 14),
    Math.max(0, Number(b.minOrder) || 0),
    Number(b.sort) || 0,
    b.isActive !== false,
  ];
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    const p = segParams(b);
    const rows = await query<{ id: number }>(
      `INSERT INTO wheel_segments
         (label, kind, value, gift_service_id, weight, hex, coupon_days, min_order, sort, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      p
    );
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/admin/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    const id = Number(b.id);
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });
    const p = segParams(b);
    await query(
      `UPDATE wheel_segments SET
         label=$1, kind=$2, value=$3, gift_service_id=$4, weight=$5, hex=$6,
         coupon_days=$7, min_order=$8, sort=$9, is_active=$10
       WHERE id=$11`,
      [...p, id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/admin/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });
    await query(`DELETE FROM wheel_segments WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}