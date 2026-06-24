'use client';

/**
 * ReferralPanel — «رشّح صاحبك». مكوّن مستقل (حطّه في /offers أو تاب في البروفايل).
 * Path: components/sections/offers/referral-panel.tsx
 *
 * يعرض كود إحالة العضو + رابط مشاركة + إحصائيات، وخانة لاستخدام كود صاحب.
 * يجلب بياناته بنفسه؛ يختفي لو مفيش تسجيل دخول أو لو الحساب شركة.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Users, Copy, Check, Gift, Share2 } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

interface RefData { enabled: boolean; code?: string; referrerPct?: number; referredPct?: number; joined?: number; rewarded?: number }

export function ReferralPanel() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);

  const [data, setData] = useState<RefData | null>(null);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [redeem, setRedeem] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; coupon?: string | null } | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/account/referral');
      if (res.status === 401) { setHidden(true); return; }
      const j = await res.json();
      if (j?.ok && j.enabled) setData(j); else setHidden(true);
    } catch { setHidden(true); }
  };
  useEffect(() => { load(); }, []);

  if (hidden) return null;
  if (!data) {
    return <div className="grid place-items-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-platinum" /></div>;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/?ref=${data.code}`;

  const copy = async (what: 'code' | 'link', text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch { /* */ }
  };

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'ABH Auto', text: T('استخدم كود الإحالة بتاعي', 'Use my referral code'), url: link }); } catch { /* */ } }
    else copy('link', link);
  };

  const doRedeem = async () => {
    const code = redeem.trim();
    if (!code || busy) return;
    setBusy(true); setMsg(null);
    try {
      const j = await fetch('/api/referral/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      }).then((r) => r.json());
      if (j?.ok) {
        setMsg({ kind: 'ok', text: T('تمام! مكافأتك جاهزة في «أكوادي».', 'Done! Your reward is in “My codes”.'), coupon: j.yourCode });
        setRedeem(''); load();
      } else {
        const m: Record<string, string> = {
          invalid_code: T('الكود غير صحيح.', 'Invalid code.'),
          self: T('مينفعش تستخدم كودك أنت.', 'You can’t use your own code.'),
          already_referred: T('سبق واستخدمت كود إحالة.', 'You already used a referral code.'),
          code_required: T('اكتب الكود.', 'Enter a code.'),
        };
        setMsg({ kind: 'err', text: m[j?.error] || T('حصل خطأ، جرّب تاني.', 'Something went wrong.') });
      }
    } catch { setMsg({ kind: 'err', text: T('خطأ بالشبكة.', 'Network error.') }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 text-[0.58rem] uppercase tracking-[0.34em] text-platinum/70">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />
          <Users className="h-3.5 w-3.5 text-[#e8d6a8]" strokeWidth={1.8} />{T('رشّح صاحبك', 'Refer a friend')}
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-platinum/60" />
        </div>
        <h2 className="mt-4 font-display text-[clamp(1.8rem,4.5vw,2.8rem)] font-light uppercase leading-none tracking-tight text-ivory">
          {T('اكسب أنت وصاحبك', 'You both win')}
        </h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-sm text-platinum/65">
          {T(`شارك كودك — صاحبك ياخد خصم ${data.referredPct}%، وأنت كمان ${data.referrerPct}% على حجزك الجاي.`,
             `Share your code — your friend gets ${data.referredPct}% off, and you get ${data.referrerPct}% on your next booking.`)}
        </p>
      </div>

      {/* كود المشاركة */}
      <div className="mt-8 overflow-hidden rounded-[26px] border border-white/[0.1] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="text-[0.56rem] uppercase tracking-[0.24em] text-platinum/60">{T('كودك', 'Your code')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => copy('code', data.code!)} data-cursor="hover"
            className="group flex items-center gap-3 rounded-2xl border border-[#d9b25f]/40 bg-[#d9b25f]/[0.08] px-5 py-3.5 transition-colors hover:border-[#d9b25f]/70">
            <span dir="ltr" className="font-display text-2xl tracking-[0.2em] text-[#e8d6a8]">{data.code}</span>
            <span className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-platinum/70">
              {copied === 'code' ? <><Check className="h-4 w-4 text-[#46b98a]" />{T('اتنسخ', 'Copied')}</> : <><Copy className="h-4 w-4" />{T('انسخ', 'Copy')}</>}
            </span>
          </button>
          <button onClick={share} data-cursor="hover"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3.5 text-[0.64rem] uppercase tracking-[0.16em] text-ivory transition-colors hover:border-white/30">
            <Share2 className="h-4 w-4" strokeWidth={1.8} />{T('شارك الرابط', 'Share link')}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat label={T('صحاب انضمّوا', 'Friends joined')} value={data.joined ?? 0} />
          <Stat label={T('مكافآت', 'Rewards')} value={data.rewarded ?? 0} gold />
        </div>
      </div>

      {/* استخدام كود صاحب */}
      <div className="mt-5 rounded-[26px] border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
        <div className="text-[0.56rem] uppercase tracking-[0.24em] text-platinum/60">{T('عندك كود صاحبك؟', 'Got a friend’s code?')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={redeem} onChange={(e) => setRedeem(e.target.value.toUpperCase())}
            placeholder={T('ABH-XXXXXX', 'ABH-XXXXXX')} dir="ltr"
            className="min-w-[180px] flex-1 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3.5 font-display tracking-[0.14em] text-ivory outline-none transition-colors placeholder:text-steel focus:border-platinum/50" />
          <button onClick={doRedeem} disabled={busy || !redeem.trim()} data-cursor="hover"
            className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-obsidian transition-transform duration-500 ${busy || !redeem.trim() ? 'opacity-50' : 'hover:-translate-y-0.5'}`}
            style={{ background: 'linear-gradient(135deg,#f0dca6,#d9b25f)' }}>
            <Gift className="h-4 w-4" strokeWidth={2} />{busy ? T('...', '...') : T('استخدم', 'Redeem')}
          </button>
        </div>
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mt-3 flex flex-wrap items-center gap-2 text-[0.74rem] ${msg.kind === 'ok' ? 'text-[#a8e6cb]' : 'text-[#e7b4b4]'}`}>
              {msg.kind === 'ok' && <Check className="h-3.5 w-3.5" strokeWidth={2.2} />}
              {msg.text}
              {msg.coupon && <span dir="ltr" className="rounded-full border border-[#d9b25f]/40 bg-[#d9b25f]/[0.1] px-2.5 py-0.5 font-display tracking-[0.12em] text-[#e8d6a8]">{msg.coupon}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-center">
      <div className={`font-display text-3xl tabular-nums ${gold ? 'text-[#e8d6a8]' : 'text-ivory'}`}>{value}</div>
      <div className="mt-1 text-[0.55rem] uppercase tracking-[0.18em] text-steel">{label}</div>
    </div>
  );
}