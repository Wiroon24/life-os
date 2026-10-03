import { persisted, uid } from '../store/persist';
import { addDays, dayKey, parseKey } from './time';
import { foodLog, tdee, customTargets } from './food';
import { sleepLog, hoursOf } from './sleep';
import { program, workouts } from './training';
import { template } from './plan';
import { profile } from './profile';

export interface Weigh { id: string; date: string; kg: number; fat?: number; smm?: number; visceral?: number; source: 'manual' | 'inbody' | 'scale' | 'health' }
export const weights = persisted<Weigh[]>('weights', [{ id: uid(), date: '2026-08-03', kg: 96.0, fat: 34.2, smm: 36.4, visceral: 13, source: 'inbody' }]);
export const MILESTONES = [90, 84, 79];
export const START_KG = 96.0;

export function logWeight(kg: number, extra: Partial<Weigh> = {}, d = new Date()) {
  const date = extra.date ?? dayKey(d);
  weights.value = [...weights.value.filter((w) => !(w.date === date && w.source === (extra.source ?? 'manual'))), { id: uid(), date, kg, source: 'manual', ...extra }];
}
export const sortedW = () => [...weights.value].sort((a, b) => a.date.localeCompare(b.date));
export const latestW = () => sortedW().at(-1);
export const inbodies = () => sortedW().filter((w) => w.smm != null || w.fat != null);

/** Trailing 7-day average of whatever weigh-ins exist in the window. */
export function avg7(date: Date) {
  const end = dayKey(date), start = dayKey(addDays(date, -6));
  const xs = weights.value.filter((w) => w.date >= start && w.date <= end).map((w) => w.kg);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** kg per week (positive = losing), from 7-day averages 3 weeks apart (or what's available). */
export function rate(today = new Date()) {
  const now = avg7(today);
  for (const back of [21, 14, 7]) { const then = avg7(addDays(today, -back)); if (now != null && then != null) return ((then - now) / back) * 7; }
  const s = sortedW(); if (s.length >= 2) { const a = s[0], b = s.at(-1)!, days = (parseKey(b.date).getTime() - parseKey(a.date).getTime()) / 864e5; if (days >= 7) return ((a.kg - b.kg) / days) * 7; }
  return null;
}

export function etaFor(kg: number, today = new Date()) {
  const r = rate(today) ?? 0.6, now = avg7(today) ?? latestW()?.kg ?? START_KG;
  if (now <= kg) return 'ถึงแล้ว';
  if (r <= 0.05) return '—';
  return addDays(today, Math.round(((now - kg) / r) * 7));
}

/** Adaptive TDEE (MacroFactor-style): intake + energy from weight change, smoothed. Needs 14 days. */
export function updateTdee(today = new Date()) {
  const days = Array.from({ length: 14 }, (_, i) => dayKey(addDays(today, -1 - i)));
  const logged = days.map((k) => foodLog.value.filter((e) => e.date === k).reduce((a, e) => a + e.k, 0)).filter((k) => k > 800);
  const r = rate(today);
  if (logged.length < 10 || r == null) return false;
  const intake = logged.reduce((a, b) => a + b, 0) / logged.length;
  const observed = intake + (r * 7700) / 7;
  tdee.value = { kcal: Math.round(0.7 * tdee.value.kcal + 0.3 * observed), updated: dayKey(today) };
  return true;
}

/* ---------- Weekly check-in ---------- */
export interface Proposal { id: string; icon: string; role: 'food' | 'workout' | 'recovery'; title: (v: number) => string; unit: (v: number) => string; why: string; value: number; step: number; apply: (v: number) => void }
export const checkins = persisted<Record<string, { decided: Record<string, 'ok' | 'no'>; at: number }>>('checkins', {});

const bedMin = (ts: number) => { const d = new Date(ts); const m = d.getHours() * 60 + d.getMinutes(); return m < 12 * 60 ? m + 1440 : m; };

export function weekSummary(today = new Date()) {
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(today, -i)));
  const nights = keys.map((k) => sleepLog.value[k]).filter(Boolean);
  const hrs = nights.map(hoursOf).filter((h): h is number => h != null);
  const prot = keys.filter((k) => foodLog.value.filter((e) => e.date === k).reduce((a, e) => a + e.p, 0) >= 150).length;
  const sessions = workouts.value.filter((w) => keys.includes(w.date)).length;
  const a0 = avg7(today), a1 = avg7(addDays(today, -7));
  return { dW: a0 != null && a1 != null ? a0 - a1 : null, sessions, prot, avgH: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null, avgBed: nights.length ? nights.reduce((a, n) => a + bedMin(n.bed), 0) / nights.length : null };
}

export function proposals(today = new Date()): Proposal[] {
  const out: Proposal[] = [], s = weekSummary(today), r = rate(today);
  if (r != null && r > 1.0) out.push({ id: 'kcal+', icon: 'restaurant', role: 'food', value: 100, step: 50, title: (v) => `+${v} kcal ทุกวัน`, unit: (v) => `+${v} kcal`, why: `ลง ${r.toFixed(2)} kg/สัปดาห์ เร็วกว่าเป้า 0.5–0.8 · กันกล้ามเนื้อหาย`, apply: (v) => (tdee.value = { ...tdee.value, kcal: tdee.value.kcal + v }) });
  if (r != null && r < 0.3) out.push({ id: 'kcal-', icon: 'restaurant', role: 'food', value: 100, step: 50, title: (v) => `−${v} kcal ทุกวัน`, unit: (v) => `−${v} kcal`, why: `ลงแค่ ${Math.max(0, r).toFixed(2)} kg/สัปดาห์ ช้ากว่าเป้า`, apply: (v) => (tdee.value = { ...tdee.value, kcal: tdee.value.kcal - v }) });
  // A lift that hit every target rep in its last 2 sessions earns an extra set.
  for (const day of program.value) for (const e of day.exercises) {
    if (e.unit !== 'kg' || e.sets >= 5) continue;
    const last2 = workouts.value.filter((w) => w.ex.some((x) => x.name === e.name)).sort((a, b) => b.t0 - a.t0).slice(0, 2);
    if (last2.length === 2 && last2.every((w) => w.ex.find((x) => x.name === e.name)!.sets.filter((x) => x.done).every((x) => x.reps >= e.reps))) {
      out.push({ id: 'set:' + e.id, icon: 'fitness_center', role: 'workout', value: 1, step: 1, title: (v) => `${e.name} +${v} เซ็ต`, unit: (v) => `+${v} เซ็ต`, why: `ทำครบ ${e.sets}×${e.reps} สองครั้งติด`, apply: (v) => (program.value = program.value.map((d) => ({ ...d, exercises: d.exercises.map((x) => (x.id === e.id ? { ...x, sets: x.sets + v } : x)) }))) });
      break;
    }
  }
  const [th, tm] = profile.value.sleep.split(':').map(Number), target = (th < 12 ? th + 24 : th) * 60 + tm;
  if (s.avgBed != null && s.avgBed > target + 10) {
    const late = Math.round(s.avgBed - target);
    out.push({ id: 'bed', icon: 'bedtime', role: 'recovery', value: 15, step: 5, title: (v) => `เข้านอนเร็วขึ้น ${v} นาที`, unit: (v) => `${v} นาที`, why: `เข้านอนเฉลี่ยช้ากว่าเป้า ${late} นาที`, apply: (v) => shiftBedtime(-v) });
  }
  return out;
}

/** Move the night routine (meds-night, close, sleep) by `min` minutes on the template + profile target. */
export function shiftBedtime(min: number) {
  template.value = template.value.map((b) => (['meds-night', 'close', 'sleep'].includes(b.kind ?? '') ? { ...b, start: b.start + min, source: 'user' } : b));
  const [h, m] = profile.value.sleep.split(':').map(Number); let t = (h < 12 ? h + 24 : h) * 60 + m + min; t %= 1440;
  profile.value = { ...profile.value, sleep: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` };
}

export const nutritionIsCustom = () => Object.keys(customTargets.value).length > 0;
