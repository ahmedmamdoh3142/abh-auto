// scripts/optimize-logo.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

// نقرا الملف لـbuffer الأول عشان ما يحصلش قفل (read+write لنفس الملف)
const input = readFileSync('public/images/logo2.webp');
const out = await sharp(input)
  .resize(240)            // ضعف عرض العرض الفعلي (120) = 2x للشاشات الحادة
  .webp({ quality: 82 })
  .toBuffer();
writeFileSync('public/images/logo2.webp', out);
console.log('done →', (out.length / 1024).toFixed(1), 'KB');