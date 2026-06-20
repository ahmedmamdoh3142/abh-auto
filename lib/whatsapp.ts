/**
 * lib/whatsapp.ts — طبقة طابور رسائل الواتساب (جاهزة للربط).
 *
 * الفكرة: الكود في كل مكان (الحجز، الـOTP، العروض) ما بيبعتش للواتساب مباشرة،
 * بل **يضيف صفًّا** في جدول whatsapp_messages عبر الدوال هنا. بعدين عامل إرسال
 * (cron/worker) يقرأ الطابور ويبعت فعليًا عبر الـAPI. ده يفصل منطق التطبيق عن
 * مزوّد الواتساب، فالربط لاحقًا يصير في مكان واحد فقط (sendViaProvider).
 *
 * قبل الربط: الدوال تشتغل عادي وتسجّل الرسائل كـ'queued' — لا شيء يُرسَل فعليًا
 * (whatsapp_config.enabled = false). بعد الاشتراك: فعّل enabled واكتب sendViaProvider.
 */
import { query } from "@/lib/db";

export type WaKind = "otp" | "booking_confirm" | "reminder" | "marketing" | "custom";
export type WaCategory = "utility" | "authentication" | "marketing" | "service";

/** هل الواتساب مفعّل أصلًا؟ (مفتاح رئيسي في whatsapp_config) */
export async function waEnabled(): Promise<boolean> {
  try {
    const rows = await query<any>(`SELECT enabled FROM whatsapp_config WHERE id = 1`);
    return !!rows[0]?.enabled;
  } catch {
    return false;
  }
}

/** تطبيع رقم لصيغة E.164 مبسّطة (يزيل المسافات والرموز، يضمن +). */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = String(phone).trim().replace(/[\s()-]/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    // افتراض السعودية لو الرقم محلي يبدأ بـ05 → +9665...
    if (p.startsWith("05")) p = "+966" + p.slice(1);
    else if (p.startsWith("5") && p.length === 9) p = "+966" + p;
    else p = "+" + p;
  }
  return p;
}

interface EnqueueInput {
  toPhone: string;
  kind: WaKind;
  category?: WaCategory;
  templateName?: string | null;
  templateLang?: string;
  variables?: Record<string, string>;
  bodyPreview?: string | null;
  dedupeKey?: string | null;      // يمنع التكرار (تأكيد/تذكير لكل حجز مرّة)
  scheduledAt?: Date | null;      // لا يُرسل قبله (للتذكيرات)
  bookingId?: string | null;
  userId?: string | null;
}

/**
 * enqueueMessage — يضيف رسالة للطابور (لا يرسل فعليًا).
 * يتجاهل بهدوء عند التعارض على dedupe_key (يعني الرسالة موجودة بالفعل).
 * يرجّع id الرسالة أو null لو اتجاهلت.
 */
export async function enqueueMessage(m: EnqueueInput): Promise<string | null> {
  const to = toE164(m.toPhone);
  if (!to) return null;
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO whatsapp_messages
         (to_phone, kind, category, template_name, template_lang, variables,
          body_preview, dedupe_key, scheduled_at, booking_id, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, now()),$10,$11,'queued')
       ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        to, m.kind, m.category ?? "utility", m.templateName ?? null, m.templateLang ?? "ar",
        JSON.stringify(m.variables ?? {}), m.bodyPreview ?? null, m.dedupeKey ?? null,
        m.scheduledAt ?? null, m.bookingId ?? null, m.userId ?? null,
      ]
    );
    return rows[0]?.id ?? null;
  } catch (e) {
    console.error("[whatsapp] enqueue failed:", e);
    return null;
  }
}

/**
 * enqueueBookingConfirm — تأكيد فوري بعد الحجز (يُرسَل حالًا).
 * dedupe: confirm:<bookingId> → تأكيد واحد لكل حجز.
 */
export async function enqueueBookingConfirm(opts: {
  bookingId: string; reference: string; phone: string; name?: string | null;
  userId?: string | null; lang?: string;
}): Promise<void> {
  await enqueueMessage({
    toPhone: opts.phone,
    kind: "booking_confirm",
    category: "utility",
    templateName: "booking_confirmation", // ← اسم القالب الذي ستعتمده في Meta
    templateLang: opts.lang ?? "ar",
    variables: { "1": opts.name ?? "", "2": opts.reference },
    bodyPreview: `تأكيد حجز ${opts.reference}`,
    dedupeKey: `confirm:${opts.bookingId}`,
    bookingId: opts.bookingId,
    userId: opts.userId ?? null,
  });
}

/**
 * enqueueBookingReminder — تذكير قبل الموعد.
 * يُجدول على (تاريخ الموعد − reminder_hours_before).
 * dedupe: reminder:<bookingId> → تذكير واحد لكل حجز.
 */
export async function enqueueBookingReminder(opts: {
  bookingId: string; reference: string; phone: string; name?: string | null;
  scheduledDate: string;          // YYYY-MM-DD
  scheduledTime?: string | null;  // "HH:MM"
  hoursBefore?: number;           // افتراضي 24
  userId?: string | null; lang?: string;
}): Promise<void> {
  const hours = opts.hoursBefore ?? 24;
  // وقت الموعد (لو فيه وقت نستخدمه، وإلا 10 صباحًا افتراضيًا)
  const at = new Date(`${opts.scheduledDate}T${opts.scheduledTime || "10:00"}:00`);
  const sendAt = new Date(at.getTime() - hours * 3600 * 1000);
  await enqueueMessage({
    toPhone: opts.phone,
    kind: "reminder",
    category: "utility",
    templateName: "appointment_reminder",
    templateLang: opts.lang ?? "ar",
    variables: { "1": opts.name ?? "", "2": opts.reference, "3": opts.scheduledTime || "" },
    bodyPreview: `تذكير بموعد ${opts.reference}`,
    dedupeKey: `reminder:${opts.bookingId}`,
    scheduledAt: sendAt,
    bookingId: opts.bookingId,
    userId: opts.userId ?? null,
  });
}

/**
 * enqueueOtp — رمز تحقق للحجز بدون تسجيل دخول.
 * لا dedupe (كل طلب رمز جديد). category=authentication.
 */
export async function enqueueOtp(opts: {
  phone: string; code: string; lang?: string; bookingId?: string | null;
}): Promise<void> {
  await enqueueMessage({
    toPhone: opts.phone,
    kind: "otp",
    category: "authentication",
    templateName: "otp_verification",
    templateLang: opts.lang ?? "ar",
    variables: { "1": opts.code },
    bodyPreview: `رمز تحقق ABH`,
    dedupeKey: null,
    bookingId: opts.bookingId ?? null,
  });
}

/**
 * enqueueMarketing — رسالة تسويقية (عرض/بروموكود) لقائمة أرقام.
 * تتحقق من موافقة التسويق قبل الإضافة (whatsapp_marketing_opt_in).
 * dedupe اختياري لمنع تكرار نفس الحملة لنفس الرقم.
 */
export async function enqueueMarketing(opts: {
  campaignKey: string;            // مثلاً "summer2026" — لمنع التكرار
  templateName: string;
  recipients: { phone: string; userId?: string | null; variables?: Record<string, string> }[];
  lang?: string;
}): Promise<number> {
  let count = 0;
  for (const r of opts.recipients) {
    const id = await enqueueMessage({
      toPhone: r.phone,
      kind: "marketing",
      category: "marketing",
      templateName: opts.templateName,
      templateLang: opts.lang ?? "ar",
      variables: r.variables ?? {},
      bodyPreview: `حملة ${opts.campaignKey}`,
      dedupeKey: `mkt:${opts.campaignKey}:${toE164(r.phone)}`,
      userId: r.userId ?? null,
    });
    if (id) count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// نقطة الربط الوحيدة — تُكتب بعد اكتمال الاشتراك ووصول موافقة Meta.
// عامل الإرسال (cron) ينادي sendViaProvider لكل رسالة 'queued' مستحقّة.
// مثال للتنفيذ لاحقًا (Meta Cloud API):
//
//   const res = await fetch(
//     `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
//     { method: "POST",
//       headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
//       body: JSON.stringify({
//         messaging_product: "whatsapp",
//         to: msg.to_phone,
//         type: "template",
//         template: { name: msg.template_name, language: { code: msg.template_lang },
//           components: [{ type: "body", parameters: Object.values(msg.variables).map(t => ({ type:"text", text:t })) }] },
//       }) });
//   const j = await res.json();
//   // ثم حدّث whatsapp_messages: status='sent', provider_message_id=j.messages[0].id
// ═══════════════════════════════════════════════════════════════════════════
export async function sendViaProvider(_messageId: string): Promise<void> {
  // TODO: يُنفّذ بعد الاشتراك. حاليًا لا شيء (الرسائل تبقى queued).
  throw new Error("WhatsApp provider not configured yet");
}