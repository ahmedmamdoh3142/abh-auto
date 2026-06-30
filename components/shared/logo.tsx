import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  imageSrc?: string;
  alt?: string;
}

// النسبة الأصلية للوجو ≈ 3:2 (512×341). نحسب الارتفاع منها بدل مربّع 1:1
// عشان: (1) مفيش CLS، (2) next/image مايبعتش نسخة أكبر من اللازم.
const LOGO_RATIO = 341 / 512;

export function Logo({
  className,
  size = 150,
  imageSrc = '/images/logo3.webp',
  alt = 'ABH Auto',
}: LogoProps) {
  const width = size;
  const height = Math.round(size * LOGO_RATIO);

  return (
    <Image
      src={imageSrc}
      width={width}
      height={height}
      alt={alt}
      // أكبر عرض فعلي للوجو 150px (وأقل 60px في الدرج). نحدّ النسخة المطلوبة.
      sizes="150px"
      quality={70}
      // اللوجو فوق الطية في الناف بار — نحمّله مبكّرًا بدل lazy (بس بحجم صغير)
      priority
      className={cn(
        'drop-shadow-[0_0_18px_rgba(203,205,205,0.25)]',
        className,
      )}
    />
  );
}