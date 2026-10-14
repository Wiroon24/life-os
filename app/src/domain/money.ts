import { effect, untracked } from '@preact/signals';
import { persisted, uid } from '../store/persist';
import type { Item } from '../store/collection';
import { live } from '../store/collection';
import { profile } from './profile';
import { addProvider, type Block } from './plan';
import { dayKey } from './time';
import { parseNotification as parseRaw } from './notif';

/** What a category means for the budget: expense counts against it, income adds to it, invest/transfer are money moving (not spending). */
export type CatKind = 'expense' | 'income' | 'invest' | 'transfer';
/** `pocket` = the pocket this category's money normally comes from (default for new transactions). */
export interface Cat extends Item { name: string; budget: number; icon: string; soft: string; ink: string; bar: string; income?: boolean; kind?: CatKind; pocket?: string }
export interface CreditCard extends Item { name: string; last4?: string; limit?: number; cutDay: number; dueDay: number; apr?: number; payInFull: boolean; note?: string }
/** `pocket` = where it is paid from (default: the salary account). */
/** `debtId` = this bill is a debt's instalment (name and amount follow the debt, so it is entered once). */
export interface Bill extends Item { name: string; amount: number; dueDay: number; approx?: boolean; kind: 'fixed' | 'card' | 'sub'; fixed: boolean; pocket?: string; debtId?: string }
/** `pocket` = whose money this is. Paid by credit card → the pocket owes that amount to the card's reserve pocket until moved. */
/** `via` = e-wallet the card was charged through (e.g. TrueMoney on KTC); both notifications became this one record. */
export interface Txn { id: string; ts: number; amount: number; inc: boolean; merchant: string; cat: string; account: string; card?: string; pocket?: string; via?: string; billId?: string; status: 'pending' | 'confirmed'; raw?: string; source?: 'notif' | 'slip' | 'manual' | 'text'; fx?: { cur: string; amt: number } }

/**
 * Pockets mirror the real pockets in MAKE by KBank (plus the salary account).
 * `balance` is the real balance the user last checked at `balanceAt`; everything after that is computed.
 * `balanceAt` unset = never checked, so the pocket is not used for "ใช้ได้วันนี้" yet.
 */
export type PocketKind = 'main' | 'spend' | 'shared' | 'card' | 'business' | 'saving';
export interface Pocket extends Item { name: string; icon: string; kind: PocketKind; bank: string; monthly: number; partner?: number; balance: number; balanceAt?: number; cardId?: string; daily?: boolean; note?: string }
/** Money moved between pockets by hand (MAKE does not notify internal moves). `from`/`to` may be 'ext' (outside money, e.g. partner's share). */
export interface Move { id: string; ts: number; from: string; to: string; amount: number; kind?: 'card' | 'fill' | 'manual'; note?: string }
export interface Debt extends Item { name: string; icon: string; balance: number; orig: number; payment: number; rate: number; rateAfter?: number; fixedUntil?: string; meta: string; inBills: boolean; type?: string; rateType?: 'reducing' | 'fixed'; monthsLeft?: number }

const SEED_EXTRA_RAW: [string, string, string, string, string, CatKind][] = [
  ['เงินเดือน', 'payments', '#E3F5E8', '#137A38', '#22B455', 'transfer'], ['บิลประจำ', 'event', '#EFEDE7', '#6B6962', '#A3A097', 'transfer'], ['ลงทุน', 'trending_up', '#E6F6FB', '#0B6E8A', '#22A6C9', 'invest'], ['ย้ายบัญชี', 'swap_horiz', '#EFEDE7', '#6B6962', '#A3A097', 'transfer'], ['จ่ายบัตร/หนี้', 'credit_score', '#EFEDE7', '#6B6962', '#A3A097', 'transfer'],
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

/* ---------- Pockets ---------- */
export const POCKET_KIND: Record<PocketKind, { l: string; hint: string; soft: string; ink: string; bar: string; icon: string }> = {
  main: { l: 'บัญชีรับเงินเดือน', hint: 'เงินเดือนเข้า ค่าคงที่ตัดจากที่นี่', soft: '#EFEDE7', ink: '#17181C', bar: '#6B6962', icon: 'account_balance' },
  spend: { l: 'ใช้จ่ายส่วนตัว', hint: 'นับเป็น “ใช้ได้วันนี้” ได้', soft: '#FFF4E3', ink: '#9A5800', bar: '#FF9F1C', icon: 'restaurant' },
  shared: { l: 'ใช้ร่วม', hint: 'เงินกองกลาง เช่น หารกับแฟน', soft: '#E6F6FB', ink: '#0B6E8A', bar: '#22A6C9', icon: 'group' },
  card: { l: 'สำรองจ่ายบัตร', hint: 'พักเงินไว้จ่ายบัตรเครดิต', soft: '#ECF2FF', ink: '#1F5FD6', bar: '#2F7BFF', icon: 'credit_card' },
  business: { l: 'ธุรกิจ', hint: 'ทุนและรายรับจากขายของ', soft: '#E3F5E8', ink: '#137A38', bar: '#22B455', icon: 'inventory_2' },
  saving: { l: 'เงินเก็บ', hint: 'สำรองฉุกเฉิน เป้าหมาย', soft: '#F1EEFF', ink: '#5B3BE0', bar: '#7C5CFF', icon: 'savings' },
};
const pocketsSeeded = (() => { try { return localStorage.getItem('iam5:pockets') == null; } catch { return true; } })();
export const pockets = persisted<Pocket[]>('pockets', () => {
  const ktc = live(cards.value)[0], food = categories.value.find((c) => c.name === 'อาหาร');
  const P = (name: string, kind: PocketKind, bank: string, monthly: number, x: Partial<Pocket> = {}): Omit<Pocket, 'id' | 'order'> => ({ name, kind, bank, monthly, icon: POCKET_KIND[kind].icon, balance: 0, source: 'seed', ...x });
  return [
    P('Bangkok Bank', 'main', 'กรุงเทพ', 0, { note: 'รับเงินเดือน' }),
    P('ค่ากินส่วนตัว', 'spend', 'กสิกร', food?.budget ?? 6000, { daily: true }),
    P('หารของกินของใช้', 'shared', 'กสิกร', 4000, { partner: 4000, icon: 'shopping_basket' }),
    P('สำรอง KTC', 'card', 'กสิกร', 0, { cardId: ktc?.id }),
    P('Inventory', 'business', 'กสิกร', 0),
  ].map((p, i) => ({ ...p, id: uid(), order: i + 1 }));
});
/** Pocket bookkeeping starts here; older transactions never touch pocket balances. */
export const pocketStart = persisted('pocketStart', Date.now());
export const moves = persisted<Move[]>('moves', []);
export const pocketMemory = persisted<Record<string, string>>('pocketMemory', {});
export const livePockets = () => live(pockets.value);
export const pocketById = (id?: string) => (id ? live(pockets.value).find((p) => p.id === id) : undefined);
export const reserveOf = (cd: CreditCard) => live(pockets.value).find((p) => p.kind === 'card' && p.cardId === cd.id);
export const mainPocket = () => live(pockets.value).find((p) => p.kind === 'main');
/** First run of pockets: point the usual categories at their pocket. */
if (pocketsSeeded) {
  const by = (n: string) => pockets.value.find((p) => p.name === n)?.id;
  const map: Record<string, string | undefined> = { อาหาร: by('ค่ากินส่วนตัว'), ของใช้: by('หารของกินของใช้'), ขายของ: by('Inventory'), 'จ่ายบัตร/หนี้': by('สำรอง KTC'), เงินเดือน: by('Bangkok Bank') };
  categories.value = categories.value.map((c) => (map[c.name] && !c.pocket ? { ...c, pocket: map[c.name] } : c));
}

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
/** `fills` = how much goes into each pocket this cycle; `reserve` keeps the old meaning (money set aside, not daily spending). */
export interface PayPlan { debt: number; reserve: number; applied?: boolean; fills?: Record<string, number> }
export const payPlans = persisted<Record<string, PayPlan>>('payPlans', { default: { debt: 1500, reserve: 3100 } });
export type DebtMode = 'aval' | 'snow' | 'manual' | 'none';
export const debtPlan = persisted<{ mode: DebtMode; extra: number; target?: string; lump?: number; lumpTo?: string }>('debtPlan', { mode: 'aval', extra: 1500 });
/**
 * A debt with `inBills` appears in the bill list as a linked bill that follows the debt's instalment.
 * Existing unlinked bills with the same name are adopted. Runs on load and whenever debts change.
 */
function syncDebtBills(ds: Debt[]) {
  let next = bills.value, changed = false;
  const edit = (id: string, patch: Partial<Bill>) => { next = next.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)); changed = true; };
  for (const d of ds) {
    const own = next.find((b) => b.debtId === d.id);
    if (d.deletedAt || !d.inBills || d.payment <= 0) { if (own && !own.deletedAt) edit(own.id, { deletedAt: Date.now() }); continue; }
    if (own) { if (own.deletedAt || own.amount !== d.payment || own.name !== d.name) edit(own.id, { deletedAt: undefined, amount: d.payment, name: d.name }); continue; }
    const same = next.find((b) => !b.debtId && !b.deletedAt && b.name === d.name);
    if (same) { edit(same.id, { debtId: d.id, amount: d.payment }); continue; }
    next = [...next, { id: uid(), order: Math.max(0, ...next.map((b) => b.order)) + 1, name: d.name, amount: d.payment, dueDay: 1, kind: 'fixed', fixed: true, debtId: d.id, source: 'user', updatedAt: Date.now() }]; changed = true;
  }
  if (changed) bills.value = next;
}
effect(() => { const ds = debts.value; untracked(() => syncDebtBills(ds)); });

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

/**
 * "ใช้ได้วันนี้". Once a daily pocket (e.g. ค่ากินส่วนตัว) has a checked real balance, it is that pocket's
 * available money (card spend already taken off) spread over the days to payday. Otherwise the salary plan.
 */
export function safeToSpend(today = new Date()) {
  const daily = live(pockets.value).filter((p) => p.daily && p.balanceAt != null);
  /** Unconfirmed spending is not in the numbers yet; shown next to them so a pile of pending items is not a surprise. */
  const pendingOut = (ids?: Set<string>) => txns.value.filter((t) => t.status === 'pending' && !t.inc && kindOfCat(t.cat) === 'expense' && (!ids || (t.pocket && ids.has(t.pocket)))).reduce((a, t) => a + t.amount, 0);
  if (!daily.length) return { ...planSafeToSpend(today), mode: 'plan' as const, pockets: [] as Pocket[], pendingOut: pendingOut() };
  const c = cycle(today), ids = new Set(daily.map((p) => p.id));
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const out = (from: number, to = Infinity) => txns.value.filter((t) => t.status === 'confirmed' && t.pocket && ids.has(t.pocket) && t.ts >= from && t.ts < to && t.ts >= pocketStart.value)
    .reduce((a, t) => { const k = kindOfCat(t.cat); return k === 'expense' ? a + (t.inc ? -t.amount : t.amount) : k === 'income' ? a - t.amount : a; }, 0);
  const avail = daily.reduce((a, p) => a + pocketAvailable(p), 0), todaySpent = out(startOfDay);
  const allowance = Math.max(0, (avail + todaySpent) / c.daysLeft), left = allowance - todaySpent;
  const budget = daily.reduce((a, p) => a + p.monthly, 0), spent = out(c.start.getTime(), c.end.getTime());
  const usedPct = budget > 0 ? Math.round((spent / budget) * 100) : 0, pacePct = Math.round(((c.dayNo - 1) / c.totalDays) * 100);
  return { left, allowance, todaySpent, budget, spent, usedPct, pacePct, cycle: c, tomorrow: Math.max(0, avail / Math.max(1, c.daysLeft - 1)), mode: 'pocket' as const, pockets: daily, avail, pendingOut: pendingOut(ids) };
}

function planSafeToSpend(today = new Date()) {
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
    const dup = findDuplicate(t); if (dup) return dup;
    const pair = findWalletPair(t); if (pair) return mergeWalletPair(pair, t);
  }
  // A bank payment that fits a recurring bill is that bill: marks it paid, and (not on a card) is not variable spending.
  const bill = t.source === 'notif' && !t.cat ? matchBill(t) : undefined, onCard = !!cardOfTxn(t);
  const asBill = bill && !onCard;
  const cat = t.cat ?? (asBill ? BILL_CAT : guessCat(t.merchant, t.inc, t.amount, t.ts));
  const tx: Txn = { id: uid(), status: 'pending', ...t, cat, pocket: t.pocket ?? (asBill ? bill.pocket ?? mainPocket()?.id : defaultPocket({ ...t, cat })), ...(bill ? { billId: bill.id } : {}) };
  txns.value = [tx, ...txns.value];
  return tx;
}
export function confirmTxns(ids: string[]) {
  const mem = { ...catMemory.value }, pm = { ...pocketMemory.value };
  txns.value = txns.value.map((t) => {
    if (!ids.includes(t.id)) return t;
    const k = t.merchant.toLowerCase().trim(); mem[k] = t.cat;
    // Remember the pocket only when it differs from the category's usual one (e.g. this shop is always shared).
    const cp = catPocket(t.cat); if (t.pocket && t.pocket !== cp) pm[k] = t.pocket; else delete pm[k];
    return { ...t, status: 'confirmed' as const };
  });
  catMemory.value = mem; pocketMemory.value = pm;
}
export const pending = () => txns.value.filter((t) => t.status === 'pending').sort((a, b) => b.ts - a.ts);

/* ---------- Pocket bookkeeping ---------- */
export const catPocket = (cat: string) => { const id = live(categories.value).find((c) => c.name === cat)?.pocket; return pocketById(id)?.id; };
export const cardOfTxn = (t: Pick<Txn, 'card' | 'account'>) => live(cards.value).find((cd) => (cd.last4 && t.card ? t.card === cd.last4 : t.account === cd.name));
/** Remembered pocket for the shop → the category's pocket → the only pocket at that bank (not for card spend). */
export function defaultPocket(t: Pick<Txn, 'merchant' | 'cat' | 'account' | 'card'>) {
  const mem = pocketById(pocketMemory.value[t.merchant.toLowerCase().trim()]); if (mem) return mem.id;
  const cp = catPocket(t.cat); if (cp) return cp;
  if (cardOfTxn(t)) return undefined;
  const atBank = live(pockets.value).filter((p) => p.bank === t.account);
  return atBank.length === 1 ? atBank[0].id : undefined;
}
/** Change a transaction's category; its pocket follows the new category unless the shop has its own remembered pocket. */
export const withCat = (t: Txn, cat: string, inc: boolean): Txn => {
  // Re-categorising a bank payment away from "บิลประจำ" means it was not that bill after all.
  const { billId, ...rest } = t, keepBill = billId && (cat === BILL_CAT || cardOfTxn(t));
  return { ...rest, ...(keepBill ? { billId } : {}), cat, inc, pocket: defaultPocket({ ...t, cat }) ?? t.pocket };
};

/* ---------- Bill matching ---------- */
export const BILL_CAT = 'บิลประจำ';
/**
 * Bill that a payment most likely settles: amount equal (±20% for approximate bills) and paid within 3 days of the
 * due date (7 when the shop name contains the bill name). Needs no knowledge of the bank's SMS wording.
 * Bills already settled around that date are skipped so one bill is not claimed twice.
 */
export function matchBill(t: Pick<Txn, 'ts' | 'amount' | 'inc' | 'merchant' | 'fx'>): Bill | undefined {
  if (t.inc || t.fx) return undefined;
  const at = new Date(t.ts), m = t.merchant.toLowerCase();
  let best: { b: Bill; gap: number } | undefined;
  for (const b of live(bills.value)) {
    if (b.amount <= 0 || Math.abs(t.amount - b.amount) > b.amount * (b.approx ? 0.2 : 0.005) + 0.5) continue;
    const window = m.includes(b.name.toLowerCase()) ? 7 : 3;
    const gap = Math.min(...[-1, 0, 1].map((o) => Math.abs(dayDiff(at, dayOf(at.getFullYear(), at.getMonth() + o, b.dueDay)))));
    if (gap > window || billPaid(b, at)) continue;
    if (!best || gap < best.gap) best = { b, gap };
  }
  return best?.b;
}
/** A payment tagged to this bill within 10 days of `due` (pending or confirmed). */
export const billPaid = (b: Bill, due: Date) => txns.value.some((t) => t.billId === b.id && Math.abs(dayDiff(new Date(t.ts), due)) <= 10);

/** Internal moves between own accounts are recorded as Moves, so a transfer notification must not count twice. */
const ledger = (t: Txn) => t.status === 'confirmed' && t.cat !== 'ย้ายบัญชี' && t.ts >= pocketStart.value;
/** Card purchases are owed to the reserve; card payments (transfer kind) are real money leaving the pocket. */
const isCardSpend = (t: Txn) => !!cardOfTxn(t) && kindOfCat(t.cat) !== 'transfer';
const signed = (t: Txn) => (kindOfCat(t.cat) === 'transfer' && cardOfTxn(t) ? -t.amount : t.inc || kindOfCat(t.cat) === 'income' ? t.amount : -t.amount);

/** Real balance (what MAKE should show): last checked balance + everything after it. */
export function pocketBalance(p: Pocket) {
  const since = p.balanceAt ?? pocketStart.value;
  let b = p.balance;
  for (const t of txns.value) if (t.pocket === p.id && ledger(t) && t.ts > since && !isCardSpend(t)) b += signed(t);
  for (const m of moves.value) if (m.ts > since) { if (m.to === p.id) b += m.amount; if (m.from === p.id) b -= m.amount; }
  return b;
}

export interface CardOwe { from?: Pocket; to: Pocket; card: CreditCard; amount: number; count: number }
/** What each pocket still has to move to each card's reserve pocket (card spend minus moves already made). */
export function cardOwes(): CardOwe[] {
  const out = new Map<string, CardOwe>();
  for (const t of txns.value) {
    if (!ledger(t) || !isCardSpend(t)) continue;
    const card = cardOfTxn(t)!, to = reserveOf(card); if (!to || t.pocket === to.id) continue;
    const from = pocketById(t.pocket), k = (from?.id ?? 'none') + '>' + to.id;
    const o = out.get(k) ?? { from, to, card, amount: 0, count: 0 };
    o.amount += t.inc || kindOfCat(t.cat) === 'income' ? -t.amount : t.amount; o.count++; out.set(k, o);
  }
  for (const m of moves.value) { if (m.ts < pocketStart.value) continue; const o = out.get(m.from + '>' + m.to); if (o) o.amount -= m.amount; }
  return [...out.values()].filter((o) => Math.abs(o.amount) >= 0.5);
}
/** Money in the pocket that is really free: real balance minus what it still owes to card reserves. */
export const pocketAvailable = (p: Pocket) => pocketBalance(p) - cardOwes().filter((o) => o.from?.id === p.id).reduce((a, o) => a + o.amount, 0);
/** Card reserve: money still to arrive from other pockets. */
export const pocketIncoming = (p: Pocket) => cardOwes().filter((o) => o.to.id === p.id && o.from).reduce((a, o) => a + o.amount, 0);
/** Expense from this pocket in the pay cycle (card or not), for "used X of the monthly fill". */
export function pocketSpent(p: Pocket, c = cycle()) {
  return txns.value.filter((t) => t.status === 'confirmed' && t.pocket === p.id && t.ts >= c.start.getTime() && t.ts < c.end.getTime() && kindOfCat(t.cat) === 'expense').reduce((a, t) => a + (t.inc ? -t.amount : t.amount), 0);
}
export function addMove(m: Omit<Move, 'id' | 'ts'> & { ts?: number }) { const mv: Move = { id: uid(), ts: Date.now(), ...m }; moves.value = [mv, ...moves.value]; return mv; }
/** User typed the real balance from MAKE. */
export function setPocketBalance(id: string, real: number) { pockets.value = pockets.value.map((p) => (p.id === id ? { ...p, balance: real, balanceAt: Date.now(), updatedAt: Date.now() } : p)); }
export const unassigned = () => txns.value.filter((t) => ledger(t) && !t.pocket && kindOfCat(t.cat) === 'expense');

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
  const out: { id: string; name: string; amount: number; date: Date; days: number; approx?: boolean; card?: boolean; paid?: boolean }[] = [];
  for (const b of live(bills.value)) for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth() + off, b.dueDay), days = Math.round((d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
    if (days >= 0 && days <= withinDays) { out.push({ id: b.id, name: b.name, amount: b.amount, date: d, days, approx: b.approx, paid: billPaid(b, d) }); break; }
  }
  for (const cd of live(cards.value)) {
    // Closed statement still to pay → its amount; otherwise the next due date with the open period so far (still growing).
    const st = cardStatement(cd, today), closed = st.due.days >= 0;
    const date = closed ? st.due.date : st.nextDue, days = closed ? st.due.days : dayDiff(st.nextDue, today);
    if (days <= withinDays) out.push({ id: 'card:' + cd.id, name: `บัตร ${cd.name}${cd.payInFull ? ' · จ่ายเต็ม' : ''}`, amount: closed ? st.due.amount : st.amount, date, days, approx: !closed, card: true });
  }
  return out.sort((a, b) => a.days - b.days);
}

const dayOf = (y: number, m: number, d: number) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()));
const dayDiff = (a: Date, b: Date) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / 864e5);
/** Due date of the statement cut on `cut`: same month if the due day comes after the cut day, else next month. */
const dueFor = (cd: CreditCard, cut: Date) => dayOf(cut.getFullYear(), cut.getMonth() + (cd.dueDay > cd.cutDay ? 0 : 1), cd.dueDay);

/**
 * Card spend per statement. `amount` = the open period (closes on `cut`). `due` = the last closed statement,
 * which is what has to be paid on its due date. Confirmed card purchases only (refunds subtract). Matches by last 4, else card name.
 */
export function cardStatement(cd: CreditCard, today = new Date()) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let cut = dayOf(t0.getFullYear(), t0.getMonth(), cd.cutDay);
  if (t0 > cut) cut = dayOf(t0.getFullYear(), t0.getMonth() + 1, cd.cutDay);
  const prevCut = dayOf(cut.getFullYear(), cut.getMonth() - 1, cd.cutDay), prev2 = dayOf(cut.getFullYear(), cut.getMonth() - 2, cd.cutDay);
  const end = (d: Date) => d.getTime() + 864e5; // a cut day includes that whole day
  const sum = (from: Date, to: Date) => txns.value.filter((t) => t.status === 'confirmed' && cardOfTxn(t)?.id === cd.id && kindOfCat(t.cat) !== 'transfer' && t.ts >= end(from) && t.ts < end(to))
    .reduce((a, t) => a + (t.inc ? -t.amount : t.amount), 0);
  const dueDate = dueFor(cd, prevCut);
  return {
    amount: sum(prevCut, cut), cut, daysToCut: dayDiff(cut, t0),
    due: { amount: sum(prev2, prevCut), date: dueDate, days: dayDiff(dueDate, t0), cut: prevCut },
    nextDue: dueFor(cd, cut),
  };
}

addProvider((date) => upcomingBills(date, 0).filter((b) => !b.paid).map((b): Block => ({
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

/**
 * One purchase often arrives on several channels (bank SMS + bank app push) with different sender
 * apps and merchant text ("@SHOPEE" vs "@SHOPEE BANGKOK TH"), so merchant and package are ignored.
 * Match: captured txn (pending or confirmed), same direction, same amount to the satang, same account,
 * same card last4 when both have it, within 10 minutes. Based on persisted `txns`, so it survives restarts.
 * Tradeoff: two genuinely separate same-amount purchases on the same card within 10 minutes collapse into one.
 */
const DUP_WINDOW = 10 * 60e3;
const cardOf = (x: Pick<Txn, 'card' | 'raw'>) => x.card ?? (x.raw ? parseRaw(x.raw)?.card : undefined);
export function findDuplicate(t: Pick<Txn, 'ts' | 'amount' | 'inc' | 'account' | 'card' | 'raw' | 'fx'>) {
  const c = cardOf(t), cents = Math.round((t.fx?.amt ?? t.amount) * 100);
  return txns.value.find((x) => (x.source === 'notif' || x.source === 'text') && !x.inc === !t.inc
    && Math.round((x.fx?.amt ?? x.amount) * 100) === cents && (x.fx?.cur ?? 'THB') === (t.fx?.cur ?? 'THB')
    && x.account === t.account && Math.abs(x.ts - t.ts) <= DUP_WINDOW
    && (() => { const xc = cardOf(x); return !c || !xc || c === xc; })());
}

/* ---------- E-wallets charged to a credit card ---------- */
/**
 * TrueMoney is linked to KTC, so one purchase sends two notifications at once: TrueMoney ("รายการจาก TrueMoney")
 * and KTC (merchant "TMN"). They are one purchase on the card: keep a single record with the card's account/last4
 * (so it is owed to the card reserve) and the wallet's merchant when it has a real one.
 */
const WALLETS: { account: string; onCard: RegExp }[] = [{ account: 'TrueMoney', onCard: /^\s*TMN\b|TRUE\s*MONEY|ทรูมันนี่/i }];
type Draft = Pick<Txn, 'ts' | 'amount' | 'inc' | 'merchant' | 'account' | 'card' | 'raw' | 'fx'>;
const walletOf = (x: Pick<Txn, 'account'>) => WALLETS.find((w) => x.account === w.account);
const walletOnCard = (x: Pick<Txn, 'account' | 'card' | 'merchant'>) => (cardOfTxn(x) ? WALLETS.find((w) => w.onCard.test(x.merchant)) : undefined);
const vague = (m: string) => /^\s*(รายการจาก|TMN\b|true\s*money|ทรูมันนี่)/i.test(m);
const sameMoney = (a: Draft, b: Draft) => !a.inc === !b.inc && !a.fx && !b.fx && Math.round(a.amount * 100) === Math.round(b.amount * 100) && Math.abs(a.ts - b.ts) <= DUP_WINDOW;

export function findWalletPair(t: Draft) {
  const tw = walletOf(t), tc = walletOnCard(t); if (!tw && !tc) return undefined;
  return txns.value.find((x) => (x.source === 'notif' || x.source === 'text') && sameMoney(x, t)
    && ((tw && (walletOnCard(x) === tw || x.via === tw.account)) || (tc && walletOf(x) === tc)));
}

/** Fold draft `t` into existing `x`. A record that is already merged (`via`) just absorbs the extra copy. */
export function mergeWalletPair(x: Txn, t: Draft): Txn {
  if (x.via) return x;
  const card = walletOnCard(x) ? x : t, wal = card === x ? t : x, w = walletOf(wal)!;
  const merchant = !vague(wal.merchant) ? wal.merchant : !vague(card.merchant) ? card.merchant : w.account;
  const merged: Txn = { ...x, account: card.account, card: card.card, merchant, via: w.account, ts: Math.min(x.ts, t.ts), raw: [x.raw, t.raw].filter(Boolean).join('\n—\n') || undefined };
  if (x.status === 'pending') {
    const g = guessCat(merchant, merged.inc, merged.amount, merged.ts);
    merged.cat = g !== 'อื่นๆ' ? g : wal === x ? x.cat : guessCat(wal.merchant, merged.inc, merged.amount, merged.ts);
    merged.pocket = defaultPocket(merged) ?? x.pocket;
  }
  txns.value = txns.value.map((y) => (y.id === x.id ? merged : y));
  return merged;
}

/** Older data: pairs that were saved as two records before merging existed. Keeps the confirmed one's category. */
function repairWalletPairs() {
  for (const w of txns.value.filter((x) => walletOf(x) && !x.via)) {
    const c = txns.value.find((x) => x.id !== w.id && !x.via && walletOnCard(x) === walletOf(w) && sameMoney(x, w));
    if (!c) continue;
    const keep = c.status === 'confirmed' || w.status !== 'confirmed' ? c : w, drop = keep === c ? w : c;
    const m = mergeWalletPair({ ...keep, status: 'pending' }, drop);
    const status = keep.status === 'confirmed' || drop.status === 'confirmed' ? 'confirmed' as const : 'pending' as const;
    const done = { ...m, status, cat: keep.status === 'confirmed' ? keep.cat : drop.status === 'confirmed' ? drop.cat : m.cat, pocket: keep.status === 'confirmed' ? keep.pocket ?? m.pocket : m.pocket };
    txns.value = txns.value.filter((x) => x.id !== drop.id).map((x) => (x.id === keep.id ? done : x));
  }
}
repairWalletPairs();

/* ---------- Safety + reporting ---------- */
const r0 = (n: number) => Math.round(n).toLocaleString();
/** Reasons a pocket must not be deleted yet (empty = safe). Deleting would silently lose money tracking. */
export function pocketBlockers(p: Pocket): string[] {
  const out: string[] = [], bal = pocketBalance(p);
  if (p.kind === 'main' && live(pockets.value).filter((x) => x.kind === 'main').length <= 1) out.push('เป็นบัญชีรับเงินเดือนเพียงใบเดียว');
  if (Math.abs(bal) >= 1) out.push(`ยังมียอด ${r0(bal)} ฿ ย้ายออกก่อน`);
  if (cardOwes().some((o) => o.to.id === p.id || o.from?.id === p.id)) out.push('ยังมียอดต้องย้ายเงินค้าง');
  const cd = p.cardId ? live(cards.value).find((c) => c.id === p.cardId) : undefined; if (cd) out.push(`เป็นกระเป๋าสำรองของบัตร ${cd.name}`);
  const cs = live(categories.value).filter((c) => c.pocket === p.id); if (cs.length) out.push(`หมวด ${cs.map((c) => c.name).join(', ')} ใช้เป็นค่าเริ่มต้น`);
  const bs = live(bills.value).filter((b) => b.pocket === p.id); if (bs.length) out.push(`บิล ${bs.map((b) => b.name).join(', ')} จ่ายจากกระเป๋านี้`);
  const pend = txns.value.filter((t) => t.pocket === p.id && t.status === 'pending').length; if (pend) out.push(`มีรายการรอยืนยัน ${pend} รายการ`);
  return out;
}

/** Plain-text money status for the coach: pockets, cards, what still has to be moved. */
export function moneyReport(today = new Date()): string[] {
  const c = cycle(today), s = safeToSpend(today), out: string[] = [];
  out.push(`ใช้ได้วันนี้ ${r0(s.left)} ฿ (${s.mode === 'pocket' ? `จากกระเป๋า ${s.pockets.map((p) => p.name).join(', ')} เหลือ ${r0('avail' in s ? s.avail ?? 0 : 0)} ฿` : 'ยังไม่ได้เช็คยอดจริง ใช้สูตรจากเงินเดือน'}) · ใช้ไป ${s.usedPct}% ของงบ (จังหวะควรเป็น ${s.pacePct}%)${s.pendingOut > 0 ? ` · ยังไม่นับรายการรอยืนยัน ${r0(s.pendingOut)} ฿` : ''}`);
  for (const p of livePockets()) {
    const bal = pocketBalance(p), av = pocketAvailable(p), fill = p.monthly + (p.partner ?? 0);
    out.push(`- กระเป๋า ${p.name} (${POCKET_KIND[p.kind].l}): ${p.kind === 'card' ? `มี ${r0(bal)} ฿ รอย้ายเข้า ${r0(pocketIncoming(p))}` : `ใช้ได้จริง ${r0(av)} ฿${Math.abs(bal - av) >= 1 ? ` (ใน MAKE ${r0(bal)})` : ''}`}${fill ? ` · ใช้เดือนนี้ ${r0(pocketSpent(p, c))}/${r0(fill)}` : ''}${p.balanceAt == null ? ' [ยังไม่ได้เช็คยอดจริง]' : ''}`);
  }
  for (const cd of live(cards.value)) {
    const st = cardStatement(cd, today), rp = reserveOf(cd), have = rp ? pocketBalance(rp) : 0;
    out.push(`- บัตร ${cd.name}: ${st.due.amount > 0 && st.due.days >= 0 ? `ต้องจ่าย ${r0(st.due.amount)} ฿ ภายใน ${st.due.days} วัน · ` : ''}ใช้รอบนี้ ${r0(st.amount)} ฿ (ตัดรอบอีก ${st.daysToCut} วัน) · สำรองไว้ ${r0(have)} ฿`);
  }
  const owes = cardOwes().filter((o) => o.from && o.amount > 0.5);
  if (owes.length) out.push(`- ต้องย้ายเงินใน MAKE: ${owes.map((o) => `${o.from!.name} → ${o.to.name} ${r0(o.amount)}`).join(', ')}`);
  return out;
}
