/**
 * app/api/admin/upload/route.ts — رفع/حذف صور الخدمات.
 * • POST  (multipart/form-data, field "file" [+ "name" اختياري للاسم) →
 *         يتحقق إنه صورة، يحوّله WebP بـsharp، ويحفظه في public/services-img،
 *         ويرجّع { ok, path: "/services-img/xxx.webp" }.
 * • DELETE ?path=/services-img/xxx.webp → يمسح الملف (مع حماية من الخروج بره الفولدر).
 *
 * ملاحظة: محتاج sharp (npm i sharp). لو مش متاح، بيحفظ الصورة بصيغتها الأصلية.
 */
import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin/guard";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "public", "services-img");
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/* اسم ملف نظيف وفريد */
function safeName(input: string): string {
  const base = (input || "service")
    .toLowerCase().normalize("NFKD")
    .replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "img";
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const nameHint = String(form.get("name") || "");
    if (!file || typeof file === "string") return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });

    const blob = file as File;
    if (blob.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "too_large" }, { status: 400 });
    if (blob.type && !ALLOWED.has(blob.type)) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });

    const bytes = Buffer.from(await blob.arrayBuffer());
    await fs.mkdir(DIR, { recursive: true });

    const stem = safeName(nameHint);
    let filename = `${stem}.webp`;
    let outBuf: Buffer = bytes;

    // تحويل WebP عبر sharp لو متاح (مع تصغير الأبعاد الكبيرة)
    try {
      const sharp = (await import("sharp")).default;
      outBuf = await sharp(bytes)
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      // لا يوجد sharp → احفظ بالامتداد الأصلي
      const ext = (blob.type && blob.type.split("/")[1]) || "bin";
      filename = `${stem}.${ext === "jpeg" ? "jpg" : ext}`;
    }

    await fs.writeFile(path.join(DIR, filename), outBuf);
    return NextResponse.json({ ok: true, path: `/services-img/${filename}` });
  } catch (err) {
    console.error("POST /api/admin/upload failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rel = searchParams.get("path") || "";
    // حماية: لازم يكون جوه /services-img/ ومفيش تسلّق مسارات
    if (!rel.startsWith("/services-img/") || rel.includes("..")) {
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    }
    const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
    if (!abs.startsWith(DIR)) return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });

    await fs.unlink(abs).catch(() => {}); // لو الملف مش موجود، عادي
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/upload failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}