// lib/promo-campaigns.ts — توليد أكواد فريدة بـ prefix "abh-" + إنشاء حملات موجّهة.
import { query } from "@/lib/db";

// حروف وأرقام بدون الملتبسة (0/O/1/I/L) — سهلة القراءة والنسخ.
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PREFIX = "abh-";

/** يولّد جزءًا عشوائيًا بطول length من charset آمن. */
function randomSuffix(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

/** كود فريد بصيغة abh-XXXXX. */
export function makeCode(length = 5): string {
  return PREFIX + randomSuffix(length);
}

/**
 * يولّد n كودًا فريدًا غير مكرّر (يفحص التعارض مع القاعدة).
 * يرجّع مصفوفة أكواد جاهزة للإدراج.
 */
export async function generateUniqueCodes(n: number, length = 5): Promise<string[]> {
  const codes = new Set<string>();
  let guard = 0;
  while (codes.size < n && guard < n * 50) {
    guard++;
    codes.add(makeCode(length));
  }
  // فحص التعارض مع الموجود بالقاعدة دفعة واحدة
  const arr = Array.from(codes);
  const existing = await query<any>(
    `SELECT lower(code) AS c FROM promo_codes WHERE lower(code) = ANY($1)`,
    [arr.map((c) => c.toLowerCase())]
  );
  const taken = new Set(existing.map((r) => r.c));
  const fresh = arr.filter((c) => !taken.has(c.toLowerCase()));
  // لو نقص أي كود بسبب تعارض، نكمّل
  while (fresh.length < n && guard < n * 100) {
    guard++;
    const c = makeCode(length);
    if (!taken.has(c.toLowerCase()) && !fresh.includes(c)) fresh.push(c);
  }
  return fresh.slice(0, n);
}

export interface CampaignInput {
  label: string;
  kind: "percentage" | "fixed";
  discountPercent: number;
  fixedAmount: number;
  minOrder: number;
  expiresAt: string | null;
  audience: "all" | "user";
  userId?: string | null;       // للجمهور 'user'
  createdBy?: string | null;
}

export interface CampaignResult {
  campaignId: string;
  recipients: number;
}

/**
 * ينشئ حملة موجّهة:
 *  - يحدّد المستلمين (عميل واحد أو كل الأعضاء).
 *  - يولّد كودًا فريدًا (abh-XXXXX) لكل مستلِم في promo_codes.
 *  - كل كود: نوع الحملة، قيمتها، max_uses=1 (single-use عالميًا)، مرتبط بالحملة والمستلِم.
 */
export async function createCampaign(input: CampaignInput): Promise<CampaignResult> {
  // 1) المستلمون
  let recipients: { id: string }[] = [];
  if (input.audience === "user" && input.userId) {
    recipients = await query<any>(`SELECT id FROM users WHERE id = $1`, [input.userId]);
  } else {
    // كل الأعضاء (نستثني الشركاء لأنهم لا يستخدمون أكواد الخصم)
    recipients = await query<any>(
      `SELECT id FROM users WHERE role = 'member' ORDER BY created_at DESC`
    );
  }
  if (recipients.length === 0) return { campaignId: "", recipients: 0 };

  // 2) إنشاء الحملة
  const camp = await query<{ id: string }>(
    `INSERT INTO promo_campaigns
       (label, kind, discount_percent, fixed_amount, min_order, expires_at, audience, recipients, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      input.label, input.kind,
      input.kind === "percentage" ? input.discountPercent : null,
      input.kind === "fixed" ? input.fixedAmount : 0,
      input.minOrder, input.expiresAt, input.audience, recipients.length, input.createdBy ?? null,
    ]
  );
  const campaignId = camp[0].id;

  // 3) توليد أكواد فريدة (واحد لكل مستلِم)
  const codes = await generateUniqueCodes(recipients.length);

  // 4) إدراج الأكواد (صفًا صفًا — آمن وواضح؛ العدد محدود عادةً)
  const dp = input.kind === "percentage" ? input.discountPercent : 0;
  const fa = input.kind === "fixed" ? input.fixedAmount : 0;
  for (let i = 0; i < recipients.length; i++) {
    await query(
      `INSERT INTO promo_codes
         (code, kind, label, discount_percent, fixed_amount, min_order, expires_at,
          campaign_id, recipient_user_id, max_uses, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,true)`,
      [codes[i], input.kind, input.label, dp, fa, input.minOrder, input.expiresAt, campaignId, recipients[i].id]
    );
  }

  return { campaignId, recipients: recipients.length };
}