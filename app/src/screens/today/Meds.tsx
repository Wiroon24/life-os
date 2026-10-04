import { useState } from 'preact/hooks';
import { Icon, Check, Burst, TopBar, EditToggle } from '../../ui/kit';
import { back } from '../../store/nav';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { add, remove, update, live } from '../../store/collection';
import { addDays, thDate } from '../../domain/time';
import { appNow } from '../../domain/plan';
import { useBack } from '../../ui/back';
import { meds, medsFor, isTaken, toggleMed, isEvenDay, medStreak, type Med, type Slot, type Sched } from '../../domain/meds';

const SCHED: Record<Sched, string> = { daily: 'ทุกวัน', alt: 'วันเว้นวัน', days: 'บางวัน' };
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function Meds({ slot: slot0 }: { slot?: Slot }) {
  const [slot, setSlot] = useState<Slot>(slot0 ?? 'morning');
  const [day, setDay] = useState<0 | 1>(0);
  const [edit, setEdit] = useState(false);
  const [bursts, setBursts] = useState<Record<string, number>>({});
  useBack(() => { if (edit) { setEdit(false); return true; } return false; }, edit);
  const date = day ? addDays(appNow(), 1) : appNow(), even = isEvenDay(date);
  const items = medsFor(slot, date), all = live(meds.value).filter((m) => m.slot === slot);
  const doneN = items.filter((m) => isTaken(date, m.id)).length, allDone = items.length > 0 && doneN === items.length;
  const altItem = items.find((m) => m.alt);

  const toggle = (m: Med) => {
    const was = isTaken(date, m.id); toggleMed(date, m.id);
    if (!was) { setBursts((b) => ({ ...b, [m.id]: (b[m.id] ?? 0) + 1 })); if (doneN + 1 === items.length) setTimeout(() => setBursts((b) => ({ ...b, all: (b.all ?? 0) + 1 })), 300); }
  };

  return (
    <div class="screen sub" style={{ gap: 16 }}>
      <TopBar title="ยาและผิว" onBack={back} right={<EditToggle on={edit} onClick={() => setEdit(!edit)} />} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'var(--surface-2)', borderRadius: 999, padding: 4, height: 56 }}>
        <span style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(33.333% - 2.7px)', borderRadius: 999, background: '#fff', boxShadow: 'var(--shadow-1)', transform: `translateX(${slot === 'morning' ? '0%' : slot === 'night' ? '100%' : '200%'})`, transition: 'transform 320ms var(--ease-spring)' }} />
        {([['morning', 'เช้า', 'wb_sunny'], ['night', 'ก่อนนอน', 'bedtime'], ['timed', 'ตามเวลา', 'alarm']] as const).map(([k, t, ic]) => (
          <button style={{ position: 'relative', borderRadius: 999, fontSize: 14.5, fontWeight: 600, color: slot === k ? 'var(--ink)' : 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setSlot(k)}><Icon n={ic} fill size={18} />{t}</button>
        ))}
      </div>

      {!edit && <>
        <div class="row">
          <span class="col grow"><span class="num" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.05 }}>{doneN}<span style={{ fontSize: 22, color: 'var(--ink-2)' }}> / {items.length}</span></span><span class="small muted">{thDate(date)} · {even ? 'วันคู่' : 'วันคี่'}{day ? ' (ดูล่วงหน้า)' : ''}</span></span>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 4 }}>
            {(['วันนี้', 'พรุ่งนี้'] as const).map((t, i) => <button style={{ height: 40, padding: '0 14px', borderRadius: 999, background: day === i ? 'var(--ink)' : 'transparent', color: day === i ? '#fff' : 'var(--ink)', fontSize: 14, fontWeight: 600 }} onClick={() => setDay(i as 0 | 1)}>{t}</button>)}
          </div>
        </div>
        <span style={{ height: 8, borderRadius: 999, background: 'var(--info-tint)', overflow: 'hidden', marginTop: -6 }}><span style={{ display: 'block', height: '100%', width: `${items.length ? (doneN / items.length) * 100 : 0}%`, background: 'var(--info)', borderRadius: 999, transition: 'width 600ms var(--ease-spring)' }} /></span>
        {allDone && (
          <div class="row" style={{ background: 'var(--success-tint)', borderRadius: 18, padding: 14, animation: 'iam-up 260ms var(--ease-out)' }}>
            <span style={{ position: 'relative', width: 44, height: 44, flex: 'none', borderRadius: 999, background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iam-pop 480ms var(--ease-spring)' }}><Icon n="check" size={26} /><Burst k={bursts.all ?? 0} colors={['#1C9C4A', '#FFC93C', '#2F7BFF', '#FF9F1C']} dist={50} n={14} /></span>
            <span class="col"><span class="t16" style={{ color: 'var(--success)' }}>ครบแล้ว · ต่อเนื่อง {medStreak(slot, appNow())} วัน</span><span class="cap">{slot === 'night' ? 'พรุ่งนี้เช้าเจอกัน' : 'คืนนี้ก่อนนอนอีกรอบ'}</span></span>
          </div>
        )}
      </>}

      <div class="card" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
        {(edit ? all : items).map((m, i) => {
          const checked = isTaken(date, m.id), label = edit ? (m.alt ? m.alt.join(' / ') : m.name) : (m as ReturnType<typeof medsFor>[number]).label;
          return (
            <div class="col">
              {edit && i > 0 && <button style={{ height: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }} onClick={() => { add(meds, { slot, name: 'รายการใหม่', sched: 'daily' }, all.indexOf(m)); toast('แทรกรายการแล้ว'); }}>
                <span style={{ flex: 1, height: 2, borderRadius: 2, background: 'var(--surface-2)' }} /><span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="add" size={18} /></span><span style={{ flex: 1, height: 2, borderRadius: 2, background: 'var(--surface-2)' }} /></button>}
              <div class="row" style={{ gap: 4, minHeight: 68, padding: '4px 4px 4px 0' }}>
                {edit
                  ? <button style={{ width: 44, height: 48, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => remove(meds, m.id, `ลบ ${label}`)} aria-label="ลบ"><span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--error)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="remove" size={18} /></span></button>
                  : <Check on={checked} onClick={() => toggle(m)} burst={bursts[m.id]} />}
                <button class="col grow" style={{ textAlign: 'left', gap: 2 }} onClick={() => edit && openMedEdit(m)}>
                  <span class="t16" style={{ color: checked && !edit ? 'var(--ink-2)' : 'var(--ink)', textDecoration: checked && !edit ? 'line-through' : 'none', textDecorationColor: 'var(--ink-3)' }}>{label}</span>
                  {m.sub && <span class="cap muted">{m.sub}</span>}
                  {m.slot === 'timed' && m.time && <span class="chip" style={{ alignSelf: 'flex-start', height: 24, padding: '0 8px', fontSize: 12 }}><Icon n="alarm" size={14} />{m.time}</span>}
                  {!edit && m.alt && <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, background: 'var(--info-tint)', color: 'var(--info)', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999, marginTop: 2 }}><Icon n="swap_horiz" size={14} />{even ? 'วันคู่' : 'วันคี่'} · พรุ่งนี้ {(m as ReturnType<typeof medsFor>[number]).otherLabel?.split(' ')[0]}</span>}
                </button>
                {edit && <button class="chip" style={{ height: 36 }} onClick={() => update(meds, m.id, { sched: m.sched === 'daily' ? 'alt' : m.sched === 'alt' ? 'days' : 'daily', days: m.days ?? [1, 3, 5] })}>{m.sched === 'days' ? (m.days ?? []).map((d) => DOW[d]).join(' ') : SCHED[m.sched]}</button>}
              </div>
            </div>
          );
        })}
        {edit && <button style={{ minHeight: 56, margin: 4, borderRadius: 14, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 16, fontWeight: 600 }} onClick={() => openMedEdit(null, slot)}><Icon n="add" size={22} />เพิ่มยา / ครีม</button>}
        {!edit && items.length === 0 && <div class="empty"><span class="muted">ยังไม่มีรายการรอบนี้</span><button class="btn soft" onClick={() => setEdit(true)}>เพิ่มรายการ</button></div>}
      </div>
      <span class="row" style={{ gap: 8, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)', padding: '0 4px', alignItems: 'flex-start' }}><Icon n="info" size={18} />{edit ? 'แตะชื่อเพื่อแก้ · แตะชิปเพื่อเปลี่ยนรอบ (ทุกวัน / วันเว้นวัน / บางวัน)' : altItem ? `${altItem.alt![0]} กับ ${altItem.alt![1]} สลับกันวันเว้นวันอัตโนมัติ · กด “พรุ่งนี้” ดูล่วงหน้า` : 'ติ๊กแล้วแจ้งเตือนจะหยุดทวง'}</span>
    </div>
  );
}

function openMedEdit(m: Med | null, slot: Slot = 'morning') {
  openSheet({ title: m ? 'แก้รายการ' : 'เพิ่มยา / ครีม', body: () => <MedEdit m={m} slot={slot} /> });
}
function MedEdit({ m, slot }: { m: Med | null; slot: Slot }) {
  const [name, setName] = useState(m?.name ?? ''), [sub, setSub] = useState(m?.sub ?? '');
  const [altOn, setAltOn] = useState(!!m?.alt), [a1, setA1] = useState(m?.alt?.[0] ?? ''), [a2, setA2] = useState(m?.alt?.[1] ?? '');
  const [sched, setSched] = useState<Sched>(m?.sched ?? 'daily'), [days, setDays] = useState<number[]>(m?.days ?? [1, 3, 5]);
  const [sl, setSl] = useState<Slot>(m?.slot ?? slot), [time, setTime] = useState(m?.time ?? '12:30');
  const save = () => {
    const data = { slot: sl, time: sl === 'timed' ? time : undefined, name: altOn ? a1 || name : name, sub, sched, days, alt: altOn && a1 && a2 ? ([a1, a2] as [string, string]) : undefined };
    if (!data.name.trim()) return toast('ใส่ชื่อก่อน');
    if (m) update(meds, m.id, data); else add(meds, data);
    closeSheet(); toast('บันทึกแล้ว');
  };
  return (
    <div class="col" style={{ gap: 12 }}>
      {!altOn && <label><span class="label">ชื่อ</span><input class="field" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="เช่น กันแดด SPF50, วิตามิน C" /></label>}
      <label class="row" style={{ gap: 10 }}><input type="checkbox" checked={altOn} onChange={(e) => setAltOn((e.target as HTMLInputElement).checked)} style={{ width: 22, height: 22 }} /><span class="t16">สลับ 2 ตัว วันคู่ / วันคี่</span></label>
      {altOn && <div class="row" style={{ gap: 8 }}><input class="field" value={a1} onInput={(e) => setA1((e.target as HTMLInputElement).value)} placeholder="วันคู่" /><input class="field" value={a2} onInput={(e) => setA2((e.target as HTMLInputElement).value)} placeholder="วันคี่" /></div>}
      <label><span class="label">วิธีใช้ (ไม่บังคับ)</span><input class="field" value={sub} onInput={(e) => setSub((e.target as HTMLInputElement).value)} placeholder="เช่น หลังอาหารเช้า" /></label>
      <div><span class="label">ตอนไหน</span><div class="row" style={{ gap: 6 }}>{([['morning', 'ตอนเช้า'], ['night', 'ก่อนนอน'], ['timed', 'ตั้งเวลาเอง']] as const).map(([s2, l]) => <button class={`chip${sl === s2 ? ' on' : ''}`} style={{ height: 40 }} onClick={() => setSl(s2)}>{l}</button>)}</div></div>
      {sl === 'timed' && <label><span class="label">เวลา (แจ้งเตือนตามเวลานี้)</span><input class="field" type="time" value={time} onInput={(e) => setTime((e.target as HTMLInputElement).value)} /></label>}
      <div><span class="label">วันไหนบ้าง</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{(Object.keys(SCHED) as Sched[]).map((s2) => <button class={`chip${sched === s2 ? ' on' : ''}`} style={{ height: 40 }} onClick={() => setSched(s2)}>{SCHED[s2]}</button>)}</div></div>
      {sched === 'days' && <div class="row" style={{ gap: 4 }}>{DOW.map((d, i) => <button class={`chip${days.includes(i) ? ' on' : ''}`} style={{ height: 40, flex: 1, justifyContent: 'center', padding: 0 }} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}>{d}</button>)}</div>}
      <div class="row" style={{ gap: 8 }}>{m && <button class="btn soft lg" style={{ color: 'var(--error)' }} onClick={() => { remove(meds, m.id, `ลบ ${m.name}`); closeSheet(); }} aria-label="ลบ"><Icon n="delete" size={22} /></button>}<button class="btn primary lg grow" onClick={save}>บันทึก</button></div>
    </div>
  );
}
