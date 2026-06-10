'use client';

/**
 * MapPicker — لاقط موقع حقيقي (Leaflet + OpenStreetMap، بدون مفتاح API).
 * - اضغط على الخريطة أو اسحب الدبوس لتحديد نقطة فعلية.
 * - زر "موقعي الحالي" يستخدم GPS المتصفح.
 * - العنوان يتعبّى تلقائيًا عبر Reverse Geocoding (Nominatim).
 * نفس الـ props القديمة عشان يفضل drop-in.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

const DEFAULT = { lat: 21.5433, lng: 39.1728 }; // جدة
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.L) return resolve(w.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).L));
      existing.addEventListener('error', reject);
      if ((window as any).L) resolve((window as any).L);
      return;
    }
    const sc = document.createElement('script');
    sc.src = LEAFLET_JS; sc.async = true;
    sc.onload = () => resolve((window as any).L);
    sc.onerror = reject;
    document.body.appendChild(sc);
  });
}

export function MapPicker({
  value, onPick, addressPlaceholder, mapHint,
}: {
  value: { lat: number | null; lng: number | null; address: string };
  onPick: (v: { lat: number; lng: number; address: string }) => void;
  addressPlaceholder: string;
  mapHint: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const isAr = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${isAr ? 'ar' : 'en'}`,
        { headers: { 'Accept': 'application/json' } },
      );
      const j = await res.json();
      const addr = j?.display_name ?? '';
      onPickRef.current({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), address: addr });
    } catch {
      onPickRef.current({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), address: '' });
    } finally {
      setGeocoding(false);
    }
  }, []);

  const placeMarker = useCallback((L: any, lat: number, lng: number, geocode = true) => {
    const map = mapRef.current; if (!map) return;
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="transform:translate(-50%,-100%)">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#f4f4f2" stroke="#0a0b0c" stroke-width="1.2"
            style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.55))">
            <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>
            <circle cx="12" cy="10" r="2.6" fill="#0a0b0c" stroke="none"/></svg></div>`,
        iconSize: [0, 0],
      });
      markerRef.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        reverseGeocode(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (geocode) reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !hostRef.current || mapRef.current) return;
      const start = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : DEFAULT;
      const map = L.map(hostRef.current, { zoomControl: true, attributionControl: false }).setView([start.lat, start.lng], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, subdomains: 'abcd',
      }).addTo(map);
      map.on('click', (e: any) => placeMarker(L, e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      if (value.lat != null && value.lng != null) placeMarker(L, value.lat, value.lng, false);
      setReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    }).catch(() => setReady(false));
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const L = (window as any).L;
        if (mapRef.current && L) { mapRef.current.setView([latitude, longitude], 15); placeMarker(L, latitude, longitude); }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/12">
        <div ref={hostRef} className="h-56 w-full md:h-72" style={{ background: '#0b0c0d' }} />

        {!ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0b0c0d]">
            <span className="inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.2em] text-platinum/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />…
            </span>
          </div>
        )}

        {/* hint + my location */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-white/12 bg-obsidian/70 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.18em] text-platinum/80 backdrop-blur-md">
            <Crosshair className="h-3 w-3" strokeWidth={1.8} />{mapHint}
          </span>
          <button type="button" data-cursor="hover" onClick={useMyLocation}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-obsidian/70 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.16em] text-ivory backdrop-blur-md transition-colors hover:border-platinum/50">
            {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {/* address line (editable + reverse-geocoded) */}
      <div className="relative">
        <MapPin className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input
          value={value.address}
          onChange={(e) => onPick({ lat: value.lat ?? DEFAULT.lat, lng: value.lng ?? DEFAULT.lng, address: e.target.value })}
          placeholder={addressPlaceholder}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors duration-300 focus:border-platinum/50 focus:bg-white/[0.05]"
        />
        {(geocoding || value.lat != null) && (
          <span dir="ltr" className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 font-mono text-[0.6rem] tabular-nums text-steel">
            {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <>{value.lat?.toFixed(3)}, {value.lng?.toFixed(3)}</>}
          </span>
        )}
      </div>
    </div>
  );
}