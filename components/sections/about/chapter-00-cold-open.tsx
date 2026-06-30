'use client';

/**
 * Chapter 00 — Title Card  (perf-optimized)
 *
 * إصلاحات الأداء الأساسية في هذا الملف:
 *  1) عنصر الـLCP (كلمة "ABH") كان محبوسًا داخل motion.div مربوط بـuseScroll،
 *     فما كان بيظهر غير بعد hydration framer (على الموبايل ~2.8s تأخير →
 *     LCP=10s). طلّعناه برّه أي motion مرتبط بالسكرول → يُرسم فورًا من أول فريم
 *     في الـHTML. باقي المحتوى (العنوان/الإحداثيات) يفضل مربوط بالسكرول عادي.
 *  2) كل الأنيميشن اللانهائي (bloom / scan / ring / dot / caret / scroll) CSS
 *     keyframes (compositor) بدل framer (main thread).
 *  3) أُسقط فلتر blur المربوط بالسكرول (repaint مكلف) وبقي فقط y + opacity.
 *  4) رُفعت تباينات النص الصغير (platinum/55→/80) لتجاوز فحص التباين (a11y).
 *  5) كل الحركة تُعطَّل تلقائيًا مع prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';

export function ColdOpen() {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Master composition lift on scroll (y + opacity فقط — بدون blur filter)
  const compY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const compOp = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);

  // Frame opacity — fades earlier than content for layered exit
  const frameOp = useTransform(scrollYProgress, [0, 0.3, 0.7], [1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[140svh] w-full bg-obsidian"
      data-chapter="00"
    >
      {/* أنيميشن CSS المحلية لهذا الفصل (compositor، لا main-thread) */}
      <style>{`
        .co-bloom{left:50%;top:50%;transform:translate(-50%,-50%) scale(1);animation:coBloom 12s ease-in-out infinite;}
        @keyframes coBloom{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.06);opacity:1}}
        .co-scan{animation:coScan 22s ease-in-out infinite alternate;}
        @keyframes coScan{0%{transform:translateX(-30vw)}100%{transform:translateX(30vw)}}
        .co-spin{animation:coSpin 80s linear infinite;}
        @keyframes coSpin{to{transform:rotate(360deg)}}
        .co-ping{animation:coPing 2.4s ease-out infinite;}
        @keyframes coPing{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(2.2);opacity:0}}
        .co-caret{animation:coBlink 1s steps(1,end) infinite;}
        @keyframes coBlink{0%,100%{opacity:1}50%{opacity:0}}
        @media (prefers-reduced-motion: reduce){
          .co-bloom,.co-scan,.co-spin,.co-ping,.co-caret{animation:none!important}
        }
      `}</style>

      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Ambient platinum bloom — CSS infinite */}
        <div
          aria-hidden
          className="co-bloom pointer-events-none absolute z-0 h-[60rem] w-[60rem] rounded-full bg-platinum/[0.045] blur-[200px]"
        />

        {/* Drifting vertical scan line — CSS infinite */}
        <div
          aria-hidden
          className="co-scan pointer-events-none absolute inset-y-0 z-0 w-px bg-gradient-to-b from-transparent via-platinum/15 to-transparent"
        />

        {/* Faint grid lines */}
        <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />

        {/* Passe-partout frame */}
        <Frame opacity={frameOp} />

        {/* ── عنصر الـLCP (ABH) + counter — خارج أي motion مربوط بالسكرول ──
            يُرسم فورًا في الـHTML بدون انتظار hydration → ينهار تأخير الـLCP.
            نضع نفس الإزاحة بصريًا عبر الحاوية الأم (نفس مكان العرض السابق). */}
        <div className="relative z-10 flex flex-col items-center">
          <ChapterCounter />
          <Monogram />
        </div>

        {/* باقي التكوين (العنوان + الإحداثيات) — يبقى مربوطًا بالسكرول كما كان */}
        <motion.div
          style={{ y: compY, opacity: compOp }}
          className="pointer-events-none absolute z-10 flex flex-col items-center"
          // نضع هذه الطبقة فوق المركز لتُكمل التكوين أسفل المونوغرام بصريًا
        >
          <div className="flex flex-col items-center pt-[clamp(15rem,26vw,21rem)]">
            <SectionTitle />
            <Coordinates />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   Frame — passe-partout (entrances لمرة واحدة، تبقى framer)
   ═══════════════════════════════════════════════════════════ */
function Frame({ opacity }: { opacity: MotionValue<number> }) {
  const corners = [
    { pos: 'left-0 top-0',     tx: '-50%', ty: '-50%' },
    { pos: 'right-0 top-0',    tx: '50%',  ty: '-50%' },
    { pos: 'left-0 bottom-0',  tx: '-50%', ty: '50%' },
    { pos: 'right-0 bottom-0', tx: '50%',  ty: '50%' },
  ];

  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none absolute inset-6 z-[5] md:inset-10"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-transparent via-platinum/35 to-transparent"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-r from-transparent via-platinum/35 to-transparent"
      />
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-y-0 left-0 w-px origin-top bg-gradient-to-b from-transparent via-platinum/35 to-transparent"
      />
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-y-0 right-0 w-px origin-bottom bg-gradient-to-b from-transparent via-platinum/35 to-transparent"
      />

      {corners.map((c, i) => (
        <motion.div
          key={c.pos}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute ${c.pos}`}
          style={{ transform: `translate(${c.tx}, ${c.ty})` }}
        >
          <div className="relative h-3 w-3">
            <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-platinum/60" />
            <span className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-platinum/60" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Chapter counter — تباين مرفوع (/55 → /80)
   ═══════════════════════════════════════════════════════════ */
function ChapterCounter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10 flex items-center gap-3"
      dir="ltr"
    >
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.45em] text-platinum/80">[</span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.35em] text-platinum/90">
        00 / 07 · Chapters
      </span>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.45em] text-platinum/80">]</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Monogram — الـwordmark (عنصر LCP) يُرسم فورًا، بلا opacity-fade
   ═══════════════════════════════════════════════════════════ */
function Monogram() {
  return (
    <div className="relative" dir="ltr">
      {/* Outer dashed ring — CSS rotate (كان framer infinite) */}
      <div className="co-spin absolute inset-0 grid place-items-center">
        <svg viewBox="0 0 200 200" className="h-[clamp(13rem,22vw,18rem)] w-[clamp(13rem,22vw,18rem)]">
          <motion.circle
            cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.5"
            strokeDasharray="2 6" className="text-platinum/50"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      </div>

      {/* Static inner ring + cardinal ticks */}
      <div className="absolute inset-0 grid place-items-center">
        <svg viewBox="0 0 200 200" className="h-[clamp(13rem,22vw,18rem)] w-[clamp(13rem,22vw,18rem)]">
          <motion.circle
            cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="0.4"
            className="text-platinum/40"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          {[
            { x1: 100, y1: 6,   x2: 100, y2: 12 },
            { x1: 194, y1: 100, x2: 188, y2: 100 },
            { x1: 100, y1: 194, x2: 100, y2: 188 },
            { x1: 6,   y1: 100, x2: 12,  y2: 100 },
          ].map((tick, i) => (
            <motion.line
              key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
              stroke="currentColor" strokeWidth="1" className="text-platinum/80"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 2 + i * 0.08 }}
            />
          ))}
        </svg>
      </div>

      {/* Center wordmark — LCP: مرئي بالكامل من أول فريم (لا fade، لا delay) */}
      <div
        className="grid h-[clamp(13rem,22vw,18rem)] w-[clamp(13rem,22vw,18rem)] place-items-center"
        style={{ letterSpacing: '0.12em' }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-[clamp(3rem,6vw,5rem)] leading-none">
            <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
              ABH
            </span>
          </span>
          <span className="block h-px w-10 bg-platinum/60" />
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.5em] text-platinum/80">
            Atelier
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Section title — bilingual
   ═══════════════════════════════════════════════════════════ */
function SectionTitle() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.6 }}
      className="mt-12 flex flex-col items-center gap-6"
    >
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="block h-px w-20 origin-right bg-gradient-to-r from-transparent to-platinum/70 md:w-32"
        />
        <span className="relative grid h-2 w-2 rotate-45 place-items-center bg-gradient-to-br from-ivory via-platinum to-steel shadow-[0_0_12px_rgba(203,205,205,0.5)]">
          <span className="absolute inset-[1px] bg-obsidian" />
        </span>
        <motion.span
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="block h-px w-20 origin-left bg-gradient-to-l from-transparent to-platinum/70 md:w-32"
        />
      </div>

      <div className="flex flex-col items-center gap-2 md:flex-row md:gap-6">
        <motion.span
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 2, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] uppercase tracking-[0.18em] text-ivory"
          dir="ltr"
        >
          About
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 2.3 }}
          className="hidden h-1 w-1 rotate-45 bg-platinum/60 md:block"
        />
        <motion.span
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-arabic text-[clamp(1.8rem,3.5vw,2.8rem)] tracking-tight text-platinum/85"
          dir="rtl"
        >
          من نحن
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Coordinates — typewriter + CSS caret
   ═══════════════════════════════════════════════════════════ */
function Coordinates() {
  const fullText = 'JEDDAH · EST. 2022';
  const [shown, setShown] = useState('');

  useEffect(() => {
    const startDelay = 2400;
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        if (i >= fullText.length) {
          if (interval) clearInterval(interval);
          return;
        }
        i++;
        setShown(fullText.slice(0, i));
      }, 35);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 2.4 }}
      className="mt-10 flex items-center gap-3"
      dir="ltr"
    >
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.35em] text-platinum/80">
        {shown}
      </span>
      <span className="co-caret block h-2 w-px bg-platinum/80" />
    </motion.div>
  );
}