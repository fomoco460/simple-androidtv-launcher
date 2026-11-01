/**
 * TV audio feedback (Web Audio API): remote D-pad ticks, select and back sounds.
 * A theme picks the sound character, a volume picks how loud it is.
 */

export type SoundTheme = 'off' | 'click' | 'chime' | 'beep';
export type SoundVolume = 'low' | 'medium' | 'high';

export const SOUND_THEMES: { id: SoundTheme; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'click', label: 'Soft click' },
  { id: 'chime', label: 'Chime' },
  { id: 'beep', label: 'Beep' },
];

export const SOUND_VOLUMES: { id: SoundVolume; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

type Kind = 'move' | 'select' | 'back';

interface Tone {
  type: OscillatorType;
  from: number;
  to: number;
  dur: number;
  gain: number;
  delay?: number;
}

const TONES: Record<Exclude<SoundTheme, 'off'>, Record<Kind, Tone[]>> = {
  click: {
    move: [{ type: 'triangle', from: 1400, to: 700, dur: 0.05, gain: 0.5 }],
    select: [{ type: 'triangle', from: 900, to: 1500, dur: 0.09, gain: 0.6 }],
    back: [{ type: 'triangle', from: 800, to: 400, dur: 0.08, gain: 0.5 }],
  },
  chime: {
    move: [{ type: 'sine', from: 1320, to: 1320, dur: 0.09, gain: 0.45 }],
    select: [
      { type: 'sine', from: 880, to: 880, dur: 0.14, gain: 0.5 },
      { type: 'sine', from: 1320, to: 1320, dur: 0.2, gain: 0.5, delay: 0.09 },
    ],
    back: [
      { type: 'sine', from: 1000, to: 1000, dur: 0.12, gain: 0.45 },
      { type: 'sine', from: 660, to: 660, dur: 0.16, gain: 0.45, delay: 0.08 },
    ],
  },
  beep: {
    move: [{ type: 'square', from: 1000, to: 1000, dur: 0.04, gain: 0.25 }],
    select: [{ type: 'square', from: 1500, to: 1500, dur: 0.1, gain: 0.3 }],
    back: [{ type: 'square', from: 600, to: 600, dur: 0.09, gain: 0.3 }],
  },
};

const VOLUME_FACTOR: Record<SoundVolume, number> = { low: 0.35, medium: 0.7, high: 1 };

class SoundService {
  private ctx: AudioContext | null = null;
  public theme: SoundTheme = 'click';
  public volume: SoundVolume = 'medium';

  configure(theme: SoundTheme, volume: SoundVolume) {
    this.theme = theme;
    this.volume = volume;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private play(kind: Kind, themeOverride?: SoundTheme, volumeOverride?: SoundVolume) {
    const theme = themeOverride ?? this.theme;
    if (theme === 'off') return;
    const vol = VOLUME_FACTOR[volumeOverride ?? this.volume];
    try {
      this.initCtx();
      const ctx = this.ctx;
      if (!ctx) return;
      for (const t of TONES[theme][kind]) {
        const start = ctx.currentTime + (t.delay ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = t.type;
        osc.frequency.setValueAtTime(t.from, start);
        if (t.to !== t.from) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
        const peak = Math.max(0.001, t.gain * vol);
        gain.gain.setValueAtTime(peak, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + t.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + t.dur + 0.02);
      }
    } catch {
      // Audio can be blocked until the first interaction
    }
  }

  playMove() { this.play('move'); }
  playSelect() { this.play('select'); }
  playBack() { this.play('back'); }

  /** Plays the select sound for a given theme/volume (used when changing the setting). */
  preview(theme: SoundTheme, volume: SoundVolume) {
    this.play('select', theme, volume);
  }
}

export const soundService = new SoundService();
