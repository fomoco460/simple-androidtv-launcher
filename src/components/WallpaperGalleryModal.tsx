import React, { useState, useRef } from 'react';
import { BackgroundPreset } from '../types';
import { soundService } from '../services/sound';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { CLEAN_FRAME_WALLPAPERS } from '../data/cleanFrameWallpapers';
import { SPACE_PHOTOS } from '../data/ambientPhotos';
import { BackgroundView } from './BackgroundView';
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

const ambientIds = ['desert-stars', 'nordic-aurora', 'misty-pines', 'cyber-dusk', 'deep-space', 'sunset-dunes'];

type Category = 'landscapes' | 'space' | 'themes' | 'custom';
interface Tile {
  preset: BackgroundPreset;
  name: string;
  desc: string;
  thumb?: string;
}

const THEMES: Tile[] = [
  { preset: 'desert-stars', name: 'Desert Stars', desc: 'Starry horizon over dunes' },
  { preset: 'nordic-aurora', name: 'Nordic Aurora', desc: 'Northern lights, midnight sea' },
  { preset: 'misty-pines', name: 'Misty Pines', desc: 'Alpine tree silhouettes' },
  { preset: 'cyber-dusk', name: 'Cyber Dusk', desc: 'Neon vaporwave horizon' },
  { preset: 'deep-space', name: 'Deep Space', desc: 'Nebula and stardust' },
  { preset: 'sunset-dunes', name: 'Sunset Dunes', desc: 'Warm desert sunset' },
];

const CATEGORY_INFO: Record<Category, { label: string; blurb: string; icon: React.ComponentType<{ className?: string }> }> = {
  landscapes: { label: 'Landscapes', blurb: 'Photography from the CleanFrame project (Unsplash)', icon: Layers },
  space: { label: 'Space', blurb: 'NASA, ESA and CSA imagery: Artemis II, the ISS, Webb and Hubble', icon: Sparkles },
  themes: { label: 'Themes', blurb: 'Soft gradient themes with a slow starfield', icon: Sparkles },
  custom: { label: 'Custom', blurb: '', icon: Upload },
};

export const WallpaperGalleryModal: React.FC<WallpaperGalleryModalProps> = ({
  currentPreset,
  customUrl = '',
  onSelectWallpaper,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>(() =>
    ambientIds.includes(currentPreset as string)
      ? 'themes'
      : (currentPreset as string).startsWith('space-')
        ? 'space'
        : currentPreset === 'custom'
          ? 'custom'
          : 'landscapes',
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isNative = typeof window !== 'undefined' && !!(window as any).AndroidBridge?.isNative?.();
  const [customInputUrl, setCustomInputUrl] = useState<string>(customUrl || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tiles: Tile[] =
    activeCategory === 'landscapes'
      ? CLEAN_FRAME_WALLPAPERS.map((w) => ({ preset: w.presetId as BackgroundPreset, name: w.name, desc: w.description, thumb: w.thumb }))
      : activeCategory === 'space'
        ? SPACE_PHOTOS.map((p) => ({ preset: p.id as BackgroundPreset, name: p.name, desc: 'NASA', thumb: p.thumb }))
        : activeCategory === 'themes'
          ? THEMES
          : [];

  // D-pad: arrows move between controls, Enter presses, Back closes.
  useSpatialNav({ containerRef: rootRef, onBack: onClose });

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
    <div ref={rootRef} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 select-none animate-fadeIn">
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
                  Home screen
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Landscapes, NASA space photos, animated themes, or your own image.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              {(Object.keys(CATEGORY_INFO) as Category[]).map((c) => {
                const Icon = CATEGORY_INFO[c].icon;
                return (
                  <button
                    key={c}
                    data-nav
                    onClick={() => {
                      soundService.playMove();
                      setActiveCategory(c);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeCategory === c ? 'bg-white text-slate-900 font-bold shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {CATEGORY_INFO[c].label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                soundService.playBack();
                onClose();
              }}
              data-nav
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-py-6 space-y-4">
          {activeCategory !== 'custom' && (
            <div>
              <div className="flex items-center justify-between pb-3 text-xs text-zinc-400 border-b border-white/5">
                <span>{CATEGORY_INFO[activeCategory].blurb}</span>
                <span className="text-[11px] font-mono text-sky-400">{tiles.length} wallpapers</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-3">
                {tiles.map((t) => {
                  const isSelected = currentPreset === t.preset;
                  return (
                    <button
                      key={t.preset}
                      onClick={() => {
                        soundService.playSelect();
                        onSelectWallpaper(t.preset);
                        onClose();
                      }}
                      data-nav
                      {...(isSelected ? { 'data-nav-initial': true } : {})}
                      className={`group relative flex flex-col rounded-2xl overflow-hidden border text-left transition-all duration-200 cursor-pointer ${
                        isSelected ? 'border-white ring-2 ring-white shadow-2xl z-10' : 'border-white/10 hover:border-white/40'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        {t.thumb ? (
                          <img src={t.thumb} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0" style={{ filter: 'brightness(2.6) saturate(1.6)' }}>
                            <BackgroundView preset={t.preset} still />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-900 shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 bg-zinc-900/90">
                        <div className="font-bold text-xs md:text-sm text-white truncate">{t.name}</div>
                        <div className="text-[10px] md:text-xs text-zinc-400 line-clamp-1 mt-0.5">{t.desc}</div>
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
              {!isNative && (
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
                  data-nav
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-white/90 transition shadow-xl cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Wallpaper File
                </button>
              </div>
              )}

              {/* URL card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <LinkIcon className="w-4 h-4 text-sky-400" />
                  <span>Or Paste Direct Image URL</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    data-nav
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
                    data-nav
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
          <span>Landscapes: CleanFrame project / Unsplash · Space: NASA, ESA, CSA, STScI (credits in the README)</span>
        </div>
      </div>
    </div>
  );
};
