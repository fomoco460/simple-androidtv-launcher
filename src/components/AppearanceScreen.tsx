import React, { useState, useEffect, useRef } from 'react';
import {
  LauncherSettings,
  BackgroundPreset,
  AppsDisplayPreset,
  FontPreset,
  HomeControlsPreset,
  AppItem,
} from '../types';
import { HomeLauncher } from './HomeLauncher';
import { AndroidSettingsView } from './AndroidSettingsView';
import { AppIcon } from './BrandIcons';
import {
  soundService,
  SOUND_THEMES,
  SOUND_VOLUMES,
  SoundTheme,
  SoundVolume,
} from '../services/sound';
import { CLEAN_FRAME_WALLPAPERS } from '../data/cleanFrameWallpapers';
import { WallpaperGalleryModal } from './WallpaperGalleryModal';
import { AppBackdropModal } from './AppBackdropModal';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Smartphone,
  MapPin,
  ArrowLeftRight,
  Pin,
  PinOff,
  Download,
  Sparkles,
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
  const [showLocalGalleryModal, setShowLocalGalleryModal] = useState<boolean>(false);
  const [showLocalBackdropModal, setShowLocalBackdropModal] = useState<boolean>(false);

  // Presets definition including all 15 CleanFrame wallpapers
  const backgroundOptions: { id: BackgroundPreset; label: string }[] = [
    // CleanFrame 15 Photographic Wallpapers
    ...CLEAN_FRAME_WALLPAPERS.map((cf) => ({
      id: cf.presetId as BackgroundPreset,
      label: `CleanFrame: ${cf.name}`,
    })),
    // Minimal Ambient Themes
    { id: 'desert-stars', label: 'Desert stars (Ambient)' },
    { id: 'nordic-aurora', label: 'Nordic aurora' },
    { id: 'misty-pines', label: 'Misty pines' },
    { id: 'cyber-dusk', label: 'Cyber dusk' },
    { id: 'deep-space', label: 'Deep space' },
    { id: 'sunset-dunes', label: 'Sunset dunes' },
    { id: 'custom', label: 'Custom Imported Wallpaper' },
  ];

  const appsOptions: { id: AppsDisplayPreset; label: string }[] = [
    { id: 'icons-and-text', label: 'Icons and text' },
    { id: 'icons-only', label: 'Icons only' },
    { id: 'text-only', label: 'Text only' },
  ];

  const fontOptions: { id: FontPreset; label: string }[] = [
    { id: 'Manrope', label: 'Manrope' },
    { id: 'Outfit', label: 'Outfit' },
    { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
    { id: 'Robotech GP', label: 'Robotech GP' },
    { id: 'System', label: 'System' },
  ];

  const homeControlsOptions: { id: HomeControlsPreset; label: string }[] = [
    { id: 'text', label: 'Text' },
    { id: 'icons', label: 'Icons' },
    { id: 'both', label: 'Icons and text' },
  ];

  // Helper to cycle through array
  const cycleSound = (which: 'theme' | 'volume') => {
    const list = which === 'theme' ? SOUND_THEMES : SOUND_VOLUMES;
    const current = which === 'theme' ? settings.soundTheme : settings.soundVolume;
    const idx = list.findIndex((o) => o.id === current);
    const next = list[(idx + 1) % list.length].id;
    const theme = which === 'theme' ? (next as SoundTheme) : settings.soundTheme;
    const volume = which === 'volume' ? (next as SoundVolume) : settings.soundVolume;
    onUpdateSettings(which === 'theme' ? { soundTheme: theme } : { soundVolume: volume });
    soundService.preview(theme, volume);
  };

  const cycleOption = (direction: 'next' | 'prev', rowIndex: number) => {
    soundService.playMove();
    if (rowIndex === 0) {
      const idx = backgroundOptions.findIndex((o) => o.id === settings.background);
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % backgroundOptions.length
          : (idx - 1 + backgroundOptions.length) % backgroundOptions.length;
      onUpdateSettings({ background: backgroundOptions[nextIdx].id });
    } else if (rowIndex === 1) {
      const idx = appsOptions.findIndex((o) => o.id === settings.apps);
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % appsOptions.length
          : (idx - 1 + appsOptions.length) % appsOptions.length;
      onUpdateSettings({ apps: appsOptions[nextIdx].id });
    } else if (rowIndex === 2) {
      const idx = fontOptions.findIndex((o) => o.id === settings.font);
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % fontOptions.length
          : (idx - 1 + fontOptions.length) % fontOptions.length;
      onUpdateSettings({ font: fontOptions[nextIdx].id });
    } else if (rowIndex === 3) {
      const idx = homeControlsOptions.findIndex((o) => o.id === settings.homeControls);
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % homeControlsOptions.length
          : (idx - 1 + homeControlsOptions.length) % homeControlsOptions.length;
      onUpdateSettings({ homeControls: homeControlsOptions[nextIdx].id });
    } else if (rowIndex === 4) {
      const current = settings.dynamicAppBackgrounds !== false;
      onUpdateSettings({ dynamicAppBackgrounds: !current });
    } else if (rowIndex === 6) {
      const current = settings.showWeather !== false;
      onUpdateSettings({ showWeather: !current });
    }
  };

  const [activeTab, setActiveTab] = useState<'appearance' | 'organize' | 'android'>('appearance');
  const [focusZone, setFocusZone] = useState<'header' | 'content'>('content');
  const [headerIndex, setHeaderIndex] = useState<number>(1); // 0: Home, 1: Appearance, 2: Organize, 3: Android
  const [activeRow, setActiveRow] = useState<number>(0);
  const [extraIndex, setExtraIndex] = useState<number>(0); // 0 sound, 1 volume, 2 ambient, 3 temp unit, 4 location
  const [organizeZone, setOrganizeZone] = useState<'dock' | 'unpinned'>('dock');
  const [organizeDockIndex, setOrganizeDockIndex] = useState<number>(0);
  const [organizeUnpinnedIndex, setOrganizeUnpinnedIndex] = useState<number>(0);

  const appearanceListRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const organizeDockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const organizeUnpinnedRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isTvOrNative =
    typeof window !== 'undefined' &&
    (!!(window as any).AndroidBridge?.isNative?.() ||
      /Android|AFT|GoogleTV|SmartTV|AppleTV|HbbTV|CrKey/i.test(navigator.userAgent));
  const maxAppearanceRow = isTvOrNative ? 7 : 8;
  const extrasRow = maxAppearanceRow + 1; // quick-settings strip under the preview

  const dockApps = apps.filter((a) => a.inDock);
  const nonDockApps = apps.filter((a) => !a.inDock);

  // Keep organizeZone valid when dockApps changes (e.g. if dock is emptied)
  useEffect(() => {
    if (activeTab === 'organize') {
      if (dockApps.length === 0 && nonDockApps.length > 0) {
        setOrganizeZone('unpinned');
      }
      if (organizeDockIndex >= dockApps.length && dockApps.length > 0) {
        setOrganizeDockIndex(dockApps.length - 1);
      }
      if (organizeUnpinnedIndex >= nonDockApps.length && nonDockApps.length > 0) {
        setOrganizeUnpinnedIndex(nonDockApps.length - 1);
      }
    }
  }, [activeTab, dockApps.length, nonDockApps.length, organizeDockIndex, organizeUnpinnedIndex]);

  // Smooth auto-scroll constrained purely to inner container, never shifting page/window
  useEffect(() => {
    if (activeTab === 'appearance' && focusZone === 'content') {
      const el = rowRefs.current[activeRow];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeRow, activeTab, focusZone]);

  // Smooth auto-scroll for organize dock tray apps
  useEffect(() => {
    if (activeTab === 'organize' && focusZone === 'content' && organizeZone === 'dock') {
      organizeDockRefs.current[organizeDockIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [organizeDockIndex, activeTab, focusZone, organizeZone]);

  // Smooth auto-scroll for organize unpinned apps
  useEffect(() => {
    if (activeTab === 'organize' && focusZone === 'content' && organizeZone === 'unpinned') {
      organizeUnpinnedRefs.current[organizeUnpinnedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [organizeUnpinnedIndex, activeTab, focusZone, organizeZone]);

  // Keyboard navigation for TV Remote D-pad
  useEffect(() => {
    if (isModalOpen || showLocalGalleryModal || showLocalBackdropModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isBack =
        e.key === 'Escape' ||
        e.key === 'Back' ||
        e.key === 'GoBack' ||
        e.key === 'Backspace' ||
        e.keyCode === 27 ||
        e.keyCode === 4 ||
        e.keyCode === 8;

      if (activeTab === 'android') {
        if (isBack) {
          e.preventDefault();
          soundService.playBack();
          setActiveTab('appearance');
          setFocusZone('content');
          setActiveRow(8);
          setHeaderIndex(1);
          return;
        }
        return;
      }
      const isUp =
        e.key === 'ArrowUp' || e.key === 'Up' || e.keyCode === 38 || e.keyCode === 19;
      const isDown =
        e.key === 'ArrowDown' || e.key === 'Down' || e.keyCode === 40 || e.keyCode === 20;
      const isLeft =
        e.key === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37 || e.keyCode === 21;
      const isRight =
        e.key === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39 || e.keyCode === 22;
      const isSelect =
        e.key === 'Enter' ||
        e.key === 'Select' ||
        e.key === 'Ok' ||
        e.key === ' ' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      if (isBack) {
        e.preventDefault();
        soundService.playBack();

        // 1. If currently inside Organize Tray:
        if (activeTab === 'organize') {
          if (focusZone === 'content') {
            if (organizeZone === 'unpinned' && dockApps.length > 0) {
              // Step back from Unpinned apps to Dock apps
              setOrganizeZone('dock');
              setOrganizeDockIndex(0);
              return;
            } else {
              // Step back from Dock apps to main Appearance screen (row 6: Organize Tray)
              setActiveTab('appearance');
              setFocusZone('content');
              setActiveRow(6);
              setHeaderIndex(1);
              return;
            }
          } else {
            // Header is focused in Organize: step back to Appearance tab
            setActiveTab('appearance');
            setHeaderIndex(1);
            setFocusZone('header');
            return;
          }
        }

        // 2. If currently inside Appearance Tab Rows:
        if (activeTab === 'appearance' && focusZone === 'content') {
          // Step back from rows up to the header navigation bar
          setFocusZone('header');
          setHeaderIndex(1);
          return;
        }

        // 3. If currently in Header (root of Settings):
        if (focusZone === 'header') {
          onBackToHome();
          return;
        }

        // Default fallback
        onBackToHome();
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        soundService.playSelect();
        onBackToHome();
        return;
      }

      // Zone 1: Focus is in Header (< Home, Appearance, Organize Tray, Android)
      if (focusZone === 'header') {
        if (isLeft) {
          e.preventDefault();
          if (headerIndex > 0) {
            soundService.playMove();
            setHeaderIndex((prev) => prev - 1);
          }
        } else if (isRight) {
          e.preventDefault();
          if (headerIndex < 3) {
            soundService.playMove();
            setHeaderIndex((prev) => prev + 1);
          }
        } else if (isDown) {
          e.preventDefault();
          soundService.playMove();
          setFocusZone('content');
          if (headerIndex === 0) {
            // Drop down into whatever tab is currently active
            if (activeTab === 'appearance') setActiveRow(0);
            else if (activeTab === 'organize') {
              if (dockApps.length > 0) {
                setOrganizeZone('dock');
                setOrganizeDockIndex(0);
              } else {
                setOrganizeZone('unpinned');
                setOrganizeUnpinnedIndex(0);
              }
            }
          } else if (headerIndex === 1) {
            setActiveTab('appearance');
            setActiveRow(0);
          } else if (headerIndex === 2) {
            setActiveTab('organize');
            if (dockApps.length > 0) {
              setOrganizeZone('dock');
              setOrganizeDockIndex(0);
            } else {
              setOrganizeZone('unpinned');
              setOrganizeUnpinnedIndex(0);
            }
          } else if (headerIndex === 3) {
            setActiveTab('android');
          }
        } else if (isSelect) {
          e.preventDefault();
          soundService.playSelect();
          if (headerIndex === 0) {
            onBackToHome();
          } else if (headerIndex === 1) {
            setActiveTab('appearance');
            setFocusZone('content');
            setActiveRow(0);
          } else if (headerIndex === 2) {
            setActiveTab('organize');
            setFocusZone('content');
            if (dockApps.length > 0) {
              setOrganizeZone('dock');
              setOrganizeDockIndex(0);
            } else {
              setOrganizeZone('unpinned');
              setOrganizeUnpinnedIndex(0);
            }
          } else if (headerIndex === 3) {
            setActiveTab('android');
          }
        }
        return;
      }

      // Zone 2: Focus is in Organize Tab Content
      if (activeTab === 'organize') {
        // Sub-zone: Dock Apps
        if (organizeZone === 'dock') {
          if (dockApps.length === 0) {
            // Dock empty, switch immediately to unpinned
            setOrganizeZone('unpinned');
            setOrganizeUnpinnedIndex(0);
            return;
          }

          if (isUp) {
            e.preventDefault();
            soundService.playMove();
            if (organizeDockIndex === 0) {
              // Move up to header tab bar
              setFocusZone('header');
              setHeaderIndex(2);
            } else {
              setOrganizeDockIndex((prev) => Math.max(0, prev - 1));
            }
          } else if (isDown) {
            e.preventDefault();
            soundService.playMove();
            if (organizeDockIndex >= dockApps.length - 1) {
              // Move down to unpinned apps if available
              if (nonDockApps.length > 0) {
                setOrganizeZone('unpinned');
                setOrganizeUnpinnedIndex(0);
              }
            } else {
              setOrganizeDockIndex((prev) => Math.min(dockApps.length - 1, prev + 1));
            }
          } else if (isLeft) {
            e.preventDefault();
            if (dockApps[organizeDockIndex] && organizeDockIndex > 0) {
              soundService.playMove();
              onMoveDockApp?.(dockApps[organizeDockIndex].id, 'left');
              setOrganizeDockIndex((prev) => prev - 1);
            }
          } else if (isRight) {
            e.preventDefault();
            if (dockApps[organizeDockIndex] && organizeDockIndex < dockApps.length - 1) {
              soundService.playMove();
              onMoveDockApp?.(dockApps[organizeDockIndex].id, 'right');
              setOrganizeDockIndex((prev) => prev + 1);
            }
          } else if (isSelect) {
            e.preventDefault();
            if (dockApps[organizeDockIndex]) {
              soundService.playSelect();
              onToggleDockPin?.(dockApps[organizeDockIndex].id);
              if (dockApps.length <= 1) {
                setOrganizeZone('unpinned');
                setOrganizeUnpinnedIndex(0);
              } else if (organizeDockIndex >= dockApps.length - 1) {
                setOrganizeDockIndex((prev) => Math.max(0, prev - 1));
              }
            }
          }
          return;
        }

        // Sub-zone: Unpinned Apps ("Add to Tray")
        if (organizeZone === 'unpinned') {
          if (nonDockApps.length === 0) {
            // No unpinned apps, switch back to dock
            if (dockApps.length > 0) {
              setOrganizeZone('dock');
              setOrganizeDockIndex(0);
            } else {
              setFocusZone('header');
              setHeaderIndex(2);
            }
            return;
          }

          if (isUp) {
            e.preventDefault();
            soundService.playMove();
            // If on the top row of the 2-column grid (indices 0 or 1)
            if (organizeUnpinnedIndex <= 1) {
              if (dockApps.length > 0) {
                setOrganizeZone('dock');
                setOrganizeDockIndex(dockApps.length - 1);
              } else {
                // Dock is empty: jump straight up to header!
                setFocusZone('header');
                setHeaderIndex(2);
              }
            } else {
              setOrganizeUnpinnedIndex((prev) => Math.max(0, prev - 2));
            }
          } else if (isDown) {
            e.preventDefault();
            soundService.playMove();
            if (organizeUnpinnedIndex + 2 < nonDockApps.length) {
              setOrganizeUnpinnedIndex((prev) => prev + 2);
            } else if (
              organizeUnpinnedIndex % 2 === 0 &&
              organizeUnpinnedIndex + 1 < nonDockApps.length
            ) {
              setOrganizeUnpinnedIndex((prev) => prev + 1);
            }
          } else if (isLeft) {
            e.preventDefault();
            if (organizeUnpinnedIndex % 2 === 1) {
              soundService.playMove();
              setOrganizeUnpinnedIndex((prev) => prev - 1);
            }
          } else if (isRight) {
            e.preventDefault();
            if (
              organizeUnpinnedIndex % 2 === 0 &&
              organizeUnpinnedIndex + 1 < nonDockApps.length
            ) {
              soundService.playMove();
              setOrganizeUnpinnedIndex((prev) => prev + 1);
            }
          } else if (isSelect) {
            e.preventDefault();
            if (nonDockApps[organizeUnpinnedIndex]) {
              soundService.playSelect();
              onToggleDockPin?.(nonDockApps[organizeUnpinnedIndex].id);
              if (organizeUnpinnedIndex >= nonDockApps.length - 1 && nonDockApps.length > 1) {
                setOrganizeUnpinnedIndex((prev) => Math.max(0, prev - 1));
              }
            }
          }
          return;
        }
      }

      // Zone 3: Focus is in Appearance Tab Rows
      if (isUp) {
        e.preventDefault();
        soundService.playMove();
        if (activeRow === 0) {
          setFocusZone('header');
          setHeaderIndex(1); // "Appearance" tab
        } else {
          setActiveRow((prev) => prev - 1);
        }
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();
        setActiveRow((prev) => Math.min(extrasRow, prev + 1));
      } else if (activeRow === extrasRow && (isRight || isLeft || isSelect)) {
        e.preventDefault();
        if (isRight) {
          soundService.playMove();
          setExtraIndex((prev) => Math.min(4, prev + 1));
        } else if (isLeft) {
          soundService.playMove();
          setExtraIndex((prev) => Math.max(0, prev - 1));
        } else {
          soundService.playSelect();
          if (extraIndex === 0) {
            cycleSound('theme');
          } else if (extraIndex === 1) {
            cycleSound('volume');
          } else if (extraIndex === 2) {
            const opts = [0, 2, 5, 10, 20];
            const cur = opts.indexOf(settings.ambientMinutes);
            onUpdateSettings({ ambientMinutes: opts[(cur + 1) % opts.length] });
          } else if (extraIndex === 3) {
            onUpdateSettings({ tempUnit: settings.tempUnit === 'C' ? 'F' : 'C' });
          } else {
            onOpenLocationModal?.();
          }
        }
      } else if (isRight) {
        e.preventDefault();
        if (activeRow === 4) {
          cycleOption('next', 4);
        } else if (activeRow === 5) {
          soundService.playSelect();
          setActiveTab('organize');
          setHeaderIndex(2);
          if (dockApps.length > 0) {
            setOrganizeZone('dock');
            setOrganizeDockIndex(0);
          } else {
            setOrganizeZone('unpinned');
            setOrganizeUnpinnedIndex(0);
          }
        } else if (activeRow === 6) {
          cycleOption('next', 6);
        } else if (activeRow === 7) {
          soundService.playSelect();
          setActiveTab('android');
          setHeaderIndex(3);
        } else if (activeRow === 8) {
          soundService.playSelect();
          onOpenApkModal?.();
        } else {
          cycleOption('next', activeRow);
        }
      } else if (isLeft) {
        e.preventDefault();
        if (activeRow === 4 || activeRow === 6) {
          cycleOption('prev', activeRow);
        } else if (activeRow < 4) {
          cycleOption('prev', activeRow);
        }
      } else if (isSelect) {
        e.preventDefault();
        soundService.playSelect();
        if (activeRow === 0) {
          if (onOpenWallpaperGallery) {
            onOpenWallpaperGallery();
          } else {
            setShowLocalGalleryModal(true);
          }
        } else if (activeRow === 4) {
          if (onOpenBackdropModal) {
            onOpenBackdropModal();
          } else {
            setShowLocalBackdropModal(true);
          }
        } else if (activeRow === 5) {
          setActiveTab('organize');
          setHeaderIndex(2);
          if (dockApps.length > 0) {
            setOrganizeZone('dock');
            setOrganizeDockIndex(0);
          } else {
            setOrganizeZone('unpinned');
            setOrganizeUnpinnedIndex(0);
          }
        } else if (activeRow === 6) {
          onOpenLocationModal?.();
        } else if (activeRow === 7) {
          setActiveTab('android');
          setHeaderIndex(3);
        } else if (activeRow === 8) {
          onOpenApkModal?.();
        } else {
          cycleOption('next', activeRow);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusZone,
    headerIndex,
    activeRow,
    activeTab,
    organizeZone,
    organizeDockIndex,
    organizeUnpinnedIndex,
    dockApps,
    nonDockApps,
    onMoveDockApp,
    onToggleDockPin,
    onBackToHome,
    onOpenLocationModal,
    onOpenApkModal,
    settings,
  ]);

  const rows = [
    {
      label: 'Background',
      value:
        backgroundOptions.find((o) => o.id === settings.background)?.label ||
        'Desert stars',
    },
    {
      label: 'Apps',
      value:
        appsOptions.find((o) => o.id === settings.apps)?.label || 'Icons and text',
    },
    {
      label: 'Font',
      value: settings.font,
    },
    {
      label: 'Home controls',
      value:
        homeControlsOptions.find((o) => o.id === settings.homeControls)?.label ||
        'Text',
    },
  ];

  return (
    <div
      className="relative w-full h-full h-screen max-h-screen bg-[#070b12] text-white flex flex-col justify-between px-6 pt-5 pb-3 md:px-10 md:pt-7 md:pb-4 overflow-hidden select-none"
      style={{
        fontFamily:
          settings.font === 'System'
            ? 'sans-serif'
            : `'${settings.font}', sans-serif`,
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, rgba(30, 60, 90, 0.45) 0%, transparent 60%)',
        }}
      />

      {/* Top Header Bar across full width (matches image_2b608b3c.png) */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to Home Button */}
          <button
            onClick={() => {
              soundService.playBack();
              onBackToHome();
            }}
            onMouseEnter={() => {
              setFocusZone('header');
              setHeaderIndex(0);
            }}
            className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold transition-all cursor-pointer rounded-xl px-3 py-1.5 ${
              focusZone === 'header' && headerIndex === 0
                ? 'bg-white text-slate-900 font-bold shadow-lg ring-2 ring-white scale-[1.02]'
                : 'text-white/80 hover:text-white bg-white/10 border border-white/15'
            }`}
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Home</span>
          </button>

          {/* Segmented Tab Bar (Full space, never cut off) */}
          <div className="flex items-center p-1 bg-white/10 border border-white/15 rounded-xl gap-1">
            <button
              onClick={() => {
                soundService.playSelect();
                setActiveTab('appearance');
                setFocusZone('content');
                setActiveRow(0);
              }}
              onMouseEnter={() => {
                setFocusZone('header');
                setHeaderIndex(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'appearance'
                  ? focusZone === 'header' && headerIndex === 1
                    ? 'bg-white text-slate-900 shadow-md ring-2 ring-sky-400 scale-[1.02] font-bold'
                    : 'bg-white text-slate-900 shadow-md font-bold'
                  : focusZone === 'header' && headerIndex === 1
                  ? 'bg-white/30 text-white ring-2 ring-white font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Appearance
            </button>
            <button
              onClick={() => {
                soundService.playSelect();
                setActiveTab('organize');
                setFocusZone('content');
                if (dockApps.length > 0) {
                  setOrganizeZone('dock');
                  setOrganizeDockIndex(0);
                } else {
                  setOrganizeZone('unpinned');
                  setOrganizeUnpinnedIndex(0);
                }
              }}
              onMouseEnter={() => {
                setFocusZone('header');
                setHeaderIndex(2);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'organize'
                  ? focusZone === 'header' && headerIndex === 2
                    ? 'bg-white text-slate-900 shadow-md ring-2 ring-sky-400 scale-[1.02] font-bold'
                    : 'bg-white text-slate-900 shadow-md font-bold'
                  : focusZone === 'header' && headerIndex === 2
                  ? 'bg-white/30 text-white ring-2 ring-white font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Organize Tray</span>
            </button>
            <button
              onClick={() => {
                soundService.playSelect();
                setActiveTab('android');
              }}
              onMouseEnter={() => {
                setFocusZone('header');
                setHeaderIndex(3);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'android'
                  ? focusZone === 'header' && headerIndex === 3
                    ? 'bg-white text-slate-900 shadow-md ring-2 ring-sky-400 scale-[1.02] font-bold'
                    : 'bg-white text-slate-900 shadow-md font-bold'
                  : focusZone === 'header' && headerIndex === 3
                  ? 'bg-white/30 text-white ring-2 ring-white font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Android</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings on Left, Live TV Preview on Right (Always 12-col 2-column TV Layout) */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto flex-1 grid grid-cols-12 gap-5 items-stretch min-h-0 overflow-hidden">
        {/* Left Column: Settings Options & Subpanels */}
        <div className="col-span-5 flex flex-col h-full justify-start space-y-1 w-full min-h-0 overflow-hidden">
          {/* Title Header */}
          <h1 className="text-base font-bold tracking-tight text-white mb-0.5 shrink-0">
            {activeTab === 'appearance'
              ? 'Appearance & Display'
              : activeTab === 'organize'
              ? 'Organize App Tray'
              : 'Android Settings'}
          </h1>

          {/* Conditional Content by Active Tab */}
          {activeTab === 'appearance' ? (
            <div
              ref={appearanceListRef}
              className="flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 scroll-py-3 scroll-smooth no-scrollbar"
            >
              {rows.map((row, idx) => {
                const isSelected = activeRow === idx && focusZone === 'content';

                return (
                  <div
                    key={row.label}
                    ref={(el) => {
                      rowRefs.current[idx] = el;
                    }}
                    onClick={() => {
                      setFocusZone('content');
                      setActiveRow(idx);
                      cycleOption('next', idx);
                    }}
                    onMouseEnter={() => {
                      setFocusZone('content');
                      setActiveRow(idx);
                    }}
                    className={`transition-all duration-150 cursor-pointer rounded-xl ${
                      isSelected
                        ? 'bg-white text-slate-900 px-3 py-0.5 md:py-1 shadow-lg ring-2 ring-white z-10'
                        : 'text-white/80 hover:text-white px-2.5 py-0.5 md:py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                    }`}
                  >
                    {/* Field Label */}
                    <div
                      className={`text-[9px] md:text-[10px] font-semibold tracking-wider uppercase ${
                        isSelected ? 'text-slate-600' : 'text-white/50'
                      }`}
                    >
                      {row.label}
                    </div>

                    {/* Value Row with Stepper Arrows if selected */}
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs md:text-sm font-bold tracking-tight ${
                            isSelected ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {row.value}
                        </span>
                        {idx === 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundService.playSelect();
                              if (onOpenWallpaperGallery) onOpenWallpaperGallery();
                              else setShowLocalGalleryModal(true);
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded-md font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                                : 'bg-white/10 hover:bg-white/20 text-sky-300'
                            }`}
                          >
                            Browse Gallery
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cycleOption('prev', idx);
                            }}
                            className="p-0.5 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 text-slate-800" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cycleOption('next', idx);
                            }}
                            className="p-0.5 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-800" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Row 5: Dynamic App Backdrops (Highlight Reactive & Per-App Generator/Import) */}
              <div
                ref={(el) => {
                  rowRefs.current[4] = el;
                }}
                onClick={() => {
                  setFocusZone('content');
                  setActiveRow(5);
                  soundService.playSelect();
                  if (onOpenBackdropModal) onOpenBackdropModal();
                  else setShowLocalBackdropModal(true);
                }}
                onMouseEnter={() => {
                  setFocusZone('content');
                  setActiveRow(5);
                }}
                className={`mt-0.5 py-1 px-2.5 md:px-3 rounded-xl cursor-pointer transition-all duration-150 border flex items-center justify-between ${
                  activeRow === 4 && focusZone === 'content'
                    ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles
                    className={`w-3.5 h-3.5 ${
                      activeRow === 4 && focusZone === 'content' ? 'text-amber-600' : 'text-amber-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs md:text-sm font-bold">Dynamic App Backdrops</div>
                    <div
                      className={`text-[9px] md:text-[10px] ${
                        activeRow === 4 && focusZone === 'content' ? 'text-slate-600 font-medium' : 'text-white/60'
                      }`}
                    >
                      {settings.dynamicAppBackgrounds !== false
                        ? 'Active · Changes wallpaper on app highlight'
                        : 'Disabled · Wallpaper stays static'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleOption('next', 4);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      settings.dynamicAppBackgrounds !== false
                        ? activeRow === 4 && focusZone === 'content'
                          ? 'bg-amber-500/20 text-amber-900 border border-amber-600/30'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : activeRow === 4 && focusZone === 'content'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {settings.dynamicAppBackgrounds !== false ? 'On' : 'Off'}
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      activeRow === 4 && focusZone === 'content' ? 'text-slate-800' : 'text-sky-300'
                    }`}
                  >
                    Manage
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      activeRow === 4 && focusZone === 'content' ? 'text-slate-900' : 'text-white/40'
                    }`}
                  />
                </div>
              </div>

              {/* Row 6: Organize App Tray Setting Row */}
              <div
                ref={(el) => {
                  rowRefs.current[5] = el;
                }}
                onClick={() => {
                  setFocusZone('content');
                  setActiveRow(6);
                  soundService.playSelect();
                  setActiveTab('organize');
                  setHeaderIndex(2);
                  if (dockApps.length > 0) {
                    setOrganizeZone('dock');
                    setOrganizeDockIndex(0);
                  } else {
                    setOrganizeZone('unpinned');
                    setOrganizeUnpinnedIndex(0);
                  }
                }}
                onMouseEnter={() => {
                  setFocusZone('content');
                  setActiveRow(6);
                }}
                className={`py-1 px-2.5 md:px-3 rounded-xl cursor-pointer transition-all duration-150 border flex items-center justify-between ${
                  activeRow === 5 && focusZone === 'content'
                    ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight
                    className={`w-3.5 h-3.5 ${
                      activeRow === 5 && focusZone === 'content' ? 'text-sky-600' : 'text-sky-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs md:text-sm font-bold">Organize App Tray</div>
                    <div
                      className={`text-[9px] md:text-[10px] ${
                        activeRow === 5 && focusZone === 'content' ? 'text-slate-600 font-medium' : 'text-white/60'
                      }`}
                    >
                      {dockApps.length} Apps in Tray · Move left / right / pin
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      activeRow === 5 && focusZone === 'content' ? 'text-slate-800' : 'text-sky-300'
                    }`}
                  >
                    Reorder
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      activeRow === 5 && focusZone === 'content' ? 'text-slate-900' : 'text-white/40'
                    }`}
                  />
                </div>
              </div>

              {/* Row 7: Weather Location Setting Row */}
              <div
                ref={(el) => {
                  rowRefs.current[6] = el;
                }}
                onClick={() => {
                  setFocusZone('content');
                  setActiveRow(7);
                  soundService.playSelect();
                  onOpenLocationModal?.();
                }}
                onMouseEnter={() => {
                  setFocusZone('content');
                  setActiveRow(7);
                }}
                className={`py-1 px-2.5 md:px-3 rounded-xl cursor-pointer transition-all duration-150 border flex items-center justify-between ${
                  activeRow === 6 && focusZone === 'content'
                    ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin
                    className={`w-3.5 h-3.5 ${
                      activeRow === 6 && focusZone === 'content' ? 'text-sky-600' : 'text-sky-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs md:text-sm font-bold">Weather Display</div>
                    <div
                      className={`text-[9px] md:text-[10px] ${
                        activeRow === 6 && focusZone === 'content' ? 'text-slate-600 font-medium' : 'text-white/60'
                      }`}
                    >
                      {settings.showWeather !== false ? 'Shown on Home' : 'Hidden from Home'} · {settings.weatherCity || 'Auto-Detect'} ({settings.tempUnit || 'F'})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleOption('next', 6);
                    }}
                    title="Toggle showing weather on Home screen"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      settings.showWeather !== false
                        ? activeRow === 6 && focusZone === 'content'
                          ? 'bg-sky-500/20 text-sky-950 border border-sky-600/30'
                          : 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                        : activeRow === 6 && focusZone === 'content'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {settings.showWeather !== false ? 'Home: On' : 'Home: Off'}
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      activeRow === 6 && focusZone === 'content' ? 'text-slate-800' : 'text-sky-300'
                    }`}
                  >
                    Configure
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      activeRow === 6 && focusZone === 'content' ? 'text-slate-900' : 'text-white/40'
                    }`}
                  />
                </div>
              </div>

              {/* Row 8: Direct Shortcut to Android TV Settings */}
              <div
                ref={(el) => {
                  rowRefs.current[7] = el;
                }}
                onClick={() => {
                  setFocusZone('content');
                  setActiveRow(8);
                  soundService.playSelect();
                  setActiveTab('android');
                  setHeaderIndex(3);
                }}
                onMouseEnter={() => {
                  setFocusZone('content');
                  setActiveRow(8);
                }}
                className={`py-1 px-2.5 md:px-3 rounded-xl cursor-pointer transition-all duration-150 border flex items-center justify-between ${
                  activeRow === 7 && focusZone === 'content'
                    ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone
                    className={`w-3.5 h-3.5 ${
                      activeRow === 7 && focusZone === 'content' ? 'text-sky-600' : 'text-sky-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs md:text-sm font-bold">Android TV System Settings</div>
                    <div
                      className={`text-[9px] md:text-[10px] ${
                        activeRow === 7 && focusZone === 'content' ? 'text-slate-500' : 'text-white/40'
                      }`}
                    >
                      Wi-Fi, Bluetooth, Display, Sound & About
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 ${
                    activeRow === 7 && focusZone === 'content' ? 'text-slate-900' : 'text-white/40'
                  }`}
                />
              </div>

              {/* Row 9: Install on Chromecast (Download APK) */}
              {!isTvOrNative && (
                <div
                  ref={(el) => {
                    rowRefs.current[8] = el;
                  }}
                  onClick={() => {
                    setFocusZone('content');
                    setActiveRow(9);
                    soundService.playSelect();
                    onOpenApkModal?.();
                  }}
                  onMouseEnter={() => {
                    setFocusZone('content');
                    setActiveRow(9);
                  }}
                  className={`py-1.5 px-3 rounded-xl cursor-pointer transition-all duration-200 border flex items-center justify-between ${
                    activeRow === 8 && focusZone === 'content'
                      ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Download
                      className={`w-4 h-4 ${
                        activeRow === 8 && focusZone === 'content' ? 'text-sky-600' : 'text-sky-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs md:text-sm font-bold">Install on TV (Download APK)</div>
                      <div
                        className={`text-[10px] md:text-[11px] ${
                          activeRow === 8 && focusZone === 'content' ? 'text-slate-600 font-medium' : 'text-white/60'
                        }`}
                      >
                        Chromecast &amp; Android TV package · In-place upgrade APK
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold ${
                        activeRow === 8 && focusZone === 'content' ? 'text-slate-800' : 'text-sky-300'
                      }`}
                    >
                      Get APK
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        activeRow === 8 && focusZone === 'content' ? 'text-slate-900' : 'text-white/40'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'organize' ? (
            /* Dedicated App Tray Reorganizer in Settings */
            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs text-white/60">
                  Arrange items in your floating dock. Changes reflect live on TV preview.
                </span>
              </div>

              {/* Dock Apps Reorder List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                  <span>Current Tray Order ({dockApps.length} Apps)</span>
                  {dockApps.length === 0 && (
                    <span className="text-amber-400 font-semibold normal-case text-xs">Dock is empty</span>
                  )}
                </div>

                {dockApps.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-dashed border-white/15 text-center text-xs text-white/60 space-y-1">
                    <div className="font-semibold text-white/80">No apps pinned to tray</div>
                    <div className="text-[11px] text-white/40">
                      Use remote D-pad to select any app below to pin it to your TV dock.
                    </div>
                  </div>
                ) : (
                  dockApps.map((app, index) => {
                    const isAppFocused =
                      focusZone === 'content' && organizeZone === 'dock' && organizeDockIndex === index;
                    return (
                      <div
                        key={app.id}
                        ref={(el) => {
                          organizeDockRefs.current[index] = el;
                        }}
                        onClick={() => {
                          setFocusZone('content');
                          setOrganizeZone('dock');
                          setOrganizeDockIndex(index);
                        }}
                        onMouseEnter={() => {
                          setFocusZone('content');
                          setOrganizeZone('dock');
                          setOrganizeDockIndex(index);
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                          isAppFocused
                            ? 'bg-white text-slate-900 border-white shadow-2xl ring-2 ring-sky-400 z-10'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 text-center font-mono font-bold text-xs ${
                              isAppFocused ? 'text-sky-600' : 'text-sky-400'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div className="w-7 h-7 flex items-center justify-center">
                            <AppIcon app={app} styleMode={settings.iconStyle} className="w-6 h-6 rounded-md" />
                          </div>
                          <span className="text-sm font-semibold">{app.name}</span>
                        </div>

                        {/* Move Left / Right buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMoveDockApp && index > 0) {
                                soundService.playMove();
                                onMoveDockApp(app.id, 'left');
                                setOrganizeDockIndex(index - 1);
                              }
                            }}
                            disabled={index === 0}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              isAppFocused
                                ? 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-20'
                                : 'bg-white/10 text-white hover:bg-white/20 disabled:opacity-20'
                            }`}
                            title="Move app left in dock (D-pad Left)"
                          >
                            ◄ Left
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMoveDockApp && index < dockApps.length - 1) {
                                soundService.playMove();
                                onMoveDockApp(app.id, 'right');
                                setOrganizeDockIndex(index + 1);
                              }
                            }}
                            disabled={index === dockApps.length - 1}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              isAppFocused
                                ? 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-20'
                                : 'bg-white/10 text-white hover:bg-white/20 disabled:opacity-20'
                            }`}
                            title="Move app right in dock (D-pad Right)"
                          >
                            Right ►
                          </button>
                          {onToggleDockPin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundService.playSelect();
                                onToggleDockPin(app.id);
                                if (dockApps.length <= 1) {
                                  setOrganizeZone('unpinned');
                                  setOrganizeUnpinnedIndex(0);
                                } else if (index >= dockApps.length - 1) {
                                  setOrganizeDockIndex(Math.max(0, index - 1));
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isAppFocused
                                  ? 'hover:bg-red-500/20 text-slate-600 hover:text-red-600'
                                  : 'hover:bg-red-500/20 text-white/40 hover:text-red-300'
                              }`}
                              title="Remove from tray (Press OK/Select)"
                            >
                              <PinOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Unpinned Apps (to add to tray) */}
              {nonDockApps.length > 0 && onToggleDockPin && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Add to Tray ({nonDockApps.length} Available)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nonDockApps.map((app, uIdx) => {
                      const isUnpinnedFocused =
                        focusZone === 'content' &&
                        organizeZone === 'unpinned' &&
                        organizeUnpinnedIndex === uIdx;
                      return (
                        <button
                          key={app.id}
                          ref={(el) => {
                            organizeUnpinnedRefs.current[uIdx] = el;
                          }}
                          onClick={() => {
                            setFocusZone('content');
                            setOrganizeZone('unpinned');
                            setOrganizeUnpinnedIndex(uIdx);
                            soundService.playSelect();
                            onToggleDockPin(app.id);
                            if (organizeUnpinnedIndex >= nonDockApps.length - 1 && nonDockApps.length > 1) {
                              setOrganizeUnpinnedIndex(Math.max(0, uIdx - 1));
                            }
                          }}
                          onMouseEnter={() => {
                            setFocusZone('content');
                            setOrganizeZone('unpinned');
                            setOrganizeUnpinnedIndex(uIdx);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all text-left ${
                            isUnpinnedFocused
                              ? 'bg-white text-slate-900 border-white shadow-2xl ring-2 ring-white/95 z-20 font-bold'
                              : 'bg-white/5 hover:bg-white/15 border-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <AppIcon app={app} styleMode={settings.iconStyle} className="w-4 h-4 shrink-0 rounded-xs" />
                            <span className="truncate">{app.name}</span>
                          </div>
                          <Pin
                            className={`w-3.5 h-3.5 shrink-0 ml-1 ${
                              isUnpinnedFocused ? 'text-sky-700' : 'text-sky-400'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AndroidSettingsView
              onBack={() => {
                setActiveTab('appearance');
                setFocusZone('content');
                setActiveRow(8); // Return to Row 8: Android TV System Settings
                setHeaderIndex(1);
              }}
            />
          )}
        </div>

        {/* Right Column: Live TV Miniature Preview (Always 7 cols on TV) */}
        <div className="col-span-7 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
            {/* Embedded Live Preview */}
            <HomeLauncher
              settings={settings}
              apps={apps}
              onOpenView={() => {}}
              onLaunchApp={onLaunchApp}
              isMiniPreview={true}
            />

            {/* Overlay hint to expand to fullscreen launcher */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
              <button
                onClick={() => {
                  soundService.playSelect();
                  onBackToHome();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all font-medium text-sm shadow-lg cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Return to Fullscreen TV Mode</span>
              </button>
            </div>
          </div>

          {/* Preset Attribution Below Preview Box */}
          <div className="mt-3 text-xs text-white/50 tracking-wide text-center">
            {(() => {
              if (settings.background?.startsWith('cf-')) {
                const cf = CLEAN_FRAME_WALLPAPERS.find((w) => w.presetId === settings.background);
                if (cf) {
                  return (
                    <span>
                      CleanFrame: <strong className="text-white/80 font-semibold">{cf.name}</strong> · {cf.description}
                    </span>
                  );
                }
              }
              if (settings.background === 'desert-stars') {
                return 'Desert stars · Deep starry horizon ambient theme';
              }
              if (settings.background === 'nordic-aurora') {
                return 'Nordic aurora · Soft celestial glow ambient theme';
              }
              return `${rows[0].value} theme`;
            })()}
          </div>

          {/* Quick TV settings: Sound, Weather */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span>Sound:</span>
              <button
                onClick={() => cycleSound('theme')}
                className={`px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white ${activeRow === extrasRow && extraIndex === 0 ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
              >
                {SOUND_THEMES.find((o) => o.id === settings.soundTheme)?.label}
              </button>
              {settings.soundTheme !== 'off' && (
                <button
                  onClick={() => cycleSound('volume')}
                  className={`px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white ${activeRow === extrasRow && extraIndex === 1 ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                >
                  {SOUND_VOLUMES.find((o) => o.id === settings.soundVolume)?.label}
                </button>
              )}
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-2">
              <span>Ambient:</span>
              <button
                onClick={() => {
                  const opts = [0, 2, 5, 10, 20];
                  const cur = opts.indexOf(settings.ambientMinutes);
                  onUpdateSettings({ ambientMinutes: opts[(cur + 1) % opts.length] });
                }}
                className={`px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white ${activeRow === extrasRow && extraIndex === 2 ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                title="Idle time before the photo clock screen starts"
              >
                {settings.ambientMinutes > 0 ? `${settings.ambientMinutes} min` : 'Off'}
              </button>
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-2">
              <span>Weather:</span>
              <button
                onClick={() =>
                  onUpdateSettings({ tempUnit: settings.tempUnit === 'C' ? 'F' : 'C' })
                }
                className={`px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono ${activeRow === extrasRow && extraIndex === 3 ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                title="Toggle between Fahrenheit and Celsius"
              >
                °{settings.tempUnit || 'F'}
              </button>
              <button
                onClick={() => {
                  soundService.playSelect();
                  onOpenLocationModal?.();
                }}
                className={`px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors ${activeRow === extrasRow && extraIndex === 4 ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                title="Change weather location"
              >
                <MapPin className="w-3 h-3 text-sky-300" />
                <span className="truncate max-w-[120px]">
                  {settings.weatherCity || 'Set Location'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CleanFrame & Ambient Wallpaper Gallery Modal */}
      {showLocalGalleryModal && (
        <WallpaperGalleryModal
          currentPreset={settings.background}
          customUrl={settings.customBgUrl}
          onSelectWallpaper={(presetId: BackgroundPreset, customUrl?: string) => {
            onUpdateSettings({
              background: presetId,
              customBgUrl: customUrl || settings.customBgUrl,
            });
            setShowLocalGalleryModal(false);
          }}
          onClose={() => setShowLocalGalleryModal(false)}
        />
      )}

      {/* Dynamic App Backdrops Management Modal */}
      {showLocalBackdropModal && (
        <AppBackdropModal
          apps={apps}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onClose={() => setShowLocalBackdropModal(false)}
        />
      )}
    </div>
  );
};
