import { useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { openSheet, closeSheet, showUndo, toast } from '../../store/ui';
import { live } from '../../store/collection';
import { addTxn, parseNotification, categories, txns, guessCat, confirmTxns, kindOfCat, type CatKind } from '../../domain/money';
import { openCategoryEditor, KIND_LABEL } from './catSheet';

/** Manual entry + "paste a bank notification" parser. Paste lands in the inbox to confirm. */
export function openAddTxn() { openSheet({ title: 'เพิ่มรายการ', body: () => <AddTxn /> }); }
function AddTxn() {
  const [mode, setMode] = useState<'manual' | 'paste'>('manual');
  const [amt, setAmt] = useState(''), [mer, setMer] = useState(''), [kind, setKind] = useState<CatKind>('expense'), [acc, setAcc] = useState('กสิกร');
  const inc = kind === 'income';
  const [cat, setCat] = useState<string | null>(null), [paste, setPaste] = useState('');
  const cats = live(categories.value).filter((c) => (c.kind ?? (c.income ? 'income' : 'expense')) === kind);
  const save = () => {
    const a = parseFloat(amt.replace(/,/g, '')); if (!a) return toast('ใส่จำนวนเงินก่อน');
    const t = addTxn({ ts: Date.now(), amount: a, inc, merchant: mer.trim() || (inc ? 'เงินเข้า' : 'รายจ่าย'), account: acc, source: 'manual', cat: cat ?? (kind === 'expense' ? guessCat(mer, false) : (cats[0]?.name ?? guessCat(mer, inc))) });
    confirmTxns([t.id]); closeSheet(); showUndo(`${kindOfCat(t.cat) === 'expense' ? '−' : kindOfCat(t.cat) === 'income' ? '+' : '↔'}${a.toLocaleString()} ฿ · ${t.cat}`, () => (txns.value = txns.value.filter((x) => x.id !== t.id)));
  };
  const parse = () => {
    const lines = paste.split(/\n{2,}|\n(?=(?:ขอบคุณที่ใช้บัตร|บัตร\s|K PLUS|KTC|SCB|ใช้จ่าย|เงินเข้า))/).map((x) => x.trim()).filter(Boolean);
    const ok = lines.map((l) => parseNotification(l)).filter(Boolean);
    if (!ok.length) return toast('อ่านไม่ออก ลองวางข้อความแจ้งเตือนเต็มๆ');
    const before = txns.value.length; ok.forEach((p) => addTxn(p!)); const n = txns.value.length - before; closeSheet(); toast(n === ok.length ? `เข้ากล่องรอยืนยัน ${n} รายการ` : `เข้ากล่องรอยืนยัน ${n} รายการ · ข้ามรายการซ้ำ ${ok.length - n}`);
  };
  return (
    <div class="col" style={{ gap: 12 }}>
      <div class="seg"><button class={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>กรอกเอง</button><button class={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>วางแจ้งเตือนธนาคาร</button></div>
      {mode === 'manual' ? <>
        <div class="seg">{(Object.keys(KIND_LABEL) as CatKind[]).map((k) => <button class={kind === k ? 'on' : ''} style={{ fontSize: 13.5, padding: 0 }} onClick={() => { setKind(k); setCat(null); }}>{KIND_LABEL[k]}</button>)}</div>
        <input class="field num" inputMode="decimal" value={amt} onInput={(e) => setAmt((e.target as HTMLInputElement).value)} placeholder="จำนวนเงิน ฿" style={{ fontSize: 24, fontWeight: 600, height: 60 }} />
        <input class="field" value={mer} onInput={(e) => setMer((e.target as HTMLInputElement).value)} placeholder={inc ? 'มาจาก เช่น ขายหูฟัง' : 'ร้าน เช่น ข้าวมันไก่'} />
        <div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{['กสิกร', 'KTC', 'เงินสด'].map((a) => <button class={`chip${acc === a ? ' on' : ''}`} style={{ height: 40 }} onClick={() => setAcc(a)}>{a}</button>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>{cats.map((c) => { const on = (cat ?? (kind === 'expense' ? guessCat(mer, false) : cats[0]?.name)) === c.name; return <button class="press" style={{ minHeight: 56, borderRadius: 14, background: on ? c.ink : c.soft, color: on ? '#fff' : c.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: 600 }} onClick={() => setCat(c.name)}><Icon n={c.icon} fill size={20} />{c.name}</button>; })}<button class="press" style={{ minHeight: 56, borderRadius: 14, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13, fontWeight: 600 }} onClick={() => openCategoryEditor(null, (n) => setCat(n), kind)}><Icon n="add" size={20} />หมวดใหม่</button></div>
        <button class="btn primary lg block" onClick={save}>บันทึก</button>
      </> : <>
        <span class="small muted">คัดลอกข้อความแจ้งเตือน/SMS จาก K PLUS, KTC หรือธนาคารอื่น วางได้หลายรายการพร้อมกัน แอปจะแยกจำนวนเงิน ร้าน และหมวดให้</span>
        <textarea class="field" rows={5} value={paste} onInput={(e) => setPaste((e.target as HTMLTextAreaElement).value)} placeholder={'เช่น KTC: ใช้จ่าย 359.00 บาท ที่ SHOPEE วันที่ 19/10'} />
        <button class="btn primary lg block" onClick={parse}><Icon n="auto_awesome" />อ่านและเข้ากล่องรอยืนยัน</button>
      </>}
    </div>
  );
}
