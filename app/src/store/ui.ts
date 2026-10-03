import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';

export interface Undo { id: number; text: string; undo?: () => void }
export const snackbar = signal<Undo | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export function showUndo(text: string, undo?: () => void) {
  clearTimeout(timer);
  snackbar.value = { id: Date.now(), text, undo };
  timer = setTimeout(() => (snackbar.value = null), 5000);
}
export const toast = (text: string) => showUndo(text);

/** Bottom sheet host: one sheet at a time (max 2 layers deep per design rules). */
export interface SheetSpec { title?: string; body: () => ComponentChildren; tall?: boolean }
export const sheet = signal<SheetSpec | null>(null);
export const openSheet = (s: SheetSpec) => (sheet.value = s);
export const closeSheet = () => (sheet.value = null);

/** "แค่วันนี้ / ทุกครั้งต่อจากนี้" scope chooser. Resolves null when dismissed. */
export const scopeAsk = signal<{ title: string; resolve: (v: 'today' | 'always' | null) => void } | null>(null);
export const askScope = (title = 'เปลี่ยนแค่ไหน') =>
  new Promise<'today' | 'always' | null>((resolve) => (scopeAsk.value = { title, resolve }));

/** Ticks every 30s so time-based UI (now card, rings) refreshes. */
export const tick = signal(Date.now());
setInterval(() => (tick.value = Date.now()), 30_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick.value = Date.now(); });
