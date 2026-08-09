// app/api/admin/promos/[id]/commission-payouts/route.ts — صرف عمولة كود مؤثر (كامل/جزئي).
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;
  return user;
}

async function outstandingFor(promoId: string) {
  const earnedRows = await query<any>(
    `SELECT COALESCE(sum(commission_amount),0) AS earned
     FROM promo_redemptions WHERE promo_id = $1 AND paid_at IS NOT NULL`,
    [promoId]
  );
  const paidRows = await query<any>(
    `SELECT COALESCE(sum(amount),0) AS paid FROM promo_commission_payouts WHERE promo_id = $1`,
    [promoId]
  );
  const earned = Number(earnedRows[0]?.earned) || 0;
  const paid = Number(paidRows[0]?.paid) || 0;
  return { earned, paid, outstanding: Math.max(0, earned - paid) };
}

/** POST — تسجيل دفعة عمولة (كاملة أو جزئية). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const b = await request.json();
    const amount = Math.round(Number(b.amount) || 0);
    if (amount <= 0) return NextResponse.json({ ok: false, error: "amount_required" });

    const { outstanding } = await outstandingFor(id);
    if (amount > outstanding + 1 /* هامش تقريب بسيط */) {
      return NextResponse.json({ ok: false, error: "exceeds_outstanding", outstanding });
    }

    await query(
      `INSERT INTO promo_commission_payouts (promo_id, amount, method, reference, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id, amount,
        b.method ? String(b.method).trim() : null,
        b.reference ? String(b.reference).trim() : null,
        b.note ? String(b.note).trim() : null,
        admin.id,
      ]
    );

    const after = await outstandingFor(id);
    return NextResponse.json({ ok: true, ...after });
  } catch (err) {
    console.error("POST /api/admin/promos/[id]/commission-payouts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** DELETE ?payoutId= — حذف دفعة (تصحيح خطأ إدخال). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const payoutId = new URL(request.url).searchParams.get("payoutId");
    if (!payoutId) return NextResponse.json({ ok: false, error: "id_required" });
    await query(`DELETE FROM promo_commission_payouts WHERE id = $1 AND promo_id = $2`, [payoutId, id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/promos/[id]/commission-payouts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}