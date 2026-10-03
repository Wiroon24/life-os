import { signal, computed } from '@preact/signals';

export type Tab = 'today' | 'body' | 'money' | 'coach';
export interface Route { name: string; params?: Record<string, unknown> }

export const tab = signal<Tab>('today');
/** Layer-1 screens pushed over the tab (max depth 2 incl. sheets, per design). */
export const stack = signal<Route[]>([]);
export const top = computed(() => stack.value[stack.value.length - 1] ?? null);
export const captureOpen = signal(false);

export const push = (name: string, params?: Record<string, unknown>) => {
  stack.value = [...stack.value, { name, params }];
  try { history.pushState({ d: stack.value.length }, ''); } catch { /* ignore */ }
  window.scrollTo(0, 0);
};
export const back = () => { if (stack.value.length) history.back(); };
export const goTab = (t: Tab) => { stack.value = []; tab.value = t; window.scrollTo(0, 0); };

window.addEventListener('popstate', () => {
  if (captureOpen.value) { captureOpen.value = false; return; }
  if (stack.value.length) stack.value = stack.value.slice(0, -1);
});
