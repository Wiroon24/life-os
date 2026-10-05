import { useEffect, useRef, useState } from 'preact/hooks';
import { useBack } from './back';

/**
 * Touch-friendly drag-to-reorder for a vertical list (pointer events, works in the Android WebView,
 * unlike HTML5 draggable). Only the handle gets `touch-action: none`, so the rest of the row still scrolls the page.
 * A drag starts after 4px of vertical movement or a 250ms hold; a plain tap does nothing.
 */
interface Opts { ids: string[]; onDrop: (ids: string[]) => void; enabled: boolean }
interface Sess {
  id: string; pointerId: number; el: HTMLElement;
  startY: number; startScroll: number; lastY: number;
  mids: number[]; from: number; to: number; shift: number;
  active: boolean; timer?: ReturnType<typeof setTimeout>; raf?: number;
}
type Drag = { id: string; from: number; to: number; dy: number; shift: number };

const MOVE_PX = 4, HOLD_MS = 250, EDGE = 64, SPEED = 8;
const EASE = 'transform 220ms var(--ease-spring)';

export function useDragReorder({ ids, onDrop, enabled }: Opts) {
  const rows = useRef(new Map<string, HTMLElement>());
  const sess = useRef<Sess | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [settle, setSettle] = useState(false); // transitions off for the commit frame
  const idsRef = useRef(ids); idsRef.current = ids;
  const dropRef = useRef(onDrop); dropRef.current = onDrop;
  const key = ids.join('|');

  const stop = (s: Sess) => {
    if (s.timer) clearTimeout(s.timer);
    if (s.raf) cancelAnimationFrame(s.raf);
    try { if (s.el.hasPointerCapture(s.pointerId)) s.el.releasePointerCapture(s.pointerId); } catch { /* element gone */ }
  };
  /** Reset without committing (other rows animate back). */
  const cancel = () => { const s = sess.current; if (!s) return; stop(s); sess.current = null; setDrag(null); };

  const evaluate = () => {
    const s = sess.current; if (!s || !s.active) return;
    const dy = s.lastY - s.startY + (window.scrollY - s.startScroll);
    const center = s.mids[s.from] + dy;
    let to = s.from;
    for (let j = s.from + 1; j < s.mids.length; j++) if (center > s.mids[j]) to = j;
    for (let j = s.from - 1; j >= 0; j--) if (center < s.mids[j]) to = j;
    s.to = to;
    setDrag({ id: s.id, from: s.from, to, dy, shift: s.shift });
  };
  const tick = () => {
    const s = sess.current; if (!s || !s.active) return;
    const v = s.lastY < EDGE ? -SPEED : s.lastY > window.innerHeight - EDGE ? SPEED : 0;
    if (v) { const y = window.scrollY; window.scrollBy(0, v); if (window.scrollY !== y) evaluate(); }
    s.raf = requestAnimationFrame(tick);
  };
  const activate = () => {
    const s = sess.current; if (!s || s.active) return;
    s.active = true;
    if (s.timer) { clearTimeout(s.timer); s.timer = undefined; }
    navigator.vibrate?.(10);
    evaluate();
    s.raf = requestAnimationFrame(tick);
  };

  const down = (id: string) => (e: PointerEvent) => {
    if (!enabled || sess.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const list = idsRef.current, from = list.indexOf(id);
    if (from < 0) return;
    const rects = list.map((x) => rows.current.get(x)?.getBoundingClientRect());
    if (rects.some((r) => !r)) return;
    const rs = rects as DOMRect[];
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* */ }
    const gap = rs.length > 1 ? Math.max(0, rs[1].top - rs[0].bottom) : 0;
    sess.current = {
      id, pointerId: e.pointerId, el, startY: e.clientY, startScroll: window.scrollY, lastY: e.clientY,
      mids: rs.map((r) => r.top + r.height / 2), // viewport coords at drag start; dy adds any scroll since
      from, to: from, shift: rs[from].height + gap, active: false,
    };
    sess.current.timer = setTimeout(activate, HOLD_MS);
  };
  const move = (e: PointerEvent) => {
    const s = sess.current; if (!s || e.pointerId !== s.pointerId) return;
    s.lastY = e.clientY;
    if (!s.active) { if (Math.abs(e.clientY - s.startY) > MOVE_PX) activate(); return; }
    e.preventDefault();
    evaluate();
  };
  const up = (e: PointerEvent) => {
    const s = sess.current; if (!s || e.pointerId !== s.pointerId) return;
    stop(s); sess.current = null;
    if (s.active && s.to !== s.from) {
      const next = [...idsRef.current]; const [x] = next.splice(s.from, 1); next.splice(s.to, 0, x);
      setSettle(true); // the DOM reorders in this render; don't animate rows back from their shifted spot
      dropRef.current(next);
      requestAnimationFrame(() => requestAnimationFrame(() => setSettle(false)));
    }
    setDrag(null);
  };

  // Cancel when edit mode ends, the list changes under us (slot switch / delete), or on unmount.
  useEffect(() => { if (!enabled) cancel(); }, [enabled]);
  useEffect(() => { cancel(); }, [key]);
  useEffect(() => () => { const s = sess.current; if (s) { stop(s); sess.current = null; } }, []);
  // Back button cancels an active drag first (registered after the screen's edit-mode handler, so it runs first).
  useBack(() => { if (sess.current) { cancel(); return true; } return false; }, !!drag);

  return {
    dragging: drag?.id ?? null,
    cancel,
    rowRef: (id: string) => (el: HTMLElement | null) => { if (el) rows.current.set(id, el); else rows.current.delete(id); },
    handleProps: (id: string) => ({
      onPointerDown: down(id), onPointerMove: move, onPointerUp: up, onPointerCancel: cancel,
      style: { touchAction: 'none', cursor: drag?.id === id ? 'grabbing' : 'grab', userSelect: 'none' } as Record<string, string>,
    }),
    rowStyle: (id: string): Record<string, string | number> => {
      const base = { transition: settle ? 'none' : EASE, transform: 'none' };
      if (!drag) return base;
      if (id === drag.id) return { transform: `translateY(${drag.dy}px) scale(1.02)`, transition: 'none', position: 'relative', zIndex: 5, boxShadow: 'var(--shadow-2)', background: 'var(--surface)', borderRadius: 14 };
      const i = ids.indexOf(id), { from, to, shift } = drag;
      if (from < to && i > from && i <= to) return { ...base, transform: `translateY(${-shift}px)` };
      if (to < from && i >= to && i < from) return { ...base, transform: `translateY(${shift}px)` };
      return base;
    },
  };
}
