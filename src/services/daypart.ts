import type { NightMode } from '../types';

export type Daypart = 'day' | 'evening' | 'night';

const isLateHour = (d: Date) => d.getHours() >= 22 || d.getHours() < 6;

/** Is Night Mode currently dimming the launcher? (Auto = 10 pm to 6 am.) */
export function isNightModeActive(mode: NightMode, now: Date = new Date()): boolean {
  if (mode === 'always') return true;
  if (mode === 'off') return false;
  return isLateHour(now);
}

/** Time of day used by Smart Ambient Mode. "Always" Night Mode forces night. */
export function getDaypart(mode: NightMode, now: Date = new Date()): Daypart {
  if (mode === 'always' || isLateHour(now)) return 'night';
  if (now.getHours() >= 18) return 'evening';
  return 'day';
}
