import Image from 'next/image';
import { cn } from '@/lib/utils';

interface logoProps {
  className?: string;
  size?: number;
  imageSrc?: string;
  alt?: string;
}

export function logo({
  className,
  size = 90,
  imageSrc = '/images/logo2.webp',
  alt = 'ABH Auto',
}: logoProps) {
  return (
    <Image
      src={imageSrc}
      width={size}
      height={size}
      alt={alt}
      className={cn(
        'drop-shadow-[0_0_18px_rgba(203,205,205,0.25)]',
        className,
      )}
    />
  );
}