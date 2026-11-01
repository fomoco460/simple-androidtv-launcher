import React, { useEffect, useState } from 'react';
import { LauncherSettings } from '../types';
import { CLEAN_FRAME_WALLPAPERS } from '../data/cleanFrameWallpapers';
import { pushKeyOwner } from '../services/keyGate';
import { weatherService, WeatherData } from '../services/weather';

interface AmbientModeProps {
  settings: LauncherSettings;
  onWake: () => void;
}

const SLIDE_MS = 18000;

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
  return { time, date };
};

/**
 * Full-screen ambient mode: slow crossfading, gently drifting photography with a large clock.
 * Any remote button wakes it; that first press is swallowed so it never triggers an action.
 */
export const AmbientMode: React.FC<AmbientModeProps> = ({ settings, onWake }) => {
  const [order] = useState(() => {
    const list = [...CLEAN_FRAME_WALLPAPERS];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  });
  const [index, setIndex] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const { time, date } = useClock(settings.clockFormat);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % order.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [order.length]);

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

  // Any input wakes ambient mode and is swallowed (capture phase) so it triggers nothing underneath.
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

  const prev = (index - 1 + order.length) % order.length;
  const next = (index + 1) % order.length;

  return (
    <div className="fixed inset-0 z-[80] bg-black overflow-hidden select-none animate-ambientIn">
      {order.map((wp, i) => {
        const active = i === index;
        return (
          <div
            key={wp.id}
            className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
            style={{ opacity: active ? 1 : 0 }}
          >
            {(i === index || i === prev || i === next) && (
              <img
                src={wp.src}
                alt=""
                className={`w-full h-full object-cover brightness-[0.55] saturate-[0.9] ${i === index ? 'animate-ambientDrift' : ''}`}
              />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />

      <div className="absolute left-14 bottom-12 md:left-20 md:bottom-16 text-white/90 drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
        <div className="text-[5.5rem] md:text-[8rem] font-extralight leading-none tracking-tight">{time}</div>
        <div className="mt-2 text-xl md:text-3xl font-light text-white/85">{date}</div>
        {weather && (
          <div className="mt-1 text-base md:text-xl text-white/70">
            {Math.round(weather.temperature)}°{settings.tempUnit || 'F'} · {weather.condition}
          </div>
        )}
      </div>

      <div className="absolute right-14 bottom-12 md:right-20 md:bottom-16 text-white/50 text-sm md:text-base">
        {order[index].name}
      </div>
    </div>
  );
};
