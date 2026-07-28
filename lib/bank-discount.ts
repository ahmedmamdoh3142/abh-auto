// lib/bank-discount.ts — تحديد بنك الكارت من أول 6-8 أرقام (BIN) وحساب خصمه.
// أمان: الدالة دي متستقبلش ولا تخزّن رقم الكارت الكامل ولا CVV ولا تاريخ الانتهاء —
// بس أول 8 أرقام (الـBIN)، وده مش بيانات حساسة زي رقم الكارت الكامل.
import { query } from "@/lib/db";

const BANK_DISCOUNT_PERCENT: Record<string, number> = {
  snb: 20,
};

const BANK_LABEL: Record<string, { ar: string; en: string }> = {
  snb: { ar: "البنك الأهلي السعودي", en: "Saudi National Bank" },
};

export interface BankBinMatch {
  bankCode: string;
  bankLabel: { ar: string; en: string };
  percent: number;
  binMatched: string;
}

export async function matchBankBin(cardDigitsRaw: string): Promise<BankBinMatch | null> {
  const digits = String(cardDigitsRaw || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length < 6) return null;

  const rows = await query<{ bank_code: string; bin: string }>(
    `SELECT bank_code, bin FROM bank_bins WHERE is_active = true`
  );
  // أطول تطابق أولًا — بعض الـBINs 8 أرقام وبعضها 6.
  const sorted = [...rows].sort((a, b) => b.bin.length - a.bin.length);
  const hit = sorted.find((r) => digits.startsWith(r.bin));
  if (!hit) return null;

  const percent = BANK_DISCOUNT_PERCENT[hit.bank_code] ?? 0;
  if (percent <= 0) return null;

  return {
    bankCode: hit.bank_code,
    bankLabel: BANK_LABEL[hit.bank_code] ?? { ar: hit.bank_code, en: hit.bank_code },
    percent,
    binMatched: hit.bin,
  };
}