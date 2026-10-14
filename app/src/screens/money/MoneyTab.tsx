import { useRef, useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { push } from '../../store/nav';
import { openSheet, closeSheet, showUndo, tick } from '../../store/ui';
import { live } from '../../store/collection';
import { thDate, dayKey } from '../../domain/time';
import {
  safeToSpend, pending, confirmTxns, txns, categories, cardStatement, cards, isPayday, nextPayday, kindOfCat, withCat, livePockets, pocketById, reserveOf,
  pocketBalance, pocketIncoming, cardOfTxn, fixedTotal, pocketStart, debts, simulate, debtPlan, monthLabel, type Txn, type CreditCard,
} from '../../domain/money';
import { openCategoryEditor, KIND_LABEL } from './catSheet';
import { profile } from '../../domain/profile';
import { openAddTxn } from './sheets';
import { PocketChips, PocketTile, OwesCard, openPocketEditor, openMove, openReconcile, pocketStyle } from './Pockets';
import { editCard } from './Bills';

const fmt = (n: number) => Math.round(n).toLocaleString();
const sign = (t: Txn) => { const k = kindOfCat(t.cat); return k === 'transfer' ? '↔ ' : k === 'invest' ? '→ ' : k === 'income' || t.inc ? '+' : '−'; };
export const catOf = (name: string) => live(categories.value).find((c) => c.name === name) ?? { name, icon: 'more_horiz', soft: '#EFEDE7', ink: '#6B6962', bar: '#A3A097', budget: 0, income: false };
/** "KTC → ค่ากินส่วนตัว": how it was paid and whose money it is. */
const payWith = (t: Txn) => { const cd = cardOfTxn(t); return cd ? `บัตร ${cd.name}${t.via ? ` ผ่าน ${t.via}` : ''}` : t.account; };
const payLine = (t: Txn) => { const p = pocketById(t.pocket); return `${payWith(t)}${p ? ` · ${p.name}` : ''}`; };
/** Only spending since pockets started needs a pocket; older history stays as it was. */
const needsPocket = (t: Txn) => !t.pocket && kindOfCat(t.cat) === 'expense' && t.ts >= pocketStart.value;

function InboxRow({ t, onPick }: { t: Txn; onPick: () => void }) {
  const [dx, setDx] = useState(0), st = useRef<{ x: number; y: number; mode: null | 'h' | 'v' } | null>(null);
  const c = catOf(t.cat), p = pocketById(t.pocket), ps = pocketStyle(p);
  const done = (d: number) => {
    if (d > 90) { confirmTxns([t.id]); showUndo('ยืนยันแล้ว', () => (txns.value = txns.value.map((x) => (x.id === t.id ? { ...x, status: 'pending' } : x)))); }
    else if (d < -90) { const before = txns.value; txns.value = txns.value.filter((x) => x.id !== t.id); showUndo(`ลบ ${t.merchant}`, () => (txns.value = before)); }
  };
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: dx > 0 ? 'var(--check)' : dx < 0 ? 'var(--error)' : 'var(--surface-2)' }}>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: '#fff', fontSize: 14, fontWeight: 700 }}>
        <span class="row" style={{ gap: 6, opacity: dx > 0 ? Math.min(1, dx / 90) : 0 }}><Icon n="check" size={22} />ยืนยัน</span>
        <span class="row" style={{ gap: 6, opacity: dx < 0 ? Math.min(1, -dx / 90) : 0 }}>ไม่ใช่<Icon n="delete" size={22} /></span>
      </span>
      <div onPointerDown={(e) => { st.current = { x: e.clientX, y: e.clientY, mode: null }; }}
        onPointerMove={(e) => { const s = st.current; if (!s) return; const ddx = e.clientX - s.x, ddy = e.clientY - s.y; if (!s.mode && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) { s.mode = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v'; if (s.mode === 'h') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } if (s.mode === 'h') setDx(ddx); }}
        onPointerUp={() => { const s = st.current; st.current = null; if (!s?.mode) onPick(); else if (s.mode === 'h') { done(dx); } setDx(0); }}
        onPointerCancel={() => { st.current = null; setDx(0); }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, padding: '10px 14px 10px 12px', background: '#fff', borderRadius: 18, transform: `translateX(${dx}px)`, transition: st.current ? 'none' : 'transform 220ms var(--ease-out)', touchAction: 'pan-y', userSelect: 'none', cursor: 'grab' }}>
        <span class="medal" style={{ width: 40, height: 40, background: c.soft, color: c.ink }}><Icon n={c.icon} fill size={22} /></span>
        <span class="col grow" style={{ gap: 4, minWidth: 0 }}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.merchant}</span><span class="row muted" style={{ fontSize: 12.5, gap: 6, flexWrap: 'wrap' }}>{payWith(t)}
          <span class="row" style={{ gap: 2, height: 26, padding: '0 6px 0 10px', borderRadius: 999, background: c.soft, color: c.ink, fontWeight: 600 }}>{t.cat}<Icon n="expand_more" size={16} /></span>
          {kindOfCat(t.cat) === 'expense' && (p ? <span class="row" style={{ gap: 4, height: 26, padding: '0 10px', borderRadius: 999, background: ps.soft, color: ps.ink, fontWeight: 600 }}><Icon n={p.icon} fill size={14} />{p.name}</span>
            : <span class="row" style={{ gap: 4, height: 26, padding: '0 10px', borderRadius: 999, background: '#FFE3DA', color: '#B83A1C', fontWeight: 600 }}>เลือกกระเป๋า</span>)}
          {t.fx ? `${t.fx.amt} ${t.fx.cur} (ประมาณ)` : ''}</span></span>
        <span class="num" style={{ fontSize: 17, fontWeight: 600, color: kindOfCat(t.cat) === 'income' || t.inc ? 'var(--workout-ink)' : 'var(--ink)' }}>{t.fx ? '≈' : ''}{sign(t)}{fmt(t.amount)}</span>
      </div>
    </div>
  );
}

/** Picking a category on a pending item means the user checked it: set the category and confirm in one tap (undoable). */
function setCatAndConfirm(t: Txn, cat: string, inc: boolean, close = true) {
  const before = txns.value.find((x) => x.id === t.id); if (!before) return;
  txns.value = txns.value.map((x) => (x.id === t.id ? withCat(x, cat, inc) : x));
  if (close) closeSheet();
  if (before.status === 'pending') { confirmTxns([t.id]); showUndo(`${t.merchant} → ${cat} · ยืนยันแล้ว`, () => (txns.value = txns.value.map((x) => (x.id === t.id ? before : x)))); }
}
const setPocket = (id: string, pocket: string | undefined) => (txns.value = txns.value.map((x) => (x.id === id ? { ...x, pocket } : x)));
const PocketHint = ({ t }: { t: Txn }) => { const cd = cardOfTxn(t), r = cd && reserveOf(cd); return <span class="muted" style={{ fontSize: 12.5 }}>{cd ? (r ? `ใช้บัตร ${cd.name} · เงินจากกระเป๋านี้จะต้องย้ายไป ${r.name}` : `ใช้บัตร ${cd.name} · ยังไม่มีกระเป๋าสำรองบัตรนี้`) : 'เงินออกจากกระเป๋าไหน'}{' · ค่าใช้จ่ายร่วม เลือกกระเป๋าใช้ร่วม'}</span>; };

/** Shown right after bank notifications are imported: fix category and pocket inline, then confirm or reject. */
export function reviewTxns(ids: string[]) {
  openSheet({ title: ids.length > 1 ? `รายการใหม่ ${ids.length} รายการ` : 'รายการใหม่', body: () => {
    const list = txns.value.filter((t) => ids.includes(t.id) && t.status === 'pending');
    if (!list.length) { setTimeout(closeSheet, 0); return null; }
    const cats = live(categories.value);
    return <div class="col" style={{ gap: 12 }}>
      <span class="muted" style={{ fontSize: 13, marginTop: -6 }}>แตะหมวดที่ถูก = ยืนยันทันที · เลือกกระเป๋าก่อนถ้าเงินไม่ได้มาจากกระเป๋าปกติ</span>
      {list.map((t) => {
        const kinds = t.inc ? ['income', 'transfer', 'invest', 'expense'] : ['expense', 'transfer', 'invest', 'income'];
        const opts = [...cats].sort((a, b) => (a.name === t.cat ? -1 : b.name === t.cat ? 1 : kinds.indexOf(kindOfCat(a.name)) - kinds.indexOf(kindOfCat(b.name))));
        return <div class="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)' }}>
          <div class="row" style={{ gap: 8 }}>
            <span class="col grow" style={{ minWidth: 0 }}><span class="t16">{t.merchant}</span><span class="muted" style={{ fontSize: 12.5 }}>{payLine(t)} · {new Date(t.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></span>
            <span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{sign(t)}{fmt(t.amount)}</span>
          </div>
          {kindOfCat(t.cat) !== 'transfer' && <><PocketHint t={t} /><PocketChips value={t.pocket} onPick={(id) => setPocket(t.id, id)} /></>}
          <div class="row no-scrollbar" style={{ gap: 6, overflowX: 'auto', margin: '0 -12px', padding: '0 12px' }}>
            {opts.map((c) => { const on = c.name === t.cat; return <button class="press" style={{ flex: 'none', height: 40, padding: '0 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, background: on ? c.ink : c.soft, color: on ? '#fff' : c.ink }}
              aria-pressed={on} onClick={() => setCatAndConfirm(t, c.name, kindOfCat(c.name) === 'income', false)}><Icon n={c.icon} fill size={18} />{c.name}</button>; })}
            <button class="press" style={{ flex: 'none', height: 40, padding: '0 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, background: 'var(--surface-2)' }} onClick={() => openCategoryEditor(null, (n) => setCatAndConfirm(t, n, kindOfCat(n) === 'income', false))}><Icon n="add" size={18} />หมวดใหม่</button>
          </div>
          <div class="row" style={{ gap: 8 }}>
            <button class="btn soft grow" style={{ height: 44, color: 'var(--error)' }} onClick={() => { const before = txns.value; txns.value = txns.value.filter((x) => x.id !== t.id); showUndo(`ลบ ${t.merchant}`, () => (txns.value = before)); }}><Icon n="close" size={20} />ไม่ใช่</button>
            <button class="btn dark grow" style={{ height: 44 }} onClick={() => setCatAndConfirm(t, t.cat, t.inc, false)}><Icon n="check" size={20} />ถูกแล้ว · {t.cat}</button>
          </div>
        </div>;
      })}
      <button class="btn soft" onClick={closeSheet}>ไว้ทีหลัง (อยู่ในรอยืนยัน)</button>
    </div>;
  } });
}

export function pickCategory(t0: Txn) {
  openSheet({ title: 'แก้รายการ', body: () => {
    const t = txns.value.find((x) => x.id === t0.id) ?? t0;
    return (
    <div class="col" style={{ gap: 14 }}>
      <div class="row" style={{ gap: 8, marginTop: -6 }}>
        <span class="col grow"><span class="t16">{t.merchant}</span><span class="cap muted">{payLine(t)}{t.fx ? ` · ${t.fx.amt} ${t.fx.cur} ยอดบาทจริงดูจากใบแจ้งหนี้ แก้ได้` : ''}</span></span>
        <input class="field num" inputMode="decimal" defaultValue={String(t.amount)} style={{ width: 110, height: 44, textAlign: 'right' }} aria-label="จำนวนเงินบาท"
          onChange={(e) => { const v = parseFloat((e.target as HTMLInputElement).value.replace(/,/g, '')); if (v > 0) txns.value = txns.value.map((x) => (x.id === t.id ? { ...x, amount: v, fx: undefined } : x)); }} />
      </div>
      {kindOfCat(t.cat) !== 'transfer' && <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>ใช้เงินจากกระเป๋า</span><PocketHint t={t} /><PocketChips value={t.pocket} none onPick={(id) => setPocket(t.id, id)} /></div>}
      {(['expense', 'income', 'invest', 'transfer'] as const).map((k) => { const list = live(categories.value).filter((c) => (c.kind ?? (c.income ? 'income' : 'expense')) === k); if (!list.length) return null; return (
        <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{KIND_LABEL[k]}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {list.map((c) => { const cur = t.cat === c.name; return (
              <button class="press" style={{ minHeight: 68, borderRadius: 16, background: cur ? c.ink : c.soft, color: cur ? '#fff' : c.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, padding: '6px 4px', textAlign: 'center' }}
                onClick={() => setCatAndConfirm(t, c.name, k === 'income')}><Icon n={c.icon} fill />{c.name}</button>); })}
          </div></div>); })}
      <button class="btn soft" onClick={() => openCategoryEditor(null, (n) => { const kk = kindOfCat(n); txns.value = txns.value.map((x) => (x.id === t.id ? withCat(x, n, kk === 'income') : x)); })}><Icon n="add" size={20} />หมวดใหม่</button>
      {t.status === 'pending' && <button class="btn dark" onClick={() => setCatAndConfirm(t, t.cat, t.inc)}><Icon n="check" size={20} />ยืนยัน · {t.cat}</button>}
      {t.status === 'confirmed' && <button class="btn soft" style={{ color: 'var(--error)' }} onClick={() => { const before = txns.value; txns.value = txns.value.filter((x) => x.id !== t.id); closeSheet(); showUndo(`ลบ ${t.merchant}`, () => (txns.value = before)); }}><Icon n="delete" size={20} />ลบรายการนี้</button>}
    </div>); } });
}

/** Everything that is set up once a month or less lives behind one button. */
function openPlan() {
  const sim = simulate(debtPlan.value.extra, debtPlan.value.mode, debtPlan.value), car = live(debts.value).find((d) => d.name === 'รถ');
  const go = (name: string) => () => { closeSheet(); push(name); };
  const rows: [string, string, string, () => void][] = [
    ['pie_chart', 'แผนแบ่งเงินเดือน', `เติมกระเป๋าทุกเดือน · เงินเดือนเข้า ${thDate(nextPayday())}`, go('payday')],
    ['event', 'บิลประจำ', `ค่าคงที่ ${fmt(fixedTotal())} ฿/เดือน`, go('bills')],
    ['credit_card', 'บัตรเครดิต', `${live(cards.value).length} ใบ · เพิ่ม/แก้วันตัดรอบ`, () => { closeSheet(); editCard(null); }],
    ['trending_down', 'หนี้', car && sim.off[car.id] ? `รถหมด ~${monthLabel(sim.off[car.id])}` : 'แผนปลดหนี้', go('debt')],
    ['label', 'หมวดรายจ่าย', 'แต่ละหมวดใช้เงินกระเป๋าไหน', go('cats')],
    ['add_card', 'เพิ่มกระเป๋า', 'ให้ตรงกับกระเป๋าใน MAKE', () => openPocketEditor(null)],
  ];
  openSheet({ title: 'วางแผนเงิน', body: () => (
    <div class="col" style={{ gap: 2 }}>
      {rows.map(([icon, l, s, f]) => (
        <button class="press row" style={{ gap: 12, minHeight: 64, padding: '6px 4px', textAlign: 'left', borderRadius: 14 }} onClick={f}>
          <span class="medal" style={{ width: 40, height: 40, background: 'var(--money-soft)', color: 'var(--money-ink)' }}><Icon n={icon} fill size={22} /></span>
          <span class="col grow"><span class="t16">{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{s}</span></span><Icon n="chevron_right" color="var(--ink-3)" />
        </button>))}
    </div>) });
}

function CardTile({ cd }: { cd: CreditCard }) {
  const today = new Date(), st = cardStatement(cd, today), r = reserveOf(cd), closed = st.due.days >= 0 && st.due.amount > 0;
  const have = r ? pocketBalance(r) : 0, coming = r ? pocketIncoming(r) : 0, need = (closed ? st.due.amount : 0) + st.amount, gap = need - have - coming;
  return (
    <button class="press" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 20, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }} onClick={() => (r ? push('pocket', { id: r.id }) : editCard(cd))}>
      <div class="row" style={{ gap: 8 }}><Icon n="credit_card" fill size={20} /><span class="grow t16">{cd.name}{cd.last4 ? ` ··${cd.last4}` : ''}</span><span style={{ fontSize: 12.5, color: '#C9C6BD' }}>ตัดรอบ{st.daysToCut === 0 ? 'วันนี้' : ` ${thDate(st.cut).split(' ').slice(1, 3).join(' ')}`}</span></div>
      {closed && <div class="row" style={{ alignItems: 'baseline', gap: 6 }}><span class="num" style={{ fontSize: 26, fontWeight: 600 }}>{fmt(st.due.amount)}</span><span style={{ fontSize: 13.5, color: st.due.days <= 3 ? '#FFB199' : '#C9C6BD' }}>฿ ต้องจ่าย{st.due.days === 0 ? 'วันนี้' : ` ภายใน ${thDate(st.due.date).split(' ').slice(1, 3).join(' ')}`}</span></div>}
      <div class="row" style={{ alignItems: 'baseline', gap: 6 }}><span class="num" style={{ fontSize: closed ? 17 : 26, fontWeight: 600 }}>{fmt(st.amount)}</span><span style={{ fontSize: 13, color: '#C9C6BD' }}>฿ ใช้ไปรอบนี้ (ยังไม่ตัด)</span></div>
      <span style={{ fontSize: 13, color: gap > 0.5 ? '#FFB199' : '#9EE2B4', fontWeight: 600 }}>
        {!r ? 'ยังไม่มีกระเป๋าสำรองบัตรนี้ · แตะเพื่อตั้ง' : gap > 0.5 ? `สำรองไว้ ${fmt(have)}${coming > 0 ? ` + รอย้าย ${fmt(coming)}` : ''} · ยังขาด ${fmt(gap)} ฿` : have + 0.5 >= need ? `สำรองไว้ ${fmt(have)} · พอจ่ายแล้ว` : `สำรองไว้ ${fmt(have)} + รอย้าย ${fmt(coming)} · ย้ายครบแล้วจะพอจ่าย`}
      </span>
    </button>
  );
}

export function MoneyTab() {
  tick.value;
  const today = new Date(), s = safeToSpend(today), inbox = pending();
  const [filter, setFilter] = useState('ทั้งหมด');
  const c = s.cycle, endD = new Date(c.end.getTime() - 864e5);
  const conf = txns.value.filter((t) => t.status === 'confirmed' && (filter === 'ทั้งหมด' || (filter === 'ไม่ระบุกระเป๋า' ? needsPocket(t) : t.cat === filter))).sort((a, b) => b.ts - a.ts).slice(0, 60);
  const groups: { k: string; items: Txn[] }[] = [];
  for (const t of conf) { const k = dayKey(new Date(t.ts)); const g = groups.find((x) => x.k === k); if (g) g.items.push(t); else groups.push({ k, items: [t] }); }
  const daysLeft = Math.round((nextPayday(today).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
  const planned = Math.round((s.budget * s.pacePct) / 100), diff = Math.round(s.spent - planned); // + = used more than planned so far
  const ps = livePockets(), unchecked = ps.filter((p) => p.balanceAt == null), noPocket = txns.value.some((t) => t.status === 'confirmed' && needsPocket(t) && t.ts > Date.now() - 35 * 864e5);
  const usedCats = new Set(txns.value.map((t) => t.cat));
  return (
    <div class="screen" style={{ gap: 16 }}>
      <div class="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span class="col"><span class="h1">เงิน</span><span class="muted" style={{ fontSize: 13 }}>รอบ {thDate(c.start).split(' ').slice(1).join(' ')} – {thDate(endD).split(' ').slice(1).join(' ')}</span></span>
        <button class="btn soft" style={{ height: 44, fontSize: 14.5 }} onClick={openPlan}><Icon n="tune" size={20} />วางแผน</button>
      </div>

      <div class="col" style={{ gap: 6, padding: '4px 0 2px' }}>
        <span class="muted" style={{ fontSize: 15, fontWeight: 600 }}>ใช้ได้วันนี้{s.mode === 'pocket' ? ` · ${s.pockets.map((p) => p.name).join(', ')}` : ''}</span>
        <span class="num" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: '-.02em', color: s.left < 0 ? 'var(--error)' : s.left < 150 ? '#B83A1C' : 'var(--ink)' }}>{s.left < 0 ? '−' : ''}{fmt(Math.abs(s.left))}<span style={{ fontSize: 28, fontWeight: 500 }}> ฿</span></span>
        <span style={{ fontSize: 15, lineHeight: 1.5 }}>เหลืออีก <b style={{ fontWeight: 600 }}>{daysLeft} วัน</b> ถึงเงินเดือน{s.mode === 'pocket' && 'avail' in s ? <> · ในกระเป๋าเหลือ <b class="num" style={{ fontWeight: 600 }}>{fmt(s.avail ?? 0)} ฿</b></> : <> · ใช้ไปแล้ว <b class="num" style={{ fontWeight: 600 }}>{s.usedPct}%</b> ของงบ</>}</span>
        {s.pendingOut > 0 && <span style={{ fontSize: 13.5, color: '#B83A1C', fontWeight: 600 }}>ยังไม่นับ {fmt(s.pendingOut)} ฿ ที่รอยืนยัน · ยืนยันแล้วเหลือประมาณ {fmt(s.left - s.pendingOut)} ฿</span>}
      </div>
      {s.budget > 0 && <div class="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative', height: 14, borderRadius: 999, background: 'var(--money-tint)' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, s.usedPct))}%`, borderRadius: 999, background: diff > s.budget * 0.05 ? 'var(--error)' : 'var(--money)', transition: 'width 500ms var(--ease-out)' }} />
          <span style={{ position: 'absolute', top: -5, bottom: -5, left: `${s.pacePct}%`, width: 3, borderRadius: 2, background: 'var(--ink)' }} />
        </div>
        <div class="row num" style={{ justifyContent: 'space-between', fontSize: 13 }}><span class="muted">ใช้ {fmt(s.spent)} / {fmt(s.budget)} ฿</span><span style={{ fontWeight: 600, color: diff <= 0 ? 'var(--workout-ink)' : 'var(--error)' }}>{diff <= 0 ? `ใช้น้อยกว่าแผน ${fmt(-diff)} ฿ · ดี` : `ใช้เกินแผน ${fmt(diff)} ฿`}</span></div>
        <span class="muted" style={{ fontSize: 12.5 }}>ขีดดำ = ยอดที่แผนให้ใช้ได้ถึงวันนี้ ({fmt(planned)} ฿ · วันที่ {c.dayNo} จาก {c.totalDays} ของรอบ)</span>
      </div>}

      {unchecked.length > 0 && (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFE3DA', borderRadius: 20, padding: '12px 12px 12px 14px', textAlign: 'left' }} onClick={() => openReconcile()}>
          <span class="medal" style={{ background: '#fff', color: '#B83A1C' }}><Icon n="fact_check" fill /></span>
          <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>ใส่ยอดจริงจาก MAKE</span><span style={{ fontSize: 13, color: '#B83A1C', fontWeight: 500 }}>{unchecked.map((p) => p.name).join(', ')} ยังไม่มียอดเริ่มต้น</span></span>
          <Icon n="chevron_right" color="#B83A1C" />
        </button>
      )}

      {inbox.length > 0 && (
        <div class="col" style={{ gap: 8 }}>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <span class="row" style={{ gap: 8, fontSize: 20, fontWeight: 600 }}>รอยืนยัน<span style={{ minWidth: 26, height: 26, padding: '0 8px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inbox.length}</span></span>
            <button class="btn dark" style={{ height: 40, fontSize: 14 }} onClick={() => { const ids = inbox.map((t) => t.id); confirmTxns(ids); showUndo(`ยืนยัน ${ids.length} รายการ`, () => (txns.value = txns.value.map((x) => (ids.includes(x.id) ? { ...x, status: 'pending' } : x)))); }}>ยืนยันทั้งหมด</button>
          </div>
          <span class="muted" style={{ fontSize: 12.5, marginTop: -4 }}>ปัดขวา = ยืนยัน · ปัดซ้าย = ไม่ใช่ · แตะ = แก้หมวด/กระเป๋า</span>
          {inbox.map((t) => <InboxRow key={t.id} t={t} onPick={() => pickCategory(t)} />)}
        </div>
      )}

      <OwesCard />

      {(isPayday(today) || daysLeft <= 3) && (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--money-soft)', borderRadius: 20, padding: '14px 12px 14px 14px', textAlign: 'left' }} onClick={() => push('payday')}>
          <span class="medal" style={{ background: '#fff', color: 'var(--money-ink)' }}><Icon n="payments" fill /></span>
          <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{isPayday(today) ? 'เงินเดือนเข้าวันนี้' : `เงินเดือนเข้า ${thDate(nextPayday(today))}`}</span><span style={{ fontSize: 13, color: 'var(--money-ink)', fontWeight: 500 }}>แบ่ง {fmt(profile.value.netSalary)} ฿ ลงกระเป๋า</span></span>
          <Icon n="chevron_right" color="var(--money-ink)" />
        </button>
      )}

      <div class="col" style={{ gap: 8 }}>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>กระเป๋า</span>
          <span class="row" style={{ gap: 6 }}>
            <button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => openMove()}><Icon n="swap_horiz" size={18} />ย้าย</button>
            <button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => openReconcile()}><Icon n="fact_check" size={18} />เช็คยอด</button>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ps.map((p) => <PocketTile p={p} onClick={() => push('pocket', { id: p.id })} />)}
          <button style={{ minHeight: 112, borderRadius: 20, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 14, fontWeight: 600 }} onClick={() => openPocketEditor(null)}><Icon n="add" size={24} />เพิ่มกระเป๋า</button>
        </div>
      </div>

      {live(cards.value).length > 0 && <div class="col" style={{ gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 600 }}>บัตรเครดิต</span>
        {live(cards.value).map((cd) => <CardTile cd={cd} />)}
      </div>}

      <div class="col" style={{ gap: 10 }}>
        <div class="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 20, fontWeight: 600 }}>รายการทั้งหมด</span><button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => openAddTxn()}><Icon n="add" size={18} />เพิ่ม</button></div>
        <div class="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          {['ทั้งหมด', ...(noPocket ? ['ไม่ระบุกระเป๋า'] : []), ...live(categories.value).filter((x) => usedCats.has(x.name)).map((x) => x.name)].map((l) => <button style={{ height: 40, flex: 'none', padding: '0 14px', borderRadius: 999, background: filter === l ? 'var(--ink)' : l === 'ไม่ระบุกระเป๋า' ? '#FFE3DA' : '#fff', color: filter === l ? '#fff' : l === 'ไม่ระบุกระเป๋า' ? '#B83A1C' : 'var(--ink)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }} onClick={() => setFilter(l)}>{l}</button>)}
        </div>
        {groups.length === 0 && <div class="card empty"><Icon n="receipt_long" size={40} color="var(--ink-3)" /><span class="t16">ยังไม่มีรายการ</span><span class="small muted">ถ่ายสลิปด้วย ⊕ วางข้อความแจ้งเตือนธนาคาร หรือกด “เพิ่ม” · บนแอป Android จะดึงจากแจ้งเตือนธนาคารและบัตรให้เอง</span></div>}
        {groups.map((g) => { const out = g.items.filter((t) => kindOfCat(t.cat) === 'expense').reduce((a, t) => a + t.amount, 0), d = new Date(g.items[0].ts); return (
          <div class="col" style={{ gap: 6 }}>
            <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600, padding: '0 4px' }}><span>{dayKey(d) === dayKey() ? `วันนี้ · ${thDate(d)}` : thDate(d)}</span><span class="num">{out ? `−${fmt(out)} ฿` : ''}</span></div>
            <div class="card" style={{ borderRadius: 18, padding: '2px 14px 2px 12px' }}>
              {g.items.map((t, i) => { const cc = catOf(t.cat); return (
                <button class="row" style={{ width: '100%', gap: 12, minHeight: 60, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none', textAlign: 'left' }} onClick={() => pickCategory(t)}>
                  <span class="medal" style={{ width: 36, height: 36, background: cc.soft, color: cc.ink }}><Icon n={cc.icon} fill size={20} /></span>
                  <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.merchant}</span><span class="muted" style={{ fontSize: 12.5 }}>{t.cat} · {payLine(t)}{needsPocket(t) ? <b style={{ color: '#B83A1C', fontWeight: 600 }}> · ไม่ระบุกระเป๋า</b> : ''}</span></span>
                  <span class="num" style={{ fontSize: 16, fontWeight: 600, color: kindOfCat(t.cat) === 'income' || t.inc ? 'var(--workout-ink)' : 'var(--ink)' }}>{sign(t)}{fmt(t.amount)}</span>
                </button>); })}
            </div>
          </div>); })}
      </div>
    </div>
  );
}
