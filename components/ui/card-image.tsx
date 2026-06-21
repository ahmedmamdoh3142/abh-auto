'use client';

/**
 * CardImage — صورة كرت موحّدة مع placeholder أنيق.
 * Path المقترح: components/ui/card-image.tsx
 *
 * تُستخدم في كل الكروت (سكشن الخدمات + العروض في الهوم + صفحة الخدمات).
 * المصدر دائمًا services.card_image. لو الصورة فاضية ("" أو null) تعرض
 * placeholder (تدرّج داكن + أيقونة) بدل ما تكسر <Image> أو ترجع لصورة تانية.
 */
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

export function CardImage({
  src,
  alt,
  className = '',
  sizes,
  quality,
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
}) {
  const has = typeof src === 'string' && src.trim().length > 0;

  if (!has) {
    // placeholder — لا صورة محطوطة بعد
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center ${className}`}
        style={{
          background:
            'linear-gradient(135deg,#0f1011 0%,#15171a 45%,#0c0d0e 100%)',
        }}
      >
        <span
          className="flex flex-col items-center gap-2 text-platinum/25"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
        >
          <ImageOff className="h-8 w-8" strokeWidth={1.2} />
        </span>
        {/* لمعة خفيفة عشان ما يبقاش مسطّح تمامًا */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 40%, rgba(203,205,205,0.05), transparent 70%)',
          }}
        />
      </div>
    );
  }

  return (
    <Image
      src={src as string}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      quality={quality}
      priority={priority}
    />
  );
}