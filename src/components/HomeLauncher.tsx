import React, { useState, useEffect, useRef } from 'react';
import { LauncherSettings, AppItem } from '../types';
import { BrandIcons, AppIcon } from './BrandIcons';
import { BackgroundView } from './BackgroundView';
import { getAppBackdrop } from '../services/backdropGenerator';
import { soundService } from '../services/sound';
import { weatherService, WeatherData } from '../services/weather';
import {
  Tv,
  Grid,
  Settings as SettingsIcon,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  CloudLightning,
  CloudFog,
  Download,
} from 'lucide-react';

interface HomeLauncherProps {
  settings: LauncherSettings;
  apps: AppItem[];
  onOpenView: (view: 'inputs' | 'all-apps' | 'appearance' | 'install-apk' | 'location') => void;
  onLaunchApp: (app: AppItem) => void;
  isMiniPreview?: boolean;
  isModalOpen?: boolean;
  focusedZoneOverride?: 'dock' | 'top';
  focusedIndexOverride?: number;
}

export const HomeLauncher: React.FC<HomeLauncherProps> = ({
  settings,
  apps,
  onOpenView,
  onLaunchApp,
  isMiniPreview = false,
  isModalOpen = false,
}) => {
  // Navigation State for TV Remote / Keyboard
  const [focusArea, setFocusArea] = useState<'dock' | 'top'>('dock');
  const [focusedDockIndex, setFocusedDockIndex] = useState<number>(0);
  const [focusedTopIndex, setFocusedTopIndex] = useState<number>(0);

  const dockRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dockContainerRef = useRef<HTMLDivElement | null>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState<string>('10:10');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Weather state (read-only display on home screen)
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = () => {
      weatherService
        .getWeather(
          settings.tempUnit || 'F',
          settings.weatherLat,
          settings.weatherLon,
          settings.weatherCity
        )
        .then((data) => {
          if (isMounted) setWeather(data);
        })
        .catch(() => {});
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(weatherTimer);
    };
  }, [settings.tempUnit, settings.weatherLat, settings.weatherLon, settings.weatherCity]);

  const dockApps = apps.filter((a) => a.inDock);
  const isDockOverflowing = dockApps.length > 6;

  // Auto-scroll dock horizontally when remote moves focus across dock apps
  useEffect(() => {
    if (focusArea === 'dock') {
      const el = dockRefs.current[focusedDockIndex];
      const container = dockContainerRef.current;
      if (el && container) {
        const elLeft = el.offsetLeft;
        const elWidth = el.offsetWidth;
        const containerWidth = container.clientWidth;
        const targetLeft = elLeft - (containerWidth / 2) + (elWidth / 2);
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [focusedDockIndex, focusArea]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Check if 24-hour time should be used:
      // 1. Explicit '24h' setting
      // 2. Default ('auto'): Query Android system setting or browser/locale
      let is24h = settings.clockFormat === '24h';
      if (!settings.clockFormat || settings.clockFormat === 'auto') {
        try {
          const bridge = (window as any).AndroidBridge;
          if (bridge && typeof bridge.is24HourFormat === 'function') {
            is24h = !!bridge.is24HourFormat();
          } else {
            // Fallback to browser/device locale preference
            const hour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
            is24h = hour12 === false;
          }
        } catch {
          is24h = false;
        }
      }

      if (is24h) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        setCurrentTime(`${hours}:${minutes}`);
      } else {
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        hours = hours % 12 || 12;
        setCurrentTime(`${hours}:${minutes}`);
      }
      setCurrentDate(
        now.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 5000);
    return () => clearInterval(timer);
  }, [settings.clockFormat]);

  const isTvOrNative =
    typeof window !== 'undefined' &&
    (!!(window as any).AndroidBridge?.isNative?.() ||
      /Android|AFT|GoogleTV|SmartTV|AppleTV|HbbTV|CrKey/i.test(navigator.userAgent));

  const showInputs = !!settings.showInputs;
  const topNavItems: Array<{
    id: 'inputs' | 'all-apps' | 'install-apk' | 'appearance';
    label: string;
    icon: React.ReactNode;
  }> = [
    ...(showInputs
      ? [{ id: 'inputs' as const, label: 'Inputs', icon: <Tv className="w-4 h-4" /> }]
      : []),
    { id: 'all-apps' as const, label: 'All apps', icon: <Grid className="w-4 h-4" /> },
    ...(!isTvOrNative
      ? [{ id: 'install-apk' as const, label: 'Install APK', icon: <Download className="w-4 h-4" /> }]
      : []),
    { id: 'appearance' as const, label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  // Handle D-pad navigation on the home launcher (only active when not mini preview)
  useEffect(() => {
    if (isMiniPreview || isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
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
        e.keyCode === 27 ||
        e.keyCode === 4;

      if (isRight || isLeft || isUp || isDown) {
        if (
          document.activeElement &&
          document.activeElement instanceof HTMLElement &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA'
        ) {
          document.activeElement.blur();
        }
      }

      if (isRight) {
        e.preventDefault();
        soundService.playMove();
        if (focusArea === 'dock') {
          setFocusedDockIndex((prev) => Math.min(dockApps.length - 1, prev + 1));
        } else {
          setFocusedTopIndex((prev) => Math.min(topNavItems.length - 1, prev + 1));
        }
      } else if (isLeft) {
        e.preventDefault();
        soundService.playMove();
        if (focusArea === 'dock') {
          setFocusedDockIndex((prev) => Math.max(0, prev - 1));
        } else {
          setFocusedTopIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (isUp) {
        e.preventDefault();
        if (focusArea === 'dock') {
          soundService.playMove();
          setFocusArea('top');
          // Intelligently select the closest top bar item
          if (focusedDockIndex >= Math.floor(dockApps.length / 2)) {
            setFocusedTopIndex(topNavItems.length - 1);
          } else {
            setFocusedTopIndex(0);
          }
        }
      } else if (isDown) {
        e.preventDefault();
        if (focusArea === 'top') {
          soundService.playMove();
          setFocusArea('dock');
        }
      } else if (isBack) {
        if (focusArea === 'top') {
          e.preventDefault();
          soundService.playMove();
          setFocusArea('dock');
        }
      } else if (isSelect) {
        e.preventDefault();
        soundService.playSelect();
        if (focusArea === 'dock') {
          const app = dockApps[focusedDockIndex];
          if (app) onLaunchApp(app);
        } else {
          const selectedNav = topNavItems[focusedTopIndex];
          if (selectedNav) {
            onOpenView(selectedNav.id);
          }
        }
      } else if (e.key.toLowerCase() === 'i' && showInputs) {
        e.preventDefault();
        soundService.playSelect();
        onOpenView('inputs');
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        soundService.playSelect();
        onOpenView('all-apps');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        soundService.playSelect();
        onOpenView('appearance');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMiniPreview,
    focusArea,
    focusedDockIndex,
    focusedTopIndex,
    dockApps,
    topNavItems,
    showInputs,
    onLaunchApp,
    onOpenView,
  ]);

  useEffect(() => {
    const handleHomeBack = () => {
      if (focusArea === 'top') {
        soundService.playMove();
        setFocusArea('dock');
      }
    };
    window.addEventListener('chromecast-home-back', handleHomeBack);
    return () => window.removeEventListener('chromecast-home-back', handleHomeBack);
  }, [focusArea]);

  // Style class getters based on user settings
  const materialClass = `material-${settings.material}`;
  const focusClass = `focus-${settings.focus}`;

  // Safe zone overscan margin calculation for TV
  // Standard TV safe zone is 5% (~60-80px on 1080p, 120-160px on 4K) to prevent bezel clipping
  const safeZonePadding = isMiniPreview
    ? 'p-4'
    : settings.safeZone === 0
    ? 'px-6 py-4 md:px-10 md:py-6'
    : settings.safeZone === 3
    ? 'px-8 py-5 md:px-12 md:py-7'
    : 'px-10 py-6 md:px-16 md:py-8';

  // Helper to render weather icon
  const getWeatherIcon = (type?: string, isMini?: boolean) => {
    const iconSize = isMini ? 'w-3 h-3' : 'w-3.5 h-3.5 md:w-4 md:h-4';
    switch (type) {
      case 'sunny':
        return <Sun className={`${iconSize} text-amber-300 shrink-0`} />;
      case 'partly-cloudy':
        return <CloudSun className={`${iconSize} text-amber-300 shrink-0`} />;
      case 'cloudy':
        return <Cloud className={`${iconSize} text-blue-200 shrink-0`} />;
      case 'rainy':
        return <CloudRain className={`${iconSize} text-blue-300 shrink-0`} />;
      case 'snowy':
        return <Snowflake className={`${iconSize} text-sky-200 shrink-0`} />;
      case 'thunder':
        return <CloudLightning className={`${iconSize} text-yellow-300 shrink-0`} />;
      case 'fog':
        return <CloudFog className={`${iconSize} text-gray-300 shrink-0`} />;
      default:
        return <CloudSun className={`${iconSize} text-amber-300 shrink-0`} />;
    }
  };

  // Dynamic highlight-reactive backdrop calculation (off by default)
  const isDynamicEnabled = !!settings.dynamicAppBackgrounds;
  const currentFocusedApp =
    focusArea === 'dock' && dockApps[focusedDockIndex] ? dockApps[focusedDockIndex] : null;
  const activeBackdropUrl =
    isDynamicEnabled && currentFocusedApp
      ? getAppBackdrop(currentFocusedApp, settings.appBackdrops)
      : undefined;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
        isMiniPreview ? 'rounded-2xl shadow-2xl border border-white/10' : ''
      }`}
      style={{
        fontFamily:
          settings.font === 'System'
            ? 'sans-serif'
            : `'${settings.font}', sans-serif`,
      }}
    >
      {/* Background layer */}
      <BackgroundView
        preset={settings.background}
        customUrl={settings.customBgUrl}
        activeBackdropUrl={activeBackdropUrl}
      />

      {/* Launcher Content Container with TV Overscan Safe Area */}
      <div className={`relative z-10 w-full h-full flex flex-col justify-between ${safeZonePadding}`}>
        {/* Top Bar Row: Clock on left, Controls on right */}
        <header className="flex items-start justify-between w-full pt-1">
          {/* Time & Weather Stacked on the Left */}
          <div className="flex flex-col items-start">
            <div className="flex items-baseline gap-3 md:gap-4">
              <span
                className={`font-extrabold tracking-tight text-white drop-shadow-lg tabular-nums leading-none ${
                  isMiniPreview ? 'text-lg' : 'text-3xl md:text-5xl lg:text-6xl'
                }`}
              >
                {currentTime}
              </span>
              {settings.showDate && !isMiniPreview && (
                <span className="text-sm md:text-base font-semibold text-white/70 tracking-wider">
                  {currentDate}
                </span>
              )}
            </div>

            {/* Ambient weather display in two rows under the time:
                Row 1: Hi Lo under Time
                Row 2: Weather icon with current temp
            */}
            {settings.showWeather !== false && (weather || settings.weatherCity) && (
              <div
                className={`flex flex-col items-start select-none ${
                  isMiniPreview ? 'mt-1 space-y-0.5' : 'mt-1.5 md:mt-2 space-y-0.5 md:space-y-1'
                }`}
              >
                {/* Weather Row 1: Hi Lo under the Time */}
                {weather && weather.high !== undefined && weather.low !== undefined && !isMiniPreview ? (
                  <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-white/85 tracking-wide tabular-nums drop-shadow-md">
                    <span className="text-amber-300 font-bold">H: {weather.high}°</span>
                    <span className="text-sky-300 font-bold">L: {weather.low}°</span>
                    {settings.weatherCity && (
                      <>
                        <span className="text-white/30">·</span>
                        <span className="text-white/60 font-medium text-xs">
                          {settings.weatherCity.split(',')[0]}
                        </span>
                      </>
                    )}
                  </div>
                ) : null}

                {/* Weather Row 2: Weather icon with current temp */}
                <div
                  className={`flex items-center gap-2 text-white drop-shadow-md ${
                    isMiniPreview ? 'text-[10px]' : 'text-xs md:text-sm'
                  }`}
                >
                  {weather ? (
                    <>
                      {getWeatherIcon(weather.iconType, isMiniPreview)}
                      <span className="font-bold text-white tabular-nums tracking-tight">
                        {weather.temperature}°{settings.tempUnit || 'F'}
                      </span>
                      {weather.condition && !isMiniPreview && (
                        <span className="text-white/65 text-xs md:text-sm font-medium capitalize">
                          {weather.condition}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs text-white/70 font-medium">
                        {settings.weatherCity ? settings.weatherCity.split(',')[0] : 'Weather'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top Controls on the right (All apps, Settings) */}
          <nav className="flex items-center gap-2 md:gap-3">
            {topNavItems.map((item, idx) => {
              const isItemFocused =
                focusArea === 'top' && focusedTopIndex === idx && !isMiniPreview;
              const isIconsOnlyTop = settings.homeControls === 'icons';

              return (
                <button
                  key={item.id}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    soundService.playSelect();
                    onOpenView(item.id);
                  }}
                  onMouseEnter={() => {
                    if (!isMiniPreview) {
                      setFocusArea('top');
                      setFocusedTopIndex(idx);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer rounded-2xl outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                    isIconsOnlyTop
                      ? 'p-2.5 md:p-3'
                      : 'px-3.5 md:px-5 py-2 md:py-2.5 text-xs md:text-sm'
                  } tracking-wide ${
                    isItemFocused
                      ? 'text-slate-900 bg-white shadow-[0_0_35px_rgba(255,255,255,0.8)] scale-105 font-bold ring-4 ring-white z-20'
                      : 'text-white/80 bg-white/10 hover:text-white hover:bg-white/20 font-semibold border border-white/15'
                  }`}
                >
                  {(settings.homeControls === 'icons' || settings.homeControls === 'both') &&
                    item.icon}
                  {settings.homeControls !== 'icons' && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Center space (can show currently focused title in minimal layout) */}
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          {settings.layout === 'minimal' && !isMiniPreview && (
            <div className="text-center opacity-80">
              <span className="text-xs uppercase tracking-widest text-white/50">Playing on Chromecast</span>
              <h2 className="text-2xl font-light text-white tracking-wide mt-1">
                {dockApps[focusedDockIndex]?.name || 'Chromecast 4K'}
              </h2>
            </div>
          )}
        </div>

        {/* Bottom Section: The Floating Frosted Glass Dock with Smooth Horizontal Scroll */}
        <div className="w-full flex flex-col items-center pb-2 md:pb-4 max-w-full overflow-hidden">
          <div
            ref={dockContainerRef}
            className={`max-w-[94vw] overflow-x-auto no-scrollbar scroll-smooth flex items-center ${
              isMiniPreview
                ? `px-3 py-2 rounded-xl ${materialClass}`
                : settings.layout === 'compact'
                ? `px-4 py-2.5 rounded-2xl ${materialClass} shadow-xl`
                : settings.layout === 'grid'
                ? `grid grid-cols-6 gap-3.5 md:gap-4 p-5 md:p-6 rounded-3xl ${materialClass} shadow-2xl`
                : `px-4 md:px-6 py-3.5 md:py-4 rounded-2xl md:rounded-3xl ${materialClass} shadow-2xl`
            }`}
          >
            <div
              className={`flex items-center gap-3 md:gap-4 overflow-visible py-2 px-4 md:px-6 ${
                isDockOverflowing ? 'w-max justify-start' : 'min-w-full justify-center'
              }`}
            >
              {dockApps.map((app, index) => {
                const IconComponent = BrandIcons[app.iconType] || BrandIcons.generic;
                const isFocused =
                  focusArea === 'dock' && focusedDockIndex === index && !isMiniPreview;

                const isIconsOnly = settings.apps === 'icons-only';
                const isTextOnly = settings.apps === 'text-only';

                const buttonSizeClass = isMiniPreview
                  ? isIconsOnly
                    ? 'w-8 h-8 p-1'
                    : 'w-10 h-10 p-1'
                  : isIconsOnly
                  ? 'w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 p-2.5 md:p-3'
                  : isTextOnly
                  ? 'px-5 py-3 md:px-6 md:py-3.5'
                  : 'w-18 h-22 md:w-22 md:h-26 lg:w-26 lg:h-30 p-2.5 md:p-3';

                const iconContainerSize = isMiniPreview
                  ? 'w-4 h-4'
                  : isIconsOnly
                  ? 'w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16'
                  : 'w-9 h-9 md:w-12 md:h-12 lg:w-14 lg:h-14';

                const iconSize = isMiniPreview
                  ? 'w-3.5 h-3.5'
                  : isIconsOnly
                  ? 'w-10 h-10 md:w-13 md:h-13 lg:w-15 lg:h-15'
                  : 'w-8 h-8 md:w-11 md:h-11 lg:w-13 lg:h-13';

                return (
                  <button
                    key={app.id}
                    ref={(el) => {
                      dockRefs.current[index] = el;
                    }}
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      soundService.playSelect();
                      onLaunchApp(app);
                    }}
                    onMouseEnter={() => {
                      if (!isMiniPreview) {
                        setFocusArea('dock');
                        setFocusedDockIndex(index);
                        soundService.playMove();
                      }
                    }}
                    className={`shrink-0 relative flex flex-col items-center justify-center cursor-pointer rounded-2xl md:rounded-3xl outline-none focus:outline-none focus-visible:outline-none focus:ring-0 transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out transform-gpu origin-center ${buttonSizeClass} ${
                      isFocused
                        ? `${focusClass} z-10`
                        : 'bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.08] text-white/80'
                    }`}
                  >
                    {/* App Brand Icon */}
                    {!isTextOnly && (
                      <div
                        className={`flex items-center justify-center transition-transform duration-150 transform-gpu ${
                          isFocused ? 'scale-105' : ''
                        } ${iconContainerSize}`}
                      >
                        <AppIcon
                          app={app}
                          styleMode={settings.iconStyle || 'stock'}
                          className={iconSize}
                        />
                      </div>
                    )}

                    {/* App Name Label ("Icons and text" setting) */}
                    {!isIconsOnly && (
                      <span
                        className={`tracking-normal font-semibold truncate max-w-full text-center transition-colors duration-150 ${
                          isMiniPreview
                            ? 'text-[8px] mt-0.5'
                            : 'text-xs md:text-sm lg:text-base mt-1.5 md:mt-2'
                        } ${
                          isFocused
                            ? 'text-white'
                            : 'text-white/70'
                        }`}
                      >
                        {app.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
