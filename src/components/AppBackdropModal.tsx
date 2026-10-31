import React, { useState, useEffect, useRef } from 'react';
import { AppItem, LauncherSettings } from '../types';
import { AppIcon } from './BrandIcons';
import { soundService } from '../services/sound';
import { CLEAN_FRAME_WALLPAPERS, CleanFrameWallpaper } from '../data/cleanFrameWallpapers';
import {
  generateProceduralBackdrop,
  getAppBackdrop,
  BackdropGeneratorStyle,
  BRAND_BACKDROP_PRESETS,
  BrandBackdropPreset,
} from '../services/backdropGenerator';
import {
  Sparkles,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Check,
  X,
  Download,
  Film,
  Tv,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface AppBackdropModalProps {
  apps: AppItem[];
  settings: LauncherSettings;
  onUpdateSettings: (newSettings: Partial<LauncherSettings>) => void;
  onClose: () => void;
  initialAppId?: string;
}

type FocusZone = 'apps' | 'header' | 'reset' | 'tabs' | 'content';
type TabMode = 'brand-presets' | 'download' | 'generator' | 'upload' | 'cleanframe';

const TABS: { id: TabMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'brand-presets', label: 'Presets', icon: Tv },
  { id: 'download', label: 'Web URL & Presets', icon: Download },
  { id: 'generator', label: 'Auto-Generate', icon: Sparkles },
  { id: 'upload', label: 'TV Import Guide', icon: Upload },
  { id: 'cleanframe', label: 'CleanFrame', icon: ImageIcon },
];

export const AppBackdropModal: React.FC<AppBackdropModalProps> = ({
  apps,
  settings,
  onUpdateSettings,
  onClose,
  initialAppId,
}) => {
  // Navigation focus state
  const [focusZone, setFocusZone] = useState<FocusZone>('apps');
  const [selectedAppIndex, setSelectedAppIndex] = useState<number>(() => {
    if (initialAppId) {
      const idx = apps.findIndex((a) => a.id === initialAppId);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const [headerFocusIndex, setHeaderFocusIndex] = useState<number>(0); // 0: Enable toggle, 1: Close X
  const [activeTab, setActiveTab] = useState<TabMode>('brand-presets');
  const [tabFocusIndex, setTabFocusIndex] = useState<number>(0);
  const [contentFocusIndex, setContentFocusIndex] = useState<number>(0);

  const [generatorStyle, setGeneratorStyle] = useState<BackdropGeneratorStyle>('hero');
  const [seedVariation, setSeedVariation] = useState<number>(0);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const appListContainerRef = useRef<HTMLDivElement | null>(null);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const appListRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const contentRefs = useRef<(HTMLElement | null)[]>([]);

  const selectedApp = apps[selectedAppIndex] || apps[0];
  const appBackdrops = settings.appBackdrops || {};
  const currentBackdropUrl = selectedApp
    ? getAppBackdrop(selectedApp, appBackdrops)
    : '';

  const hasCustomBackdrop = selectedApp ? !!appBackdrops[selectedApp.id] : false;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  };

  const isTv =
    typeof window !== 'undefined' &&
    (!!(window as unknown as { AndroidBridge?: { isNative?: () => boolean } }).AndroidBridge?.isNative?.() ||
      /Android|CrKey|AFT|SMART-TV|Tizen/i.test(navigator.userAgent));

  // Determine best brand preset for currently highlighted app
  const matchingPreset: BrandBackdropPreset =
    BRAND_BACKDROP_PRESETS.find((p) => {
      if (!selectedApp) return false;
      const sName = (selectedApp.name || '').toLowerCase();
      const sId = (selectedApp.id || '').toLowerCase();
      const sPkg = (selectedApp.intentUrl || '').toLowerCase();
      const key = p.appKey.toLowerCase();
      return sName.includes(key) || sId.includes(key) || sPkg.includes(key);
    }) ||
    (selectedApp?.name?.toLowerCase().includes('tivi')
      ? BRAND_BACKDROP_PRESETS[0]
      : BRAND_BACKDROP_PRESETS[0]);

  // Quick 1-click apply presets (bundled scenery wallpapers)
  const downloadSuggestions = [
    { title: 'Misty Pines', url: '/wallpapers/cleanframe/misty.jpg', app: 'Scenery' },
    { title: 'Alpine Lake', url: '/wallpapers/cleanframe/alpine.jpg', app: 'Scenery' },
    { title: 'Forest Light', url: '/wallpapers/cleanframe/forest.jpg', app: 'Scenery' },
    { title: 'Night Sky', url: '/wallpapers/cleanframe/night.jpg', app: 'Scenery' },
    { title: 'Golden Hour', url: '/wallpapers/cleanframe/golden.jpg', app: 'Scenery' },
    { title: 'Summit', url: '/wallpapers/cleanframe/summit.jpg', app: 'Scenery' },
  ];

  // Generated backdrop for a preset, rendered with the selected app's name
  const presetUrlFor = (preset: BrandBackdropPreset): string =>
    selectedApp
      ? generateProceduralBackdrop({ ...selectedApp, accentColor: preset.accent }, preset.style, 0)
      : '';

  // Set predefined Brand Preset
  const handleSelectBrandPreset = (preset: BrandBackdropPreset) => {
    if (!selectedApp) return;
    soundService.playSelect();
    const updated = {
      ...appBackdrops,
      [selectedApp.id]: presetUrlFor(preset),
    };
    onUpdateSettings({ appBackdrops: updated });
    showToast(`Set "${preset.name}" backdrop for ${selectedApp.name}`);
  };

  // Auto-generate a new brand title card for selected app
  const handleAutoGenerate = (style: BackdropGeneratorStyle, nextSeed: number) => {
    if (!selectedApp) return;
    soundService.playSelect();
    const generated = generateProceduralBackdrop(selectedApp, style, nextSeed);
    const updated = {
      ...appBackdrops,
      [selectedApp.id]: generated,
    };
    onUpdateSettings({ appBackdrops: updated });
    showToast(`Generated ${style.toUpperCase()} brand card for ${selectedApp.name}`);
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedApp) return;

    soundService.playSelect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = {
          ...appBackdrops,
          [selectedApp.id]: dataUrl,
        };
        onUpdateSettings({ appBackdrops: updated });
        showToast(`Uploaded custom backdrop for ${selectedApp.name}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Assign CleanFrame wallpaper to app
  const handleSelectCleanFrame = (wp: CleanFrameWallpaper) => {
    if (!selectedApp) return;
    soundService.playSelect();
    const updated = {
      ...appBackdrops,
      [selectedApp.id]: wp.src,
    };
    onUpdateSettings({ appBackdrops: updated });
    showToast(`Set "${wp.name}" scenery for ${selectedApp.name}`);
  };

  // Download & apply custom URL
  const handleDownloadAndApplyUrl = (targetUrl?: string) => {
    const url = (targetUrl || customUrlInput).trim();
    if (!selectedApp || !url) return;

    setIsDownloading(true);
    soundService.playSelect();

    const img = new Image();
    img.onload = () => {
      setIsDownloading(false);
      const updated = {
        ...appBackdrops,
        [selectedApp.id]: url,
      };
      onUpdateSettings({ appBackdrops: updated });
      showToast(`Downloaded & saved backdrop for ${selectedApp.name}`);
      setCustomUrlInput('');
    };
    img.onerror = () => {
      setIsDownloading(false);
      const updated = {
        ...appBackdrops,
        [selectedApp.id]: url,
      };
      onUpdateSettings({ appBackdrops: updated });
      showToast(`Saved backdrop URL for ${selectedApp.name}`);
      setCustomUrlInput('');
    };
    img.src = url;
  };

  // Reset to default brand backdrop
  const handleReset = () => {
    if (!selectedApp) return;
    soundService.playBack();
    const updated = { ...appBackdrops };
    delete updated[selectedApp.id];
    onUpdateSettings({ appBackdrops: updated });
    showToast(`Reset ${selectedApp.name} to default brand backdrop`);
  };

  // Auto-scroll selected app within container without shifting page
  useEffect(() => {
    if (focusZone === 'apps') {
      const el = appListRefs.current[selectedAppIndex];
      const container = appListContainerRef.current;
      if (el && container) {
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const cTop = container.scrollTop;
        const cBottom = cTop + container.clientHeight;
        if (elTop < cTop) {
          container.scrollTo({ top: elTop, behavior: 'smooth' });
        } else if (elBottom > cBottom) {
          container.scrollTo({ top: elBottom - container.clientHeight, behavior: 'smooth' });
        }
      }
    }
  }, [selectedAppIndex, focusZone]);

  // Auto-scroll focused content item within container without shifting page
  useEffect(() => {
    if (focusZone === 'content') {
      const el = contentRefs.current[contentFocusIndex];
      const container = contentContainerRef.current;
      if (el && container) {
        const elTop = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const cTop = container.scrollTop;
        const cBottom = cTop + container.clientHeight;
        if (elTop < cTop) {
          container.scrollTo({ top: elTop, behavior: 'smooth' });
        } else if (elBottom > cBottom) {
          container.scrollTo({ top: elBottom - container.clientHeight, behavior: 'smooth' });
        }
      }
    }
  }, [contentFocusIndex, focusZone]);

  // KEYBOARD & TV REMOTE D-PAD NAVIGATION ENGINE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if actively typing in URL input unless Enter or Escape
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape' || e.keyCode === 27 || e.key === 'Back' || e.keyCode === 4) {
          (document.activeElement as HTMLElement).blur();
          e.preventDefault();
          setFocusZone('content');
          setContentFocusIndex(0);
          return;
        }
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          handleDownloadAndApplyUrl();
          (document.activeElement as HTMLElement).blur();
          return;
        }
        return;
      }

      const isBack =
        e.key === 'Escape' ||
        e.key === 'Back' ||
        e.key === 'GoBack' ||
        e.keyCode === 27 ||
        e.keyCode === 4;

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

      // Handle BACK / ESCAPE
      if (isBack) {
        e.preventDefault();
        soundService.playBack();
        if (focusZone === 'content') {
          setFocusZone('tabs');
        } else if (focusZone === 'tabs' || focusZone === 'reset' || focusZone === 'header') {
          setFocusZone('apps');
        } else {
          onClose();
        }
        return;
      }

      // ==========================================
      // ZONE 1: APPS LIST (Left Column)
      // ==========================================
      if (focusZone === 'apps') {
        if (isUp) {
          e.preventDefault();
          if (selectedAppIndex > 0) {
            soundService.playMove();
            setSelectedAppIndex((prev) => prev - 1);
          } else {
            // Jump to Header Toggle
            soundService.playMove();
            setFocusZone('header');
            setHeaderFocusIndex(0);
          }
        } else if (isDown) {
          e.preventDefault();
          if (selectedAppIndex < apps.length - 1) {
            soundService.playMove();
            setSelectedAppIndex((prev) => prev + 1);
          }
        } else if (isRight || isSelect) {
          // Move from Apps list to Right Menu (Tabs)
          e.preventDefault();
          soundService.playSelect();
          setFocusZone('tabs');
        }
        return;
      }

      // ==========================================
      // ZONE 2: HEADER (Top Row)
      // ==========================================
      if (focusZone === 'header') {
        if (isLeft) {
          e.preventDefault();
          soundService.playMove();
          setHeaderFocusIndex(0);
        } else if (isRight) {
          e.preventDefault();
          soundService.playMove();
          setHeaderFocusIndex(1);
        } else if (isDown) {
          e.preventDefault();
          soundService.playMove();
          if (headerFocusIndex === 0) {
            setFocusZone('apps');
          } else {
            setFocusZone('tabs');
          }
        } else if (isSelect) {
          e.preventDefault();
          soundService.playSelect();
          if (headerFocusIndex === 0) {
            onUpdateSettings({
              dynamicAppBackgrounds: !(settings.dynamicAppBackgrounds !== false),
            });
          } else {
            onClose();
          }
        }
        return;
      }

      // ==========================================
      // ZONE 3: RESET BUTTON
      // ==========================================
      if (focusZone === 'reset') {
        if (isLeft) {
          e.preventDefault();
          soundService.playMove();
          setFocusZone('apps');
        } else if (isDown) {
          e.preventDefault();
          soundService.playMove();
          setFocusZone('tabs');
        } else if (isUp) {
          e.preventDefault();
          soundService.playMove();
          setFocusZone('header');
          setHeaderFocusIndex(1);
        } else if (isSelect) {
          e.preventDefault();
          handleReset();
        }
        return;
      }

      // ==========================================
      // ZONE 4: TABS STRIP (Right Menu Header)
      // ==========================================
      if (focusZone === 'tabs') {
        if (isLeft) {
          e.preventDefault();
          if (tabFocusIndex > 0) {
            soundService.playMove();
            const nextIdx = tabFocusIndex - 1;
            setTabFocusIndex(nextIdx);
            setActiveTab(TABS[nextIdx].id);
            setContentFocusIndex(0);
          } else {
            // Move back to Apps list
            soundService.playMove();
            setFocusZone('apps');
          }
        } else if (isRight) {
          e.preventDefault();
          if (tabFocusIndex < TABS.length - 1) {
            soundService.playMove();
            const nextIdx = tabFocusIndex + 1;
            setTabFocusIndex(nextIdx);
            setActiveTab(TABS[nextIdx].id);
            setContentFocusIndex(0);
          }
        } else if (isDown || isSelect) {
          e.preventDefault();
          soundService.playSelect();
          setFocusZone('content');
          setContentFocusIndex(0);
        } else if (isUp) {
          e.preventDefault();
          soundService.playMove();
          if (hasCustomBackdrop) {
            setFocusZone('reset');
          } else {
            setFocusZone('header');
            setHeaderFocusIndex(1);
          }
        }
        return;
      }

      // ==========================================
      // ZONE 5: CONTENT (Active Tab Content Items)
      // ==========================================
      if (focusZone === 'content') {
        // Tab 1: Brand Presets (3 Columns Grid)
        if (activeTab === 'brand-presets') {
          const count = BRAND_BACKDROP_PRESETS.length;
          const cols = 3;

          if (isRight) {
            e.preventDefault();
            if (contentFocusIndex < count - 1) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 1);
            }
          } else if (isLeft) {
            e.preventDefault();
            if (contentFocusIndex % cols === 0) {
              // Move back to apps list
              soundService.playMove();
              setFocusZone('apps');
            } else {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 1);
            }
          } else if (isDown) {
            e.preventDefault();
            if (contentFocusIndex + cols < count) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + cols);
            }
          } else if (isUp) {
            e.preventDefault();
            if (contentFocusIndex >= cols) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - cols);
            } else {
              soundService.playMove();
              setFocusZone('tabs');
            }
          } else if (isSelect) {
            e.preventDefault();
            const preset = BRAND_BACKDROP_PRESETS[contentFocusIndex];
            if (preset) handleSelectBrandPreset(preset);
          }
          return;
        }

        // Tab 2: Download / URL
        if (activeTab === 'download') {
          // Index 0: URL Input box, Index 1: Download & Apply button, Index 2+: Suggestions
          const totalItems = 2 + downloadSuggestions.length;

          if (isUp) {
            e.preventDefault();
            if (contentFocusIndex <= 1) {
              soundService.playMove();
              setFocusZone('tabs');
            } else if (contentFocusIndex === 2 || contentFocusIndex === 3) {
              soundService.playMove();
              setContentFocusIndex(0);
            } else {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 2);
            }
          } else if (isDown) {
            e.preventDefault();
            if (contentFocusIndex === 0 || contentFocusIndex === 1) {
              soundService.playMove();
              setContentFocusIndex(2);
            } else if (contentFocusIndex + 2 < totalItems) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 2);
            }
          } else if (isLeft) {
            e.preventDefault();
            if (contentFocusIndex === 1) {
              soundService.playMove();
              setContentFocusIndex(0);
            } else if (contentFocusIndex % 2 === 1 && contentFocusIndex >= 2) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 1);
            } else {
              soundService.playMove();
              setFocusZone('apps');
            }
          } else if (isRight) {
            e.preventDefault();
            if (contentFocusIndex === 0) {
              soundService.playMove();
              setContentFocusIndex(1);
            } else if (contentFocusIndex % 2 === 0 && contentFocusIndex >= 2 && contentFocusIndex + 1 < totalItems) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 1);
            }
          } else if (isSelect) {
            e.preventDefault();
            if (contentFocusIndex === 0) {
              urlInputRef.current?.focus();
            } else if (contentFocusIndex === 1) {
              handleDownloadAndApplyUrl();
            } else {
              const sugg = downloadSuggestions[contentFocusIndex - 2];
              if (sugg) handleDownloadAndApplyUrl(sugg.url);
            }
          }
          return;
        }

        // Tab 3: Auto-Generator
        if (activeTab === 'generator') {
          // Index 0: Regenerate Variation button, Index 1-4: 4 style cards (2 cols)
          if (isUp) {
            e.preventDefault();
            if (contentFocusIndex === 0) {
              soundService.playMove();
              setFocusZone('tabs');
            } else if (contentFocusIndex <= 2) {
              soundService.playMove();
              setContentFocusIndex(0);
            } else {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 2);
            }
          } else if (isDown) {
            e.preventDefault();
            if (contentFocusIndex === 0) {
              soundService.playMove();
              setContentFocusIndex(1);
            } else if (contentFocusIndex <= 2) {
              soundService.playMove();
              setContentFocusIndex((prev) => Math.min(4, prev + 2));
            }
          } else if (isLeft) {
            e.preventDefault();
            if (contentFocusIndex === 2 || contentFocusIndex === 4) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 1);
            } else {
              soundService.playMove();
              setFocusZone('apps');
            }
          } else if (isRight) {
            e.preventDefault();
            if (contentFocusIndex === 1 || contentFocusIndex === 3) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 1);
            }
          } else if (isSelect) {
            e.preventDefault();
            if (contentFocusIndex === 0) {
              const nextSeed = seedVariation + 1;
              setSeedVariation(nextSeed);
              handleAutoGenerate(generatorStyle, nextSeed);
            } else {
              const styles: BackdropGeneratorStyle[] = ['hero', 'static', 'oled', 'cinematic'];
              const chosen = styles[contentFocusIndex - 1];
              setGeneratorStyle(chosen);
              handleAutoGenerate(chosen, seedVariation);
            }
          }
          return;
        }

        // Tab 4: TV Import Guide & Brand Quick-Actions
        if (activeTab === 'upload') {
          if (isUp) {
            e.preventDefault();
            if (contentFocusIndex > 0) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 1);
            } else {
              soundService.playMove();
              setFocusZone('tabs');
            }
          } else if (isDown) {
            e.preventDefault();
            if (contentFocusIndex < 2) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 1);
            }
          } else if (isLeft) {
            e.preventDefault();
            soundService.playMove();
            setFocusZone('apps');
          } else if (isSelect) {
            e.preventDefault();
            soundService.playSelect();
            if (contentFocusIndex === 0) {
              handleSelectBrandPreset(matchingPreset);
            } else if (contentFocusIndex === 1) {
              setActiveTab('brand-presets');
              setContentFocusIndex(0);
            } else if (contentFocusIndex === 2) {
              setActiveTab('download');
              setContentFocusIndex(2); // Focus first 1-click suggestion
            }
          }
          return;
        }

        // Tab 5: CleanFrame Gallery (5 Columns Grid)
        if (activeTab === 'cleanframe') {
          const count = CLEAN_FRAME_WALLPAPERS.length;
          const cols = 5;

          if (isRight) {
            e.preventDefault();
            if (contentFocusIndex < count - 1) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + 1);
            }
          } else if (isLeft) {
            e.preventDefault();
            if (contentFocusIndex % cols === 0) {
              soundService.playMove();
              setFocusZone('apps');
            } else {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - 1);
            }
          } else if (isDown) {
            e.preventDefault();
            if (contentFocusIndex + cols < count) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev + cols);
            }
          } else if (isUp) {
            e.preventDefault();
            if (contentFocusIndex >= cols) {
              soundService.playMove();
              setContentFocusIndex((prev) => prev - cols);
            } else {
              soundService.playMove();
              setFocusZone('tabs');
            }
          } else if (isSelect) {
            e.preventDefault();
            const wp = CLEAN_FRAME_WALLPAPERS[contentFocusIndex];
            if (wp) handleSelectCleanFrame(wp);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusZone,
    selectedAppIndex,
    headerFocusIndex,
    tabFocusIndex,
    contentFocusIndex,
    activeTab,
    apps,
    selectedApp,
    settings.dynamicAppBackgrounds,
    hasCustomBackdrop,
    generatorStyle,
    seedVariation,
    customUrlInput,
    onClose,
    onUpdateSettings,
  ]);

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-3 select-none animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[95vh] max-h-[95vh] bg-zinc-950/98 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-600/30 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-md">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold tracking-tight">Per-App Brand Backdrops</h2>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  Netflix · HBO · TiviMate
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Full TV remote D-Pad navigation: Use ◀ / ▶ arrows to move between apps list and backdrop menu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundService.playSelect();
                onUpdateSettings({ dynamicAppBackgrounds: !(settings.dynamicAppBackgrounds !== false) });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs cursor-pointer transition-all ${
                focusZone === 'header' && headerFocusIndex === 0
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold scale-105 shadow-md shadow-cyan-500/40 ring-2 ring-white'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <div
                className={`w-3 h-3 rounded flex items-center justify-center border ${
                  settings.dynamicAppBackgrounds !== false
                    ? 'bg-cyan-400 border-cyan-400 text-black'
                    : 'border-white/40'
                }`}
              >
                {settings.dynamicAppBackgrounds !== false && <Check className="w-2 h-2 stroke-[3]" />}
              </div>
              <span className="text-[11px]">Enable Per-App Backdrops</span>
            </button>

            <button
              onClick={() => {
                soundService.playBack();
                onClose();
              }}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                focusZone === 'header' && headerFocusIndex === 1
                  ? 'bg-white text-slate-950 border-white scale-105 shadow-lg ring-2 ring-cyan-400'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Close (Esc / Back)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left column (Apps List - 4 cols), Right column (Backdrop Studio - 8 cols) ALWAYS SIDE BY SIDE */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left Column: Apps List (4 cols) */}
          <div className="col-span-4 border-r border-white/10 flex flex-col bg-zinc-900/40 overflow-hidden">
            <div className="p-2 px-3 border-b border-white/5 flex items-center justify-between text-xs text-zinc-400 bg-black/20 shrink-0">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Select Application</span>
              <span className="font-mono text-[10px] text-cyan-400">{apps.length} TV Apps</span>
            </div>

            <div ref={appListContainerRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
              {apps.map((app, index) => {
                const isSelected = selectedAppIndex === index;
                const isFocused = focusZone === 'apps' && isSelected;
                const hasCustom = !!appBackdrops[app.id];

                return (
                  <button
                    key={app.id}
                    ref={(el) => {
                      appListRefs.current[index] = el;
                    }}
                    onClick={() => {
                      soundService.playMove();
                      setSelectedAppIndex(index);
                      setFocusZone('apps');
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                      isFocused
                        ? 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-[1.01] ring-2 ring-white font-bold z-10'
                        : isSelected
                        ? 'bg-white/20 text-white border-white/30 font-semibold'
                        : 'bg-white/[0.03] hover:bg-white/10 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded flex items-center justify-center p-0.5 bg-black/40 shrink-0">
                        <AppIcon app={app} className="w-4 h-4" />
                      </div>
                      <span className="truncate text-[11px]">{app.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {hasCustom && (
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-semibold uppercase ${
                            isFocused
                              ? 'bg-black text-cyan-300'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          Custom
                        </span>
                      )}
                      {app.inDock && (
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-semibold uppercase ${
                            isFocused ? 'bg-black/60 text-white' : 'bg-white/10 text-zinc-400'
                          }`}
                        >
                          Dock
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3 h-3 ${
                          isFocused ? 'text-black opacity-100' : 'text-zinc-500 opacity-40'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live TV Preview & Studio Menu (8 cols) */}
          <div ref={contentContainerRef} className="col-span-8 flex flex-col overflow-y-auto p-3 space-y-2.5 bg-gradient-to-b from-zinc-950 via-zinc-900/60 to-zinc-950 no-scrollbar">
            
            {/* Top Bar above Preview: App Name & Reset Button */}
            <div className="flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{selectedApp?.name}</span>
                <span className="text-zinc-500 font-mono text-[10px]">· Live TV Highlight Preview</span>
              </div>
              {hasCustomBackdrop && (
                <button
                  onClick={handleReset}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-medium ${
                    focusZone === 'reset'
                      ? 'bg-rose-500 text-white border-white scale-105 shadow-md ring-2 ring-white font-bold'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/60'
                  }`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset to Default
                </button>
              )}
            </div>

            {/* Compact TV Aspect Ratio Preview Card */}
            <div className="relative w-full h-24 sm:h-28 max-w-sm mx-auto rounded-xl overflow-hidden border border-white/15 shadow-xl bg-black shrink-0">
              {currentBackdropUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                  style={{ backgroundImage: `url("${currentBackdropUrl}")` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center text-zinc-600 text-xs">
                  No backdrop defined
                </div>
              )}

              {/* Dark vignettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

              {/* Simulated Dock Pill Overlay */}
              <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                  <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center p-0.5">
                    <AppIcon app={selectedApp} className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white leading-tight">{selectedApp?.name}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/80 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10">
                    10:10 PM
                  </span>
                </div>
              </div>
            </div>

            {/* Quick-Action: 1-Click Apply Recommended Brand Card */}
            {matchingPreset && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-xs text-zinc-300">
                    Recommended for <strong className="text-white">{selectedApp?.name}</strong>:{' '}
                    <span className="text-cyan-300 font-medium">{matchingPreset.name}</span>
                  </span>
                </div>
                <button
                  onClick={() => handleSelectBrandPreset(matchingPreset)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3 h-3" />
                  1-Click Apply
                </button>
              </div>
            )}

            {/* Tabs Strip (Remote Navigable with ◀ / ▶) */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Choose Backdrop Source
                </span>

                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10">
                  {TABS.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const isTabFocused = focusZone === 'tabs' && tabFocusIndex === idx;
                    const IconComp = tab.icon;

                    return (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          tabRefs.current[idx] = el;
                        }}
                        onClick={() => {
                          soundService.playSelect();
                          setActiveTab(tab.id);
                          setTabFocusIndex(idx);
                          setFocusZone('tabs');
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isTabFocused
                            ? 'bg-cyan-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.6)] ring-2 ring-white font-bold'
                            : isActive
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab 1: Brand & IPTV Gallery Presets */}
              {activeTab === 'brand-presets' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      Select a generated backdrop for <strong className="text-white">{selectedApp?.name}</strong>:
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">{BRAND_BACKDROP_PRESETS.length} Presets</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                    {BRAND_BACKDROP_PRESETS.map((preset, idx) => {
                      const isCurrent = currentBackdropUrl === presetUrlFor(preset);
                      const isItemFocused = focusZone === 'content' && contentFocusIndex === idx;

                      return (
                        <button
                          key={preset.id}
                          ref={(el) => {
                            contentRefs.current[idx] = el;
                          }}
                          onClick={() => {
                            setContentFocusIndex(idx);
                            setFocusZone('content');
                            handleSelectBrandPreset(preset);
                          }}
                          className={`relative group p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isItemFocused
                              ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.02] shadow-[0_0_15px_rgba(6,182,212,0.7)] z-10'
                              : isCurrent
                              ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400 text-white'
                              : 'bg-white/[0.04] border-white/10 hover:border-white/30 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`font-bold text-xs truncate ${
                                isItemFocused ? 'text-slate-950' : 'text-white'
                              }`}
                            >
                              {preset.name}
                            </span>
                            {isCurrent && (
                              <div
                                className={`p-0.5 rounded-full shadow shrink-0 ${
                                  isItemFocused ? 'bg-black text-white' : 'bg-cyan-500 text-white'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <div
                            className={`text-[10px] mt-1 line-clamp-1 ${
                              isItemFocused ? 'text-slate-900 font-medium' : 'text-zinc-400'
                            }`}
                          >
                            {preset.description}
                          </div>

                          <div className="mt-2 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: preset.accent }}
                            />
                            <span
                              className={`text-[9px] uppercase font-mono tracking-wider ${
                                isItemFocused ? 'text-slate-900 font-bold' : 'text-zinc-500'
                              }`}
                            >
                              {preset.appKey}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Custom Web Image URL & TV Presets */}
              {activeTab === 'download' && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div>
                    <div className="text-xs font-bold text-white">Custom Web Image URL &amp; TV 1-Click Presets</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Apply any web image link for <strong className="text-white">{selectedApp?.name}</strong>, or select a pre-bundled TV preset below:
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        urlInputRef.current = el;
                        contentRefs.current[0] = el;
                      }}
                      type="url"
                      placeholder="https://.../wallpaper.jpg (or click preset below)"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      onFocus={() => {
                        setFocusZone('content');
                        setContentFocusIndex(0);
                      }}
                      className={`flex-1 bg-black/60 border rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all ${
                        focusZone === 'content' && contentFocusIndex === 0
                          ? 'border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                          : 'border-white/15'
                      }`}
                    />

                    <button
                      ref={(el) => {
                        contentRefs.current[1] = el;
                      }}
                      onClick={() => handleDownloadAndApplyUrl()}
                      disabled={!customUrlInput.trim() || isDownloading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        focusZone === 'content' && contentFocusIndex === 1
                          ? 'bg-white text-slate-950 scale-105 ring-2 ring-cyan-400 shadow-lg'
                          : 'bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isDownloading ? 'Applying...' : 'Apply Image URL'}
                    </button>
                  </div>

                  {/* 1-Click Popular Download Suggestions */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <span>Popular 1-Click TV Backdrops:</span>
                      <span className="text-cyan-400 font-mono lowercase">instant offline apply</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                      {downloadSuggestions.map((sugg, idx) => {
                        const itemIdx = 2 + idx;
                        const isSuggFocused = focusZone === 'content' && contentFocusIndex === itemIdx;

                        return (
                          <button
                            key={sugg.title}
                            ref={(el) => {
                              contentRefs.current[itemIdx] = el;
                            }}
                            onClick={() => {
                              setContentFocusIndex(itemIdx);
                              setFocusZone('content');
                              handleDownloadAndApplyUrl(sugg.url);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              isSuggFocused
                                ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.02] shadow-lg font-bold'
                                : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300'
                            }`}
                          >
                            <span className="truncate">{sugg.title}</span>
                            <span className="text-[10px] text-cyan-400 font-mono ml-2 shrink-0">1-Click</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Auto-Generator (Smart Brand Title Card) */}
              {activeTab === 'generator' && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Smart Brand Hero Card Generator</div>
                      <div className="text-[10px] text-zinc-400">
                        Tailored for {selectedApp?.name} in brand accent ({selectedApp?.accentColor})
                      </div>
                    </div>

                    <button
                      ref={(el) => {
                        contentRefs.current[0] = el;
                      }}
                      onClick={() => {
                        setContentFocusIndex(0);
                        setFocusZone('content');
                        const nextSeed = seedVariation + 1;
                        setSeedVariation(nextSeed);
                        handleAutoGenerate(generatorStyle, nextSeed);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        focusZone === 'content' && contentFocusIndex === 0
                          ? 'bg-white text-slate-950 scale-105 ring-2 ring-cyan-400 shadow-lg font-bold'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Regenerate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'hero', label: 'Netflix Hero', desc: 'Centered emblem & halo' },
                        { id: 'static', label: 'HBO Static', desc: 'Analog CRT noise & glow' },
                        { id: 'oled', label: 'Stealth OLED', desc: 'Minimal black & neon' },
                        { id: 'cinematic', label: 'Cinematic', desc: 'Volumetric starlight' },
                      ] as const
                    ).map((styleOpt, idx) => {
                      const itemIdx = 1 + idx;
                      const isStyleActive = generatorStyle === styleOpt.id;
                      const isItemFocused = focusZone === 'content' && contentFocusIndex === itemIdx;

                      return (
                        <button
                          key={styleOpt.id}
                          ref={(el) => {
                            contentRefs.current[itemIdx] = el;
                          }}
                          onClick={() => {
                            setContentFocusIndex(itemIdx);
                            setFocusZone('content');
                            setGeneratorStyle(styleOpt.id);
                            handleAutoGenerate(styleOpt.id, seedVariation);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isItemFocused
                              ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.03] shadow-lg font-bold'
                              : isStyleActive
                              ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 text-white'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300'
                          }`}
                        >
                          <div className="font-bold text-xs">{styleOpt.label}</div>
                          <div
                            className={`text-[9px] mt-0.5 ${
                              isItemFocused ? 'text-slate-900 font-medium' : 'text-zinc-400'
                            }`}
                          >
                            {styleOpt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 4: TV Import Guide & Brand Quick-Actions */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Tv className="w-4 h-4" />
                      <span>Android TV Backdrop Guide</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-300">
                      Android TV does not include a mobile file manager or gallery app (which causes Android to open a system <span className="text-amber-300 font-mono">"Settings"</span> popup). All official backdrops for <strong className="text-white">{selectedApp?.name}</strong>, TiviMate, Netflix, HBO, and SmartTube are bundled right inside Clean Launcher—ready to apply in one click without downloading files!
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Action 0: 1-Click apply recommended brand preset */}
                    <button
                      ref={(el) => {
                        contentRefs.current[0] = el;
                      }}
                      onClick={() => {
                        setContentFocusIndex(0);
                        setFocusZone('content');
                        handleSelectBrandPreset(matchingPreset);
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        focusZone === 'content' && contentFocusIndex === 0
                          ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.02] shadow-xl font-bold'
                          : 'bg-cyan-950/30 border-cyan-500/30 text-white hover:bg-cyan-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-6 rounded overflow-hidden shrink-0 border border-white/20 bg-black/60">
                          <img
                            src={matchingPreset.url}
                            alt={matchingPreset.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">
                            1-Click Apply {matchingPreset.name}
                          </div>
                          <div className={`text-[10px] ${focusZone === 'content' && contentFocusIndex === 0 ? 'text-slate-900' : 'text-cyan-300'}`}>
                            Instant authentic backdrop for {selectedApp?.name}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        focusZone === 'content' && contentFocusIndex === 0 ? 'bg-slate-950 text-white' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        Apply Now
                      </span>
                    </button>

                    {/* Action 1: Jump to Brand Presets */}
                    <button
                      ref={(el) => {
                        contentRefs.current[1] = el;
                      }}
                      onClick={() => {
                        setContentFocusIndex(1);
                        setFocusZone('content');
                        setActiveTab('brand-presets');
                        setContentFocusIndex(0);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        focusZone === 'content' && contentFocusIndex === 1
                          ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.02] shadow-xl font-bold'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold">Browse Built-in Backdrop Presets</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </button>

                    {/* Action 2: Jump to Web URL Presets */}
                    <button
                      ref={(el) => {
                        contentRefs.current[2] = el;
                      }}
                      onClick={() => {
                        setContentFocusIndex(2);
                        setFocusZone('content');
                        setActiveTab('download');
                        setContentFocusIndex(2);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        focusZone === 'content' && contentFocusIndex === 2
                          ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-[1.02] shadow-xl font-bold'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold">Enter Image Web URL or 1-Click Online Presets</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </button>
                  </div>

                  {!isTv && (
                    <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>PC / Browser testing only:</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
                      >
                        Choose local file
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: CleanFrame Gallery */}
              {activeTab === 'cleanframe' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-zinc-400">
                    Choose landscape photography from <span className="text-white font-mono">CleanFrame</span>:
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {CLEAN_FRAME_WALLPAPERS.map((wp, idx) => {
                      const isCurrent = currentBackdropUrl === wp.src;
                      const isItemFocused = focusZone === 'content' && contentFocusIndex === idx;

                      return (
                        <button
                          key={wp.id}
                          ref={(el) => {
                            contentRefs.current[idx] = el;
                          }}
                          onClick={() => {
                            setContentFocusIndex(idx);
                            setFocusZone('content');
                            handleSelectCleanFrame(wp);
                          }}
                          className={`relative group aspect-video rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                            isItemFocused
                              ? 'border-white ring-2 ring-white scale-[1.05] shadow-[0_0_20px_rgba(6,182,212,0.7)] z-10'
                              : isCurrent
                              ? 'border-cyan-400 ring-2 ring-cyan-400'
                              : 'border-white/10 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={wp.thumb}
                            alt={wp.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[9px] font-bold text-white truncate">{wp.name}</span>
                          </div>
                          {isCurrent && (
                            <div className="absolute top-1 right-1 p-0.5 rounded-full bg-cyan-500 text-white shadow">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-2 border-t border-white/10 bg-black/40 flex items-center justify-end text-[11px] shrink-0">
          <div className="font-mono text-[10px] text-cyan-400">
            Active: <span className="text-white font-bold">{selectedApp?.name}</span>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}
      </div>
    </div>
  );
};
