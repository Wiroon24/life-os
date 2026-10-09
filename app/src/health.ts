import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { signal } from '@preact/signals';
import { persisted, uid } from './store/persist';
import { dayKey, addDays } from './domain/time';
import { sleepLog, type Night } from './domain/sleep';
import { logWeight, weights } from './domain/body';
import { workouts, type Workout } from './domain/training';
import { profile } from './domain/profile';

const isNative = Capacitor.isNativePlatform();
export const healthState = persisted<{ on: boolean; last: number; msg: string; counts: Record<string, number> }>('healthState', { on: false, last: 0, msg: '', counts: {} });
/** Daily numbers that have no home elsewhere: steps, resting heart rate, active kcal. */
export interface HealthDay {
  steps?: number; rhr?: number; kcal?: number;
  /** Minutes per heart-rate zone 1..5 (50–60…90%+ of max HR) and minutes of HR coverage that day. */
  hrz?: number[]; hrMin?: number;
  /** Sleep stage minutes of the night that ended this day. */
  stg?: { deep: number; light: number; rem: number; awake: number };
}
export const healthDaily = persisted<Record<string, HealthDay>>('healthDaily', {});
/** Max HR estimate (Tanaka: 208 − 0.7 × age). */
export const hrMax = () => Math.round(208 - 0.7 * Math.max(15, new Date().getFullYear() - (profile.value.birthYear || 1996)));

export const BUILD = 'hc-2026-10-09b';
/** Visible trace of what the native calls did, because the permission flow runs outside the WebView. */
export const healthLog = signal<string[]>([]);
const note = (s: string) => { healthLog.value = [...healthLog.value.slice(-14), `${new Date().toLocaleTimeString('th-TH')} ${s}`]; };
async function step<T>(name: string, p: Promise<T>, ms = 10000): Promise<T> {
  note(`${name}…`); const t0 = Date.now();
  try {
    const r = await Promise.race([p, new Promise<never>((_, bad) => setTimeout(() => bad(new Error(`ไม่ตอบใน ${ms / 1000} วิ`)), ms))]);
    note(`${name} ✓ ${Date.now() - t0}ms ${JSON.stringify(r)?.slice(0, 90) ?? ''}`); return r;
  } catch (e) { note(`${name} ✗ ${e instanceof Error ? e.message : String(e)}`); throw e; }
}
/** Synced into the app's own logs. */
const SYNC = ['sleep', 'weight', 'steps', 'restingHeartRate', 'calories', 'workouts'] as const;
/** Read only for the data check for now (future Strain/Recovery scores need them). */
const AUDIT = ['heartRate', 'heartRateVariability', 'oxygenSaturation', 'respiratoryRate', 'bodyFat'] as const;
const READ = [...SYNC, ...AUDIT] as const;
type HealthPlugin = typeof import('@capgo/capacitor-health').Health;
/** Never return or await the plugin proxy itself: Capacitor proxies answer `.then`, so a promise resolved with one never settles. Keep it inside a plain object. */
let H: { api: HealthPlugin } | null = null;
const plugin = async () => (H ??= { api: (await import('@capgo/capacitor-health')).Health });

export async function healthAvailable() {
  if (!isNative) return { ok: false, why: 'ใช้ได้เฉพาะแอป Android ที่ติดตั้งแล้ว' };
  try { note(`ปลั๊กอิน Health ${Capacitor.isPluginAvailable('Health') ? 'พร้อม' : 'ไม่พบ'}`); const h = (await step('โหลดปลั๊กอิน', plugin())).api; const r = await step('isAvailable', h.isAvailable()); return { ok: r.available, why: r.reason ?? 'เครื่องนี้ยังไม่มี Health Connect' }; } catch (e) { return { ok: false, why: String(e) }; }
}

/** Is anything already allowed? (The permission screen can outlive the app process, so never rely on the request promise alone.) */
export async function refreshHealth() {
  if (!isNative) return false;
  try {
    const r = await step('checkAuthorization', (async () => (await plugin()).api.checkAuthorization({ read: [...READ] as never }))());
    const ok = r.readAuthorized.length > 0;
    if (ok !== healthState.value.on) healthState.value = { ...healthState.value, on: ok, msg: ok ? `อนุญาตแล้ว ${r.readAuthorized.length} ประเภท` : healthState.value.msg };
    return ok;
  } catch { return false; }
}

/** Opens the Health Connect permission sheet (skipped when permission is already granted). */
export async function connectHealth() {
  const a = await healthAvailable(); if (!a.ok) { healthState.value = { ...healthState.value, msg: a.why }; return false; }
  const h = (await plugin()).api;
  healthState.value = { ...healthState.value, msg: 'กำลังขอสิทธิ์…' };
  try {
    // Ask again when a newly added type (e.g. heart rate) isn't granted yet, not just when nothing is.
    const cur = await step('checkAuthorization', h.checkAuthorization({ read: [...READ] as never }));
    if (cur.readAuthorized.length > 0 && cur.readDenied.length === 0) { await refreshHealth(); await syncHealth(true); return true; }
    const r = await step('requestAuthorization', h.requestAuthorization({ read: [...READ] as never }), 120000);
    const ok = r.readAuthorized.length > 0;
    healthState.value = { ...healthState.value, on: ok, msg: ok ? `อนุญาตแล้ว ${r.readAuthorized.length} ประเภท${r.readDenied.length ? ` · ปฏิเสธ ${r.readDenied.join(', ')}` : ''}` : 'ยังไม่ได้อนุญาต' };
    if (ok) await syncHealth(true);
    return ok;
  } catch (e) { healthState.value = { ...healthState.value, msg: `เชื่อมไม่สำเร็จ: ${String(e).slice(0, 80)}` }; return false; }
}
export async function openHealthSettings() { try { await step('openHealthConnectSettings', (async () => (await plugin()).api.openHealthConnectSettings())()); } catch { /* shown in the log */ } }

const WORKOUT_TH: Record<string, string> = { basketball: 'บาสเกตบอล', running: 'วิ่ง', runningTreadmill: 'วิ่งลู่', walking: 'เดิน', cycling: 'ปั่นจักรยาน', swimming: 'ว่ายน้ำ', strengthTraining: 'เวทเทรนนิ่ง', traditionalStrengthTraining: 'เวทเทรนนิ่ง', weightlifting: 'ยกน้ำหนัก', yoga: 'โยคะ', highIntensityIntervalTraining: 'HIIT', hiking: 'เดินป่า', badminton: 'แบดมินตัน', soccer: 'ฟุตบอล', tennis: 'เทนนิส' };
const iso = (d: Date) => d.toISOString();

let busy = false;
/** Pull the last `days` days from Health Connect. User-entered values always win; only empty slots are filled. */
export async function syncHealth(force = false, days = 30) {
  if (!isNative || !healthState.value.on || busy) return;
  if (!force && Date.now() - healthState.value.last < 15 * 60e3) return;
  busy = true;
  const counts: Record<string, number> = {};
  try {
    const h = (await plugin()).api, end = new Date(), start = new Date(Date.now() - days * 864e5);
    const range = { startDate: iso(start), endDate: iso(end) };

    // Sleep: cluster segments into nights, keep the longest per wake-up day.
    const rawSleep = (await h.readSamples({ dataType: 'sleep', ...range, limit: 1000, ascending: true })).samples;
    note(`sleep: อ่านได้ ${rawSleep.length} ช่วง จาก ${[...new Set(rawSleep.map((x) => x.sourceName ?? x.sourceId ?? '?'))].join(', ') || '-'}`);
    const sl = rawSleep
      .filter((s) => s.sleepState !== 'awake' && s.sleepState !== 'inBed')
      .map((s) => ({ a: new Date(s.startDate).getTime(), b: new Date(s.endDate).getTime() })).filter((s) => s.b > s.a).sort((x, y) => x.a - y.a);
    const clusters: { a: number; b: number; asleep: number }[] = [];
    for (const s of sl) { const c = clusters.at(-1); if (c && s.a - c.b < 90 * 60e3) { c.b = Math.max(c.b, s.b); c.asleep += s.b - s.a; } else clusters.push({ a: s.a, b: s.b, asleep: s.b - s.a }); }
    const best: Record<string, Night> = {};
    for (const c of clusters) { if (c.asleep < 3 * 3600e3) continue; const k = dayKey(new Date(c.b)), cur = best[k]; if (!cur || c.b - c.a > (cur.wake ?? 0) - cur.bed) best[k] = { bed: c.a, wake: c.b, source: 'health' }; }
    let n = 0; const next = { ...sleepLog.value };
    for (const [k, v] of Object.entries(best)) { if (!next[k] || next[k].source === 'health') { next[k] = v; n++; } }
    if (n) sleepLog.value = next; counts.sleep = n;
    // Stage minutes per night: from separate segments (sleepState) or nested stages[] inside a session.
    const stageDays: Record<string, NonNullable<HealthDay['stg']>> = {};
    for (const [k, v] of Object.entries(best)) {
      const g = { deep: 0, light: 0, rem: 0, awake: 0 }; let any = false;
      for (const s of rawSleep) {
        const a = new Date(s.startDate).getTime(), b = new Date(s.endDate).getTime();
        if (b <= v.bed - 30 * 60e3 || a >= (v.wake ?? v.bed) + 30 * 60e3) continue;
        if (s.stages?.length) for (const st of s.stages) { if (st.stage in g) { g[st.stage as keyof typeof g] += st.durationMinutes || 0; any = true; } }
        else if (s.sleepState && s.sleepState in g) { g[s.sleepState as keyof typeof g] += (b - a) / 60e3; any = true; }
      }
      if (any && g.deep + g.light + g.rem > 0) stageDays[k] = { deep: Math.round(g.deep), light: Math.round(g.light), rem: Math.round(g.rem), awake: Math.round(g.awake) };
    }

    // Weight
    const ws = (await h.readSamples({ dataType: 'weight', ...range, limit: 200, ascending: true })).samples;
    note(`weight: อ่านได้ ${ws.length} ครั้ง จาก ${[...new Set(ws.map((x) => x.sourceName ?? x.sourceId ?? '?'))].join(', ') || '-'}`);
    let wn = 0; for (const s of ws) { const date = dayKey(new Date(s.startDate)); if (!weights.value.some((x) => x.date === date && x.source === 'health' && x.kg === Math.round(s.value * 10) / 10)) { logWeight(Math.round(s.value * 10) / 10, { source: 'health', date }); wn++; } }
    counts.weight = wn;

    // Daily aggregates
    const daily = { ...healthDaily.value };
    for (const [type, key, agg] of [['steps', 'steps', 'sum'], ['restingHeartRate', 'rhr', 'average'], ['calories', 'kcal', 'sum']] as const) {
      try {
        const r = await h.queryAggregated({ dataType: type, ...range, bucket: 'day', aggregation: agg });
        for (const s of r.samples) { const k = dayKey(new Date(s.startDate)), v = Math.round(s.value); if (v > 0) daily[k] = { ...daily[k], [key]: v }; }
        counts[key] = r.samples.length; note(`${type}: ${r.samples.length} วัน`);
      } catch (e) { note(`${type} ✗ ${e instanceof Error ? e.message : String(e)}`); }
    }
    for (const [k, g] of Object.entries(stageDays)) daily[k] = { ...daily[k], stg: g };
    // Fallback for days the aggregate missed: sum raw samples per source, keep the largest source (phone and watch both count steps).
    for (const [type, key] of [['steps', 'steps'], ['calories', 'kcal']] as const) {
      try {
        const raw = (await h.readSamples({ dataType: type, ...range, limit: 20000, ascending: true })).samples;
        const per: Record<string, Record<string, number>> = {};
        for (const s of raw) { const k = dayKey(new Date(s.startDate)), src = s.sourceId ?? s.sourceName ?? '?'; ((per[k] ??= {})[src] = (per[k][src] ?? 0) + s.value); }
        for (const [k, bySrc] of Object.entries(per)) { if (daily[k]?.[key]) continue; const v = Math.round(Math.max(...Object.values(bySrc))); if (v > 0) daily[k] = { ...daily[k], [key]: v }; }
      } catch (e) { note(`${type} (ดิบ) ✗ ${e instanceof Error ? e.message : String(e)}`); }
    }
    // Heart rate → minutes per zone per day (each sample counts until the next one, max 5 min).
    try {
      const hr = (await h.readSamples({ dataType: 'heartRate', ...range, limit: 50000, ascending: true })).samples
        .map((s) => ({ t: new Date(s.startDate).getTime(), v: s.value })).filter((s) => s.v > 25 && s.v < 230).sort((a, b) => a.t - b.t);
      const mx = hrMax(), per: Record<string, { z: number[]; m: number }> = {};
      hr.forEach((s, i) => {
        const gap = Math.min(5, Math.max(0, ((hr[i + 1]?.t ?? s.t + 60e3) - s.t) / 60e3)), k = dayKey(new Date(s.t)), d = (per[k] ??= { z: [0, 0, 0, 0, 0], m: 0 });
        d.m += gap; const p = s.v / mx; const zi = p >= 0.9 ? 4 : p >= 0.8 ? 3 : p >= 0.7 ? 2 : p >= 0.6 ? 1 : p >= 0.5 ? 0 : -1; if (zi >= 0) d.z[zi] += gap;
      });
      for (const [k, d] of Object.entries(per)) daily[k] = { ...daily[k], hrz: d.z.map((x) => Math.round(x)), hrMin: Math.round(d.m) };
      counts.hr = Object.keys(per).length; note(`heartRate: ${hr.length} ค่า ${counts.hr} วัน`);
    } catch (e) { note(`heartRate ✗ ${e instanceof Error ? e.message : String(e)}`); }
    healthDaily.value = daily;

    // Watch workouts: skip anything that overlaps a session logged in the app.
    const wo = (await h.queryWorkouts({ ...range, limit: 100, ascending: true })).workouts;
    note(`workouts: อ่านได้ ${wo.length} รายการ จาก ${[...new Set(wo.map((x) => x.sourceName ?? x.sourceId ?? '?'))].join(', ') || '-'}`);
    const mine = workouts.value; let wc = 0; const add: Workout[] = [];
    for (const w of wo) {
      const t0 = new Date(w.startDate).getTime(), t1 = new Date(w.endDate).getTime(), id = 'hc:' + (w.platformId ?? t0);
      if (mine.some((x) => x.id === id) || mine.some((x) => !x.id.startsWith('hc:') && x.t0 < t1 && (x.t1 ?? x.t0 + 3600e3) > t0)) continue;
      add.push({ id: id || uid(), date: dayKey(new Date(t0)), dayId: 'watch', dayName: WORKOUT_TH[w.workoutType] ?? w.workoutType, t0, t1, ex: [] }); wc++;
    }
    if (add.length) workouts.value = [...workouts.value, ...add]; counts.workouts = wc;
    healthState.value = { ...healthState.value, last: Date.now(), msg: `ซิงก์ล่าสุด · นอน ${counts.sleep} คืน น้ำหนัก ${counts.weight} ครั้ง กิจกรรม ${counts.workouts} รายการ`, counts };
  } catch (e) { note(`ซิงก์ ✗ ${e instanceof Error ? e.message : String(e)}`); healthState.value = { ...healthState.value, msg: `ซิงก์ไม่สำเร็จ: ${String(e).slice(0, 80)}` }; }
  finally { busy = false; }
}

/* ---------- Data check: what Health Connect really holds, and how dense/plausible it is ---------- */
export interface AuditRow {
  type: string; label: string; unit: string; n: number; days: number; perDay: number;
  /** Median gap between consecutive points in minutes (how often the watch measures). */
  gapMin: number | null; min: number | null; max: number | null;
  sources: string[]; samples: string[]; warn: string[];
}
export const healthAudit = persisted<{ at: number; days: number; rows: AuditRow[] }>('healthAudit', { at: 0, days: 7, rows: [] });

const AUDIT_META: Record<string, { label: string; unit: string; ok?: [number, number] }> = {
  heartRate: { label: 'ชีพจร', unit: 'bpm', ok: [30, 220] }, restingHeartRate: { label: 'ชีพจรขณะพัก', unit: 'bpm', ok: [35, 100] },
  heartRateVariability: { label: 'HRV', unit: 'ms', ok: [5, 250] }, oxygenSaturation: { label: 'SpO2', unit: '%', ok: [80, 100] },
  respiratoryRate: { label: 'อัตราหายใจ', unit: 'ครั้ง/นาที', ok: [6, 40] }, steps: { label: 'ก้าว (รายการย่อย)', unit: 'ก้าว' },
  calories: { label: 'kcal กิจกรรม', unit: 'kcal' }, weight: { label: 'น้ำหนัก', unit: 'kg', ok: [30, 250] }, bodyFat: { label: 'ไขมัน', unit: '%', ok: [3, 60] },
  sleep: { label: 'การนอน (ช่วงย่อย)', unit: 'นาที' },
};
const STAGE_TH: Record<string, string> = { deep: 'ลึก', light: 'ตื้น', rem: 'REM', awake: 'ตื่น', asleep: 'หลับ', inBed: 'บนเตียง' };
/** "ลึก 85 · ตื้น 250 · REM 70 นาที" from a session's nested stages. */
const stageSum = (st: { stage: string; durationMinutes: number }[]) => {
  const m: Record<string, number> = {}; for (const g of st) m[g.stage] = (m[g.stage] ?? 0) + (g.durationMinutes || 0);
  return Object.entries(m).map(([k, v]) => `${STAGE_TH[k] ?? k} ${Math.round(v)}`).join(' · ') + ' นาที';
};
const hm = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`; };

/** Reads raw samples for the last `days` days and summarises each type. Nothing is written into the app's logs. */
export async function auditHealth(days = 7) {
  if (!isNative || !healthState.value.on) return;
  const h = (await plugin()).api, range = { startDate: iso(new Date(Date.now() - days * 864e5)), endDate: iso(new Date()) };
  const rows: AuditRow[] = [];
  for (const type of Object.keys(AUDIT_META)) {
    const m = AUDIT_META[type];
    try {
      const s = (await h.readSamples({ dataType: type as never, ...range, limit: 5000, ascending: true })).samples;
      const isSleep = type === 'sleep';
      const vals = s.map((x) => (isSleep ? (new Date(x.endDate).getTime() - new Date(x.startDate).getTime()) / 60e3 : type === 'oxygenSaturation' && x.value <= 1 ? x.value * 100 : x.value));
      const ts = s.map((x) => new Date(x.startDate).getTime());
      const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / 60e3).filter((g) => g > 0 && g < 6 * 60).sort((a, b) => a - b);
      const dayset = new Set(s.map((x) => dayKey(new Date(x.startDate))));
      const warn: string[] = [];
      if (m.ok) { const bad = vals.filter((v) => v < m.ok![0] || v > m.ok![1]).length; if (bad) warn.push(`${bad} ค่าอยู่นอกช่วงปกติ ${m.ok[0]}–${m.ok[1]}`); }
      if (type === 'heartRate' && gaps.length && gaps[gaps.length >> 1] > 15) warn.push('วัดห่างเกิน 15 นาที คำนวณความหนักของวันได้แค่คร่าวๆ');
      if (type === 'heartRateVariability' && s.length && s.length / Math.max(1, dayset.size) < 3) warn.push('น้อยกว่า 3 ค่าต่อวัน ใช้เป็นแนวโน้มได้ ไม่ละเอียด');
      // Stages may come as separate segments (sleepState) or nested inside one session record (stages[]).
      const staged = (x: (typeof s)[number]) => (x.sleepState && !['asleep', 'inBed', 'awake'].includes(x.sleepState)) || !!x.stages?.some((g) => ['deep', 'light', 'rem'].includes(g.stage));
      if (isSleep && s.length && !s.some(staged)) warn.push('ไม่มีระยะหลับ (ลึก/REM)');
      const r1 = (v: number) => Math.round(v * 10) / 10;
      rows.push({
        type, label: m.label, unit: m.unit, n: s.length, days: dayset.size, perDay: dayset.size ? Math.round(s.length / dayset.size) : 0,
        gapMin: gaps.length ? r1(gaps[gaps.length >> 1]) : null, min: vals.length ? r1(Math.min(...vals)) : null, max: vals.length ? r1(Math.max(...vals)) : null,
        sources: [...new Set(s.map((x) => x.sourceName ?? x.sourceId ?? '?'))],
        samples: s.slice(-3).reverse().map((x, i) => `${hm(x.startDate)} · ${r1(vals[vals.length - 1 - i])}${isSleep && x.sleepState ? ` ${x.sleepState}` : ''}${isSleep && x.stages?.length ? ` (${stageSum(x.stages)})` : ''}`), warn,
      });
      note(`ตรวจ ${type}: ${s.length} รายการ`);
    } catch (e) {
      rows.push({ type, label: m.label, unit: m.unit, n: 0, days: 0, perDay: 0, gapMin: null, min: null, max: null, sources: [], samples: [], warn: [`อ่านไม่ได้: ${e instanceof Error ? e.message : String(e)}`.slice(0, 90)] });
    }
  }
  healthAudit.value = { at: Date.now(), days, rows };
}

export function initHealth() {
  if (!isNative) return;
  void refreshHealth().then(() => syncHealth());
  void App.addListener('appStateChange', (s) => { if (s.isActive) void refreshHealth().then(() => syncHealth()); });
}
export const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(addDays(new Date(), -i)));
