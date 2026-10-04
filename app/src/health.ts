import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { persisted, uid } from './store/persist';
import { dayKey, addDays } from './domain/time';
import { sleepLog, type Night } from './domain/sleep';
import { logWeight, weights } from './domain/body';
import { workouts, type Workout } from './domain/training';

const isNative = Capacitor.isNativePlatform();
export const healthState = persisted<{ on: boolean; last: number; msg: string; counts: Record<string, number> }>('healthState', { on: false, last: 0, msg: '', counts: {} });
/** Daily numbers that have no home elsewhere: steps, resting heart rate, active kcal. */
export const healthDaily = persisted<Record<string, { steps?: number; rhr?: number; kcal?: number }>>('healthDaily', {});

const READ = ['sleep', 'weight', 'steps', 'restingHeartRate', 'calories', 'workouts'] as const;
type HealthPlugin = typeof import('@capgo/capacitor-health').Health;
let H: HealthPlugin | null = null;
const plugin = async () => (H ??= (await import('@capgo/capacitor-health')).Health);

export async function healthAvailable() {
  if (!isNative) return { ok: false, why: 'ใช้ได้เฉพาะแอป Android ที่ติดตั้งแล้ว' };
  try { const r = await (await plugin()).isAvailable(); return { ok: r.available, why: r.reason ?? 'เครื่องนี้ยังไม่มี Health Connect' }; } catch (e) { return { ok: false, why: String(e) }; }
}

/** Opens the Health Connect permission sheet. */
export async function connectHealth() {
  const a = await healthAvailable(); if (!a.ok) { healthState.value = { ...healthState.value, msg: a.why }; return false; }
  const h = await plugin();
  try {
    const r = await h.requestAuthorization({ read: [...READ] as never });
    const ok = r.readAuthorized.length > 0;
    healthState.value = { ...healthState.value, on: ok, msg: ok ? `อนุญาตแล้ว ${r.readAuthorized.length} ประเภท${r.readDenied.length ? ` · ปฏิเสธ ${r.readDenied.join(', ')}` : ''}` : 'ยังไม่ได้อนุญาต' };
    if (ok) await syncHealth(true);
    return ok;
  } catch (e) { healthState.value = { ...healthState.value, msg: `เชื่อมไม่สำเร็จ: ${String(e).slice(0, 80)}` }; return false; }
}
export async function openHealthSettings() { try { await (await plugin()).openHealthConnectSettings(); } catch { /* ignore */ } }

const WORKOUT_TH: Record<string, string> = { basketball: 'บาสเกตบอล', running: 'วิ่ง', runningTreadmill: 'วิ่งลู่', walking: 'เดิน', cycling: 'ปั่นจักรยาน', swimming: 'ว่ายน้ำ', strengthTraining: 'เวทเทรนนิ่ง', traditionalStrengthTraining: 'เวทเทรนนิ่ง', weightlifting: 'ยกน้ำหนัก', yoga: 'โยคะ', highIntensityIntervalTraining: 'HIIT', hiking: 'เดินป่า', badminton: 'แบดมินตัน', soccer: 'ฟุตบอล', tennis: 'เทนนิส' };
const iso = (d: Date) => d.toISOString();

let busy = false;
/** Pull the last `days` days from Health Connect. User-entered values always win; only empty slots are filled. */
export async function syncHealth(force = false, days = 14) {
  if (!isNative || !healthState.value.on || busy) return;
  if (!force && Date.now() - healthState.value.last < 15 * 60e3) return;
  busy = true;
  const counts: Record<string, number> = {};
  try {
    const h = await plugin(), end = new Date(), start = new Date(Date.now() - days * 864e5);
    const range = { startDate: iso(start), endDate: iso(end) };

    // Sleep: cluster segments into nights, keep the longest per wake-up day.
    const sl = (await h.readSamples({ dataType: 'sleep', ...range, limit: 1000, ascending: true })).samples
      .filter((s) => s.sleepState !== 'awake' && s.sleepState !== 'inBed')
      .map((s) => ({ a: new Date(s.startDate).getTime(), b: new Date(s.endDate).getTime() })).filter((s) => s.b > s.a).sort((x, y) => x.a - y.a);
    const clusters: { a: number; b: number; asleep: number }[] = [];
    for (const s of sl) { const c = clusters.at(-1); if (c && s.a - c.b < 90 * 60e3) { c.b = Math.max(c.b, s.b); c.asleep += s.b - s.a; } else clusters.push({ a: s.a, b: s.b, asleep: s.b - s.a }); }
    const best: Record<string, Night> = {};
    for (const c of clusters) { if (c.asleep < 3 * 3600e3) continue; const k = dayKey(new Date(c.b)), cur = best[k]; if (!cur || c.b - c.a > (cur.wake ?? 0) - cur.bed) best[k] = { bed: c.a, wake: c.b, source: 'health' }; }
    let n = 0; const next = { ...sleepLog.value };
    for (const [k, v] of Object.entries(best)) { if (!next[k] || next[k].source === 'health') { next[k] = v; n++; } }
    if (n) sleepLog.value = next; counts.sleep = n;

    // Weight
    const ws = (await h.readSamples({ dataType: 'weight', ...range, limit: 200, ascending: true })).samples;
    let wn = 0; for (const s of ws) { const date = dayKey(new Date(s.startDate)); if (!weights.value.some((x) => x.date === date && x.source === 'health' && x.kg === Math.round(s.value * 10) / 10)) { logWeight(Math.round(s.value * 10) / 10, { source: 'health', date }); wn++; } }
    counts.weight = wn;

    // Daily aggregates
    const daily = { ...healthDaily.value };
    for (const [type, key, agg] of [['steps', 'steps', 'sum'], ['restingHeartRate', 'rhr', 'average'], ['calories', 'kcal', 'sum']] as const) {
      try {
        const r = await h.queryAggregated({ dataType: type, ...range, bucket: 'day', aggregation: agg });
        for (const s of r.samples) { const k = dayKey(new Date(s.startDate)), v = Math.round(s.value); if (v > 0) daily[k] = { ...daily[k], [key]: v }; }
        counts[key] = r.samples.length;
      } catch { /* type not granted or no data */ }
    }
    healthDaily.value = daily;

    // Watch workouts: skip anything that overlaps a session logged in the app.
    const wo = (await h.queryWorkouts({ ...range, limit: 100, ascending: true })).workouts;
    const mine = workouts.value; let wc = 0; const add: Workout[] = [];
    for (const w of wo) {
      const t0 = new Date(w.startDate).getTime(), t1 = new Date(w.endDate).getTime(), id = 'hc:' + (w.platformId ?? t0);
      if (mine.some((x) => x.id === id) || mine.some((x) => !x.id.startsWith('hc:') && x.t0 < t1 && (x.t1 ?? x.t0 + 3600e3) > t0)) continue;
      add.push({ id: id || uid(), date: dayKey(new Date(t0)), dayId: 'watch', dayName: WORKOUT_TH[w.workoutType] ?? w.workoutType, t0, t1, ex: [] }); wc++;
    }
    if (add.length) workouts.value = [...workouts.value, ...add]; counts.workouts = wc;
    healthState.value = { ...healthState.value, last: Date.now(), msg: `ซิงก์ล่าสุด · นอน ${counts.sleep} คืน น้ำหนัก ${counts.weight} ครั้ง กิจกรรม ${counts.workouts} รายการ`, counts };
  } catch (e) { healthState.value = { ...healthState.value, msg: `ซิงก์ไม่สำเร็จ: ${String(e).slice(0, 80)}` }; }
  finally { busy = false; }
}

export function initHealth() {
  if (!isNative) return;
  void syncHealth();
  void App.addListener('appStateChange', (s) => { if (s.isActive) void syncHealth(); });
}
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(addDays(new Date(), -i)));
