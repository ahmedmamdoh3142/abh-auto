'use client';

/**
 * Section 02 — Compose (The Letter)
 *
 * The signature creative move of this page: instead of a stacked form
 * with labels, the visitor *writes a letter*. The form is rendered as
 * a single flowing passage where inputs are inline with prose:
 *
 *   "My name is [_____], and I would like to [_____] regarding my [_____].
 *    You can reach me at [_____] or on [_____]."
 *
 * Each input is an underlined word that ghosts a hint when empty and
 * promotes to ivory when filled. The composition reads like an actual
 * letter on paper — and converts measurably better (Mad Libs forms
 * raise completion rates 25–40% per Wroblewski/Vast.com testing).
 *
 * Visual treatment:
 *   - A vellum-style paper card with deckle-edge corner ornaments
 *   - A "From / Date" header line at the top
 *   - The letter body in editorial italic at large size
 *   - The "Sincerely," sign-off above the seal & send button
 *   - On submit, the entire card folds up into an envelope (CSS rotate)
 *     and a wax-seal stamp appears
 *
 * Inputs auto-resize as you type. The intent field is a custom
 * dropdown styled to look like part of the sentence (not a select).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2 } from 'lucide-react';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';

interface FormState {
  name: string;
  intent: string; // index 0..3 stored as string (or '' for empty)
  vehicle: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

const INITIAL: FormState = {
  name: '',
  intent: '',
  vehicle: '',
  email: '',
  phone: '',
  message: '',
  consent: false,
};

export function Compose() {
  const t = useTranslations('contact.compose');
  const ref = useRef<HTMLElement>(null);
  const [data, setData] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const intentOptions = t.raw('intentOptions') as string[];

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!data.name.trim()) e.name = t('errors.nameRequired');
    if (!data.intent) e.intent = t('errors.intentRequired');
    if (!data.email.trim()) e.email = t('errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      e.email = t('errors.emailInvalid');
    if (!data.message.trim()) e.message = t('errors.messageRequired');
    if (!data.consent) e.consent = t('errors.consentRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // TODO: replace with your real submission endpoint.
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitting(false);
    setSubmitted(true);
  };

  const reset = () => {
    setData(INITIAL);
    setErrors({});
    setSubmitted(false);
  };

  return (
    <section
      ref={ref}
      id="form"
      className="relative w-full overflow-hidden bg-obsidian py-28 md:py-40"
      data-section="compose"
    >
      <ChapterSlate
        number={t('chapter')}
        label={t('label')}
        variant="dark"
      />
      <AtelierMark variant="dark" />

      {/* Ambient platinum bloom */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[55rem] w-[55rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.04] blur-[200px]"
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-5"
          >
            <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum/40 to-platinum/60" />
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.55em] text-platinum/85">
              {t('label')}
            </span>
            <span className="block h-px w-12 bg-gradient-to-l from-transparent via-platinum/40 to-platinum/60" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] tracking-tight balance"
          >
            <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
              {t('title')}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-6 font-editorial text-base italic text-platinum/70"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* The Letter card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-4xl"
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <SealedSuccess key="success" t={t} reset={reset} />
            ) : (
              <motion.form
                key="letter"
                initial={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.85,
                  rotateX: -45,
                  y: -80,
                  filter: 'blur(8px)',
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleSubmit}
                className="relative"
                style={{ transformPerspective: 1000 }}
              >
                <LetterCard
                  data={data}
                  setData={setData}
                  errors={errors}
                  intentOptions={intentOptions}
                  submitting={submitting}
                  t={t}
                />
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   LetterCard — vellum-style card holding the form-as-letter
   ═══════════════════════════════════════════════════════════ */
function LetterCard({
  data,
  setData,
  errors,
  intentOptions,
  submitting,
  t,
}: {
  data: FormState;
  setData: (d: FormState) => void;
  errors: Partial<Record<keyof FormState, string>>;
  intentOptions: string[];
  submitting: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const placeholders = {
    name: t('placeholders.name'),
    intent: t('placeholders.intent'),
    vehicle: t('placeholders.vehicle'),
    email: t('placeholders.email'),
    phone: t('placeholders.phone'),
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.045] via-white/[0.02] to-white/[0.005] p-8 backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-14">
      {/* Paper noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Decorative corner ornaments */}
      <CornerOrnaments />

      {/* Letter header — "From / Date" */}
      <div className="relative mb-12 flex items-center justify-between gap-4 border-b border-white/[0.06] pb-6" dir="ltr">
        <div className="flex items-center gap-3">
          <span className="block h-px w-8 bg-platinum/50" />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/65">
            {t('letterTitle')}
          </span>
          <span className="font-editorial text-sm italic text-ivory">
            {data.name || '—'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/65">
            {t('letterDate')}
          </span>
          <span className="font-mono text-xs tracking-[0.15em] text-platinum/85 tabular-nums" suppressHydrationWarning>
            <TodayDate />
          </span>
        </div>
      </div>

      {/* THE SENTENCE — the magic happens here */}
      <div className="relative font-editorial text-[clamp(1.1rem,2vw,1.6rem)] leading-[1.85] text-platinum/80">
        {/* Line 1: My name is [name], and I would like to [intent] regarding my [vehicle]. */}
        <p className="md:text-balance">
          <span className="italic">{t('sentence1_a')}</span>{' '}
          <InlineInput
            value={data.name}
            onChange={(v) => setData({ ...data, name: v })}
            placeholder={placeholders.name}
            error={!!errors.name}
            width="ch-12"
          />
          <span className="italic">{', '}{t('sentence1_b')}</span>{' '}
          <InlineSelect
            value={data.intent}
            onChange={(v) => setData({ ...data, intent: v })}
            placeholder={placeholders.intent}
            options={intentOptions}
            error={!!errors.intent}
          />{' '}
          <span className="italic">{t('sentence1_c')}</span>{' '}
          <InlineInput
            value={data.vehicle}
            onChange={(v) => setData({ ...data, vehicle: v })}
            placeholder={placeholders.vehicle}
            width="ch-14"
          />
          <span className="italic">{t('sentence1_d')}</span>
        </p>

        {/* Line 2 */}
        <p className="mt-6 md:text-balance">
          <span className="italic">{t('sentence2_a')}</span>{' '}
          <InlineInput
            value={data.email}
            onChange={(v) => setData({ ...data, email: v })}
            placeholder={placeholders.email}
            error={!!errors.email}
            width="ch-18"
            type="email"
            dir="ltr"
          />{' '}
          <span className="italic">{t('sentence2_b')}</span>{' '}
          <InlineInput
            value={data.phone}
            onChange={(v) => setData({ ...data, phone: v })}
            placeholder={placeholders.phone}
            width="ch-14"
            type="tel"
            dir="ltr"
          />
          <span className="italic">{t('sentence2_c')}</span>
        </p>
      </div>

      {/* Field-level error summary — only first error */}
      <ErrorBanner errors={errors} order={['name', 'intent', 'email']} />

      {/* Message section */}
      <div className="mt-12 border-t border-white/[0.06] pt-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="block h-px w-8 bg-platinum/50" />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/65">
            {t('messageLabel')}
          </span>
        </div>
        <textarea
          value={data.message}
          onChange={(e) => setData({ ...data, message: e.target.value })}
          placeholder={t('messagePlaceholder')}
          rows={5}
          className={`w-full resize-none bg-transparent font-editorial text-[clamp(1rem,1.6vw,1.2rem)] italic leading-[1.7] text-ivory placeholder:text-platinum/30 focus:outline-none`}
        />
        {errors.message && (
          <p className="mt-1 text-[0.65rem] uppercase tracking-[0.22em] text-rose-300/80">
            {errors.message}
          </p>
        )}
      </div>

      {/* Footer — Sincerely, name */}
      <div className="mt-12 flex items-end justify-between gap-6 border-t border-white/[0.06] pt-10">
        <div className="flex flex-col gap-2">
          <span className="font-editorial text-base italic text-platinum/70">
            {t('footer')}
          </span>
          <span className="font-editorial text-2xl italic text-ivory min-h-[1.5em]">
            {data.name || ' '}
          </span>
        </div>

        {/* Consent + Send */}
        <div className="flex flex-col items-end gap-5">
          <ConsentCheckbox
            checked={data.consent}
            onChange={(v) => setData({ ...data, consent: v })}
            error={!!errors.consent}
            label={t('consent')}
          />

          <SealSendButton
            submitting={submitting}
            label={t('send')}
            sendingLabel={t('sending')}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   InlineInput — auto-resizing underline input that lives
   inside a sentence
   ═══════════════════════════════════════════════════════════ */
function InlineInput({
  value,
  onChange,
  placeholder,
  error,
  width = 'ch-12',
  type = 'text',
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: boolean;
  width?: string;
  type?: string;
  dir?: 'ltr' | 'rtl';
}) {
  // Auto-size based on current value
  const measureRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    if (measureRef.current) {
      setW(measureRef.current.offsetWidth);
    }
  }, [value, placeholder]);

  const filled = value.length > 0;

  return (
    <span className="relative inline-block align-baseline">
      {/* Hidden span to measure text width */}
      <span
        ref={measureRef}
        className="invisible whitespace-pre px-2 font-editorial text-[clamp(1.1rem,2vw,1.6rem)]"
        aria-hidden
      >
        {value || placeholder}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={w ? { width: w + 8 } : undefined}
        className={`absolute inset-0 inline-block min-w-[5ch] border-b bg-transparent px-2 text-center font-editorial text-[clamp(1.1rem,2vw,1.6rem)] leading-[1.85] focus:outline-none transition-all duration-300 ${
          filled
            ? 'border-platinum/50 text-ivory'
            : 'border-platinum/25 text-ivory placeholder:italic placeholder:text-platinum/40'
        } ${error ? '!border-rose-400/70' : 'focus:border-ivory'}`}
      />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   InlineSelect — sentence-inline custom dropdown
   ═══════════════════════════════════════════════════════════ */
function InlineSelect({
  value,
  onChange,
  placeholder,
  options,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filled = value.length > 0;
  const displayValue = filled ? value : placeholder;

  return (
    <span ref={ref} className="relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-cursor="hover"
        className={`group inline-flex items-baseline gap-1.5 border-b bg-transparent px-2 py-0.5 font-editorial text-[clamp(1.1rem,2vw,1.6rem)] leading-[1.85] focus:outline-none transition-all duration-300 ${
          filled
            ? 'border-platinum/50 text-ivory'
            : 'border-platinum/25 italic text-platinum/40'
        } ${error ? '!border-rose-400/70' : 'hover:border-ivory'}`}
      >
        {displayValue}
        <ChevronDown
          className={`h-4 w-4 self-center text-platinum/60 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute start-0 top-full z-50 mt-3 min-w-[280px] overflow-hidden rounded-2xl border border-white/[0.1] bg-obsidian/95 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-1">
              {options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  data-cursor="hover"
                  className={`group flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-start text-sm leading-snug transition-all duration-300 ${
                    value === opt
                      ? 'bg-white/[0.06] text-ivory'
                      : 'text-platinum/75 hover:bg-white/[0.04] hover:text-ivory'
                  }`}
                >
                  <span className="font-editorial italic">{opt}</span>
                  <span
                    className={`block h-px transition-all duration-300 ${
                      value === opt ? 'w-8 bg-ivory' : 'w-3 bg-platinum/40 group-hover:w-6'
                    }`}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ConsentCheckbox
   ═══════════════════════════════════════════════════════════ */
function ConsentCheckbox({
  checked,
  onChange,
  error,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: boolean;
  label: string;
}) {
  return (
    <label
      className="group flex max-w-xs cursor-pointer items-start gap-3 text-end"
      data-cursor="hover"
    >
      <span
        className={`text-xs leading-relaxed transition-colors ${
          error ? 'text-rose-300/80' : 'text-platinum/60 group-hover:text-platinum/80'
        }`}
      >
        {label}
      </span>
      <span className="relative mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          className={`h-4 w-4 rounded-sm border transition-all duration-300 ${
            checked
              ? 'border-ivory bg-ivory'
              : 'border-platinum/40 bg-transparent group-hover:border-platinum/70'
          } ${error ? 'border-rose-400/60' : ''}`}
        />
        {checked && (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute h-3 w-3 text-obsidian"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.polyline
              points="20 6 9 17 4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </motion.svg>
        )}
      </span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════
   SealSendButton — chrome capsule with wax-seal feel
   ═══════════════════════════════════════════════════════════ */
function SealSendButton({
  submitting,
  label,
  sendingLabel,
}: {
  submitting: boolean;
  label: string;
  sendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      data-cursor="hover"
      className="group relative inline-block disabled:pointer-events-none"
    >
      <span
        aria-hidden
        className="absolute -inset-3 rounded-full bg-platinum/30 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/60"
      />
      <span className="relative inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-9 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_60px_-15px_rgba(203,205,205,0.6)] transition-all duration-500 group-hover:-translate-y-0.5">
        {submitting && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
        )}
        {submitting ? sendingLabel : label}
        {!submitting && <WaxSealIcon />}
      </span>
    </button>
  );
}

/* Tiny diamond used as a "wax seal" mark in the send button */
function WaxSealIcon() {
  return (
    <span className="relative grid h-3 w-3 rotate-45 place-items-center bg-gradient-to-br from-obsidian to-steel">
      <span className="absolute inset-[1.5px] bg-ivory" />
      <span className="relative h-0.5 w-0.5 bg-obsidian" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ErrorBanner — surfaces the first sentence error gently
   ═══════════════════════════════════════════════════════════ */
function ErrorBanner({
  errors,
  order,
}: {
  errors: Partial<Record<keyof FormState, string>>;
  order: Array<keyof FormState>;
}) {
  const firstKey = order.find((k) => errors[k]);
  const message = firstKey ? errors[firstKey] : null;
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-4 flex items-center gap-3"
        >
          <span className="block h-px w-6 bg-rose-300/60" />
          <span className="text-[0.7rem] uppercase tracking-[0.22em] text-rose-300/80">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   CornerOrnaments — paper deckle marks
   ═══════════════════════════════════════════════════════════ */
function CornerOrnaments() {
  return (
    <>
      <span className="pointer-events-none absolute start-6 top-6 h-5 w-5 border-s border-t border-platinum/35" />
      <span className="pointer-events-none absolute end-6 top-6 h-5 w-5 border-e border-t border-platinum/35" />
      <span className="pointer-events-none absolute start-6 bottom-6 h-5 w-5 border-s border-b border-platinum/35" />
      <span className="pointer-events-none absolute end-6 bottom-6 h-5 w-5 border-e border-b border-platinum/35" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TodayDate — formatted date (Jeddah)
   ═══════════════════════════════════════════════════════════ */
function TodayDate() {
  const [d, setD] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Riyadh',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    setD(fmt.format(new Date()).toUpperCase());
  }, []);
  return <>{d || '—'}</>;
}

/* ═══════════════════════════════════════════════════════════
   SealedSuccess — letter folds into envelope + wax seal
   ═══════════════════════════════════════════════════════════ */
function SealedSuccess({
  t,
  reset,
}: {
  t: ReturnType<typeof useTranslations>;
  reset: () => void;
}) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center gap-10 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.045] via-white/[0.02] to-white/[0.005] px-8 py-20 text-center backdrop-blur-2xl md:py-28"
    >
      {/* Wax seal */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <span
          aria-hidden
          className="absolute -inset-6 rounded-full bg-platinum/40 blur-2xl"
        />
        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-platinum via-ivory to-platinum/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_25px_60px_-15px_rgba(203,205,205,0.7)]">
          {/* Inner emboss ring */}
          <span className="absolute inset-2 rounded-full ring-1 ring-obsidian/15" />
          {/* ABH monogram */}
          <span className="relative font-display text-2xl tracking-[0.05em] text-obsidian">
            ABH
          </span>
        </span>
      </motion.div>

      <div className="flex flex-col items-center gap-4">
        <motion.h3
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2rem,5vw,3.5rem)] uppercase leading-tight tracking-tight text-ivory"
        >
          {t('successTitle')}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="max-w-md font-editorial text-base italic leading-relaxed text-platinum/75"
        >
          {t('successCopy')}
        </motion.p>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        type="button"
        onClick={reset}
        data-cursor="hover"
        className="link-magnetic mt-4 text-[0.65rem] font-medium uppercase tracking-[0.32em] text-platinum/85 hover:text-ivory"
      >
        {t('successAction')}
      </motion.button>
    </motion.div>
  );
}