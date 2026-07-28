import { NextResponse } from "next/server";
import { matchBankBin } from "@/lib/bank-discount";

export async function POST(request: Request) {
  try {
    const { cardDigits } = await request.json();
    const match = await matchBankBin(String(cardDigits || ""));
    if (!match) return NextResponse.json({ ok: false, error: "not_matched" });
    return NextResponse.json({
      ok: true,
      bankCode: match.bankCode,
      bankLabel: match.bankLabel,
      percent: match.percent,
    });
  } catch (err) {
    console.error("POST /api/bank-discount/check failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}