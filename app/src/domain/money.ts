import { persisted, uid } from '../store/persist';
import type { Item } from '../store/collection';
import { live } from '../store/collection';
import { profile } from './profile';
import { addProvider, type Block } from './plan';
import { dayKey } from './time';

export interface Cat extends Item { name: string; budget: number; icon: string; soft: string; ink: string; bar: string; income?: boolean }
export interface Bill extends Item { name: string; amount: number; dueDay: number; approx?: boolean; kind: 'fixed' | 'card' | 'sub'; fixed: boolean }
export interface Txn { id: string; ts: number; amount: number; inc: boolean; merchant: string; cat: string; account: string; status: 'pending' | 'confirmed'; raw?: string; source?: 'notif' | 'slip' | 'manual' | 'text' }
export interface Debt extends Item { name: string; icon: string; balance: number; orig: number; payment: number; rate: number; rateAfter?: number; fixedUntil?: string; meta: string; inBills: boolean }

const C = (name: string, budget: number, icon: string, soft: string, ink: string, bar: string, income = false) => ({ name, budget, icon, soft, ink, bar, income });
export const categories = persisted<Cat[]>('cats', () => [
  C('อาหาร', 6000, 'restaurant', '#FFF4E3', '#9A5800', '#FF9F1C'), C('เดินทาง', 3000, 'directions_car', '#ECF2FF', '#1F5FD6', '#2F7BFF'),
  C('ของใช้', 2500, 'shopping_basket', '#E6F6FB', '#0B6E8A', '#22A6C9'), C('สุขภาพ', 1000, 'favorite', '#FDE7E4', '#B42318', '#F0645A'),
  C('บันเทิง', 1000, 'sports_esports', '#F1EEFF', '#5B3BE0', '#7C5CFF'), C('อื่นๆ', 1000, 'more_horiz', '#EFEDE7', '#6B6962', '#A3A097'),
  C('ขายของ', 0, 'sell', '#E3F5E8', '#137A38', '#22B455', true), C('รายได้อื่น', 0, 'savings', '#E3F5E8', '#137A38', '#22B455', true),
].map((c, i) => ({ ...c, id: uid(), order: i + 1, source: 'seed' as const })));

export const bills = persisted<Bill[]>('bills', () => [
  { name: 'บ้าน', amount: 8900, dueDay: 1, kind: 'fixed' as const, fixed: true },
  { name: 'รถ', amount: 4383, dueDay: 5, kind: 'fixed' as const, fixed: true },
  { name: 'มือถือ', amount: 500, dueDay: 12, kind: 'sub' as const, fixed: true },
  { name: 'Claude', amount: 700, dueDay: 15, approx: true, kind: 'sub' as const, fixed: true },
].map((b, i) => ({ ...b, id: uid(), order: i + 1, source: 'seed' as const })));

export const card = persisted('card', { name: 'KTC', cutDay: 20, dueDay: 5, payInFull: true });

export const debts = persisted<Debt[]>('debts', () => [
  { name: 'รถ', icon: 'directions_car', balance: 216500, orig: 290000, payment: 4383, rate: 5.4, meta: 'เหลือ 56 งวด · งวดละ 4,383 · ยอดต้นประมาณ', inBills: true },
  { name: 'กยศ.', icon: 'school', balance: 22000, orig: 22000, payment: 1348, rate: 1, meta: 'หักจากเงินเดือน · 1%', inBills: false },
  { name: 'บ้าน', icon: 'home', balance: 2165568, orig: 2165568, payment: 8900, rate: 2.3, rateAfter: 4.0, fixedUntil: '2029-03', meta: '2.3% คงที่ 3 ปี', inBills: true },
].map((d, i) => ({ ...d, id: uid(), order: i + 1, source: 'seed' as const })));

export const txns = persisted<Txn[]>('txns', []);
export const catMemory = persisted<Record<string, string>>('catMemory', {});
/** Pay plan per cycle start (debt extra + reserve); `default` is the template. */
export const payPlans = persisted<Record<string, { debt: number; reserve: number; applied?: boolean }>>('payPlans', { default: { debt: 1500, reserve: 3100 } });
export const reserveBalance = persisted('reserveBalance', 0);
export const debtPlan = persisted<{ mode: 'aval' | 'snow' | 'none'; extra: number }>('debtPlan', { mode: 'aval', extra: 1500 });

/* ---------- Cycle ---------- */
export function cycle(today = new Date()) {
  const pd = profile.value.payday;
  const start = new Date(today.getFullYear(), today.getMonth(), pd);
  if (today.getDate() < pd) start.setMonth(start.getMonth() - 1);
  const end = new Date(start); end.setMonth(end.getMonth() + 1); // exclusive
  const totalDays = Math.round((end.getTime() - start.getTime()) / 864e5);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayNo = Math.round((t0.getTime() - start.getTime()) / 864e5) + 1;
  return { start, end, totalDays, dayNo, daysLeft: totalDays - dayNo + 1, key: dayKey(start) };
}
export const planOf = (k: string) => payPlans.value[k] ?? payPlans.value.default;
export const fixedTotal = () => live(bills.value).filter((b) => b.fixed).reduce((a, b) => a + b.amount, 0);
export const spendBudget = (today = new Date()) => { const c = cycle(today), p = planOf(c.key); return profile.value.netSalary - fixedTotal() - p.debt - p.reserve; };

const inCycle = (t: Txn, c: ReturnType<typeof cycle>) => t.ts >= c.start.getTime() && t.ts < c.end.getTime();

/** Net variable spending: expenses minus side income (salary itself is not a txn). */
export function spentIn(c = cycle(), until = Infinity) {
  return txns.value.filter((t) => t.status === 'confirmed' && inCycle(t, c) && t.ts < until).reduce((a, t) => a + (t.inc ? -t.amount : t.amount), 0);
}

export function safeToSpend(today = new Date()) {
  const c = cycle(today), B = spendBudget(today);
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const before = spentIn(c, startOfDay), all = spentIn(c);
  const allowance = Math.max(0, (B - before) / c.daysLeft), todaySpent = all - before;
  const left = allowance - todaySpent;
  const usedPct = B > 0 ? Math.round((all / B) * 100) : 0, pacePct = Math.round(((c.dayNo - 1) / c.totalDays) * 100);
  return { left, allowance, todaySpent, budget: B, spent: all, usedPct, pacePct, cycle: c, tomorrow: Math.max(0, (B - all) / Math.max(1, c.daysLeft - 1)) };
}

export function catSpend(name: string, c = cycle()) {
  return txns.value.filter((t) => t.status === 'confirmed' && !t.inc && t.cat === name && inCycle(t, c)).reduce((a, t) => a + t.amount, 0);
}

/* ---------- Transactions ---------- */
export function guessCat(merchant: string, inc: boolean) {
  const m = merchant.toLowerCase().trim();
  if (catMemory.value[m]) return catMemory.value[m];
  if (inc) return 'ขายของ';
  const rules: [RegExp, string][] = [
    [/grab\s*food|line\s*man|foodpanda|robinhood|ร้าน|ข้าว|ก๋วยเตี๋ยว|ส้มตำ|กาแฟ|cafe|coffee|starbucks|amazon|mk|kfc|mcdonald|pizza|food/i, 'อาหาร'],
    [/grab|bolt|bts|mrt|ปตท|ptt|shell|bangchak|น้ำมัน|ทางด่วน|easy\s*pass|taxi|parking|จอดรถ/i, 'เดินทาง'],
    [/7-?eleven|7-11|lotus|big\s*c|makro|tops|shopee|lazada|watsons|boots|family\s*mart/i, 'ของใช้'],
    [/โรงพยาบาล|hospital|clinic|คลินิก|pharmacy|ร้านยา|fitness|gym/i, 'สุขภาพ'],
    [/steam|netflix|spotify|youtube|playstation|nintendo|major|sf\s*cinema|cinema|game/i, 'บันเทิง'],
  ];
  return rules.find(([r]) => r.test(m))?.[1] ?? 'อื่นๆ';
}

export function addTxn(t: Omit<Txn, 'id' | 'cat' | 'status'> & { cat?: string; status?: Txn['status'] }) {
  const tx: Txn = { id: uid(), status: 'pending', ...t, cat: t.cat ?? guessCat(t.merchant, t.inc) };
  txns.value = [tx, ...txns.value];
  return tx;
}
export function confirmTxns(ids: string[]) {
  const mem = { ...catMemory.value };
  txns.value = txns.value.map((t) => { if (!ids.includes(t.id)) return t; mem[t.merchant.toLowerCase().trim()] = t.cat; return { ...t, status: 'confirmed' as const }; });
  catMemory.value = mem;
}
export const pending = () => txns.value.filter((t) => t.status === 'pending').sort((a, b) => b.ts - a.ts);

/**
 * Parse a Thai bank / card notification or SMS. Handles common K PLUS, KTC, SCB, KTB shapes:
 * "ใช้จ่าย 359.00 บาท ที่ SHOPEE", "รายการโอน ... 80.00 บาท", "เงินเข้า 650.00 บ.", "Paid THB 112.00 at GRAB*FOOD".
 */
export function parseNotification(text: string): Omit<Txn, 'id' | 'cat' | 'status'> | null {
  const s = text.replace(/\s+/g, ' ').trim();
  const amtM = s.match(/(?:THB|฿)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(?:บาท|บ\.|THB)/i);
  if (!amtM) return null;
  const amount = parseFloat((amtM[1] ?? amtM[2]).replace(/,/g, ''));
  if (!amount) return null;
  const inc = /เงินเข้า|รับโอน|ได้รับ|received|deposit|โอนเข้า|incoming/i.test(s);
  const account = /ktc/i.test(s) ? 'KTC' : /k\s?plus|กสิกร|kbank|make/i.test(s) ? 'กสิกร' : /scb|ไทยพาณิชย์/i.test(s) ? 'SCB' : /ktb|กรุงไทย/i.test(s) ? 'กรุงไทย' : 'บัญชี';
  const mer = s.match(/(?:ที่|at|ร้าน|to|ให้|ไปยัง|จาก|from)\s+([A-Za-z0-9ก-๙*&.'\- ]{2,40}?)(?=\s(?:วันที่|เวลา|ยอด|คงเหลือ|on|\d{1,2}[/:])|$|[.,])/i);
  const merchant = (mer?.[1] ?? (inc ? 'เงินเข้า' : 'รายการจาก ' + account)).trim();
  return { ts: Date.now(), amount, inc, merchant, account, raw: text, source: 'notif' };
}

/* ---------- Debt payoff simulation ---------- */
const monthsBetween = (ym: string, from = new Date()) => { const [y, m] = ym.split('-').map(Number); return (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth()); };
export function simulate(extra: number, mode: 'aval' | 'snow' | 'none') {
  const ds = live(debts.value), b: Record<string, number> = {}, off: Record<string, number> = {};
  ds.forEach((d) => (b[d.id] = d.balance));
  const rateAt = (d: Debt, m: number) => (d.fixedUntil && d.rateAfter != null && m > monthsBetween(d.fixedUntil) ? d.rateAfter : d.rate);
  const order = mode === 'none' ? null : [...ds].sort((x, y) => (mode === 'aval' ? rateAt(y, 1) - rateAt(x, 1) : x.balance - y.balance)).map((d) => d.id);
  let int = 0, m = 0;
  while (ds.some((d) => b[d.id] > 0.5) && m < 720) {
    m++; let pool = order ? extra : 0;
    for (const d of ds) {
      if (b[d.id] <= 0.5) { if (order) pool += d.payment; continue; }
      const i = (b[d.id] * rateAt(d, m)) / 1200; int += i; b[d.id] += i;
      const p = Math.min(b[d.id], d.payment); b[d.id] -= p; if (order) pool += d.payment - p;
      if (b[d.id] <= 0.5 && !off[d.id]) off[d.id] = m;
    }
    if (order) for (const k of order) { if (pool <= 0) break; if (b[k] > 0.5) { const p = Math.min(pool, b[k]); b[k] -= p; pool -= p; if (b[k] <= 0.5 && !off[k]) off[k] = m; } }
  }
  return { int, off, end: m, order };
}
export const monthLabel = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }); };

/* ---------- Bills on the day plan ---------- */
export function upcomingBills(today = new Date(), withinDays = 40) {
  const out: { id: string; name: string; amount: number; date: Date; days: number; approx?: boolean; card?: boolean }[] = [];
  for (const b of live(bills.value)) for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + off, b.dueDay), days = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
    if (days >= 0 && days <= withinDays) { out.push({ id: b.id, name: b.name, amount: b.amount, date: d, days, approx: b.approx }); break; }
  }
  const cd = card.value;
  for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + off, cd.dueDay), days = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
    if (days >= 0) { out.push({ id: 'card', name: `บัตร ${cd.name} · จ่ายเต็ม`, amount: cardStatement(today).amount, date: d, days, card: true }); break; }
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Card spend in the statement period that will be due next. */
export function cardStatement(today = new Date()) {
  const cd = card.value, cut = new Date(today.getFullYear(), today.getMonth(), cd.cutDay);
  if (today.getDate() > cd.cutDay) cut.setMonth(cut.getMonth() + 1);
  const from = new Date(cut); from.setMonth(from.getMonth() - 1);
  const amount = txns.value.filter((t) => t.account === cd.name && !t.inc && t.ts > from.getTime() && t.ts <= cut.getTime() + 864e5).reduce((a, t) => a + t.amount, 0);
  return { amount, cut, daysToCut: Math.round((cut.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5) };
}

addProvider((date) => upcomingBills(date, 0).map((b): Block => ({
  id: 'bill:' + b.id + ':' + dayKey(date), order: 0, start: 20 * 60, dur: 10, role: 'money', title: `จ่าย${b.name} ${b.amount ? (b.approx ? '~' : '') + Math.round(b.amount).toLocaleString() + ' ฿' : ''}`.trim(), icon: 'credit_card', days: [], kind: 'bill', sub: b.card ? 'จ่ายเต็ม เลี่ยงดอกเบี้ย' : 'ครบกำหนดวันนี้',
})));
export const nextPayday = (today = new Date()) => cycle(today).end;
export const daysToPayday = (today = new Date()) => Math.round((nextPayday(today).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
export const isPayday = (today = new Date()) => today.getDate() === profile.value.payday;
