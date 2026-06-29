/**
 * app/api/admin/upload/route.ts — رفع/حذف صور (خدمات + إثباتات تحويل) · v3
 *
 * تغيير v3 (مهم):
 *  • الصور بتتكتب دلوقتي في مجلد ثابت خارج المشروع (UPLOAD_ROOT)، مش في public/.
 *    السبب: Next.js مابيخدمش الملفات المضافة لـpublic/ وقت التشغيل (بترجع 404)،
 *    وكمان أي ملف داخل المشروع بيتمسح مع git pull / build. المجلد الخارجي بيحلّ
 *    المشكلتين: الصور تظهر فورًا (nginx بيخدمها مباشرة)، وتنجو من السحب والبناء.
 *  • المسار اللي بيترجّع يفضل /<folder>/<filename> — وnginx معمول له alias
 *    على /services-img/ و/payouts-img/ يوجّههم للمجلد الخارجي.
 *
 * • POST  (multipart/form-data, field "file" [+ "name"] [+ "folder"]) →
 *         يتحقق إنه صورة، يحوّله WebP بـsharp، ويحفظه في المجلد المسموح،
 *         ويرجّع { ok, path: "/<folder>/xxx.webp" }.
 * • DELETE ?path=/<folder>/xxx.webp → يمسح الملف.
 */
import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin/guard";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set(["services-img", "payouts-img"]);

// مجلد التخزين الثابت خارج المشروع (يطابق ما هيّأناه على السيرفر + nginx alias).
// قابل للتعديل عبر متغيّر البيئة UPLOAD_DIR لو احتجت مسارًا مختلفًا.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/var/www/abh-uploads";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif",
};

function folderDir(folder: string): string {
  return path.join(UPLOAD_ROOT, folder);
}

/**
 * اسم ملف نظيف وفريد — لا يعتمد على الحروف العربية إطلاقًا.
 * بناخد الجزء اللاتيني فقط من التلميح (لو فيه)، وإلا نستخدم "img".
 * الفرادة مضمونة دايمًا بـ time + random بغضّ النظر عن الاسم.
 */
function safeName(input: string): string {
  const latin = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "") // سيب اللاتيني والأرقام فقط
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32)
    .replace(/^-+|-+$/g, "");
  const stem = latin || "img";
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stem}-${unique}`;
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
    let usedSharp = false;

    try {
      const sharp = (await import("sharp")).default;
      outBuf = await sharp(bytes)
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      usedSharp = true;
    } catch {
      usedSharp = false;
    }

    if (!usedSharp) {
      // بدون sharp: احفظ بالامتداد الصحيح المشتقّ من نوع الملف (مش .bin)
      const ext = EXT_FROM_TYPE[blob.type] || "jpg";
      filename = `${stem}.${ext}`;
      outBuf = bytes;
    }

    const finalPath = path.join(dir, filename);
    await fs.writeFile(finalPath, outBuf);

    // تأكيد إن الملف اتكتب فعلاً قبل ما نرجّع المسار
    try {
      await fs.access(finalPath);
    } catch {
      return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
    }

    // المسار العام (nginx بيخدمه عبر alias على /<folder>/)
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

    const seg = rel.replace(/^\//, "").split("/")[0];
    if (!ALLOWED_FOLDERS.has(seg) || rel.includes("..")) {
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    }
    const abs = path.join(UPLOAD_ROOT, rel.replace(/^\//, ""));
    if (!abs.startsWith(folderDir(seg))) {
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    }

    await fs.unlink(abs).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/upload failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}