'use client';

/**
 * DeferredChrome — يحمّل العناصر البصرية غير الأساسية بعد أول رسم فقط:
 * المؤشر المخصص، الأورب المتوهجة، وشريط تقدم التمرير. هذه لا تؤثر على
 * المحتوى فوق الطية، لكنها تشغّل JS في اللحظة الأولى وتؤخّر استقرار الصفحة (LCP).
 * بتأجيلها يقل الـ Script Evaluation الأولي ويتحسّن الـ LCP دون أي تغيير بصري ملموس.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AmbientOrbs = dynamic(
  () => import('@/components/shared/ambient-orbs').then((m) => m.AmbientOrbs),
  { ssr: false }
);
const ScrollProgress = dynamic(
  () => import('@/components/shared/scroll-progress').then((m) => m.ScrollProgress),
  { ssr: false }
);

export function DeferredChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ننتظر خمول المتصفح بعد أول رسم حتى لا نزاحم رسم المحتوى الأساسي.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    let idle = 0;
    let raf = 0;
    if (typeof w.requestIdleCallback === 'function') {
      idle = w.requestIdleCallback(() => setReady(true));
    } else {
      raf = window.setTimeout(() => setReady(true), 200);
    }
    return () => {
      const wc = window as unknown as { cancelIdleCallback?: (id: number) => void };
      if (idle && wc.cancelIdleCallback) wc.cancelIdleCallback(idle);
      if (raf) clearTimeout(raf);
    };
  }, []);

  if (!ready) return null;
  return (
    <>
      <AmbientOrbs />
      <ScrollProgress />
    </>
  );
}