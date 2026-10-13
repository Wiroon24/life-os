import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back } from '../../store/nav';
import { openSheet, closeSheet, toast, showUndo } from '../../store/ui';
import { live, add, update, remove } from '../../store/collection';
import { thDate } from '../../domain/time';
import {
  pockets, moves, txns, cards, livePockets, pocketById, pocketBalance, pocketAvailable, pocketIncoming, pocketSpent, cardOwes, addMove, setPocketBalance,
  kindOfCat, POCKET_KIND, type Pocket, type PocketKind, type Txn,
} from '../../domain/money';
import { Stepper } from '../sheets';
import { editCard } from './Bills';

const fmt = (n: number) => Math.round(n).toLocaleString();
export const pocketStyle = (p?: Pocket) => POCKET_KIND[p?.kind ?? 'spend'];
const num = (s: string) => parseFloat(s.replace(/,/g, ''));

/** Horizontal pocket picker. `none` adds a "ยังไม่ระบุ" choice. */
export function PocketChips({ value, onPick, exclude, none }: { value?: string; onPick: (id: string | undefined) => void; exclude?: string; none?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  // Bring the chosen pocket into view once, so a preselected choice is never hidden off-screen.
  useEffect(() => { const el = box.current?.querySelector<HTMLElement>('[aria-pressed="true"]'); if (el && box.current) box.current.scrollLeft = el.offsetLeft - 12; }, []);
  return (
    <div ref={box} class="row no-scrollbar" style={{ position: 'relative', gap: 6, overflowX: 'auto', margin: '0 -12px', padding: '0 12px' }}>
      {none && <button class="press" aria-pressed={!value} style={{ flex: 'none', height: 40, padding: '0 12px', borderRadius: 999, fontSize: 14, fontWeight: 600, background: !value ? 'var(--ink)' : 'var(--surface-2)', color: !value ? '#fff' : 'var(--ink)' }} onClick={() => onPick(undefined)}>ไม่ระบุ</button>}
      {livePockets().filter((p) => p.id !== exclude).map((p) => { const s = pocketStyle(p), on = value === p.id; return (
        <button class="press" aria-pressed={on} style={{ flex: 'none', height: 40, padding: '0 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, background: on ? s.ink : s.soft, color: on ? '#fff' : s.ink }} onClick={() => onPick(p.id)}>
          <Icon n={p.icon} fill size={18} />{p.name}</button>); })}
    </div>
  );
}

/** Pocket tile used on the money tab. */
export function PocketTile({ p, onClick }: { p: Pocket; onClick: () => void }) {
  const s = pocketStyle(p), av = pocketAvailable(p), inc = p.kind === 'card' ? pocketIncoming(p) : 0, sp = pocketSpent(p), fill = p.monthly + (p.partner ?? 0);
  return (
    <button class="card press" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', minHeight: 112 }} onClick={onClick}>
      <span class="row" style={{ gap: 8 }}><span class="medal" style={{ width: 32, height: 32, background: s.soft, color: s.ink }}><Icon n={p.icon} fill size={18} /></span>
        <span class="grow" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</span>{p.balanceAt == null && <Icon n="error" fill size={18} color="#B83A1C" />}</span>
      <span class="num" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1, color: av < 0 ? 'var(--error)' : 'var(--ink)' }}>{fmt(av)}<span style={{ fontSize: 13, fontWeight: 500 }}> ฿</span></span>
      {p.kind === 'card' ? <span class="muted" style={{ fontSize: 12 }}>{inc > 0 ? `รอย้ายเข้า ${fmt(inc)} ฿` : 'ครบตามที่ใช้บัตร'}</span>
        : fill > 0 ? <><span class="bar" style={{ height: 5, background: s.soft }}><span style={{ width: `${Math.min(100, (sp / fill) * 100)}%`, background: sp > fill ? 'var(--error)' : s.bar }} /></span><span class="muted num" style={{ fontSize: 12 }}>ใช้ {fmt(sp)} / {fmt(fill)}</span></>
        : <span class="muted" style={{ fontSize: 12 }}>{p.balanceAt == null ? 'ยังไม่ได้เช็คยอดจริง' : POCKET_KIND[p.kind].l}</span>}
    </button>
  );
}

/** Card owes: "move X from pocket A → card reserve B". One tap records the move once it is done in MAKE. */
export function OwesCard() {
  const owes = cardOwes(); if (!owes.length) return null;
  const total = owes.filter((o) => o.from && o.amount > 0).reduce((a, o) => a + o.amount, 0);
  return (
    <div class="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'inset 0 0 0 2px var(--money)' }}>
      <div class="row" style={{ gap: 8 }}><Icon n="swap_horiz" color="var(--money-ink)" /><span class="col grow"><span style={{ fontSize: 16, fontWeight: 600 }}>ต้องย้ายเงินใน MAKE</span><span class="muted" style={{ fontSize: 12.5 }}>ใช้บัตรไปแล้ว ย้ายเงินจากกระเป๋าไปพักไว้จ่ายบัตร</span></span>{total > 0 && <span class="num" style={{ fontSize: 17, fontWeight: 600 }}>{fmt(total)}</span>}</div>
      {owes.map((o) => (
        <div class="row" style={{ gap: 8, minHeight: 52, boxShadow: 'inset 0 1px 0 var(--surface-2)' }}>
          <span class="col grow" style={{ minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{o.from ? (o.amount > 0 ? `${o.from.name} → ${o.to.name}` : `${o.to.name} → ${o.from.name} (คืน)`) : `ยังไม่ได้เลือกกระเป๋า → ${o.to.name}`}</span>
            <span class="muted" style={{ fontSize: 12 }}>บัตร {o.card.name} · {o.count} รายการ</span>
          </span>
          <span class="num" style={{ fontSize: 16, fontWeight: 600 }}>{fmt(Math.abs(o.amount))}</span>
          {o.from && <button class="btn dark" style={{ height: 40, fontSize: 13.5, padding: '0 12px' }} onClick={() => {
            const m = o.amount > 0 ? addMove({ from: o.from!.id, to: o.to.id, amount: o.amount, kind: 'card' }) : addMove({ from: o.to.id, to: o.from!.id, amount: -o.amount, kind: 'card' });
            showUndo(`ย้าย ${fmt(Math.abs(o.amount))} ฿ แล้ว`, () => (moves.value = moves.value.filter((x) => x.id !== m.id)));
          }}>ย้ายแล้ว</button>}
        </div>
      ))}
      {owes.some((o) => !o.from) && <span class="muted" style={{ fontSize: 12.5 }}>รายการบัตรที่ยังไม่ระบุกระเป๋า แตะรายการในหน้าเงินแล้วเลือก “ใช้เงินจากกระเป๋า”</span>}
    </div>
  );
}

/* ---------- Pocket detail screen ---------- */
export function PocketScreen({ id }: { id: string }) {
  const p = pocketById(id);
  if (!p) return <div class="screen sub"><TopBar title="ไม่พบกระเป๋า" onBack={back} /></div>;
  const s = pocketStyle(p), bal = pocketBalance(p), av = pocketAvailable(p), inc = p.kind === 'card' ? pocketIncoming(p) : 0;
  const owesOut = bal - av, card = p.cardId ? live(cards.value).find((c) => c.id === p.cardId) : undefined;
  const list = txns.value.filter((t) => t.pocket === p.id && t.status === 'confirmed').sort((a, b) => b.ts - a.ts).slice(0, 40);
  const mv = moves.value.filter((m) => m.from === p.id || m.to === p.id).slice(0, 20);
  const name = (x: string) => (x === 'ext' ? 'เงินนอก' : pocketById(x)?.name ?? 'กระเป๋าที่ลบแล้ว');
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title={p.name} sub={`${POCKET_KIND[p.kind].l} · ${p.bank}`} onBack={back} right={<span class="row" style={{ gap: 6 }}>
        {card && <button class="btn" style={{ height: 40, fontSize: 14, background: 'var(--surface-2)' }} onClick={() => editCard(card)}>แก้บัตร</button>}
        <button class="btn" style={{ height: 40, fontSize: 14, background: 'var(--surface-2)' }} onClick={() => openPocketEditor(p)}>แก้</button></span>} />
      <div style={{ background: s.soft, borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: s.ink }}>{p.kind === 'card' ? 'มีอยู่จริงตอนนี้' : 'ใช้ได้จริง'}</span>
        <span class="num" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.05, color: av < 0 ? 'var(--error)' : 'var(--ink)' }}>{fmt(p.kind === 'card' ? bal : av)}<span style={{ fontSize: 20 }}> ฿</span></span>
        {p.kind !== 'card' && owesOut > 0.5 && <span style={{ fontSize: 13.5 }}>ใน MAKE ควรเห็น <b class="num">{fmt(bal)} ฿</b> · ในนั้น {fmt(owesOut)} ฿ ต้องย้ายไปสำรองบัตร</span>}
        {p.kind === 'card' && <span style={{ fontSize: 13.5 }}>{inc > 0 ? <>รอย้ายเข้าอีก <b class="num">{fmt(inc)} ฿</b> · ครบแล้วจะมี {fmt(bal + inc)} ฿</> : 'ย้ายครบตามยอดที่ใช้บัตรแล้ว'}{card ? ` · ผูกกับบัตร ${card.name}` : ' · ยังไม่ได้ผูกบัตร'}</span>}
        <span class="muted" style={{ fontSize: 12.5 }}>{p.balanceAt ? `เช็คยอดจริงล่าสุด ${thDate(new Date(p.balanceAt))}` : 'ยังไม่ได้เช็คยอดจริง กด “ตั้งยอดตาม MAKE”'}</span>
        <div class="row" style={{ gap: 8, marginTop: 4 }}>
          <button class="btn dark grow" style={{ height: 44 }} onClick={() => openReconcile(p.id)}><Icon n="fact_check" size={20} />ตั้งยอดตาม MAKE</button>
          <button class="btn soft grow" style={{ height: 44, background: '#fff' }} onClick={() => openMove(p.id)}><Icon n="swap_horiz" size={20} />ย้ายเงิน</button>
        </div>
      </div>
      {(p.monthly > 0 || p.partner) && <div class="card row" style={{ padding: '12px 14px', justifyContent: 'space-between' }}><span class="col"><span class="t16">เติมต่อเดือน</span><span class="muted" style={{ fontSize: 12.5 }}>{p.partner ? `ของเรา ${fmt(p.monthly)} + แฟน ${fmt(p.partner)}` : 'ตามแผนวันเงินเดือนเข้า'}</span></span><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{fmt(p.monthly + (p.partner ?? 0))} ฿</span></div>}
      <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>รายการที่ใช้เงินกระเป๋านี้</span>
      <div class="card" style={{ padding: '2px 14px' }}>
        {!list.length && <span class="muted" style={{ display: 'block', padding: '14px 0', fontSize: 14 }}>ยังไม่มีรายการ</span>}
        {list.map((t, i) => <TxnLine t={t} i={i} />)}
      </div>
      {mv.length > 0 && <>
        <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>การย้ายเงิน</span>
        <div class="card" style={{ padding: '2px 8px 2px 14px' }}>
          {mv.map((m, i) => (
            <div class="row" style={{ gap: 10, minHeight: 52, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span class="col grow"><span style={{ fontSize: 14.5, fontWeight: 600 }}>{m.to === p.id ? `จาก ${name(m.from)}` : `ไป ${name(m.to)}`}</span><span class="muted" style={{ fontSize: 12 }}>{thDate(new Date(m.ts))}{m.note ? ` · ${m.note}` : m.kind === 'card' ? ' · สำรองบัตร' : m.kind === 'fill' ? ' · เติมรอบเงินเดือน' : ''}</span></span>
              <span class="num" style={{ fontSize: 15.5, fontWeight: 600, color: m.to === p.id ? 'var(--workout-ink)' : 'var(--ink)' }}>{m.to === p.id ? '+' : '−'}{fmt(m.amount)}</span>
              <button class="btn icon" style={{ width: 36, color: 'var(--ink-3)' }} aria-label="ลบการย้าย" onClick={() => { const before = moves.value; moves.value = moves.value.filter((x) => x.id !== m.id); showUndo('ลบการย้ายแล้ว', () => (moves.value = before)); }}><Icon n="close" size={20} /></button>
            </div>))}
        </div>
      </>}
    </div>
  );
}

function TxnLine({ t, i }: { t: Txn; i: number }) {
  const k = kindOfCat(t.cat), plus = t.inc || k === 'income';
  return (
    <div class="row" style={{ gap: 10, minHeight: 54, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
      <span class="col grow"><span style={{ fontSize: 14.5, fontWeight: 600 }}>{t.merchant}</span><span class="muted" style={{ fontSize: 12 }}>{thDate(new Date(t.ts))} · {t.cat} · {t.account}</span></span>
      <span class="num" style={{ fontSize: 15.5, fontWeight: 600, color: plus ? 'var(--workout-ink)' : 'var(--ink)' }}>{plus ? '+' : '−'}{fmt(t.amount)}</span>
    </div>
  );
}

/* ---------- Editor ---------- */
export function openPocketEditor(p: Pocket | null) { openSheet({ title: p ? `แก้ ${p.name}` : 'เพิ่มกระเป๋า', tall: true, body: () => <PocketEdit p={p} /> }); }
const ICONS = ['restaurant', 'shopping_basket', 'group', 'credit_card', 'inventory_2', 'savings', 'account_balance', 'directions_car', 'home', 'favorite', 'pets', 'flight', 'school', 'sports_esports', 'card_giftcard', 'bolt'];
function PocketEdit({ p }: { p: Pocket | null }) {
  const [f, setF] = useState({ name: p?.name ?? '', bank: p?.bank ?? 'กสิกร', note: p?.note ?? '', bal: p ? '' : '' });
  const [kind, setKind] = useState<PocketKind>(p?.kind ?? 'spend'), [icon, setIcon] = useState(p?.icon ?? POCKET_KIND.spend.icon);
  const [monthly, setMonthly] = useState(p?.monthly ?? 0), [partner, setPartner] = useState(p?.partner ?? 0), [daily, setDaily] = useState(p?.daily ?? false), [cardId, setCardId] = useState(p?.cardId);
  const save = () => {
    const n = f.name.trim(); if (!n) return toast('ใส่ชื่อกระเป๋าก่อน');
    if (livePockets().some((x) => x.name === n && x.id !== p?.id)) return toast('มีกระเป๋าชื่อนี้แล้ว');
    const data = { name: n, bank: f.bank.trim() || 'กสิกร', note: f.note.trim() || undefined, kind, icon, monthly, partner: kind === 'shared' && partner ? partner : undefined, daily: kind === 'spend' && daily, cardId: kind === 'card' ? cardId : undefined };
    if (p) update(pockets, p.id, data);
    else { const b = num(f.bal); add<Pocket>(pockets, { ...data, balance: b || 0, balanceAt: Number.isFinite(b) ? Date.now() : undefined }); }
    closeSheet(); toast('บันทึกกระเป๋าแล้ว');
  };
  return (
    <div class="col" style={{ gap: 12 }}>
      <div class="row" style={{ gap: 8 }}>
        <label class="grow"><span class="label">ชื่อ (ให้ตรงกับใน MAKE)</span><input class="field" value={f.name} onInput={(e) => setF({ ...f, name: (e.target as HTMLInputElement).value })} placeholder="เช่น ค่ากินส่วนตัว" /></label>
        <label style={{ width: 120 }}><span class="label">ธนาคาร</span><input class="field" value={f.bank} onInput={(e) => setF({ ...f, bank: (e.target as HTMLInputElement).value })} /></label>
      </div>
      <div><span class="label">ใช้ทำอะไร</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{(Object.keys(POCKET_KIND) as PocketKind[]).map((k) => (
          <button class="press" style={{ minHeight: 48, borderRadius: 14, background: kind === k ? 'var(--ink)' : 'var(--bg)', color: kind === k ? '#fff' : 'var(--ink)', fontSize: 14.5, fontWeight: 600 }} onClick={() => { setKind(k); if (!p) setIcon(POCKET_KIND[k].icon); }}>{POCKET_KIND[k].l}</button>))}</div>
        <span class="cap muted" style={{ display: 'block', marginTop: 6 }}>{POCKET_KIND[kind].hint}</span></div>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">{kind === 'shared' ? 'เราเติมต่อเดือน' : 'เติมต่อเดือน'}</span><Stepper value={monthly} onChange={setMonthly} step={500} fmt={(v) => fmt(v) + ' ฿'} w={90} /></div>
      {kind === 'shared' && <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">แฟนเติมต่อเดือน</span><Stepper value={partner} onChange={setPartner} step={500} fmt={(v) => fmt(v) + ' ฿'} w={90} /></div>}
      {kind === 'spend' && <label class="row" style={{ gap: 10 }}><input type="checkbox" checked={daily} onChange={(e) => setDaily((e.target as HTMLInputElement).checked)} style={{ width: 22, height: 22 }} /><span class="col"><span class="t16">ใช้คิด “ใช้ได้วันนี้”</span><span class="cap muted">หารเงินที่เหลือในกระเป๋านี้ด้วยวันที่เหลือถึงเงินเดือน</span></span></label>}
      {kind === 'card' && <div><span class="label">พักเงินไว้จ่ายบัตร</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{live(cards.value).map((c) => <button class={`chip${cardId === c.id ? ' on' : ''}`} onClick={() => setCardId(c.id)}>{c.name}{c.last4 ? ` ··${c.last4}` : ''}</button>)}</div></div>}
      {!p && <label><span class="label">ยอดจริงตอนนี้ใน MAKE (ไม่บังคับ)</span><input class="field num" inputMode="decimal" value={f.bal} onInput={(e) => setF({ ...f, bal: (e.target as HTMLInputElement).value })} placeholder="เช่น 3,250" /></label>}
      <div><span class="label">ไอคอน</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>{ICONS.map((i) => <button class="press" aria-label={i} style={{ height: 40, borderRadius: 12, background: icon === i ? 'var(--ink)' : 'var(--bg)', color: icon === i ? '#fff' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIcon(i)}><Icon n={i} fill size={20} /></button>)}</div></div>
      <label><span class="label">โน้ต (ไม่บังคับ)</span><input class="field" value={f.note} onInput={(e) => setF({ ...f, note: (e.target as HTMLInputElement).value })} /></label>
      <div class="row" style={{ gap: 8 }}>
        {p && <button class="btn soft lg" style={{ color: 'var(--error)' }} aria-label="ลบกระเป๋า" onClick={() => { closeSheet(); remove(pockets, p.id, `ลบกระเป๋า ${p.name}`); back(); }}><Icon n="delete" size={22} /></button>}
        <button class="btn primary lg grow" onClick={save}>บันทึก</button>
      </div>
    </div>
  );
}

/* ---------- Move between pockets ---------- */
export function openMove(from?: string, to?: string, amount?: number) { openSheet({ title: 'ย้ายเงินระหว่างกระเป๋า', body: () => <MoveBody from={from} to={to} amount={amount} /> }); }
function MoveBody(props: { from?: string; to?: string; amount?: number }) {
  const [from, setFrom] = useState(props.from), [to, setTo] = useState(props.to), [amt, setAmt] = useState(props.amount ? String(Math.round(props.amount)) : ''), [note, setNote] = useState('');
  return (
    <div class="col" style={{ gap: 12 }}>
      <span class="small muted" style={{ marginTop: -6 }}>MAKE ไม่แจ้งเตือนการย้ายภายใน ย้ายในแอป MAKE แล้วบันทึกที่นี่ด้วย ยอดจะได้ตรงกัน</span>
      <span class="label">จาก</span><PocketChips value={from} onPick={setFrom} exclude={to} />
      <span class="label">ไป</span><PocketChips value={to} onPick={setTo} exclude={from} />
      <input class="field num" inputMode="decimal" value={amt} onInput={(e) => setAmt((e.target as HTMLInputElement).value)} placeholder="จำนวนเงิน ฿" style={{ fontSize: 22, fontWeight: 600, height: 56 }} />
      <input class="field" value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} placeholder="โน้ต (ไม่บังคับ)" />
      <button class="btn primary lg block" onClick={() => {
        const a = num(amt); if (!from || !to) return toast('เลือกกระเป๋าต้นทางและปลายทาง'); if (!(a > 0)) return toast('ใส่จำนวนเงิน');
        const m = addMove({ from, to, amount: a, kind: 'manual', note: note.trim() || undefined }); closeSheet();
        showUndo(`ย้าย ${fmt(a)} ฿ · ${pocketById(from)?.name} → ${pocketById(to)?.name}`, () => (moves.value = moves.value.filter((x) => x.id !== m.id)));
      }}>บันทึกการย้าย</button>
    </div>
  );
}

/* ---------- Reconcile with MAKE ---------- */
/** Type each pocket's real balance from MAKE; shows the difference before saving. `only` = one pocket. */
export function openReconcile(only?: string) { openSheet({ title: only ? 'ตั้งยอดตาม MAKE' : 'เช็คยอดกับ MAKE', tall: !only, body: () => <Reconcile only={only} /> }); }
function Reconcile({ only }: { only?: string }) {
  const list = livePockets().filter((p) => !only || p.id === only);
  const [vals, setVals] = useState<Record<string, string>>({});
  const save = () => {
    const done = list.filter((p) => vals[p.id] != null && vals[p.id].trim() !== '' && Number.isFinite(num(vals[p.id])));
    if (!done.length) return toast('ใส่ยอดอย่างน้อยหนึ่งกระเป๋า');
    const before = pockets.value; done.forEach((p) => setPocketBalance(p.id, num(vals[p.id]))); closeSheet();
    showUndo(`ตั้งยอด ${done.length} กระเป๋าแล้ว`, () => (pockets.value = before));
  };
  return (
    <div class="col" style={{ gap: 10 }}>
      <span class="small muted" style={{ marginTop: -6 }}>เปิดแอป MAKE แล้วพิมพ์ยอดจริงของแต่ละกระเป๋า ช่องที่เว้นว่างจะไม่เปลี่ยน</span>
      {list.map((p) => { const exp = pocketBalance(p), v = vals[p.id], d = v != null && v.trim() !== '' ? num(v) - exp : null; return (
        <div class="card" style={{ padding: 12, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div class="row" style={{ gap: 10 }}>
            <span class="col grow"><span class="t16">{p.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{p.balanceAt == null ? 'ยังไม่เคยเช็ค' : `แอปคิดว่ามี ${fmt(exp)} ฿`}</span></span>
            <input class="field num" inputMode="decimal" value={v ?? ''} onInput={(e) => setVals({ ...vals, [p.id]: (e.target as HTMLInputElement).value })} placeholder={p.balanceAt == null ? 'ยอดจริง' : fmt(exp)} style={{ width: 130, height: 48, textAlign: 'right' }} aria-label={`ยอดจริง ${p.name}`} />
          </div>
          {d != null && Number.isFinite(d) && p.balanceAt != null && <span style={{ fontSize: 12.5, fontWeight: 600, color: Math.abs(d) < 1 ? 'var(--workout-ink)' : 'var(--error)' }}>{Math.abs(d) < 1 ? 'ตรงกัน' : `${d > 0 ? 'มากกว่า' : 'น้อยกว่า'}ที่แอปคิด ${fmt(Math.abs(d))} ฿ · อาจมีรายการที่ไม่ได้บันทึกหรือย้ายเงินแล้วไม่ได้กดบันทึก`}</span>}
        </div>); })}
      <button class="btn primary lg block" onClick={save}>บันทึกยอดจริง</button>
    </div>
  );
}
