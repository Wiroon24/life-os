import { persisted } from '../store/persist';
import { dayKey } from './time';

/** One night, keyed by the date you woke up. Times are epoch ms. */
export interface Night { bed: number; wake?: number; source: 'button' | 'manual' | 'health' }
export const sleepLog = persisted<Record<string, Night>>('sleep', {});
export const asleep = persisted<number | null>('asleepSince', null);

export function goToSleep() { asleep.value = Date.now(); }
export function cancelSleep() { asleep.value = null; }

/** Called on app open: if we were asleep and it's now morning-ish, record the night. */
export function autoWake() {
  const since = asleep.value; if (!since) return;
  const now = Date.now(), h = new Date().getHours();
  if (now - since > 3 * 3600e3 && h >= 4 && h < 14) {
    sleepLog.value = { ...sleepLog.value, [dayKey()]: { bed: since, wake: now, source: 'button' } };
    asleep.value = null;
  }
}

export const nightFor = (d: Date) => sleepLog.value[dayKey(d)];
export const hoursOf = (n?: Night) => (n?.wake ? (n.wake - n.bed) / 3600e3 : null);

let hook: ((d: Date) => number | null) | null = null;
/** domain/scores.ts registers the full score (resting HR + sleep stages + strain); this avoids an import cycle. */
export const setRecoveryHook = (f: (d: Date) => number | null) => { hook = f; };
/** Recovery 0..100 or null. Falls back to sleep duration vs 7.5h target minus bedtime drift. */
export function recovery(d: Date): number | null {
  if (hook) { const v = hook(d); if (v != null) return v; }
  const n = nightFor(d), h = hoursOf(n);
  if (h == null || !n) return null;
  const dur = Math.min(1, h / 7.5) * 85;
  const bedH = new Date(n.bed).getHours() + new Date(n.bed).getMinutes() / 60, late = Math.max(0, (bedH < 12 ? bedH + 24 : bedH) - 24.5);
  return Math.max(0, Math.min(100, Math.round(dur + 15 - late * 6)));
}
