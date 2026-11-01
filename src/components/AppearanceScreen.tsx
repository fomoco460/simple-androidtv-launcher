import React, { useEffect, useRef, useState } from 'react';
import {
  LauncherSettings,
  ClockStyle,
  NightMode,
  BackgroundPreset,
  AppsDisplayPreset,
  FontPreset,
  HomeControlsPreset,
  AppItem,
} from '../types';
import { HomeLauncher } from './HomeLauncher';
import { AmbientMode } from './AmbientMode';
import { AmbientPhotoPicker } from './AmbientPhotoPicker';
import { AndroidSettingsView } from './AndroidSettingsView';
import { ScaledPreview } from './ScaledPreview';
import { AppIcon } from './BrandIcons';
import { useSpatialNav } from '../hooks/useSpatialNav';
import {
  soundService,
  SOUND_THEMES,
  SOUND_VOLUMES,
  SoundTheme,
  SoundVolume,
} from '../services/sound';
import { formatMinutes, is24HourClock } from '../services/daypart';
import { CLEAN_FRAME_WALLPAPERS } from '../data/cleanFrameWallpapers';
import { AMBIENT_PHOTOS, ALL_PHOTO_IDS, DEFAULT_NIGHT_IDS, SPACE_PHOTOS } from '../data/ambientPhotos';
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Clock,
  Image as ImageIcon,
  Moon,
  Volume2,
  LayoutGrid,
  Smartphone,
  Download,
} from 'lucide-react';

interface AppearanceScreenProps {
  settings: LauncherSettings;
  onUpdateSettings: (newSettings: Partial<LauncherSettings>) => void;
  onBackToHome: () => void;
  apps: AppItem[];
  onLaunchApp: (app: AppItem) => void;
  onMoveDockApp?: (appId: string, direction: 'left' | 'right') => void;
  onToggleDockPin?: (appId: string) => void;
  onOpenLocationModal?: () => void;
  onOpenApkModal?: () => void;
  onOpenBackdropModal?: (appId?: string) => void;
  onOpenWallpaperGallery?: () => void;
  isModalOpen?: boolean;
}

type Category = 'look' | 'clock' | 'ambient' | 'night' | 'sound' | 'homerow' | 'system';

const CATEGORIES: { id: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'look', label: 'Look', icon: Palette },
  { id: 'clock', label: 'Clock & Weather', icon: Clock },
  { id: 'ambient', label: 'Ambient', icon: ImageIcon },
  { id: 'night', label: 'Night', icon: Moon },
  { id: 'sound', label: 'Sound', icon: Volume2 },
  { id: 'homerow', label: 'Home row', icon: LayoutGrid },
  { id: 'system', label: 'System', icon: Smartphone },
];

const THEME_NAMES: Record<string, string> = {
  'desert-stars': 'Desert Stars',
  'nordic-aurora': 'Nordic Aurora',
  'misty-pines': 'Misty Pines',
  'cyber-dusk': 'Cyber Dusk',
  'deep-space': 'Deep Space',
  'sunset-dunes': 'Sunset Dunes',
};

const backgroundName = (preset: BackgroundPreset): string => {
  if (preset === 'custom') return 'Custom image';
  const cf = CLEAN_FRAME_WALLPAPERS.find((w) => w.presetId === preset);
  if (cf) return cf.name;
  const sp = SPACE_PHOTOS.find((p) => p.id === preset);
  if (sp) return `${sp.name} (NASA)`;
  return THEME_NAMES[preset as string] ?? 'Desert Stars';
};

const APPS_OPTIONS: { id: AppsDisplayPreset; label: string }[] = [
  { id: 'icons-and-text', label: 'Icons and text' },
  { id: 'icons-only', label: 'Icons only' },
  { id: 'text-only', label: 'Text only' },
];
const FONT_OPTIONS: { id: FontPreset; label: string }[] = [
  { id: 'Manrope', label: 'Manrope' },
  { id: 'Outfit', label: 'Outfit' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { id: 'Robotech GP', label: 'Robotech GP' },
  { id: 'System', label: 'System' },
];
const CONTROLS_OPTIONS: { id: HomeControlsPreset; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'icons', label: 'Icons' },
  { id: 'both', label: 'Icons and text' },
];
const CLOCK_STYLES: { id: ClockStyle; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'large', label: 'Large' },
  { id: 'minimal', label: 'Time only' },
];
const CLOCK_FORMATS: { id: 'auto' | '12h' | '24h'; label: string }[] = [
  { id: 'auto', label: 'Automatic' },
  { id: '12h', label: '12-hour' },
  { id: '24h', label: '24-hour' },
];
const NIGHT_MODES: { id: NightMode; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'auto', label: 'Scheduled' },
  { id: 'always', label: 'Always on' },
];
const AMBIENT_MINUTES = [0, 1, 2, 5, 10, 20, 30];

/* ---------- one consistent row for every setting ---------- */

interface RowProps {
  label: string;
  hint?: string;
  value?: string;
  kind: 'choice' | 'toggle' | 'link';
  on?: boolean;
  dim?: boolean;
  icon?: React.ReactNode;
  /** OK pressed (and Right for choices). */
  onPress: () => void;
  /** Left pressed on a choice row. */
  onPrev?: () => void;
  initial?: boolean;
}

const Row: React.FC<RowProps> = ({ label, hint, value, kind, on, dim, icon, onPress, onPrev, initial }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const pressRef = useRef(onPress);
  const prevRef = useRef(onPrev);
  pressRef.current = onPress;
  prevRef.current = onPrev;

  // Left / Right change the value (the spatial-nav hook sends 'adjust' for data-adjust controls).
  useEffect(() => {
    const el = ref.current;
    if (!el || kind === 'link') return;
    const handler = (e: Event) => {
      const dir = (e as CustomEvent<{ dir: 'left' | 'right' }>).detail.dir;
      soundService.playMove();
      if (dir === 'right') pressRef.current();
      else (prevRef.current ?? pressRef.current)();
    };
    el.addEventListener('adjust', handler);
    return () => el.removeEventListener('adjust', handler);
  }, [kind]);

  return (
    <button
      ref={ref}
      data-nav
      {...(kind !== 'link' ? { 'data-adjust': true } : {})}
      {...(initial ? { 'data-nav-initial': true } : {})}
      onClick={() => {
        soundService.playSelect();
        onPress();
      }}
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 md:py-3.5 text-left bg-white/[0.06] border border-white/10 hover:bg-white/10 transition cursor-pointer ${
        dim ? 'opacity-50' : ''
      }`}
    >
      {icon && <div className="w-9 h-9 flex items-center justify-center shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-base md:text-lg font-semibold text-white truncate">{label}</div>
        {hint && <div className="text-xs md:text-sm text-white/50 truncate">{hint}</div>}
      </div>
      {kind === 'toggle' ? (
        <span
          className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
            on ? 'bg-emerald-400 text-black' : 'bg-white/15 text-white/70'
          }`}
        >
          {on ? 'On' : 'Off'}
        </span>
      ) : (
        <span className="shrink-0 flex items-center gap-1.5 text-sm md:text-base font-semibold text-sky-300 max-w-[55%]">
          {kind === 'choice' && <ChevronLeft className="w-4 h-4 text-white/40 shrink-0" />}
          <span className="truncate">{value}</span>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </span>
      )}
    </button>
  );
};

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-2 pt-1 text-xs md:text-sm text-white/45 leading-relaxed">{children}</p>
);

export const AppearanceScreen: React.FC<AppearanceScreenProps> = ({
  settings,
  onUpdateSettings,
  onBackToHome,
  apps,
  onLaunchApp,
  onMoveDockApp,
  onToggleDockPin,
  onOpenLocationModal,
  onOpenApkModal,
  onOpenBackdropModal,
  onOpenWallpaperGallery,
  isModalOpen = false,
}) => {
  const [category, setCategory] = useState<Category>('look');
  const [picker, setPicker] = useState<'day' | 'night' | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sideRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navRef = useRef<HTMLElement | null>(null);

  // Right on a category enters the list at its first row (not whichever row happens to be nearest).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const enter = (e: Event) => {
      if ((e as CustomEvent<{ dir: string }>).detail.dir !== 'right') return;
      const list = contentRef.current;
      const first = list?.querySelector<HTMLElement>('[data-nav-initial]') ?? list?.querySelector<HTMLElement>('[data-nav]');
      if (first) {
        soundService.playMove();
        first.focus();
        first.scrollIntoView({ block: 'nearest' });
      }
    };
    nav.addEventListener('adjust', enter);
    return () => nav.removeEventListener('adjust', enter);
  }, []);

  const isTvOrNative =
    typeof window !== 'undefined' &&
    (!!(window as any).AndroidBridge?.isNative?.() ||
      /Android|AFT|GoogleTV|SmartTV|AppleTV|HbbTV|CrKey/i.test(navigator.userAgent));

  // Back: from the settings list go to the category list, from the category list go Home.
  useSpatialNav({
    containerRef: rootRef,
    enabled: !isModalOpen && !showAndroid && !picker,
    onBack: () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && contentRef.current?.contains(active)) {
        sideRefs.current[category]?.focus();
      } else {
        onBackToHome();
      }
    },
  });

  /* ----- helpers ----- */
  const cycle = <T extends { id: string }>(list: T[], current: string, dir: 1 | -1): T =>
    list[(Math.max(0, list.findIndex((o) => o.id === current)) + dir + list.length) % list.length];
  const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
    list.find((o) => o.id === id)?.label ?? '';

  const choiceRow = <T extends { id: string; label: string }>(
    label: string,
    hint: string | undefined,
    list: T[],
    current: string,
    apply: (id: T['id']) => void,
    extra?: Partial<RowProps>,
  ) => (
    <Row
      label={label}
      hint={hint}
      kind="choice"
      value={labelOf(list, current)}
      onPress={() => apply(cycle(list, current, 1).id)}
      onPrev={() => apply(cycle(list, current, -1).id)}
      {...extra}
    />
  );

  const is24 = is24HourClock(settings.clockFormat);
  const dayIds = settings.ambientDayPhotos ?? ALL_PHOTO_IDS;
  const nightIds = settings.ambientNightPhotos ?? DEFAULT_NIGHT_IDS;
  const scheduled = settings.nightMode === 'auto';
  const stepTime = (key: 'nightStart' | 'nightEnd', delta: number) =>
    onUpdateSettings({ [key]: (((settings[key] ?? 0) + delta) % 1440 + 1440) % 1440 });

  const setSound = (theme: SoundTheme, volume: SoundVolume) => {
    onUpdateSettings({ soundTheme: theme, soundVolume: volume });
    soundService.preview(theme, volume);
  };

  const dockApps = apps.filter((a) => a.inDock);
  const otherApps = apps.filter((a) => !a.inDock);

  /* ----- rows of each category ----- */
  const renderRows = () => {
    switch (category) {
      case 'look':
        return (
          <>
            <Row
              label="Background"
              hint="Landscapes, NASA photos, animated themes or your own"
              kind="link"
              value={backgroundName(settings.background)}
              onPress={() => onOpenWallpaperGallery?.()}
              initial
            />
            {choiceRow('Font', undefined, FONT_OPTIONS, settings.font, (id) => onUpdateSettings({ font: id }))}
            {choiceRow('App row', 'What each app shows on Home', APPS_OPTIONS, settings.apps, (id) =>
              onUpdateSettings({ apps: id }),
            )}
            {choiceRow('Home buttons', 'All apps and Settings buttons', CONTROLS_OPTIONS, settings.homeControls, (id) =>
              onUpdateSettings({ homeControls: id }),
            )}
            <Row
              label="App backdrops"
              hint={settings.dynamicAppBackgrounds ? 'Wallpaper follows the highlighted app' : 'Wallpaper stays the same'}
              kind="toggle"
              on={!!settings.dynamicAppBackgrounds}
              onPress={() => onUpdateSettings({ dynamicAppBackgrounds: !settings.dynamicAppBackgrounds })}
            />
            <Row
              label="Manage backdrops"
              hint="Pick or generate a backdrop for each app"
              kind="link"
              value="Open"
              onPress={() => onOpenBackdropModal?.()}
            />
          </>
        );
      case 'clock':
        return (
          <>
            {choiceRow('Clock style', 'Used on Home and in Ambient mode', CLOCK_STYLES, settings.clockStyle, (id) =>
              onUpdateSettings({ clockStyle: id }),
            )}
            {choiceRow('Time format', undefined, CLOCK_FORMATS, settings.clockFormat ?? 'auto', (id) =>
              onUpdateSettings({ clockFormat: id }),
            )}
            <Row
              label="Show date"
              kind="toggle"
              on={!!settings.showDate}
              onPress={() => onUpdateSettings({ showDate: !settings.showDate })}
            />
            <Row
              label="Show weather"
              kind="toggle"
              on={settings.showWeather !== false}
              onPress={() => onUpdateSettings({ showWeather: settings.showWeather === false })}
            />
            <Row
              label="Temperature"
              kind="choice"
              value={settings.tempUnit === 'C' ? '°C Celsius' : '°F Fahrenheit'}
              onPress={() => onUpdateSettings({ tempUnit: settings.tempUnit === 'C' ? 'F' : 'C' })}
            />
            <Row
              label="Weather location"
              kind="link"
              value={settings.weatherCity || 'Automatic'}
              onPress={() => onOpenLocationModal?.()}
            />
          </>
        );
      case 'ambient':
        return (
          <>
            <Row
              label="Start after"
              hint="Idle time on Home before the photo clock starts"
              kind="choice"
              value={settings.ambientMinutes > 0 ? `${settings.ambientMinutes} min` : 'Off'}
              onPress={() => {
                const i = AMBIENT_MINUTES.indexOf(settings.ambientMinutes);
                onUpdateSettings({ ambientMinutes: AMBIENT_MINUTES[(i + 1) % AMBIENT_MINUTES.length] });
              }}
              onPrev={() => {
                const i = AMBIENT_MINUTES.indexOf(settings.ambientMinutes);
                onUpdateSettings({
                  ambientMinutes: AMBIENT_MINUTES[(i - 1 + AMBIENT_MINUTES.length) % AMBIENT_MINUTES.length],
                });
              }}
              initial
            />
            <Row
              label="Daytime photos"
              hint="Choose which photos Ambient mode shows"
              kind="link"
              value={`${dayIds.length} of ${AMBIENT_PHOTOS.length}`}
              onPress={() => setPicker('day')}
            />
            <Note>
              Ambient mode starts when the remote has been idle. Any button wakes it. The clock, date and weather follow
              your Clock &amp; Weather settings. After dark it switches to your Night photos.
            </Note>
          </>
        );
      case 'night':
        return (
          <>
            {choiceRow('Night mode', 'Dims and warms the screen', NIGHT_MODES, settings.nightMode, (id) =>
              onUpdateSettings({ nightMode: id }),
              { initial: true },
            )}
            <Row
              label="Starts at"
              kind="choice"
              dim={!scheduled}
              value={formatMinutes(settings.nightStart, is24)}
              onPress={() => stepTime('nightStart', 30)}
              onPrev={() => stepTime('nightStart', -30)}
            />
            <Row
              label="Ends at"
              kind="choice"
              dim={!scheduled}
              value={formatMinutes(settings.nightEnd, is24)}
              onPress={() => stepTime('nightEnd', 30)}
              onPrev={() => stepTime('nightEnd', -30)}
            />
            <Row
              label="Night photos"
              hint="Photos Ambient mode shows at night"
              kind="link"
              value={`${nightIds.length} of ${AMBIENT_PHOTOS.length}`}
              onPress={() => setPicker('night')}
            />
            <Note>
              {scheduled
                ? 'Night mode runs between the start and end times. Left and Right change a time in 30 minute steps.'
                : settings.nightMode === 'always'
                  ? 'Night mode is always on.'
                  : 'Night mode is off. Choose Scheduled to set start and end times.'}
            </Note>
          </>
        );
      case 'sound':
        return (
          <>
            {choiceRow('Remote sounds', 'Sound when you move and select', SOUND_THEMES, settings.soundTheme, (id) =>
              setSound(id as SoundTheme, settings.soundVolume),
              { initial: true },
            )}
            {choiceRow('Volume', undefined, SOUND_VOLUMES, settings.soundVolume, (id) =>
              setSound(settings.soundTheme, id as SoundVolume),
            )}
          </>
        );
      case 'homerow':
        return (
          <>
            <Note>OK adds or removes an app from the home row. Left and Right move an app along the row.</Note>
            {[...dockApps, ...otherApps].map((app, i) => {
              const pinned = app.inDock;
              const pos = dockApps.findIndex((a) => a.id === app.id);
              return (
                <Row
                  key={app.id}
                  label={app.name}
                  kind="choice"
                  value={pinned ? `On home row · ${pos + 1}` : 'Not on home row'}
                  icon={<AppIcon app={app} styleMode={settings.iconStyle} className="w-8 h-8" />}
                  initial={i === 0}
                  onPress={() => {
                    if (pinned) onMoveDockApp?.(app.id, 'right');
                    else onToggleDockPin?.(app.id);
                  }}
                  onPrev={() => {
                    if (pinned) onMoveDockApp?.(app.id, 'left');
                  }}
                />
              );
            })}
          </>
        );
      default:
        return (
          <>
            <Row
              label="Android TV settings"
              hint="Wi-Fi, Bluetooth, display, sound and about"
              kind="link"
              value="Open"
              onPress={() => setShowAndroid(true)}
              initial
            />
            {!isTvOrNative && (
              <Row
                label="Install on TV"
                hint="Download the launcher APK"
                kind="link"
                value="Get APK"
                icon={<Download className="w-5 h-5 text-sky-300" />}
                onPress={() => onOpenApkModal?.()}
              />
            )}
          </>
        );
    }
  };

  // Home row is edited live, so its list needs a stable key per app; other categories reset on switch.
  const previewIsAmbient = category === 'ambient' || category === 'night';

  if (showAndroid) {
    return (
      <div className="relative w-full h-full bg-[#070b12] text-white overflow-hidden p-6 md:p-10">
        <AndroidSettingsView onBack={() => setShowAndroid(false)} />
      </div>
    );
  }

  return (
    <>
    <div
      ref={rootRef}
      className="relative w-full h-full bg-[#070b12] text-white flex flex-col p-5 md:p-8 overflow-hidden select-none"
      style={{ fontFamily: settings.font === 'System' ? 'sans-serif' : `'${settings.font}', sans-serif` }}
    >
      <div className="flex items-center gap-4 mb-4 shrink-0 px-1 pt-1">
        <button
          data-nav
          onClick={() => {
            soundService.playBack();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm md:text-base font-semibold bg-white/10 border border-white/15 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" /> Home
        </button>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[12rem_minmax(0,1fr)_minmax(0,36%)] md:grid-cols-[14rem_minmax(0,1fr)_minmax(0,36%)] gap-5">
        {/* Categories */}
        <nav ref={navRef} className="flex flex-col gap-2 min-h-0 overflow-y-auto no-scrollbar p-2 -m-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  sideRefs.current[c.id] = el;
                }}
                data-nav
                data-adjust
                {...(c.id === 'look' ? { 'data-nav-initial': true } : {})}
                onFocus={() => setCategory(c.id)}
                onClick={() => {
                  soundService.playSelect();
                  setCategory(c.id);
                  // OK moves into the list
                  const first = contentRef.current?.querySelector<HTMLElement>('[data-nav]');
                  first?.focus();
                }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 md:py-3.5 text-left text-base md:text-lg font-semibold cursor-pointer transition ${
                  active ? 'bg-white text-slate-900' : 'bg-white/[0.06] text-white/80 border border-white/10'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings of the selected category */}
        <div ref={contentRef} key={category} className="flex flex-col gap-2.5 min-h-0 overflow-y-auto no-scrollbar p-2 -m-2">
          {renderRows()}
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-2 min-w-0">
          <ScaledPreview>
            {previewIsAmbient ? (
              <AmbientMode settings={settings} preview forceNight={category === 'night'} />
            ) : (
              <div className="w-full h-full relative">
                <HomeLauncher
                  settings={settings}
                  apps={apps}
                  onOpenView={() => {}}
                  onLaunchApp={onLaunchApp}
                  isMiniPreview
                />
              </div>
            )}
          </ScaledPreview>
          <div className="text-xs md:text-sm text-white/50 text-center">
            {previewIsAmbient
              ? category === 'night'
                ? 'Ambient mode at night'
                : 'Ambient mode by day'
              : `Home screen · ${backgroundName(settings.background)}`}
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-3 text-xs md:text-sm text-white/40 text-center">
        Up / Down move · Left / Right change a value · OK select · Back returns to the categories
      </div>
    </div>

      {picker && (
        <AmbientPhotoPicker
          mode={picker}
          selected={picker === 'day' ? dayIds : nightIds}
          onChange={(ids) =>
            onUpdateSettings(picker === 'day' ? { ambientDayPhotos: ids } : { ambientNightPhotos: ids })
          }
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
};
