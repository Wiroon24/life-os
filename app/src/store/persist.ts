import { signal, effect, type Signal } from '@preact/signals';

const PREFIX = 'iam5:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** A signal mirrored to localStorage. Writes are best-effort (private mode / quota). */
export function persisted<T>(key: string, initial: T | (() => T)): Signal<T> {
  const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
  const s = signal<T>(read(key, fallback));
  effect(() => {
    const v = s.value;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(v)); } catch { /* ignore */ }
  });
  return s;
}

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = read(k.slice(PREFIX.length), null);
  }
  return out;
}

export function resetAll() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
