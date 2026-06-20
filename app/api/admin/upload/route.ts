/**
 * app/api/admin/upload/route.ts — رفع/حذف صور (خدمات + إثباتات تحويل).
 * • POST  (multipart/form-data, field "file" [+ "name"] [+ "folder"]) →
 *         يتحقق إنه صورة، يحوّله WebP بـsharp، ويحفظه في المجلد المسموح،
 *         ويرجّع { ok, path: "/<folder>/xxx.webp" }.
 *         folder المسموح: "services-img" (افتراضي) أو "payouts-img".
 * • DELETE ?path=/<folder>/xxx.webp → يمسح الملف (مع حماية من الخروج بره الفولدر).
 *
 * ملاحظة: محتاج sharp (npm i sharp). لو مش متاح، بيحفظ الصورة بصيغتها الأصلية.
 */
import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin/guard";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// المجلدات المسموح الرفع إليها (whitelist صارم — لا نقبل أي قيمة أخرى)
const ALLOWED_FOLDERS = new Set(["services-img", "payouts-img"]);
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

function folderDir(folder: string): string {
  return path.join(PUBLIC_ROOT, folder);
}

/* اسم ملف نظيف وفريد */
function safeName(input: string): string {
  const base = (input || "img")
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
    let folder = String(form.get("folder") || "services-img");
    if (!ALLOWED_FOLDERS.has(folder)) folder = "services-img";

    if (!file || typeof file === "string") return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });

    const blob = file as File;
    if (blob.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "too_large" }, { status: 400 });
    if (blob.type && !ALLOWED_TYPES.has(blob.type)) return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });

    const bytes = Buffer.from(await blob.arrayBuffer());
    const dir = folderDir(folder);
    await fs.mkdir(dir, { recursive: true });

    const stem = safeName(nameHint || folder);
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

    await fs.writeFile(path.join(dir, filename), outBuf);
    return NextResponse.json({ ok: true, path: `/${folder}/${filename}` });
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

    // حماية: لازم يبدأ بأحد المجلدات المسموحة ومفيش تسلّق مسارات
    const seg = rel.replace(/^\//, "").split("/")[0];
    if (!ALLOWED_FOLDERS.has(seg) || rel.includes("..")) {
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    }
    const abs = path.join(PUBLIC_ROOT, rel.replace(/^\//, ""));
    // تأكيد إضافي أن المسار النهائي داخل مجلد public المسموح
    if (!abs.startsWith(folderDir(seg))) {
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    }

    await fs.unlink(abs).catch(() => {}); // لو الملف مش موجود، عادي
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/upload failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}