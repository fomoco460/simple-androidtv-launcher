import { useEffect, useRef, RefObject } from 'react';
import { soundService } from '../services/sound';

/**
 * D-pad (remote) navigation for any screen or modal.
 *
 * The Android side swallows the remote's D-pad keys and re-sends them to the page as plain
 * window "keydown" events (ArrowUp/Down/Left/Right, Enter, Escape for Back). Native focus
 * navigation therefore never happens, so every screen has to react to those events itself.
 *
 * This hook gives a screen full navigation with no per-screen bookkeeping:
 *   - mark every control with `data-nav` (buttons, tiles, inputs, ...)
 *   - arrows move focus to the nearest control in that direction (spatial navigation)
 *   - Enter presses the focused control, Back/Escape calls `onBack`
 *   - the focused control gets a visible highlight (see `[data-nav]:focus` in index.css)
 *   - events are swallowed while the screen is open, so screens underneath don't also react
 */

type Dir = 'up' | 'down' | 'left' | 'right';

const dirOf = (e: KeyboardEvent): Dir | null => {
  if (e.key === 'ArrowUp' || e.key === 'Up' || e.keyCode === 38 || e.keyCode === 19) return 'up';
  if (e.key === 'ArrowDown' || e.key === 'Down' || e.keyCode === 40 || e.keyCode === 20) return 'down';
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37 || e.keyCode === 21) return 'left';
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39 || e.keyCode === 22) return 'right';
  return null;
};

const isSelect = (e: KeyboardEvent): boolean =>
  e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66;

const isBack = (e: KeyboardEvent): boolean =>
  e.key === 'Escape' || e.key === 'Back' || e.key === 'GoBack' ||
  e.keyCode === 27 || e.keyCode === 4;

const isVisible = (el: HTMLElement): boolean => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none') return false;
  if ((el as HTMLButtonElement).disabled) return false;
  return el.getAttribute('aria-disabled') !== 'true';
};

const getItems = (root: HTMLElement, selector: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(isVisible);

/** Pick the nearest item in direction `dir`; off-axis distance is penalised so rows/columns stay straight. */
export function pickNext(from: HTMLElement, items: HTMLElement[], dir: Dir): HTMLElement | null {
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of items) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;

    let primary: number;
    let secondary: number;
    let ahead: boolean;
    switch (dir) {
      case 'right': ahead = b.left >= cx - 1 || bx > cx + 4; primary = bx - cx; secondary = Math.abs(by - cy); break;
      case 'left': ahead = b.right <= cx + 1 || bx < cx - 4; primary = cx - bx; secondary = Math.abs(by - cy); break;
      case 'down': ahead = b.top >= cy - 1 || by > cy + 4; primary = by - cy; secondary = Math.abs(bx - cx); break;
      default: ahead = b.bottom <= cy + 1 || by < cy - 4; primary = cy - by; secondary = Math.abs(bx - cx); break;
    }
    if (!ahead || primary <= 0) continue;

    // Controls that overlap on the other axis (same row / column) win over diagonal ones.
    const overlaps =
      dir === 'left' || dir === 'right'
        ? b.top < r.bottom && b.bottom > r.top
        : b.left < r.right && b.right > r.left;
    const score = primary + secondary * (overlaps ? 0.5 : 3) + (overlaps ? 0 : 200);
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

export function focusItem(el: HTMLElement) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

const nativeBridge = (): { showKeyboard?: () => void; hideKeyboard?: () => void } | undefined =>
  (window as unknown as { AndroidBridge?: { showKeyboard?: () => void; hideKeyboard?: () => void } })
    .AndroidBridge;

interface SpatialNavOptions {
  /** Element that contains every `data-nav` control of this screen. */
  containerRef: RefObject<HTMLElement | null>;
  /** Called on Back / Escape. */
  onBack?: () => void;
  /** CSS selector of focusable controls (default `[data-nav]`). */
  selector?: string;
  /** Set false to pause (e.g. a nested modal is on top). */
  enabled?: boolean;
}

export function useSpatialNav({
  containerRef,
  onBack,
  selector = '[data-nav]',
  enabled = true,
}: SpatialNavOptions) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Initial focus: the control marked data-nav-initial, otherwise the first one.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => {
      const root = containerRef.current;
      if (!root) return;
      const initial =
        root.querySelector<HTMLElement>('[data-nav-initial]') ?? getItems(root, selector)[0];
      if (initial) focusItem(initial);
    }, 30);
    return () => window.clearTimeout(id);
  }, [enabled, containerRef, selector]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root) return;

      const active = document.activeElement as HTMLElement | null;
      const current =
        active && root.contains(active) && active.matches(selector) ? active : null;
      const field =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
      // Real keystrokes typed into a field arrive with the field as target; the Android side
      // sends its synthetic events at `window`.
      const fromField = !!field && e.target === field;

      if (isBack(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (field && root.contains(field)) {
          // First Back leaves the text field (and closes the on-screen keyboard); second one closes.
          field.blur();
          nativeBridge()?.hideKeyboard?.();
          const items = getItems(root, selector);
          const idx = items.indexOf(field);
          const fallback = items[idx > 0 ? idx - 1 : idx + 1] ?? items[0];
          if (fallback) focusItem(fallback);
          return;
        }
        soundService.playBack();
        onBackRef.current?.();
        return;
      }

      const dir = dirOf(e);
      if (dir) {
        // Inside a text field, Left/Right move the caret until it hits the end of the text.
        if (fromField && field) {
          const start = field.selectionStart;
          const end = field.selectionEnd;
          if (dir === 'left' && start !== null && start !== 0) return;
          if (dir === 'right' && end !== null && end !== field.value.length) return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        const items = getItems(root, selector);
        const next = current
          ? pickNext(current, items, dir)
          : root.querySelector<HTMLElement>('[data-nav-initial]') ?? items[0] ?? null;
        if (next) {
          soundService.playMove();
          focusItem(next);
        }
        return;
      }

      if (isSelect(e)) {
        if (fromField) return; // let the field handle its own Enter (submit)
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!current) {
          const first = getItems(root, selector)[0];
          if (first) focusItem(first);
          return;
        }
        if (field) {
          // On the TV a focused text field needs the on-screen keyboard opened explicitly.
          nativeBridge()?.showKeyboard?.();
          return;
        }
        soundService.playSelect();
        current.click();
      }
    };

    // Capture phase + stopImmediatePropagation: this screen owns the keys while it is open.
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
      // Never leave the on-screen keyboard (and its key capture) behind when a screen closes.
      nativeBridge()?.hideKeyboard?.();
    };
  }, [enabled, containerRef, selector]);
}
