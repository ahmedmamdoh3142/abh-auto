// lib/alinmapay.ts
import crypto from "crypto";

const TERMINAL_ID = process.env.ALINMA_TERMINAL_ID!;
const PASSWORD = process.env.ALINMA_PASSWORD!;
const MERCHANT_KEY = process.env.ALINMA_MERCHANT_KEY!; // hex string من البنك

// المسار الأساسي (context path) بتاع البيئة — نبني منه رابط pay-request
// (Hosted Page) ورابط apiUrl بتاع JS Checkout (نفس الأساس، تفرعين مختلفين).
const CONTEXT_BASE =
  process.env.ALINMA_ENV === "production"
    ? "https://pg.alinmapay.com.sa/Transactions"
    : "https://pg.alinmapay.com.sa/SB_Transactions";

const BASE_URL = `${CONTEXT_BASE}/v2/payments/pay-request`;

// رابط سكريبت JS Checkout SDK. التوثيق أعطى اسم السانتباكس بس (sbalinmapay.js)
// — اسم ملف الإنتاج لسه محتاج تأكيد من AlinmaPay. لحد التأكيد ممكن تحط الاسم
// الصحيح في ALINMA_JS_SDK_URL بالـ .env (اختياري، له fallback تحت).
const JS_SDK_URL =
  process.env.ALINMA_JS_SDK_URL ||
  (process.env.ALINMA_ENV === "production"
    ? "https://pg.alinmapay.com.sa/alinmapay.js"
    : "https://pg.alinmapay.com.sa/sbalinmapay.js");

/** حالات الدفع المستخدمة في عمود bookings.payment_status */
export const ALINMA_STATUS = {
  awaitingGateway: "awaiting_gateway",
  paid: "paid",
  failed: "failed",
} as const;

/** يحول hex string لـ Buffer بايتات، مستخدم كمفتاح AES */
function keyBytes(): Buffer {
  return Buffer.from(MERCHANT_KEY, "hex");
}

/**
 * توليد الـ request signature.
 * الصيغة من المستند: trackId|terminalId|password|merchantKey|amount|currency
 * ملاحظة: هنستخدم orderId كـ trackId — لازم تتأكد من AlinmaPay إن ده صح
 * (راجع قسم الأسئلة المطلوبة من البنك في آخر الرسالة).
 */
export function buildRequestSignature(params: {
  trackId: string;
  amount: string;
  currency: string;
}): string {
  const raw = `${params.trackId}|${TERMINAL_ID}|${PASSWORD}|${MERCHANT_KEY}|${params.amount}|${params.currency}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

/** تحقق من response signature: paymentId|merchantKey|responseCode|amount */
export function verifyResponseSignature(params: {
  paymentId: string;
  responseCode: string;
  amount: string;
  signature: string;
}): boolean {
  const raw = `${params.paymentId}|${MERCHANT_KEY}|${params.responseCode}|${params.amount}`;
  const expected = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  return expected === params.signature;
}

/** فك تشفير الـ final response اللي جاي على receiptUrl (data param) */
export function decryptFinalResponse(encryptedDataB64: string): any {
  const key = keyBytes();
  const algo = key.length === 32 ? "aes-256-ecb" : "aes-128-ecb"; // حسب طول المفتاح
  const decipher = crypto.createDecipheriv(algo, key, null); // ECB مفيهاش IV
  const decoded = Buffer.from(encryptedDataB64, "base64");
  const decrypted = Buffer.concat([decipher.update(decoded), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

type PayRequestInput = {
  paymentType: "1" | "4"; // 1 = Purchase, 4 = Pre-auth
  orderId: string;
  amount: string; // "150.00"
  currency: string; // "SAR"
  description?: string;
  customer: {
    email?: string;
    mobile?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPostalCode?: string;
    addressCountry?: string; // "SA"
  };
  receiptUrl: string;
};

export async function createPayRequest(input: PayRequestInput) {
  if (!TERMINAL_ID || !PASSWORD || !MERCHANT_KEY) {
    throw new Error(
      `AlinmaPay env vars missing: terminal=${!!TERMINAL_ID} password=${!!PASSWORD} key=${!!MERCHANT_KEY}`
    );
  }

  const signature = buildRequestSignature({
    trackId: input.orderId,
    amount: input.amount,
    currency: input.currency,
  });

  const body = {
    terminalId: TERMINAL_ID,
    password: PASSWORD,
    signature,
    paymentType: input.paymentType,
    amount: input.amount,
    currency: input.currency,
    order: { orderId: input.orderId, description: input.description ?? "" },
    customer: {
      customerEmail: input.customer.email,
      mobileNumber: input.customer.mobile,
      billingAddressStreet: input.customer.addressStreet,
      billingAddressCity: input.customer.addressCity,
      billingAddressState: input.customer.addressState,
      billingAddressPostalCode: input.customer.addressPostalCode,
      billingAddressCountry: input.customer.addressCountry ?? "SA",
    },
    additionalDetails: {
      userData: JSON.stringify({ receiptUrl: input.receiptUrl }),
    },
  };

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let json: any;
  try { json = JSON.parse(raw); } catch { json = null; }

  // يطبع شكل الرد الحقيقي من البنك في لوج السيرفر — احذفه بعد ما تنتهي من التشخيص
  console.error("[AlinmaPay pay-request]", res.status, raw);

  if (!json || (json.responseCode !== "000" && json.responseCode !== "001")) {
    throw new Error(
      `AlinmaPay pay-request failed [${res.status} / code ${json?.responseCode ?? "?"}]: ${json?.responseDescription ?? raw.slice(0, 300)}`
    );
  }

  const transactionId = json.transactionId as string;
  const rawLink = json.paymentLink?.linkUrl as string;
  const linkUrl = rawLink ? `${rawLink}${transactionId}` : rawLink;

  return { transactionId, linkUrl };
}

/**
 * يبني إعدادات JS Checkout (الكارت المدمج جوّه صفحتنا) لحجز معيّن.
 * بيتولّد من السيرفر لحظة الطلب — التوقيع مرتبط بالمبلغ ورقم الحجز، مش تابت.
 *
 * ⚠️ ملحوظة أمان: SDK بتاع AlinmaPay بيحتاج terminalId/password ظاهرين في
 * كود الصفحة (window.PG_CONFIG) عشان يشتغل من المتصفح مباشرة — ده تصميم
 * AlinmaPay نفسه للـ JS Checkout، مش اختيار منّا. قلّلنا الأثر بتوليد
 * الإعداد لحظيًا لكل عملية بدل ما يتكتب تابت في الكود.
 */
export function buildJsCheckoutConfig(input: {
  orderId: string;
  amount: string;
  currency: string;
  customerEmail?: string;
  callbackUrl: string;
}) {
  const signature = buildRequestSignature({
    trackId: input.orderId,
    amount: input.amount,
    currency: input.currency,
  });

  return {
    terminalId: TERMINAL_ID,
    password: PASSWORD,
    signature,
    apiUrl: CONTEXT_BASE,
    callbackUrl: input.callbackUrl,
    defaultAmount: input.amount,
    defaultCurrency: input.currency,
    customerEmail: input.customerEmail || "",
    orderId: input.orderId,
    defaultPaymentType: "1",
    paymentMethods: "CARD",
    sdkUrl: JS_SDK_URL,
  };
}