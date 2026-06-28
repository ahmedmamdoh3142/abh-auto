'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * LoadingScreen — intro overlay (v2: لوجو الشركة + أداء أعلى).
 *
 * تحسينات الأداء:
 *  • شِيل framer-motion بالكامل — كل الحركة CSS keyframes على الـ compositor
 *    (transform/opacity فقط) فلا تلمس الـ main thread ولا تؤخّر الـ LCP.
 *  • شِيل الجزيئات الـ12 المتحركة (كانت framer infinite على الـ main thread).
 *  • اللوجو صورة حقيقية (/images/logo.webp) بدل SVG السداسي — أخف وأوضح.
 *  • يظهر مرة واحدة لكل جلسة (sessionStorage)، ويقفل بعد ~750ms.
 *  • الخروج fade/scale عبر class (مش framer) فلا يحجب الرسم.
 */
export function LoadingScreen() {
  const t = useTranslations('loader');
  const tBrand = useTranslations('brand');
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('abh_intro') === '1'; } catch {}
    if (seen) { setDone(true); return; }
    try { sessionStorage.setItem('abh_intro', '1'); } catch {}
    setShow(true);

    let start: number | null = null;
    const total = 750;
    let raf: number;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(Math.floor(eased * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setLeaving(true);                    // ابدأ أنيميشن الخروج (CSS)
        setTimeout(() => setDone(true), 480); // شِيل من الـ DOM بعد الخروج
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!show || done) return null;

  return (
    <div className={`abh-loader ${leaving ? 'abh-loader-leave' : ''}`}>
      <style>{LOADER_CSS}</style>

      {/* وهج خفيف خلف اللوجو */}
      <div className="abh-loader-glow" aria-hidden />

      <div className="abh-loader-inner">
        {/* اللوجو الحقيقي */}
        <div className="abh-loader-logo">
          <img
            src="/images/logo.webp"
            alt={tBrand('name')}
            width={120}
            height={120}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {/* الاسم + التاج لاين */}
        <div className="abh-loader-text">
          <div className="abh-loader-name">{tBrand('name')}</div>
          <div className="abh-loader-tag">{t('tagline')}</div>
        </div>

        {/* شريط التقدّم */}
        <div className="abh-loader-bar-wrap">
          <div className="abh-loader-track">
            <span className="abh-loader-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="abh-loader-count">{String(progress).padStart(3, '0')} / 100</div>
        </div>
      </div>
    </div>
  );
}

const LOADER_CSS = `
.abh-loader{
  position:fixed; inset:0; z-index:10000;
  display:flex; align-items:center; justify-content:center;
  background:#0a0b0c;
  opacity:1;
  animation:abhLoaderIn .5s ease both;
  will-change:opacity;
}
.abh-loader-leave{
  animation:abhLoaderOut .48s cubic-bezier(.65,0,.35,1) both;
}
@keyframes abhLoaderIn{ from{opacity:0} to{opacity:1} }
@keyframes abhLoaderOut{
  from{opacity:1; transform:scale(1); filter:blur(0)}
  to{opacity:0; transform:scale(1.035); filter:blur(10px)}
}

/* وهج معدني ناعم خلف اللوجو — لا blur ثقيل (gradient فقط) */
.abh-loader-glow{
  position:absolute; width:420px; height:420px; border-radius:50%;
  background:radial-gradient(circle, rgba(203,205,205,.10), transparent 62%);
  pointer-events:none;
  animation:abhGlow 2.4s ease-in-out infinite alternate;
}
@keyframes abhGlow{
  from{opacity:.55; transform:scale(.96)}
  to{opacity:1; transform:scale(1.04)}
}

.abh-loader-inner{
  position:relative; z-index:1;
  display:flex; flex-direction:column; align-items:center; gap:34px;
  padding:0 24px;
}

/* اللوجو: ظهور + طفو لطيف (transform فقط = compositor) */
.abh-loader-logo{
  animation:abhLogoIn .8s cubic-bezier(.16,1,.3,1) both;
  will-change:transform,opacity;
}
.abh-loader-logo img{
  display:block; width:120px; height:auto;
  filter:drop-shadow(0 0 26px rgba(203,205,205,.32));
  animation:abhFloat 3.2s ease-in-out infinite;
}
@keyframes abhLogoIn{
  from{opacity:0; transform:scale(.86) translateY(8px)}
  to{opacity:1; transform:scale(1) translateY(0)}
}
@keyframes abhFloat{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-7px)}
}

.abh-loader-text{
  display:flex; flex-direction:column; align-items:center; gap:8px;
  animation:abhFadeUp .6s ease .25s both;
}
.abh-loader-name{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:1.5rem; letter-spacing:.32em; text-transform:uppercase;
  background:linear-gradient(135deg,#cbcdcd,#fff 50%,#666a6e);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
.abh-loader-tag{
  font-size:.65rem; letter-spacing:.3em; text-transform:uppercase;
  color:rgba(203,205,205,.6);
}

.abh-loader-bar-wrap{
  display:flex; flex-direction:column; align-items:center; gap:12px;
  width:288px;
  animation:abhFadeUp .5s ease .35s both;
}
.abh-loader-track{
  position:relative; height:1px; width:100%; overflow:hidden;
  background:rgba(255,255,255,.1);
}
.abh-loader-fill{
  position:absolute; inset-block:0; inset-inline-start:0;
  background:linear-gradient(90deg,transparent,#cbcdcd,transparent);
  transition:width .12s linear;
}
.abh-loader-count{
  font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;
  font-size:.65rem; letter-spacing:.3em; color:rgba(203,205,205,.7);
  font-variant-numeric:tabular-nums;
}

@keyframes abhFadeUp{
  from{opacity:0; transform:translateY(14px)}
  to{opacity:1; transform:translateY(0)}
}

/* احترام تقليل الحركة + توفير على الموبايل */
@media (prefers-reduced-motion:reduce){
  .abh-loader-logo img,.abh-loader-glow{animation:none!important}
}
`;