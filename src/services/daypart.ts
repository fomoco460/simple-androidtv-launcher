import type { LauncherSettings } from '../types';

export const DEFAULT_NIGHT_START = 22 * 60; // 10:00 pm
export const DEFAULT_NIGHT_END = 6 * 60; // 6:00 am

type NightSettings = Pick<LauncherSettings, 'nightMode' | 'nightStart' | 'nightEnd'>;

/** Is Night Mode active right now? Off = never, Always = always, Scheduled = between start and end. */
export function isNightActive(s: NightSettings, now: Date = new Date()): boolean {
  if (s.nightMode === 'always') return true;
  if (s.nightMode === 'off') return false;
  const start = s.nightStart ?? DEFAULT_NIGHT_START;
  const end = s.nightEnd ?? DEFAULT_NIGHT_END;
  if (start === end) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return start < end ? m >= start && m < end : m >= start || m < end; // schedule may wrap past midnight
}

/** "10:00 pm" / "22:00" for a minutes-after-midnight value. */
export function formatMinutes(total: number, is24h: boolean): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const mm = String(m).padStart(2, '0');
  if (is24h) return `${String(h).padStart(2, '0')}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

/** 24-hour clock? Follows the clock format setting; "auto" asks Android / the browser. */
export function is24HourClock(format: LauncherSettings['clockFormat']): boolean {
  if (format === '24h') return true;
  if (format === '12h') return false;
  try {
    const bridge = (window as any).AndroidBridge;
    return bridge && typeof bridge.is24HourFormat === 'function'
      ? !!bridge.is24HourFormat()
      : new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === false;
  } catch {
    return false;
  }
}
