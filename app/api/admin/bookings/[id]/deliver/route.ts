/**
 * app/api/admin/bookings/[id]/deliver/route.ts — تسليم السيارة للعميل.
 *
 * POST { photos:[{url,comment}], signatureUrl, signerName?, notes? }
 *   • يتحقق: الحجز في مرحلة 'ready' + توقيع العميل إجباري.
 *   • يحفظ صور التسليم (phase='delivery') وتوقيع التسليم.
 *   • ينقل الحجز: status='completed'، delivered_at=now()، stage=3.
 *   • يسجّل الحدث في work_order_events.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const b = await request.json();
    const signatureUrl = String(b.signatureUrl ?? "").trim();
    const signerName = b.signerName ? String(b.signerName).trim() : null;
    const notes = b.notes ? String(b.notes).trim() : null;
    const photos: { url: string; comment?: string }[] = Array.isArray(b.photos) ? b.photos : [];

    if (!signatureUrl) return bad("signature_required");

    const cur = await query<any>(`SELECT work_stage, status FROM bookings WHERE id = $1`, [id]);
    if (!cur[0]) return bad("not_found", 404);
    if (cur[0].status === "cancelled") return bad("booking_cancelled");
    if (cur[0].work_stage !== "ready") return bad("not_ready");

    // صور التسليم
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!p?.url) continue;
      await query(
        `INSERT INTO booking_inspection_photos (booking_id, phase, url, comment, sort, created_by)
         VALUES ($1, 'delivery', $2, $3, $4, $5)`,
        [id, String(p.url), p.comment ? String(p.comment).trim() : null, i, admin.id]
      );
    }

    // توقيع التسليم
    await query(
      `INSERT INTO booking_signatures (booking_id, phase, image_url, signer_name, stage_snapshot)
       VALUES ($1, 'delivery', $2, $3, 'ready')`,
      [id, signatureUrl, signerName]
    );

    // إتمام الحجز
    await query(
      `UPDATE bookings
          SET status = 'completed', delivered_at = now(), stage = 3,
              qc_notes = COALESCE($2, qc_notes), updated_at = now()
        WHERE id = $1`,
      [id, notes]
    );

    await query(
      `INSERT INTO work_order_events (booking_id, event, actor_id, meta)
       VALUES ($1, 'delivered', $2, $3::jsonb)`,
      [id, admin.id, JSON.stringify({ photos: photos.length })]
    ).catch(() => {});

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1, 'completed', 3, $2)`,
      [id, `تم التسليم بواسطة ${admin.name}`]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST deliver failed:", err);
    return bad("server_error", 500);
  }
}