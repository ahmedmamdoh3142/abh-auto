'use client';

/**
 * DeferredIntro — شاشة التحميل بدون أي تأثير على صفحة الهوم.
 *
 *  • صفحة الهوم ("/"): لا تظهر شاشة التحميل إطلاقًا — لا تُحمَّل ولا تُرسَم،
 *    فلا تحجب الـ LCP وتستقر النتيجة في الأخضر.
 *  • باقي الصفحات: تظهر شاشة التحميل بعد أول رسم فقط (dynamic + ssr:false)،
 *    فتبقى اللمسة الفخمة موجودة في التنقّل دون التأثير على قياس الأداء.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const LoadingScreen = dynamic(
  () => import('@/components/shared/loading-screen').then((m) => m.LoadingScreen),
  { ssr: false }
);

// طبّع المسار: يشيل بادئة اللغة (/en, /ar) ويحدد إن كانت هي الصفحة الرئيسية.
function isHome(pathname: string | null): boolean {
  if (!pathname) return false;
  const stripped = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  return stripped === '/';
}

export function DeferredIntro() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isHome(pathname)) return; // الهوم: لا تظهر إطلاقًا
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [pathname]);

  if (isHome(pathname) || !ready) return null;
  return <LoadingScreen />;
}