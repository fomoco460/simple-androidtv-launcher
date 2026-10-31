import React, { useState, useEffect } from 'react';
import { LauncherSettings, AppItem, TvInputItem, BackgroundPreset } from './types';
import { INITIAL_APPS, INITIAL_INPUTS } from './data/defaultApps';
import { HomeLauncher } from './components/HomeLauncher';
import { AppearanceScreen } from './components/AppearanceScreen';
import { InputsModal } from './components/InputsModal';
import { AllAppsModal } from './components/AllAppsModal';
import { AppLauncherModal } from './components/AppLauncherModal';
import { LocationModal } from './components/LocationModal';
import { InstallApkModal } from './components/InstallApkModal';
import { WallpaperGalleryModal } from './components/WallpaperGalleryModal';
import { AppBackdropModal } from './components/AppBackdropModal';
import { VirtualRemote } from './components/VirtualRemote';
import { soundService } from './services/sound';
import { getAppBackdrop } from './services/backdropGenerator';
import { UiScalePreset } from './types';

const STORAGE_KEY_SETTINGS = 'chromecast_launcher_settings_v1';
const STORAGE_KEY_APPS = 'chromecast_launcher_apps_v1';
const STORAGE_KEY_INPUTS = 'chromecast_launcher_inputs_v1';

export function getComputedUiScale(_preset?: UiScalePreset): number {
  return 1.0;
}

const DEFAULT_SETTINGS: LauncherSettings = {
  background: 'desert-stars',
  customBgUrl: '',
  iconStyle: 'stock',
  layout: 'dock',
  apps: 'icons-only', // Default to clean icons only in dock
  font: 'Manrope',
  focus: 'border',
  material: 'soft',
  homeControls: 'both',
  uiScale: 'auto',
  safeZone: 5,
  soundEffects: true,
  clockFormat: 'auto',
  showDate: false,
  showInputs: false,
  showWeather: true,
  tempUnit: 'F',
  activeView: 'home',
  dynamicAppBackgrounds: false, // Clean wallpaper without giant app logos
};

export default function App() {
  const [settings, setSettings] = useState<LauncherSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          clockFormat: parsed.clockFormat || 'auto',
          iconStyle: 'stock', // locked to stock app icons
          layout: 'dock',     // locked to dock
          focus: 'border',    // locked to border
          apps: parsed.apps || 'icons-only', // Preserve user's dock setting (icons-only)
          uiScale: parsed.uiScale || 'auto',
          dynamicAppBackgrounds: false, // Clean background without giant logos
          activeView: 'home', // Always start on home screen on launch or reboot, never trapped in settings
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Ensure document always fills 100% of TV screen edge-to-edge without shifting or body scrolling
  useEffect(() => {
    try {
      (document.documentElement.style as any).zoom = '1';
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        document.head.appendChild(meta);
      }
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
      const lockScroll = () => {
        if (window.scrollX !== 0 || window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      };
      window.addEventListener('scroll', lockScroll);
      return () => window.removeEventListener('scroll', lockScroll);
    } catch {}
  }, []);

  // Listen for Home button press from remote or AndroidBridge
  useEffect(() => {
    const handleHomePress = () => {
      setActiveModal(null);
      setShowLocationModal(false);
      setShowApkModal(false);
      setShowWallpaperGallery(false);
      setShowBackdropModal(false);
      setLaunchingApp(null);
      setSettings((prev) => ({ ...prev, activeView: 'home' }));
    };
    window.addEventListener('chromecast-home-press', handleHomePress);
    return () => window.removeEventListener('chromecast-home-press', handleHomePress);
  }, []);

  const [apps, setApps] = useState<AppItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPS);
      if (saved) {
        const parsed = JSON.parse(saved) as AppItem[];
        // Backfill and upgrade to authentic brand backdrops
        const upgraded = parsed.map((app) => {
          const init = INITIAL_APPS.find((ia) => ia.id === app.id);
          // If app has no backdrop or has old generic cleanframe scenery, use the generated backdrop
          if (!app.backdropUrl || app.backdropUrl.includes('/wallpapers/cleanframe/')) {
            return {
              ...app,
              backdropUrl: init?.backdropUrl || getAppBackdrop(app),
            };
          }
          return app;
        });

        // Ensure TiviMate and Xfinity are included if not present in saved apps
        if (!upgraded.some((a) => a.id === 'tivimate' || a.name.toLowerCase().includes('tivimate'))) {
          const tivimateApp = INITIAL_APPS.find((a) => a.id === 'tivimate');
          if (tivimateApp) {
            upgraded.splice(3, 0, tivimateApp);
          }
        }
        if (!upgraded.some((a) => a.id === 'xfinity' || a.name.toLowerCase().includes('xfinity'))) {
          const xfinityApp = INITIAL_APPS.find((a) => a.id === 'xfinity');
          if (xfinityApp) {
            upgraded.splice(4, 0, xfinityApp);
          }
        }

        return upgraded;
      }
    } catch {}
    return INITIAL_APPS;
  });

  const [inputs, setInputs] = useState<TvInputItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INPUTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INPUTS;
  });

  const [activeModal, setActiveModal] = useState<'inputs' | 'all-apps' | null>(null);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [showWallpaperGallery, setShowWallpaperGallery] = useState<boolean>(false);
  const [showBackdropModal, setShowBackdropModal] = useState<boolean>(false);
  const [backdropModalAppId, setBackdropModalAppId] = useState<string | undefined>(undefined);
  const [launchingApp, setLaunchingApp] = useState<AppItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleSaveLocation = (
    city: string,
    lat?: number,
    lon?: number,
    unit?: 'F' | 'C'
  ) => {
    setSettings((prev) => ({
      ...prev,
      weatherCity: city,
      weatherLat: lat,
      weatherLon: lon,
      tempUnit: unit || prev.tempUnit || 'F',
    }));
  };

  // Blur any active DOM elements whenever modals close to prevent WebView focus rings
  useEffect(() => {
    if (!activeModal && !showLocationModal && !showApkModal && !showWallpaperGallery && !showBackdropModal) {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [activeModal, showLocationModal, showApkModal, showWallpaperGallery, showBackdropModal]);

  // Global TV remote Back button handler
  useEffect(() => {
    const handleBack = (_e?: KeyboardEvent | Event) => {
      // 1. Close any active modal dialogs in reverse order
      if (showBackdropModal) {
        setShowBackdropModal(false);
        setBackdropModalAppId(undefined);
        return;
      }
      if (showWallpaperGallery) {
        setShowWallpaperGallery(false);
        return;
      }
      if (showLocationModal) {
        setShowLocationModal(false);
        return;
      }
      if (showApkModal) {
        setShowApkModal(false);
        return;
      }
      if (activeModal) {
        setActiveModal(null);
        return;
      }
      if (launchingApp) {
        setLaunchingApp(null);
        return;
      }

      // 2. If user is in Appearance Settings screen, Back returns directly to Home screen
      if (settings.activeView !== 'home') {
        soundService.playBack();
        setSettings((prev) => ({ ...prev, activeView: 'home' }));
        return;
      }

      // 3. If on Home screen, dispatch to HomeLauncher to move focus back to dock
      window.dispatchEvent(new CustomEvent('chromecast-home-back'));
    };

    const handleKeyBack = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Back' || e.keyCode === 27 || e.keyCode === 4) {
        handleBack(e);
      }
    };

    window.addEventListener('chromecast-back-press', handleBack);
    window.addEventListener('keydown', handleKeyBack);
    return () => {
      window.removeEventListener('chromecast-back-press', handleBack);
      window.removeEventListener('keydown', handleKeyBack);
    };
  }, [
    showBackdropModal,
    showWallpaperGallery,
    showLocationModal,
    showApkModal,
    activeModal,
    launchingApp,
    settings.activeView,
  ]);

  // Sync settings with body CSS variables and localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {}

    soundService.enabled = settings.soundEffects;

    // Dynamically apply selected font to root
    const fontName =
      settings.font === 'System'
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : `'${settings.font}', sans-serif`;
    document.documentElement.style.setProperty('--font-family-current', fontName);
  }, [settings]);

  // Sync apps with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(apps));
    } catch {}
  }, [apps]);

  // Sync inputs with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(inputs));
    } catch {}
  }, [inputs]);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isTvOrNative =
    typeof window !== 'undefined' &&
    (!!(window as any).AndroidBridge?.isNative?.() ||
      /Android|AFT|GoogleTV|SmartTV|AppleTV|HbbTV|CrKey/i.test(navigator.userAgent));

  // Auto-sync real installed TV apps from AndroidBridge on launch, modal open, and package changes
  // Throttle: re-scan at most once per minute unless a package was installed/removed
  const lastAppSyncRef = React.useRef(0);
  const syncInstalledApps = React.useCallback((opts?: { force?: boolean }) => {
    const now = Date.now();
    if (!opts?.force && now - lastAppSyncRef.current < 60_000) return;
    lastAppSyncRef.current = now;
    try {
      const bridge = (window as any).AndroidBridge;
      if (bridge && typeof bridge.getInstalledTvApps === 'function') {
        const jsonStr = bridge.getInstalledTvApps();
        if (jsonStr) {
          const installedList = JSON.parse(jsonStr) as { name: string; package: string; icon?: string }[];
          if (Array.isArray(installedList) && installedList.length > 0) {
            setApps((prevApps) => {
              const updated = [...prevApps];

              installedList.forEach((item) => {
                const pkgLower = item.package.toLowerCase();
                const nameLower = item.name.toLowerCase();

                // Check if already in apps by package or name
                const existingIndex = updated.findIndex((a) => {
                  const m = a.intentUrl?.match(/package=([^;]+)/);
                  const pkgMatch = m && m[1].toLowerCase() === pkgLower;
                  const nameMatch = a.name.toLowerCase() === nameLower;
                  return pkgMatch || nameMatch;
                });

                if (existingIndex >= 0) {
                  const currentApp = updated[existingIndex];
                  updated[existingIndex] = {
                    ...currentApp,
                    iconUrl: item.icon || currentApp.iconUrl,
                    intentUrl: currentApp.intentUrl?.includes(item.package)
                      ? currentApp.intentUrl
                      : `intent://#Intent;package=${item.package};end`,
                    backdropUrl: currentApp.backdropUrl || getAppBackdrop(currentApp, settings.appBackdrops),
                  };
                } else {
                  // Add newly discovered TV / sideloaded app
                  const id = item.package.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                  let iconType = 'generic';
                  let accentColor = '#38BDF8';
                  if (nameLower.includes('youtube')) {
                    iconType = 'youtube';
                    accentColor = '#FF0000';
                  } else if (nameLower.includes('smarttube') || nameLower.includes('smart tube')) {
                    iconType = 'smarttube';
                    accentColor = '#D32F2F';
                  } else if (nameLower.includes('netflix')) {
                    iconType = 'netflix';
                    accentColor = '#E50914';
                  } else if (nameLower.includes('xfinity') || pkgLower.includes('xfinity') || nameLower.includes('comcast') || pkgLower.includes('comcast')) {
                    iconType = 'xfinity';
                    accentColor = '#783CBD';
                  } else if (nameLower.includes('tivimate') || nameLower.includes('tivi') || pkgLower.includes('tvplayer')) {
                    iconType = 'tivimate';
                    accentColor = '#00F0FF';
                  } else if (nameLower.includes('disney')) {
                    iconType = 'disney';
                    accentColor = '#113CCF';
                  } else if (nameLower.includes('prime') || nameLower.includes('amazon')) {
                    iconType = 'prime';
                    accentColor = '#00A8E1';
                  } else if (nameLower.includes('plex')) {
                    iconType = 'plex';
                    accentColor = '#E5A00D';
                  } else if (nameLower.includes('kodi')) {
                    iconType = 'kodi';
                    accentColor = '#13B5EA';
                  } else if (nameLower.includes('spotify')) {
                    iconType = 'spotify';
                    accentColor = '#1DB954';
                  } else if (nameLower.includes('twitch')) {
                    iconType = 'twitch';
                    accentColor = '#9146FF';
                  } else if (nameLower.includes('hulu')) {
                    iconType = 'hulu';
                    accentColor = '#1CE783';
                  } else if (nameLower.includes('max') || nameLower.includes('hbo')) {
                    iconType = 'max';
                    accentColor = '#002BE7';
                  } else if (nameLower.includes('apple')) {
                    iconType = 'apple';
                    accentColor = '#FFFFFF';
                  } else if (nameLower.includes('tubi')) {
                    iconType = 'tubi';
                    accentColor = '#FA4616';
                  }

                  const newTvApp: AppItem = {
                    id,
                    name: item.name,
                    iconType,
                    iconUrl: item.icon,
                    accentColor,
                    url: '',
                    intentUrl: `intent://#Intent;package=${item.package};end`,
                    inDock: false,
                    category: 'streaming',
                    description: `Installed TV Application (${item.package})`,
                  };
                  newTvApp.backdropUrl = getAppBackdrop(newTvApp, settings.appBackdrops);
                  updated.push(newTvApp);
                }
              });

              return updated;
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to query installed TV apps from AndroidBridge', e);
    }
  }, [settings.appBackdrops]);

  useEffect(() => {
    syncInstalledApps();
    // Native side fires this when an app is installed/removed/updated
    const onPackagesChanged = () => syncInstalledApps({ force: true });
    window.addEventListener('chromecast-packages-changed', onPackagesChanged);
    return () => window.removeEventListener('chromecast-packages-changed', onPackagesChanged);
  }, [syncInstalledApps]);

  const updateSettings = (newSettings: Partial<LauncherSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleOpenView = (
    view: 'inputs' | 'all-apps' | 'appearance' | 'install-apk' | 'location'
  ) => {
    if (view === 'appearance') {
      syncInstalledApps();
      setSettings((prev) => ({ ...prev, activeView: 'appearance' }));
    } else if (view === 'location') {
      setShowLocationModal(true);
    } else if (view === 'install-apk') {
      if (!isTvOrNative) {
        setShowApkModal(true);
      }
    } else {
      if (view === 'all-apps') {
        syncInstalledApps();
      }
      setActiveModal(view);
    }
  };

  const handleLaunchApp = (app: AppItem) => {
    // If running in native Android environment, directly launch without opening the countdown modal
    const bridge = (window as any).AndroidBridge;
    if (bridge) {
      soundService.playSelect();

      // Check if this is Android Settings
      if (app.id === 'android-settings' && typeof bridge.openAndroidSettings === 'function') {
        bridge.openAndroidSettings();
        return;
      }

      // Extract package name
      let pkg: string | undefined;
      if (app.intentUrl) {
        const match = app.intentUrl.match(/package=([^;]+)/);
        if (match && match[1]) pkg = match[1];
      }

      const knownPackages: Record<string, string> = {
        smarttube: 'com.teamsmart.videomanager.tv',
        netflix: 'com.netflix.ninja',
        youtube: 'com.google.android.youtube.tv',
        disney: 'com.disney.disneyplus',
        max: 'com.wbd.stream',
        prime: 'com.amazon.amazonvideo.livingroom',
        spotify: 'com.spotify.tv.android',
        plex: 'com.plexapp.android',
        twitch: 'tv.twitch.android.app',
        apple: 'com.apple.atve.androidtv.appletv',
        hulu: 'com.hulu.livingroomplus',
        kodi: 'org.xbmc.kodi',
        vlc: 'org.videolan.vlc',
        tubi: 'com.tubitv',
        xfinity: 'com.xfinity.cloudtvr',
      };
      if (!pkg && knownPackages[app.id]) {
        pkg = knownPackages[app.id];
      }

      // Direct launch via bridge
      let launched = false;
      if (typeof bridge.launchApp === 'function') {
        launched = bridge.launchApp(app.name, pkg || '');
      } else if (pkg && typeof bridge.launchPackage === 'function') {
        launched = bridge.launchPackage(pkg);
      }

      if (launched) {
        return;
      }

      // Fallback to intentUri if provided
      if (app.intentUrl && typeof bridge.launchIntent === 'function') {
        if (bridge.launchIntent(app.intentUrl)) {
          return;
        }
      }

      // On native TV, return immediately rather than showing web fallback modal
      return;
    }

    // In desktop browser preview, open the launcher dialog
    setLaunchingApp(app);
  };

  const handleMoveDockApp = (appId: string, direction: 'left' | 'right') => {
    setApps((prev) => {
      const dockApps = prev.filter((a) => a.inDock);
      const currentIndex = dockApps.findIndex((a) => a.id === appId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= dockApps.length) return prev;

      const newDockApps = [...dockApps];
      const temp = newDockApps[currentIndex];
      newDockApps[currentIndex] = newDockApps[targetIndex];
      newDockApps[targetIndex] = temp;

      const nonDockApps = prev.filter((a) => !a.inDock);
      return [...newDockApps, ...nonDockApps];
    });
  };

  const handleToggleDockPin = (appId: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, inDock: !app.inDock } : app))
    );
  };

  const handleAddCustomApp = (newApp: AppItem) => {
    setApps((prev) => [newApp, ...prev]);
  };

  const handleSelectInput = (inputId: string) => {
    setInputs((prev) =>
      prev.map((item) => ({
        ...item,
        isActive: item.id === inputId,
      }))
    );
    setActiveModal(null);
  };

  const handleUpdateInputLabel = (inputId: string, label: string) => {
    setInputs((prev) =>
      prev.map((item) => (item.id === inputId ? { ...item, label } : item))
    );
  };

  const isAnyModalActive =
    showLocationModal ||
    showApkModal ||
    showWallpaperGallery ||
    showBackdropModal ||
    !!activeModal ||
    !!launchingApp;

  return (
    <main
      className="relative w-screen h-screen min-h-screen overflow-hidden bg-black text-white antialiased select-none"
      style={{
        fontFamily:
          settings.font === 'System'
            ? 'sans-serif'
            : `'${settings.font}', sans-serif`,
      }}
    >
      {/* View Switcher: Home Launcher or Appearance Settings Screen */}
      {settings.activeView === 'appearance' ? (
        <AppearanceScreen
          settings={settings}
          onUpdateSettings={updateSettings}
          onBackToHome={() => updateSettings({ activeView: 'home' })}
          apps={apps}
          onLaunchApp={handleLaunchApp}
          onMoveDockApp={handleMoveDockApp}
          onToggleDockPin={handleToggleDockPin}
          onOpenLocationModal={() => setShowLocationModal(true)}
          onOpenApkModal={() => setShowApkModal(true)}
          onOpenWallpaperGallery={() => setShowWallpaperGallery(true)}
          onOpenBackdropModal={(appId) => {
            setBackdropModalAppId(appId);
            setShowBackdropModal(true);
          }}
          isModalOpen={isAnyModalActive}
        />
      ) : (
        <HomeLauncher
          settings={settings}
          apps={apps}
          onOpenView={handleOpenView}
          onLaunchApp={handleLaunchApp}
          isMiniPreview={false}
          isModalOpen={isAnyModalActive}
        />
      )}

      {/* Modals & Overlays on Home */}
      {activeModal === 'inputs' && (
        <InputsModal
          inputs={inputs}
          onSelectInput={handleSelectInput}
          onUpdateInputLabel={handleUpdateInputLabel}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'all-apps' && (
        <AllAppsModal
          apps={apps}
          settings={settings}
          onLaunchApp={(app) => {
            setActiveModal(null);
            handleLaunchApp(app);
          }}
          onToggleDockPin={handleToggleDockPin}
          onMoveDockApp={handleMoveDockApp}
          onAddCustomApp={handleAddCustomApp}
          onOpenBackdropModal={(appId) => {
            setBackdropModalAppId(appId);
            setShowBackdropModal(true);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Location Picker Modal */}
      {showLocationModal && (
        <LocationModal
          currentCity={settings.weatherCity || 'Local Area (Auto)'}
          tempUnit={settings.tempUnit || 'F'}
          onSaveLocation={handleSaveLocation}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Install APK / Chromecast Sideload Modal */}
      {!isTvOrNative && showApkModal && (
        <InstallApkModal onClose={() => setShowApkModal(false)} />
      )}

      {/* CleanFrame & Ambient Wallpaper Gallery Modal */}
      {showWallpaperGallery && (
        <WallpaperGalleryModal
          currentPreset={settings.background}
          customUrl={settings.customBgUrl}
          onSelectWallpaper={(presetId: BackgroundPreset, customUrl?: string) => {
            updateSettings({
              background: presetId,
              customBgUrl: customUrl || settings.customBgUrl,
            });
            setShowWallpaperGallery(false);
          }}
          onClose={() => setShowWallpaperGallery(false)}
        />
      )}

      {/* Dynamic App Backdrops Management Modal */}
      {showBackdropModal && (
        <AppBackdropModal
          apps={apps}
          settings={settings}
          initialAppId={backdropModalAppId}
          onUpdateSettings={updateSettings}
          onClose={() => {
            setShowBackdropModal(false);
            setBackdropModalAppId(undefined);
          }}
        />
      )}

      {launchingApp && (
        <AppLauncherModal
          app={launchingApp}
          onClose={() => setLaunchingApp(null)}
        />
      )}

      {/* Floating Virtual TV Remote Simulator (for desktop/tablet testing) */}
      <VirtualRemote
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
    </main>
  );
}
