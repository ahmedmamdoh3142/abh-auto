import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { getCurrentUser } from "@/lib/auth";
import { detectLang, translateText, type Lang } from "@/lib/translate";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    // المشرف (أي أدمن عنده صلاحية bookings) أو الفني — الاتنين مسموح لهم
    const admin = await getAdminOrNull().catch(() => null);
    let isTechnician = false;
    let techId: string | null = null;
    if (!admin) {
      const user = await getCurrentUser().catch(() => null);
      if (user?.role === "technician") { isTechnician = true; techId = user.id; }
    }
    if (!admin && !isTechnician) return bad("unauthorized", 401);

    const b = await request.json();
    const commentId = Number(b.commentId);
    const target = (b.target === "ar" || b.target === "en") ? (b.target as Lang) : null;
    if (!commentId || !target) return bad("bad_request");

    const rows = await query<any>(
      `SELECT id, task_id, body, source_lang, translated_ar, translated_en FROM task_comments WHERE id = $1`,
      [commentId]
    );
    if (!rows[0]) return bad("not_found", 404);
    const c = rows[0];

    // الفني يترجم بس رسائل تاسكاته هو (تحقق أمان)
    if (isTechnician) {
      const own = await query<any>(
        `SELECT 1 FROM task_technicians WHERE task_id = $1 AND technician_id = $2 LIMIT 1`,
        [c.task_id, techId]
      );
      if (!own[0]) return bad("forbidden", 403);
    }

    const source: Lang = (c.source_lang === "ar" || c.source_lang === "en") ? c.source_lang : detectLang(c.body);
    if (source === target) return NextResponse.json({ ok: true, translated: c.body, sourceLang: source, sameLang: true });

    // لو متخزنة قبل كده — رجّعها من الكاش
    const cached = target === "ar" ? c.translated_ar : c.translated_en;
    if (cached) return NextResponse.json({ ok: true, translated: cached, sourceLang: source, cached: true });

    const translated = await translateText(c.body, source, target);
    if (!translated) return bad("translate_failed", 502);

    const col = target === "ar" ? "translated_ar" : "translated_en";
    await query(
      `UPDATE task_comments SET source_lang = COALESCE(source_lang, $2), ${col} = $3 WHERE id = $1`,
      [commentId, source, translated]
    ).catch(() => {});

    return NextResponse.json({ ok: true, translated, sourceLang: source, cached: false });
  } catch (err) {
    console.error("POST /api/translate/comment failed:", err);
    return bad("server_error", 500);
  }
}