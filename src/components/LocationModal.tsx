import React, { useState, useEffect, useRef } from 'react';
import { weatherService, LocationResult, POPULAR_LOCATIONS } from '../services/weather';
import { soundService } from '../services/sound';
import { MapPin, Search, Navigation, Check, X, Thermometer } from 'lucide-react';

interface LocationModalProps {
  currentCity?: string;
  tempUnit?: 'F' | 'C';
  onSaveLocation: (city: string, lat?: number, lon?: number, unit?: 'F' | 'C') => void;
  onClose: () => void;
}

type FocusZone = 'unit' | 'search' | 'autodetect' | 'list' | 'footer';

export const LocationModal: React.FC<LocationModalProps> = ({
  currentCity = 'Auto-Detect',
  tempUnit = 'F',
  onSaveLocation,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<'F' | 'C'>(tempUnit);

  // TV Remote D-Pad Navigation State
  const [focusZone, setFocusZone] = useState<FocusZone>('list');
  const [listIndex, setListIndex] = useState<number>(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await weatherService.searchLocations(searchQuery);
      setResults(res);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedLocations = results.length > 0 ? results : POPULAR_LOCATIONS;

  // Auto-scroll list items when focused
  useEffect(() => {
    if (focusZone === 'list') {
      itemRefs.current[listIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [listIndex, focusZone]);

  const handleSelectLocation = (loc: LocationResult) => {
    soundService.playSelect();
    const displayName = loc.admin1 ? `${loc.name}, ${loc.admin1}` : `${loc.name}, ${loc.country}`;
    onSaveLocation(displayName, loc.latitude, loc.longitude, selectedUnit);
    onClose();
  };

  const handleUseAutoDetect = () => {
    soundService.playSelect();
    onSaveLocation('Local Area (Auto)', undefined, undefined, selectedUnit);
    onClose();
  };

  // Keyboard and TV remote navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is actively typing in input (except Enter, Esc, Up, or Down)
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.blur();
          soundService.playSelect();
          if (displayedLocations.length > 0) {
            setFocusZone('list');
            setListIndex(0);
          } else {
            setFocusZone('search');
          }
          return;
        }
        if (e.key === 'Escape' || e.keyCode === 27 || e.key === 'Back' || e.keyCode === 4) {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.blur();
          soundService.playBack();
          setFocusZone('search');
          return;
        }
        if (e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 20) {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.blur();
          soundService.playMove();
          setFocusZone('autodetect');
          return;
        }
        if (e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 19) {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.blur();
          soundService.playMove();
          setFocusZone('unit');
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
        e.keyCode === 27 ||
        e.keyCode === 4;

      if (isBack) {
        e.preventDefault();
        soundService.playBack();
        onClose();
        return;
      }

      const listCols = results.length > 0 ? 1 : 2;

      if (isUp) {
        e.preventDefault();
        soundService.playMove();

        if (focusZone === 'footer') {
          setFocusZone('list');
          setListIndex(Math.max(0, displayedLocations.length - 1));
        } else if (focusZone === 'list') {
          if (listIndex >= listCols) {
            setListIndex((prev) => prev - listCols);
          } else {
            setFocusZone('autodetect');
          }
        } else if (focusZone === 'autodetect') {
          setFocusZone('search');
        } else if (focusZone === 'search') {
          setFocusZone('unit');
        }
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();

        if (focusZone === 'unit') {
          setFocusZone('search');
        } else if (focusZone === 'search') {
          setFocusZone('autodetect');
        } else if (focusZone === 'autodetect') {
          setFocusZone('list');
          setListIndex(0);
        } else if (focusZone === 'list') {
          if (listIndex + listCols < displayedLocations.length) {
            setListIndex((prev) => prev + listCols);
          } else {
            setFocusZone('footer');
          }
        }
      } else if (isLeft) {
        e.preventDefault();
        soundService.playMove();

        if (focusZone === 'unit') {
          setSelectedUnit('F');
        } else if (focusZone === 'list' && listCols === 2) {
          if (listIndex % 2 !== 0) {
            setListIndex((prev) => prev - 1);
          }
        }
      } else if (isRight) {
        e.preventDefault();
        soundService.playMove();

        if (focusZone === 'unit') {
          setSelectedUnit('C');
        } else if (focusZone === 'list' && listCols === 2) {
          if (listIndex % 2 === 0 && listIndex + 1 < displayedLocations.length) {
            setListIndex((prev) => prev + 1);
          }
        }
      } else if (isSelect) {
        e.preventDefault();

        if (focusZone === 'unit') {
          soundService.playSelect();
          setSelectedUnit((prev) => (prev === 'F' ? 'C' : 'F'));
        } else if (focusZone === 'search') {
          soundService.playSelect();
          searchInputRef.current?.focus();
          (window as any).AndroidBridge?.showKeyboard?.();
        } else if (focusZone === 'autodetect') {
          handleUseAutoDetect();
        } else if (focusZone === 'list') {
          const loc = displayedLocations[listIndex];
          if (loc) handleSelectLocation(loc);
        } else if (focusZone === 'footer') {
          soundService.playBack();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusZone, listIndex, selectedUnit, displayedLocations, results.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e121a]/95 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Weather Location</h2>
              <p className="text-xs text-white/50">
                Current: <span className="text-white font-medium">{currentCity}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Temperature Unit Switcher */}
        <div className="flex items-center justify-between py-3 border-b border-white/5 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-white/40" />
            <span>Temperature Display:</span>
          </div>
          <div
            className={`flex items-center p-1 rounded-xl transition-all ${
              focusZone === 'unit'
                ? 'bg-white/15 ring-2 ring-white shadow-md'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <button
              onClick={() => setSelectedUnit('F')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedUnit === 'F'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Fahrenheit (°F)
            </button>
            <button
              onClick={() => setSelectedUnit('C')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedUnit === 'C'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Celsius (°C)
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInputRef.current?.blur();
            if (displayedLocations.length > 0) {
              setFocusZone('list');
              setListIndex(0);
            }
          }}
          className="relative my-4"
        >
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
              focusZone === 'search' ? 'text-white' : 'text-white/40'
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              focusZone === 'search'
                ? 'Type city name or press Down for results...'
                : 'Search city (e.g. Dallas, Miami, London)...'
            }
            value={searchQuery}
            onFocus={() => setFocusZone('search')}
            onBlur={() => (window as any).AndroidBridge?.hideKeyboard?.()}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                searchInputRef.current?.blur();
                soundService.playSelect();
                if (displayedLocations.length > 0) {
                  setFocusZone('list');
                  setListIndex(0);
                } else {
                  setFocusZone('search');
                }
              }
            }}
            className={`w-full rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none transition-all ${
              focusZone === 'search'
                ? 'bg-white/15 border-2 border-white ring-2 ring-white/50 shadow-xl'
                : 'bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10'
            }`}
          />
        </form>

        {/* Search Results or Presets */}
        <div className="flex-1 max-h-56 overflow-y-auto space-y-2 p-1.5 scroll-py-2 no-scrollbar">
          {/* Auto-detect button */}
          <button
            onClick={handleUseAutoDetect}
            onMouseEnter={() => {
              setFocusZone('autodetect');
            }}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
              focusZone === 'autodetect'
                ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                : 'bg-white/5 hover:bg-white/15 border-white/5 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Navigation
                className={`w-4 h-4 ${
                  focusZone === 'autodetect' ? 'text-emerald-600' : 'text-emerald-400'
                }`}
              />
              <span>Use Device GPS / Auto-Detect</span>
            </div>
            <span
              className={`text-[10px] ${
                focusZone === 'autodetect' ? 'text-slate-600' : 'text-white/40'
              }`}
            >
              Automatic
            </span>
          </button>

          {isSearching && (
            <div className="text-center py-4 text-xs text-white/40">Searching locations...</div>
          )}

          {results.length > 0 ? (
            <div className="space-y-1.5">
              {results.map((loc, idx) => {
                const isFocused = focusZone === 'list' && listIndex === idx;
                return (
                  <button
                    key={`${loc.name}-${loc.latitude}-${idx}`}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    onClick={() => handleSelectLocation(loc)}
                    onMouseEnter={() => {
                      setFocusZone('list');
                      setListIndex(idx);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all text-left ${
                      isFocused
                        ? 'bg-white text-slate-900 border-white shadow-xl ring-2 ring-white z-10'
                        : 'bg-white/5 hover:bg-white/20 border-white/5 text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{loc.name}</div>
                      <div
                        className={`text-[11px] ${
                          isFocused ? 'text-slate-600' : 'text-white/40'
                        }`}
                      >
                        {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <Check
                      className={`w-4 h-4 ${
                        isFocused ? 'text-slate-900' : 'text-white/20'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ) : !isSearching && searchQuery.trim().length >= 2 ? (
            <div className="text-center py-4 text-xs text-white/40">No matching cities found</div>
          ) : (
            // Popular Presets
            <div className="pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
                Popular Cities
              </div>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_LOCATIONS.map((loc, idx) => {
                  const isFocused = focusZone === 'list' && listIndex === idx;
                  return (
                    <button
                      key={loc.name}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectLocation(loc)}
                      onMouseEnter={() => {
                        setFocusZone('list');
                        setListIndex(idx);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left cursor-pointer transition-all truncate ${
                        isFocused
                          ? 'bg-white text-slate-900 border-white shadow-lg ring-2 ring-white z-10 font-bold'
                          : 'bg-white/5 hover:bg-white/15 border-white/5 text-white'
                      }`}
                    >
                      <span className="truncate block">{loc.name}</span>
                      <span
                        className={`text-[10px] block truncate ${
                          isFocused ? 'text-slate-600' : 'text-white/40'
                        }`}
                      >
                        {loc.admin1 || loc.country}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Powered by Open-Meteo</span>
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            onMouseEnter={() => {
              setFocusZone('footer');
            }}
            className={`px-4 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              focusZone === 'footer'
                ? 'bg-white text-slate-900 ring-2 ring-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
