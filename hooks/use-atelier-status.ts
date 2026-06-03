'use client';

import { useEffect, useState } from 'react';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 22;
const TZ = 'Asia/Riyadh';

export interface AtelierStatus {
  open: boolean;
  localTime: string;
  weekday: number;
  countdown: string;
  countdownTo: 'opening' | 'closing';
}

function getJeddahParts(now: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now).reduce<Record<string, string>>(
    (acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  const weekdayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return {
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    weekday: weekdayMap[parts.weekday] ?? 7,
  };
}

function isOpenDay(weekday: number): boolean {
  return weekday === 7 || (weekday >= 1 && weekday <= 4);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function computeCountdown(weekday: number, hour: number, minute: number) {
  const currentlyOpen = isOpenDay(weekday) && hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  const startMin = (weekday - 1) * 1440 + hour * 60 + minute;
  for (let offset = 1; offset <= 7 * 1440; offset++) {
    const absMin = (startMin + offset) % (7 * 1440);
    const wd = Math.floor(absMin / 1440) + 1;
    const minOfDay = absMin % 1440;
    const h = Math.floor(minOfDay / 60);
    const openHere = isOpenDay(wd) && h >= OPEN_HOUR && h < CLOSE_HOUR;
    if (openHere !== currentlyOpen) {
      return { ms: offset * 60_000, to: openHere ? 'opening' as const : 'closing' as const };
    }
  }
  return { ms: 0, to: 'opening' as const };
}

export function useAtelierStatus(): AtelierStatus | null {
  const [status, setStatus] = useState<AtelierStatus | null>(null);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const p = getJeddahParts(now);
      const open = isOpenDay(p.weekday) && p.hour >= OPEN_HOUR && p.hour < CLOSE_HOUR;
      const cd = computeCountdown(p.weekday, p.hour, p.minute);
      const localTime = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}`;
      setStatus({
        open,
        localTime,
        weekday: p.weekday,
        countdown: formatCountdown(cd.ms),
        countdownTo: cd.to,
      });
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, []);

  return status;
}