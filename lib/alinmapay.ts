// lib/alinmapay.ts
import crypto from "crypto";

const TERMINAL_ID = process.env.ALINMA_TERMINAL_ID!;
const PASSWORD = process.env.ALINMA_PASSWORD!;
const MERCHANT_KEY = process.env.ALINMA_MERCHANT_KEY!; // hex string من البنك
const BASE_URL =
  process.env.ALINMA_ENV === "production"
    ? "https://pg.alinmapay.com.sa/Transactions/v2/payments/pay-request"
    : "https://pg.alinmapay.com.sa/SB_Transactions/v2/payments/pay-request";

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
  const json = await res.json();

  if (json?.responseCode !== "000" && json?.responseCode !== "001") {
    throw new Error(`AlinmaPay pay-request failed: ${json?.responseDescription ?? "unknown"}`);
  }

  const transactionId = json.transactionId as string;
  const rawLink = json.paymentLink?.linkUrl as string;
  const linkUrl = rawLink ? `${rawLink}${transactionId}` : rawLink;

  return { transactionId, linkUrl };
}