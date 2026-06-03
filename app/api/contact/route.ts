/**
 * POST /api/contact — Demo handler for the contact form.
 *
 * In production this would dispatch to a CRM / mail relay. For this demo
 * we just simulate latency and return a 200 OK so the front end can show
 * its success state.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Basic validation
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: "Name and email are required." },
      { status: 422 },
    );
  }

  // Simulate concierge dispatch
  await new Promise((r) => setTimeout(r, 400));

  return NextResponse.json({
    ok: true,
    message: "Concierge will reply within four hours.",
  });
}
