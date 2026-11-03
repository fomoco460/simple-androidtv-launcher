import React, { useState, useEffect } from 'react';
import {
  Download,
  Tv,
  Check,
  Copy,
  Smartphone,
  Terminal,
  ShieldCheck,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';
import { soundService } from '../services/sound';

const RELEASE_APK_URL =
  'https://github.com/fomoco460/simple-androidtv-launcher/releases/latest/download/clean-launcher-tv.apk';

interface InstallApkModalProps {
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallApkModal: React.FC<InstallApkModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'downloader' | 'adb' | 'pwa'>('downloader');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  // APKs are distributed through GitHub Releases (not committed to the repo)
  const apkUrl = RELEASE_APK_URL;
  const shortApkUrl = RELEASE_APK_URL;

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setPwaInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleCopyUrl = (urlToCopy: string) => {
    soundService.playSelect();
    navigator.clipboard?.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstallPWA = async () => {
    soundService.playSelect();
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  type FocusZone = 'download' | 'download-short' | 'copy' | 'tabs' | 'footer';
  const [focusZone, setFocusZone] = useState<FocusZone>('download');
  const tabsList: Array<'downloader' | 'adb' | 'pwa'> = ['downloader', 'adb', 'pwa'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (isUp) {
        e.preventDefault();
        soundService.playMove();
        if (focusZone === 'footer') setFocusZone('tabs');
        else if (focusZone === 'tabs') setFocusZone('copy');
        else if (focusZone === 'copy') setFocusZone('download');
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();
        if (focusZone === 'download' || focusZone === 'download-short') setFocusZone('copy');
        else if (focusZone === 'copy') setFocusZone('tabs');
        else if (focusZone === 'tabs') setFocusZone('footer');
      } else if (isLeft) {
        e.preventDefault();
        soundService.playMove();
        if (focusZone === 'download-short') setFocusZone('download');
        else if (focusZone === 'tabs') {
          const idx = tabsList.indexOf(activeGuideTab);
          const prev = (idx - 1 + tabsList.length) % tabsList.length;
          setActiveGuideTab(tabsList[prev]);
        }
      } else if (isRight) {
        e.preventDefault();
        soundService.playMove();
        if (focusZone === 'download') setFocusZone('download-short');
        else if (focusZone === 'tabs') {
          const idx = tabsList.indexOf(activeGuideTab);
          const next = (idx + 1) % tabsList.length;
          setActiveGuideTab(tabsList[next]);
        }
      } else if (isSelect) {
        e.preventDefault();
        if (focusZone === 'download') {
          soundService.playSelect();
          window.open(RELEASE_APK_URL, '_blank', 'noopener,noreferrer');
        } else if (focusZone === 'download-short') {
          soundService.playSelect();
          window.open(RELEASE_APK_URL, '_blank', 'noopener,noreferrer');
        } else if (focusZone === 'copy') {
          handleCopyUrl(shortApkUrl);
        } else if (focusZone === 'footer') {
          soundService.playBack();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusZone, activeGuideTab, shortApkUrl, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Install Clean Launcher on Chromecast & Android TV</h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Milestone v3.3.4 (Build 39)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Native Leanback TV Launcher APK with reboot-persistent Home button interception, offline mode & D-pad remote controls
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-sky-500"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Milestone Release Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-sky-950/30 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                v3.3.4
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <span>Milestone Release Highlights</span>
                  <span className="text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Production Ready</span>
                </div>
                <div className="text-[11px] text-zinc-300">
                  Stock app icons · Scrolling app row · Crisp white Border focus · Persistent Home interceptor surviving reboots
                </div>
              </div>
            </div>
          </div>
          
          {/* Main APK Download Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-950 border border-sky-500/30 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-sky-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Signed TV Package (Ready to Sideload)
              </div>
              <h3 className="text-lg font-bold">clean-launcher-tv.apk</h3>
              <p className="text-xs text-zinc-300 max-w-lg">
                Full Leanback TV launcher package (~5.1 MB). Persistent Home button routing, dynamic wallpapers, local app launching, and 100% offline remote responsiveness.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <a
                href="/clean-launcher-tv.apk"
                download="clean-launcher-tv.apk"
                onClick={() => soundService.playSelect()}
                onMouseEnter={() => setFocusZone('download')}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-medium text-sm transition active:scale-95 ${
                  focusZone === 'download'
                    ? 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.7)] ring-2 ring-white scale-105'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/25'
                }`}
              >
                <Download className="w-4 h-4" />
                Download APK (5.1 MB)
              </a>

              <a
                href="/app.apk"
                download="app.apk"
                onClick={() => soundService.playSelect()}
                onMouseEnter={() => setFocusZone('download-short')}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-xs border transition active:scale-95 ${
                  focusZone === 'download-short'
                    ? 'bg-white text-slate-900 border-white shadow-lg ring-2 ring-white scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
                }`}
                title="Shorter filename for typing on TV"
              >
                Download as app.apk
              </a>
            </div>
          </div>

          {/* Quick TV Sideload Link Bar */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-zinc-300 w-full sm:w-auto">
              <span className="text-zinc-500 font-mono text-[11px] uppercase tracking-wider">TV Downloader URL:</span>
              <code className="px-2.5 py-1 rounded bg-black/60 border border-white/10 font-mono text-sky-300 text-xs select-all break-all">
                {shortApkUrl}
              </code>
            </div>
            <button
              onClick={() => handleCopyUrl(shortApkUrl)}
              onMouseEnter={() => setFocusZone('copy')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                focusZone === 'copy'
                  ? 'bg-white text-slate-900 ring-2 ring-white scale-105 font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-zinc-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied URL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>

          {/* Guide Selector Tabs */}
          <div
            className={`flex border-b gap-2 transition-all p-1 rounded-xl ${
              focusZone === 'tabs' ? 'bg-white/5 ring-1 ring-white/20' : 'border-white/10'
            }`}
          >
            <button
              onClick={() => {
                soundService.playMove();
                setActiveGuideTab('downloader');
              }}
              onMouseEnter={() => {
                setFocusZone('tabs');
                setActiveGuideTab('downloader');
              }}
              className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeGuideTab === 'downloader'
                  ? focusZone === 'tabs'
                    ? 'border-white text-white font-bold'
                    : 'border-sky-400 text-sky-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Chromecast "Downloader" Method (Recommended)
            </button>

            <button
              onClick={() => {
                soundService.playMove();
                setActiveGuideTab('adb');
              }}
              onMouseEnter={() => {
                setFocusZone('tabs');
                setActiveGuideTab('adb');
              }}
              className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeGuideTab === 'adb'
                  ? focusZone === 'tabs'
                    ? 'border-white text-white font-bold'
                    : 'border-sky-400 text-sky-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Computer "ADB" Sideload
            </button>

            <button
              onClick={() => {
                soundService.playMove();
                setActiveGuideTab('pwa');
              }}
              onMouseEnter={() => {
                setFocusZone('tabs');
                setActiveGuideTab('pwa');
              }}
              className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeGuideTab === 'pwa'
                  ? focusZone === 'tabs'
                    ? 'border-white text-white font-bold'
                    : 'border-sky-400 text-sky-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Web Browser (PWA)
            </button>
          </div>

          {/* Tab 1: Downloader App Guide (The easiest TV way) */}
          {activeGuideTab === 'downloader' && (
            <div className="space-y-4 text-xs text-zinc-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-semibold text-white text-sm">Install "Downloader"</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    On your Chromecast with Google TV, open the Play Store, search for <strong className="text-white">"Downloader by AFTVnews"</strong> and install it.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-semibold text-white text-sm">Enable Unknown Apps</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    On your TV: Go to <strong className="text-white">Settings &gt; System &gt; About</strong> and click <strong className="text-white">"Android TV OS build" 7 times</strong> to unlock Developer options. Then in <strong className="text-white">Apps &gt; Special app access &gt; Install unknown apps</strong>, toggle <strong className="text-white">Downloader</strong> to ON.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-semibold text-white text-sm">Enter URL &amp; Install</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Open Downloader on your TV, enter <code className="text-sky-300 font-mono bg-black/40 px-1 py-0.5 rounded">{shortApkUrl}</code> and click <strong className="text-white">Go</strong>. Click <strong className="text-white">Install</strong> when prompted.
                  </p>
                </div>
              </div>

              {/* Package update note */}
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-100">Updating from an earlier build?</strong> If Android TV ever shows <em>"There was a problem parsing the package"</em>, go to TV <strong>Settings &gt; Apps &gt; See all apps &gt; Clean Launcher &gt; Uninstall</strong> first, then install this clean signed build.
                </div>
              </div>

              {/* Home replacement hint */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-100">Set as your default TV launcher:</strong> Once installed, press the <strong>Home</strong> button on your Chromecast remote. Android TV will ask which launcher to use — choose <strong>Clean Launcher</strong> and select <strong>Always</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: ADB Command Line */}
          {activeGuideTab === 'adb' && (
            <div className="space-y-4 text-xs text-zinc-300">
              <p className="text-zinc-400">
                If you have a computer on the same Wi-Fi network as your Chromecast with Google TV:
              </p>

              <div className="p-4 rounded-xl bg-black/70 border border-white/10 font-mono space-y-2 text-zinc-200">
                <div className="text-zinc-500 text-[11px]"># 1. Download the APK file onto your computer</div>
                <div className="text-sky-300">curl -O {apkUrl}</div>
                <div className="text-zinc-500 text-[11px] pt-1"># 2. Connect to your Chromecast IP address (check TV Wi-Fi settings)</div>
                <div className="text-sky-300">adb connect 192.168.1.XXX:5555</div>
                <div className="text-zinc-500 text-[11px] pt-1"># 3. Install the TV launcher APK directly</div>
                <div className="text-emerald-400">adb install -r clean-launcher-tv.apk</div>
              </div>
            </div>
          )}

          {/* Tab 3: PWA Browser Install */}
          {activeGuideTab === 'pwa' && (
            <div className="space-y-4 text-xs text-zinc-300">
              <p className="text-zinc-400">
                You can also run this launcher directly inside any web browser (Chrome, Edge, or TV browser like TV Bro or JioPages) as a standalone progressive web application:
              </p>

              {pwaInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Launcher is already running in Standalone PWA mode!
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallPWA}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  Install Web App to Home Screen
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="font-semibold text-white">Browser Installation:</div>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    <li>On Chrome / Edge: Click the <strong>Install</strong> icon in the address bar.</li>
                    <li>On Android / TV browsers: Tap the menu (three dots) and select <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-zinc-950 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Clean Launcher TV • Android 5.0 to 14+ (Leanback + TV Home Launcher)
          </div>
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            onMouseEnter={() => setFocusZone('footer')}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              focusZone === 'footer'
                ? 'bg-white text-slate-900 ring-2 ring-white scale-105 shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            Close (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
