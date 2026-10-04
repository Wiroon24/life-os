import { persisted, uid } from '../store/persist';
import type { Item } from '../store/collection';
import { live } from '../store/collection';
import { profile } from './profile';
import { addProvider, type Block } from './plan';
import { dayKey } from './time';
import { parseNotification as parseRaw, dupKey } from './notif';

/** What a category means for the budget: expense counts against it, income adds to it, invest/transfer are money moving (not spending). */
export type CatKind = 'expense' | 'income' | 'invest' | 'transfer';
export interface Cat extends Item { name: string; budget: number; icon: string; soft: string; ink: string; bar: string; income?: boolean; kind?: CatKind }
export interface CreditCard extends Item { name: string; last4?: string; limit?: number; cutDay: number; dueDay: number; apr?: number; payInFull: boolean; note?: string }
export interface Bill extends Item { name: string; amount: number; dueDay: number; approx?: boolean; kind: 'fixed' | 'card' | 'sub'; fixed: boolean }
export interface Txn { id: string; ts: number; amount: number; inc: boolean; merchant: string; cat: string; account: string; card?: string; status: 'pending' | 'confirmed'; raw?: string; source?: 'notif' | 'slip' | 'manual' | 'text'; fx?: { cur: string; amt: number } }
export interface Debt extends Item { name: string; icon: string; balance: number; orig: number; payment: number; rate: number; rateAfter?: number; fixedUntil?: string; meta: string; inBills: boolean; type?: string; rateType?: 'reducing' | 'fixed'; monthsLeft?: number }

const SEED_EXTRA_RAW: [string, string, string, string, string, CatKind][] = [
  ['เงินเดือน', 'payments', '#E3F5E8', '#137A38', '#22B455', 'transfer'], ['ลงทุน', 'trending_up', '#E6F6FB', '#0B6E8A', '#22A6C9', 'invest'], ['ย้ายบัญชี', 'swap_horiz', '#EFEDE7', '#6B6962', '#A3A097', 'transfer'], ['จ่ายบัตร/หนี้', 'credit_score', '#EFEDE7', '#6B6962', '#A3A097', 'transfer'],
];
const SEED_EXTRA: ReturnType<typeof C>[] = [];
const C = (name: string, budget: number, icon: string, soft: string, ink: string, bar: string, kind: CatKind = 'expense') => ({ name, budget, icon, soft, ink, bar, kind, income: kind === 'income' });
SEED_EXTRA_RAW.forEach(([n, ic, soft, ink, bar, k]) => SEED_EXTRA.push(C(n, 0, ic, soft, ink, bar, k)));
export const categories = persisted<Cat[]>('cats', () => [
  C('อาหาร', 6000, 'restaurant', '#FFF4E3', '#9A5800', '#FF9F1C'), C('เดินทาง', 3000, 'directions_car', '#ECF2FF', '#1F5FD6', '#2F7BFF'),
  C('ของใช้', 2500, 'shopping_basket', '#E6F6FB', '#0B6E8A', '#22A6C9'), C('สุขภาพ', 1000, 'favorite', '#FDE7E4', '#B42318', '#F0645A'),
  C('บันเทิง', 1000, 'sports_esports', '#F1EEFF', '#5B3BE0', '#7C5CFF'), C('อื่นๆ', 1000, 'more_horiz', '#EFEDE7', '#6B6962', '#A3A097'),
  C('ขายของ', 0, 'sell', '#E3F5E8', '#137A38', '#22B455', 'income'), C('รายได้อื่น', 0, 'savings', '#E3F5E8', '#137A38', '#22B455', 'income'),
  ...SEED_EXTRA,
].map((c, i) => ({ ...c, id: uid(), order: i + 1, source: 'seed' as const })));

/** Older installs: add the new money-movement categories and give every category a kind. */
categories.value = categories.value.map((c) => (c.kind ? c : { ...c, kind: c.income ? 'income' as const : 'expense' as const }));
for (const [n, ic, soft, ink, bar, k] of SEED_EXTRA_RAW) if (!categories.value.some((c) => c.name === n)) categories.value = [...categories.value, { ...C(n, 0, ic, soft, ink, bar, k), id: uid(), order: Date.now(), source: 'seed' as const }];
export const kindOfCat = (name: string): CatKind => categories.value.find((c) => c.name === name && !c.deletedAt)?.kind ?? 'expense';

export const bills = persisted<Bill[]>('bills', () => [
  { name: 'บ้าน', amount: 8900, dueDay: 1, kind: 'fixed' as const, fixed: true },
  { name: 'รถ', amount: 4383, dueDay: 5, kind: 'fixed' as const, fixed: true },
  { name: 'มือถือ', amount: 500, dueDay: 12, kind: 'sub' as const, fixed: true },
  { name: 'Claude', amount: 700, dueDay: 15, approx: true, kind: 'sub' as const, fixed: true },
].map((b, i) => ({ ...b, id: uid(), order: i + 1, source: 'seed' as const })));

const legacyCard = (() => { try { return JSON.parse(localStorage.getItem('iam5:card') || 'null'); } catch { return null; } })();
export const cards = persisted<CreditCard[]>('cards', () => [{ id: uid(), order: 1, name: 'KTC', last4: '7292', cutDay: legacyCard?.cutDay ?? 20, dueDay: legacyCard?.dueDay ?? 5, payInFull: true, source: 'seed' as const }]);

export const debts = persisted<Debt[]>('debts', () => [
  { name: 'รถ', icon: 'directions_car', type: 'รถ', rateType: 'fixed' as const, monthsLeft: 56, balance: 216500, orig: 290000, payment: 4383, rate: 5.4, meta: 'เหลือ 56 งวด · งวดละ 4,383 · ยอดต้นประมาณ', inBills: true },
  { name: 'กยศ.', icon: 'school', balance: 22000, orig: 22000, payment: 1348, rate: 1, meta: 'หักจากเงินเดือน · 1%', inBills: false },
  { name: 'บ้าน', icon: 'home', balance: 2165568, orig: 2165568, payment: 8900, rate: 2.3, rateAfter: 4.0, fixedUntil: '2029-03', meta: '2.3% คงที่ 3 ปี', inBills: true },
].map((d, i) => ({ ...d, id: uid(), order: i + 1, source: 'seed' as const })));

export const txns = persisted<Txn[]>('txns', []);
/** Keep storage small: drop the raw notification text of confirmed items after 60 days. */
export function trimRaw() { const cut = Date.now() - 60 * 864e5; if (txns.value.some((t) => t.raw && t.status === 'confirmed' && t.ts < cut)) txns.value = txns.value.map((t) => (t.raw && t.status === 'confirmed' && t.ts < cut ? { ...t, raw: undefined } : t)); }
export const catMemory = persisted<Record<string, string>>('catMemory', {});
/** Pay plan per cycle start (debt extra + reserve); `default` is the template. */
export const payPlans = persisted<Record<string, { debt: number; reserve: number; applied?: boolean }>>('payPlans', { default: { debt: 1500, reserve: 3100 } });
export const reserveBalance = persisted('reserveBalance', 0);
export type DebtMode = 'aval' | 'snow' | 'manual' | 'none';
export const debtPlan = persisted<{ mode: DebtMode; extra: number; target?: string; lump?: number; lumpTo?: string }>('debtPlan', { mode: 'aval', extra: 1500 });
/** Older installs: the car loan is fixed-rate (interest locked for the whole contract). */
debts.value = debts.value.map((d) => (d.name === 'รถ' && d.source === 'seed' && !d.rateType ? { ...d, rateType: 'fixed' as const, monthsLeft: d.monthsLeft ?? 56, type: 'รถ' } : d));
export const isFixed = (d: Debt) => d.rateType === 'fixed';
/** Fixed-rate loans: the total still owed is the remaining installments, so prepaying shortens the term but never saves interest. */
export const owedOf = (d: Debt) => (isFixed(d) ? d.payment * (d.monthsLeft ?? Math.ceil(d.balance / Math.max(1, d.payment))) : d.balance);
export const lockedInterest = (d: Debt) => (isFixed(d) ? Math.max(0, owedOf(d) - d.balance) : 0);

/* ---------- Cycle ---------- */
/** Salary date in a month. 'eom' = the day before the last working day (Mon–Fri); if that is a weekend, the working day before it. Public holidays are not known. */
export function paydayIn(y: number, mo: number) {
  if ((profile.value.paydayMode ?? 'eom') === 'fixed') return new Date(y, mo, Math.min(profile.value.payday, new Date(y, mo + 1, 0).getDate()));
  const d = new Date(y, mo + 1, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}
export function cycle(today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = paydayIn(t.getFullYear(), t.getMonth());
  if (t < start) start = paydayIn(t.getFullYear(), t.getMonth() - 1);
  const end = paydayIn(start.getFullYear(), start.getMonth() + 1); // exclusive
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
  return txns.value.filter((t) => t.status === 'confirmed' && inCycle(t, c) && t.ts < until).reduce((a, t) => { const k = kindOfCat(t.cat); return k === 'invest' || k === 'transfer' ? a : a + (k === 'income' || t.inc ? -t.amount : t.amount); }, 0);
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
  return txns.value.filter((t) => t.status === 'confirmed' && kindOfCat(t.cat) === 'expense' && t.cat === name && inCycle(t, c)).reduce((a, t) => a + t.amount, 0);
}

/* ---------- Transactions ---------- */
/** A deposit around payday close to the net salary (or labelled as salary) is the salary itself, which the plan already counts, so it must not be added again as income. */
export const looksLikeSalary = (merchant: string, amount?: number, at = new Date()) => {
  if (/เงินเดือน|salary|payroll/i.test(merchant)) return true;
  const net = profile.value.netSalary, pd = paydayIn(at.getFullYear(), at.getMonth());
  return amount != null && net > 0 && amount >= net * 0.85 && amount <= net * 1.15 && Math.abs(at.getTime() - pd.getTime()) <= 3 * 864e5;
};
export function guessCat(merchant: string, inc: boolean, amount?: number, ts?: number) {
  const m = merchant.toLowerCase().trim();
  if (catMemory.value[m]) return catMemory.value[m];
  const me = profile.value.name.trim().toLowerCase();
  if (me && m.includes(me)) return 'ย้ายบัญชี';
  if (/ซื้อกองทุน|กองทุน|หุ้น|bitkub|binance|dime|settrade|fund/i.test(m)) return 'ลงทุน';
  if (inc && looksLikeSalary(merchant, amount, ts ? new Date(ts) : new Date())) return 'เงินเดือน';
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
  if (t.source === 'notif') {
    // The same purchase may already exist from a scanned receipt/slip (same amount within 36 h).
    const slip = txns.value.find((x) => x.source === 'slip' && !x.inc === !t.inc && x.amount === t.amount && Math.abs(x.ts - t.ts) < 36 * 3600e3);
    if (slip) return slip;
    if (isDuplicate(t)) return txns.value.find((x) => x.raw && parseRaw(x.raw) && t.raw && dupKey(parseRaw(t.raw)!) === dupKey(parseRaw(x.raw)!)) ?? txns.value[0];
  }
  const tx: Txn = { id: uid(), status: 'pending', ...t, cat: t.cat ?? guessCat(t.merchant, t.inc, t.amount, t.ts) };
  txns.value = [tx, ...txns.value];
  return tx;
}
export function confirmTxns(ids: string[]) {
  const mem = { ...catMemory.value };
  txns.value = txns.value.map((t) => { if (!ids.includes(t.id)) return t; mem[t.merchant.toLowerCase().trim()] = t.cat; return { ...t, status: 'confirmed' as const }; });
  catMemory.value = mem;
}
export const pending = () => txns.value.filter((t) => t.status === 'pending').sort((a, b) => b.ts - a.ts);

/* ---------- Debt payoff simulation ---------- */
const monthsBetween = (ym: string, from = new Date()) => { const [y, m] = ym.split('-').map(Number); return (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth()); };
/** isolate: extra goes only to `target` and freed instalments are not redirected, to show what that one choice does by itself. */
export interface SimOpts { target?: string; lump?: number; lumpTo?: string; isolate?: boolean }
export function simulate(extra: number, mode: DebtMode, o: SimOpts = {}) {
  const ds = live(debts.value), b: Record<string, number> = {}, off: Record<string, number> = {};
  ds.forEach((d) => (b[d.id] = owedOf(d)));
  const rateAt = (d: Debt, m: number) => (isFixed(d) ? 0 : d.fixedUntil && d.rateAfter != null && m > monthsBetween(d.fixedUntil) ? d.rateAfter : d.rate);
  const aval = (x: Debt, y: Debt) => rateAt(y, 1) - rateAt(x, 1);
  const order = mode === 'none' ? null : o.isolate && o.target ? [o.target] : [...ds].sort((x, y) => {
    if (mode === 'manual' && o.target) { if (x.id === o.target) return -1; if (y.id === o.target) return 1; }
    return mode === 'snow' ? owedOf(x) - owedOf(y) : aval(x, y);
  }).map((d) => d.id);
  let int = 0, m = 0, paid = 0;
  if (o.lump && o.lump > 0) {
    let pool = o.lump;
    for (const k of [o.lumpTo, ...(order ?? ds.map((d) => d.id))].filter(Boolean) as string[]) { if (pool <= 0) break; const p = Math.min(pool, b[k] ?? 0); if (p > 0) { b[k] -= p; pool -= p; paid += p; if (b[k] <= 0.5 && !off[k]) off[k] = 0; } }
  }
  while (ds.some((d) => b[d.id] > 0.5) && m < 720) {
    m++; let pool = order ? extra : 0;
    for (const d of ds) {
      if (b[d.id] <= 0.5) { if (order && !o.isolate) pool += d.payment; continue; }
      const i = (b[d.id] * rateAt(d, m)) / 1200; int += i; b[d.id] += i;
      const p = Math.min(b[d.id], d.payment); b[d.id] -= p; paid += p; if (order && !o.isolate) pool += d.payment - p;
      if (b[d.id] <= 0.5 && !off[d.id]) off[d.id] = m;
    }
    if (order) for (const k of order) { if (pool <= 0) break; if (b[k] > 0.5) { const p = Math.min(pool, b[k]); b[k] -= p; pool -= p; paid += p; if (b[k] <= 0.5 && !off[k]) off[k] = m; } }
  }
  return { int, off, end: m, order, paid };
}
export const monthLabel = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }); };

/* ---------- Bills on the day plan ---------- */
export function upcomingBills(today = new Date(), withinDays = 40) {
  const out: { id: string; name: string; amount: number; date: Date; days: number; approx?: boolean; card?: boolean }[] = [];
  for (const b of live(bills.value)) for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + off, b.dueDay), days = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
    if (days >= 0 && days <= withinDays) { out.push({ id: b.id, name: b.name, amount: b.amount, date: d, days, approx: b.approx }); break; }
  }
  for (const cd of live(cards.value)) for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + off, cd.dueDay), days = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
    if (days >= 0) { out.push({ id: 'card:' + cd.id, name: `บัตร ${cd.name}${cd.payInFull ? ' · จ่ายเต็ม' : ''}`, amount: cardStatement(cd, today).amount, date: d, days, card: true }); break; }
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Card spend in the statement period that will be due next. Matches by last 4 digits, else by card name. */
export function cardStatement(cd: CreditCard, today = new Date()) {
  const cut = new Date(today.getFullYear(), today.getMonth(), cd.cutDay);
  if (today.getDate() > cd.cutDay) cut.setMonth(cut.getMonth() + 1);
  const from = new Date(cut); from.setMonth(from.getMonth() - 1);
  const mine = (t: Txn) => (cd.last4 && t.card ? t.card === cd.last4 : t.account === cd.name);
  const amount = txns.value.filter((t) => mine(t) && !t.inc && kindOfCat(t.cat) !== 'transfer' && t.ts > from.getTime() && t.ts <= cut.getTime() + 864e5).reduce((a, t) => a + t.amount, 0);
  return { amount, cut, daysToCut: Math.round((cut.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5) };
}

addProvider((date) => upcomingBills(date, 0).map((b): Block => ({
  id: 'bill:' + b.id + ':' + dayKey(date), order: 0, start: 20 * 60, dur: 10, role: 'money', title: `จ่าย${b.name} ${b.amount ? (b.approx ? '~' : '') + Math.round(b.amount).toLocaleString() + ' ฿' : ''}`.trim(), icon: 'credit_card', days: [], kind: 'bill', sub: b.card ? 'จ่ายเต็ม เลี่ยงดอกเบี้ย' : 'ครบกำหนดวันนี้',
})));
export const nextPayday = (today = new Date()) => cycle(today).end;
export const daysToPayday = (today = new Date()) => Math.round((nextPayday(today).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
export const isPayday = (today = new Date()) => paydayIn(today.getFullYear(), today.getMonth()).getDate() === today.getDate();

/** Rough THB per foreign unit, used only to estimate card spend abroad (the real THB amount comes on the statement). */
export const FX_THB: Record<string, number> = { USD: 33, EUR: 36, GBP: 42, JPY: 0.22, SGD: 25, CNY: 4.6, HKD: 4.3, AUD: 22, KRW: 0.024, MYR: 7.5 };

/** Parse a bank/card notification into a transaction draft. Foreign currency is converted at a rough rate and flagged. */
export function parseNotification(text: string, appLabel = ''): Omit<Txn, 'id' | 'cat' | 'status'> | null {
  const p = parseRaw(text, appLabel); if (!p) return null;
  const foreign = p.cur !== 'THB';
  return { ts: Date.now(), amount: foreign ? Math.round(p.amount * (FX_THB[p.cur] ?? 1)) : p.amount, inc: p.inc, merchant: p.merchant, account: p.account, card: p.card, raw: text, source: 'notif', ...(foreign ? { fx: { cur: p.cur, amt: p.amount } } : {}) };
}

/** True if the same purchase was already captured in the last 15 minutes (SMS + app push for one charge). */
export function isDuplicate(t: Pick<Txn, 'amount' | 'merchant' | 'account' | 'raw' | 'fx'>, now = Date.now()) {
  const p = t.raw ? parseRaw(t.raw) : null;
  const key = p ? dupKey(p) : null;
  return txns.value.some((x) => now - x.ts < 15 * 60e3 && (key && x.raw ? (() => { const q = parseRaw(x.raw!); return !!q && dupKey(q) === key; })() : x.amount === t.amount && x.merchant === t.merchant && x.account === t.account));
}
