'use client';

/**
 * Navbar — ABH Auto.
 *
 * Membership-aware: signed out shows the Login link + CTA; once a member signs
 * in, "Login" becomes a refined account chip (monogram + first name) opening a
 * dropdown (profile, bookings, member-since, sign-out). Mobile drawer mirrors
 * it. Account-menu copy reads from the `login.account` i18n block, so it lives
 * in the same block you paste wholesale — no separate `nav` edits required.
 *
 * Path: components/layout/navbar.tsx
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Menu, X, User, logo2ut, ChevronDown } from 'lucide-react';
import { logo2 } from '@/components/shared/logo2';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { useAuth, type Member } from '@/components/shared/auth-provider';
import { navLinks } from '@/lib/site-config';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'A';
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function Navbar() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { member, hydrated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Until the persisted session is read on the client we render the signed-out
  // markup (matches SSR) to avoid a hydration mismatch.
  const showMember = hydrated && member;

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 1.8, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-50 px-3 md:px-6 pt-3 md:pt-5"
      >
        <div
          className={cn(
            'mx-auto flex items-center justify-between transition-all duration-700',
            'rounded-full px-5 md:px-7 py-3',
            scrolled
              ? 'max-w-6xl glass-strong shadow-glow-platinum'
              : 'max-w-7xl bg-transparent border border-transparent',
          )}
        >
          {/* logo2 */}
          <Link href="/" data-cursor="hover" className="flex-shrink-0">
            <logo2 size={80} />
          </Link>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  data-cursor="hover"
                  className="relative px-4 py-2 group"
                >
                  <span
                    className={cn(
                      'text-[0.8rem] uppercase tracking-[0.22em] transition-colors duration-300',
                      active ? 'text-ivory' : 'text-platinum/70 group-hover:text-ivory',
                    )}
                  >
                    {t(link.key)}
                  </span>
                  <span
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 bottom-1 h-px w-1 rounded-full bg-platinum transition-all duration-500',
                      active ? 'w-6 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:w-6',
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">
            <LocaleSwitcher />

            {showMember ? (
              <AccountMenu member={member!} />
            ) : (
              <Link href="/login" data-cursor="hover" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
            )}

            <Link href="/booking" data-cursor="hover" className="hidden md:block">
              <Button variant="primary" size="sm" arrow>
                {t('cta')}
              </Button>
            </Link>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden h-10 w-10 rounded-full glass flex items-center justify-center"
              aria-label="Open menu"
              data-cursor="hover"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] bg-obsidian/95 backdrop-blur-2xl"
          >
            <div className="absolute inset-0 noise pointer-events-none opacity-50" />

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="absolute top-5 left-0 right-0 z-10 flex items-center justify-between px-6"
            >
              <logo2 size={28} />
              <button
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-full glass flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>

            <div className="relative h-full flex flex-col items-center justify-center gap-8 px-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.key}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: EASE }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-3xl tracking-tight text-ivory hover:text-platinum transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center gap-4 mt-8 w-full max-w-sm"
              >
                {showMember ? (
                  <MobileMemberCard member={member!} onClose={() => setOpen(false)} />
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)} className="w-full">
                    <Button variant="ghost" size="md" className="w-full">{t('login')}</Button>
                  </Link>
                )}
                <Link href="/booking" onClick={() => setOpen(false)} className="w-full">
                  <Button variant="primary" size="md" arrow className="w-full">{t('cta')}</Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Monogram ── */
function Monogram({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="relative grid flex-none place-items-center rounded-full border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.01]"
      style={{ height: size, width: size }}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-full border border-white/[0.06]" />
      <span className="font-display text-[0.7rem] uppercase tracking-wide text-platinum">{initials(name)}</span>
    </span>
  );
}

/* ── Desktop account chip + dropdown ── */
function AccountMenu({ member }: { member: Member }) {
  const ta = useTranslations('login.account');
  const router = useRouter();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const since = new Date(member.since).getFullYear();

  const items = [
    { key: 'myProfile', href: '/account', icon: User },
  ] as const;

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        data-cursor="hover"
        onClick={() => setOpen((o) => !o)}
        // اسم وحالة للزر: بدونها يقرأه الـscreen reader "button" فقط (فشل a11y)
        aria-label={`Account menu — ${firstName(member.name)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 rounded-full border py-1.5 pe-3 ps-1.5 transition-all duration-300',
          open ? 'border-white/25 bg-white/[0.06]' : 'border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]',
        )}
      >
        <Monogram name={member.name} size={30} />
        <span className="max-w-[10ch] truncate text-[0.72rem] font-medium tracking-wide text-ivory">{firstName(member.name)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-platinum transition-transform duration-300', open && 'rotate-180')} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="absolute end-0 mt-3 w-72 overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-platinum/30 to-transparent" />

            {/* header */}
            <div className="flex items-center gap-3.5 p-5">
              <Monogram name={member.name} size={44} />
              <div className="min-w-0">
                <div className="truncate font-display text-base uppercase tracking-wide text-ivory">{member.name}</div>
                <div dir="ltr" className="mt-0.5 truncate text-[0.7rem] text-platinum/60">{member.email}</div>
              </div>
            </div>

            <div className="mx-5 flex items-center gap-2 rounded-full border border-platinum/20 bg-platinum/[0.05] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.16em] text-platinum/80">
              <span className="h-1.5 w-1.5 rounded-full bg-platinum" />
              {ta('memberSince', { year: since })}
            </div>

            <div className="my-3.5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="px-2 pb-2">
              {items.map(({ key, href, icon: Icon }) => (
                <Link
                  key={key} href={href} data-cursor="hover" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-platinum/80 transition-colors duration-200 hover:bg-white/[0.05] hover:text-ivory"
                >
                  <Icon className="reversible-icon h-4 w-4 text-platinum/60" strokeWidth={1.7} />
                  {ta(key)}
                </Link>
              ))}
              <button
                data-cursor="hover"
                onClick={() => { signOut(); setOpen(false); router.push('/'); }}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-platinum/70 transition-colors duration-200 hover:bg-[#2a1414]/40 hover:text-[#e7b4b4]"
              >
                <logo2ut className="reversible-icon h-4 w-4" strokeWidth={1.7} />
                {ta('signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mobile member card ── */
function MobileMemberCard({ member, onClose }: { member: Member; onClose: () => void }) {
  const ta = useTranslations('login.account');
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <div className="w-full rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-center gap-3.5">
        <Monogram name={member.name} size={48} />
        <div className="min-w-0">
          <div className="truncate font-display text-lg uppercase tracking-wide text-ivory">{member.name}</div>
          <div dir="ltr" className="truncate text-[0.72rem] text-platinum/60">{member.email}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/account" onClick={onClose}
          className="rounded-2xl border border-white/12 bg-white/[0.02] py-3 text-center text-[0.66rem] uppercase tracking-[0.14em] text-platinum/80">
          {ta('myProfile')}
        </Link>
        <button
          onClick={() => { signOut(); onClose(); router.push('/'); }}
          className="rounded-2xl border border-white/12 bg-white/[0.02] py-3 text-center text-[0.66rem] uppercase tracking-[0.14em] text-platinum/80"
        >
          {ta('signOut')}
        </button>
      </div>
    </div>
  );
}