import { useState } from 'preact/hooks';
import { Icon, TopBar, Seg } from '../../ui/kit';
import { back } from '../../store/nav';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { live, update, add, remove } from '../../store/collection';
import { debts, simulate, debtPlan, monthLabel, isFixed, owedOf, lockedInterest, type Debt as D, type DebtMode } from '../../domain/money';
import { Stepper } from '../sheets';

const fmt = (n: number) => Math.round(n).toLocaleString();
const TYPES: [string, string, [string, string, string]][] = [
  ['รถ', 'directions_car', ['#ECF2FF', '#1F5FD6', '#2F7BFF']], ['บ้าน', 'home', ['#E3F5E8', '#137A38', '#22B455']], ['การศึกษา', 'school', ['#F1EEFF', '#5B3BE0', '#7C5CFF']],
  ['บัตร/สินเชื่อ', 'credit_card', ['#FDE7E4', '#B42318', '#F0645A']], ['ส่วนตัว', 'person', ['#FFF4E3', '#9A5800', '#FF9F1C']], ['อื่นๆ', 'account_balance', ['#EFEDE7', '#6B6962', '#A3A097']],
];
const typeOf = (d: D) => TYPES.find((t) => t[0] === d.type) ?? TYPES.find((t) => t[0] === d.name) ?? TYPES[5];
const monthsTo = (ym?: string) => { if (!ym) return null; const [y, m] = ym.split('-').map(Number), n = new Date(); return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth()); };
const rateTxt = (d: D) => (isFixed(d) ? 'ดอกคงที่ทั้งสัญญา' : `${d.rate}%/ปี${d.fixedUntil && d.rateAfter != null ? ` → ${d.rateAfter}% หลังคงที่` : ''}`);

export function Debt() {
  const dp = debtPlan.value;
  const [extra, setExtra] = useState(dp.extra), [plan, setPlan] = useState<DebtMode>(dp.mode), [target, setTarget] = useState<string | undefined>(dp.target), [lump, setLump] = useState(dp.lump ?? 0), [lumpTo, setLumpTo] = useState<string | undefined>(dp.lumpTo);
  const ds = live(debts.value).filter((d) => owedOf(d) > 0 || d.payment > 0);
  const o = { target, lump, lumpTo };
  const R = { none: simulate(0, 'none'), aval: simulate(extra, 'aval', o), snow: simulate(extra, 'snow', o), manual: simulate(extra, 'manual', o) };
  const cur = R[plan];
  const nextId = Object.keys(cur.off).sort((a, b) => cur.off[a] - cur.off[b])[0], nm = cur.off[nextId] ?? cur.end;
  const chosen = dp.mode === plan && dp.extra === extra && dp.target === target && (dp.lump ?? 0) === lump && dp.lumpTo === lumpTo;
  const nameOf = (id?: string) => ds.find((d) => d.id === id)?.name ?? '—';
  const orderLabel = (m: 'aval' | 'snow' | 'manual') => R[m].order?.map(nameOf).join(' → ');
  // Where would the extra money do the most good? Try each debt as the target.
  const base = simulate(0, 'none');
  const perTarget = ds.map((d) => { const r = simulate(extra, 'manual', { target: d.id, lump, lumpTo: lumpTo ?? d.id, isolate: true }); return { d, r, saved: base.int - r.int, early: (base.off[d.id] ?? base.end) - (r.off[d.id] ?? r.end) }; }).sort((a, b) => b.saved - a.saved || b.early - a.early);
  const advice = adviceFor(ds);
  const R0 = R.none;
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title="หนี้" onBack={back} />
      <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#C9C6BD' }}>ก้อนถัดไปที่จะหมด · {nameOf(nextId)}</span>
        <div class="row num" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05 }}>{Math.floor(nm / 12)}</span><span style={{ fontSize: 18 }}>ปี</span><span style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05 }}>{nm % 12}</span><span style={{ fontSize: 18 }}>เดือน</span></div>
        <span style={{ fontSize: 14, color: '#C9C6BD' }}>หมด {monthLabel(nm)} · ปลดหนี้ทั้งหมด {monthLabel(cur.end)}</span>
      </div>

      {ds.map((d) => { const [soft, ink, c] = typeOf(d)[2], fm = monthsTo(d.fixedUntil), owed = owedOf(d), paid = Math.max(0, 1 - owed / ((d.orig || owed) + lockedInterest(d))); return (
        <button class="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }} onClick={() => editDebt(d)}>
          <div class="row" style={{ alignItems: 'flex-start' }}>
            <span class="medal" style={{ width: 40, height: 40, background: soft, color: ink }}><Icon n={d.icon} fill size={22} /></span>
            <span class="col grow"><span class="t16">{d.name}</span><span class="muted" style={{ fontSize: 12.5 }}>งวดละ {fmt(d.payment)} · {rateTxt(d)}</span></span>
            <span class="col" style={{ alignItems: 'flex-end' }}><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{fmt(owed)}</span><span class="muted" style={{ fontSize: 12 }}>{isFixed(d) ? 'ต้องจ่ายอีก ฿' : 'คงเหลือ ฿'}</span></span>
          </div>
          <span class="bar" style={{ height: 10 }}><span style={{ width: `${paid * 100}%`, background: c }} /></span>
          <div class="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span class="num muted">จ่ายแล้ว {Math.round(paid * 100)}%</span><span style={{ fontWeight: 600 }}>คาดว่าหมด {monthLabel(cur.off[d.id] ?? cur.end)}</span></div>
          {isFixed(d) && <span style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 10px', fontSize: 13, lineHeight: 1.45 }}>ดอกคงที่ ล็อกไว้แล้วราว {fmt(lockedInterest(d))} ฿ โปะเพิ่มไม่ได้ลดดอก ได้แค่หมดเร็วและเงินงวดว่างเร็วขึ้น</span>}
          {fm != null && fm > 0 && <span style={{ background: 'var(--food-soft)', color: 'var(--food-ink)', borderRadius: 12, padding: '8px 10px', fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>ดอกคงที่หมดใน {fm} เดือน · เริ่มเทียบรีไฟแนนซ์ {monthLabel(Math.max(0, fm - 6))}</span>}
        </button>); })}
      <button style={{ minHeight: 52, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15.5, fontWeight: 600 }} onClick={() => editDebt()}><Icon n="add" size={22} />เพิ่มหนี้</button>
      <span class="cap muted" style={{ padding: '0 4px', marginTop: -6 }}>แตะการ์ดเพื่อแก้ชื่อ ประเภท แบบดอกเบี้ย ยอด ค่างวด หรือลบ</span>

      <div class="col" style={{ gap: 2, marginTop: 6 }}><span class="h2">มีเงินเหลือ จะโปะก้อนไหน</span><span class="small muted">กำหนดเงินโปะ แล้วดูว่าโปะก้อนไหนได้ผลอะไร (คิดเฉพาะเงินโปะนั้น)</span></div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 15, fontWeight: 600 }}>โปะเพิ่มต่อเดือน</span><span class="num" style={{ fontSize: 26, fontWeight: 600 }}>{fmt(extra)} ฿</span></div>
        <input type="range" min={0} max={10000} step={500} value={extra} onInput={(e) => setExtra(+(e.target as HTMLInputElement).value)} style={{ width: '100%', height: 32, accentColor: 'var(--food)', margin: 0 }} aria-label="โปะเพิ่มต่อเดือน" />
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'center', boxShadow: 'inset 0 1px 0 var(--surface-2)', paddingTop: 8 }}><span class="col"><span style={{ fontSize: 15, fontWeight: 600 }}>โปะก้อนเดียว (โบนัส/ขายของได้เยอะ)</span><span class="muted" style={{ fontSize: 12.5 }}>จ่ายครั้งเดียวเดือนนี้</span></span><Stepper value={lump} onChange={(v) => setLump(Math.max(0, v))} step={5000} fmt={(v) => (v ? fmt(v) : 'ไม่มี')} w={80} /></div>
        {lump > 0 && <div class="row no-scrollbar" style={{ gap: 6, overflowX: 'auto' }}><span class="muted small" style={{ flex: 'none' }}>โปะที่</span>{[undefined, ...ds.map((d) => d.id)].map((id) => <button class={`chip${lumpTo === id ? ' on' : ''}`} style={{ flex: 'none' }} onClick={() => setLumpTo(id)}>{id ? nameOf(id) : 'ให้แอปเลือก'}</button>)}</div>}
      </div>

      <span style={{ fontSize: 15, fontWeight: 700, padding: '0 4px' }}>ถ้าโปะที่ก้อนนี้ ผลเป็นอย่างไร</span>
      {perTarget.map(({ d, r, saved, early }, idx) => { const on = plan === 'manual' && target === d.id, fixed = isFixed(d); return (
        <button style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 20, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'var(--shadow-1)' }} onClick={() => { setPlan('manual'); setTarget(d.id); }}>
          <div class="row" style={{ gap: 10 }}><span class="col grow"><span class="t16">โปะ {d.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{rateTxt(d)}</span></span>
            {idx === 0 && saved > 1 && <span style={{ background: 'var(--success-tint)', color: 'var(--workout-ink)', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>ประหยัดดอกสุด</span>}
            {fixed && <span style={{ background: 'var(--surface-2)', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 999 }}>ไม่ลดดอก</span>}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[['หมดเมื่อ', monthLabel(r.off[d.id] ?? r.end)], ['เร็วขึ้น', early > 0 ? `${early} เดือน` : '—'], ['ประหยัดดอก', saved > 1 ? `${fmt(saved)} ฿` : '0 ฿']].map(([l, v]) => <span class="col" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 10px' }}><span class="muted" style={{ fontSize: 11.5 }}>{l}</span><span class="num" style={{ fontSize: 14.5, fontWeight: 600 }}>{v}</span></span>)}
          </div>
          {early > 0 && <span class="muted" style={{ fontSize: 12.5 }}>เงินงวด {fmt(d.payment)} ฿/เดือน ว่างตั้งแต่ {monthLabel(r.off[d.id] ?? r.end)}</span>}
        </button>); })}

      <span style={{ fontSize: 15, fontWeight: 700, padding: '0 4px', marginTop: 4 }}>หรือเลือกวิธีโปะ</span>
      {([['aval', 'ประหยัดดอกสุด', `${orderLabel('aval')} · ดอกลดต้นสูงสุดก่อน`], ['snow', 'ก้อนเล็กก่อน', `${orderLabel('snow')} · เห็นผลเร็ว มีกำลังใจ`], ['manual', 'เลือกก้อนเอง', target ? `เริ่มที่ ${nameOf(target)} (แตะการ์ดด้านบนเพื่อเปลี่ยน)` : 'แตะการ์ดด้านบนเพื่อเลือก'], ['none', 'ไม่โปะ', 'จ่ายตามงวดปกติ']] as const).map(([k, l, how]) => {
        const r = R[k], on = plan === k, save = R0.int - r.int;
        return (
          <button style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 20, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'var(--shadow-1)' }} onClick={() => setPlan(k)}>
            <div class="row" style={{ gap: 10, width: '100%' }}>
              <span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, boxShadow: on ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 2px #CFCBC1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 999, background: on ? 'var(--ink)' : 'transparent' }} /></span>
              <span class="col grow"><span class="t16">{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{how}</span></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, width: '100%' }}>
              {[['ปลดหนี้หมด', monthLabel(r.end)], ['ประหยัดดอก', k === 'none' ? '—' : `${fmt(Math.max(0, save))} ฿`], ['จ่ายรวม', `${fmt(r.paid)} ฿`]].map(([a, v]) => <span class="col" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 10px' }}><span class="muted" style={{ fontSize: 11.5 }}>{a}</span><span class="num" style={{ fontSize: 14.5, fontWeight: 600 }}>{v}</span></span>)}
            </div>
          </button>
        );
      })}
      <button class="btn primary lg" style={{ fontSize: 17 }} onClick={() => { debtPlan.value = { mode: plan, extra, target, lump, lumpTo }; toast('เลือกแผนนี้แล้ว'); }}>{chosen ? 'ใช้แผนนี้อยู่ ✓' : 'เลือกแผนนี้'}</button>

      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span class="h2">แนวทางที่แนะนำ</span>
        {advice.map((a) => <div class="row" style={{ alignItems: 'flex-start', gap: 8 }}><Icon n={a.icon} fill size={20} color="var(--ink-2)" /><span style={{ fontSize: 14.5, lineHeight: 1.55 }}>{a.text}</span></div>)}
      </div>
      <span class="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>ตัวเลขเป็นการจำลองจากยอด ดอกเบี้ย และงวดที่กรอก ไม่ใช่คำแนะนำทางการเงิน · ก่อนโปะจริง ให้ถามผู้ให้กู้ว่ามีค่าธรรมเนียมปิดก่อนกำหนดหรือส่วนลดดอกหรือไม่</span>
    </div>
  );
}

/** Rule-based guidance from the user's own debt terms. */
function adviceFor(ds: D[]) {
  const out: { icon: string; text: string }[] = [];
  const red = ds.filter((d) => !isFixed(d) && d.balance > 0);
  const hi = [...red].sort((a, b) => b.rate - a.rate)[0];
  const cards = red.filter((d) => d.type === 'บัตร/สินเชื่อ' && d.rate >= 12);
  if (cards.length) out.push({ icon: 'priority_high', text: `${cards.map((d) => d.name).join(', ')} ดอกสูง (${Math.max(...cards.map((d) => d.rate))}%) ควรปิดก่อนทุกก้อน และอย่าหมุนยอดต่อ` });
  else if (hi && hi.rate >= 4) out.push({ icon: 'trending_down', text: `${hi.name} ดอก ${hi.rate}% สูงสุดในกลุ่มลดต้นลดดอก ถ้าจะโปะ โปะที่นี่ประหยัดสุด` });
  for (const d of ds.filter(isFixed)) out.push({ icon: 'lock', text: `${d.name} ดอกคงที่ ล็อกไว้แล้ว ${fmt(lockedInterest(d))} ฿ โปะไปไม่ประหยัดดอก ถ้ามีเงินเหลือ ให้ไปโปะก้อนที่ดอกลดต้นลดดอกก่อน เว้นแต่ไฟแนนซ์ให้ส่วนลดดอกเมื่อปิดก่อน (ลองถาม) หรืออยากได้เงินงวด ${fmt(d.payment)} ฿ ว่างเร็ว` });
  for (const d of red.filter((x) => x.rate <= 2)) out.push({ icon: 'savings', text: `${d.name} ดอก ${d.rate}% ต่ำมาก ไม่ต้องรีบโปะ เก็บเงินสำรองหรือลงทุนมีประโยชน์กว่า` });
  for (const d of red.filter((x) => x.fixedUntil && x.rateAfter != null)) { const m = monthsTo(d.fixedUntil); if (m != null && m > 0) out.push({ icon: 'event', text: `${d.name} ดอกขึ้นเป็น ${d.rateAfter}% ในอีก ${m} เดือน ช่วง 6 เดือนก่อนหน้านั้นเทียบรีไฟแนนซ์ ส่วนเงินโปะก้อนใหญ่ค่อยทำตอนดอกขึ้นแล้วจะคุ้มกว่า` }); }
  out.push({ icon: 'shield', text: 'ก่อนโปะ ควรมีเงินสำรองฉุกเฉินอย่างน้อย 3 เดือนของค่าใช้จ่ายจำเป็น เพราะรายได้จากขายของไม่แน่นอน' });
  return out;
}

const blank: Omit<D, 'id' | 'order'> = { name: '', icon: 'account_balance', type: 'อื่นๆ', balance: 0, orig: 0, payment: 0, rate: 5, meta: '', inBills: false, rateType: 'reducing' };
function editDebt(d?: D) { openSheet({ title: d ? `แก้ ${d.name}` : 'เพิ่มหนี้', body: () => <DebtEdit d={d} /> }); }
function DebtEdit({ d }: { d?: D }) {
  const x = d ?? blank;
  const [name, setName] = useState(x.name), [type, setType] = useState(x.type ?? typeOf(x as D)[0]), [rt, setRt] = useState<'reducing' | 'fixed'>(x.rateType ?? 'reducing');
  const [bal, setBal] = useState(x.balance ? String(x.balance) : ''), [orig, setOrig] = useState(x.orig ? String(x.orig) : ''), [pay, setPay] = useState(x.payment), [rate, setRate] = useState(x.rate), [after, setAfter] = useState(x.rateAfter ?? x.rate), [until, setUntil] = useState(x.fixedUntil ?? ''), [left, setLeft] = useState(x.monthsLeft ?? 12);
  const num = (s: string) => +s.replace(/,/g, '') || 0;
  const save = () => {
    const t = TYPES.find((q) => q[0] === type)!;
    const data = { name: name.trim() || type, type, icon: t[1], rateType: rt, balance: num(bal), orig: num(orig) || num(bal), payment: pay, rate, rateAfter: rt === 'reducing' && until ? after : undefined, fixedUntil: rt === 'reducing' && until ? until : undefined, monthsLeft: rt === 'fixed' ? left : undefined, source: 'user' as const };
    if (d) update(debts, d.id, data); else add(debts, { ...blank, ...data, meta: '' });
    closeSheet(); toast('บันทึกแล้ว');
  };
  return (
    <div class="col" style={{ gap: 12 }}>
      <label><span class="label">ชื่อ</span><input class="field" value={name} placeholder="เช่น รถ, บัตรเครดิต KTC" onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
      <div><span class="label">ประเภท</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{TYPES.map((t) => <button class={`chip${type === t[0] ? ' on' : ''}`} onClick={() => setType(t[0])}>{t[0]}</button>)}</div></div>
      <div><span class="label">แบบดอกเบี้ย</span>
        <Seg value={rt} onChange={setRt} options={[['reducing', 'ลดต้นลดดอก'], ['fixed', 'ดอกคงที่ทั้งสัญญา']]} />
        <span class="muted" style={{ fontSize: 12.5, lineHeight: 1.5, display: 'block', marginTop: 6 }}>{rt === 'fixed' ? 'ผ่อนรถ/สินค้าที่ดอกคิดไว้แล้วทั้งสัญญา โปะเพิ่มไม่ลดดอก' : 'ดอกคิดจากยอดคงเหลือ ยิ่งโปะต้นยิ่งลดดอก (บ้าน บัตร กยศ.)'}</span></div>
      <label><span class="label">เงินต้นคงเหลือ</span><input class="field num" inputMode="decimal" value={bal} onInput={(e) => setBal((e.target as HTMLInputElement).value)} /></label>
      <label><span class="label">ยอดตั้งต้น (ใช้คำนวณ % ที่จ่ายแล้ว)</span><input class="field num" inputMode="decimal" value={orig} onInput={(e) => setOrig((e.target as HTMLInputElement).value)} /></label>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ค่างวด/เดือน</span><Stepper value={pay} onChange={setPay} step={100} fmt={(v) => v.toLocaleString()} w={80} /></div>
      {rt === 'fixed'
        ? <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">เหลืออีกกี่งวด</span><Stepper value={left} onChange={(v) => setLeft(Math.max(1, v))} step={1} fmt={(v) => `${v} งวด`} w={80} /></div>
        : <>
          <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ดอกเบี้ย %/ปี</span><Stepper value={rate} onChange={setRate} step={0.1} fmt={(v) => v.toFixed(1)} w={60} /></div>
          <label><span class="label">ดอกคงที่ถึง (ถ้ามี)</span><input class="field" type="month" value={until} onInput={(e) => setUntil((e.target as HTMLInputElement).value)} /></label>
          {until && <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ดอกหลังจากนั้น</span><Stepper value={after} onChange={setAfter} step={0.1} fmt={(v) => v.toFixed(1)} w={60} /></div>}
        </>}
      <button class="btn primary lg block" onClick={save}>บันทึก</button>
      {d && <button class="btn soft block" style={{ color: 'var(--error)' }} onClick={() => { closeSheet(); remove(debts, d.id, `ลบ ${d.name} แล้ว`); }}><Icon n="delete" size={20} />ลบหนี้นี้</button>}
    </div>
  );
}
