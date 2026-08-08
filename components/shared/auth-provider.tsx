'use client';

/**
 * AuthProvider — حالة العضوية، مربوطة بـ APIs الحقيقية (جلسات + bcrypt).
 * نفس واجهة useAuth() محفوظة بالكامل — لا تغيير في المكوّنات المستهلكة.
 *
 * البروفايل والعربيات تُحفظ الآن في قاعدة البيانات.
 * الحجوزات (addBooking) ستُربط مع صفحة الحجز.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

import { type VehicleSize } from '@/lib/booking-data';

export interface Vehicle {
  id: string;
  brandId: string;
  model: string;
  colorKey: string;
  plate: string;
  year: string;
  /** (جديد) عدد مرات صيانة الضمان المطلوبة لهذه السيارة. */
  maintenanceCount?: number;
  /** (جديد) سجل طلبات الصيانة — تاريخ كل طلب وحالته وسببه لو اتّرفض. */
  maintenanceHistory?: {
    id: string;
    date: string;
    problem: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
  }[];
}

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

/** صلاحية الحساب — تأتي من /api/auth/me (جدول users.role).
 *  'partner' = حساب شركة شريكة (أسعار خاصة + لوحة شركتي). */
export type UserRole = 'member' | 'staff' | 'admin' | 'partner';

export interface BookingRecord {
  id: string;
  dbId?: string; // internal UUID for API operations
  status: BookingStatus;
  vehicleLabel: string;
  plate: string;
  brandId?: string; 
  plateDigits?: string;   // ← جديد
  plateLetters?: string;
  serviceSlugs: string[];
  serviceSnapshots?: Array<{ ar: string; en: string }>; // from booking_items.name_snapshot
  branchKey: string;
  date: string;
  time: string;
  total: number;
  payment?: 'paid' | 'branch';
  size?: VehicleSize;
  stage?: number;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  since: string;
  role: UserRole;          // ← تُستعمل لإظهار بوابة الداشبورد للأدمن/الستاف ولوحة الشركة للشركاء
  vehicles: Vehicle[];
  bookings: BookingRecord[];
}

interface AuthContextValue {
  member: Member | null;
  hydrated: boolean;
  signIn: (name: string, password: string) => Promise<Member>;
  register: (input: { name: string; email?: string; phone: string; city: string; password: string }) => Promise<Member>;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<Member, 'name' | 'email' | 'phone' | 'city'>>) => void;
  addVehicle: (v: Omit<Vehicle, 'id'>) => Vehicle;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  addBooking: (b: Omit<BookingRecord, 'id' | 'createdAt' | 'status'> & { status?: BookingStatus }) => BookingRecord;
  updateBooking: (id: string, patch: Partial<BookingRecord>) => Promise<void>;
  cancelBooking: (id: string, reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// أدوار معروفة — أي قيمة خارجها تُعامَل كـ member.
const KNOWN_ROLES: UserRole[] = ['member', 'staff', 'admin', 'partner'];

function buildMember(
  u: any,
  vehicles: Vehicle[] = [],
  bookings: BookingRecord[] = [],
): Member {
  // نحافظ على الدور كما يأتي من القاعدة (بما فيه 'partner')، ونرجع لـ member فقط لو غير معروف.
  const role: UserRole = KNOWN_ROLES.includes(u?.role) ? u.role : 'member';
  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    city: u.city ?? u.city_code ?? '',
    since: u.since ?? u.member_since ?? new Date().toISOString(),
    role,
    vehicles,
    bookings,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json();
        if (cancelled) return;
        if (meJson?.user) {
          const acctRes = await fetch('/api/account');
          const acct = await acctRes.json().catch(() => ({ vehicles: [], bookings: [] }));
          if (cancelled) return;
          setMember(buildMember(meJson.user, acct.vehicles ?? [], acct.bookings ?? []));
        }
      } catch {
        /* لا جلسة */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadAccount = useCallback(async (): Promise<{ vehicles: Vehicle[]; bookings: BookingRecord[] }> => {
    try {
      const res = await fetch('/api/account');
      const json = await res.json();
      return { vehicles: json.vehicles ?? [], bookings: json.bookings ?? [] };
    } catch {
      return { vehicles: [], bookings: [] };
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    const acct = await loadAccount();
    setMember((prev) => (prev ? { ...prev, vehicles: acct.vehicles, bookings: acct.bookings } : prev));
  }, [loadAccount]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (name, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),   // ← name مش email
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json?.error ?? 'invalid-credentials');

  const meRes = await fetch('/api/auth/me');
  const meJson = await meRes.json();
  const acct = await loadAccount();
  const m = buildMember(meJson.user ?? json.user, acct.vehicles, acct.bookings);
  setMember(m);
  return m;
}, [loadAccount]);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json?.error ?? 'register-failed');

    const meRes = await fetch('/api/auth/me');
    const meJson = await meRes.json();
    const acct = await loadAccount();
    const m = buildMember(meJson.user ?? json.user, acct.vehicles, acct.bookings);
    setMember(m);
    return m;
  }, [loadAccount]);

  const signOut = useCallback(() => {
    setMember(null);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>((patch) => {
    setMember((prev) => (prev ? { ...prev, ...patch } : prev));
    const { email, ...savable } = patch as any;
    fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savable),
    }).catch((e) => console.error('updateProfile failed:', e));
  }, []);

  const addVehicle = useCallback<AuthContextValue['addVehicle']>((v) => {
    const optimistic: Vehicle = { ...v, id: newId() };
    setMember((prev) => (prev ? { ...prev, vehicles: [...prev.vehicles, optimistic] } : prev));
    (async () => {
      try {
        const res = await fetch('/api/account/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v),
        });
        if (res.ok) await refreshAccount();
      } catch (e) {
        console.error('addVehicle failed:', e);
      }
    })();
    return optimistic;
  }, [refreshAccount]);

  const updateVehicle = useCallback<AuthContextValue['updateVehicle']>((id, patch) => {
    setMember((prev) =>
      prev ? { ...prev, vehicles: prev.vehicles.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : prev);
    (async () => {
      try {
        const current = member?.vehicles.find((x) => x.id === id);
        const merged = { ...current, ...patch, id };
        const res = await fetch('/api/account/vehicles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
        if (res.ok) await refreshAccount();
      } catch (e) {
        console.error('updateVehicle failed:', e);
      }
    })();
  }, [member, refreshAccount]);

  const removeVehicle = useCallback<AuthContextValue['removeVehicle']>((id) => {
    setMember((prev) =>
      prev ? { ...prev, vehicles: prev.vehicles.filter((x) => x.id !== id) } : prev);
    fetch(`/api/account/vehicles?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((res) => { if (res.ok) refreshAccount(); })
      .catch((e) => console.error('removeVehicle failed:', e));
  }, [refreshAccount]);

  const addBooking = useCallback<AuthContextValue['addBooking']>((b) => {
    const record: BookingRecord = { ...b, id: `ABH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, status: b.status ?? 'upcoming', createdAt: new Date().toISOString() };
    setMember((prev) => (prev ? { ...prev, bookings: [record, ...prev.bookings] } : prev));
    return record;
  }, []);

  const updateBooking = useCallback<AuthContextValue['updateBooking']>(async (id, patch) => {
    // optimistic update
    setMember((prev) =>
      prev ? { ...prev, bookings: prev.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : prev);
    try {
      const res = await fetch('/api/account/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        // revert optimistic update on failure
        await refreshAccount();
      }
    } catch (e) {
      console.error('updateBooking failed:', e);
      await refreshAccount();
    }
  }, [refreshAccount]);

  const cancelBooking = useCallback<AuthContextValue['cancelBooking']>(async (id, reason) => {
  setMember((prev) =>
    prev ? { ...prev, bookings: prev.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) } : prev);
  try {
    const res = await fetch(
      `/api/account/bookings?id=${encodeURIComponent(id)}&reason=${encodeURIComponent(reason)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) await refreshAccount();
  } catch (e) {
    console.error('cancelBooking failed:', e);
    await refreshAccount();
  }
}, [refreshAccount]);

  const value = useMemo<AuthContextValue>(() => ({
    member, hydrated, signIn, register, signOut, updateProfile,
    addVehicle, updateVehicle, removeVehicle, addBooking, updateBooking, cancelBooking,
  }), [member, hydrated, signIn, register, signOut, updateProfile, addVehicle, updateVehicle, removeVehicle, addBooking, updateBooking, cancelBooking]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}