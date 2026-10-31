import React, { useState, useEffect } from 'react';
import { TvInputItem } from '../types';
import { soundService } from '../services/sound';
import { Tv, Disc, Gamepad2, Monitor, Radio, Cast, Check, ChevronLeft, Edit2 } from 'lucide-react';

interface InputsModalProps {
  inputs: TvInputItem[];
  onSelectInput: (inputId: string) => void;
  onUpdateInputLabel: (inputId: string, label: string) => void;
  onClose: () => void;
}

export const InputsModal: React.FC<InputsModalProps> = ({
  inputs,
  onSelectInput,
  onUpdateInputLabel,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;

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
        e.keyCode === 4;

      if (isUp) {
        e.preventDefault();
        soundService.playMove();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (isDown) {
        e.preventDefault();
        soundService.playMove();
        setSelectedIndex((prev) => Math.min(inputs.length - 1, prev + 1));
      } else if (isSelect) {
        e.preventDefault();
        soundService.playSelect();
        onSelectInput(inputs[selectedIndex].id);
      } else if (isBack) {
        e.preventDefault();
        soundService.playBack();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputs, selectedIndex, editingId, onSelectInput, onClose]);

  const getInputIcon = (type: TvInputItem['type'], name: string) => {
    if (type === 'cast') return <Cast className="w-5 h-5 text-sky-400" />;
    if (type === 'tuner') return <Radio className="w-5 h-5 text-amber-400" />;
    if (name.includes('Soundbar') || type === 'earc') return <Disc className="w-5 h-5 text-indigo-400" />;
    if (name.includes('PlayStation') || name.includes('Console')) return <Gamepad2 className="w-5 h-5 text-emerald-400" />;
    return <Monitor className="w-5 h-5 text-slate-300" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0e121a]/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundService.playBack();
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-white/80" />
              <h2 className="text-xl font-bold text-white tracking-tight">TV Inputs</h2>
            </div>
          </div>
          <span className="text-xs text-white/40">Select with remote or click</span>
        </div>

        {/* Inputs List */}
        <div className="py-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {inputs.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => {
                  setSelectedIndex(idx);
                  if (!isEditing) {
                    soundService.playSelect();
                    onSelectInput(item.id);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-white/20 ring-1 ring-white/50 shadow-lg translate-x-1'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 rounded-xl bg-black/30">
                    {getInputIcon(item.type, item.label)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{item.name}</span>
                      {item.isActive && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdateInputLabel(item.id, editValue);
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/20 focus:outline-none focus:border-white"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onUpdateInputLabel(item.id, editValue);
                            setEditingId(null);
                          }}
                          className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-white/50">{item.label}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(item.id);
                      setEditValue(item.label);
                    }}
                    title="Rename input"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {item.isActive ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <span className="text-xs text-white/30 font-mono">Switch</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span />
          <button
            onClick={() => {
              soundService.playBack();
              onClose();
            }}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
