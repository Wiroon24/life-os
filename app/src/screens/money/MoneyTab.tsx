import { useRef, useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { push } from '../../store/nav';
import { openSheet, closeSheet, showUndo, tick } from '../../store/ui';
import { live } from '../../store/collection';
import { thDate, dayKey } from '../../domain/time';
import { safeToSpend, pending, confirmTxns, txns, categories, cardStatement, cards, debts, simulate, debtPlan, monthLabel, isPayday, nextPayday, kindOfCat, type Txn } from '../../domain/money';
import { openCategoryEditor, KIND_LABEL } from './catSheet';
import { profile } from '../../domain/profile';
import { openAddTxn } from './sheets';

const fmt = (n: number) => Math.round(n).toLocaleString();
const sign = (t: Txn) => { const k = kindOfCat(t.cat); return k === 'transfer' ? '↔ ' : k === 'invest' ? '→ ' : k === 'income' || t.inc ? '+' : '−'; };
export const catOf = (name: string) => live(categories.value).find((c) => c.name === name) ?? { name, icon: 'more_horiz', soft: '#EFEDE7', ink: '#6B6962', bar: '#A3A097', budget: 0, income: false };

function InboxRow({ t, onPick }: { t: Txn; onPick: () => void }) {
  const [dx, setDx] = useState(0), st = useRef<{ x: number; y: number; mode: null | 'h' | 'v' } | null>(null);
  const c = catOf(t.cat);
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
        <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.merchant}</span><span class="muted" style={{ fontSize: 12.5 }}>{t.account} · <b style={{ fontWeight: 600, color: c.ink }}>{t.cat}</b>{t.fx ? ` · ${t.fx.amt} ${t.fx.cur} (ประมาณ)` : ''}</span></span>
        <span class="num" style={{ fontSize: 17, fontWeight: 600, color: kindOfCat(t.cat) === 'income' || t.inc ? 'var(--workout-ink)' : 'var(--ink)' }}>{t.fx ? '≈' : ''}{sign(t)}{fmt(t.amount)}</span>
      </div>
    </div>
  );
}

export function pickCategory(t: Txn) {
  openSheet({ title: 'เปลี่ยนหมวด', body: () => (
    <div class="col" style={{ gap: 14 }}>
      <div class="row" style={{ gap: 8, marginTop: -6 }}>
        <span class="col grow"><span class="t16">{t.merchant}</span>{t.fx && <span class="cap muted">{t.fx.amt} {t.fx.cur} · ยอดบาทจริงดูจากใบแจ้งหนี้ แก้ได้</span>}</span>
        <input class="field num" inputMode="decimal" defaultValue={String(t.amount)} style={{ width: 110, height: 44, textAlign: 'right' }} aria-label="จำนวนเงินบาท"
          onChange={(e) => { const v = parseFloat((e.target as HTMLInputElement).value.replace(/,/g, '')); if (v > 0) txns.value = txns.value.map((x) => (x.id === t.id ? { ...x, amount: v, fx: undefined } : x)); }} />
      </div>
      {(['expense', 'income', 'invest', 'transfer'] as const).map((k) => { const list = live(categories.value).filter((c) => (c.kind ?? (c.income ? 'income' : 'expense')) === k); if (!list.length) return null; return (
        <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{KIND_LABEL[k]}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {list.map((c) => { const cur = t.cat === c.name; return (
              <button class="press" style={{ minHeight: 68, borderRadius: 16, background: cur ? c.ink : c.soft, color: cur ? '#fff' : c.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, padding: '6px 4px', textAlign: 'center' }}
                onClick={() => { txns.value = txns.value.map((x) => (x.id === t.id ? { ...x, cat: c.name, inc: k === 'income' } : x)); closeSheet(); }}><Icon n={c.icon} fill />{c.name}</button>); })}
          </div></div>); })}
      <button class="btn soft" onClick={() => openCategoryEditor(null, (n) => { const kk = kindOfCat(n); txns.value = txns.value.map((x) => (x.id === t.id ? { ...x, cat: n, inc: kk === 'income' } : x)); })}><Icon n="add" size={20} />หมวดใหม่</button>
      {t.status === 'confirmed' && <button class="btn soft" style={{ color: 'var(--error)' }} onClick={() => { const before = txns.value; txns.value = txns.value.filter((x) => x.id !== t.id); closeSheet(); showUndo(`ลบ ${t.merchant}`, () => (txns.value = before)); }}><Icon n="delete" size={20} />ลบรายการนี้</button>}
    </div>) });
}

export function MoneyTab() {
  tick.value;
  const today = new Date(), s = safeToSpend(today), inbox = pending();
  const [filter, setFilter] = useState('ทั้งหมด');
  const c = s.cycle, endD = new Date(c.end.getTime() - 864e5);
  const conf = txns.value.filter((t) => t.status === 'confirmed' && (filter === 'ทั้งหมด' || t.cat === filter)).sort((a, b) => b.ts - a.ts).slice(0, 60);
  const groups: { k: string; items: Txn[] }[] = [];
  for (const t of conf) { const k = dayKey(new Date(t.ts)); const g = groups.find((x) => x.k === k); if (g) g.items.push(t); else groups.push({ k, items: [t] }); }
  const sim = simulate(debtPlan.value.extra, debtPlan.value.mode, debtPlan.value), car = live(debts.value).find((d) => d.name === 'รถ');
  const nextCut = live(cards.value).map((cd) => ({ cd, st: cardStatement(cd, today) })).sort((a, b) => a.st.daysToCut - b.st.daysToCut)[0], daysLeft = Math.round((nextPayday(today).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5);
  const planned = Math.round((s.budget * s.pacePct) / 100), diff = Math.round(s.spent - planned); // + = used more than planned so far
  return (
    <div class="screen" style={{ gap: 16 }}>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="h1">เงิน</span><span class="muted" style={{ fontSize: 13.5 }}>รอบ {thDate(c.start).split(' ').slice(1).join(' ')} – {thDate(endD).split(' ').slice(1).join(' ')}</span></div>

      <div class="col" style={{ gap: 6, padding: '4px 0 2px' }}>
        <span class="muted" style={{ fontSize: 15, fontWeight: 600 }}>ใช้ได้วันนี้</span>
        <span class="num" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: '-.02em', color: s.left < 0 ? 'var(--error)' : s.left < 150 ? '#B83A1C' : 'var(--ink)' }}>{s.left < 0 ? '−' : ''}{fmt(Math.abs(s.left))}<span style={{ fontSize: 28, fontWeight: 500 }}> ฿</span></span>
        <span style={{ fontSize: 15, lineHeight: 1.5 }}>เหลืออีก <b style={{ fontWeight: 600 }}>{daysLeft} วัน</b> ถึงเงินเดือน · ใช้ไปแล้ว <b class="num" style={{ fontWeight: 600 }}>{s.usedPct}%</b> ของงบ</span>
      </div>
      <div class="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative', height: 14, borderRadius: 999, background: 'var(--money-tint)' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, s.usedPct))}%`, borderRadius: 999, background: diff > s.budget * 0.05 ? 'var(--error)' : 'var(--money)', transition: 'width 500ms var(--ease-out)' }} />
          <span style={{ position: 'absolute', top: -5, bottom: -5, left: `${s.pacePct}%`, width: 3, borderRadius: 2, background: 'var(--ink)' }} />
        </div>
        <div class="row num" style={{ justifyContent: 'space-between', fontSize: 13 }}><span class="muted">ใช้ {fmt(s.spent)} / {fmt(s.budget)} ฿</span><span style={{ fontWeight: 600, color: diff <= 0 ? 'var(--workout-ink)' : 'var(--error)' }}>{diff <= 0 ? `ใช้น้อยกว่าแผน ${fmt(-diff)} ฿ · ดี` : `ใช้เกินแผน ${fmt(diff)} ฿`}</span></div>
        <span class="muted" style={{ fontSize: 12.5 }}>ขีดดำ = ยอดที่แผนให้ใช้ได้ถึงวันนี้ ({fmt(planned)} ฿ · วันที่ {c.dayNo} จาก {c.totalDays} ของรอบ)</span>
      </div>

      {inbox.length > 0 && (
        <div class="col" style={{ gap: 8 }}>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <span class="row" style={{ gap: 8, fontSize: 20, fontWeight: 600 }}>รอยืนยัน<span style={{ minWidth: 26, height: 26, padding: '0 8px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inbox.length}</span></span>
            <button class="btn dark" style={{ height: 40, fontSize: 14 }} onClick={() => { const ids = inbox.map((t) => t.id); confirmTxns(ids); showUndo(`ยืนยัน ${ids.length} รายการ`, () => (txns.value = txns.value.map((x) => (ids.includes(x.id) ? { ...x, status: 'pending' } : x)))); }}>ยืนยันทั้งหมด</button>
          </div>
          <span class="muted" style={{ fontSize: 12.5, marginTop: -4 }}>ปัดขวา = ยืนยัน · ปัดซ้าย = ไม่ใช่ · แตะ = เปลี่ยนหมวด</span>
          {inbox.map((t) => <InboxRow key={t.id} t={t} onPick={() => pickCategory(t)} />)}
        </div>
      )}

      {isPayday(today) || daysLeft <= 3 ? (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--money-soft)', borderRadius: 20, padding: '14px 12px 14px 14px', textAlign: 'left' }} onClick={() => push('payday')}>
          <span class="medal" style={{ background: '#fff', color: 'var(--money-ink)' }}><Icon n="payments" fill /></span>
          <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{isPayday(today) ? 'เงินเดือนเข้าวันนี้' : `เงินเดือนเข้า ${thDate(nextPayday(today))}`}</span><span style={{ fontSize: 13, color: 'var(--money-ink)', fontWeight: 500 }}>ดูแผนแบ่ง {fmt(profile.value.netSalary)} ฿</span></span>
          <Icon n="chevron_right" color="var(--money-ink)" />
        </button>
      ) : (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--money-soft)', borderRadius: 20, padding: '14px 12px 14px 14px', textAlign: 'left' }} onClick={() => push('payday')}>
          <span class="medal" style={{ background: '#fff', color: 'var(--money-ink)' }}><Icon n="pie_chart" fill /></span>
          <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>แผนแบ่งเงินเดือนรอบนี้</span><span style={{ fontSize: 13, color: 'var(--money-ink)', fontWeight: 500 }}>เงินเดือนเข้า {thDate(nextPayday(today))}</span></span>
          <Icon n="chevron_right" color="var(--money-ink)" />
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button class="card press" style={{ minHeight: 96, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, textAlign: 'left' }} onClick={() => push('debt')}><Icon n="trending_down" /><span class="col"><span style={{ fontSize: 15.5, fontWeight: 600 }}>หนี้</span><span class="muted" style={{ fontSize: 12.5 }}>{car && sim.off[car.id] ? `รถหมด ~${monthLabel(sim.off[car.id])}` : 'แผนปลดหนี้'}</span></span></button>
        <button class="card press" style={{ minHeight: 96, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, textAlign: 'left' }} onClick={() => push('bills')}><Icon n="event" /><span class="col"><span style={{ fontSize: 15.5, fontWeight: 600 }}>บิลและงบ</span><span class="muted" style={{ fontSize: 12.5 }}>{nextCut ? `${nextCut.cd.name} ตัดรอบ ${nextCut.st.daysToCut === 0 ? 'วันนี้' : `อีก ${nextCut.st.daysToCut} วัน`}` : 'เพิ่มบัตรเครดิต'}</span></span></button>
      </div>

      <div class="col" style={{ gap: 10 }}>
        <div class="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 20, fontWeight: 600 }}>รายการทั้งหมด</span><button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => openAddTxn()}><Icon n="add" size={18} />เพิ่ม</button></div>
        <div class="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          {['ทั้งหมด', ...live(categories.value).map((c) => c.name)].map((l) => <button style={{ height: 40, flex: 'none', padding: '0 14px', borderRadius: 999, background: filter === l ? 'var(--ink)' : '#fff', color: filter === l ? '#fff' : 'var(--ink)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }} onClick={() => setFilter(l)}>{l}</button>)}
        </div>
        {groups.length === 0 && <div class="card empty"><Icon n="receipt_long" size={40} color="var(--ink-3)" /><span class="t16">ยังไม่มีรายการ</span><span class="small muted">ถ่ายสลิปด้วย ⊕ วางข้อความแจ้งเตือนธนาคาร หรือกด “เพิ่ม” · บนแอป Android จะดึงจากแจ้งเตือนกสิกรและ KTC ให้เอง</span></div>}
        {groups.map((g) => { const out = g.items.filter((t) => kindOfCat(t.cat) === 'expense').reduce((a, t) => a + t.amount, 0), d = new Date(g.items[0].ts); return (
          <div class="col" style={{ gap: 6 }}>
            <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600, padding: '0 4px' }}><span>{dayKey(d) === dayKey() ? `วันนี้ · ${thDate(d)}` : thDate(d)}</span><span class="num">{out ? `−${fmt(out)} ฿` : ''}</span></div>
            <div class="card" style={{ borderRadius: 18, padding: '2px 14px 2px 12px' }}>
              {g.items.map((t, i) => { const cc = catOf(t.cat); return (
                <button class="row" style={{ width: '100%', gap: 12, minHeight: 60, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none', textAlign: 'left' }} onClick={() => pickCategory(t)}>
                  <span class="medal" style={{ width: 36, height: 36, background: cc.soft, color: cc.ink }}><Icon n={cc.icon} fill size={20} /></span>
                  <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.merchant}</span><span class="muted" style={{ fontSize: 12.5 }}>{t.cat} · {t.account}</span></span>
                  <span class="num" style={{ fontSize: 16, fontWeight: 600, color: kindOfCat(t.cat) === 'income' || t.inc ? 'var(--workout-ink)' : 'var(--ink)' }}>{sign(t)}{fmt(t.amount)}</span>
                </button>); })}
            </div>
          </div>); })}
      </div>
    </div>
  );
}
