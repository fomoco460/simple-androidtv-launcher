import React, { useEffect, useRef, useState } from 'react';
import { AppItem } from '../types';
import { AppIcon } from './BrandIcons';
import { useSpatialNav } from '../hooks/useSpatialNav';
import {
  ArrowLeft,
  ArrowRight,
  Pin,
  PinOff,
  Pencil,
  Info,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';

export type AppMenuContext = 'home' | 'all-apps';

interface AppContextMenuProps {
  app: AppItem;
  context: AppMenuContext;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  /** Android package, when known (enables App info / Uninstall on the TV). */
  packageName: string | null;
  onMove: (direction: 'left' | 'right') => void;
  onTogglePin: () => void;
  onRename: (name: string) => void;
  onBackdrop: () => void;
  onAppInfo: () => void;
  onUninstall: () => void;
  onClose: () => void;
}

export const AppContextMenu: React.FC<AppContextMenuProps> = ({
  app,
  context,
  canMoveLeft,
  canMoveRight,
  packageName,
  onMove,
  onTogglePin,
  onRename,
  onBackdrop,
  onAppInfo,
  onUninstall,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(app.name);

  useSpatialNav({
    containerRef: rootRef,
    onBack: () => {
      if (renaming) setRenaming(false);
      else onClose();
    },
  });

  // Entering rename mode: focus the text field and bring up the TV keyboard.
  useEffect(() => {
    if (!renaming) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      (window as any).AndroidBridge?.showKeyboard?.();
    }, 60);
    return () => window.clearTimeout(id);
  }, [renaming]);

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed) onRename(trimmed);
    onClose();
  };

  const itemClass =
    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm md:text-base font-semibold text-white bg-white/[0.06] hover:bg-white/15 transition-colors cursor-pointer';

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn select-none"
    >
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl p-4 text-white">
        <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-white/10">
          <div className="w-10 h-10 flex items-center justify-center">
            <AppIcon app={app} styleMode="stock" className="w-9 h-9" />
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate">{app.name}</div>
            <div className="text-xs text-white/50">
              {renaming ? 'Rename app' : 'App options'}
            </div>
          </div>
        </div>

        {renaming ? (
          <div className="space-y-2 p-1">
            <input
              ref={inputRef}
              data-nav
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  saveName();
                }
              }}
              className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-base text-white focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button data-nav onClick={saveName} className={itemClass}>
                <Check className="w-4 h-4" /> Save
              </button>
              <button data-nav onClick={() => setRenaming(false)} className={itemClass}>
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 p-1">
            {context === 'home' && (
              <>
                <button
                  data-nav
                  disabled={!canMoveLeft}
                  onClick={() => onMove('left')}
                  className={`${itemClass} disabled:hidden`}
                >
                  <ArrowLeft className="w-4 h-4 text-sky-300" /> Move left
                </button>
                <button
                  data-nav
                  disabled={!canMoveRight}
                  onClick={() => onMove('right')}
                  className={`${itemClass} disabled:hidden`}
                >
                  <ArrowRight className="w-4 h-4 text-sky-300" /> Move right
                </button>
              </>
            )}
            <button
              data-nav
              onClick={() => {
                onTogglePin();
                onClose();
              }}
              className={itemClass}
            >
              {app.inDock ? (
                <PinOff className="w-4 h-4 text-amber-300" />
              ) : (
                <Pin className="w-4 h-4 text-amber-300" />
              )}
              {app.inDock ? 'Remove from home row' : 'Add to home row'}
            </button>
            <button data-nav onClick={() => setRenaming(true)} className={itemClass}>
              <Pencil className="w-4 h-4 text-emerald-300" /> Rename
            </button>
            <button
              data-nav
              onClick={() => {
                onBackdrop();
                onClose();
              }}
              className={itemClass}
            >
              <ImageIcon className="w-4 h-4 text-violet-300" /> Backdrop
            </button>
            {packageName && (
              <>
                <button
                  data-nav
                  onClick={() => {
                    onAppInfo();
                    onClose();
                  }}
                  className={itemClass}
                >
                  <Info className="w-4 h-4 text-cyan-300" /> App info
                </button>
                <button
                  data-nav
                  onClick={() => {
                    onUninstall();
                    onClose();
                  }}
                  className={itemClass}
                >
                  <Trash2 className="w-4 h-4 text-rose-400" /> Uninstall
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
