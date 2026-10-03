import { persisted, uid } from '../store/persist';
import { planFor } from './training';
import { dayKey, clock, parseKey } from './time';

export interface Macro { k: number; p: number; c: number; f: number }
export interface FoodEntry extends Macro { id: string; date: string; time: string; slot: string; name: string; icon: string; source: 'box' | 'quick' | 'photo' | 'text' | 'manual' }
export interface Box extends Macro { id: string; name: string; qty: number; madeAt: string; keepDays: number }
export interface Ingredient { name: string; per100: Macro; step: number; unit?: string }

export type DayType = 'train' | 'rest';
export const dayType = (d: Date): DayType => { const k = planFor(d).kind; return k === 'lift' || d.getDay() === 1 ? 'train' : 'rest'; };

/** AI targets come from the adaptive TDEE; user overrides win and are marked custom. */
export const tdee = persisted('tdee', { kcal: 2450, updated: '' });
export const customTargets = persisted<Partial<Record<DayType, Macro>>>('customTargets', {});

export function aiTargets(t: DayType): Macro {
  const avg = Math.round((tdee.value.kcal - 450) / 50) * 50;
  const k = t === 'train' ? avg + 125 : avg - 125, p = 160, f = 65;
  return { k: Math.round(k / 50) * 50, p, f, c: Math.max(80, Math.round((Math.round(k / 50) * 50 - p * 4 - f * 9) / 4 / 5) * 5) };
}
export const targetsFor = (d: Date): Macro => { const t = dayType(d); return customTargets.value[t] ?? aiTargets(t); };

export const foodLog = persisted<FoodEntry[]>('foodLog', []);
export const water = persisted<Record<string, number>>('water', {});
export const WATER_GOAL = 3300;

export const entriesOn = (d: Date) => foodLog.value.filter((e) => e.date === dayKey(d)).sort((a, b) => a.time.localeCompare(b.time));
export const totalsOn = (d: Date): Macro => entriesOn(d).reduce((a, e) => ({ k: a.k + e.k, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { k: 0, p: 0, c: 0, f: 0 });

export const slotFor = (time: string) => { const h = +time.slice(0, 2); return h < 10.5 ? 'เช้า' : h < 15 ? 'กลางวัน' : h < 18 ? 'ว่าง' : h < 22 ? 'เย็น' : 'ดึก'; };

export function logFood(items: (Macro & { name: string; icon?: string; source?: FoodEntry['source'] })[], d = new Date()) {
  const time = clock(), date = dayKey(d.getHours() < 4 ? new Date(d.getTime() - 864e5) : d);
  const added = items.map((i) => ({ id: uid(), date, time, slot: slotFor(time), icon: 'restaurant', source: 'manual' as const, ...i, k: Math.round(i.k), p: Math.round(i.p), c: Math.round(i.c), f: Math.round(i.f) }));
  foodLog.value = [...foodLog.value, ...added];
  return added.map((a) => a.id);
}
export const unlogFood = (ids: string[]) => (foodLog.value = foodLog.value.filter((e) => !ids.includes(e.id)));

/* ---------- Fridge (meal prep boxes) ---------- */
export const fridge = persisted<Box[]>('fridge', []);
export const daysLeft = (b: Box) => b.keepDays - Math.floor((Date.now() - parseKey(b.madeAt).getTime()) / 864e5);
export function eatBox(id: string) {
  const b = fridge.value.find((x) => x.id === id); if (!b || b.qty <= 0) return null;
  fridge.value = fridge.value.map((x) => (x.id === id ? { ...x, qty: x.qty - 1 } : x));
  const ids = logFood([{ name: `${b.name} · กล่อง`, k: b.k, p: b.p, c: b.c, f: b.f, icon: 'lunch_dining', source: 'box' }]);
  return () => { unlogFood(ids); fridge.value = fridge.value.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)); };
}

/* ---------- Ingredients (per 100 g raw unless noted) ---------- */
const I = (name: string, k: number, p: number, c: number, f: number, step = 50, unit?: string): Ingredient => ({ name, per100: { k, p, c, f }, step, unit });
export const INGREDIENTS: Ingredient[] = [
  I('อกไก่ดิบ', 120, 23, 0, 2.6), I('สะโพกไก่ไม่หนัง', 150, 19, 0, 8), I('หมูสันในดิบ', 143, 21, 0, 6), I('แซลมอน', 208, 20, 0, 13),
  I('ปลาดอลลี่', 90, 18, 0, 1.5), I('ไข่ไก่ (ฟองละ 50 g)', 143, 12.6, 0.7, 9.5), I('เต้าหู้แข็ง', 145, 15, 3, 9),
  I('ข้าวกล้องสุก', 112, 2.6, 23, 0.9), I('ข้าวขาวสุก', 130, 2.7, 28, 0.3), I('มันหวานนึ่ง', 86, 1.6, 20, 0.1), I('เส้นโฮลวีตสุก', 124, 5, 25, 0.5),
  I('บรอกโคลี', 34, 2.8, 7, 0.4), I('ผักรวม', 40, 2, 7, 0.3), I('แครอท', 41, 0.9, 10, 0.2), I('น้ำมันมะกอก', 884, 0, 0, 100, 5),
];

/** Grab-and-go items for "still short" suggestions and quick logging. */
export const QUICK: (Macro & { name: string; icon: string })[] = [
  { name: 'ไข่ต้ม 3 ฟอง', k: 210, p: 18, c: 2, f: 15, icon: 'egg' },
  { name: 'กรีกโยเกิร์ต 200 g', k: 130, p: 20, c: 8, f: 0, icon: 'icecream' },
  { name: 'เวย์ 1 สกู๊ป', k: 120, p: 24, c: 3, f: 2, icon: 'blender' },
  { name: 'กล้วย + เวย์', k: 225, p: 25, c: 30, f: 2, icon: 'bolt' },
  { name: 'อัลมอนด์ 15 g', k: 90, p: 3, c: 3, f: 8, icon: 'nutrition' },
  { name: 'ไข่ 3 + ข้าวโอ๊ต 50 g + ผลไม้', k: 460, p: 25, c: 49, f: 18, icon: 'egg_alt' },
];

/** Cover missing protein from what's actually available, staying under the kcal left. */
export function suggestForProtein(d: Date) {
  const t = targetsFor(d), have = totalsOn(d), miss = t.p - have.p, kcalLeft = t.k - have.k;
  if (miss <= 5) return null;
  const pool = [
    ...fridge.value.filter((b) => b.qty > 0).sort((a, b) => daysLeft(a) - daysLeft(b)).map((b) => ({ name: `${b.name} · กล่อง`, k: b.k, p: b.p, c: b.c, f: b.f, icon: 'lunch_dining', boxId: b.id as string | undefined })),
    ...QUICK.filter((q) => q.p >= 15).map((q) => ({ ...q, boxId: undefined as string | undefined })),
  ];
  const pick: typeof pool = []; let p = 0, k = 0;
  for (const it of [...pool].sort((a, b) => b.p / b.k - a.p / a.k)) {
    if (p >= miss - 5 || pick.length >= 2) break;
    if (k + it.k > kcalLeft + 100) continue;
    pick.push(it); p += it.p; k += it.k;
  }
  return { miss: Math.round(miss), items: pick, p, k, left: Math.round(kcalLeft - k) };
}

/* ---------- Shopping list ---------- */
export interface ShopItem { id: string; group: string; name: string; qty: string; done: boolean }
const S = (group: string, name: string, qty: string): ShopItem => ({ id: uid(), group, name, qty, done: false });
export const shopping = persisted<ShopItem[]>('shopping', [
  S('เนื้อสัตว์', 'อกไก่', '1.2 kg'), S('เนื้อสัตว์', 'หมูสันใน', '800 g'), S('เนื้อสัตว์', 'ปลา/แซลมอน', '450 g'), S('เนื้อสัตว์', 'ไข่ไก่', '30 ฟอง'),
  S('ผักและแป้ง', 'บรอกโคลี', '600 g'), S('ผักและแป้ง', 'ข้าวกล้อง', '1 kg'), S('ผักและแป้ง', 'มันหวาน', '700 g'), S('ผักและแป้ง', 'ผักรวม', '500 g'),
  S('อื่นๆ', 'กรีกโยเกิร์ต', '4 ถ้วย'), S('อื่นๆ', 'กล้วย', '1 หวี'), S('อื่นๆ', 'เวย์', 'ตรวจว่าเหลือ'), S('อื่นๆ', 'ครีเอทีน', 'ตรวจว่าเหลือ'),
]);
