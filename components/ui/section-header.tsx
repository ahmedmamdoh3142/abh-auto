'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' ? 'items-center text-center mx-auto max-w-3xl' : 'items-start text-start',
        className,
      )}
    >
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: '-100px' }}
          className="flex items-center gap-3"
        >
          <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum to-transparent" />
          <span className="text-[0.65rem] tracking-[0.32em] uppercase text-platinum">{eyebrow}</span>
          <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum to-transparent" />
        </motion.div>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: '-100px' }}
        className="font-display text-display text-ivory balance"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          viewport={{ once: true, margin: '-100px' }}
          className="max-w-2xl text-base md:text-lg text-platinum/80 leading-relaxed pretty"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
