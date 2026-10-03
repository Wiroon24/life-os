import { computed } from '@preact/signals';
import { persisted, uid } from '../store/persist';
import { live, type Item } from '../store/collection';
import { dayKey, addDays, nowMin, parseKey } from './time';
import type { Role } from '../ui/kit';

/** A block on the day template. start/dur in minutes; start may exceed 1440 (after midnight, same "day"). */
export interface Block extends Item {
  start: number;
  dur: number;
  role: Role;
  title: string;
  sub?: string;
  icon: string;
  days: number[];            // weekdays 0..6; empty = every day
  kind?: 'workout' | 'meal' | 'meds-morning' | 'meds-night' | 'close' | 'sleep' | 'weigh' | 'checkin' | 'prep' | 'bill' | 'move';
  meta?: string[];
}
export type Status = 'done' | 'skip' | 'miss';
export interface DayState {
  ov: Record<string, Partial<Block> & { removed?: boolean }>;
  added: Block[];
  st: Record<string, Status>;
}

const ALL: number[] = [];
const LIFT = [1, 3, 4, 5];
const WEEKDAY = [1, 2, 3, 4, 5];
const b = (start: string, dur: number, role: Role, title: string, icon: string, days: number[] = ALL, kind?: Block['kind'], sub?: string, meta?: string[]): Omit<Block, 'id' | 'order'> => {
  const [h, m] = start.split(':').map(Number);
  return { start: (h < 5 ? h + 24 : h) * 60 + m, dur, role, title, icon, days, kind, sub, meta, source: 'seed' };
};

const SEED: Omit<Block, 'id' | 'order'>[] = [
  b('07:45', 5, 'workout', 'ชั่งน้ำหนัก', 'monitor_weight', ALL, 'weigh', 'หลังเข้าห้องน้ำ ก่อนกิน'),
  b('08:00', 10, 'food', 'กล้วย + เวย์', 'bolt', LIFT, 'meal', 'ก่อนซ้อม', ['กล้วย 1 ลูก', 'เวย์ 1 สกู๊ป', 'โปรตีน +25 g']),
  b('08:15', 65, 'workout', 'ซ้อม', 'fitness_center', [1, 2, 3, 4, 5, 6], 'workout'),
  b('09:20', 15, 'recovery', 'อาบน้ำ + ยาและผิวเช้า', 'shower', ALL, 'meds-morning', 'หลังซ้อม'),
  b('09:35', 25, 'food', 'มื้อเช้าหลังซ้อม', 'egg_alt', ALL, 'meal', 'ไข่ 3 + ข้าวโอ๊ต 50 g + ผลไม้'),
  b('10:00', 30, 'work', 'เริ่มงาน', 'laptop_mac', WEEKDAY, undefined, 'วางงานสำคัญ 1 อย่างก่อน'),
  b('11:30', 5, 'workout', 'ลุกเดิน 5 นาที', 'directions_walk', WEEKDAY, 'move', 'ยืดหลัง + ดื่มน้ำ'),
  b('13:00', 30, 'food', 'มื้อกลางวัน', 'restaurant', ALL, 'meal', 'กล่อง meal prep'),
  b('15:00', 5, 'workout', 'ลุกเดิน 5 นาที', 'directions_walk', WEEKDAY, 'move', 'ยืดหลัง + ดื่มน้ำ'),
  b('16:00', 15, 'food', 'ของว่าง + หยุดคาเฟอีน', 'nutrition', ALL, 'meal', 'กรีกโยเกิร์ต 200 g + อัลมอนด์'),
  b('15:00', 120, 'food', 'Meal prep รอบ 1', 'skillet', [0], 'prep', 'ทำ 3–4 วัน · ไก่ / หมู / ปลา'),
  b('20:15', 75, 'food', 'Meal prep รอบ 2', 'skillet', [3], 'prep', 'ทำถึงวันเสาร์'),
  b('17:45', 30, 'food', 'มื้อเย็น (ก่อนบาส)', 'restaurant', [1], 'meal', 'เพิ่มคาร์บ 40 g'),
  b('19:00', 90, 'workout', 'บาส', 'sports_basketball', [1], undefined, 'พกน้ำ 1 ลิตร', ['~90 นาที', 'วอร์มข้อเท้าก่อน']),
  b('19:30', 30, 'food', 'มื้อเย็น', 'restaurant', [0, 2, 3, 4, 5, 6], 'meal', 'โปรตีน 45 g'),
  b('19:00', 15, 'recovery', 'เช็กอินประจำสัปดาห์', 'forum', [0], 'checkin', 'คุยกับโค้ช 5 นาที'),
  b('23:45', 10, 'recovery', 'ยาและผิวก่อนนอน', 'spa', ALL, 'meds-night', 'หรี่จอ + ทาครีม'),
  b('23:55', 5, 'recovery', 'ปิดวัน', 'checklist', ALL, 'close', 'สรุปวัน + ตั้งพรุ่งนี้'),
  b('00:15', 30, 'recovery', 'เข้านอน', 'bedtime', ALL, 'sleep', 'เป้า 7.5 ชม.'),
];

export const template = persisted<Block[]>('dayTemplate', () => SEED.map((x, i) => ({ ...x, id: uid(), order: i + 1 })));
export const days = persisted<Record<string, DayState>>('days', {});
/** Blocks that ended before the app was first opened are never counted as missed. */
export const installedAt = persisted<number>('installedAt', Date.now());

export const emptyDay = (): DayState => ({ ov: {}, added: [], st: {} });
export const dayState = (k: string) => days.value[k] ?? emptyDay();
export function patchDay(k: string, f: (d: DayState) => DayState) {
  days.value = { ...days.value, [k]: f(dayState(k)) };
}

/** Other modules contribute dynamic blocks (bills due, workout titles). */
type Provider = (date: Date) => Block[];
type Decorator = (blk: Block, date: Date) => Block | null;
const providers: Provider[] = [];
const decorators: Decorator[] = [];
export const addProvider = (p: Provider) => providers.push(p);
export const addDecorator = (d: Decorator) => decorators.push(d);

export function blocksFor(date: Date): Block[] {
  const k = dayKey(date), ds = dayState(k), wd = date.getDay();
  const out: Block[] = [];
  for (const t of live(template.value)) {
    if (t.days.length && !t.days.includes(wd)) continue;
    const ov = ds.ov[t.id];
    if (ov?.removed) continue;
    let blk: Block | null = ov ? { ...t, ...ov } : t;
    for (const d of decorators) { if (!blk) break; blk = d(blk, date); }
    if (blk) out.push(blk);
  }
  for (const p of providers) for (const x of p(date)) if (!ds.ov[x.id]?.removed) out.push({ ...x, ...(ds.ov[x.id] ?? {}) });
  out.push(...ds.added.filter((x) => !x.deletedAt));
  return out.sort((a, b2) => a.start - b2.start || a.order - b2.order);
}

/** The "app day" rolls over at 04:00 so late nights still count as today. */
export const appNow = () => { const d = new Date(); if (d.getHours() < 4) d.setDate(d.getDate() - 1); return d; };
export const appNowMin = () => { const m = nowMin(); return m < 240 ? m + 1440 : m; };

/** Effective status: explicit, or auto "miss" once a block ended more than 60 min ago. */
export function statusOf(k: string, blk: Block, now = appNowMin(), isToday = true): Status | undefined {
  const s = dayState(k).st[blk.id];
  if (s) return s;
  const day0 = parseKey(k), endTs = day0.getTime() + (blk.start + blk.dur) * 60000;
  if (endTs < installedAt.value) return 'skip';
  if (!isToday) return day0 < parseKey(dayKey(appNow())) ? 'miss' : undefined;
  if (blk.kind === 'sleep') return undefined;
  return blk.start + blk.dur + 60 < now ? 'miss' : undefined;
}

export function setStatus(k: string, id: string, s: Status | null) {
  patchDay(k, (d) => { const st = { ...d.st }; if (s) st[id] = s; else delete st[id]; return { ...d, st }; });
}

/** Apply an edit either to today only or to the template. */
export function editBlock(k: string, blk: Block, patch: Partial<Block>, scope: 'today' | 'always') {
  const isAdded = dayState(k).added.some((x) => x.id === blk.id);
  if (isAdded) { patchDay(k, (d) => ({ ...d, added: d.added.map((x) => (x.id === blk.id ? { ...x, ...patch } : x)) })); return; }
  if (scope === 'always' && template.value.some((t) => t.id === blk.id)) {
    template.value = template.value.map((t) => (t.id === blk.id ? { ...t, ...patch, source: 'user', updatedAt: Date.now() } : t));
    patchDay(k, (d) => { const ov = { ...d.ov }; delete ov[blk.id]; return { ...d, ov }; });
  } else patchDay(k, (d) => ({ ...d, ov: { ...d.ov, [blk.id]: { ...(d.ov[blk.id] ?? {}), ...patch } } }));
}

export function removeBlock(k: string, blk: Block, scope: 'today' | 'always') {
  const isAdded = dayState(k).added.some((x) => x.id === blk.id);
  if (isAdded) patchDay(k, (d) => ({ ...d, added: d.added.filter((x) => x.id !== blk.id) }));
  else if (scope === 'always' && template.value.some((t) => t.id === blk.id)) template.value = template.value.map((t) => (t.id === blk.id ? { ...t, deletedAt: Date.now() } : t));
  else patchDay(k, (d) => ({ ...d, ov: { ...d.ov, [blk.id]: { ...(d.ov[blk.id] ?? {}), removed: true } } }));
}

export function addBlock(k: string, data: Omit<Block, 'id' | 'order'>, scope: 'today' | 'always', date: Date) {
  if (scope === 'always') template.value = [...template.value, { ...data, days: [date.getDay()], id: uid(), order: Date.now(), source: 'user' }];
  else patchDay(k, (d) => ({ ...d, added: [...d.added, { ...data, id: uid(), order: Date.now(), source: 'user' }] }));
}

export const todayKey = computed(() => dayKey(appNow()));
export const tomorrow = () => addDays(appNow(), 1);
