import React, { useEffect, useState } from 'react';
import { AppItem } from '../types';
import { BrandIcons } from './BrandIcons';
import { soundService } from '../services/sound';
import { ExternalLink, Copy, Check, ArrowLeft, Tv } from 'lucide-react';

interface AppLauncherModalProps {
  app: AppItem;
  onClose: () => void;
}

export const AppLauncherModal: React.FC<AppLauncherModalProps> = ({ app, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [autoLaunchPaused, setAutoLaunchPaused] = useState<boolean>(false);

  const IconComp = BrandIcons[app.iconType] || BrandIcons.generic;

  const isNative = typeof window !== 'undefined' && !!(window as any).AndroidBridge?.isNative?.();

  const extractPackageName = (intentUrl?: string, id?: string) => {
    if (intentUrl) {
      const match = intentUrl.match(/package=([^;]+)/);
      if (match && match[1]) return match[1];
    }
    const defaultPackages: Record<string, string> = {
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
    };
    return id ? defaultPackages[id] : undefined;
  };

  const handleLaunchNative = () => {
    const pkg = extractPackageName(app.intentUrl, app.id);
    const bridge = (window as any).AndroidBridge;
    if (bridge) {
      if (typeof bridge.launchApp === 'function' && bridge.launchApp(app.name, pkg || '')) {
        onClose();
        return true;
      }
      if (pkg && typeof bridge.launchPackage === 'function' && bridge.launchPackage(pkg)) {
        onClose();
        return true;
      }
    }
    return false;
  };

  // Auto launch timer
  useEffect(() => {
    if (autoLaunchPaused) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      if (isNative && handleLaunchNative()) {
        return;
      }
      handleLaunchWeb();
    }
  }, [countdown, autoLaunchPaused, isNative]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (isSelect) {
        e.preventDefault();
        soundService.playSelect();
        if (isNative && handleLaunchNative()) {
          return;
        }
        handleLaunchWeb();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNative]);

  const handleLaunchWeb = () => {
    window.open(app.url, '_blank', 'noopener,noreferrer');
  };

  const handleLaunchIntent = () => {
    if (isNative && handleLaunchNative()) {
      return;
    }
    if (app.intentUrl) {
      window.location.href = app.intentUrl;
    } else {
      window.open(app.url, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(app.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 select-none animate-fadeIn">
      {/* Background glow matching app brand accent */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: app.accentColor }}
      />

      <div className="relative z-10 w-full max-w-md bg-[#10141e]/90 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* App Logo */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center p-4 shadow-2xl mb-4 border border-white/10 transition-transform duration-300 hover:scale-105"
          style={{
            backgroundColor: `${app.accentColor}18`,
            boxShadow: `0 10px 30px -10px ${app.accentColor}55`,
          }}
        >
          <IconComp className="w-12 h-12" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white tracking-tight">{app.name}</h2>
        <p className="text-xs text-white/60 mt-1 max-w-xs">{app.description}</p>

        {/* Status / Countdown */}
        <div className="my-6 w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
          <span className="text-white/70">
            {autoLaunchPaused ? 'Ready to stream' : `Launching in ${countdown}s...`}
          </span>
          {!autoLaunchPaused && (
            <button
              onClick={() => setAutoLaunchPaused(true)}
              className="text-[11px] text-white/50 hover:text-white underline cursor-pointer"
            >
              Pause
            </button>
          )}
        </div>

        {/* Launch Buttons */}
        <div className="w-full space-y-2.5">
          {isNative && (
            <button
              onClick={() => {
                soundService.playSelect();
                if (!handleLaunchNative()) {
                  handleLaunchWeb();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold text-sm hover:from-sky-400 hover:to-indigo-400 transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
            >
              <Tv className="w-4 h-4 text-white" />
              <span>Launch Android TV App</span>
            </button>
          )}

          <button
            onClick={() => {
              soundService.playSelect();
              handleLaunchWeb();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-white/90 transition-all shadow-lg cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Launch Web Player</span>
          </button>

          <button
            onClick={() => {
              soundService.playSelect();
              handleLaunchIntent();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/20 transition-all cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5 text-sky-400" />
            <span>Open via Chromecast Intent</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white/60 hover:text-white text-xs hover:bg-white/5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied link to clipboard!' : 'Copy Streaming URL'}</span>
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            soundService.playBack();
            onClose();
          }}
          className="mt-6 flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Launcher</span>
        </button>
      </div>
    </div>
  );
};
