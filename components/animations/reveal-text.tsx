'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
  splitBy?: 'word' | 'char';
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  duration?: number;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (delay: number = 0) => ({
    transition: {
      staggerChildren: 0.045,
      delayChildren: delay,
    },
  }),
};

const itemVariants: Variants = {
  hidden: { y: '110%', opacity: 0, rotateX: -25 },
  visible: {
    y: '0%',
    opacity: 1,
    rotateX: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function RevealText({
  text,
  className,
  delay = 0,
  splitBy = 'word',
  as: Tag = 'span',
  duration: _duration,
}: RevealTextProps) {
  const items =
    splitBy === 'word'
      ? text.split(' ')
      : text.split('');

  const MotionTag = motion[Tag as 'span'];

  return (
    <MotionTag
      className={cn('inline-block', className)}
      style={{ perspective: 1000 }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={delay}
    >
      {items.map((item, i) => (
        <span
          key={i}
          className={cn(
            'inline-block overflow-hidden align-bottom',
            splitBy === 'word' && 'mr-[0.25em] last:mr-0',
          )}
          style={{ paddingBottom: '0.08em' }}
        >
          <motion.span variants={itemVariants} className="inline-block">
            {item === ' ' ? '\u00A0' : item}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
