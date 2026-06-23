'use client';

/**
 * AboutChapters — يؤجّل تحميل وهيدريشن الفصول التي تحت الطية.
 *
 * ملاحظة: ارتفاعات الـplaceholder (minH) لازم تساوي ارتفاعات الأقسام الجديدة
 * بعد تقليلها، حتى لا يحدث أي قفز (CLS) عند التركيب.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const ChapterObsession = dynamic(
  () => import('@/components/sections/about/chapter-01-obsession').then((m) => ({ default: m.ChapterObsession })),
  { ssr: false },
);
const ChapterCloseUp = dynamic(
  () => import('@/components/sections/about/chapter-02-closeup').then((m) => ({ default: m.ChapterCloseUp })),
  { ssr: false },
);
const ChapterHand = dynamic(
  () => import('@/components/sections/about/chapter-03-hand').then((m) => ({ default: m.ChapterHand })),
  { ssr: false },
);
const ChapterStandard = dynamic(
  () => import('@/components/sections/about/chapter-04-standard').then((m) => ({ default: m.ChapterStandard })),
  { ssr: false },
);
const ChapterRoom = dynamic(
  () => import('@/components/sections/about/chapter-05-room').then((m) => ({ default: m.ChapterRoom })),
  { ssr: false },
);
const ChapterRemains = dynamic(
  () => import('@/components/sections/about/chapter-06-remains').then((m) => ({ default: m.ChapterRemains })),
  { ssr: false },
);
const ChapterInvitation = dynamic(
  () => import('@/components/sections/about/chapter-07-invitation').then((m) => ({ default: m.ChapterInvitation })),
  { ssr: false },
);

/** يركّب children فقط عند الاقتراب من الـviewport؛ قبلها placeholder بنفس الارتفاع. */
function Defer({ minH, children }: { minH: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShow(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight: minH }}>
      {show ? children : null}
    </div>
  );
}

export function AboutChapters() {
  return (
    <>
      <Defer minH="200svh"><ChapterObsession /></Defer>
      <Defer minH="350svh"><ChapterCloseUp /></Defer>
      <Defer minH="190svh"><ChapterHand /></Defer>
      <Defer minH="300svh"><ChapterStandard /></Defer>
      <Defer minH="200svh"><ChapterRoom /></Defer>
      <Defer minH="340svh"><ChapterRemains /></Defer>
      <Defer minH="100svh"><ChapterInvitation /></Defer>
    </>
  );
}