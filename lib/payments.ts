// lib/payments.ts
import { pool, query } from "@/lib/db";
import { confirmRedemptionForBooking } from "@/lib/promo";

export type PaymentMethod = "cash" | "card" | "transfer" | "gateway" | "other";
export type PaymentKind = "deposit" | "partial" | "final" | "full";

const PAYMENT_METHODS = ["cash", "card", "transfer", "gateway", "other"] as const;

/** Type guard حقيقي — بيخلي TypeScript يعمل narrowing من string لـ PaymentMethod بدل الـ cast. */
export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export type RecordPaymentInput = {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  kind?: PaymentKind;
  gatewayTransactionId?: string | null;
  gatewayOrderId?: string | null;
  note?: string | null;
  receivedBy?: string | null; // uuid الأدمن — null لو الدفع جه من الجيت واي مباشرة
};

export type RecordPaymentResult = {
  paymentId: number;
  amountPaid: number;
  remaining: number;
  paymentStatus: "paid" | "partial";
  total: number;
};

/**
 * يسجّل دفعة (كاملة أو جزئية) لحجز، يحدّث amount_paid و payment_status أوتوماتيك،
 * ويأكّد استخدام البرومو أول مرة الحجز يوصل مدفوع بالكامل. محمي من السباق بقفل الصف.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cur = await client.query(
      `SELECT total, amount_paid, payment_status FROM bookings WHERE id = $1 FOR UPDATE`,
      [input.bookingId]
    );
    const row = cur.rows[0];
    if (!row) throw new Error("booking_not_found");
    if (row.payment_status === "refunded") throw new Error("booking_refunded");

    const total = Number(row.total) || 0;
    const before = Number(row.amount_paid) || 0;
    const remainingBefore = Math.max(0, total - before);

    const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
    if (!(amount > 0)) throw new Error("amount_required");
    if (amount > remainingBefore + 0.01) throw new Error("amount_exceeds_remaining");

    const after = Math.min(total, before + amount);
    const remaining = Math.max(0, total - after);
    const wasFullyPaid = row.payment_status === "paid";
    const nowFullyPaid = remaining <= 0.01;
    const newStatus: "paid" | "partial" = nowFullyPaid ? "paid" : "partial";
    const kind: PaymentKind =
      input.kind ?? (nowFullyPaid ? (before > 0 ? "final" : "full") : before > 0 ? "partial" : "deposit");

    const ins = await client.query(
      `INSERT INTO booking_payments
         (booking_id, amount, method, kind, gateway_transaction_id, gateway_order_id, note, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        input.bookingId, amount, input.method, kind,
        input.gatewayTransactionId ?? null, input.gatewayOrderId ?? null,
        input.note ?? null, input.receivedBy ?? null,
      ]
    );

    await client.query(
      `UPDATE bookings
          SET amount_paid = $2, payment_status = $3::public.payment_status, updated_at = now()
        WHERE id = $1`,
      [input.bookingId, after, newStatus]
    );

    await client.query("COMMIT");

    if (nowFullyPaid && !wasFullyPaid) {
      await confirmRedemptionForBooking(input.bookingId).catch((e) =>
        console.error("confirmRedemption failed:", e)
      );
    }

    return { paymentId: ins.rows[0].id, amountPaid: after, remaining, paymentStatus: newStatus, total };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function getRemainingBalance(bookingId: string) {
  const rows = await query<any>(
    `SELECT total, amount_paid, payment_status, reference FROM bookings WHERE id = $1`,
    [bookingId]
  );
  const b = rows[0];
  if (!b) return null;
  const total = Number(b.total) || 0;
  const paid = Number(b.amount_paid) || 0;
  return { total, paid, remaining: Math.max(0, total - paid), status: b.payment_status, reference: b.reference };
}

export async function getBookingPayments(bookingId: string) {
  return query<any>(
    `SELECT id, amount, method, kind, note, created_at, received_by
       FROM booking_payments WHERE booking_id = $1 ORDER BY created_at ASC`,
    [bookingId]
  );
}