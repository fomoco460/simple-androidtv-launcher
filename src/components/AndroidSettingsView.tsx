import { pushKeyOwner } from '../services/keyGate';
import React, { useState, useEffect, useRef } from 'react';
import { soundService } from '../services/sound';
import {
  Settings,
  Wifi,
  Tv,
  Bluetooth,
  LayoutGrid,
  Info,
  Clock,
  Terminal,
  Copy,
  Check,
  Smartphone,
  ChevronRight,
  ShieldAlert,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';

export interface SettingCategory {
  id: string;
  name: string;
  description: string;
  intent: string;
  androidAction?: string;
  adbCommand: string;
  icon: React.ReactNode;
}

export const ANDROID_SETTINGS_LIST: SettingCategory[] = [
  {
    id: 'system',
    name: 'All Android Settings',
    description: 'Main Chromecast 4K Google TV settings menu',
    intent: 'intent:#Intent;action=android.settings.SETTINGS;end',
    androidAction: 'android.settings.SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.SETTINGS',
    icon: <Settings className="w-5 h-5 text-sky-400" />,
  },
  {
    id: 'wifi',
    name: 'Network & Internet',
    description: 'Wi-Fi networks, IP address, proxy, and data saver',
    intent: 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end',
    androidAction: 'android.settings.WIFI_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.WIFI_SETTINGS',
    icon: <Wifi className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: 'display',
    name: 'Display & Sound',
    description: 'Resolution, match content frame rate, HDR & audio output',
    intent: 'intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end',
    androidAction: 'android.settings.DISPLAY_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.DISPLAY_SETTINGS',
    icon: <Tv className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'remotes',
    name: 'Remotes & Accessories',
    description: 'Pair Chromecast voice remote, Bluetooth headphones & gamepads',
    intent: 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end',
    androidAction: 'android.settings.BLUETOOTH_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.BLUETOOTH_SETTINGS',
    icon: <Bluetooth className="w-5 h-5 text-indigo-400" />,
  },
  {
    id: 'apps',
    name: 'Apps & App Info',
    description: 'Manage installed applications, permissions, cache, and restricted settings',
    intent: 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;end',
    androidAction: 'android.settings.APPLICATION_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.APPLICATION_SETTINGS',
    icon: <LayoutGrid className="w-5 h-5 text-fuchsia-400" />,
  },
  {
    id: 'about',
    name: 'System About (Build Version)',
    description: 'Click Android TV OS Build 7 times to enable Developer Options',
    intent: 'intent:#Intent;action=android.settings.DEVICE_INFO_SETTINGS;end',
    androidAction: 'android.settings.DEVICE_INFO_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.DEVICE_INFO_SETTINGS',
    icon: <Info className="w-5 h-5 text-teal-400" />,
  },
  {
    id: 'datetime',
    name: 'Date & Time',
    description: 'Automatic network-provided time, 24-hour format, and time zone',
    intent: 'intent:#Intent;action=android.settings.DATE_SETTINGS;end',
    androidAction: 'android.settings.DATE_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.DATE_SETTINGS',
    icon: <Clock className="w-5 h-5 text-rose-400" />,
  },
  {
    id: 'dev',
    name: 'Developer Options',
    description: 'USB debugging, animation duration scale, and background limits',
    intent: 'intent:#Intent;action=android.settings.APPLICATION_DEVELOPMENT_SETTINGS;end',
    androidAction: 'android.settings.APPLICATION_DEVELOPMENT_SETTINGS',
    adbCommand: 'adb shell am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS',
    icon: <Terminal className="w-5 h-5 text-yellow-400" />,
  },
  {
    id: 'accessibility',
    name: 'Accessibility (Home Button Interceptor)',
    description: 'Routes remote Home button to Clean Launcher; bypasses Google TV stock home',
    intent: 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end',
    androidAction: 'android.settings.ACCESSIBILITY_SETTINGS',
    adbCommand:
      'adb shell appops set com.chromecast.cleanlauncher ACCESS_RESTRICTED_SETTINGS allow && adb shell settings put secure enabled_accessibility_services com.chromecast.cleanlauncher/com.chromecast.cleanlauncher.LauncherAccessibilityService && adb shell settings put secure accessibility_enabled 1 && adb shell pm grant com.chromecast.cleanlauncher android.permission.WRITE_SECURE_SETTINGS',
    icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
  },
];

/** Opens one Android system settings screen through the native bridge (or an intent link in a browser). */
export function launchAndroidSetting(item: SettingCategory): void {
  const bridge = (window as any).AndroidBridge;
  try {
    if (bridge) {
      if (typeof bridge.openSettings === 'function' && item.androidAction) {
        bridge.openSettings(item.androidAction);
        return;
      }
      if (typeof bridge.openAndroidSettings === 'function') {
        bridge.openAndroidSettings();
        return;
      }
    }
    window.location.href = item.intent;
  } catch {
    /* nothing else to try */
  }
}

interface AndroidSettingsViewProps {
  /** Open the Home button interceptor assistant straight away. */
  startWithInterceptor?: boolean;
  onBack?: () => void;
}

export const AndroidSettingsView: React.FC<AndroidSettingsViewProps> = ({ onBack, startWithInterceptor = false }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showInterceptorModal, setShowInterceptorModal] = useState<boolean>(startWithInterceptor);
  const [modalFocusIndex, setModalFocusIndex] = useState<number>(0);

  const [isA11yActive, setIsA11yActive] = useState<boolean>(() => {
    try {
      const bridge = (window as any).AndroidBridge;
      return !!(bridge?.isAccessibilityRunning?.() ?? bridge?.isAccessibilityServiceEnabled?.());
    } catch {
      return false;
    }
  });

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const modalButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const checkA11y = () => {
    try {
      const bridge = (window as any).AndroidBridge;
      const active = !!(bridge?.isAccessibilityRunning?.() ?? bridge?.isAccessibilityServiceEnabled?.());
      setIsA11yActive(active);
      return active;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    checkA11y();
    const interval = setInterval(checkA11y, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll when remote moves up or down
  useEffect(() => {
    if (!showInterceptorModal) {
      rowRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex, showInterceptorModal]);

  const getBridge = () => {
    return (window as unknown as {
      AndroidBridge?: {
        openSettings?: (action: string) => void;
        openAndroidSettings?: () => void;
        restoreAccessibilityService?: () => boolean;
        openAccessibilitySettings?: () => void;
        openAppDetails?: () => void;
      };
    }).AndroidBridge;
  };

  const handleLaunch = (item: SettingCategory) => {
    soundService.playSelect();
    const bridge = getBridge();

    if (item.id === 'accessibility') {
      // Open the dedicated Interceptor Assistant modal
      setShowInterceptorModal(true);
      setModalFocusIndex(0);
      return;
    }

    try {
      if (bridge) {
        if (typeof bridge.openSettings === 'function' && item.androidAction) {
          bridge.openSettings(item.androidAction);
          setStatusNotice(`Opened ${item.name}`);
          return;
        } else if (typeof bridge.openAndroidSettings === 'function') {
          bridge.openAndroidSettings();
          setStatusNotice(`Opened Android Settings`);
          return;
        }
      }

      window.location.href = item.intent;
      setStatusNotice(`Invoked ${item.name} intent on Chromecast`);
    } catch {
      setStatusNotice(`Intent dispatched: ${item.intent}`);
    }
  };

  // Back closes the open dialog, or goes one page back. It never jumps to Home: the Android side sends
  // Back as a 'chromecast-back-press' event plus an Escape key press, and the first one is swallowed here.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  useEffect(() => {
    return pushKeyOwner(
      (e) => {
        if (e.type === 'chromecast-back-press') {
          e.stopImmediatePropagation();
          return;
        }
        const k = e as KeyboardEvent;
        if (k.key === 'Escape' || k.key === 'Back' || k.key === 'GoBack' || k.keyCode === 27 || k.keyCode === 4) {
          k.preventDefault();
          k.stopImmediatePropagation();
          soundService.playBack();
          if (showInterceptorModal) {
            setShowInterceptorModal(false);
            if (startWithInterceptor) onBackRef.current?.(); // opened straight from Settings: go back there
          } else onBackRef.current?.();
        }
        // any other key carries on to the list below
      },
      ['keydown', 'chromecast-back-press'],
    );
  }, [showInterceptorModal, startWithInterceptor]);

  // Keyboard remote navigation for main settings list
  useEffect(() => {
    if (showInterceptorModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isUp =
        e.key === 'ArrowUp' || e.key === 'Up' || e.keyCode === 38 || e.keyCode === 19;
      const isDown =
        e.key === 'ArrowDown' || e.key === 'Down' || e.keyCode === 40 || e.keyCode === 20;
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
        e.keyCode === 4 ||
        e.keyCode === 8;

      if (isUp) {
        e.preventDefault();
        soundService.playMove();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();
        setSelectedIndex((prev) => Math.min(ANDROID_SETTINGS_LIST.length - 1, prev + 1));
      } else if (isSelect) {
        e.preventDefault();
        const item = ANDROID_SETTINGS_LIST[selectedIndex];
        if (item) handleLaunch(item);
      } else if (isBack) {
        if (onBack) {
          e.preventDefault();
          soundService.playBack();
          onBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, onBack, showInterceptorModal]);

  // Keyboard remote navigation inside the Interceptor Assistant modal
  // Total interactive actions: 5 (0: Step 1, 1: Step 2, 2: Step 3, 3: Auto-restore, 4: Copy ADB, 5: Close)
  const MODAL_ACTIONS_COUNT = 6;
  useEffect(() => {
    if (!showInterceptorModal) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      const isUp =
        e.key === 'ArrowUp' || e.key === 'Up' || e.keyCode === 38 || e.keyCode === 19;
      const isDown =
        e.key === 'ArrowDown' || e.key === 'Down' || e.keyCode === 40 || e.keyCode === 20;
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
        e.keyCode === 4 ||
        e.keyCode === 8;

      if (isUp) {
        e.preventDefault();
        soundService.playMove();
        setModalFocusIndex((prev) => Math.max(0, prev - 1));
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();
        setModalFocusIndex((prev) => Math.min(MODAL_ACTIONS_COUNT - 1, prev + 1));
      } else if (isBack) {
        e.preventDefault();
        soundService.playBack();
        setShowInterceptorModal(false);
      } else if (isSelect) {
        e.preventDefault();
        soundService.playSelect();
        const bridge = getBridge();

        if (modalFocusIndex === 0) {
          // Step 1: Open Accessibility to trigger restricted settings dialog
          bridge?.openAccessibilitySettings?.();
          setStatusNotice('Opened Accessibility. Click Interceptor, then click OK on popup.');
        } else if (modalFocusIndex === 1) {
          // Step 2: Open App Info directly to allow restricted settings
          bridge?.openAppDetails?.();
          setStatusNotice('Opened App Info. Click top-right 3-dots, then Allow restricted settings.');
        } else if (modalFocusIndex === 2) {
          // Step 3: Open Accessibility to turn switch ON
          bridge?.openAccessibilitySettings?.();
          setStatusNotice('Opened Accessibility. Toggle the Interceptor switch ON!');
        } else if (modalFocusIndex === 3) {
          // Auto-restore / Check status
          const restored = bridge?.restoreAccessibilityService?.();
          const active = checkA11y();
          if (restored || active) {
            setIsA11yActive(true);
            setStatusNotice('Interceptor is Active!');
          } else {
            setStatusNotice('Service not active yet. Follow Step 1 & 2 or use ADB command.');
          }
        } else if (modalFocusIndex === 4) {
          // Copy ADB command
          const item = ANDROID_SETTINGS_LIST.find((s) => s.id === 'accessibility');
          if (item) {
            navigator.clipboard.writeText(item.adbCommand);
            setCopiedId('modal-adb');
            setTimeout(() => setCopiedId(null), 3000);
            setStatusNotice('ADB command copied to clipboard');
          }
        } else if (modalFocusIndex === 5) {
          // Close modal
          setShowInterceptorModal(false);
          if (startWithInterceptor) onBackRef.current?.();
        }
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [showInterceptorModal, modalFocusIndex]);

  return (
    <div className="w-full flex flex-col space-y-2.5">
      {/* Informational banner about Chromecast 4K intent integration */}
      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200/90 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-[11px] text-sky-200/80 leading-tight">
            Select any setting with your remote to open the native Chromecast 4K system menu.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-zinc-400">Home Interceptor:</span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
              isA11yActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {isA11yActive ? 'Active' : 'Setup Required'}
          </span>
        </div>
      </div>

      {/* List of Android Settings */}
      <div className="space-y-1.5 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
        {ANDROID_SETTINGS_LIST.map((item, idx) => {
          const isSelected = selectedIndex === idx;

          return (
            <div
              key={item.id}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              onClick={() => {
                setSelectedIndex(idx);
                handleLaunch(item);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`p-2 px-3 rounded-xl cursor-pointer transition-all duration-150 border flex items-center justify-between ${
                isSelected
                  ? 'bg-white text-slate-900 border-white shadow-xl scale-[1.01] ring-2 ring-white/90 z-10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isSelected ? 'bg-slate-100' : 'bg-black/30'
                  }`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="font-semibold text-xs tracking-tight">{item.name}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      isSelected ? 'text-slate-600' : 'text-white/50'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {/* Clean Action Indicator */}
              <div className="flex items-center gap-2">
                {item.id === 'accessibility' && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isA11yActive
                        ? isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : isSelected
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {isA11yActive ? 'Active' : 'Setup Required'}
                  </span>
                )}
                <span
                  className={`text-[11px] font-semibold ${
                    isSelected ? 'text-slate-800' : 'text-sky-300'
                  }`}
                >
                  {item.id === 'accessibility' ? (isA11yActive ? 'Manage' : 'Fix / Enable') : 'Open'}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-slate-900' : 'text-white/40'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {statusNotice && (
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-center">
          {statusNotice}
        </div>
      )}

      {/* ============================================================ */}
      {/* Interactive Home Button Interceptor Setup Assistant Modal     */}
      {/* Explains Android 13/14 Restricted Settings & 1-Click Fixes   */}
      {/* ============================================================ */}
      {showInterceptorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none animate-fade-in">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-sky-950/60 via-zinc-900 to-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    Home Button Interceptor Setup Assistant
                  </h2>
                  <p className="text-[10px] text-zinc-400">
                    Fix & enable Home button routing to Clean Launcher on Android TV 12, 13 & 14
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    isA11yActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isA11yActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isA11yActive ? 'Active & Ready' : 'Restricted by Android OS'}
                </span>
                <button
                  onClick={() => setShowInterceptorModal(false)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 text-white text-xs">
              {/* Why it won't enable notice */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px] leading-snug">
                  <span className="font-bold text-amber-300">Why does Android block this switch?</span>
                  <p className="text-zinc-300 text-[10px]">
                    Google TV and Android 13/14 lock sideloaded apps under <strong>Restricted Settings</strong> by default.
                    When you click the toggle, Android shows <em>"Restricted setting - For your security..."</em> until allowed once.
                  </p>
                </div>
              </div>

              {/* Method 1: Remote-Only Setup (No computer) */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Play className="w-3 h-3" />
                  <span>Option 1: Fix Directly on TV (2-Step Remote Setup)</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {/* Step 1 */}
                  <button
                    ref={(el) => {
                      modalButtonRefs.current[0] = el;
                    }}
                    onClick={() => {
                      soundService.playSelect();
                      getBridge()?.openAccessibilitySettings?.();
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      modalFocusIndex === 0
                        ? 'bg-sky-500 text-slate-950 font-bold border-white ring-2 ring-white scale-[1.01]'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px]">Step 1: Open Accessibility (Trigger Security Popup)</div>
                      <div className={`text-[10px] ${modalFocusIndex === 0 ? 'text-slate-800' : 'text-zinc-400'}`}>
                        Click "Clean Launcher Interceptor". When Android shows "Restricted setting", click <strong>OK</strong>.
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold underline shrink-0 ml-2">Open Accessibility &gt;</span>
                  </button>

                  {/* Step 2 */}
                  <button
                    ref={(el) => {
                      modalButtonRefs.current[1] = el;
                    }}
                    onClick={() => {
                      soundService.playSelect();
                      getBridge()?.openAppDetails?.();
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      modalFocusIndex === 1
                        ? 'bg-amber-500 text-slate-950 font-bold border-white ring-2 ring-white scale-[1.01]'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px]">Step 2: Open App Info (Allow Restricted Settings)</div>
                      <div className={`text-[10px] ${modalFocusIndex === 1 ? 'text-slate-800' : 'text-zinc-400'}`}>
                        In App Info, select the <strong>three-dots menu in top right</strong> (or bottom option) and click <strong>Allow restricted settings</strong>.
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold underline shrink-0 ml-2">Open App Info &gt;</span>
                  </button>

                  {/* Step 3 */}
                  <button
                    ref={(el) => {
                      modalButtonRefs.current[2] = el;
                    }}
                    onClick={() => {
                      soundService.playSelect();
                      getBridge()?.openAccessibilitySettings?.();
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      modalFocusIndex === 2
                        ? 'bg-emerald-500 text-slate-950 font-bold border-white ring-2 ring-white scale-[1.01]'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px]">Step 3: Open Accessibility (Turn Switch ON)</div>
                      <div className={`text-[10px] ${modalFocusIndex === 2 ? 'text-slate-800' : 'text-zinc-400'}`}>
                        The switch is now unlocked! Turn "Clean Launcher Home Button Interceptor" <strong>ON</strong>.
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold underline shrink-0 ml-2">Turn ON &gt;</span>
                  </button>
                </div>
              </div>

              {/* Method 2: Instant 1-Command ADB Setup */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3" />
                    <span>Option 2: 1-Line ADB Setup (Instant from PC / Phone)</span>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-normal">Bypasses all menus in 2 seconds</span>
                </div>

                <div className="p-2 rounded-xl bg-black/70 border border-white/10 font-mono text-[9px] text-zinc-300 overflow-x-auto select-all leading-tight">
                  adb shell appops set com.chromecast.cleanlauncher ACCESS_RESTRICTED_SETTINGS allow && adb shell settings put secure enabled_accessibility_services com.chromecast.cleanlauncher/com.chromecast.cleanlauncher.LauncherAccessibilityService && adb shell settings put secure accessibility_enabled 1 && adb shell pm grant com.chromecast.cleanlauncher android.permission.WRITE_SECURE_SETTINGS
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    ref={(el) => {
                      modalButtonRefs.current[3] = el;
                    }}
                    onClick={() => {
                      soundService.playSelect();
                      const restored = getBridge()?.restoreAccessibilityService?.();
                      const active = checkA11y();
                      if (restored || active) {
                        setIsA11yActive(true);
                        setStatusNotice('Active!');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      modalFocusIndex === 3
                        ? 'bg-white text-slate-900 border-white ring-2 ring-white scale-105 font-bold'
                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Check Status / Auto-Enable</span>
                  </button>

                  <button
                    ref={(el) => {
                      modalButtonRefs.current[4] = el;
                    }}
                    onClick={() => {
                      soundService.playSelect();
                      const item = ANDROID_SETTINGS_LIST.find((s) => s.id === 'accessibility');
                      if (item) {
                        navigator.clipboard.writeText(item.adbCommand);
                        setCopiedId('modal-adb');
                        setTimeout(() => setCopiedId(null), 3000);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      modalFocusIndex === 4
                        ? 'bg-cyan-500 text-slate-950 border-white ring-2 ring-white scale-105 font-bold'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    }`}
                  >
                    {copiedId === 'modal-adb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'modal-adb' ? 'Copied to Clipboard!' : 'Copy Full ADB Command'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-zinc-400">
              <span />
              <button
                ref={(el) => {
                  modalButtonRefs.current[5] = el;
                }}
                onClick={() => setShowInterceptorModal(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  modalFocusIndex === 5
                    ? 'bg-white text-slate-950 ring-2 ring-white scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
