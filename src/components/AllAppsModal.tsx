import React, { useState, useEffect, useRef } from 'react';
import { AppItem, LauncherSettings } from '../types';
import { BrandIcons, AppIcon } from './BrandIcons';
import { soundService } from '../services/sound';
import { getAppBackdrop } from '../services/backdropGenerator';
import {
  Search,
  Pin,
  PinOff,
  Plus,
  ChevronLeft,
  Play,
  ArrowLeftRight,
  ChevronUp,
  ChevronDown,
  X as CloseIcon,
  Sparkles,
} from 'lucide-react';

interface AllAppsModalProps {
  apps: AppItem[];
  settings?: LauncherSettings;
  onLaunchApp: (app: AppItem) => void;
  onToggleDockPin: (appId: string) => void;
  onMoveDockApp?: (appId: string, direction: 'left' | 'right') => void;
  onAddCustomApp: (newApp: AppItem) => void;
  onClose: () => void;
  onOpenBackdropModal?: (appId: string) => void;
  onAppMenu?: (app: AppItem) => void;
}

type NavZone = 'top' | 'categories' | 'grid' | 'reorganize-dock' | 'reorganize-unpinned' | 'footer';

export const AllAppsModal: React.FC<AllAppsModalProps> = ({
  apps,
  settings,
  onLaunchApp,
  onToggleDockPin,
  onMoveDockApp,
  onAddCustomApp,
  onClose,
  onOpenBackdropModal,
  onAppMenu,
}) => {
  const [modalTab, setModalTab] = useState<'browse' | 'reorganize'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Remote D-Pad Navigation State
  const [focusZone, setFocusZone] = useState<NavZone>('grid');
  const [topFocusIndex, setTopFocusIndex] = useState<number>(1); // 0: Back, 1: Browse, 2: Organize, 3: Add
  const [catFocusIndex, setCatFocusIndex] = useState<number>(0); // 0: All, 1: Streaming, 2: Media, 3: Music, 4: Search
  const [gridFocusIndex, setGridFocusIndex] = useState<number>(0);
  const [reorganizeDockIndex, setReorganizeDockIndex] = useState<number>(0);
  const [reorganizeUnpinnedIndex, setReorganizeUnpinnedIndex] = useState<number>(0);

  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const gridRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const reorganizeDockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reorganizeUnpinnedRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // New Custom App form state
  const [customName, setCustomName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customIcon, setCustomIcon] = useState<string>('settings');

  const categories = ['all', 'streaming', 'media', 'music'];

  const filteredApps = apps.filter((app) => {
    const matchesCat =
      selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const dockApps = apps.filter((a) => a.inDock);
  const unpinnedApps = apps.filter((a) => !a.inDock);

  // Long-press OK (or the Menu key) on a tile opens the app options menu
  useEffect(() => {
    const open = () => {
      if (modalTab !== 'browse' || focusZone !== 'grid' || showAddCustom) return;
      const app = filteredApps[gridFocusIndex];
      if (app) onAppMenu?.(app);
    };
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement) return;
      if (e.key === 'ContextMenu' || e.key.toLowerCase() === 'm') open();
    };
    window.addEventListener('chromecast-select-long', open);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('chromecast-select-long', open);
      window.removeEventListener('keydown', onKey);
    };
  }, [modalTab, focusZone, showAddCustom, filteredApps, gridFocusIndex, onAppMenu]);

  // Auto-scroll when remote moves through app grid
  useEffect(() => {
    if (focusZone === 'grid') {
      gridRefs.current[gridFocusIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [gridFocusIndex, focusZone]);

  // Auto-scroll when remote moves through reorganize dock list
  useEffect(() => {
    if (modalTab === 'reorganize' && focusZone === 'reorganize-dock') {
      reorganizeDockRefs.current[reorganizeDockIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [reorganizeDockIndex, modalTab, focusZone]);

  // Auto-scroll when remote moves through reorganize unpinned apps
  useEffect(() => {
    if (modalTab === 'reorganize' && focusZone === 'reorganize-unpinned') {
      reorganizeUnpinnedRefs.current[reorganizeUnpinnedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [reorganizeUnpinnedIndex, modalTab, focusZone]);

  // Keep grid index valid when filter changes
  useEffect(() => {
    if (gridFocusIndex >= filteredApps.length && filteredApps.length > 0) {
      setGridFocusIndex(filteredApps.length - 1);
    }
  }, [filteredApps.length, gridFocusIndex]);

  // Keep reorganize indexes valid when items are pinned/unpinned
  useEffect(() => {
    if (modalTab === 'reorganize') {
      if (dockApps.length === 0 && unpinnedApps.length > 0 && focusZone === 'reorganize-dock') {
        setFocusZone('reorganize-unpinned');
        setReorganizeUnpinnedIndex(0);
      } else if (reorganizeDockIndex >= dockApps.length && dockApps.length > 0) {
        setReorganizeDockIndex(dockApps.length - 1);
      }
      if (reorganizeUnpinnedIndex >= unpinnedApps.length && unpinnedApps.length > 0) {
        setReorganizeUnpinnedIndex(unpinnedApps.length - 1);
      }
    }
  }, [modalTab, dockApps.length, unpinnedApps.length, focusZone, reorganizeDockIndex, reorganizeUnpinnedIndex]);

  // TV Remote D-Pad Navigation
  useEffect(() => {
    if (showAddCustom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow user typing in search input
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape' || e.keyCode === 27 || e.key === 'Back' || e.keyCode === 4) {
          e.preventDefault();
          searchInputRef.current?.blur();
          setFocusZone('categories');
          return;
        }
        if (e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20) {
          e.preventDefault();
          searchInputRef.current?.blur();
          soundService.playMove();
          setFocusZone('grid');
          setGridFocusIndex(0);
          return;
        }
        if (e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19) {
          e.preventDefault();
          searchInputRef.current?.blur();
          soundService.playMove();
          setFocusZone('top');
          setTopFocusIndex(3);
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
      const isBack =
        e.key === 'Escape' ||
        e.key === 'Back' ||
        e.key === 'GoBack' ||
        e.key === 'Backspace' ||
        e.keyCode === 27 ||
        e.keyCode === 4;

      if (isBack) {
        e.preventDefault();
        soundService.playBack();
        onClose();
        return;
      }

      // Quick key 'p' to toggle pin on current app
      if (e.key.toLowerCase() === 'p') {
        if (modalTab === 'browse' && focusZone === 'grid') {
          const app = filteredApps[gridFocusIndex];
          if (app) {
            e.preventDefault();
            soundService.playSelect();
            onToggleDockPin(app.id);
            return;
          }
        }
      }

      // Read the real column count from the rendered grid (it changes with screen width:
      // 2 / 3 / 4 / 5 columns), so Up/Down always land on the card directly above/below.
      const gridEl = gridContainerRef.current;
      const measuredCols = gridEl
        ? getComputedStyle(gridEl).gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
      const gridCols = measuredCols > 0 ? measuredCols : 4;

      // ============================================
      // TAB: BROWSE APPS
      // ============================================
      if (modalTab === 'browse') {
        if (isUp) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'footer') {
            setFocusZone('grid');
            if (filteredApps.length > 0) {
              setGridFocusIndex(Math.max(0, filteredApps.length - 1));
            }
          } else if (focusZone === 'grid') {
            if (gridFocusIndex >= gridCols) {
              setGridFocusIndex((prev) => prev - gridCols);
            } else {
              // Reached top row of grid: jump up to categories bar!
              setFocusZone('categories');
              setCatFocusIndex(Math.min(4, gridFocusIndex));
            }
          } else if (focusZone === 'categories') {
            // Jump up to top header tabs!
            setFocusZone('top');
            if (catFocusIndex === 0) setTopFocusIndex(0);
            else if (catFocusIndex <= 2) setTopFocusIndex(1);
            else if (catFocusIndex === 3) setTopFocusIndex(2);
            else setTopFocusIndex(3);
          }
        } else if (isDown) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'top') {
            setFocusZone('categories');
            if (topFocusIndex === 0) setCatFocusIndex(0);
            else if (topFocusIndex === 1) setCatFocusIndex(0);
            else if (topFocusIndex === 2) setCatFocusIndex(1);
            else setCatFocusIndex(4);
          } else if (focusZone === 'categories') {
            setFocusZone('grid');
            if (filteredApps.length > 0) {
              setGridFocusIndex(Math.min(filteredApps.length - 1, catFocusIndex));
            }
          } else if (focusZone === 'grid') {
            if (gridFocusIndex + gridCols < filteredApps.length) {
              setGridFocusIndex((prev) => prev + gridCols);
            } else {
              // bottom edge: stay on the last row
            }
          }
        } else if (isLeft) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'top') {
            setTopFocusIndex((prev) => Math.max(0, prev - 1));
          } else if (focusZone === 'categories') {
            setCatFocusIndex((prev) => {
              const next = Math.max(0, prev - 1);
              if (next < 4) setSelectedCategory(categories[next]);
              return next;
            });
          } else if (focusZone === 'grid') {
            setGridFocusIndex((prev) => Math.max(0, prev - 1));
          }
        } else if (isRight) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'top') {
            setTopFocusIndex((prev) => Math.min(3, prev + 1));
          } else if (focusZone === 'categories') {
            setCatFocusIndex((prev) => {
              const next = Math.min(4, prev + 1);
              if (next < 4) setSelectedCategory(categories[next]);
              return next;
            });
          } else if (focusZone === 'grid') {
            setGridFocusIndex((prev) => Math.min(filteredApps.length - 1, prev + 1));
          }
        } else if (isSelect) {
          e.preventDefault();

          if (focusZone === 'top') {
            soundService.playSelect();
            if (topFocusIndex === 0) {
              onClose();
            } else if (topFocusIndex === 1) {
              setModalTab('browse');
            } else if (topFocusIndex === 2) {
              setModalTab('reorganize');
              setFocusZone('reorganize-dock');
              setReorganizeDockIndex(0);
            } else if (topFocusIndex === 3) {
              setShowAddCustom(true);
            }
          } else if (focusZone === 'categories') {
            soundService.playSelect();
            if (catFocusIndex < 4) {
              setSelectedCategory(categories[catFocusIndex]);
              setFocusZone('grid');
              setGridFocusIndex(0);
            } else {
              searchInputRef.current?.focus();
            }
          } else if (focusZone === 'grid') {
            const app = filteredApps[gridFocusIndex];
            if (app) {
              soundService.playSelect();
              onLaunchApp(app);
            }
          } else if (focusZone === 'footer') {
            soundService.playBack();
            onClose();
          }
        }
      }

      // ============================================
      // TAB: REORGANIZE APP TRAY
      // ============================================
      else if (modalTab === 'reorganize') {
        const unpinnedCols = 2;

        if (isUp) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'footer') {
            if (unpinnedApps.length > 0) {
              setFocusZone('reorganize-unpinned');
              setReorganizeUnpinnedIndex(unpinnedApps.length - 1);
            } else if (dockApps.length > 0) {
              setFocusZone('reorganize-dock');
              setReorganizeDockIndex(dockApps.length - 1);
            } else {
              setFocusZone('top');
              setTopFocusIndex(2);
            }
          } else if (focusZone === 'reorganize-unpinned') {
            if (reorganizeUnpinnedIndex >= unpinnedCols) {
              setReorganizeUnpinnedIndex((prev) => prev - unpinnedCols);
            } else if (dockApps.length > 0) {
              setFocusZone('reorganize-dock');
              setReorganizeDockIndex(dockApps.length - 1);
            } else {
              setFocusZone('top');
              setTopFocusIndex(2);
            }
          } else if (focusZone === 'reorganize-dock') {
            if (reorganizeDockIndex > 0) {
              setReorganizeDockIndex((prev) => prev - 1);
            } else {
              setFocusZone('top');
              setTopFocusIndex(2);
            }
          }
        } else if (isDown) {
          e.preventDefault();
          soundService.playMove();

          if (focusZone === 'top') {
            if (dockApps.length > 0) {
              setFocusZone('reorganize-dock');
              setReorganizeDockIndex(0);
            } else if (unpinnedApps.length > 0) {
              setFocusZone('reorganize-unpinned');
              setReorganizeUnpinnedIndex(0);
            } else {
              // bottom edge: stay put
            }
          } else if (focusZone === 'reorganize-dock') {
            if (reorganizeDockIndex < dockApps.length - 1) {
              setReorganizeDockIndex((prev) => prev + 1);
            } else if (unpinnedApps.length > 0) {
              setFocusZone('reorganize-unpinned');
              setReorganizeUnpinnedIndex(0);
            } else {
              // bottom edge: stay put
            }
          } else if (focusZone === 'reorganize-unpinned') {
            if (reorganizeUnpinnedIndex + unpinnedCols < unpinnedApps.length) {
              setReorganizeUnpinnedIndex((prev) => prev + unpinnedCols);
            } else {
              // bottom edge: stay put
            }
          }
        } else if (isLeft) {
          e.preventDefault();

          if (focusZone === 'top') {
            soundService.playMove();
            setTopFocusIndex((prev) => Math.max(0, prev - 1));
          } else if (focusZone === 'reorganize-dock') {
            // Shift app earlier in dock!
            const app = dockApps[reorganizeDockIndex];
            if (app && onMoveDockApp && reorganizeDockIndex > 0) {
              soundService.playMove();
              onMoveDockApp(app.id, 'left');
              setReorganizeDockIndex((prev) => Math.max(0, prev - 1));
            }
          } else if (focusZone === 'reorganize-unpinned') {
            if (reorganizeUnpinnedIndex % unpinnedCols !== 0) {
              soundService.playMove();
              setReorganizeUnpinnedIndex((prev) => prev - 1);
            }
          }
        } else if (isRight) {
          e.preventDefault();

          if (focusZone === 'top') {
            soundService.playMove();
            setTopFocusIndex((prev) => Math.min(2, prev + 1));
          } else if (focusZone === 'reorganize-dock') {
            // Shift app later in dock!
            const app = dockApps[reorganizeDockIndex];
            if (app && onMoveDockApp && reorganizeDockIndex < dockApps.length - 1) {
              soundService.playMove();
              onMoveDockApp(app.id, 'right');
              setReorganizeDockIndex((prev) => Math.min(dockApps.length - 1, prev + 1));
            }
          } else if (focusZone === 'reorganize-unpinned') {
            if (reorganizeUnpinnedIndex % unpinnedCols === 0 && reorganizeUnpinnedIndex + 1 < unpinnedApps.length) {
              soundService.playMove();
              setReorganizeUnpinnedIndex((prev) => prev + 1);
            }
          }
        } else if (isSelect) {
          e.preventDefault();

          if (focusZone === 'top') {
            soundService.playSelect();
            if (topFocusIndex === 0) {
              onClose();
            } else if (topFocusIndex === 1) {
              setModalTab('browse');
              setFocusZone('grid');
              setGridFocusIndex(0);
            } else if (topFocusIndex === 2) {
              setModalTab('reorganize');
            }
          } else if (focusZone === 'reorganize-dock') {
            const app = dockApps[reorganizeDockIndex];
            if (app) {
              soundService.playSelect();
              onToggleDockPin(app.id);
            }
          } else if (focusZone === 'reorganize-unpinned') {
            const app = unpinnedApps[reorganizeUnpinnedIndex];
            if (app) {
              soundService.playSelect();
              onToggleDockPin(app.id);
            }
          } else if (focusZone === 'footer') {
            soundService.playBack();
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    modalTab,
    focusZone,
    topFocusIndex,
    catFocusIndex,
    gridFocusIndex,
    reorganizeDockIndex,
    reorganizeUnpinnedIndex,
    filteredApps,
    dockApps,
    unpinnedApps,
    showAddCustom,
    onLaunchApp,
    onToggleDockPin,
    onMoveDockApp,
    onClose,
  ]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    const newApp: AppItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      iconType: customIcon,
      accentColor: '#38BDF8',
      url: customUrl.startsWith('http') ? customUrl : `https://${customUrl}`,
      inDock: true,
      category: 'streaming',
      description: 'Custom added TV channel / streaming app',
    };

    onAddCustomApp(newApp);
    setCustomName('');
    setCustomUrl('');
    setShowAddCustom(false);
    soundService.playSelect();
  };

  const currentApp =
    focusZone === 'grid' && filteredApps[gridFocusIndex]
      ? filteredApps[gridFocusIndex]
      : null;
  const activeBackdrop = currentApp
    ? getAppBackdrop(currentApp, settings?.appBackdrops)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      {/* Live dynamic backdrop behind modal */}
      {activeBackdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 ease-out pointer-events-none opacity-40"
          style={{ backgroundImage: `url("${activeBackdrop}")` }}
        />
      )}
      {/* Sleek, 4K proportioned modal container */}
      <div className="relative z-10 w-full max-w-5xl max-h-[86vh] bg-[#0b0f19]/96 border border-white/15 rounded-3xl p-3.5 md:p-4.5 shadow-2xl flex flex-col overflow-hidden">
        
        {/* ========================================================= */}
        {/* Top Header: Back Button, Title, Tabs, and + Add App       */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {/* Top Index 0: Back Button */}
            <button
              onClick={() => {
                soundService.playBack();
                onClose();
              }}
              onMouseEnter={() => {
                setFocusZone('top');
                setTopFocusIndex(0);
              }}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                focusZone === 'top' && topFocusIndex === 0
                  ? 'bg-white text-slate-900 shadow-md ring-2 ring-white scale-105'
                  : 'hover:bg-white/10 text-white/70 hover:text-white border border-transparent'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-none">
                {modalTab === 'browse' ? 'All Apps' : 'Reorganize App Tray'}
              </h2>
              <p className="text-[10px] text-white/50 mt-0.5">
                {modalTab === 'browse'
                  ? 'Select to launch, filter categories, or pin to home dock'
                  : 'Use remote Left/Right arrows to rearrange dock order'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Tab Switcher (Browse / Organize) */}
            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
              {/* Top Index 1: Browse Apps */}
              <button
                onClick={() => {
                  soundService.playSelect();
                  setModalTab('browse');
                  setFocusZone('grid');
                }}
                onMouseEnter={() => {
                  setFocusZone('top');
                  setTopFocusIndex(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  modalTab === 'browse'
                    ? focusZone === 'top' && topFocusIndex === 1
                      ? 'bg-white text-slate-900 shadow-md ring-2 ring-sky-400 font-bold scale-105'
                      : 'bg-white text-slate-900 shadow-md'
                    : focusZone === 'top' && topFocusIndex === 1
                    ? 'bg-white/30 text-white ring-2 ring-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Browse Apps
              </button>

              {/* Top Index 2: Organize Tray */}
              <button
                onClick={() => {
                  soundService.playSelect();
                  setModalTab('reorganize');
                  setFocusZone('reorganize-dock');
                  setReorganizeDockIndex(0);
                }}
                onMouseEnter={() => {
                  setFocusZone('top');
                  setTopFocusIndex(2);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  modalTab === 'reorganize'
                    ? focusZone === 'top' && topFocusIndex === 2
                      ? 'bg-white text-slate-900 shadow-md ring-2 ring-sky-400 font-bold scale-105'
                      : 'bg-white text-slate-900 shadow-md'
                    : focusZone === 'top' && topFocusIndex === 2
                    ? 'bg-white/30 text-white ring-2 ring-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Organize Tray ({dockApps.length})</span>
              </button>
            </div>

            {/* Top Index 3: Add Custom App Button */}
            {modalTab === 'browse' && (
              <button
                onClick={() => {
                  soundService.playSelect();
                  setShowAddCustom(!showAddCustom);
                }}
                onMouseEnter={() => {
                  setFocusZone('top');
                  setTopFocusIndex(3);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  focusZone === 'top' && topFocusIndex === 3
                    ? 'bg-white text-slate-900 shadow-md ring-2 ring-white scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add App</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: BROWSE APPS                                       */}
        {/* ========================================================= */}
        {modalTab === 'browse' ? (
          <>
            {/* Category Filter Pills & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 py-1.5">
                {categories.map((cat, idx) => {
                  const isCatActive = selectedCategory === cat;
                  const isCatFocused = focusZone === 'categories' && catFocusIndex === idx;

                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        soundService.playSelect();
                        setSelectedCategory(cat);
                        setCatFocusIndex(idx);
                        setFocusZone('grid');
                        setGridFocusIndex(0);
                      }}
                      onMouseEnter={() => {
                        setFocusZone('categories');
                        setCatFocusIndex(idx);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        isCatFocused
                          ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.7)] font-bold ring-2 ring-white scale-105 z-10'
                          : isCatActive
                          ? 'bg-white/20 text-white font-semibold border border-white/20'
                          : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat === 'all' ? 'All Applications' : cat}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar (Category index 4) */}
              <div
                className={`relative rounded-xl transition-all ${
                  focusZone === 'categories' && catFocusIndex === 4
                    ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                    : ''
                }`}
              >
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search apps..."
                  value={searchQuery}
                  onFocus={() => {
                    setFocusZone('categories');
                    setCatFocusIndex(4);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setGridFocusIndex(0);
                  }}
                  className="bg-white/5 border border-white/15 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white focus:bg-white/10 w-full sm:w-48"
                />
              </div>
            </div>

            {/* Custom App Drawer Modal */}
            {showAddCustom && (
              <form
                onSubmit={handleAddSubmit}
                className="p-3.5 my-2 rounded-2xl bg-white/5 border border-white/15 space-y-2.5 shrink-0"
              >
                <div className="text-xs font-semibold text-white">Add Custom Web App / Stream</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="App Name (e.g. ESPN, Crunchyroll, Plex)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Stream URL (e.g. https://espn.com/watch)"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white"
                    required
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/50">Icon:</span>
                    {['settings', 'generic', 'youtube', 'spotify', 'kodi'].map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setCustomIcon(ic)}
                        className={`px-2 py-0.5 rounded text-[10px] capitalize cursor-pointer ${
                          customIcon === ic
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(false)}
                      className="px-3 py-1 rounded-lg text-xs text-white/60 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg text-xs bg-white text-slate-900 font-semibold hover:bg-white/90 cursor-pointer"
                    >
                      Add to Launcher
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Apps Grid: Sleek 5 columns, TV-proportioned compact cards */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scroll-py-4 no-scrollbar">
              {filteredApps.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-xs">
                  No applications found matching your search.
                </div>
              ) : (
                <div ref={gridContainerRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-2.5">
                  {filteredApps.map((app, index) => {
                    const IconComp = BrandIcons[app.iconType] || BrandIcons.generic;
                    const isFocused = focusZone === 'grid' && gridFocusIndex === index;

                    return (
                      <div
                        key={app.id}
                        ref={(el) => {
                          gridRefs.current[index] = el;
                        }}
                        onClick={() => {
                          setFocusZone('grid');
                          setGridFocusIndex(index);
                          soundService.playSelect();
                          onLaunchApp(app);
                        }}
                        onMouseEnter={() => {
                          setFocusZone('grid');
                          setGridFocusIndex(index);
                        }}
                        className={`group relative flex flex-col justify-between p-2.5 md:p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                          isFocused
                            ? 'bg-white text-slate-900 border-white shadow-[0_0_18px_rgba(255,255,255,0.7)] ring-3 ring-white z-10'
                            : 'bg-white/[0.04] border-white/5 hover:bg-white/10 text-white'
                        }`}
                      >
                        {/* Top Card Row: App Icon & Action Buttons */}
                        <div className="flex items-start justify-between">
                          <div
                            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center p-1.5 transition-transform ${
                              isFocused ? 'bg-slate-100 scale-105' : 'bg-black/40'
                            }`}
                          >
                            <AppIcon app={app} className="w-6 h-6 md:w-7 md:h-7" />
                          </div>

                          <div className="flex items-center gap-1">
                            {onOpenBackdropModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundService.playSelect();
                                  onOpenBackdropModal(app.id);
                                }}
                                title="Customize Backdrop"
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isFocused
                                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                    : 'text-white/40 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundService.playSelect();
                                onToggleDockPin(app.id);
                              }}
                              title={app.inDock ? 'Unpin from dock' : 'Pin to dock'}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                app.inDock
                                  ? isFocused
                                    ? 'bg-slate-200 text-slate-900'
                                    : 'bg-white/20 text-white hover:bg-red-500/30'
                                  : isFocused
                                  ? 'text-slate-400 hover:text-slate-900'
                                  : 'text-white/30 hover:text-white'
                              }`}
                            >
                              {app.inDock ? (
                                <Pin className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <PinOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Middle Card: Title & Dock Status */}
                        <div className="mt-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-xs md:text-sm tracking-tight truncate ${
                                isFocused ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              {app.name}
                            </span>
                            {app.inDock && (
                              <span
                                className={`text-[9px] uppercase tracking-wider px-1 py-0.5 rounded font-bold shrink-0 ${
                                  isFocused
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white/15 text-white/80'
                                }`}
                              >
                                Dock
                              </span>
                            )}
                          </div>
                          {app.description && (
                            <p
                              className={`text-[10px] md:text-[11px] line-clamp-1 mt-0.5 ${
                                isFocused ? 'text-slate-600 font-medium' : 'text-white/50'
                              }`}
                            >
                              {app.description}
                            </p>
                          )}
                        </div>

                        {/* Bottom Card Action: Launch */}
                        <div
                          className={`mt-2 flex items-center justify-between pt-1 border-t text-[10px] md:text-[11px] ${
                            isFocused
                              ? 'border-slate-200 text-slate-800'
                              : 'border-white/10 text-white/50'
                          }`}
                        >
                          <span className="flex items-center gap-1 font-bold">
                            <Play className="w-3 h-3 fill-current text-emerald-500" />
                            <span>Launch</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ========================================================= */
          /* VIEW 2: REORGANIZE APP TRAY                               */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scroll-py-4 space-y-4 no-scrollbar">
            {/* Docked Apps Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Current Dock Order (Left to Right)
                </div>
                <span className="text-[11px] text-sky-400">
                  Press ◄ / ► to rearrange · Enter to unpin
                </span>
              </div>

              {dockApps.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white/5 text-center text-xs text-white/50">
                  No apps pinned to tray yet. Select apps below to pin to tray!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dockApps.map((app, idx) => {
                    const IconComp = BrandIcons[app.iconType] || BrandIcons.generic;
                    const isFocused =
                      focusZone === 'reorganize-dock' && reorganizeDockIndex === idx;

                    return (
                      <div
                        key={app.id}
                        ref={(el) => {
                          reorganizeDockRefs.current[idx] = el;
                        }}
                        onClick={() => {
                          setFocusZone('reorganize-dock');
                          setReorganizeDockIndex(idx);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isFocused
                            ? 'bg-white text-slate-900 border-white shadow-lg ring-2 ring-white z-10'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isFocused ? 'text-slate-500' : 'text-white/40'
                            } w-5`}
                          >
                            #{idx + 1}
                          </span>
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center p-1 ${
                              isFocused ? 'bg-slate-100' : 'bg-black/40'
                            }`}
                          >
                            <AppIcon app={app} className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs">{app.name}</div>
                            <div
                              className={`text-[10px] line-clamp-1 ${
                                isFocused ? 'text-slate-600' : 'text-white/40'
                              }`}
                            >
                              {app.description || 'Pinned dock application'}
                            </div>
                          </div>
                        </div>

                        {/* Shift order buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMoveDockApp && idx > 0) {
                                soundService.playMove();
                                onMoveDockApp(app.id, 'left');
                                setReorganizeDockIndex(idx - 1);
                              }
                            }}
                            disabled={idx === 0}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              isFocused
                                ? 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-30'
                                : 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-20'
                            }`}
                          >
                            <ChevronUp className="w-3 h-3" />
                            <span>Left</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMoveDockApp && idx < dockApps.length - 1) {
                                soundService.playMove();
                                onMoveDockApp(app.id, 'right');
                                setReorganizeDockIndex(idx + 1);
                              }
                            }}
                            disabled={idx === dockApps.length - 1}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              isFocused
                                ? 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-30'
                                : 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-20'
                            }`}
                          >
                            <ChevronDown className="w-3 h-3" />
                            <span>Right</span>
                          </button>

                          {onOpenBackdropModal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                soundService.playSelect();
                                onOpenBackdropModal(app.id);
                              }}
                              className={`p-1 rounded-lg cursor-pointer ${
                                isFocused
                                  ? 'hover:bg-slate-300 text-slate-700'
                                  : 'hover:bg-white/10 text-white/50 hover:text-white'
                              }`}
                              title="Customize backdrop"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundService.playSelect();
                              onToggleDockPin(app.id);
                            }}
                            className={`p-1 rounded-lg cursor-pointer ${
                              isFocused
                                ? 'hover:bg-red-500 text-slate-700 hover:text-white'
                                : 'hover:bg-red-500/20 text-white/50 hover:text-red-400'
                            }`}
                            title="Remove from dock"
                          >
                            <CloseIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unpinned Apps: Add to Dock Section */}
            {unpinnedApps.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Available Apps to Add to Tray ({unpinnedApps.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {unpinnedApps.map((app, idx) => {
                    const IconComp = BrandIcons[app.iconType] || BrandIcons.generic;
                    const isFocused =
                      focusZone === 'reorganize-unpinned' && reorganizeUnpinnedIndex === idx;

                    return (
                      <div
                        key={app.id}
                        ref={(el) => {
                          reorganizeUnpinnedRefs.current[idx] = el;
                        }}
                        onClick={() => {
                          setFocusZone('reorganize-unpinned');
                          setReorganizeUnpinnedIndex(idx);
                          soundService.playSelect();
                          onToggleDockPin(app.id);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isFocused
                            ? 'bg-white text-slate-900 border-white shadow-md ring-2 ring-white z-10'
                            : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center p-1 ${
                              isFocused ? 'bg-slate-100' : 'bg-black/40'
                            }`}
                          >
                            <AppIcon app={app} className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold truncate">{app.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.playSelect();
                            onToggleDockPin(app.id);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            isFocused
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Pin</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
