import { healthDaily, type HealthDay } from '../health';
import { sleepLog, setRecoveryHook, type Night } from './sleep';
import { workouts, planFor } from './training';
import { profile } from './profile';
import { addDays, dayKey, parseKey } from './time';

/**
 * Daily Sleep / Strain / Recovery, Bevel-style, from what a Bip 3 actually provides:
 * sleep + stages, ~1-min heart rate, one resting HR per day, steps, and workouts logged in the app.
 * No HRV, so Recovery leans on resting HR vs the user's own baseline.
 */
export interface Score { v: number; parts: string[]; est: boolean }

const clamp = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const hm = (min: number) => `${Math.floor(min / 60)} ชม. ${Math.round(min % 60)} นาที`;
const minOfDay = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Sleep need from the user's own wake/sleep targets (6.5–9 h), default 7.5 h. */
const needMin = () => { const p = profile.value; if (!p.wake || !p.sleep) return 450; let d = minOfDay(p.wake) - minOfDay(p.sleep); if (d <= 0) d += 1440; return clamp(d, 390, 540); };

export function sleepScore(key: string): Score | null {
  const n: Night | undefined = sleepLog.value[key]; if (!n?.wake) return null;
  const st = healthDaily.value[key]?.stg, inBed = (n.wake - n.bed) / 60e3;
  const asleep = st ? st.deep + st.light + st.rem : inBed, need = needMin();
  const parts: string[] = [`นอน ${hm(asleep)} จากที่ควรได้ ${hm(need)}`];
  let dur = Math.min(1, asleep / need) * 50;
  // Timing vs the user's own bedtime target: lose points after 30 min late.
  const bedMin = (() => { const d = new Date(n.bed); let m = d.getHours() * 60 + d.getMinutes(); if (m < 12 * 60) m += 1440; return m; })();
  let target = minOfDay(profile.value.sleep || '23:30'); if (target < 12 * 60) target += 1440;
  const late = Math.max(0, bedMin - target - 30), timing = clamp(25 - late / 15 * 4, 0, 25);
  parts.push(late > 0 ? `เข้านอนช้ากว่าเป้า ${Math.round(late + 30)} นาที` : 'เข้านอนตรงเวลา');
  let quality = 0;
  if (st && asleep > 0) {
    const deep = st.deep / asleep, rem = st.rem / asleep;
    quality = Math.min(1, deep / 0.15) * 10 + Math.min(1, rem / 0.2) * 10 + clamp(5 - st.awake / 6, 0, 5);
    parts.push(`หลับลึก ${st.deep} นาที (${Math.round(deep * 100)}%) · REM ${st.rem} นาที (${Math.round(rem * 100)}%)${st.awake ? ` · ตื่น ${st.awake} นาที` : ''}`);
  } else { dur *= 1.5; parts.push('ไม่มีระยะหลับ ใช้แค่ชั่วโมงนอนกับเวลาเข้านอน'); }
  return { v: Math.round(clamp(dur + timing + quality)), parts, est: !st };
}

/** Edwards TRIMP-style load → 0–100. Zones weighted 1..5. */
export function strainScore(key: string): Score | null {
  const h: HealthDay = healthDaily.value[key] ?? {};
  const w = workouts.value.filter((x) => x.date === key);
  if (!h.hrz && !h.steps && !w.length) return null;
  const parts: string[] = []; let load = 0;
  if (h.hrz) {
    const hr = h.hrz.reduce((a, m, i) => a + m * (i + 1), 0); load += hr;
    const hard = h.hrz[2] + h.hrz[3] + h.hrz[4];
    parts.push(`ชีพจรสูง (โซน 3–5) ${Math.round(hard)} นาที · เบา (โซน 1–2) ${Math.round(h.hrz[0] + h.hrz[1])} นาที`);
  }
  // Logged sessions add load when the watch didn't cover them well.
  const sets = w.reduce((a, x) => a + x.ex.reduce((b, e) => b + e.sets.filter((s) => s.done).length, 0), 0);
  const cover = (h.hrMin ?? 0) / 60;
  if (sets) { const add = sets * (cover > 12 ? 1 : 3); load += add; parts.push(`ซ้อมในแอป ${sets} เซ็ต`); }
  else if (w.length) parts.push(`กิจกรรมจากนาฬิกา ${w.map((x) => x.dayName).join(', ')}`);
  if (h.steps) { if (cover < 10) load += (h.steps / 1000) * 3; parts.push(`เดิน ${h.steps.toLocaleString()} ก้าว`); }
  const est = !h.hrz || cover < 12;
  if (h.hrz && cover < 12) parts.push(`นาฬิกาจับชีพจรได้ ${hm(h.hrMin ?? 0)} ในวันนั้น ตัวเลขอาจต่ำกว่าจริง`);
  return { v: Math.round(100 * (1 - Math.exp(-load / 130))), parts, est };
}

/** Recovery: resting HR vs own 30-day baseline + last night's sleep + yesterday's strain. */
export function recoveryScore(key: string): Score | null {
  const sl = sleepScore(key), rhr = healthDaily.value[key]?.rhr;
  const d = parseKey(key), base = Array.from({ length: 30 }, (_, i) => healthDaily.value[dayKey(addDays(d, -1 - i))]?.rhr).filter((x): x is number => !!x);
  const y = strainScore(dayKey(addDays(d, -1)));
  if (!sl && rhr == null) return null;
  const parts: string[] = []; let v = 0, wsum = 0;
  if (rhr != null && base.length >= 3) {
    const avg = base.reduce((a, b) => a + b, 0) / base.length, delta = rhr - avg;
    v += clamp(50 - delta * 8) * 0.45; wsum += 0.45;
    parts.push(`ชีพจรพัก ${rhr} ${Math.abs(delta) < 1 ? 'เท่ากับ' : delta < 0 ? `ต่ำกว่าปกติ ${Math.round(-delta)}` : `สูงกว่าปกติ ${Math.round(delta)}`} (ปกติ ~${Math.round(avg)})`);
  } else if (rhr != null) parts.push(`ชีพจรพัก ${rhr} · ต้องมีอย่างน้อย 3 วันถึงจะเทียบกับค่าปกติได้`);
  if (sl) { v += sl.v * 0.4; wsum += 0.4; parts.push(`คะแนนนอนเมื่อคืน ${sl.v}`); }
  if (y) { v += (100 - y.v * 0.7) * 0.15; wsum += 0.15; parts.push(`ความหนักเมื่อวาน ${y.v}`); }
  if (!wsum) return null;
  return { v: Math.round(clamp(v / wsum)), parts, est: base.length < 7 || !!sl?.est };
}

/** Today's strain target follows recovery and the plan (rest day = light). */
export function strainTarget(key: string) {
  const r = recoveryScore(key)?.v, kind = planFor(parseKey(key)).kind;
  if (kind === 'rest') return 35;
  return r == null ? 55 : r >= 67 ? 70 : r >= 34 ? 55 : 35;
}

export function coachLine(key: string) {
  const r = recoveryScore(key), s = strainScore(key), t = strainTarget(key), plan = planFor(parseKey(key));
  if (!r && !s) return 'ใส่นาฬิกานอนคืนนี้ พรุ่งนี้เช้าจะมีคะแนนฟื้นตัวให้';
  if (s && s.v >= t) return `ถึงเป้าความหนักวันนี้ (${t}) แล้ว ที่เหลือของวันเบาๆ ได้`;
  if (!r) return `ความหนักวันนี้ ${s!.v} จากเป้า ${t}`;
  if (plan.kind === 'rest') return r.v >= 67 ? `ฟื้นตัว ${r.v} ดี วันพักเดินเล่นได้สบาย` : `ฟื้นตัว ${r.v} วันพักพอดี นอนให้เร็วขึ้นคืนนี้`;
  if (r.v >= 67) return `ฟื้นตัว ${r.v} พร้อมซ้อมหนัก ${plan.name} ใส่ได้เต็ม`;
  if (r.v >= 34) return `ฟื้นตัว ${r.v} ซ้อม${plan.name}ตามแผนได้ ไม่ต้องดันเกินเป้า`;
  return `ฟื้นตัว ${r.v} ต่ำ ซ้อมได้แต่ลดน้ำหนัก 10% และพักนานขึ้น`;
}

// Everything that already reads `recovery()` (coach, brief, today rings) now gets this score.
setRecoveryHook((d) => recoveryScore(dayKey(d))?.v ?? null);
