import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Home,
  Settings,
  Search,
  Grid,
  Maximize,
  Volume2,
  VolumeX,
  X,
  Radio,
} from 'lucide-react';
import { soundService } from '../services/sound';

interface VirtualRemoteProps {
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const VirtualRemote: React.FC<VirtualRemoteProps> = ({
  onToggleFullscreen,
  isFullscreen,
}) => {
  // Never show virtual test remote on real TV hardware (Android TV, Chromecast, TCL, FireTV, etc.)
  const isRealTvDevice =
    typeof window !== 'undefined' &&
    (!!(window as unknown as { AndroidBridge?: unknown }).AndroidBridge ||
      /Android|GoogleTV|CrKey|SmartTV|AFTT|AppleTV|HbbTV/i.test(navigator.userAgent));

  if (isRealTvDevice) {
    return null;
  }

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(!soundService.enabled);

  const dispatchKey = (key: string) => {
    soundService.playMove();
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const handleSelect = () => {
    soundService.playSelect();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const handleBack = () => {
    soundService.playBack();
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const handleHome = () => {
    soundService.playSelect();
    const event = new KeyboardEvent('keydown', {
      key: 'h',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const toggleSound = () => {
    const next = !soundService.enabled;
    soundService.enabled = next;
    setIsSoundMuted(!next);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md border border-white/10 text-xs shadow-lg transition-all cursor-pointer group"
        title="Open Chromecast 4K TV Remote Simulator"
      >
        <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
        <span className="text-[11px] font-medium">TV Remote</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-48 bg-[#151922]/95 border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col items-center select-none animate-fadeIn">
      {/* Remote Header */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-white/50">
        <span className="font-semibold tracking-wide text-white/80">Chromecast Remote</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Circular D-Pad */}
      <div className="relative w-32 h-32 my-3 rounded-full bg-black/40 border border-white/10 shadow-inner flex items-center justify-center">
        {/* Up */}
        <button
          onClick={() => dispatchKey('ArrowUp')}
          className="absolute top-1 left-1/2 -translate-x-1/2 p-2 text-white/60 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="D-Pad Up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Down */}
        <button
          onClick={() => dispatchKey('ArrowDown')}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 p-2 text-white/60 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="D-Pad Down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Left */}
        <button
          onClick={() => dispatchKey('ArrowLeft')}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="D-Pad Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right */}
        <button
          onClick={() => dispatchKey('ArrowRight')}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="D-Pad Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Center OK / Select Button */}
        <button
          onClick={handleSelect}
          className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 border border-white/20 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center cursor-pointer"
          title="Select / Enter"
        >
          OK
        </button>
      </div>

      {/* Standard TV Buttons Grid */}
      <div className="w-full grid grid-cols-3 gap-2 pt-1 text-white/70">
        <button
          onClick={handleBack}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="Back (Esc)"
        >
          <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
          <span>Back</span>
        </button>

        <button
          onClick={handleHome}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="Home (H)"
        >
          <Home className="w-3.5 h-3.5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => dispatchKey('s')}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="Settings (S)"
        >
          <Settings className="w-3.5 h-3.5 mb-0.5" />
          <span>Setup</span>
        </button>

        <button
          onClick={() => dispatchKey('a')}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="Search Apps (A)"
        >
          <Search className="w-3.5 h-3.5 mb-0.5" />
          <span>Search</span>
        </button>

        <button
          onClick={() => dispatchKey('a')}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="All Apps (A)"
        >
          <Grid className="w-3.5 h-3.5 mb-0.5" />
          <span>Apps</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white transition-all text-[9px] cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-3.5 h-3.5 mb-0.5" />
          <span>{isFullscreen ? 'Exit' : 'Full'}</span>
        </button>
      </div>

      {/* Footer controls: Audio and instructions */}
      <div className="w-full flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-[9px] text-white/40">
        <span>Keyboard arrows work</span>
        <button
          onClick={toggleSound}
          className="p-1 hover:text-white transition-colors"
          title="Toggle sound"
        >
          {isSoundMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
};
