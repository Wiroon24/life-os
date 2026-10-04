import { useRef, useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { toast, openSheet, closeSheet } from '../../store/ui';
import { live, update, remove } from '../../store/collection';
import { fileToImg, hasAI, explain } from '../../domain/ai';
import { cards } from '../../domain/money';
import { Stepper } from '../sheets';
import { pantry, addStock, KINDS, UNITS, daysLeftOf, macroOf, analyzeReceipt, commitReceipt, suggestBatch, guessKind, type PantryItem, type PantryKind, type Receipt } from '../../domain/pantry';

const fmt = (n: number) => Math.round(n).toLocaleString();
const step = (u: string) => (u === 'g' ? 100 : u === 'kg' ? 0.5 : 1);

function expiry(it: PantryItem) {
  const d = daysLeftOf(it); if (d == null) return null;
  return d < 0 ? { t: `เลยมา ${-d} วัน`, bg: '#FDE7E4', fg: '#B42318' } : d <= 1 ? { t: d === 0 ? 'หมดวันนี้' : 'พรุ่งนี้', bg: '#FDE7E4', fg: '#B42318' } : d <= 3 ? { t: `${d} วัน`, bg: '#FFF4E3', fg: '#9A5800' } : { t: `${d} วัน`, bg: 'var(--surface-2)', fg: 'var(--ink-2)' };
}

export function Pantry() {
  const items = live(pantry.value), cam = useRef<HTMLInputElement>(null), gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const scan = async (f?: File | null) => {
    if (!f) return;
    if (!hasAI()) { toast('ต้องเชื่อม AI ก่อนจึงอ่านใบเสร็จได้ (โปรไฟล์ > AI)'); return; }
    setBusy(true);
    try { const img = await fileToImg(f); const r = await analyzeReceipt(img); if (!r.lines.length) toast('ไม่เจอรายการในรูป ลองถ่ายให้ชัดขึ้น'); else push('receipt', { data: r }); }
    catch (e) { toast(explain(e)); } finally { setBusy(false); }
  };
  const groups = KINDS.map((k) => [k, items.filter((i) => i.kind === k)] as const).filter(([, l]) => l.length);
  const batch = suggestBatch(), soon = items.filter((i) => (daysLeftOf(i) ?? 99) <= 2);
  const worth = items.reduce((a, i) => a + (i.price ?? 0), 0);
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="ของในครัว" onBack={back} right={<span class="num muted" style={{ fontSize: 13, fontWeight: 600 }}>{items.length} อย่าง{worth ? ` · ~${fmt(worth)} ฿` : ''}</span>} />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => scan((e.target as HTMLInputElement).files?.[0])} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => scan((e.target as HTMLInputElement).files?.[0])} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button class="btn primary" style={{ height: 56 }} disabled={busy} onClick={() => cam.current?.click()}><Icon n="photo_camera" size={22} />{busy ? 'กำลังอ่าน…' : 'ถ่ายใบเสร็จ/ของที่ซื้อ'}</button>
        <button class="btn soft" style={{ height: 56 }} disabled={busy} onClick={() => gal.current?.click()}><Icon n="image" size={22} />เลือกจากแกลลอรี่</button>
      </div>
      {soon.length > 0 && <div style={{ background: '#FFF4E3', borderRadius: 18, padding: '12px 14px', display: 'flex', gap: 10 }}><Icon n="schedule" fill size={22} color="#9A5800" /><span style={{ fontSize: 14.5, lineHeight: 1.5 }}>ใกล้เสีย: <b>{soon.map((s) => s.name).join(', ')}</b> ใช้ก่อน</span></div>}
      {batch && <button class="card press" style={{ padding: 14, display: 'flex', gap: 12, textAlign: 'left', alignItems: 'center' }} onClick={() => push('batch', { auto: true })}>
        <span class="medal" style={{ width: 40, height: 40, background: 'var(--food-soft)', color: 'var(--food-ink)' }}><Icon n="skillet" fill size={22} /></span>
        <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>จัด meal prep จากของที่มี</span><span class="muted" style={{ fontSize: 12.5 }}>{batch.rows.map((r) => `${r.name} ${fmt(r.g)} g`).join(' + ')} → ~{batch.boxes} กล่อง{batch.short ? ' (โปรตีนไม่ถึงเป้าต่อกล่อง)' : ''}</span></span><Icon n="chevron_right" color="var(--ink-3)" />
      </button>}
      {groups.map(([k, list]) => <div class="col" style={{ gap: 6 }}><span class="label" style={{ margin: 0 }}>{k}</span>
        <div class="card" style={{ padding: '4px 10px' }}>{list.map((it, i) => { const ex = expiry(it), mac = macroOf(it); return (
          <div class="row" style={{ gap: 8, minHeight: 64, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
            <button class="col grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => editItem(it)}>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{it.name}</span>
              <span class="muted" style={{ fontSize: 12.5 }}>{mac ? `P ${fmt(mac.p)} g · ${fmt(mac.k)} kcal` : it.unit === 'g' || it.unit === 'kg' ? '' : 'นับเป็น' + it.unit}{it.price ? ` · ${fmt(it.price)} ฿` : ''}</span>
            </button>
            {ex && <span style={{ background: ex.bg, color: ex.fg, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{ex.t}</span>}
            <Stepper value={it.qty} onChange={(v) => { if (v <= 0) { remove(pantry, it.id, `ใช้ ${it.name} หมดแล้ว`); } else update(pantry, it.id, { qty: +v.toFixed(2) }); }} step={step(it.unit)} fmt={(v) => `${+v.toFixed(2)} ${it.unit}`} w={84} />
          </div>); })}</div></div>)}
      {items.length === 0 && <div class="card" style={{ padding: 20, textAlign: 'center' }}><span class="muted" style={{ lineHeight: 1.6 }}>ยังไม่มีของ ถ่ายใบเสร็จตอนซื้อของ หรือกดเพิ่มเอง แล้วโค้ชจะแนะนำมื้ออาหารจากของที่มี</span></div>}
      <button style={{ minHeight: 52, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15.5, fontWeight: 600 }} onClick={() => editItem()}><Icon n="add" size={22} />เพิ่มของเอง</button>
      <span class="cap muted" style={{ padding: '0 4px', lineHeight: 1.5 }}>ลดจำนวนด้วยตัวเลขเมื่อใช้ไป หรือทำ meal prep แล้วระบบหักให้ ถ้าลดจนเหลือ 0 ของจะออกจากรายการ (เลิกทำได้)</span>
    </div>
  );
}

function editItem(it?: PantryItem) { openSheet({ title: it ? `แก้ ${it.name}` : 'เพิ่มของ', body: () => <ItemEdit it={it} /> }); }
function ItemEdit({ it }: { it?: PantryItem }) {
  const [name, setName] = useState(it?.name ?? ''), [qty, setQty] = useState(it?.qty ?? 1), [unit, setUnit] = useState(it?.unit ?? 'ชิ้น'), [price, setPrice] = useState(it?.price != null ? String(it.price) : '');
  const [kind, setKind] = useState<PantryKind>(it?.kind ?? 'อื่นๆ'), [shelf, setShelf] = useState(it?.shelf != null ? String(it.shelf) : '');
  const save = () => {
    if (!name.trim()) { toast('ใส่ชื่อก่อน'); return; }
    const data = { name: name.trim(), qty, unit, kind, price: price ? +price.replace(/,/g, '') : undefined, shelf: shelf ? +shelf : undefined };
    if (it) update(pantry, it.id, { ...data, source: 'user' }); else addStock({ ...data, kind });
    closeSheet(); toast('บันทึกแล้ว');
  };
  return (
    <div class="col" style={{ gap: 12 }}>
      <label><span class="label">ชื่อ</span><input class="field" value={name} onInput={(e) => { const v = (e.target as HTMLInputElement).value; setName(v); if (!it) setKind(guessKind(v)); }} placeholder="เช่น อกไก่ ไข่ ข้าวกล้อง" /></label>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">จำนวน</span><Stepper value={qty} onChange={(v) => setQty(Math.max(0, v))} step={step(unit)} fmt={(v) => String(+v.toFixed(2))} w={70} /></div>
      <div><span class="label">หน่วย</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{UNITS.map((u) => <button class={`chip${unit === u ? ' on' : ''}`} onClick={() => setUnit(u)}>{u}</button>)}</div></div>
      <div><span class="label">ประเภท</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{KINDS.map((k) => <button class={`chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div></div>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">ราคาที่จ่าย (฿)</span><input class="field num" inputMode="decimal" value={price} onInput={(e) => setPrice((e.target as HTMLInputElement).value)} /></label><label class="grow"><span class="label">เก็บได้ (วัน)</span><input class="field num" inputMode="numeric" value={shelf} placeholder="ไม่ระบุ" onInput={(e) => setShelf((e.target as HTMLInputElement).value)} /></label></div>
      <button class="btn primary lg block" onClick={save}>บันทึก</button>
      {it && <button class="btn soft block" style={{ color: 'var(--error)' }} onClick={() => { closeSheet(); remove(pantry, it.id, `ลบ ${it.name} แล้ว`); }}><Icon n="delete" size={20} />ลบ</button>}
    </div>
  );
}

/** Review what the AI read before anything is saved. Every line is editable. */
export function ReceiptReview({ data }: { data: Receipt }) {
  const [r, setR] = useState<Receipt>(data);
  const [exp, setExp] = useState(true), [stock, setStock] = useState(true), [ticks, setTicks] = useState(true), [acc, setAcc] = useState('เงินสด');
  const setLine = (i: number, patch: Partial<Receipt['lines'][number]>) => setR({ ...r, lines: r.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const sum = r.lines.reduce((a, l) => a + (l.price ?? 0), 0);
  const accounts = ['เงินสด', 'กสิกร', ...live(cards.value).map((c) => c.name)];
  const done = () => { const msg = commitReceipt(r, { expense: exp, stock, ticks, account: acc }); const n = pantry.value.length; void n; toast(msg); back(); };
  return (
    <div class="screen sub" style={{ gap: 12, paddingBottom: 120 }}>
      <TopBar title="ตรวจรายการจากใบเสร็จ" onBack={back} />
      <div class="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">ร้าน</span><input class="field" value={r.store} onInput={(e) => setR({ ...r, store: (e.target as HTMLInputElement).value })} /></label><label style={{ width: 140 }}><span class="label">ยอดรวม ฿</span><input class="field num" inputMode="decimal" value={r.total ?? ''} onInput={(e) => setR({ ...r, total: +(e.target as HTMLInputElement).value || null })} /></label></div>
        <label><span class="label">วันที่</span><input class="field" type="date" value={r.date ?? ''} onInput={(e) => setR({ ...r, date: (e.target as HTMLInputElement).value || null })} /></label>
        {r.total != null && sum > 0 && Math.abs(sum - r.total) > Math.max(5, r.total * 0.05) && <span class="cap" style={{ color: '#9A5800' }}>ผลรวมรายการ {fmt(sum)} ไม่ตรงยอดรวม {fmt(r.total)} อาจอ่านตกหรือมีส่วนลด ตรวจอีกครั้ง</span>}
      </div>
      <span class="label" style={{ margin: 0 }}>รายการ ({r.lines.length}) · แตะวงกลมเพื่อไม่เอารายการนั้นเข้าครัว</span>
      <div class="card" style={{ padding: '4px 10px' }}>
        {r.lines.map((l, i) => (
          <div class="col" style={{ gap: 6, padding: '10px 2px', boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
            <div class="row" style={{ gap: 8 }}>
              <button aria-label="เก็บเข้าครัว" onClick={() => setLine(i, { food: !l.food })} style={{ width: 26, height: 26, flex: 'none', borderRadius: 999, background: l.food ? 'var(--check)' : 'transparent', boxShadow: l.food ? 'none' : 'inset 0 0 0 2px #CFCBC1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.food && <Icon n="check" size={18} />}</button>
              <input class="field" style={{ flex: 1, minWidth: 0, height: 44 }} value={l.name} onInput={(e) => setLine(i, { name: (e.target as HTMLInputElement).value })} />
              <button class="btn icon" style={{ width: 36 }} onClick={() => setR({ ...r, lines: r.lines.filter((_, k) => k !== i) })} aria-label="ลบ"><Icon n="close" size={18} color="var(--ink-2)" /></button>
            </div>
            <div class="row" style={{ gap: 8, paddingLeft: 34 }}>
              <input class="field num" style={{ width: 72, height: 40 }} inputMode="decimal" value={l.qty} onInput={(e) => setLine(i, { qty: +(e.target as HTMLInputElement).value || 0 })} />
              <select class="field" style={{ width: 84, height: 40 }} value={l.unit} onChange={(e) => setLine(i, { unit: (e.target as HTMLSelectElement).value })}>{[...new Set([l.unit, ...UNITS])].map((u) => <option>{u}</option>)}</select>
              <input class="field num" style={{ flex: 1, minWidth: 0, height: 40 }} inputMode="decimal" placeholder="ราคา ฿" value={l.price ?? ''} onInput={(e) => setLine(i, { price: +(e.target as HTMLInputElement).value || null })} />
            </div>
          </div>))}
        <button class="row" style={{ minHeight: 48, gap: 6, fontWeight: 600, color: 'var(--ink-2)' }} onClick={() => setR({ ...r, lines: [...r.lines, { name: '', qty: 1, unit: 'ชิ้น', price: null, food: true, shelf_days: null }] })}><Icon n="add" size={20} />เพิ่มบรรทัด</button>
      </div>
      <div class="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {([['บันทึกเป็นรายจ่ายหมวดอาหาร', exp, setExp], ['เก็บของเข้าครัว', stock, setStock], ['ติ๊กในรายการซื้อของ', ticks, setTicks]] as const).map(([l, v, f]) => (
          <button class="row" style={{ gap: 10, minHeight: 44, textAlign: 'left' }} onClick={() => f(!v)}><span style={{ width: 26, height: 26, flex: 'none', borderRadius: 8, background: v ? 'var(--check)' : 'transparent', boxShadow: v ? 'none' : 'inset 0 0 0 2px #CFCBC1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v && <Icon n="check" size={18} />}</span><span class="t16">{l}</span></button>))}
        {exp && <div><span class="label">จ่ายจาก</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{accounts.map((a) => <button class={`chip${acc === a ? ' on' : ''}`} onClick={() => setAcc(a)}>{a}</button>)}</div></div>}
      </div>
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)', zIndex: 6 }}><button class="btn primary lg block" onClick={done}>บันทึกทั้งหมด</button></div>
    </div>
  );
}
