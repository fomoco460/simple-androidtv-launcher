import React, { useState, useEffect, useRef } from 'react';
import { BackgroundPreset, LauncherSettings } from '../types';
import { soundService } from '../services/sound';
import { CLEAN_FRAME_WALLPAPERS, CleanFrameWallpaper } from '../data/cleanFrameWallpapers';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Check,
  X,
  Link as LinkIcon,
  Layers,
} from 'lucide-react';

interface WallpaperGalleryModalProps {
  currentPreset: BackgroundPreset;
  customUrl?: string;
  onSelectWallpaper: (preset: BackgroundPreset, customUrl?: string) => void;
  onClose: () => void;
}

export const WallpaperGalleryModal: React.FC<WallpaperGalleryModalProps> = ({
  currentPreset,
  customUrl = '',
  onSelectWallpaper,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<'cleanframe' | 'ambient' | 'custom'>('cleanframe');
  const [customInputUrl, setCustomInputUrl] = useState<string>(customUrl || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ambientPresets = [
    { id: 'desert-stars', name: 'Desert Stars', desc: 'Deep starry horizon with ambient dunes', tone: 'dark' },
    { id: 'nordic-aurora', name: 'Nordic Aurora', desc: 'Vibrant northern lights and midnight sea', tone: 'dark' },
    { id: 'misty-pines', name: 'Misty Pines', desc: 'Atmospheric alpine mountain tree silhouettes', tone: 'dark' },
    { id: 'cyber-dusk', name: 'Cyber Dusk', desc: 'Vaporwave dusk horizon with neon glow', tone: 'dark' },
    { id: 'deep-space', name: 'Deep Space', desc: 'Nebula cosmic starfield and stardust', tone: 'dark' },
    { id: 'sunset-dunes', name: 'Sunset Dunes', desc: 'Warm desert sunset with amber glow', tone: 'dark' },
  ];

  // TV Remote Escape/Back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape' || e.keyCode === 27) {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        return;
      }
      if (e.key === 'Escape' || e.key === 'Back' || e.keyCode === 27 || e.keyCode === 4) {
        e.preventDefault();
        soundService.playBack();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundService.playSelect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSelectWallpaper('custom', dataUrl);
        onClose();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCustomUrl = () => {
    if (!customInputUrl.trim()) return;
    soundService.playSelect();
    onSelectWallpaper('custom', customInputUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 select-none animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[86vh] max-h-[760px] bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-sky-950/30 via-zinc-900/60 to-zinc-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Wallpaper Gallery</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full">
                  CleanFrame &amp; Ambient
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Choose from CleanFrame's 15 photographic wallpapers, procedural ambient themes, or import your own.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => {
                  soundService.playMove();
                  setActiveCategory('cleanframe');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'cleanframe' ? 'bg-white text-slate-900 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                CleanFrame (15)
              </button>

              <button
                onClick={() => {
                  soundService.playMove();
                  setActiveCategory('ambient');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'ambient' ? 'bg-white text-slate-900 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ambient (6)
              </button>

              <button
                onClick={() => {
                  soundService.playMove();
                  setActiveCategory('custom');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'custom' ? 'bg-white text-slate-900 font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Custom Import
              </button>
            </div>

            <button
              onClick={() => {
                soundService.playBack();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Category 1: CleanFrame 15 Wallpapers */}
          {activeCategory === 'cleanframe' && (
            <div>
              <div className="flex items-center justify-between pb-3 text-xs text-zinc-400 border-b border-white/5">
                <span>
                  Official photography wallpapers from <strong className="text-white">nthnclrk/CleanFrame</strong> (offline TV ready)
                </span>
                <span className="text-[11px] font-mono text-sky-400">15 Wallpapers available</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3">
                {CLEAN_FRAME_WALLPAPERS.map((wp) => {
                  const isSelected = currentPreset === wp.presetId;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => {
                        soundService.playSelect();
                        onSelectWallpaper(wp.presetId as BackgroundPreset);
                        onClose();
                      }}
                      className={`group relative flex flex-col rounded-2xl overflow-hidden border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-white ring-2 ring-white shadow-2xl scale-[1.02] z-10'
                          : 'border-white/10 hover:border-white/40 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                          src={wp.thumb}
                          alt={wp.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-900 shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-zinc-900/90 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                            {wp.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                            {wp.description}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wider font-semibold text-zinc-500">
                          <span>{wp.tone} tone</span>
                          <span className={isSelected ? 'text-emerald-400' : 'text-zinc-500'}>
                            {isSelected ? 'Active' : 'Select'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category 2: Ambient Themes */}
          {activeCategory === 'ambient' && (
            <div>
              <div className="flex items-center justify-between pb-3 text-xs text-zinc-400 border-b border-white/5">
                <span>Minimalist procedural ambient themes with animated starfields and horizons</span>
                <span className="text-[11px] font-mono text-sky-400">6 Themes</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3">
                {ambientPresets.map((theme) => {
                  const isSelected = currentPreset === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        soundService.playSelect();
                        onSelectWallpaper(theme.id as BackgroundPreset);
                        onClose();
                      }}
                      className={`group relative flex flex-col rounded-2xl overflow-hidden border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-white ring-2 ring-white shadow-2xl scale-[1.02] z-10'
                          : 'border-white/10 hover:border-white/40 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white/30 group-hover:scale-110 transition-transform" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-900 shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-zinc-900/90 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                            {theme.name}
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {theme.desc}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
                          <span className="text-zinc-500">Ambient Engine</span>
                          <span className={isSelected ? 'text-emerald-400' : 'text-zinc-400'}>
                            {isSelected ? 'Active' : 'Apply'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category 3: Custom Import */}
          {activeCategory === 'custom' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              {/* File upload card */}
              <div className="p-8 rounded-3xl bg-white/[0.03] border border-dashed border-white/20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Wallpaper Image</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md">
                    Choose any 4K/1080p photo or wallpaper from your computer, phone, or TV storage (JPG, PNG, WebP).
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-white/90 transition shadow-xl cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Wallpaper File
                </button>
              </div>

              {/* URL card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <LinkIcon className="w-4 h-4 text-sky-400" />
                  <span>Or Paste Direct Image URL</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or https://..."
                    value={customInputUrl}
                    onChange={(e) => setCustomInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyCustomUrl();
                    }}
                    className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400"
                  />

                  <button
                    onClick={handleApplyCustomUrl}
                    disabled={!customInputUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span>CleanFrame Wallpapers • Photographs from Unsplash &amp; CleanFrame project</span>
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
