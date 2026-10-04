import { persisted } from '../store/persist';
import { type Item, live, add, update } from '../store/collection';
import { dayKey, parseKey } from './time';
import { INGREDIENTS, shopping, type Macro } from './food';
import { addTxn, confirmTxns, txns } from './money';
import { extract, type Img } from './ai';

export type PantryKind = 'โปรตีน' | 'แป้ง' | 'ผัก/ผลไม้' | 'อื่นๆ';
export interface PantryItem extends Item { name: string; qty: number; unit: string; price?: number; boughtAt: string; shelf?: number; kind: PantryKind }

export const pantry = persisted<PantryItem[]>('pantry', []);
export const KINDS: PantryKind[] = ['โปรตีน', 'แป้ง', 'ผัก/ผลไม้', 'อื่นๆ'];
export const UNITS = ['g', 'kg', 'ฟอง', 'ชิ้น', 'แพ็ก', 'ถุง', 'ขวด', 'กล่อง'];

/** Grams for weight/egg units; null for things we can't convert (packs, bottles…). */
export const gramsOf = (qty: number, unit: string, name = '') => (unit === 'g' ? qty : unit === 'kg' ? qty * 1000 : unit === 'ฟอง' ? qty * 50 : /ไข่/.test(name) && unit === 'ชิ้น' ? qty * 50 : null);
/** Grams usable in a recipe: cooked-equivalent for dry rice/noodles, otherwise the plain weight. */
export const itemGrams = (it: PantryItem) => { const g = gramsOf(it.qty, it.unit, it.name); return g == null ? null : g * cookFactor(it.name); };

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|ดิบ|สุก|นึ่ง|\s+/g, '');
/** Closest known ingredient (for macros), by name overlap. */
export function matchIngredient(name: string) {
  const n = norm(name); if (!n) return null;
  return INGREDIENTS.find((i) => { const k = norm(i.name); return n.includes(k) || k.includes(n); }) ?? null;
}
export function guessKind(name: string): PantryKind {
  if (/ผัก|บรอก|แครอท|กล้วย|ผลไม้|แอปเปิ้ล|ส้ม|มะเขือ|กะหล่ำ|ฟัก|แตง|พริก|หอม|กระเทียม/.test(name)) return 'ผัก/ผลไม้';
  if (/ไก่|หมู|เนื้อ|ปลา|แซลมอน|กุ้ง|ไข่|เต้าหู้|โยเกิร์ต|เวย์|ทูน่า/.test(name)) return 'โปรตีน';
  if (/ข้าว|เส้น|มันหวาน|มันฝรั่ง|ขนมปัง|โอ๊ต|พาสต้า|เผือก/.test(name)) return 'แป้ง';
  return 'อื่นๆ';
}
/** Dry rice/noodles swell when cooked; recipes (and our ingredient table) use cooked weight. */
const cookFactor = (name: string) => (/ข้าว|เส้น|พาสต้า/.test(name) && !/สุก/.test(name) ? 2.5 : 1);
const DEFAULT_SHELF: Record<PantryKind, number | undefined> = { 'โปรตีน': 4, 'แป้ง': undefined, 'ผัก/ผลไม้': 6, 'อื่นๆ': undefined };

export const daysLeftOf = (it: PantryItem, today = new Date()) => (it.shelf == null ? null : it.shelf - Math.floor((today.getTime() - parseKey(it.boughtAt).getTime()) / 864e5));
export const macroOf = (it: PantryItem): Macro | null => { const g = itemGrams(it), ing = matchIngredient(it.name); if (g == null || !ing) return null; const f = g / 100; return { k: ing.per100.k * f, p: ing.per100.p * f, c: ing.per100.c * f, f: ing.per100.f * f }; };

/** Add stock; merges with an unexpired item of the same name and unit. */
export function addStock(x: { name: string; qty: number; unit: string; price?: number; shelf?: number | null; kind?: PantryKind; boughtAt?: string }) {
  const name = x.name.trim(), kind = x.kind ?? guessKind(name), same = live(pantry.value).find((p) => p.name === name && p.unit === x.unit);
  if (same) { update(pantry, same.id, { qty: +(same.qty + x.qty).toFixed(2), price: x.price != null ? (same.price ?? 0) + x.price : same.price, boughtAt: x.boughtAt ?? dayKey(), shelf: x.shelf ?? same.shelf ?? DEFAULT_SHELF[kind] }); return same.id; }
  return add(pantry, { name, qty: x.qty, unit: x.unit, price: x.price, boughtAt: x.boughtAt ?? dayKey(), shelf: x.shelf ?? DEFAULT_SHELF[kind], kind }).id;
}
/** Use up some stock (amount in the item's own unit). Removes the item when it reaches zero. */
export function useStock(id: string, amount: number) {
  const it = pantry.value.find((p) => p.id === id); if (!it) return;
  const left = +(it.qty - amount).toFixed(2);
  update(pantry, id, left <= 0 ? { qty: 0, deletedAt: Date.now() } : { qty: left, price: it.price != null ? +(it.price * (left / it.qty)).toFixed(2) : undefined });
}
export const costPerGram = (it: PantryItem) => { const g = itemGrams(it); return it.price != null && g ? it.price / g : null; };
export const findStock = (name: string) => { const n = norm(name); return live(pantry.value).find((p) => norm(p.name) === n) ?? live(pantry.value).find((p) => norm(p.name).includes(n) || n.includes(norm(p.name))); };

/* ---------- Receipt reading ---------- */
export interface ReceiptLine { name: string; qty: number; unit: string; price: number | null; food: boolean; shelf_days: number | null }
export interface Receipt { store: string; date: string | null; total: number | null; lines: ReceiptLine[] }
const o = (props: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const N = { anyOf: [{ type: 'number' }, { type: 'null' }] }, S = { type: 'string' };
const RECEIPT_SCHEMA = o({ store: S, date: { anyOf: [S, { type: 'null' }], description: 'YYYY-MM-DD (ค.ศ.) ถ้าอ่านได้' }, total: N,
  lines: { type: 'array', items: o({ name: S, qty: { type: 'number' }, unit: { type: 'string', description: 'g, kg, ฟอง, ชิ้น, แพ็ก, ถุง, ขวด หรือ กล่อง' }, price: N, food: { type: 'boolean' }, shelf_days: { anyOf: [{ type: 'integer' }, { type: 'null' }] } }) } });

export const analyzeReceipt = (img: Img) => extract<Receipt>({
  system: `คุณอ่านใบเสร็จซูเปอร์มาร์เก็ต/ตลาดของผู้ใช้ชาวไทย หรือรูปวัตถุดิบที่ซื้อมา แล้วตอบเป็น JSON ตาม schema
- name: ขยายชื่อย่อบนใบเสร็จเป็นชื่อไทยที่คนเข้าใจ เช่น "CP CHICK BRST 1KG" → "อกไก่" แล้วใส่ปริมาณใน qty/unit
- qty/unit: ถ้าเห็นน้ำหนักให้ใช้ g หรือ kg (เช่น 1 kg → qty 1 unit kg) ไข่ใช้ ฟอง ถ้าไม่รู้ใช้ ชิ้น หรือ แพ็ก (qty 1)
- price: ราคาของบรรทัดนั้นเป็นบาท ถ้าไม่เห็นให้ null
- food: true เฉพาะอาหารและเครื่องดื่ม ส่วนถุงพลาสติก ของใช้ ภาษี ส่วนลด ให้ false
- shelf_days: ประมาณวันที่เก็บในตู้เย็นได้ (เนื้อสดดิบ 2–4, ผักสด 4–7, ไข่ 21, ของแห้งหรือข้าวสารให้ null)
- total: ยอดรวมสุทธิที่จ่าย; date: วันที่บนใบเสร็จแปลงเป็น ค.ศ.; store: ชื่อร้าน
- ห้ามเดาของที่อ่านไม่ออก ข้ามไป`,
  text: 'อ่านรายการของในรูปนี้', images: [img], schema: RECEIPT_SCHEMA, effort: 'low',
});

const stem = (s: string) => norm(s).replace(/[0-9.]+(g|kg|กก|กรัม)?/g, '');
/** Commit a reviewed receipt: expense, pantry stock, ticked shopping items. Returns a short summary. */
export function commitReceipt(r: Receipt, opt: { expense: boolean; stock: boolean; ticks: boolean; account: string }) {
  const out: string[] = [], at = r.date ? parseKey(r.date).getTime() + 12 * 3600e3 : Date.now();
  const foods = r.lines.filter((l) => l.food);
  if (opt.expense && r.total && r.total > 0) {
    const dup = txns.value.find((t) => !t.inc && t.amount === r.total && Math.abs(t.ts - at) < 36 * 3600e3);
    if (dup) out.push('มีรายการเงินจำนวนนี้อยู่แล้ว ไม่บันทึกซ้ำ');
    else { const tx = addTxn({ ts: at, amount: r.total, inc: false, merchant: r.store || 'ซื้อของสด', account: opt.account, source: 'slip', cat: 'อาหาร' }); confirmTxns([tx.id]); out.push(`รายจ่าย ${r.total.toLocaleString()} ฿`); }
  }
  if (opt.stock) { for (const l of foods) addStock({ name: l.name, qty: l.qty, unit: l.unit, price: l.price ?? undefined, shelf: l.shelf_days, boughtAt: r.date ?? dayKey() }); if (foods.length) out.push(`เข้าครัว ${foods.length} รายการ`); }
  if (opt.ticks) {
    let n = 0; shopping.value = shopping.value.map((s) => { if (s.done) return s; const k = stem(s.name); if (k && foods.some((l) => { const m = stem(l.name); return m.includes(k) || k.includes(m); })) { n++; return { ...s, done: true }; } return s; });
    if (n) out.push(`ติ๊กรายการซื้อของ ${n} อย่าง`);
  }
  return out.join(' · ') || 'ไม่มีอะไรให้บันทึก';
}

/** Pick pantry stock for a meal-prep batch: soonest-to-spoil protein, a starch, a vegetable. */
export function suggestBatch(targetP = 45) {
  const have = live(pantry.value).filter((p) => itemGrams(p) != null && matchIngredient(p.name));
  const byUrgency = (a: PantryItem, b: PantryItem) => (daysLeftOf(a) ?? 99) - (daysLeftOf(b) ?? 99);
  const pick = (k: PantryKind) => have.filter((p) => p.kind === k).sort(byUrgency)[0];
  const prot = pick('โปรตีน'), carb = pick('แป้ง'), veg = pick('ผัก/ผลไม้');
  if (!prot) return null;
  const pg = itemGrams(prot)!, ing = matchIngredient(prot.name)!, perBoxProt = (targetP / ing.per100.p) * 100;
  const boxes = Math.max(1, Math.min(8, Math.floor(pg / perBoxProt)));
  const rows = [{ pid: prot.id, name: ing.name, g: Math.round(Math.min(pg, boxes * perBoxProt) / 10) * 10 }];
  for (const [p, per] of [[carb, 180], [veg, 120]] as const) if (p) { const g = itemGrams(p)!; rows.push({ pid: p.id, name: matchIngredient(p.name)!.name, g: Math.round(Math.min(g, per * boxes) / 10) * 10 }); }
  return { boxes, rows, short: pg < perBoxProt };
}
