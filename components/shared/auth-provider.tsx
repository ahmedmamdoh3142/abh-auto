'use client';

/**
 * AuthProvider — client-side membership state for ABH Auto.
 * Path: components/shared/auth-provider.tsx  (exports `AuthProvider`, `useAuth`)
 *
 * Holds the signed-in member (name / email / phone / city) and exposes
 * sign-in, register, sign-out and profile-update actions. The profile is
 * exactly what the booking flow reads to pre-fill act 03 (Your Details), so a
 * member never re-types what we already know.
 *
 * NOTE — this is a front-end-only reference implementation backed by
 * localStorage so the experience works end-to-end without a server. When the
 * backend is ready, replace the bodies of `signIn` / `register` (and the
 * read/write helpers) with calls to your real auth API — NextAuth, a custom
 * /api/auth route, etc. The public surface (`useAuth`) stays identical, so no
 * consumer (navbar, booking, login) needs to change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  /** ISO timestamp the membership was created — powers "Member since". */
  since: string;
}

interface AuthContextValue {
  member: Member | null;
  /** False until the persisted session has been read on the client. */
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<Member>;
  register: (
    input: Omit<Member, 'id' | 'since'> & { password: string },
  ) => Promise<Member>;
  signOut: () => void;
  updateProfile: (patch: Partial<Member>) => void;
}

const SESSION_KEY = 'abh.member';
const ACCOUNTS_KEY = 'abh.accounts';

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── local-storage helpers (no-op on the server) ── */
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}`;

/** A stored account also keeps a password — local demo only. */
interface StoredAccount extends Member {
  password: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read any persisted session once, on the client, after mount — this keeps
  // SSR markup and first client render identical (no hydration mismatch).
  useEffect(() => {
    setMember(readJSON<Member | null>(SESSION_KEY, null));
    setHydrated(true);
  }, []);

  const persist = useCallback((m: Member | null) => {
    setMember(m);
    if (m) writeJSON(SESSION_KEY, m);
    else if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const register = useCallback<AuthContextValue['register']>(
    async (input) => {
      await wait(900); // simulate the network — replace with your API call
      const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
      const m: Member = {
        id: newId(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        city: input.city,
        since: new Date().toISOString(),
      };
      writeJSON(ACCOUNTS_KEY, [
        ...accounts.filter((a) => a.email !== m.email),
        { ...m, password: input.password },
      ]);
      persist(m);
      return m;
    },
    [persist],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      await wait(900); // simulate the network — replace with your API call
      const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
      const found = accounts.find(
        (a) => a.email === email.trim().toLowerCase(),
      );

      // Demo behaviour: if the account exists, validate the password.
      // Otherwise accept the sign-in and synthesise a tidy display name from
      // the email, so a first-time visitor is never met with a dead end.
      if (found) {
        if (found.password && found.password !== password) {
          throw new Error('invalid-credentials');
        }
        const { password: _pw, ...m } = found;
        persist(m);
        return m;
      }

      const local = (email.trim().split('@')[0] || 'Member')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      const m: Member = {
        id: newId(),
        name: local || 'Member',
        email: email.trim().toLowerCase(),
        phone: '',
        city: '',
        since: new Date().toISOString(),
      };
      persist(m);
      return m;
    },
    [persist],
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback((patch: Partial<Member>) => {
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeJSON(SESSION_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ member, hydrated, signIn, register, signOut, updateProfile }),
    [member, hydrated, signIn, register, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}