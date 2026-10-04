import { persisted, uid } from '../store/persist';
import { live, type Item } from '../store/collection';
import { dayKey } from './time';

export type Slot = 'morning' | 'night' | 'timed';
export type Sched = 'daily' | 'alt' | 'days';
export interface Med extends Item {
  slot: Slot;
  name: string;
  sub?: string;
  sched: Sched;
  days?: number[];           // for 'days'
  alt?: [string, string];    // alternate names: even day / odd day
  time?: string;             // HH:MM — for slot 'timed' (its own reminder at that time)
}

const SEED: Omit<Med, 'id' | 'order'>[] = [
  { slot: 'morning', name: 'ล้างหน้า', sub: '30 วินาที · น้ำอุ่น', sched: 'daily' },
  { slot: 'morning', name: 'สระผม', alt: ['Ketoconazole 2% สระผม', 'Sellon สระผม'], sub: 'ทิ้งไว้ 5 นาทีก่อนล้าง', sched: 'daily' },
  { slot: 'morning', name: 'กันแดด SPF50', sub: 'หลังอาบน้ำ · 2 ข้อนิ้ว', sched: 'daily' },
  { slot: 'morning', name: 'Finasteride 1 mg', sub: 'หลังอาหารเช้า', sched: 'daily' },
  { slot: 'morning', name: 'ครีเอทีน 5 g', sub: 'ผสมเวย์หรือน้ำ', sched: 'daily' },
  { slot: 'night', name: 'ล้างหน้า', sub: 'รอหน้าแห้ง 10 นาที', sched: 'daily' },
  { slot: 'night', name: 'ทา Retacnyl', alt: ['ทา Retacnyl', 'ทา Benzac'], sub: 'ขนาดเม็ดถั่ว · เลี่ยงรอบตา', sched: 'daily' },
  { slot: 'night', name: 'มอยส์เจอไรเซอร์', sub: 'หลังทายา 5 นาที', sched: 'daily' },
];

export const meds = persisted<Med[]>('meds', () => SEED.map((x, i) => ({ ...x, id: uid(), order: i + 1, source: 'seed' })));
/** medLog[dateKey][medId] = true */
export const medLog = persisted<Record<string, Record<string, boolean>>>('medLog', {});

/** Even/odd day by days since epoch — stable across months (unlike day-of-month). */
export const isEvenDay = (d: Date) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % 2 === 0;

export function medsFor(slot: Slot, d: Date) {
  const even = isEvenDay(d), wd = d.getDay();
  return live(meds.value)
    .filter((m) => m.slot === slot)
    .filter((m) => m.sched === 'daily' || m.sched === 'alt' ? (m.sched === 'alt' ? even : true) : (m.days ?? []).includes(wd))
    .map((m) => ({ ...m, label: m.alt ? m.alt[even ? 0 : 1] : m.name, otherLabel: m.alt ? m.alt[even ? 1 : 0] : undefined }));
}

export const isTaken = (d: Date, id: string) => !!medLog.value[dayKey(d)]?.[id];
export function toggleMed(d: Date, id: string) {
  const k = dayKey(d), cur = medLog.value[k] ?? {};
  medLog.value = { ...medLog.value, [k]: { ...cur, [id]: !cur[id] } };
}
export const medProgress = (slot: Slot, d: Date) => { const l = medsFor(slot, d); return { done: l.filter((m) => isTaken(d, m.id)).length, total: l.length }; };

/** Consecutive days (ending yesterday or today) where every item in the slot was ticked. */
export function medStreak(slot: Slot, today: Date) {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const p = medProgress(slot, d);
    if (p.total && p.done === p.total) n++; else if (i > 0) break;
  }
  return n;
}
