'use client';

/**
 * AboutChapters — يؤجّل تحميل وهيدريشن الفصول التي تحت الطية.
 *
 * ColdOpen فقط يبقى eager. باقي الفصول تُحمَّل عبر next/dynamic({ ssr:false })
 * ولا تُركَّب إلا عند الاقتراب منها 800px (IntersectionObserver). هذا يقلّل
 * زمن الحظر الرئيسي (TBT) بشكل كبير ويوزّع الهيدريشن مع السكرول.
 *
 * ملاحظة بناء: خيارات next/dynamic يجب أن تكون object literal مكتوبًا داخل
 * الاستدعاء مباشرة (لا متغيّر مشترك)، وإلا يفشل البناء.
 *
 * ملاحظة SEO: مع ssr:false لا يظهر نص الفصول في HTML الأولي. إن كان نص فصلٍ
 * مهمًّا للأرشفة انقله إلى eager بنفس نمط ColdOpen.
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
      <Defer minH="320svh"><ChapterObsession /></Defer>
      <Defer minH="500svh"><ChapterCloseUp /></Defer>
      <Defer minH="280svh"><ChapterHand /></Defer>
      <Defer minH="450svh"><ChapterStandard /></Defer>
      <Defer minH="300svh"><ChapterRoom /></Defer>
      <Defer minH="550svh"><ChapterRemains /></Defer>
      <Defer minH="100svh"><ChapterInvitation /></Defer>
    </>
  );
}