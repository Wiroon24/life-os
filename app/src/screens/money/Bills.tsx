import { useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { live, update, remove, add, move } from '../../store/collection';
import { bills, cards, upcomingBills, debts, pocketById, mainPocket, reserveOf, pockets, type Bill, type CreditCard } from '../../domain/money';
import { thDate } from '../../domain/time';
import { Stepper } from '../sheets';
import { PocketChips } from './Pockets';

const fmt = (n: number) => Math.round(n).toLocaleString();
const monthsTo = (ym?: string) => { if (!ym) return null; const [y, m] = ym.split('-').map(Number), n = new Date(); return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth()); };

/** Recurring bills (and card due dates, read-only here). Cards themselves live on the money tab. */
export function Bills() {
  const [edit, setEdit] = useState(false);
  const today = new Date(), up = upcomingBills(today, 40);
  const home = live(debts.value).find((d) => d.fixedUntil), hm = monthsTo(home?.fixedUntil);
  const from = (b: { id: string; card?: boolean }) => { const bill = live(bills.value).find((x) => x.id === b.id); return b.card ? 'กระเป๋าสำรองบัตร' : (pocketById(bill?.pocket) ?? mainPocket())?.name ?? ''; };
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="บิลประจำ" onBack={back} right={<button class="btn" style={{ height: 40, fontSize: 14, background: edit ? 'var(--ink)' : 'var(--surface-2)', color: edit ? '#fff' : 'var(--ink)' }} onClick={() => setEdit(!edit)}>{edit ? 'เสร็จ' : 'แก้'}</button>} />
      {!edit && hm != null && hm > 0 && <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--food-soft)', borderRadius: 20, padding: '14px 10px 14px 14px', textAlign: 'left' }} onClick={() => push('debt')}>
        <span class="medal" style={{ background: '#fff', color: 'var(--food-ink)' }}><Icon n="home" fill /></span>
        <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>ดอกเบี้ยบ้านคงที่หมดใน {hm} เดือน</span><span style={{ fontSize: 13, color: 'var(--food-ink)', fontWeight: 500 }}>แอปจะเตือนล่วงหน้า 6 เดือนให้เทียบรีไฟแนนซ์</span></span><Icon n="chevron_right" color="var(--food-ink)" />
      </button>}
      <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600, padding: '0 4px' }}><span>{edit ? 'ลากเรียง / แก้' : 'เรียงตามวันครบกำหนด'}</span><span class="num" style={{ color: 'var(--ink)' }}>{fmt(live(bills.value).reduce((a, b) => a + b.amount, 0))} ฿/เดือน</span></div>
      <div class="card" style={{ padding: '4px 8px 4px 12px' }}>
        {(edit ? live(bills.value).map((b) => ({ id: b.id, name: b.name, amount: b.amount, date: new Date(today.getFullYear(), today.getMonth(), b.dueDay), days: -1, approx: b.approx, card: false })) : up).map((b, i, arr) => {
          const bill = live(bills.value).find((x) => x.id === b.id);
          return (
            <div class="row" style={{ gap: 10, minHeight: 64, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span class="col" style={{ width: 44, alignItems: 'center', flex: 'none' }}><span class="num" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{b.date.getDate()}</span><span class="muted" style={{ fontSize: 11.5 }}>{thDate(b.date).split(' ')[2]}</span></span>
              <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{b.name}</span>{!edit ? <span style={{ fontSize: 12.5, color: b.days <= 3 ? '#B83A1C' : 'var(--ink-2)', fontWeight: b.days <= 3 ? 600 : 400 }}>{b.days === 0 ? 'วันนี้' : `อีก ${b.days} วัน`} · จาก {from(b)}</span> : <span class="muted" style={{ fontSize: 12.5 }}>จาก {from(b)}{bill && !bill.fixed ? ' · ไม่หักจากแผนเงินเดือน' : ''}</span>}</span>
              {!edit ? <span class="num" style={{ fontSize: 16, fontWeight: 600, paddingRight: 6 }}>{b.approx ? '~' : ''}{fmt(b.amount)}</span> : bill && <>
                <button class="btn" style={{ height: 40, padding: '0 10px', background: 'var(--bg)', fontSize: 14 }} onClick={() => editBill(bill)}>{fmt(bill.amount)}</button>
                <button class="btn icon" style={{ width: 36, color: 'var(--error)' }} onClick={() => remove(bills, bill.id, `ลบ ${bill.name}`)} aria-label="ลบ"><Icon n="delete" size={22} /></button>
                <span class="col"><button style={{ height: 22 }} disabled={i === 0} onClick={() => move(bills, bill.id, i - 1)} aria-label="ขึ้น"><Icon n="expand_less" size={20} color="var(--ink-3)" /></button><button style={{ height: 22 }} disabled={i === arr.length - 1} onClick={() => move(bills, bill.id, i + 1)} aria-label="ลง"><Icon n="expand_more" size={20} color="var(--ink-3)" /></button></span>
              </>}
            </div>
          );
        })}
      </div>
      {edit && <button style={{ minHeight: 52, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600 }} onClick={() => editBill(null)}><Icon n="add" size={22} />เพิ่มบิล</button>}
      {!edit && <span class="cap muted" style={{ padding: '0 4px' }}>กด “แก้” เพื่อเปลี่ยนยอด วันครบกำหนด หรือกระเป๋าที่ใช้จ่าย · ยอดบัตรมาจากรายการที่ใช้บัตรจริง</span>}
    </div>
  );
}

function editBill(b: Bill | null) { openSheet({ title: b ? `แก้ ${b.name}` : 'เพิ่มบิล', body: () => <BillEdit b={b} /> }); }
function BillEdit({ b }: { b: Bill | null }) {
  const [name, setName] = useState(b?.name ?? ''), [amt, setAmt] = useState(String(b?.amount ?? '')), [day, setDay] = useState(b?.dueDay ?? 1), [fixed, setFixed] = useState(b?.fixed ?? true), [pocket, setPocket] = useState(b?.pocket);
  return (
    <div class="col" style={{ gap: 12 }}>
      <input class="field" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="ชื่อบิล เช่น ค่าเน็ต" />
      <input class="field num" inputMode="decimal" value={amt} onInput={(e) => setAmt((e.target as HTMLInputElement).value)} placeholder="จำนวนเงิน ฿" />
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ครบกำหนดวันที่</span><Stepper value={day} onChange={(v) => setDay(Math.min(31, Math.max(1, v)))} min={1} w={52} /></div>
      <span class="label">จ่ายจากกระเป๋า</span>
      <PocketChips value={pocket ?? mainPocket()?.id} onPick={setPocket} />
      <label class="row" style={{ gap: 10 }}><input type="checkbox" checked={fixed} onChange={(e) => setFixed((e.target as HTMLInputElement).checked)} style={{ width: 22, height: 22 }} /><span class="col"><span class="t16">หักจากเงินเดือนเป็นค่าคงที่</span><span class="cap muted">ปิดไว้ถ้าบิลนี้จ่ายทีหลังจากกระเป๋าอื่น</span></span></label>
      <button class="btn primary lg block" onClick={() => { if (!name.trim()) return toast('ใส่ชื่อก่อน'); const data = { name: name.trim(), amount: +amt.replace(/,/g, '') || 0, dueDay: day, fixed, kind: b?.kind ?? 'fixed' as const, pocket: pocket && pocket !== mainPocket()?.id ? pocket : undefined }; if (b) update(bills, b.id, data); else add(bills, data); closeSheet(); toast('บันทึกแล้ว'); }}>บันทึก</button>
    </div>
  );
}

export function editCard(cd: CreditCard | null) { openSheet({ title: cd ? `แก้บัตร ${cd.name}` : 'เพิ่มบัตรเครดิต', tall: true, body: () => <CardEdit cd={cd} /> }); }
function CardEdit({ cd }: { cd: CreditCard | null }) {
  const [f, setF] = useState({ name: cd?.name ?? '', last4: cd?.last4 ?? '', limit: String(cd?.limit ?? ''), apr: String(cd?.apr ?? ''), note: cd?.note ?? '' });
  const [cut, setCut] = useState(cd?.cutDay ?? 20), [due, setDue] = useState(cd?.dueDay ?? 5), [full, setFull] = useState(cd?.payInFull ?? true);
  const set = (k: keyof typeof f) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const save = () => {
    if (!f.name.trim()) return toast('ใส่ชื่อบัตรก่อน');
    const data = { name: f.name.trim(), last4: f.last4.replace(/\D/g, '').slice(-4) || undefined, limit: +f.limit.replace(/,/g, '') || undefined, apr: +f.apr || undefined, cutDay: cut, dueDay: due, payInFull: full, note: f.note.trim() || undefined };
    if (cd) update(cards, cd.id, data);
    else {
      // Every card gets its own reserve pocket so card spend always has somewhere to go.
      const c = add<CreditCard>(cards, data);
      add(pockets, { name: `สำรอง ${c.name}`, kind: 'card', bank: 'กสิกร', monthly: 0, icon: 'credit_card', balance: 0, cardId: c.id });
    }
    closeSheet(); toast(cd ? 'บันทึกบัตรแล้ว' : `เพิ่มบัตรและกระเป๋า “สำรอง ${data.name}” แล้ว`);
  };
  const r = cd && reserveOf(cd);
  return (
    <div class="col" style={{ gap: 12 }}>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">ชื่อบัตร / ธนาคาร</span><input class="field" value={f.name} onInput={set('name')} placeholder="เช่น KTC, กสิกร" /></label><label style={{ width: 110 }}><span class="label">เลข 4 ตัวท้าย</span><input class="field num" inputMode="numeric" maxLength={4} value={f.last4} onInput={set('last4')} placeholder="7292" /></label></div>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">วงเงิน (฿)</span><input class="field num" inputMode="numeric" value={f.limit} onInput={set('limit')} /></label><label style={{ width: 120 }}><span class="label">ดอกเบี้ย %/ปี</span><input class="field num" inputMode="decimal" value={f.apr} onInput={set('apr')} placeholder="16" /></label></div>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ตัดรอบวันที่</span><Stepper value={cut} onChange={(v) => setCut(Math.min(31, Math.max(1, v)))} min={1} w={52} /></div>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ครบกำหนดจ่ายวันที่</span><Stepper value={due} onChange={(v) => setDue(Math.min(31, Math.max(1, v)))} min={1} w={52} /></div>
      <label class="row" style={{ gap: 10 }}><input type="checkbox" checked={full} onChange={(e) => setFull((e.target as HTMLInputElement).checked)} style={{ width: 22, height: 22 }} /><span class="t16">จ่ายเต็มทุกเดือน</span></label>
      <label><span class="label">โน้ต (ไม่บังคับ)</span><input class="field" value={f.note} onInput={set('note')} placeholder="เช่น ใช้ซื้อของออนไลน์, โปรผ่อน 0%" /></label>
      <span class="cap muted">แอปจับคู่รายการกับบัตรจากเลข 4 ตัวท้ายในแจ้งเตือน ถ้าไม่ใส่ จะจับคู่จากชื่อบัตร{cd ? ` · กระเป๋าสำรอง: ${r ? r.name : 'ยังไม่มี (ตั้งได้ในหน้ากระเป๋า)'}` : ' · เพิ่มบัตรแล้วจะสร้างกระเป๋าสำรองบัตรให้ด้วย'}</span>
      <div class="row" style={{ gap: 8 }}>{cd && <button class="btn soft lg" style={{ color: 'var(--error)' }} onClick={() => { remove(cards, cd.id, `ลบบัตร ${cd.name}`); closeSheet(); }} aria-label="ลบ"><Icon n="delete" size={22} /></button>}<button class="btn primary lg grow" onClick={save}>บันทึก</button></div>
    </div>
  );
}
