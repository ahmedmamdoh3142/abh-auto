'use client';

/**
 * JsCheckoutPanel — الدفع بالبطاقة مدمج جوّه صفحة التأكيد (JS Checkout SDK)
 * بدل التحويل لصفحة AlinmaPay المنفصلة. حقول الكارت من تصميم AlinmaPay،
 * لكن الحاوية والعنوان والألوان من هويتنا احنا.
 *
 * (إصلاح) الكونتينر #pg-card-box لازم يفضل موجود ومرئي في الـDOM من أول
 * لحظة — لأن AlinmaPay SDK بيرندر فورم الكارت جواه بشكل متزامن وقت
 * window.PG.startPayment()، وده بيحصل قبل ما تحديث state الخاص بينا
 * (loading/ready) يوصل فعليًا للـDOM. لو الكونتينر كان مخفي (display:none)
 * وقتها، الـSDK بيفشل يرندر أو بيرمي إيرور. الحل: الكونتينر يفضل ظاهر
 * دايمًا، واللودينج/الإيرور بيتحطوا فوقه كطبقة (overlay) بس.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    PG?: {
      init: (opts: { onSuccess: (r: any) => void; onFailure: (e: any) => void }) => void;
      startPayment: () => void;
    };
    PG_CONFIG?: any;
  }
}

export function JsCheckoutPanel({
  bookingId, reference, amount, isAr, onSuccess, onBack,
}: {
  bookingId: string;
  reference: string;
  amount: number;
  isAr: boolean;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // (إصلاح) نحتفظ بأحدث نسخة من onSuccess في ref بدل ما نحطها في dependency
  // array بتاع الـuseEffect — لأنها function جديدة كل رندر من الأب، وكانت
  // بتعمل إعادة تحميل/تهيئة لبوابة الدفع من غير داعي كل ما الصفحة تتحدّث.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  useEffect(() => {
    let alive = true;
    startedRef.current = false;
    setStatus('loading');
    setErrorMsg(null);

    (async () => {
      try {
        const res = await fetch('/api/payment/alinma/js-config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, amount }),
        });
        const j = await res.json();
        if (!alive) return;
        if (!j?.ok) {
          setStatus('error');
          setErrorMsg(j?.error === 'already_paid' ? (isAr ? 'الحجز مدفوع بالفعل' : 'Already paid') : (isAr ? 'تعذّر تجهيز صفحة الدفع' : "Couldn't prepare checkout"));
          return;
        }

        window.PG_CONFIG = j.config;

        const existing = document.querySelector(`script[data-alinma-sdk]`) as HTMLScriptElement | null;
        const boot = () => {
          if (!alive || !window.PG) return;
          window.PG.init({
            onSuccess: () => { if (alive) onSuccessRef.current(); },
            onFailure: (e: any) => {
              if (!alive) return;
              setStatus('error');
              setErrorMsg(e?.msg || (isAr ? 'فشلت عملية الدفع' : 'Payment failed'));
            },
          });
          // الكونتينر جاهز وظاهر بالفعل في الـDOM (مش مربوط بالـstate) —
          // فآمن نستدعي startPayment فورًا من غير ما نستنى إعادة رندر.
          if (!startedRef.current) { startedRef.current = true; window.PG.startPayment(); }
          setStatus('ready');
        };

        if (existing && window.PG) { boot(); return; }

        const script = existing ?? document.createElement('script');
        if (!existing) {
          script.src = j.config.sdkUrl;
          script.async = true;
          script.setAttribute('data-alinma-sdk', 'true');
          document.body.appendChild(script);
        }
        script.addEventListener('load', boot, { once: true });
        script.addEventListener('error', () => {
          if (!alive) return;
          setStatus('error');
          setErrorMsg(isAr ? 'تعذّر تحميل بوابة الدفع' : "Couldn't load the payment gateway");
        }, { once: true });
      } catch (e) {
        console.error('js-checkout config failed:', e);
        if (alive) { setStatus('error'); setErrorMsg(isAr ? 'تعذّر تجهيز صفحة الدفع' : "Couldn't prepare checkout"); }
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, amount, isAr]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5">
        <button onClick={onBack} data-cursor="hover"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
          <ArrowLeft className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={1.8} />
        </button>
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.3em] text-steel">{reference}</div>
          <h2 className="font-display text-2xl font-light uppercase text-ivory md:text-3xl">
            {isAr ? 'إتمام الدفع' : 'Complete Payment'}
          </h2>
        </div>
      </div>

      <div className="rounded-[24px] border border-platinum/20 bg-gradient-to-b from-platinum/[0.06] to-white/[0.01] p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-5">
          <span className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-platinum/70">
            <ShieldCheck className="h-4 w-4 text-platinum" strokeWidth={1.6} />
            {isAr ? 'دفع آمن عبر AlinmaPay' : 'Secured by AlinmaPay'}
          </span>
          <span dir="ltr" className="font-display text-lg text-ivory tabular-nums">{amount.toFixed(2)} <span className="text-xs text-platinum/60">SAR</span></span>
        </div>

        {/* حاوية فورم الكارت — تفضل موجودة وظاهرة في الـDOM دايمًا؛ اللودينج/الإيرور
            بيتحطوا فوقها كطبقة (overlay) عشان الـSDK يقدر يرندر جواها بنجاح
            من أول لحظة، أيًا كانت حالة الـstate. */}
        <div className="relative min-h-[220px]">
          <div id="pg-card-box" ref={containerRef} />

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidian/95 text-platinum/60">
              <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.8} />
              <span className="text-sm">{isAr ? 'جارٍ تجهيز صفحة الدفع…' : 'Preparing checkout…'}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-obsidian/95 text-center">
              <span className="text-sm text-[#e7b4b4]">{errorMsg}</span>
              <button onClick={onBack} data-cursor="hover"
                className="rounded-full border border-white/15 px-6 py-2.5 text-[0.68rem] uppercase tracking-[0.14em] text-ivory hover:border-white/30">
                {isAr ? 'رجوع' : 'Back'}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[0.66rem] leading-relaxed text-steel/60">
        {isAr ? 'بياناتك تُدخل مباشرة على بوابة AlinmaPay المشفّرة — لا نطّلع على أرقام بطاقتك.' : "Your details go straight to AlinmaPay's encrypted gateway — we never see your card number."}
      </p>
    </div>
  );
}