// app/api/admin/offer-bundles/route.ts — إدارة بندلات «خدمة + هدية» (admin CRUD).
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;
  return user;
}

/** GET — كل البندلات + خدماتها (triggers/gifts) + كم مرة اتطبّقت. */
export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await query<any>(
      `SELECT b.id, b.label, b.title, b.gift_mode, b.gift_percent, b.min_trigger_count,
              b.max_gifts, b.stackable, b.starts_at, b.expires_at, b.is_active, b.sort, b.created_at,
              COALESCE((SELECT count(*) FROM booking_bundle_gifts g WHERE g.bundle_id = b.id),0)::int AS used
       FROM offer_bundles b
       ORDER BY b.sort, b.created_at DESC`
    );
    const ids = rows.map((r) => r.id);
    const trg = ids.length ? await query<any>(`SELECT bundle_id, service_id FROM offer_bundle_triggers WHERE bundle_id = ANY($1)`, [ids]) : [];
    const gft = ids.length ? await query<any>(`SELECT bundle_id, service_id FROM offer_bundle_gifts    WHERE bundle_id = ANY($1)`, [ids]) : [];
    const tMap = new Map<string, number[]>(); const gMap = new Map<string, number[]>();
    for (const r of trg) { const a = tMap.get(r.bundle_id) ?? []; a.push(Number(r.service_id)); tMap.set(r.bundle_id, a); }
    for (const r of gft) { const a = gMap.get(r.bundle_id) ?? []; a.push(Number(r.service_id)); gMap.set(r.bundle_id, a); }

    const bundles = rows.map((b) => ({
      id: b.id, label: b.label, title: b.title ?? null,
      giftMode: b.gift_mode, giftPercent: Number(b.gift_percent) || 0,
      minTriggerCount: Number(b.min_trigger_count) || 1,
      maxGifts: Number(b.max_gifts) || 1,
      stackable: !!b.stackable,
      startsAt: b.starts_at ? new Date(b.starts_at).toISOString() : null,
      expiresAt: b.expires_at ? new Date(b.expires_at).toISOString() : null,
      isActive: !!b.is_active, sort: Number(b.sort) || 0,
      createdAt: new Date(b.created_at).toISOString(),
      used: Number(b.used) || 0,
      triggerIds: tMap.get(b.id) ?? [],
      giftIds: gMap.get(b.id) ?? [],
    }));
    return NextResponse.json({ ok: true, bundles });
  } catch (err) {
    console.error("GET /api/admin/offer-bundles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

function parseBody(b: any) {
  return {
    label: String(b.label ?? "").trim(),
    title: b.title && (b.title.ar || b.title.en) ? { ar: b.title.ar ?? "", en: b.title.en ?? "" } : null,
    giftMode: b.giftMode === "percent" ? "percent" : "free",
    giftPercent: b.giftMode === "percent" ? Math.max(0, Math.min(100, Number(b.giftPercent) || 0)) : 100,
    minTriggerCount: Math.max(1, Number(b.minTriggerCount) || 1),
    maxGifts: Math.max(1, Number(b.maxGifts) || 1),
    stackable: b.stackable === true,
    startsAt: b.startsAt ? new Date(b.startsAt).toISOString() : null,
    expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
    isActive: b.isActive !== false,
    sort: Number(b.sort) || 0,
    triggerIds: Array.isArray(b.triggerIds) ? b.triggerIds.map((x: any) => Number(x)).filter(Boolean) : [],
    giftIds: Array.isArray(b.giftIds) ? b.giftIds.map((x: any) => Number(x)).filter(Boolean) : [],
  };
}

async function syncServices(bundleId: string, triggerIds: number[], giftIds: number[]) {
  await query(`DELETE FROM offer_bundle_triggers WHERE bundle_id = $1`, [bundleId]);
  await query(`DELETE FROM offer_bundle_gifts    WHERE bundle_id = $1`, [bundleId]);
  for (const sid of triggerIds)
    await query(`INSERT INTO offer_bundle_triggers (bundle_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [bundleId, sid]);
  for (const sid of giftIds)
    await query(`INSERT INTO offer_bundle_gifts (bundle_id, service_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [bundleId, sid]);
}

/** POST — إنشاء بندل. */
export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const f = parseBody(await request.json());
    if (!f.label) return NextResponse.json({ ok: false, error: "label_required" });
    if (f.triggerIds.length === 0 || f.giftIds.length === 0)
      return NextResponse.json({ ok: false, error: "services_required" });

    const rows = await query<{ id: string }>(
      `INSERT INTO offer_bundles
         (label, title, gift_mode, gift_percent, min_trigger_count, max_gifts, stackable,
          starts_at, expires_at, is_active, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [f.label, f.title ? JSON.stringify(f.title) : null, f.giftMode, f.giftPercent,
       f.minTriggerCount, f.maxGifts, f.stackable, f.startsAt, f.expiresAt, f.isActive, f.sort]
    );
    await syncServices(rows[0].id, f.triggerIds, f.giftIds);
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/admin/offer-bundles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** PATCH — تعديل بندل (يشمل تفعيل/إيقاف سريع عبر toggleActive). */
export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });

    if (body.toggleActive != null && Object.keys(body).length <= 2) {
      await query(`UPDATE offer_bundles SET is_active = $2, updated_at = now() WHERE id = $1`, [id, !!body.toggleActive]);
      return NextResponse.json({ ok: true });
    }

    const f = parseBody(body);
    if (!f.label) return NextResponse.json({ ok: false, error: "label_required" });
    if (f.triggerIds.length === 0 || f.giftIds.length === 0)
      return NextResponse.json({ ok: false, error: "services_required" });

    await query(
      `UPDATE offer_bundles SET
         label=$2, title=$3, gift_mode=$4, gift_percent=$5, min_trigger_count=$6, max_gifts=$7,
         stackable=$8, starts_at=$9, expires_at=$10, is_active=$11, sort=$12, updated_at=now()
       WHERE id=$1`,
      [id, f.label, f.title ? JSON.stringify(f.title) : null, f.giftMode, f.giftPercent,
       f.minTriggerCount, f.maxGifts, f.stackable, f.startsAt, f.expiresAt, f.isActive, f.sort]
    );
    await syncServices(id, f.triggerIds, f.giftIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/offer-bundles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** DELETE ?id= — حذف بندل (الخدمات المرتبطة تُحذف عبر CASCADE). */
export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" });
    await query(`DELETE FROM offer_bundles WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/offer-bundles failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}