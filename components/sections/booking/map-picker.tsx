'use client';

/**
 * MapPicker — a stylised monochrome map the owner drops a pin on.
 *
 * Real Google Maps needs an API key; this is a self-contained, on-brand
 * canvas (SVG street grid + park + water + a draggable platinum pin) that
 * emits lat/lng + a synthesised address line. Drop-in: swap for a real
 * map embed later by replacing the <svg> stage and keeping the props.
 */
import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Crosshair } from 'lucide-react';

// Jeddah-ish anchor so synthesised coordinates read plausibly.
const ANCHOR = { lat: 21.5433, lng: 39.1728 };
const SPAN = 0.06;

const DISTRICTS = [
  'Al-Faisaliyah', 'Al-Rawdah', 'Al-Hamra', 'Ash-Shati', 'Al-Andalus',
  'Al-Salamah', 'Al-Zahra', 'Al-Naeem', 'Al-Khalidiyah',
];

export function MapPicker({
  value, onPick, addressPlaceholder, mapHint,
}: {
  value: { lat: number | null; lng: number | null; address: string };
  onPick: (v: { lat: number; lng: number; address: string }) => void;
  addressPlaceholder: string;
  mapHint: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(
    value.lat != null ? { x: 50, y: 50 } : null,
  );
  const [dragging, setDragging] = useState(false);

  const place = useCallback((clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100));
    setPin({ x, y });
    const lat = +(ANCHOR.lat + (0.5 - y / 100) * SPAN).toFixed(5);
    const lng = +(ANCHOR.lng + (x / 100 - 0.5) * SPAN).toFixed(5);
    const district = DISTRICTS[Math.floor((x + y) / 200 * DISTRICTS.length) % DISTRICTS.length];
    const street = 100 + Math.floor((x * y) % 400);
    onPick({ lat, lng, address: `${street} ${district} St, Jeddah` });
  }, [onPick]);

  return (
    <div className="space-y-4">
      <div
        ref={stageRef}
        data-cursor="hover"
        onClick={(e) => place(e.clientX, e.clientY)}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onMouseMove={(e) => dragging && place(e.clientX, e.clientY)}
        className="relative h-56 w-full cursor-crosshair overflow-hidden rounded-2xl border border-white/12 bg-[#070809] md:h-64"
      >
        {/* map artwork */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 260">
          <defs>
            <pattern id="mp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="260" fill="url(#mp-grid)" />
          {/* water */}
          <path d="M0 0 L120 0 Q90 70 130 130 Q90 200 110 260 L0 260 Z" fill="rgba(102,106,110,0.10)" />
          <path d="M0 0 L120 0 Q90 70 130 130 Q90 200 110 260 L0 260 Z" fill="none" stroke="rgba(203,205,205,0.12)" strokeWidth="1" />
          {/* park */}
          <rect x="250" y="40" width="90" height="70" rx="10" fill="rgba(203,205,205,0.04)" stroke="rgba(203,205,205,0.10)" />
          {/* arterial roads */}
          <path d="M150 0 L210 260" stroke="rgba(203,205,205,0.18)" strokeWidth="3" fill="none" />
          <path d="M0 90 L400 60" stroke="rgba(203,205,205,0.16)" strokeWidth="3" fill="none" />
          <path d="M0 180 L400 200" stroke="rgba(203,205,205,0.12)" strokeWidth="2" fill="none" />
          <path d="M300 0 L330 260" stroke="rgba(203,205,205,0.10)" strokeWidth="2" fill="none" />
        </svg>

        {/* hint */}
        {!pin && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-obsidian/60 px-4 py-2 text-[0.6rem] uppercase tracking-[0.22em] text-platinum/70 backdrop-blur-md">
              <Crosshair className="h-3 w-3" strokeWidth={1.8} />
              {mapHint}
            </span>
          </div>
        )}

        {/* pin */}
        {pin && (
          <motion.div
            initial={{ scale: 0, y: -8 }} animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rounded-full bg-platinum/30 blur-sm" />
            <MapPin className="h-7 w-7 fill-ivory text-obsidian drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" strokeWidth={1.5} />
          </motion.div>
        )}

        {/* ripple ring when pin set */}
        {pin && (
          <motion.span
            key={`${pin.x}-${pin.y}`}
            initial={{ scale: 0, opacity: 0.6 }} animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          />
        )}
      </div>

      {/* address line */}
      <div className="relative">
        <MapPin className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input
          value={value.address}
          onChange={(e) => onPick({ lat: value.lat ?? ANCHOR.lat, lng: value.lng ?? ANCHOR.lng, address: e.target.value })}
          placeholder={addressPlaceholder}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors duration-300 focus:border-platinum/50 focus:bg-white/[0.05]"
        />
        {value.lat != null && (
          <span dir="ltr" className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 font-mono text-[0.6rem] tabular-nums text-steel">
            {value.lat?.toFixed(3)}, {value.lng?.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  );
}