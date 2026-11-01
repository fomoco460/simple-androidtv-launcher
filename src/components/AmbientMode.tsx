import React, { useEffect, useMemo, useState } from 'react';
import { LauncherSettings } from '../types';
import { AMBIENT_PHOTOS, AmbientPhoto } from '../data/ambientPhotos';
import { getDaypart, Daypart } from '../services/daypart';
import { pushKeyOwner } from '../services/keyGate';
import { weatherService, WeatherData } from '../services/weather';

interface AmbientModeProps {
  settings: LauncherSettings;
  onWake: () => void;
}

const SLIDE_MS = 18000;

// Smart Ambient: the photos get dimmer as the evening goes on
const BRIGHTNESS: Record<Daypart, number> = { day: 0.6, evening: 0.5, night: 0.35 };
const TEXT_ALPHA: Record<Daypart, number> = { day: 0.55, evening: 0.45, night: 0.32 };

const useClock = (clockFormat: LauncherSettings['clockFormat']) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  let is24h = clockFormat === '24h';
  if (!clockFormat || clockFormat === 'auto') {
    try {
      const bridge = (window as any).AndroidBridge;
      is24h =
        bridge && typeof bridge.is24HourFormat === 'function'
          ? !!bridge.is24HourFormat()
          : new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === false;
    } catch {
      is24h = false;
    }
  }
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = is24h
    ? `${String(now.getHours()).padStart(2, '0')}:${minutes}`
    : `${now.getHours() % 12 || 12}:${minutes}`;
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return { now, time, date };
};

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Full-screen ambient mode: slow crossfading, gently drifting photography with a large clock.
 * "Smart": uses the photo set you chose, gets dimmer through the evening, and shows only dark
 * photos after dark. Any remote button wakes it; that first press is swallowed.
 */
export const AmbientMode: React.FC<AmbientModeProps> = ({ settings, onWake }) => {
  const { now, time, date } = useClock(settings.clockFormat);
  const daypart = getDaypart(settings.nightMode, now);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  const pool = useMemo(() => {
    const wanted = settings.ambientPhotos;
    let list: AmbientPhoto[] = AMBIENT_PHOTOS.filter((p) => wanted === 'smart' || p.set === wanted);
    if (list.length === 0) list = AMBIENT_PHOTOS; // chosen set not installed: use whatever exists
    const darkOnly = daypart !== 'day';
    const toned = darkOnly ? list.filter((p) => p.tone === 'dark') : list;
    const base = (toned.length > 0 ? toned : list).filter((p) => !broken.has(p.id));
    return shuffled(base.length > 0 ? base : list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ambientPhotos, daypart === 'day', broken]);

  const [index, setIndex] = useState(0);
  const safeIndex = pool.length > 0 ? index % pool.length : 0;

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => i + 1), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    let alive = true;
    weatherService
      .getWeather(settings.tempUnit || 'F', settings.weatherLat, settings.weatherLon, settings.weatherCity)
      .then((w) => alive && setWeather(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [settings.tempUnit, settings.weatherLat, settings.weatherLon, settings.weatherCity]);

  // Any input wakes ambient mode and is swallowed (the key gate runs before every other listener).
  useEffect(() => {
    let armed = false;
    const arm = window.setTimeout(() => (armed = true), 400); // ignore the key release that started it
    const wake = (e: Event) => {
      if (!armed) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onWake();
    };
    const events = [
      'keydown',
      'mousedown',
      'touchstart',
      'chromecast-back-press',
      'chromecast-select-long',
      'chromecast-home-press',
    ];
    const removeOwner = pushKeyOwner(wake, events);
    return () => {
      window.clearTimeout(arm);
      removeOwner();
    };
  }, [onWake]);

  const prev = pool.length > 0 ? (safeIndex - 1 + pool.length) % pool.length : 0;
  const next = pool.length > 0 ? (safeIndex + 1) % pool.length : 0;
  const current = pool[safeIndex];

  const style = settings.clockStyle;
  const timeSize =
    style === 'large'
      ? 'text-[7rem] md:text-[11rem]'
      : 'text-[5.5rem] md:text-[8rem]';
  const alpha = TEXT_ALPHA[daypart];
  const showExtras = style !== 'minimal';

  return (
    <div className="fixed inset-0 z-[80] bg-black overflow-hidden select-none animate-ambientIn">
      {pool.map((p, i) => {
        const active = i === safeIndex;
        return (
          <div
            key={p.id}
            className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
            style={{ opacity: active ? 1 : 0 }}
          >
            {(i === safeIndex || i === prev || i === next) && (
              <img
                src={p.src}
                alt=""
                onError={() => setBroken((b) => new Set(b).add(p.id))}
                className={`w-full h-full object-cover ${i === safeIndex ? 'animate-ambientDrift' : ''}`}
                style={{ filter: `brightness(${BRIGHTNESS[daypart]}) saturate(0.9)` }}
              />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />

      <div
        className="absolute left-14 bottom-12 md:left-20 md:bottom-16 drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
        style={{ color: `rgba(255,255,255,${alpha})` }}
      >
        <div className={`${timeSize} font-extralight leading-none tracking-tight`}>{time}</div>
        {showExtras && (
          <>
            <div className="mt-2 text-xl md:text-3xl font-light" style={{ opacity: 0.9 }}>
              {date}
            </div>
            {settings.showWeather !== false && weather && (
              <div className="mt-1 text-base md:text-xl" style={{ opacity: 0.75 }}>
                {Math.round(weather.temperature)}°{settings.tempUnit || 'F'} · {weather.condition}
              </div>
            )}
          </>
        )}
      </div>

      {current && showExtras && (
        <div
          className="absolute right-14 bottom-12 md:right-20 md:bottom-16 text-sm md:text-base"
          style={{ color: `rgba(255,255,255,${alpha * 0.55})` }}
        >
          {current.name}
        </div>
      )}
    </div>
  );
};
