'use client';

/**
 * ConciergeClose — a single italic line and a quiet link.
 *
 * Deliberately calm after the dense carousel above. No competing
 * CTAs, just an invitation.
 */
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

export function ConciergeClose() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <section className="relative w-full pb-32 pt-20 md:pb-40 md:pt-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <div className="flex items-center gap-3">
            <span className="block h-1 w-1 rounded-full bg-platinum/60" />
            <span className="block h-px w-24 bg-gradient-to-r from-platinum/40 via-platinum/70 to-platinum/40" />
            <span className="block h-1 w-1 rounded-full bg-platinum/60" />
          </div>

          <p className="mt-8 font-editorial text-[clamp(1.3rem,2.2vw,1.65rem)] italic leading-relaxed text-platinum/85 balance">
            {isAr
              ? 'هل تفكّر في أكثر من خدمة؟ يصنع لك الكونسيرج برنامجاً خاصاً لسيارتك.'
              : 'Considering several services? The concierge composes a bespoke programme for your vehicle.'}
          </p>

          <Link
            href="/contact"
            data-cursor="hover"
            className="group mt-9 inline-flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.4em] text-ivory"
          >
            <span className="block h-px w-8 bg-ivory transition-all duration-500 group-hover:w-14" />
            {isAr ? 'تحدّث مع الكونسيرج' : 'Speak with the concierge'}
            <ArrowUpRight
              className="reversible-icon h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.8}
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}