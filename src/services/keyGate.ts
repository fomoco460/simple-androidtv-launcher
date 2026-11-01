/**
 * Key gate: one listener, installed before anything else, that hands remote/keyboard events to the
 * topmost "owner" (an open menu, modal or ambient mode) first.
 *
 * Plain window listeners run in registration order, so a later-opened modal can't reliably get ahead of
 * the screen underneath. The gate is registered at startup, so it always runs first, and an owner can
 * call stopImmediatePropagation() to keep every listener below it from seeing the event.
 */

type Owner = { handler: (e: Event) => void; types: string[] };

const stack: Owner[] = [];

const GATED = [
  'keydown',
  'mousedown',
  'touchstart',
  'chromecast-back-press',
  'chromecast-select-long',
  'chromecast-home-press',
];

const gate = (e: Event) => {
  const top = stack[stack.length - 1];
  if (top && top.types.includes(e.type)) top.handler(e);
};

if (typeof window !== 'undefined') {
  GATED.forEach((t) => window.addEventListener(t, gate, true));
}

/** Registers an owner; returns the function that removes it. */
export function pushKeyOwner(handler: (e: Event) => void, types: string[] = ['keydown']): () => void {
  const owner: Owner = { handler, types };
  stack.push(owner);
  return () => {
    const i = stack.indexOf(owner);
    if (i >= 0) stack.splice(i, 1);
  };
}
