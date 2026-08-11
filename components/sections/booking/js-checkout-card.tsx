'use client';

/**
 * JsCheckoutPanel — الدفع بالبطاقة مدمج جوّه صفحة التأكيد (JS Checkout SDK)
 * بدل التحويل لصفحة AlinmaPay المنفصلة. حقول الكارت من تصميم AlinmaPay،
 * لكن الحاوية والعنوان والألوان من هويتنا احنا.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

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
            onSuccess: () => { if (alive) onSuccess(); },
            onFailure: (e: any) => {
              if (!alive) return;
              setStatus('error');
              setErrorMsg(e?.msg || (isAr ? 'فشلت عملية الدفع' : 'Payment failed'));
            },
          });
          setStatus('ready');
          if (!startedRef.current) { startedRef.current = true; window.PG.startPayment(); }
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
  }, [bookingId, amount, isAr, onSuccess]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
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

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-14 text-platinum/60">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.8} />
            <span className="text-sm">{isAr ? 'جارٍ تجهيز صفحة الدفع…' : 'Preparing checkout…'}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="text-sm text-[#e7b4b4]">{errorMsg}</span>
            <button onClick={onBack} data-cursor="hover"
              className="rounded-full border border-white/15 px-6 py-2.5 text-[0.68rem] uppercase tracking-[0.14em] text-ivory hover:border-white/30">
              {isAr ? 'رجوع' : 'Back'}
            </button>
          </div>
        )}

        {/* حاوية فورم الكارت — AlinmaPay بترندر جواها. لازم تفضل في الـDOM حتى وإحنا في loading */}
        <div id="pg-card-box" ref={containerRef} className={status === 'ready' ? '' : 'hidden'} />
      </div>

      <p className="mt-4 text-center text-[0.66rem] leading-relaxed text-steel/60">
        {isAr ? 'بياناتك تُدخل مباشرة على بوابة AlinmaPay المشفّرة — لا نطّلع على أرقام بطاقتك.' : "Your details go straight to AlinmaPay's encrypted gateway — we never see your card number."}
      </p>
    </motion.div>
  );
}