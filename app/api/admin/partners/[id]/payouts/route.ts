/**
 * app/api/admin/partners/[id]/payouts/route.ts — سداد عمولات الشركة
 *
 *   GET    → سجل الدفعات (+ صورة إثبات التحويل) + ملخّص (المستحق/المدفوع/المتبقّي)
 *   POST   → تسجيل دفعة جديدة  body:{ amount, method?, reference?, note?, proofImage? }
 *   DELETE ?payoutId=...  → حذف دفعة (تصحيح خطأ) — يحذف معها صورة الإثبات من القرص.
 *
 * مفهوم: العمولة من حقّ الشركة. هنا تسجّل ما سدّدته لها منها.
 * المستحق (earned) يُحسب من v_partner_commission_ledger — وهو الآن مقصور
 * على الحجوزات المدفوعة فقط (payment_status='paid').
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import path from "path";
import { promises as fs } from "fs";

async function ledger(partnerId: string) {
  const rows = await query<any>(
    `SELECT commission_earned, commission_paid
       FROM v_partner_commission_ledger
      WHERE partner_id = $1`,
    [partnerId]
  );
  const earned = Number(rows[0]?.commission_earned) || 0;
  const paid = Number(rows[0]?.commission_paid) || 0;
  return { earned, paid, outstanding: Math.max(earned - paid, 0) };
}

/** حذف صورة إثبات من القرص بأمان (داخل /payouts-img/ فقط). */
async function unlinkProof(rel: string | null) {
  if (!rel) return;
  const seg = rel.replace(/^\//, "").split("/")[0];
  if (seg !== "payouts-img" || rel.includes("..")) return;
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  await fs.unlink(abs).catch(() => {});
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { id: partnerId } = await (ctx as any).params;

    const payouts = await query<any>(
      `SELECT pp.id, pp.amount, pp.method, pp.reference, pp.note, pp.proof_image, pp.paid_at,
              u.name AS by_name
         FROM partner_commission_payouts pp
         LEFT JOIN users u ON u.id = pp.created_by
        WHERE pp.partner_id = $1
        ORDER BY pp.paid_at DESC`,
      [partnerId]
    );

    const summary = await ledger(partnerId);

    return NextResponse.json({
      ok: true,
      summary,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        method: p.method ?? "",
        reference: p.reference ?? "",
        note: p.note ?? "",
        proofImage: p.proof_image ?? "",
        paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null,
        byName: p.by_name ?? "",
      })),
    });
  } catch (err) {
    console.error("GET payouts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { id: partnerId } = await (ctx as any).params;

    const b = await request.json();
    const amount = Number(b.amount) || 0;
    const method = b.method ? String(b.method).trim() : null;
    const reference = b.reference ? String(b.reference).trim() : null;
    const note = b.note ? String(b.note).trim() : null;
    // صورة الإثبات: مسار صورة مرفوعة عبر /api/admin/upload.
    // نقبلها لو كانت مسارًا داخليًا لصورة مرفوعة (payouts-img أو services-img احتياطًا)،
    // ونرفض فقط المسارات الخارجية/المشبوهة. نسجّل القيمة الواصلة لتسهيل التشخيص.
    let proofImage: string | null = b.proofImage ? String(b.proofImage).trim() : null;
    console.log("[payouts POST] received proofImage =", JSON.stringify(b.proofImage));
    if (proofImage) {
      const okPrefix = proofImage.startsWith("/payouts-img/") || proofImage.startsWith("/services-img/");
      if (!okPrefix || proofImage.includes("..")) {
        console.warn("[payouts POST] rejected proofImage (bad prefix):", proofImage);
        proofImage = null;
      }
    }

    if (!(amount > 0)) return NextResponse.json({ ok: false, error: "invalid_amount" }, { status: 400 });

    // لا تسمح بدفع أكثر من المتبقّي (مع هامش بسيط)
    const before = await ledger(partnerId);
    if (amount > before.outstanding + 0.01) {
      return NextResponse.json({ ok: false, error: "exceeds_outstanding", outstanding: before.outstanding }, { status: 400 });
    }

    await query(
      `INSERT INTO partner_commission_payouts (partner_id, amount, method, reference, note, proof_image, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [partnerId, amount, method, reference, note, proofImage, admin.id ?? null]
    );

    const after = await ledger(partnerId);
    return NextResponse.json({ ok: true, summary: after });
  } catch (err) {
    console.error("POST payouts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { id: partnerId } = await (ctx as any).params;

    const { searchParams } = new URL(request.url);
    const payoutId = searchParams.get("payoutId");
    if (!payoutId) return NextResponse.json({ ok: false, error: "payout_required" }, { status: 400 });

    // اجلب الصورة قبل الحذف لتنظيف القرص
    const rows = await query<any>(
      `SELECT proof_image FROM partner_commission_payouts WHERE id = $1 AND partner_id = $2`,
      [payoutId, partnerId]
    );
    await query(`DELETE FROM partner_commission_payouts WHERE id = $1 AND partner_id = $2`, [payoutId, partnerId]);
    await unlinkProof(rows[0]?.proof_image ?? null);

    const after = await ledger(partnerId);
    return NextResponse.json({ ok: true, summary: after });
  } catch (err) {
    console.error("DELETE payouts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}