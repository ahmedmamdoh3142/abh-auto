'use client';

/**
 * AboutChapters — يؤجّل تحميل وهيدريشن الفصول التي تحت الطية.
 *
 * المشكلة: الفصول الثمانية كانت كلها client components تعمل hydration وتفتح
 * مشتركات useScroll/useTransform وأنيميشن لا نهائي **عند التحميل دفعة واحدة**،
 * فيتراكم زمن حظر رئيسي ضخم (TBT ~13s).
 *
 * الحل: ColdOpen فقط (عنصر الـLCP/أعلى الطية) يبقى eager. باقي الفصول تُحمَّل
 * عبر next/dynamic({ ssr:false }) ولا تُركّب إلا عند الاقتراب منها بمسافة 800px
 * (IntersectionObserver). بهذا:
 *   • مقاسات الـbundle الأولية تنخفض (كل فصل chunk منفصل يُطلب عند الحاجة).
 *   • أثناء قياس Lighthouse (الذي لا يُمرّر الصفحة) لا تُركَّب الفصول إطلاقًا
 *     → ينهار الـTBT لأن JS بتاعها لا يُنفَّذ في نافذة التحميل.
 *   • تجربة المستخدم الحقيقية تتحسّن: الهيدريشن يتوزّع مع السكرول لا دفعة واحدة.
 *
 * منع الـCLS: كل عنصر مؤجَّل له placeholder بنفس ارتفاع القسم (svh)، فلا يحدث
 * أي إزاحة عند التركيب (القسم نفسه يفرض نفس الارتفاع بعد ظهوره).
 *
 * ملاحظة SEO: مع ssr:false لا يظهر نص الفصول في HTML الأولي. إن كان نص فصلٍ
 * مهمًّا للأرشفة (مثلاً المانيفستو/الدعوة)، انقله إلى eager بنفس نمط ColdOpen
 * أو أبقِ نسخة نصية مُخدَّمة من الخادم. التفاصيل في ردّي بالشات.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const opts = { ssr: false } as const;

const ChapterObsession = dynamic(
  () => import('@/components/sections/about/chapter-01-obsession').then((m) => ({ default: m.ChapterObsession })),
  opts,
);
const ChapterCloseUp = dynamic(
  () => import('@/components/sections/about/chapter-02-closeup').then((m) => ({ default: m.ChapterCloseUp })),
  opts,
);
const ChapterHand = dynamic(
  () => import('@/components/sections/about/chapter-03-hand').then((m) => ({ default: m.ChapterHand })),
  opts,
);
const ChapterStandard = dynamic(
  () => import('@/components/sections/about/chapter-04-standard').then((m) => ({ default: m.ChapterStandard })),
  opts,
);
const ChapterRoom = dynamic(
  () => import('@/components/sections/about/chapter-05-room').then((m) => ({ default: m.ChapterRoom })),
  opts,
);
const ChapterRemains = dynamic(
  () => import('@/components/sections/about/chapter-06-remains').then((m) => ({ default: m.ChapterRemains })),
  opts,
);
const ChapterInvitation = dynamic(
  () => import('@/components/sections/about/chapter-07-invitation').then((m) => ({ default: m.ChapterInvitation })),
  opts,
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