'use client';

/**
 * AuthProvider — client membership state for ABH Auto.
 * Path: components/shared/auth-provider.tsx  (exports `AuthProvider`, `useAuth`)
 *
 * Holds the signed-in member and everything attached to them:
 *   • profile  — name / email / phone / city (booking pre-fills from this)
 *   • garage   — the member's vehicles (booking lets them pick one)
 *   • bookings — reservation history (upcoming / active / completed)
 *
 * Front-end-only reference implementation backed by localStorage so the whole
 * experience works without a server. When the API is ready, swap the bodies of
 * signIn / register (and the vehicle/booking mutators) for real calls — the
 * `useAuth()` surface stays identical, so no consumer changes.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

import { BRANDS } from '@/lib/booking-data';

export interface Vehicle {
  id: string;
  brandId: string;   // matches BRANDS[].id in booking-data
  model: string;
  colorKey: string;  // matches COLORS[].key
  plate: string;
  year: string;
}

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface BookingRecord {
  id: string;              // reference, e.g. ABH-7K2P9
  status: BookingStatus;
  vehicleLabel: string;    // "Mercedes-Benz S-Class"
  plate: string;
  serviceSlugs: string[];  // translated in the view via booking.svc.*
  branchKey: string;       // matches booking.branches.*
  date: string;            // ISO (yyyy-mm-dd)
  time: string;
  total: number;
  stage?: number;          // 0..3 progress for `active`
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  since: string;
  vehicles: Vehicle[];
  bookings: BookingRecord[];
}

interface AuthContextValue {
  member: Member | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<Member>;
  register: (input: { name: string; email: string; phone: string; city: string; password: string }) => Promise<Member>;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Member, 'name' | 'email' | 'phone' | 'city'>>) => void;
  addVehicle: (v: Omit<Vehicle, 'id'>) => Vehicle;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  addBooking: (b: Omit<BookingRecord, 'id' | 'createdAt' | 'status'> & { status?: BookingStatus }) => BookingRecord;
}

const SESSION_KEY = 'abh.member';
const ACCOUNTS_KEY = 'abh.accounts';

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── helpers ── */
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const ref = () => `ABH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const dayISO = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/* Demo data so a fresh member sees a living garage + history. Replace with API
   data when the backend lands. Uses real BRANDS so the booking picker resolves
   names and the garage -> booking hand-off works end to end. */
function seedGarage(): Vehicle[] {
  const picks = (BRANDS ?? []).slice(0, 2);
  if (picks.length === 0) return [];
  return picks.map((b: any, i: number) => ({
    id: newId(),
    brandId: b.id,
    model: b.models?.[0] ?? '',
    colorKey: i === 0 ? 'black' : 'white',
    plate: i === 0 ? 'RUH 4471' : 'JED 2208',
    year: i === 0 ? '2024' : '2022',
  }));
}
function labelOf(v: Vehicle | undefined): string {
  if (!v) return '';
  const b = (BRANDS ?? []).find((x: any) => x.id === v.brandId);
  return `${b?.name ?? ''} ${v.model}`.trim();
}
function seedBookings(vehicles: Vehicle[]): BookingRecord[] {
  const v0 = vehicles[0];
  const v1 = vehicles[1] ?? vehicles[0];
  return [
    {
      id: ref(), status: 'upcoming', vehicleLabel: labelOf(v0), plate: v0?.plate ?? '',
      serviceSlugs: ['pkg_diamond'], branchKey: 'new_cairo', date: dayISO(6), time: '11:00',
      total: 9200, createdAt: dayISO(-2),
    },
    {
      id: ref(), status: 'active', vehicleLabel: labelOf(v1), plate: v1?.plate ?? '',
      serviceSlugs: ['ppf_full', 'tint_ceramic'], branchKey: 'nasr_city', date: dayISO(0), time: '09:30',
      total: 14600, stage: 1, createdAt: dayISO(-3),
    },
    {
      id: ref(), status: 'completed', vehicleLabel: labelOf(v0), plate: v0?.plate ?? '',
      serviceSlugs: ['add_detail', 'add_polish'], branchKey: 'alexandria', date: dayISO(-40), time: '13:00',
      total: 1850, createdAt: dayISO(-44),
    },
  ];
}

/* Repair any persisted member that predates the garage/bookings fields (or a
   partial object), so the dashboard never reads `undefined.filter`. Legacy
   sessions (no vehicles AND no bookings keys at all) get the demo seed; an
   intentionally-empty array is preserved. */
function normalizeMember(m: any): Member {
  const legacy = m.vehicles === undefined && m.bookings === undefined;
  const vehicles: Vehicle[] = Array.isArray(m.vehicles) ? m.vehicles : (legacy ? seedGarage() : []);
  const bookings: BookingRecord[] = Array.isArray(m.bookings) ? m.bookings : (legacy ? seedBookings(vehicles) : []);
  return {
    id: m.id ?? newId(),
    name: m.name ?? 'Member',
    email: m.email ?? '',
    phone: m.phone ?? '',
    city: m.city ?? '',
    since: m.since ?? new Date().toISOString(),
    vehicles,
    bookings,
  };
}

interface StoredAccount extends Member { password: string; }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = readJSON<Member | null>(SESSION_KEY, null);
    if (raw) {
      const safe = normalizeMember(raw);
      setMember(safe);
      writeJSON(SESSION_KEY, safe); // persist the upgrade so it sticks
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((m: Member | null) => {
    setMember(m);
    if (m) {
      writeJSON(SESSION_KEY, m);
      const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
      const prev = accounts.find((a) => a.id === m.id);
      writeJSON(ACCOUNTS_KEY, [
        ...accounts.filter((a) => a.id !== m.id),
        { ...m, password: prev?.password ?? '' },
      ]);
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    await wait(900);
    const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const garage = seedGarage();
    const m: Member = {
      id: newId(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      city: input.city,
      since: new Date().toISOString(),
      vehicles: garage,
      bookings: seedBookings(garage),
    };
    writeJSON(ACCOUNTS_KEY, [
      ...accounts.filter((a) => a.email !== m.email),
      { ...m, password: input.password },
    ]);
    setMember(m);
    writeJSON(SESSION_KEY, m);
    return m;
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    await wait(900);
    const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const found = accounts.find((a) => a.email === email.trim().toLowerCase());

    if (found) {
      if (found.password && found.password !== password) throw new Error('invalid-credentials');
      const { password: _pw, ...rest } = found;
      const m: Member = { ...rest, vehicles: rest.vehicles ?? [], bookings: rest.bookings ?? [] };
      setMember(m); writeJSON(SESSION_KEY, m);
      return m;
    }

    const local = (email.trim().split('@')[0] || 'Member')
      .replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    const garage = seedGarage();
    const m: Member = {
      id: newId(), name: local || 'Member', email: email.trim().toLowerCase(),
      phone: '', city: '', since: new Date().toISOString(),
      vehicles: garage, bookings: seedBookings(garage),
    };
    setMember(m); writeJSON(SESSION_KEY, m);
    return m;
  }, []);

  const signOut = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>((patch) => {
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  const addVehicle = useCallback<AuthContextValue['addVehicle']>((v) => {
    const vehicle: Vehicle = { ...v, id: newId() };
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, vehicles: [...prev.vehicles, vehicle] };
      persist(next);
      return next;
    });
    return vehicle;
  }, [persist]);

  const updateVehicle = useCallback<AuthContextValue['updateVehicle']>((id, patch) => {
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, vehicles: prev.vehicles.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
      persist(next);
      return next;
    });
  }, [persist]);

  const removeVehicle = useCallback<AuthContextValue['removeVehicle']>((id) => {
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, vehicles: prev.vehicles.filter((x) => x.id !== id) };
      persist(next);
      return next;
    });
  }, [persist]);

  const addBooking = useCallback<AuthContextValue['addBooking']>((b) => {
    const record: BookingRecord = { ...b, id: ref(), status: b.status ?? 'upcoming', createdAt: new Date().toISOString() };
    setMember((prev) => {
      if (!prev) return prev;
      const next = { ...prev, bookings: [record, ...prev.bookings] };
      persist(next);
      return next;
    });
    return record;
  }, [persist]);

  const value = useMemo<AuthContextValue>(() => ({
    member, hydrated, signIn, register, signOut, updateProfile,
    addVehicle, updateVehicle, removeVehicle, addBooking,
  }), [member, hydrated, signIn, register, signOut, updateProfile, addVehicle, updateVehicle, removeVehicle, addBooking]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}