/**
 * app/api/cron/whatsapp/route.ts — مهام واتساب الدورية (تُستدعى من Vercel Cron أو أي جدولة).
 *
 *   GET ?task=reminders → يدرج تذكيرات للحجوزات القادمة (التي لم تُذكَّر بعد).
 *   GET ?task=flush     → عامل الإرسال: يبعت الرسائل المستحقّة في الطابور.
 *
 * أمان: يتطلّب رأس Authorization: Bearer <CRON_SECRET> (من .env).
 * الجدولة المقترحة:
 *   - reminders: مرة يوميًا (مثلاً 9 صباحًا) — vercel.json
 *   - flush:     كل دقيقة (لإرسال OTP والتأكيدات فورًا)
 *
 * قبل ربط المزوّد: flush لا يرسل فعليًا (waEnabled=false) ويترك الرسائل queued.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { enqueueBookingReminder, waEnabled, sendViaProvider } from "@/lib/whatsapp";

const CRON_SECRET = process.env.CRON_SECRET || "";

function authorized(req: Request): boolean {
  if (!CRON_SECRET) return true; // لو لم يُضبط بعد، اسمح (للتطوير)
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const task = searchParams.get("task") || "flush";

  try {
    if (task === "reminders") return await enqueueDueReminders();
    if (task === "flush") return await flushQueue();
    return NextResponse.json({ ok: false, error: "unknown_task" }, { status: 400 });
  } catch (err) {
    console.error(`cron whatsapp [${task}] failed:`, err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** يدرج تذكيرات للحجوزات القادمة التي وافق أصحابها ولم تُذكَّر بعد. */
async function enqueueDueReminders() {
  // اقرأ نافذة "قبل الموعد بكام ساعة" من الإعدادات
  const cfg = await query<any>(`SELECT reminder_hours_before, send_reminders FROM whatsapp_config WHERE id = 1`);
  const hoursBefore = Number(cfg[0]?.reminder_hours_before) || 24;
  if (cfg[0] && cfg[0].send_reminders === false) {
    return NextResponse.json({ ok: true, skipped: "reminders_disabled" });
  }

  // الحجوزات القادمة خلال نافذة التذكير، الموافِقة، غير الملغاة، ولم يُسجَّل لها تذكير.
  const rows = await query<any>(
    `SELECT id, reference, customer_phone, customer_name, scheduled_date, scheduled_time, user_id
       FROM bookings
      WHERE status = 'upcoming'
        AND whatsapp_opt_in = true
        AND reminder_sent_at IS NULL
        AND customer_phone IS NOT NULL
        AND scheduled_date IS NOT NULL
        AND scheduled_date >= CURRENT_DATE
        AND scheduled_date <= CURRENT_DATE + 2`,
    []
  );

  let queued = 0;
  for (const b of rows) {
    await enqueueBookingReminder({
      bookingId: b.id, reference: b.reference,
      phone: b.customer_phone, name: b.customer_name,
      scheduledDate: typeof b.scheduled_date === "string" ? b.scheduled_date : new Date(b.scheduled_date).toISOString().slice(0, 10),
      scheduledTime: b.scheduled_time, hoursBefore, userId: b.user_id,
    });
    // علّم أنه أُدرج (نمنع التكرار اليومي)
    await query(`UPDATE bookings SET reminder_sent_at = now() WHERE id = $1`, [b.id]);
    queued++;
  }
  return NextResponse.json({ ok: true, task: "reminders", queued });
}

/** عامل الإرسال: يبعت الرسائل المستحقّة. قبل الربط لا يرسل فعليًا. */
async function flushQueue() {
  const enabled = await waEnabled();
  if (!enabled) {
    const pending = await query<any>(
      `SELECT count(*)::int AS n FROM whatsapp_messages WHERE status = 'queued' AND scheduled_at <= now()`
    );
    return NextResponse.json({ ok: true, task: "flush", sent: 0, pending: pending[0]?.n ?? 0, note: "provider_disabled" });
  }

  // التقط دفعة من الرسائل المستحقّة
  const due = await query<any>(
    `SELECT id FROM whatsapp_messages
      WHERE status IN ('queued','failed')
        AND attempts < max_attempts
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT 50`
  );

  let sent = 0, failed = 0;
  for (const m of due) {
    try {
      await sendViaProvider(m.id); // يحدّث الحالة داخليًا بعد الربط
      sent++;
    } catch (e) {
      failed++;
      await query(
        `UPDATE whatsapp_messages
            SET attempts = attempts + 1,
                status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'queued' END,
                error = $2, failed_at = now()
          WHERE id = $1`,
        [m.id, String((e as Error)?.message || e).slice(0, 500)]
      );
    }
  }
  return NextResponse.json({ ok: true, task: "flush", sent, failed });
}