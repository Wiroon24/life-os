import { useEffect, useRef } from 'preact/hooks';
import { stack, tab, goTab, captureOpen } from '../store/nav';

/**
 * Back-button handling. Anything closable (sheet, overlay, sub-view, edit mode) registers a handler while active;
 * the Android back button runs the most recently opened one first, then falls back to screen → tab → exit.
 */
interface H { fn: () => boolean }
const handlers: H[] = [];

export function useBack(fn: () => boolean, active = true) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const h: H = { fn: () => ref.current() };
    handlers.push(h);
    return () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1); };
  }, [active]);
}

export let exitApp: () => void = () => {};
export const setExitApp = (f: () => void) => { exitApp = f; };

/** Returns true if something handled it. */
export function handleBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) if (handlers[i].fn()) return true;
  if (captureOpen.value) { captureOpen.value = false; return true; }
  if (stack.value.length) { history.back(); return true; }
  if (tab.value !== 'today') { goTab('today'); return true; }
  exitApp();
  return false;
}
