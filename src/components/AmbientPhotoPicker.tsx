import React, { useRef } from 'react';
import { Check, Sun, Moon, X } from 'lucide-react';
import { AMBIENT_PHOTOS, ALL_PHOTO_IDS, DEFAULT_NIGHT_IDS } from '../data/ambientPhotos';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { soundService } from '../services/sound';

interface AmbientPhotoPickerProps {
  mode: 'day' | 'night';
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

/** Pick which photos Ambient Mode shows (by day or at night). OK toggles a photo, Back saves and closes. */
export const AmbientPhotoPicker: React.FC<AmbientPhotoPickerProps> = ({ mode, selected, onChange, onClose }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useSpatialNav({ containerRef: rootRef, onBack: onClose });

  const chosen = new Set(selected);
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(ALL_PHOTO_IDS.filter((x) => next.has(x)));
  };

  const Icon = mode === 'day' ? Sun : Moon;
  const quick = 'px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer';

  const section = (title: string, set: 'cleanframe' | 'space') => (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-white/40 pb-2">{title}</div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {AMBIENT_PHOTOS.filter((p) => p.set === set).map((p, i) => {
          const on = chosen.has(p.id);
          return (
            <button
              key={p.id}
              data-nav
              {...(set === 'cleanframe' && i === 0 ? { 'data-nav-initial': true } : {})}
              onClick={() => {
                soundService.playSelect();
                toggle(p.id);
              }}
              className={`relative rounded-xl overflow-hidden border text-left cursor-pointer transition ${
                on ? 'border-white/40' : 'border-white/10 opacity-50'
              }`}
            >
              <div className="relative aspect-video bg-black">
                <img src={p.thumb} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                <div
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    on ? 'bg-emerald-400 text-black' : 'bg-black/60 border border-white/40'
                  }`}
                >
                  {on && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
              <div className="px-2 py-1.5 bg-zinc-900/90 text-[11px] md:text-xs font-semibold text-white truncate">
                {p.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 select-none animate-fadeIn"
    >
      <div className="relative w-full max-w-5xl h-[88vh] bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold">{mode === 'day' ? 'Daytime photos' : 'Night photos'}</h2>
              <p className="text-xs text-zinc-400">
                {selected.length} of {AMBIENT_PHOTOS.length} selected · press OK to turn a photo on or off
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button data-nav className={quick} onClick={() => onChange(ALL_PHOTO_IDS)}>
              All
            </button>
            <button data-nav className={quick} onClick={() => onChange([])}>
              None
            </button>
            {mode === 'night' && (
              <button data-nav className={quick} onClick={() => onChange(DEFAULT_NIGHT_IDS)}>
                Dark only
              </button>
            )}
            <button data-nav className={`${quick} flex items-center gap-1.5`} onClick={onClose}>
              <X className="w-4 h-4" /> Done
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {section('Landscapes', 'cleanframe')}
          {section('Space (NASA)', 'space')}
        </div>
      </div>
    </div>
  );
};
