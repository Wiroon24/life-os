import { extract, hasAI, type Img } from './ai';
import { categories } from './money';
import { live } from '../store/collection';

export type Kind = 'food' | 'slip' | 'receipt' | 'inbody' | 'watch' | 'other';
export interface FoodItem { name: string; qty: string; kcal: number; protein: number; carb: number; fat: number }
export interface Parsed {
  kind: Kind; confidence: number; summary: string;
  food: { items: FoodItem[] } | null;
  money: { amount: number; merchant: string; income: boolean; category: string; account: string } | null;
  inbody: { weight: number | null; smm: number | null; fat_pct: number | null; visceral: number | null } | null;
  watch: { activity: string; minutes: number; kcal: number | null; avg_hr: number | null } | null;
  weight: number | null;
}

const nul = (o: Record<string, unknown>) => ({ anyOf: [o, { type: 'null' }] });
const obj = (props: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const num = { type: 'number' }, numN = { anyOf: [{ type: 'number' }, { type: 'null' }] }, str = { type: 'string' };

export const SCHEMA = obj({
  kind: { type: 'string', enum: ['food', 'slip', 'receipt', 'inbody', 'watch', 'other'] },
  confidence: { type: 'integer', description: '0-100' },
  summary: { type: 'string', description: 'สรุปสั้นภาษาไทย 1 บรรทัด' },
  food: nul(obj({ items: { type: 'array', items: obj({ name: str, qty: str, kcal: num, protein: num, carb: num, fat: num }) } })),
  money: nul(obj({ amount: num, merchant: str, income: { type: 'boolean' }, category: str, account: str })),
  inbody: nul(obj({ weight: numN, smm: numN, fat_pct: numN, visceral: numN })),
  watch: nul(obj({ activity: str, minutes: num, kcal: numN, avg_hr: numN })),
  weight: numN,
});

const sys = () => `คุณอ่านรูปหรือข้อความที่ผู้ใช้ชาวไทยส่งมาบันทึกในแอปสุขภาพ+การเงิน แล้วตอบเป็น JSON ตาม schema
- kind: food (อาหาร/เครื่องดื่ม), slip (สลิปโอนเงิน), receipt (ใบเสร็จ), inbody (ผลวัดองค์ประกอบร่างกาย), watch (หน้าจอนาฬิกา/แอปออกกำลังกาย), other
- อาหาร: แยกเป็นรายการ ประมาณปริมาณและมาโครแบบอาหารไทยที่สมเหตุสมผล (kcal, protein, carb, fat เป็นกรัม)
- เงิน: amount เป็นบาท income=true ถ้าเป็นเงินเข้า category เลือกจาก: ${live(categories.value).map((c) => c.name).join(', ')} · account เช่น กสิกร, KTC, เงินสด
- ข้อความเดียวอาจมีทั้งอาหารและเงิน เช่น "กินข้าวมันไก่ 60 บาท" → kind=food ใส่ทั้ง food และ money
- weight: น้ำหนักตัวถ้ามีการบอก
- section ที่ไม่เกี่ยวให้เป็น null`;

export const analyzeImage = (img: Img) => extract<Parsed>({ system: sys(), images: [img], text: 'รูปนี้คืออะไร แยกข้อมูลให้หน่อย', schema: SCHEMA });
export const analyzeText = (text: string) => extract<Parsed>({ system: sys(), text, schema: SCHEMA });

/** Instant offline parse for common one-liners; AI refines when available. */
export function quickParse(text: string): Parsed | null {
  const t = text.trim(); if (!t) return null;
  const base: Parsed = { kind: 'other', confidence: 60, summary: t, food: null, money: null, inbody: null, watch: null, weight: null };
  const w = t.match(/(?:น้ำหนัก|หนัก|ชั่ง(?:ได้)?)\s*(\d{2,3}(?:\.\d+)?)/);
  if (w) return { ...base, kind: 'other', weight: +w[1] };
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:บาท|฿|บ\.)/);
  const amount = m ? +m[1].replace(/,/g, '') : null;
  const isFood = /^กิน|ดื่ม|ข้าว|ก๋วยเตี๋ยว|กาแฟ|ลาเต้|ชา|ส้มตำ|ไก่|หมู|ไข่|เวย์/.test(t);
  const what = t.replace(/^(กิน|ดื่ม|จ่าย|ซื้อ)\s*/, '').replace(m?.[0] ?? '', '').trim();
  if (amount != null) base.money = { amount, merchant: what || 'รายจ่าย', income: /ขาย|ได้เงิน|เงินเข้า|รับ/.test(t), category: isFood ? 'อาหาร' : 'อื่นๆ', account: 'บัญชี' };
  if (isFood) { base.kind = 'food'; base.food = { items: [{ name: what || t, qty: '1 ที่', kcal: 0, protein: 0, carb: 0, fat: 0 }] }; }
  else if (amount != null) base.kind = 'receipt';
  const run = t.match(/(วิ่ง|เดิน|ปั่น|บาส|ว่ายน้ำ)\D*(\d+(?:\.\d+)?)\s*(กม|km|นาที)/);
  if (run) { base.kind = 'watch'; base.watch = { activity: run[1], minutes: run[3] === 'นาที' ? +run[2] : Math.round(+run[2] * 8), kcal: null, avg_hr: null }; }
  return base.food || base.money || base.watch ? base : null;
}
export { hasAI };
