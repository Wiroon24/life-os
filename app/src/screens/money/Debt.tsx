import { useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back } from '../../store/nav';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { live, update } from '../../store/collection';
import { debts, simulate, debtPlan, monthLabel, type Debt as D } from '../../domain/money';
import { Stepper } from '../sheets';

const fmt = (n: number) => Math.round(n).toLocaleString();
const COLORS: Record<string, [string, string, string]> = { 'รถ': ['#ECF2FF', '#1F5FD6', '#2F7BFF'], 'กยศ.': ['#F1EEFF', '#5B3BE0', '#7C5CFF'], 'บ้าน': ['#E3F5E8', '#137A38', '#22B455'] };
const colorOf = (n: string) => COLORS[n] ?? ['#FFF4E3', '#9A5800', '#FF9F1C'];
const monthsTo = (ym?: string) => { if (!ym) return null; const [y, m] = ym.split('-').map(Number), n = new Date(); return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth()); };

export function Debt() {
  const [extra, setExtra] = useState(debtPlan.value.extra), [plan, setPlan] = useState(debtPlan.value.mode);
  const ds = live(debts.value);
  const R = { none: simulate(0, 'none'), aval: simulate(extra, 'aval'), snow: simulate(extra, 'snow') };
  const cur = R[debtPlan.value.mode === plan ? plan : plan];
  const nextId = Object.keys(cur.off).sort((a, b) => cur.off[a] - cur.off[b])[0], nm = cur.off[nextId] ?? cur.end;
  const best = (['aval', 'snow'] as const).slice().sort((a, b) => R[a].int - R[b].int)[0];
  const chosen = debtPlan.value.mode === plan && debtPlan.value.extra === extra;
  const orderLabel = (mode: 'aval' | 'snow') => R[mode].order?.map((id) => ds.find((d) => d.id === id)?.name).join(' → ');
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title="หนี้" onBack={back} />
      <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#C9C6BD' }}>ก้อนถัดไปที่จะหมด · {ds.find((d) => d.id === nextId)?.name ?? '—'}</span>
        <div class="row num" style={{ alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05 }}>{Math.floor(nm / 12)}</span><span style={{ fontSize: 18 }}>ปี</span><span style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05 }}>{nm % 12}</span><span style={{ fontSize: 18 }}>เดือน</span></div>
        <span style={{ fontSize: 14, color: '#C9C6BD' }}>หมด {monthLabel(nm)} · ปลดหนี้ทั้งหมด {monthLabel(cur.end)}</span>
      </div>
      {ds.map((d) => { const [soft, ink, c] = colorOf(d.name), paid = Math.max(0, 1 - d.balance / (d.orig || d.balance)), fm = monthsTo(d.fixedUntil); return (
        <button class="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }} onClick={() => editDebt(d)}>
          <div class="row" style={{ alignItems: 'flex-start' }}>
            <span class="medal" style={{ width: 40, height: 40, background: soft, color: ink }}><Icon n={d.icon} fill size={22} /></span>
            <span class="col grow"><span class="t16">{d.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{d.meta} · {d.rate}%</span></span>
            <span class="col" style={{ alignItems: 'flex-end' }}><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{fmt(d.balance)}</span><span class="muted" style={{ fontSize: 12 }}>คงเหลือ ฿</span></span>
          </div>
          <span class="bar" style={{ height: 10 }}><span style={{ width: `${paid * 100}%`, background: c }} /></span>
          <div class="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span class="num muted">จ่ายแล้ว {Math.round(paid * 100)}%</span><span style={{ fontWeight: 600 }}>คาดว่าหมด {monthLabel(cur.off[d.id] ?? cur.end)}</span></div>
          {fm != null && fm > 0 && <span style={{ background: 'var(--food-soft)', color: 'var(--food-ink)', borderRadius: 12, padding: '8px 10px', fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>ดอกคงที่หมดใน {fm} เดือน · เริ่มเทียบรีไฟแนนซ์ {monthLabel(fm - 6)}</span>}
        </button>); })}
      <span class="cap muted" style={{ padding: '0 4px', marginTop: -6 }}>แตะการ์ดเพื่อแก้ยอดคงเหลือ ดอกเบี้ย หรือค่างวด</span>

      <div class="col" style={{ gap: 2, marginTop: 6 }}><span class="h2">จำลองการโปะ</span><span class="small muted">เทียบ 3 แบบ แล้วเลือกเอง</span></div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 15, fontWeight: 600 }}>โปะเพิ่มต่อเดือน</span><span class="num" style={{ fontSize: 26, fontWeight: 600 }}>{fmt(extra)} ฿</span></div>
        <input type="range" min={0} max={10000} step={500} value={extra} onInput={(e) => setExtra(+(e.target as HTMLInputElement).value)} style={{ width: '100%', height: 32, accentColor: 'var(--food)', margin: 0 }} aria-label="โปะเพิ่มต่อเดือน" />
        <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 12 }}><span>0</span><span>5,000</span><span>10,000</span></div>
      </div>
      {([['aval', 'ก้อนดอกสูงก่อน', orderLabel('aval')], ['snow', 'ก้อนเล็กก่อน', `${orderLabel('snow')} · เห็นผลเร็ว`], ['none', 'ไม่โปะ', 'จ่ายตามงวดปกติ']] as const).map(([k, l, how]) => {
        const r = R[k], on = plan === k, save = R.none.int - r.int, car = ds.find((d) => d.name === 'รถ');
        return (
          <button style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 20, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'var(--shadow-1)', transition: 'box-shadow 150ms' }} onClick={() => setPlan(k)}>
            <div class="row" style={{ gap: 10, width: '100%' }}>
              <span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, boxShadow: on ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 2px #CFCBC1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 999, background: on ? 'var(--ink)' : 'transparent' }} /></span>
              <span class="col grow"><span class="t16">{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{how}</span></span>
              {k === best && extra > 0 && <span style={{ background: 'var(--success-tint)', color: 'var(--workout-ink)', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>ประหยัดสุด</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, width: '100%' }}>
              {[[car ? 'รถหมด' : 'ก้อนแรกหมด', car ? monthLabel(r.off[car.id] ?? r.end) : '—', 'var(--ink)'], ['ปลดหนี้หมด', monthLabel(r.end), 'var(--ink)'], ['ประหยัดดอก', k === 'none' ? '—' : `${fmt(save)} ฿`, save > 0 ? 'var(--workout-ink)' : 'var(--ink)']].map(([sl, sv, fg]) => <span style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 10px', display: 'flex', flexDirection: 'column' }}><span class="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{sl}</span><span class="num" style={{ fontSize: 15, fontWeight: 600, color: fg }}>{sv}</span></span>)}
            </div>
          </button>
        );
      })}
      <button class="btn primary lg" style={{ fontSize: 17 }} onClick={() => { debtPlan.value = { mode: plan, extra }; toast('เลือกแผนนี้แล้ว'); }}>{chosen ? 'ใช้แผนนี้อยู่ ✓' : 'เลือกแผนนี้'}</button>
      <span class="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>ตัวเลขเป็นการจำลองจากยอดและดอกเบี้ยที่กรอก ไม่ใช่คำแนะนำทางการเงิน · ดอกบ้านหลังหมดช่วงคงที่สมมติ {ds.find((d) => d.rateAfter)?.rateAfter ?? 4}% · รถใช้ดอกเบี้ยแท้จริงประมาณ (แก้ได้)</span>
    </div>
  );
}

function editDebt(d: D) { openSheet({ title: `แก้ ${d.name}`, body: () => <DebtEdit d={d} /> }); }
function DebtEdit({ d }: { d: D }) {
  const [bal, setBal] = useState(String(d.balance)), [orig, setOrig] = useState(String(d.orig)), [pay, setPay] = useState(d.payment), [rate, setRate] = useState(d.rate), [after, setAfter] = useState(d.rateAfter ?? d.rate), [until, setUntil] = useState(d.fixedUntil ?? '');
  return (
    <div class="col" style={{ gap: 12 }}>
      <label><span class="label">ยอดคงเหลือ (เงินต้น)</span><input class="field num" inputMode="decimal" value={bal} onInput={(e) => setBal((e.target as HTMLInputElement).value)} /></label>
      <label><span class="label">ยอดตั้งต้น (ใช้คำนวณ % ที่จ่ายแล้ว)</span><input class="field num" inputMode="decimal" value={orig} onInput={(e) => setOrig((e.target as HTMLInputElement).value)} /></label>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ค่างวด/เดือน</span><Stepper value={pay} onChange={setPay} step={100} fmt={(v) => v.toLocaleString()} w={80} /></div>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ดอกเบี้ย %/ปี</span><Stepper value={rate} onChange={setRate} step={0.1} fmt={(v) => v.toFixed(1)} w={60} /></div>
      <label><span class="label">ดอกคงที่ถึง (ถ้ามี)</span><input class="field" type="month" value={until} onInput={(e) => setUntil((e.target as HTMLInputElement).value)} /></label>
      {until && <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ดอกหลังจากนั้น</span><Stepper value={after} onChange={setAfter} step={0.1} fmt={(v) => v.toFixed(1)} w={60} /></div>}
      <button class="btn primary lg block" onClick={() => { update(debts, d.id, { balance: +bal.replace(/,/g, '') || d.balance, orig: +orig.replace(/,/g, '') || d.orig, payment: pay, rate, rateAfter: until ? after : undefined, fixedUntil: until || undefined, source: 'user' }); closeSheet(); toast('บันทึกแล้ว'); }}>บันทึก</button>
    </div>
  );
}
