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
import { AndroidSettingsView, ANDROID_SETTINGS_LIST, launchAndroidSetting } from './AndroidSettingsView';
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
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left bg-white/[0.06] border border-white/10 hover:bg-white/10 transition cursor-pointer ${
        dim ? 'opacity-50' : ''
      }`}
    >
      {icon && <div className="w-9 h-9 flex items-center justify-center shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-lg font-semibold text-white truncate">{label}</div>
        {hint && <div className="text-sm text-white/50 line-clamp-2 leading-snug">{hint}</div>}
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
        <span className="shrink-0 flex items-center gap-1.5 text-base font-semibold text-sky-300 max-w-[50%]">
          {kind === 'choice' && <ChevronLeft className="w-4 h-4 text-white/40 shrink-0" />}
          <span className="truncate">{value}</span>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </span>
      )}
    </button>
  );
};

/* ---------- app tile for the Home row editor ---------- */

type Dir4 = 'left' | 'right' | 'up' | 'down';

const AppTile: React.FC<{
  app: AppItem;
  iconStyle: LauncherSettings['iconStyle'];
  index?: number;
  moving: boolean;
  initial?: boolean;
  onPress: () => void;
  onAdjust: (dir: Dir4) => void;
}> = ({ app, iconStyle, index, moving, initial, onPress, onAdjust }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const adjustRef = useRef(onAdjust);
  adjustRef.current = onAdjust;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = (e: Event) => adjustRef.current((e as CustomEvent<{ dir: Dir4 }>).detail.dir);
    el.addEventListener('adjust', h);
    return () => el.removeEventListener('adjust', h);
  }, []);
  return (
    <button
      ref={ref}
      data-nav
      data-app-id={app.id}
      {...(moving ? { 'data-adjust': 'all' } : {})}
      {...(initial ? { 'data-nav-initial': true } : {})}
      onClick={() => {
        soundService.playSelect();
        onPress();
      }}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2 aspect-square border cursor-pointer transition ${
        moving ? 'bg-sky-400/25 border-sky-300' : 'bg-white/[0.06] border-white/10 hover:bg-white/10'
      }`}
    >
      {index !== undefined && (
        <span className="absolute top-1.5 left-2 text-[11px] font-bold text-white/40">{index + 1}</span>
      )}
      <AppIcon app={app} styleMode={iconStyle} className="w-11 h-11" />
      <span className="text-sm font-semibold text-white/85 truncate max-w-full">{app.name}</span>
    </button>
  );
};

/** Draws its children on a fixed 1120x630 canvas scaled to fit the screen, so Settings looks the same on every TV. */
const STAGE_W = 1120;
const STAGE_H = 630;
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
  useEffect(() => {
    const f = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b12]">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

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
  const [movingId, setMovingId] = useState<string | null>(null);
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
      if (movingId) {
        setMovingId(null);
        return;
      }
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

  // An app that moves between the home row and "More apps" is a new element, so focus it again.
  const refocusApp = (id: string) =>
    window.setTimeout(() => {
      contentRef.current?.querySelector<HTMLElement>(`[data-app-id="${id}"]`)?.focus();
    }, 60);

  const noteFor = (): string => {
    switch (category) {
      case 'look':
        return 'Background, font and how the app row looks on Home. The preview is your Home screen as it will appear.';
      case 'clock':
        return 'Clock style, date and weather apply to Home and to Ambient mode.';
      case 'ambient':
        return 'Ambient mode starts when the remote has been idle. Any button wakes it. After dark it uses your Night photos.';
      case 'night':
        return scheduled
          ? 'Night mode runs between the start and end times. Left and Right change a time in 30 minute steps.'
          : settings.nightMode === 'always'
            ? 'Night mode is always on.'
            : 'Night mode is off. Choose Scheduled to set start and end times.';
      case 'sound':
        return 'Sounds play as you move around and select. Changing a value plays a sample.';
      case 'homerow':
        return 'Your home row is the single row of apps on the Home screen.';
      default:
        return 'These open the Android TV system settings. Back from there returns to the launcher.';
    }
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
            <div className="flex items-baseline justify-between gap-2 px-1">
              <span className="text-sm font-bold uppercase tracking-wider text-white/45 shrink-0">
                On your home row · {dockApps.length}
              </span>
              <span className="text-sm text-sky-300 font-semibold text-right">
                {movingId ? 'Left / Right move · Down removes · OK done' : 'OK picks an app up to move it'}
              </span>
            </div>
            {dockApps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/50 text-center">
                No apps on the home row. Pick one below to add it.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 p-1">
                {dockApps.map((app, i) => (
                  <AppTile
                    key={app.id}
                    app={app}
                    iconStyle={settings.iconStyle}
                    index={i}
                    initial={i === 0}
                    moving={movingId === app.id}
                    onPress={() => setMovingId(movingId === app.id ? null : app.id)}
                    onAdjust={(dir) => {
                      if (dir === 'left' || dir === 'right') onMoveDockApp?.(app.id, dir);
                      else if (dir === 'down') {
                        setMovingId(null);
                        onToggleDockPin?.(app.id);
                        refocusApp(app.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
            {otherApps.length > 0 && (
              <>
                <div className="px-1 pt-2 text-sm font-bold uppercase tracking-wider text-white/45">
                  More apps · OK adds to the row
                </div>
                <div className="grid grid-cols-4 gap-2.5 p-1">
                  {otherApps.map((app, i) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      iconStyle={settings.iconStyle}
                      moving={false}
                      initial={dockApps.length === 0 && i === 0}
                      onPress={() => {
                        onToggleDockPin?.(app.id);
                        refocusApp(app.id);
                      }}
                      onAdjust={() => {}}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        );
      default:
        return (
          <>
            {ANDROID_SETTINGS_LIST.map((item, i) => (
              <Row
                key={item.id}
                label={item.name}
                hint={item.description}
                kind="link"
                value="Open"
                icon={item.icon}
                initial={i === 0}
                onPress={() => (item.id === 'accessibility' ? setShowAndroid(true) : launchAndroidSetting(item))}
              />
            ))}
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

  const note = noteFor();

  return (
    <>
    <Stage>
    <div
      ref={rootRef}
      className="relative w-full h-full bg-[#070b12] text-white flex flex-col px-8 py-6 overflow-hidden select-none"
      style={{ fontFamily: settings.font === 'System' ? 'sans-serif' : `'${settings.font}', sans-serif` }}
    >
      <div className="flex items-center gap-4 mb-4 shrink-0 px-1 pt-1">
        <button
          data-nav
          onClick={() => {
            soundService.playBack();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-lg font-semibold bg-white/10 border border-white/15 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" /> Home
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[14rem_minmax(0,1fr)_22rem] gap-6">
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
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-lg font-semibold cursor-pointer transition ${
                  active ? 'bg-white text-slate-900' : 'bg-white/[0.06] text-white/80 border border-white/10'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
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
          <div className="text-sm text-white/50 text-center">
            {previewIsAmbient
              ? category === 'night'
                ? 'Ambient mode at night'
                : 'Ambient mode by day'
              : `Home screen · ${backgroundName(settings.background)}`}
          </div>
          {note && (
            <div className="mt-2 rounded-2xl bg-white/[0.05] border border-white/10 p-3.5 text-base text-white/60 leading-relaxed">
              {note}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-3 text-sm text-white/40 text-center">
        Up / Down move · Left / Right change a value · OK select · Back returns to the categories
      </div>
    </div>
    </Stage>

      {showAndroid && (
        <div className="fixed inset-0 z-40 bg-[#070b12] text-white overflow-hidden px-10 py-8">
          <AndroidSettingsView startWithInterceptor onBack={() => setShowAndroid(false)} />
        </div>
      )}

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
