/**
 * ScrollProgress — Thin platinum line at the top of the viewport tracking
 * the user's scroll position. Reveals after the loading screen exits.
 */
"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
    restDelta: 0.001,
  });

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-transparent via-platinum to-transparent"
      style={{ scaleX, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      aria-hidden
    />
  );
}
