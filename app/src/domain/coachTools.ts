import type Anthropic from '@anthropic-ai/sdk';
import { persisted, uid } from '../store/persist';
import { addDays, dayKey, DOW_SHORT } from './time';
import { appNow, blocksFor, statusOf } from './plan';
import { program, workouts, weekIds, dayById, history, LIB, exFromLib, volumeOf, type Exercise } from './training';
import { customTargets, aiTargets, targetsFor, foodLog, water, WATER_GOAL, tdee, type DayType, type Macro } from './food';
import { sortedW, avg7, rate, inbodies, MILESTONES, START_KG } from './body';
import { sleepLog, hoursOf } from './sleep';
import { medLog, meds } from './meds';
import { cycle, safeToSpend, categories, catSpend, pending, debts, debtPlan, simulate, owedOf, monthLabel } from './money';
import { live } from '../store/collection';

/** Snapshots so a coach edit can be undone from its card (kept small). */
const snaps = persisted<Record<string, string>>('coachUndo', {});
const keep = (kind: 'prog' | 'tgt', json: string) => { const id = `${kind}:${uid()}`; const all = { ...snaps.value, [id]: json }; const ks = Object.keys(all); if (ks.length > 12) delete all[ks[0]]; snaps.value = all; return id; };
export function undoSnap(id: string) {
  const j = snaps.value[id]; if (!j) return false;
  if (id.startsWith('prog:')) program.value = JSON.parse(j); else customTargets.value = JSON.parse(j);
  const { [id]: _, ...rest } = snaps.value; snaps.value = rest; return true;
}

const r0 = (n: number) => Math.round(n), r1 = (n: number) => Math.round(n * 10) / 10;
const rangeDays = (n: number) => Array.from({ length: n }, (_, i) => addDays(appNow(), -(n - 1 - i)));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

type Topic = 'overview' | 'training' | 'nutrition' | 'body' | 'sleep' | 'money' | 'adherence';
function report(topic: Topic, n: number): string {
  const ds = rangeDays(n), keys = ds.map(dayKey), first = keys[0], out: string[] = [`ช่วง ${first} ถึง ${keys[n - 1]} (${n} วัน)`];
  const T = (t: Topic) => topic === 'overview' || topic === t;
  if (T('training')) {
    const ws = workouts.value.filter((w) => w.date >= first && w.t1).sort((a, b) => a.t0 - b.t0);
    const planned = ds.filter((d) => { const p = dayById(weekIds(d)[d.getDay()]); return p.kind === 'lift' && d <= appNow(); }).length;
    out.push(`## ซ้อม: ทำ ${ws.length} ครั้ง จากที่แผนมีวันยกเวท ~${planned} วัน`);
    for (const w of ws.slice(-12)) out.push(`- ${w.date} ${w.dayName} ${w.t1 ? r0((w.t1 - w.t0) / 60000) : '?'} นาที RPE ${w.rpe ?? '-'} volume ${r0(volumeOf(w))} kg`);
    const names = [...new Set(ws.flatMap((w) => w.ex.filter((e) => e.unit === 'kg').map((e) => e.name)))];
    for (const nm of names.slice(0, 12)) { const h = history(nm).filter((x) => x.date >= first); if (h.length >= 2) out.push(`- ${nm}: ${h[0].kg} kg×${h[0].reps} → ${h.at(-1)!.kg} kg×${h.at(-1)!.reps} (${h.length} ครั้ง)`); else if (h.length === 1) out.push(`- ${nm}: ${h[0].kg} kg×${h[0].reps} (ครั้งเดียว)`); }
    if (!ws.length) out.push('- ยังไม่มีบันทึกซ้อมในช่วงนี้');
  }
  if (T('nutrition')) {
    const rows = ds.map((d) => { const k = dayKey(d), es = foodLog.value.filter((e) => e.date === k), t = targetsFor(d); return { k, t, kcal: es.reduce((a, e) => a + e.k, 0), p: es.reduce((a, e) => a + e.p, 0), n: es.length }; }).filter((r) => r.n > 0);
    out.push(`## อาหาร: บันทึก ${rows.length}/${n} วัน`);
    if (rows.length) { const hitP = rows.filter((r) => r.p >= r.t.p * 0.9).length, inK = rows.filter((r) => Math.abs(r.kcal - r.t.k) <= r.t.k * 0.1).length; out.push(`- เฉลี่ย ${r0(avg(rows.map((r) => r.kcal))!)} kcal · โปรตีน ${r0(avg(rows.map((r) => r.p))!)} g (เป้า ~${r0(avg(rows.map((r) => r.t.p))!)}) · ถึงโปรตีน ≥90% ${hitP}/${rows.length} วัน · kcal ±10% ของเป้า ${inK}/${rows.length} วัน`); }
    const wt = ds.map((d) => water.value[dayKey(d)]).filter((x) => x != null) as number[];
    if (wt.length) out.push(`- น้ำเฉลี่ย ${r0(avg(wt)!)} ml (เป้า ${WATER_GOAL}) · ${wt.filter((x) => x >= WATER_GOAL * 0.9).length}/${wt.length} วันถึงเป้า`);
    out.push(`- เป้าตอนนี้: วันซ้อม ${fmtM(customTargets.value.train ?? aiTargets('train'))} · วันพัก ${fmtM(customTargets.value.rest ?? aiTargets('rest'))} · TDEE ที่ประมาณ ${tdee.value.kcal}`);
  }
  if (T('body')) {
    const ws = sortedW().filter((w) => w.date >= first), now = avg7(appNow()), r = rate();
    out.push(`## ร่างกาย: น้ำหนักเฉลี่ย 7 วัน ${now ? r1(now) : '-'} kg (เริ่ม ${START_KG}) · อัตรา ${r != null ? r.toFixed(2) : '-'} kg/สัปดาห์ · เหลือถึงหมุดหมาย ${MILESTONES.join('/')}`);
    if (ws.length) out.push(`- ชั่งในช่วงนี้ ${ws.length} ครั้ง: ${ws.slice(-8).map((w) => `${w.date.slice(5)}=${w.kg}`).join(', ')}`);
    const ib = inbodies().slice(-3); if (ib.length) out.push(`- InBody: ${ib.map((w) => `${w.date} ${w.kg}kg ไขมัน ${w.fat ?? '-'}% กล้ามเนื้อ ${w.smm ?? '-'}kg`).join(' | ')}`);
  }
  if (T('sleep')) {
    const hs = ds.map((d) => hoursOf(sleepLog.value[dayKey(d)])).filter((x): x is number => x != null);
    out.push(`## นอน: บันทึก ${hs.length}/${n} คืน${hs.length ? ` · เฉลี่ย ${r1(avg(hs)!)} ชม. · ต่ำกว่า 6 ชม. ${hs.filter((h) => h < 6).length} คืน` : ''}`);
  }
  if (T('adherence')) {
    const past = ds.filter((d) => dayKey(d) < dayKey(appNow())), by: Record<string, [number, number]> = {};
    for (const d of past) for (const b of blocksFor(d)) { const s = statusOf(dayKey(d), b, undefined, false); if (!s || s === 'skip') continue; const r = (by[b.role] ??= [0, 0]); r[1]++; if (s === 'done') r[0]++; }
    const ROLE: Record<string, string> = { food: 'อาหาร', workout: 'ซ้อม', recovery: 'ฟื้นตัว/ยา', money: 'เงิน', work: 'งาน' };
    out.push(`## ทำตามตาราง (ไม่นับวันนี้): ${Object.entries(by).map(([k, [a, b]]) => `${ROLE[k] ?? k} ${a}/${b} (${r0((a / b) * 100)}%)`).join(' · ') || 'ยังไม่มีข้อมูล'}`);
    const act = live(meds.value); if (act.length) { const days = past.map(dayKey).filter((k) => medLog.value[k]); out.push(`- ยา/สกินแคร์: มีติ๊กใน ${days.length}/${past.length} วัน`); }
  }
  if (T('money')) {
    const c = cycle(), s = safeToSpend(appNow());
    out.push(`## เงิน: รอบ ${dayKey(c.start)} ถึง ${dayKey(c.end)} · ใช้ไป ${s.usedPct}% ของงบ (จังหวะควรเป็น ${s.pacePct}%) · ใช้ได้วันนี้ ${r0(s.left)} ฿ · รายการรอยืนยัน ${pending().length}`);
    const cats = categories.value.filter((x) => !x.deletedAt && (x.kind ?? 'expense') === 'expense').map((x) => ({ n: x.name, b: x.budget, s: catSpend(x.name, c) })).filter((x) => x.s > 0 || x.b > 0);
    out.push(`- แยกหมวด: ${cats.map((x) => `${x.n} ${r0(x.s)}${x.b ? '/' + x.b : ''}`).join(', ')}`);
    const ds2 = live(debts.value), sim = simulate(debtPlan.value.extra, debtPlan.value.mode, debtPlan.value);
    out.push(`- หนี้: ${ds2.map((d) => `${d.name} ${r0(owedOf(d))}${d.rateType === 'fixed' ? ' (ดอกคงที่)' : ` @${d.rate}%`}`).join(', ')} · แผนโปะ ${debtPlan.value.mode} +${debtPlan.value.extra}/เดือน → หมด ${monthLabel(sim.end)}`);
  }
  return out.join('\n');
}
const fmtM = (m: Macro) => `${m.k} kcal P${m.p} C${m.c} F${m.f}`;

function programText() {
  const ids = weekIds(appNow());
  const rows = ids.map((id, i) => `${DOW_SHORT[i]} → ${id}`).join(', ');
  const days = program.value.map((d) => `[${d.id}] ${d.name} (${d.kind}): ${d.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}${e.repUnit !== 'ครั้ง' ? e.repUnit : ''}${e.unit === 'kg' ? ` @${e.kg}kg` : ''} พัก${e.rest}s`).join('; ') || '-'}`).join('\n');
  return `ตารางสัปดาห์นี้: ${rows}\n${days}\nคลังท่า: ${LIB.map((l) => l[0]).join(', ')}`;
}

const nullable = (t: string) => ({ type: [t, 'null'] });
export const EXTRA_TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'get_report', description: 'ดึงข้อมูลจริงในแอปเพื่อวิเคราะห์/ตอบความคืบหน้า ต้องเรียกก่อนพูดตัวเลขเรื่องซ้อม อาหาร น้ำหนัก นอน เงิน หรือการทำตามตาราง', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['topic', 'days'], properties: { topic: { type: 'string', enum: ['overview', 'training', 'nutrition', 'body', 'sleep', 'money', 'adherence'] }, days: { type: 'integer', description: 'ย้อนหลังกี่วัน 7–90' } } } },
  { name: 'get_program', description: 'ดูโปรแกรมซ้อมทั้งหมดพร้อมรหัสวัน (day_id) และคลังท่า ก่อนแก้โปรแกรม', strict: true, input_schema: { type: 'object', additionalProperties: false, required: [], properties: {} } },
  { name: 'edit_program', description: 'แก้โปรแกรมซ้อม (แม่แบบ ใช้ทุกสัปดาห์) ใช้เมื่อผู้ใช้สั่งหรือตอบรับข้อเสนอเท่านั้น', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['day_id', 'op', 'exercise', 'new_exercise', 'sets', 'reps', 'kg', 'rest'], properties: {
      day_id: { type: 'string', description: 'รหัสวันจาก get_program เช่น upA loA upB loB rec car' }, op: { type: 'string', enum: ['add', 'remove', 'update', 'replace'] },
      exercise: { ...nullable('string'), description: 'ชื่อท่าที่มีอยู่ในวันนั้น (update/remove/replace)' }, new_exercise: { ...nullable('string'), description: 'ชื่อท่าจากคลังท่า (add/replace)' },
      sets: nullable('integer'), reps: nullable('integer'), kg: nullable('number'), rest: nullable('integer') } } },
  { name: 'set_nutrition_targets', description: 'ตั้งเป้าแคลอรี่/มาโครต่อวัน ใช้เมื่อผู้ใช้สั่งหรือตอบรับข้อเสนอเท่านั้น (reset=true คือกลับไปใช้ค่าที่แอปคำนวณ)', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['day_type', 'kcal', 'protein', 'carb', 'fat', 'reset'], properties: { day_type: { type: 'string', enum: ['train', 'rest', 'both'] }, kcal: nullable('integer'), protein: nullable('integer'), carb: nullable('integer'), fat: nullable('integer'), reset: { type: 'boolean' } } } },
];

type Card = { type: 'done'; text: string; undo?: string };
const num = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : undefined);

export function runExtra(name: string, input: Record<string, unknown>, cards: Card[]): string | null {
  if (name === 'get_report') return report(input.topic as Topic, Math.max(7, Math.min(90, Number(input.days) || 14)));
  if (name === 'get_program') return programText();
  if (name === 'edit_program') {
    const day = program.value.find((d) => d.id === input.day_id); if (!day) return `ไม่เจอวัน ${input.day_id} ใช้ get_program ดูรหัส`;
    const op = String(input.op), find = (n: unknown) => day.exercises.find((e) => e.name.toLowerCase() === String(n).toLowerCase()) ?? day.exercises.find((e) => e.name.toLowerCase().includes(String(n).toLowerCase()));
    const before = JSON.stringify(program.value);
    const patch: Partial<Exercise> = {}; const s = num(input.sets), r = num(input.reps), k = num(input.kg), rs = num(input.rest);
    if (s != null) patch.sets = Math.max(1, Math.min(10, s)); if (r != null) patch.reps = Math.max(1, Math.min(100, r)); if (k != null) patch.kg = Math.max(0, k); if (rs != null) patch.rest = Math.max(0, Math.min(600, rs));
    let text = '';
    const lib = (n: unknown) => { const l = LIB.find((x) => x[0].toLowerCase() === String(n).toLowerCase()); return l ? exFromLib(l[0]) : null; };
    let nextEx: Exercise[] = day.exercises;
    if (op === 'add') { const ne = lib(input.new_exercise); if (!ne) return `ไม่มีท่านี้ในคลัง เลือกจาก: ${LIB.map((l) => l[0]).join(', ')}`; nextEx = [...day.exercises, { ...ne, ...patch }]; text = `เพิ่ม ${ne.name} ใน${day.name}`; }
    else {
      const ex = find(input.exercise); if (!ex) return `ไม่เจอท่า ${input.exercise} ใน${day.name}`;
      if (op === 'remove') { nextEx = day.exercises.filter((e) => e.id !== ex.id); text = `เอา ${ex.name} ออกจาก${day.name}`; }
      else if (op === 'update') { nextEx = day.exercises.map((e) => (e.id === ex.id ? { ...e, ...patch } : e)); text = `${ex.name}: ${Object.entries(patch).map(([a, b]) => `${({ sets: 'เซ็ต', reps: 'ครั้ง', kg: 'kg', rest: 'พัก' } as Record<string, string>)[a]} ${(ex as unknown as Record<string, number>)[a]}→${b}`).join(', ') || 'ไม่มีอะไรเปลี่ยน'}`; }
      else { const ne = lib(input.new_exercise); if (!ne) return `ไม่มีท่านี้ในคลัง เลือกจาก: ${LIB.map((l) => l[0]).join(', ')}`; nextEx = day.exercises.map((e) => (e.id === ex.id ? { ...ne, sets: e.sets, reps: e.reps, rest: e.rest, ...patch } : e)); text = `${ex.name} → ${ne.name} ใน${day.name}`; }
    }
    program.value = program.value.map((d) => (d.id === day.id ? { ...d, exercises: nextEx } : d));
    cards.push({ type: 'done', text: `โปรแกรม · ${text}`, undo: keep('prog', before) });
    return `แก้แล้ว: ${text}`;
  }
  if (name === 'set_nutrition_targets') {
    const before = JSON.stringify(customTargets.value), types: DayType[] = input.day_type === 'both' ? ['train', 'rest'] : [input.day_type as DayType], next = { ...customTargets.value };
    const lines: string[] = [];
    for (const t of types) {
      if (input.reset) { delete next[t]; lines.push(`${t === 'train' ? 'วันซ้อม' : 'วันพัก'}: กลับไปใช้ค่าแอปคำนวณ`); continue; }
      const cur = next[t] ?? aiTargets(t), k = num(input.kcal), p = num(input.protein), c = num(input.carb), f = num(input.fat);
      if ((k != null && (k < 1200 || k > 4500)) || (p != null && (p < 60 || p > 300))) return 'ตัวเลขนอกช่วงที่ปลอดภัย (kcal 1,200–4,500, โปรตีน 60–300 g) ถามผู้ใช้ก่อน';
      next[t] = { k: k ?? cur.k, p: p ?? cur.p, c: c ?? cur.c, f: f ?? cur.f }; lines.push(`${t === 'train' ? 'วันซ้อม' : 'วันพัก'}: ${fmtM(cur)} → ${fmtM(next[t]!)}`);
    }
    customTargets.value = next;
    cards.push({ type: 'done', text: `เป้าอาหาร · ${lines.join(' | ')}`, undo: keep('tgt', before) });
    return `ตั้งแล้ว ${lines.join(' | ')}`;
  }
  return null;
}
