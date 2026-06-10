'use client';

/**
 * LoginFlow — the /login experience for ABH Auto.
 * Path: components/sections/login/login-flow.tsx  (export `LoginFlow`)
 *
 * A cinematic member portal: a full-bleed vehicle stage (slow Ken-Burns drift,
 * platinum grade, light sweep, drifting particles, vignette) carries the whole
 * viewport, while a floating glass card holds the forms. Editorial copy sits on
 * the open side of the frame on large screens.
 *
 * Three console states, plus a welcome seal:
 *   SIGN IN          email → password, remember, forgot-password link.
 *   CREATE ACCOUNT   full name, email, phone, city, password — the exact
 *                    profile the booking flow pre-fills from.
 *   FORGOT           email → reset-link confirmation.
 *
 * On success a welcome seal plays, then we route to ?redirect (or home).
 * Strict palette (obsidian / ivory / platinum / steel). next-intl + RTL,
 * framer-motion, deterministic particles, no third-party sign-in.
 */
import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Check, ChevronDown,
  ShieldCheck, ArrowUpRight, ArrowLeft, MapPin, MailCheck,
} from 'lucide-react';

import { useAuth } from '@/components/shared/auth-provider';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The car that carries the stage. Swap for any cinematic vehicle asset
   (e.g. '/images/project-1.webp' or '/images/why-5.webp'). */
const PORTAL_IMAGE = '/images/hero-bg.webp';

/* Self-contained city list so login never couples to booking internals.
   Labels are read from the existing `booking.cities` namespace. */
const CITY_KEYS = [
  'cairo', 'alexandria', 'giza', 'nasr_city',
  'new_cairo', 'maadi', 'zamalek', 'october',
] as const;

type Mode = 'signin' | 'register' | 'forgot';

export function LoginFlow() {
  const t = useTranslations('login');
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CinematicStage />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-6 py-28 lg:flex-row lg:justify-between lg:gap-16 lg:px-12 lg:py-24">
        <Editorial t={t} isAr={isAr} />
        <Suspense fallback={null}>
          <Console t={t} />
        </Suspense>
      </div>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Cinematic stage — full-bleed car, graded + animated                   */
/* ════════════════════════════════════════════════════════════════════ */
function CinematicStage() {
  const particles = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      id: i, left: (i * 53) % 100, top: ((i * 37) % 82) + 8,
      delay: (i % 7) * 0.5, duration: 6 + (i % 5),
    })),
    [],
  );

  return (
    <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
      {/* Ken-Burns drift */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1.16 }}
        transition={{ duration: 26, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <Image
          src={PORTAL_IMAGE} alt="" fill priority sizes="100vw"
          className="object-cover"
          style={{ filter: 'grayscale(1) brightness(0.46) contrast(1.06)' }}
        />
      </motion.div>

      {/* platinum grade + vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-transparent to-transparent" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />
      <div className="glow-orb h-[40rem] w-[40rem] -left-52 top-1/4 bg-platinum/[0.06]" />

      {/* slow light sweep */}
      <span className="login-sweep pointer-events-none absolute inset-0" />

      {/* drifting particles */}
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p) => (
          <motion.span
            key={p.id} className="absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.8, 0], y: [12, -54, -108] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: 'easeOut', delay: p.delay }}
          />
        ))}
      </div>

      <style>{`
        .login-sweep{
          background:linear-gradient(115deg,transparent 42%,rgba(203,205,205,0.07) 50%,transparent 58%);
          background-size:280% 100%;
          animation:loginSweep 9s ease-in-out infinite;
        }
        @keyframes loginSweep{0%{background-position:140% 0}100%{background-position:-140% 0}}
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Editorial column (open side of the frame, lg+)                        */
/* ════════════════════════════════════════════════════════════════════ */
function Editorial({
  t, isAr,
}: { t: ReturnType<typeof useTranslations>; isAr: boolean }) {
  const perks = [t('perk1'), t('perk2'), t('perk3')];
  return (
    <div className="hidden max-w-md flex-1 lg:block">
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="flex items-center gap-4"
      >
        <span className="relative grid h-12 w-12 place-items-center rounded-full border border-white/12 bg-obsidian/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <motion.span aria-hidden
            animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full opacity-50"
            style={{ background: 'conic-gradient(from 0deg, transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(3px)' }} />
          <span className="font-display text-lg uppercase text-platinum">A</span>
        </span>
        <span className="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.4em] text-platinum/70">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('asideEyebrow')}
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: EASE }}
        className="mt-10 font-editorial text-[clamp(2.2rem,3vw,3.4rem)] font-light italic leading-[1.12] text-ivory"
      >
        {t('asideQuote')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-6 flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.28em] text-steel"
      >
        <span className="h-px w-10 bg-platinum/40" />
        {t('asideAttribution')}
      </motion.div>

      <motion.ul
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.55 } } }}
        className="mt-12 space-y-3.5"
      >
        {perks.map((perk) => (
          <motion.li
            key={perk}
            variants={{ hidden: { opacity: 0, x: isAr ? 14 : -14 }, show: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex items-center gap-3 text-sm text-platinum/75"
          >
            <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-platinum/25 bg-platinum/[0.06]">
              <Check className="h-3 w-3 text-platinum" strokeWidth={2.4} />
            </span>
            {perk}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Floating console                                                      */
/* ════════════════════════════════════════════════════════════════════ */
function Console({ t }: { t: ReturnType<typeof useTranslations> }) {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') || '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [welcome, setWelcome] = useState<{ name: string } | null>(null);

  const onSuccess = useCallback((name: string) => {
    setWelcome({ name });
    setTimeout(() => router.push(redirect), 1500);
  }, [redirect, router]);

  return (
    <div className="w-full max-w-[460px]">
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="glass-strong spotlight relative overflow-hidden rounded-[30px] border border-white/[0.1] p-7 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.85)] md:p-10"
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/40 to-transparent" />

        <AnimatePresence mode="wait">
          {welcome ? (
            <WelcomeSeal key="welcome" t={t} name={welcome.name} />
          ) : mode === 'forgot' ? (
            <motion.div key="forgot"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <ForgotForm t={t} onBack={() => setMode('signin')} />
            </motion.div>
          ) : (
            <motion.div key="auth"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <ModeTabs t={t} mode={mode} setMode={setMode} />

              <AnimatePresence mode="wait">
                {mode === 'signin' ? (
                  <motion.div key="signin"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <SignInForm t={t} onSuccess={onSuccess} onForgot={() => setMode('forgot')} />
                  </motion.div>
                ) : (
                  <motion.div key="register"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <RegisterForm t={t} onSuccess={onSuccess} />
                  </motion.div>
                )}
              </AnimatePresence>

              <SwitchLine t={t} mode={mode} setMode={setMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p className="mt-6 text-center text-[0.62rem] leading-relaxed tracking-wide text-steel">
        {t('legal')}
      </p>
    </div>
  );
}

/* ── mode tabs ── */
function ModeTabs({
  t, mode, setMode,
}: { t: ReturnType<typeof useTranslations>; mode: Mode; setMode: (m: Mode) => void }) {
  const tabs: { id: Mode; label: string }[] = [
    { id: 'signin', label: t('signInTab') },
    { id: 'register', label: t('registerTab') },
  ];
  return (
    <div className="relative mb-8 grid grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
      {tabs.map((tab) => {
        const on = mode === tab.id;
        return (
          <button
            key={tab.id} data-cursor="hover" onClick={() => setMode(tab.id)}
            className="relative z-10 rounded-full py-2.5 text-[0.62rem] uppercase tracking-[0.18em] transition-colors duration-300"
          >
            {on && (
              <motion.span
                layoutId="tab-pill" aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-white to-platinum shadow-[0_10px_30px_-12px_rgba(203,205,205,0.6)]"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className={on ? 'text-obsidian' : 'text-platinum/70'}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── sign-in ── */
function SignInForm({
  t, onSuccess, onForgot,
}: {
  t: ReturnType<typeof useTranslations>;
  onSuccess: (name: string) => void; onForgot: () => void;
}) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const errors = {
    email: !email.trim() ? t('validation.emailRequired')
      : EMAIL_RE.test(email) ? null : t('validation.emailInvalid'),
    password: password ? null : t('validation.passwordRequired'),
  };
  const valid = !errors.email && !errors.password;

  const submit = async () => {
    setAuthError(null);
    if (!valid) { setTouched(true); return; }
    setBusy(true);
    try {
      const m = await signIn(email, password);
      onSuccess(m.name);
    } catch {
      setAuthError(t('invalidCredentials'));
      setBusy(false);
    }
  };

  return (
    <div>
      <Header t={t} title={t('signInTitle')} sub={t('signInSubtitle')} />

      <div className="mt-8 space-y-5">
        <Field label={t('email')}>
          <TextInput icon={Mail} value={email} onChange={setEmail} dir="ltr"
            placeholder={t('emailPlaceholder')} error={touched ? errors.email : null} onEnter={submit} />
        </Field>

        <Field label={t('password')}>
          <PasswordInput t={t} value={password} onChange={setPassword}
            placeholder={t('passwordPlaceholder')} error={touched ? errors.password : null} onEnter={submit} />
        </Field>

        <div className="flex items-center justify-between pt-0.5">
          <Toggle on={remember} onToggle={() => setRemember((r) => !r)} label={t('remember')} />
          <button type="button" data-cursor="hover" onClick={onForgot}
            className="text-[0.7rem] tracking-wide text-platinum/70 transition-colors hover:text-ivory">
            {t('forgot')}
          </button>
        </div>

        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 rounded-2xl border border-[#7c1a1a]/50 bg-[#2a1414]/40 px-4 py-3 text-[0.74rem] text-[#e7b4b4]"
            >
              <span className="grid h-4 w-4 flex-none place-items-center rounded-full border border-[#c98a8a]/50 text-[0.6rem]">!</span>
              {authError}
            </motion.div>
          )}
        </AnimatePresence>

        <GoldButton onClick={submit} busy={busy} label={busy ? t('signingIn') : t('submit')} />
      </div>
    </div>
  );
}

/* ── create account ── */
function RegisterForm({
  t, onSuccess,
}: { t: ReturnType<typeof useTranslations>; onSuccess: (name: string) => void }) {
  const { register } = useAuth();
  const [v, setV] = useState({ name: '', email: '', phone: '', city: '', password: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof v>) => setV((s) => ({ ...s, ...patch }));

  const errors = {
    name: v.name.trim() ? null : t('validation.nameRequired'),
    email: !v.email.trim() ? t('validation.emailRequired')
      : EMAIL_RE.test(v.email) ? null : t('validation.emailInvalid'),
    phone: v.phone.trim() ? null : t('validation.phoneRequired'),
    city: v.city ? null : t('validation.cityRequired'),
    password: !v.password ? t('validation.passwordRequired')
      : v.password.length >= 8 ? null : t('validation.passwordShort'),
  };
  const valid = Object.values(errors).every((e) => e === null);

  const submit = async () => {
    if (!valid) { setTouched(true); return; }
    setBusy(true);
    const m = await register(v);
    onSuccess(m.name);
  };

  return (
    <div>
      <Header t={t} title={t('registerTitle')} sub={t('registerSubtitle')} />

      <div className="mt-8 space-y-5">
        <Field label={t('fullName')}>
          <TextInput icon={User} value={v.name} onChange={(x) => set({ name: x })}
            placeholder={t('fullNamePlaceholder')} error={touched ? errors.name : null} />
        </Field>

        <Field label={t('email')}>
          <TextInput icon={Mail} value={v.email} onChange={(x) => set({ email: x })} dir="ltr"
            placeholder={t('emailPlaceholder')} error={touched ? errors.email : null} />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t('phone')}>
            <TextInput icon={Phone} value={v.phone} onChange={(x) => set({ phone: x })} dir="ltr"
              placeholder={t('phonePlaceholder')} error={touched ? errors.phone : null} />
          </Field>
          <Field label={t('city')}>
            <CitySelect t={t} value={v.city} onChange={(x) => set({ city: x })} />
            {touched && errors.city && <Err>{errors.city}</Err>}
          </Field>
        </div>

        <Field label={t('password')}>
          <PasswordInput t={t} value={v.password} onChange={(x) => set({ password: x })}
            placeholder={t('createPasswordPlaceholder')} error={touched ? errors.password : null} onEnter={submit} />
        </Field>

        <GoldButton onClick={submit} busy={busy} label={busy ? t('creating') : t('createAccount')} />
      </div>
    </div>
  );
}

/* ── forgot password ── */
function ForgotForm({
  t, onBack,
}: { t: ReturnType<typeof useTranslations>; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const error = !email.trim() ? t('validation.emailRequired')
    : EMAIL_RE.test(email) ? null : t('validation.emailInvalid');

  const submit = async () => {
    if (error) { setTouched(true); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900)); // simulate — wire to your API
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="py-4 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-platinum/30 bg-platinum/[0.06]"
        >
          <MailCheck className="h-7 w-7 text-platinum" strokeWidth={1.5} />
        </motion.div>
        <h2 className="font-display text-2xl font-light uppercase tracking-tight text-ivory">{t('forgotSuccessTitle')}</h2>
        <p className="mx-auto mt-3 max-w-[34ch] text-sm leading-relaxed text-platinum/65">
          {t('forgotSuccessCopy', { email })}
        </p>
        <button type="button" data-cursor="hover" onClick={onBack}
          className="mt-8 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-platinum/75 transition-colors hover:text-ivory">
          <ArrowLeft className="reversible-icon h-3.5 w-3.5" strokeWidth={1.8} />
          {t('backToSignIn')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <Header t={t} title={t('forgotTitle')} sub={t('forgotSubtitle')} />
      <div className="mt-8 space-y-5">
        <Field label={t('email')}>
          <TextInput icon={Mail} value={email} onChange={setEmail} dir="ltr"
            placeholder={t('emailPlaceholder')} error={touched ? error : null} onEnter={submit} />
        </Field>
        <GoldButton onClick={submit} busy={busy} label={busy ? t('forgotSending') : t('forgotSubmit')} />
        <button type="button" data-cursor="hover" onClick={onBack}
          className="mx-auto flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-platinum/70 transition-colors hover:text-ivory">
          <ArrowLeft className="reversible-icon h-3.5 w-3.5" strokeWidth={1.8} />
          {t('backToSignIn')}
        </button>
      </div>
    </div>
  );
}

/* ── switch line ── */
function SwitchLine({
  t, mode, setMode,
}: { t: ReturnType<typeof useTranslations>; mode: Mode; setMode: (m: Mode) => void }) {
  const toReg = mode === 'signin';
  return (
    <p className="mt-7 text-center text-[0.78rem] text-platinum/60">
      {toReg ? t('noAccount') : t('haveAccount')}{' '}
      <button
        data-cursor="hover"
        onClick={() => setMode(toReg ? 'register' : 'signin')}
        className="link-magnetic !text-[0.78rem] font-medium text-ivory"
      >
        {toReg ? t('createLink') : t('signInLink')}
      </button>
    </p>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Welcome seal                                                          */
/* ════════════════════════════════════════════════════════════════════ */
function WelcomeSeal({
  t, name,
}: { t: ReturnType<typeof useTranslations>; name: string }) {
  const first = name.trim().split(' ')[0] || name;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative py-10 text-center">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.08] blur-[110px]" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: EASE }} className="relative mx-auto mb-8 h-24 w-24"
      >
        <motion.span aria-hidden animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full opacity-70"
          style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.6), transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(6px)' }} />
        <span aria-hidden className="absolute inset-2 rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70" />
        <span className="absolute inset-[8px] grid place-items-center rounded-full bg-gradient-to-br from-obsidian via-obsidian to-[#0b0c0d]">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 14 }}>
            <ShieldCheck className="h-8 w-8 text-ivory" strokeWidth={1.5} />
          </motion.span>
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
        className="font-display text-3xl font-light uppercase tracking-tight text-ivory"
      >
        {t('welcome')}, <span className="text-platinum">{first}</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-3 text-sm text-platinum/65">
        {t('entering')}
      </motion.p>

      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 1, ease: EASE }}
        className="mx-auto mt-8 h-px w-40 origin-center bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Primitives                                                            */
/* ════════════════════════════════════════════════════════════════════ */
function Header({
  t, title, sub,
}: { t: ReturnType<typeof useTranslations>; title: string; sub: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-platinum/40" />
        <span className="text-[0.55rem] uppercase tracking-[0.3em] text-steel">{t('eyebrow')}</span>
      </div>
      <h1 className="font-display text-3xl font-light uppercase leading-tight tracking-tight text-ivory md:text-4xl">{title}</h1>
      <p className="pretty mt-3 max-w-[40ch] text-sm leading-relaxed text-platinum/60">{sub}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2.5 block text-[0.62rem] uppercase tracking-[0.26em] text-platinum/80">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  icon: Icon, value, onChange, placeholder, dir, error, onEnter,
}: {
  icon: React.ElementType; value: string; onChange: (v: string) => void;
  placeholder: string; dir?: 'ltr' | 'rtl'; error?: string | null; onEnter?: () => void;
}) {
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input
          value={value} dir={dir} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
          className={[
            'w-full rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-all duration-300',
            error
              ? 'border-[#7c1a1a]/70 focus:border-[#7c1a1a]'
              : 'border-white/12 focus:border-platinum/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(203,205,205,0.07)]',
          ].join(' ')}
        />
      </div>
      {error && <Err>{error}</Err>}
    </div>
  );
}

function PasswordInput({
  t, value, onChange, placeholder, error, onEnter,
}: {
  t: ReturnType<typeof useTranslations>; value: string; onChange: (v: string) => void;
  placeholder: string; error?: string | null; onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input
          type={show ? 'text' : 'password'} value={value} dir="ltr" placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
          className={[
            'w-full rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 pe-12 text-sm text-ivory placeholder:text-steel/60 outline-none transition-all duration-300',
            error
              ? 'border-[#7c1a1a]/70 focus:border-[#7c1a1a]'
              : 'border-white/12 focus:border-platinum/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(203,205,205,0.07)]',
          ].join(' ')}
        />
        <button
          type="button" data-cursor="hover" onClick={() => setShow((s) => !s)}
          aria-label={show ? t('hide') : t('show')}
          className="absolute end-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-platinum/55 transition-colors hover:text-ivory"
        >
          {show ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
        </button>
      </div>
      {error && <Err>{error}</Err>}
    </div>
  );
}

function CitySelect({
  t, value, onChange,
}: { t: ReturnType<typeof useTranslations>; value: string; onChange: (v: string) => void }) {
  const tc = useTranslations('booking.cities');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" data-cursor="hover" onClick={() => setOpen((o) => !o)}
        className={[
          'relative flex w-full items-center justify-between rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 text-start text-sm transition-colors duration-300',
          open ? 'border-platinum/50 bg-white/[0.05]' : 'border-white/12 hover:border-white/25',
        ].join(' ')}
      >
        <MapPin className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <span className={value ? 'text-ivory' : 'text-steel/70'}>{value ? tc(value) : t('cityPlaceholder')}</span>
        <ChevronDown className={`h-4 w-4 flex-none text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[#0c0d0e]/96 p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {CITY_KEYS.map((c) => {
              const on = c === value;
              return (
                <button
                  key={c} type="button" data-cursor="hover"
                  onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
                  className={[
                    'flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-start text-sm transition-colors duration-200',
                    on ? 'bg-white/[0.08] text-ivory' : 'text-platinum/80 hover:bg-white/[0.05] hover:text-ivory',
                  ].join(' ')}
                >
                  {tc(c)}
                  {on && <Check className="h-3.5 w-3.5 text-platinum" strokeWidth={2.4} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" data-cursor="hover" onClick={onToggle} className="flex items-center gap-2.5">
      <span className={`relative h-5 w-9 flex-none rounded-full transition-colors duration-300 ${on ? 'bg-gradient-to-r from-platinum to-ivory' : 'bg-white/10'}`}>
        <motion.span className="absolute top-0.5 h-4 w-4 rounded-full bg-obsidian"
          animate={{ insetInlineStart: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
      </span>
      <span className="text-[0.7rem] tracking-wide text-platinum/70">{label}</span>
    </button>
  );
}

function GoldButton({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={busy} data-cursor="hover"
      className={`group/btn relative block w-full ${busy ? 'pointer-events-none opacity-70' : ''}`}>
      <span aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-r from-platinum/50 via-ivory/40 to-platinum/50 opacity-0 blur-2xl transition-opacity duration-700 group-hover/btn:opacity-100" />
      <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/80 via-platinum/40 to-ivory/55" />
      <span className="relative inline-flex w-full items-center justify-center gap-2.5 rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 group-hover/btn:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9),0 18px 60px -15px rgba(203,205,205,0.6)' }}>
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-obsidian/30 border-t-obsidian" />
        ) : (
          <>
            {label}
            <ArrowUpRight className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={2.2} />
          </>
        )}
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
      </span>
    </button>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <span className="mt-2 block text-[0.6rem] tracking-wide text-[#c98a8a]">{children}</span>;
}