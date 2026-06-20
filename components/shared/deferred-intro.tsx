'use client';

/**
 * DeferredIntro — يحمّل شاشة التحميل بعد أول رسم فقط (بعد mount + idle).
 * بهذا لا يُرسَم أي overlay فوق المحتوى أثناء الـ SSR أو الرسم الأول،
 * فيُقاس الـ LCP على المحتوى الحقيقي (wordmark) فورًا. على الأجهزة/الجلسات
 * التي رأت الـ intro من قبل لا يظهر إطلاقًا (منطق sessionStorage داخل المكوّن).
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LoadingScreen = dynamic(
  () => import('@/components/shared/loading-screen').then((m) => m.LoadingScreen),
  { ssr: false }
);

export function DeferredIntro() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ننتظر إطارين + خمول المتصفح حتى لا نتنافس مع رسم المحتوى الأساسي.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  if (!ready) return null;
  return <LoadingScreen />;
}