'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

const buttonVariants = cva(
  'group relative inline-flex items-center justify-center gap-3 font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-out disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:
          'text-obsidian bg-gradient-to-br from-white via-platinum to-white shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_10px_40px_-10px_rgba(203,205,205,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_18px_60px_-8px_rgba(203,205,205,0.7),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5',
        ghost:
          'text-ivory bg-white/[0.04] border border-white/15 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/30 hover:-translate-y-0.5',
        outline:
          'text-ivory border border-white/20 hover:border-white/50 bg-transparent',
        minimal:
          'text-platinum hover:text-ivory bg-transparent',
      },
      size: {
        sm: 'text-[0.65rem] px-5 py-2.5 rounded-full',
        md: 'text-[0.7rem]  px-7 py-3.5 rounded-full',
        lg: 'text-[0.75rem] px-9 py-4.5 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  arrow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, arrow = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
        <span className="relative z-10 flex items-center gap-2.5">
          {children}
          {arrow && (
            <ArrowUpRight
              className="reversible-icon h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          )}
        </span>
      </Comp>
    );
  },
);
Button.displayName = 'Button';
