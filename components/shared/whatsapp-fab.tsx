"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/lib/site-config";

export function WhatsAppFab() {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={siteConfig.links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          data-cursor="hover"
          initial={{ opacity: 0, scale: 0.4, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, y: 30 }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group fixed bottom-6 end-6 z-40 md:bottom-10 md:end-10"
        >
          {/* حلقة النبض الخارجية بلون واتساب */}
          <span className="pointer-events-none absolute inset-0 -m-2 rounded-full bg-green-400/20 blur-md animate-pulse-glow" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-green-500/10 ring-1 ring-green-500/20" />

          {/* Tooltip */}
          <AnimatePresence>
            {hovered && (
              <motion.span
                initial={{ opacity: 0, x: 12, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute end-full me-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-obsidian/90 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.3em] text-platinum backdrop-blur-xl shadow-glass"
              >
                {t("chatConcierge")}
              </motion.span>
            )}
          </AnimatePresence>

          {/* الزر الرئيسي */}
          <span className="relative grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-full shadow-lg shadow-green-500/30 transition-all duration-500 group-hover:shadow-green-500/50 bg-gradient-to-br from-green-500 to-green-600 border border-green-400/30">
            <svg
              viewBox="0 0 32 32"
              className="h-6 w-6 md:h-7 md:w-7 text-white transition-transform duration-500 group-hover:scale-110"
              fill="currentColor"
              aria-hidden
            >
              <path d="M16.001 3.2C8.937 3.2 3.2 8.937 3.2 16c0 2.262.59 4.476 1.71 6.42L3.2 28.8l6.554-1.685A12.78 12.78 0 0 0 16 28.8c7.063 0 12.8-5.737 12.8-12.8S23.063 3.2 16.001 3.2zm0 23.36a10.54 10.54 0 0 1-5.376-1.469l-.386-.229-3.891 1.001 1.039-3.793-.252-.402a10.55 10.55 0 0 1-1.616-5.668c0-5.838 4.745-10.582 10.582-10.582 5.838 0 10.582 4.745 10.582 10.582s-4.744 10.56-10.582 10.56zm5.785-7.911c-.317-.158-1.875-.926-2.165-1.032-.29-.106-.502-.158-.713.158-.211.317-.819 1.032-1.005 1.243-.184.211-.37.238-.687.079-.317-.158-1.337-.493-2.547-1.572-.941-.84-1.577-1.876-1.762-2.193-.184-.317-.02-.488.139-.646.143-.142.317-.37.476-.555.158-.184.211-.317.317-.528.106-.211.053-.396-.026-.555-.079-.158-.713-1.717-.977-2.351-.257-.617-.519-.533-.713-.543l-.607-.011a1.17 1.17 0 0 0-.846.396c-.29.317-1.111 1.085-1.111 2.644s1.137 3.066 1.296 3.277c.158.211 2.241 3.42 5.43 4.797.759.327 1.351.523 1.813.67.762.242 1.456.208 2.005.126.611-.091 1.875-.766 2.139-1.506.265-.74.265-1.374.184-1.506-.079-.132-.29-.211-.607-.37z" />
            </svg>
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}