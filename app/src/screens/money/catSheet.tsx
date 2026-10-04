import { useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { add, live, update } from '../../store/collection';
import { categories, txns, catMemory, type Cat, type CatKind } from '../../domain/money';
import { Stepper } from '../sheets';

export const KIND_LABEL: Record<CatKind, string> = { expense: 'รายจ่าย', income: 'รายรับ', invest: 'ลงทุน', transfer: 'ย้ายบัญชี' };
export const KIND_HINT: Record<CatKind, string> = { expense: 'หักจากงบใช้ได้วันนี้', income: 'เงินเข้า เช่น ขายของ ดอกเบี้ย', invest: 'เงินออกไปลงทุน ไม่นับเป็นรายจ่าย', transfer: 'ย้ายระหว่างบัญชี จ่ายบัตร ไม่นับเป็นรายจ่าย' };
const ICONS = ['restaurant', 'local_cafe', 'directions_car', 'shopping_basket', 'shopping_bag', 'favorite', 'sports_esports', 'flight', 'home', 'school', 'pets', 'checkroom', 'build', 'savings', 'trending_up', 'swap_horiz', 'card_giftcard', 'phone_iphone', 'bolt', 'more_horiz'];
const PALETTE: [string, string, string][] = [['#FFF4E3', '#9A5800', '#FF9F1C'], ['#ECF2FF', '#1F5FD6', '#2F7BFF'], ['#E6F6FB', '#0B6E8A', '#22A6C9'], ['#FDE7E4', '#B42318', '#F0645A'], ['#F1EEFF', '#5B3BE0', '#7C5CFF'], ['#FFE3DA', '#B83A1C', '#FF5A36']];
const KIND_COLOR: Partial<Record<CatKind, [string, string, string]>> = { income: ['#E3F5E8', '#137A38', '#22B455'], invest: ['#E6F6FB', '#0B6E8A', '#22A6C9'], transfer: ['#EFEDE7', '#6B6962', '#A3A097'] };

export function openCategoryEditor(existing: Cat | null, onSaved?: (name: string) => void, presetKind: CatKind = 'expense') {
  openSheet({ title: existing ? 'แก้หมวด' : 'หมวดใหม่', tall: true, body: () => <Editor c={existing} onSaved={onSaved} presetKind={presetKind} /> });
}

function Editor({ c, onSaved, presetKind }: { c: Cat | null; onSaved?: (n: string) => void; presetKind: CatKind }) {
  const [name, setName] = useState(c?.name ?? ''), [kind, setKind] = useState<CatKind>(c?.kind ?? presetKind), [icon, setIcon] = useState(c?.icon ?? 'label'), [budget, setBudget] = useState(c?.budget ?? 0);
  const save = () => {
    const n = name.trim(); if (!n) return toast('ใส่ชื่อหมวดก่อน');
    if (live(categories.value).some((x) => x.name === n && x.id !== c?.id)) return toast('มีหมวดชื่อนี้แล้ว');
    const col = KIND_COLOR[kind] ?? PALETTE[live(categories.value).length % PALETTE.length];
    const data = { name: n, kind, income: kind === 'income', icon, budget: kind === 'expense' ? budget : 0, soft: col[0], ink: col[1], bar: col[2] };
    if (c) {
      update(categories, c.id, data);
      if (c.name !== n) { txns.value = txns.value.map((t) => (t.cat === c.name ? { ...t, cat: n } : t)); catMemory.value = Object.fromEntries(Object.entries(catMemory.value).map(([k, v]) => [k, v === c.name ? n : v])); }
    } else add<Cat>(categories, data);
    closeSheet(); toast('บันทึกหมวดแล้ว'); onSaved?.(n);
  };
  return (
    <div class="col" style={{ gap: 14 }}>
      <label><span class="label">ชื่อหมวด</span><input class="field" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="เช่น กาแฟ, หุ้นปันผล, ของขวัญ" /></label>
      <div><span class="label">ประเภท</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{(Object.keys(KIND_LABEL) as CatKind[]).map((k) => <button class="press" style={{ minHeight: 52, borderRadius: 14, background: kind === k ? 'var(--ink)' : 'var(--bg)', color: kind === k ? '#fff' : 'var(--ink)', fontSize: 15, fontWeight: 600 }} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}</div>
        <span class="cap muted" style={{ display: 'block', marginTop: 6 }}>{KIND_HINT[kind]}</span></div>
      <div><span class="label">ไอคอน</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>{ICONS.map((i) => <button class="press" aria-label={i} style={{ height: 48, borderRadius: 14, background: icon === i ? 'var(--ink)' : 'var(--bg)', color: icon === i ? '#fff' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIcon(i)}><Icon n={i} fill size={22} /></button>)}</div></div>
      {kind === 'expense' && <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">งบต่อรอบ</span><Stepper value={budget} onChange={setBudget} step={100} fmt={(v) => v.toLocaleString() + ' ฿'} w={90} /></div>}
      <button class="btn primary lg block" onClick={save}>บันทึก</button>
    </div>
  );
}
