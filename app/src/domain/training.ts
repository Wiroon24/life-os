import { persisted, uid } from '../store/persist';
import { addDecorator, blocksFor, setStatus } from './plan';
import { addDays, dayKey } from './time';
import { bucketOf, eqTh, type LibEx } from './exlib';

export type WUnit = 'kg' | 'BW' | '% ชัน';
export interface Exercise {
  id: string; name: string; eq: string; muscle: string;
  sets: number; reps: number; kg: number; rest: number;
  unit: WUnit; repUnit: 'ครั้ง' | 'นาที' | 'วิ'; step: number; hint?: string;
}
export type DayKind = 'lift' | 'mobility' | 'cardio' | 'rest';
export interface ProgramDay { id: string; name: string; kind: DayKind; exercises: Exercise[] }

const E = (name: string, eq: string, muscle: string, sets: number, reps: number, kg: number, rest: number, hint?: string, o: Partial<Exercise> = {}): Exercise =>
  ({ id: uid(), name, eq, muscle, sets, reps, kg, rest, unit: 'kg', repUnit: 'ครั้ง', step: kg >= 30 ? 2.5 : 2, hint, ...o });
const cardio = { unit: '% ชัน' as WUnit, repUnit: 'นาที' as const, step: 1 };

const SEED: ProgramDay[] = [
  { id: 'upA', name: 'ช่วงบน A + บาส', kind: 'lift', exercises: [
    E('DB bench press', 'ดัมเบล + ม้านั่ง', 'อก', 4, 8, 20, 120), E('Lat pulldown', 'lat pulldown', 'หลัง', 4, 10, 45, 90),
    E('DB shoulder press', 'ดัมเบล', 'ไหล่', 3, 10, 14, 90), E('DB row ข้างเดียว', 'ดัมเบล + ม้านั่ง', 'หลัง', 3, 10, 20, 75),
    E('DB lateral raise', 'ดัมเบล', 'ไหล่', 3, 15, 6, 60), E('Hammer curl', 'ดัมเบล', 'แขน', 2, 12, 10, 60)] },
  { id: 'rec', name: 'ฟื้นตัว + ยืดเหยียด', kind: 'mobility', exercises: [E('ลู่วิ่ง zone 2', 'ลู่วิ่ง', 'คาร์ดิโอ', 1, 30, 4, 0, 'คุยได้ แต่ร้องเพลงไม่ได้', cardio)] },
  { id: 'loA', name: 'ช่วงล่าง A', kind: 'lift', exercises: [
    E('DB front squat', 'ดัมเบล', 'ขา', 4, 8, 20, 120, 'ลงช้า 3 วิ'), E('Bulgarian split squat', 'ดัมเบล + ม้านั่ง', 'ขา', 3, 8, 12, 90, 'ข้างละ 8'),
    E('DB Romanian deadlift', 'ดัมเบล', 'ขา', 3, 10, 22, 90), E('Leg extension', 'leg extension', 'ขา', 3, 12, 30, 60, 'ลงช้า 3 วิ · ค้างบน 1 วิ'),
    E('เขย่งขาเดียวลงช้า', 'ตัวเปล่า', 'น่อง', 3, 12, 0, 45, 'ลง 3 วิ ทุกครั้ง', { unit: 'BW' }),
    E('Wall sit ค้าง', 'ตัวเปล่า', 'เข่า', 4, 45, 0, 45, 'เสริมเอ็นลูกสะบ้า', { unit: 'BW', repUnit: 'วิ' })] },
  { id: 'upB', name: 'ช่วงบน B', kind: 'lift', exercises: [
    E('DB incline press', 'ดัมเบล + ม้านั่ง', 'อก', 4, 10, 16, 90), E('Lat pulldown แคบ', 'lat pulldown', 'หลัง', 3, 12, 40, 75),
    E('DB row ข้างเดียว', 'ดัมเบล + ม้านั่ง', 'หลัง', 3, 12, 20, 75), E('DB lateral raise', 'ดัมเบล', 'ไหล่', 3, 15, 6, 60),
    E('Overhead triceps extension', 'ดัมเบล', 'แขน', 2, 12, 12, 60), E('วิดพื้น', 'ตัวเปล่า', 'อก', 2, 15, 0, 60, 'ทำให้ได้มากที่สุด', { unit: 'BW' })] },
  { id: 'loB', name: 'ช่วงล่าง B + hybrid', kind: 'lift', exercises: [
    E('DB Romanian deadlift', 'ดัมเบล', 'ขา', 4, 8, 24, 120), E('Reverse lunge', 'ดัมเบล', 'ขา', 3, 10, 12, 90, 'ข้างละ 10'),
    E('DB step-up บนม้านั่ง', 'ดัมเบล + ม้านั่ง', 'ขา', 3, 10, 10, 75, 'ข้างละ 10'), E('Hip thrust บนม้านั่ง', 'ดัมเบล + ม้านั่ง', 'ขา', 3, 12, 24, 75),
    E('Farmer carry', 'ดัมเบล', 'แกนกลาง', 3, 40, 20, 60, 'เดิน 40 ก้าว', { repUnit: 'ครั้ง' }),
    E('ลู่วิ่ง interval', 'ลู่วิ่ง', 'คาร์ดิโอ', 1, 12, 6, 0, 'วิ่ง 1 นาที เดิน 1 นาที', cardio)] },
  { id: 'car', name: 'คาร์ดิโอ', kind: 'cardio', exercises: [E('ลู่วิ่ง zone 2', 'ลู่วิ่ง', 'คาร์ดิโอ', 1, 45, 6, 0, 'คุยได้ แต่ร้องเพลงไม่ได้', cardio)] },
  { id: 'rest', name: 'พัก', kind: 'rest', exercises: [] },
];

export const program = persisted<ProgramDay[]>('program', SEED);
/** weekday (0=Sun) → program day id. Template. */
export const weekTemplate = persisted<string[]>('weekTemplate', ['rest', 'upA', 'rec', 'loA', 'upB', 'loB', 'car']);
/** Per-week overrides: weekStart key → 7 ids. */
export const weekOverrides = persisted<Record<string, string[]>>('weekOverrides', {});

export const weekStart = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const weekIds = (d: Date) => weekOverrides.value[dayKey(weekStart(d))] ?? weekTemplate.value;
export const dayById = (id: string) => program.value.find((p) => p.id === id) ?? program.value.find((p) => p.kind === 'rest')!;
export const planFor = (d: Date) => dayById(weekIds(d)[d.getDay()]);

export function swapDays(d: Date, a: number, b: number) {
  const k = dayKey(weekStart(d)), ids = [...weekIds(d)];
  [ids[a], ids[b]] = [ids[b], ids[a]];
  weekOverrides.value = { ...weekOverrides.value, [k]: ids };
}

export const estMinutes = (p: ProgramDay) => p.kind === 'rest' ? 0 : p.kind !== 'lift' ? (p.kind === 'mobility' ? 20 : 0) + p.exercises.reduce((a, e) => a + (e.repUnit === 'นาที' && e.muscle === 'คาร์ดิโอ' ? e.reps : 0), 0)
  : 8 + Math.round(p.exercises.reduce((a, e) => a + e.sets * (0.75 + e.rest / 60) + (e.repUnit === 'นาที' && e.muscle === 'คาร์ดิโอ' ? e.reps : 0), 0));
export const kindIcon = (k: DayKind) => ({ lift: 'fitness_center', mobility: 'self_improvement', cardio: 'directions_run', rest: 'bedtime' }[k]);
export const daySub = (p: ProgramDay) => p.kind === 'rest' ? 'เดินเล่นได้' : p.kind === 'mobility' ? `20 นาที เล่นตาม + ${p.exercises[0]?.reps ?? 0} นาที zone 2` : p.kind === 'cardio' ? `ลู่วิ่ง zone 2 · ${p.exercises[0]?.reps ?? 40} นาที` : `${p.exercises.length} ท่า · ~${estMinutes(p)} นาที`;

/* ---------- Logs ---------- */
export interface SetLog { kg: number; reps: number; done: boolean; pkg?: number; preps?: number }
export interface ExLog { name: string; eq: string; muscle: string; unit: WUnit; repUnit: Exercise['repUnit']; step: number; rest: number; target: string; hint?: string; sets: SetLog[] }
export interface Workout { id: string; date: string; dayId: string; dayName: string; t0: number; t1?: number; ex: ExLog[]; rpe?: number }

export const workouts = persisted<Workout[]>('workouts', []);
export const active = persisted<(Workout & { cur: number; rest: { until: number; total: number; min: boolean } | null }) | null>('activeWorkout', null);
export const warmDone = persisted<string | null>('warmDone', null);

export function lastFor(name: string, before = Infinity) {
  const ws = workouts.value.filter((w) => w.t0 < before && w.ex.some((e) => e.name === name && e.sets.some((s) => s.done))).sort((a, b) => b.t0 - a.t0);
  return ws[0]?.ex.find((e) => e.name === name);
}

/** Double progression: hit all target reps last time → add weight; else chase +1 rep. */
export function suggest(e: Exercise): { kg: number; reps: number; hint?: string; prev?: SetLog[] } {
  const last = lastFor(e.name);
  if (!last || e.unit !== 'kg') return { kg: last?.sets[0]?.kg ?? e.kg, reps: e.reps, hint: e.hint, prev: last?.sets };
  const done = last.sets.filter((s) => s.done), topKg = Math.max(...done.map((s) => s.kg));
  const allHit = done.length >= e.sets && done.every((s) => s.reps >= e.reps && s.kg >= topKg);
  if (allHit) return { kg: +(topKg + e.step).toFixed(1), reps: e.reps, hint: `+${e.step} kg ได้แล้ว`, prev: last.sets };
  // Stall: 3 sessions in a row at the same top weight without beating the best reps → deload ~10% and climb again.
  const h = history(e.name).slice(-3);
  if (h.length === 3 && h.every((x) => x.kg === topKg) && h[2].reps <= h[0].reps) {
    const kg = Math.max(e.step, Math.round((topKg * 0.9) / e.step) * e.step);
    return { kg: +kg.toFixed(1), reps: e.reps, hint: `ค้างที่ ${topKg} kg มา 3 ครั้ง · ลดเหลือ ${+kg.toFixed(1)} kg แล้วไต่ใหม่ (deload)`, prev: last.sets };
  }
  const minReps = Math.min(...done.map((s) => s.reps));
  return { kg: topKg, reps: Math.min(e.reps, minReps + 1), hint: minReps < e.reps ? '+1 ครั้ง จากครั้งก่อน' : e.hint, prev: last.sets };
}

export function startWorkout(date: Date) {
  const p = planFor(date);
  const ex: ExLog[] = p.exercises.map((e) => {
    const s = suggest(e);
    return { name: e.name, eq: e.eq, muscle: e.muscle, unit: e.unit, repUnit: e.repUnit, step: e.step, rest: e.rest, hint: s.hint,
      target: `เป้า ${e.sets} × ${e.reps}${e.repUnit !== 'ครั้ง' ? ' ' + e.repUnit : ''}${e.rest ? ` · พัก ${e.rest} วิ` : ''}`,
      sets: Array.from({ length: e.sets }, (_, i) => ({ kg: s.kg, reps: s.reps, done: false, pkg: s.prev?.[i]?.kg ?? s.prev?.[0]?.kg, preps: s.prev?.[i]?.reps })) };
  });
  active.value = { id: uid(), date: dayKey(date), dayId: p.id, dayName: p.name, t0: Date.now(), ex, cur: 0, rest: null };
}

export const exFromLib = (name: string): Exercise => {
  const l = LIB.find((x) => x[0] === name)!;
  const bw = l[1][0] === 'ตัวเปล่า', car = l[2] === 'คาร์ดิโอ';
  return E(l[0], l[1].join(' + '), l[2], car ? 1 : 3, car ? 20 : 10, bw ? 0 : car ? 4 : 10, car ? 0 : 75, undefined, bw ? { unit: 'BW' } : car ? cardio : {});
};
export const exLogFrom = (e: Exercise): ExLog => {
  const s = suggest(e);
  return { name: e.name, eq: e.eq, muscle: e.muscle, unit: e.unit, repUnit: e.repUnit, step: e.step, rest: e.rest, hint: s.hint, target: `เป้า ${e.sets} × ${e.reps}`, sets: Array.from({ length: e.sets }, () => ({ kg: s.kg, reps: s.reps, done: false, pkg: s.prev?.[0]?.kg, preps: s.prev?.[0]?.reps })) };
};

export const volumeOf = (w: Pick<Workout, 'ex'>) => w.ex.reduce((a, e) => a + (e.unit === 'kg' ? e.sets.filter((s) => s.done).reduce((b, s) => b + s.kg * s.reps, 0) : 0), 0);

export function prsOf(w: Workout) {
  return w.ex.flatMap((e) => {
    if (e.unit !== 'kg') return [];
    const best = e.sets.filter((s) => s.done).sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
    if (!best) return [];
    const prev = workouts.value.filter((x) => x.id !== w.id && x.t0 < w.t0).flatMap((x) => x.ex.filter((y) => y.name === e.name).flatMap((y) => y.sets.filter((s) => s.done)));
    if (!prev.length) return [];
    const pb = prev.sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
    if (best.kg > pb.kg) return [{ n: e.name, now: `${best.kg} kg × ${best.reps}`, before: `${pb.kg} kg × ${pb.reps}`, gain: `+${+(best.kg - pb.kg).toFixed(1)} kg` }];
    if (best.kg === pb.kg && best.reps > pb.reps) return [{ n: e.name, now: `${best.kg} kg × ${best.reps}`, before: `${pb.kg} kg × ${pb.reps}`, gain: `+${best.reps - pb.reps} ครั้ง` }];
    return [];
  });
}

export function finishWorkout(rpe: number) {
  const a = active.value; if (!a) return;
  const { cur: _c, rest: _r, ...w } = a;
  workouts.value = [...workouts.value.filter((x) => x.id !== w.id), { ...w, t1: w.t1 ?? Date.now(), rpe }];
  active.value = null;
  const d = new Date(w.date + 'T12:00');
  const blk = blocksFor(d).find((b) => b.kind === 'workout');
  if (blk) setStatus(w.date, blk.id, 'done');
}

export const doneOn = (d: Date) => workouts.value.find((w) => w.date === dayKey(d) && w.dayId !== 'watch');
export const weekCount = (d: Date) => { const s = weekStart(d); return Array.from({ length: 7 }, (_, i) => addDays(s, i)).filter((x) => doneOn(x)).length; };

export function history(name: string) {
  return workouts.value.filter((w) => w.ex.some((e) => e.name === name)).sort((a, b) => a.t0 - b.t0).map((w) => {
    const e = w.ex.find((x) => x.name === name)!, best = e.sets.filter((s) => s.done).sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
    return best ? { date: w.date, kg: best.kg, reps: best.reps } : null;
  }).filter(Boolean) as { date: string; kg: number; reps: number }[];
}

/** Estimated one-rep max (Epley). Only meaningful for sets of ~1–12 reps. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10);
export function e1rmHistory(name: string) {
  return workouts.value.filter((w) => w.ex.some((e) => e.name === name && e.unit === 'kg')).sort((a, b) => a.t0 - b.t0).map((w) => {
    const sets = w.ex.find((x) => x.name === name)!.sets.filter((s) => s.done && s.kg > 0 && s.reps > 0 && s.reps <= 12);
    const top = sets.map((s) => ({ ...s, v: e1rm(s.kg, s.reps) })).sort((a, b) => b.v - a.v)[0];
    return top ? { date: w.date, kg: top.kg, reps: top.reps, e1rm: top.v } : null;
  }).filter(Boolean) as { date: string; kg: number; reps: number; e1rm: number }[];
}

/** New program exercise from a free-exercise-db entry. */
export function exFromLibEx(l: LibEx): Exercise {
  const muscle = bucketOf(l), bw = l.eq === 'body only' || l.eq == null, car = muscle === 'คาร์ดิโอ', str = l.cat === 'stretching';
  return E(l.n, eqTh(l), muscle, car || str ? (str ? 2 : 1) : 3, car ? 20 : str ? 30 : 10, bw ? 0 : car ? 4 : 10, car ? 0 : str ? 15 : 75, undefined,
    bw ? { unit: 'BW', ...(str ? { repUnit: 'วิ' as const } : {}) } : car ? cardio : {});
}

/* ---------- Library & mobility ---------- */
export const LIB: [string, string[], string][] = [
  ['DB front squat', ['ดัมเบล'], 'ขา'], ['Goblet squat', ['ดัมเบล'], 'ขา'], ['Bulgarian split squat', ['ดัมเบล', 'ม้านั่ง'], 'ขา'], ['DB step-up บนม้านั่ง', ['ดัมเบล', 'ม้านั่ง'], 'ขา'],
  ['Reverse lunge', ['ดัมเบล'], 'ขา'], ['DB Romanian deadlift', ['ดัมเบล'], 'ขา'], ['Hip thrust บนม้านั่ง', ['ดัมเบล', 'ม้านั่ง'], 'ขา'], ['Leg extension', ['leg extension'], 'ขา'],
  ['เขย่งขาเดียวลงช้า', ['ตัวเปล่า'], 'น่อง'], ['Wall sit ค้าง', ['ตัวเปล่า'], 'เข่า'], ['Lat pulldown', ['lat pulldown'], 'หลัง'], ['Lat pulldown แคบ', ['lat pulldown'], 'หลัง'],
  ['DB row ข้างเดียว', ['ดัมเบล', 'ม้านั่ง'], 'หลัง'], ['DB pullover', ['ดัมเบล', 'ม้านั่ง'], 'หลัง'], ['DB bench press', ['ดัมเบล', 'ม้านั่ง'], 'อก'], ['DB incline press', ['ดัมเบล', 'ม้านั่ง'], 'อก'],
  ['วิดพื้น', ['ตัวเปล่า'], 'อก'], ['DB shoulder press', ['ดัมเบล'], 'ไหล่'], ['DB lateral raise', ['ดัมเบล'], 'ไหล่'], ['DB rear delt fly', ['ดัมเบล', 'ม้านั่ง'], 'ไหล่'],
  ['Hammer curl', ['ดัมเบล'], 'แขน'], ['Overhead triceps extension', ['ดัมเบล'], 'แขน'], ['Farmer carry', ['ดัมเบล'], 'แกนกลาง'], ['Dead bug', ['ตัวเปล่า'], 'แกนกลาง'],
  ['Plank', ['ตัวเปล่า'], 'แกนกลาง'], ['ลู่วิ่ง interval', ['ลู่วิ่ง'], 'คาร์ดิโอ'], ['ลู่วิ่ง zone 2', ['ลู่วิ่ง'], 'คาร์ดิโอ'],
];
export const EQ = ['ดัมเบล', 'ม้านั่ง', 'ลู่วิ่ง', 'leg extension', 'lat pulldown', 'ตัวเปล่า'];

export type Move = [name: string, cue: string, sec: number, tag: string];
export const MOB: Record<'warm' | 'stretch', { title: string; list: Move[] }> = {
  warm: { title: 'วอร์มข้อเท้าและเข่า', list: [['หมุนข้อเท้า', 'วนช้าๆ ข้างละ 30 วิ เต็มวง', 60, 'ข้อเท้า'], ['โยกเข่าแตะผนัง', 'ส้นติดพื้น ดันเข่าเลยนิ้วเท้า', 90, 'ข้อเท้า'], ['เขย่งลงช้าขาเดียว', 'ขึ้น 1 วิ ลง 3 วิ · ข้างละ 8', 120, 'เอ็นน่อง'], ['ยืนขาเดียวทรงตัว', 'ข้างละ 30 วิ ตามองจุดเดียว', 60, 'ทรงตัว'], ['Wall sit ค้าง 45 วิ', 'หลังติดผนัง เข่า 90°', 45, 'เข่า'], ['สควอทตัวเปล่าช้าๆ', 'ลง 3 วิ ขึ้น 1 วิ', 105, 'เข่า']] },
  stretch: { title: 'ฟื้นตัว + ยืดเหยียด', list: [['ยืดน่องกับผนัง', 'ขาหลังตึง ส้นติดพื้น', 60, 'น่อง'], ['ยืดสะโพกด้านหน้า', 'คุกเข่า ดันสะโพกไปข้างหน้า', 90, 'สะโพก'], ['เขย่งลงช้าขาเดียว', 'ลง 3 วิ · ข้างละ 10', 120, 'เอ็นน่อง'], ['Wall sit ค้าง 45 วิ', 'หายใจปกติ อย่ากลั้น', 45, 'เข่า'], ['ยืนขาเดียวทรงตัว', 'หลับตาถ้าง่ายไป', 60, 'ทรงตัว'], ['หมุนหลังส่วนอก', 'นอนตะแคง เปิดแขนตามตา', 90, 'หลัง'], ['ยืดหลังท่าเด็ก', 'ก้นแตะส้น แขนยืดไปหน้า', 90, 'หลัง']] },
};

/* Workout block on the day plan follows the program. Rest days drop it. */
addDecorator((blk, date) => {
  if (blk.kind !== 'workout') return blk;
  const p = planFor(date);
  if (p.kind === 'rest') return null;
  return { ...blk, title: p.name, icon: kindIcon(p.kind), sub: daySub(p), meta: [daySub(p).split(' · ')[0], `~${estMinutes(p) || 30} นาที`] };
});
