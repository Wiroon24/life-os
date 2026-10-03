import { useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { push } from '../../store/nav';
import { toast } from '../../store/ui';
import { addDays, thDate, DOW_SHORT } from '../../domain/time';
import { appNow } from '../../domain/plan';
import { planFor, weekIds, dayById, weekStart, swapDays, doneOn, kindIcon, daySub, active, weekCount, history, type DayKind } from '../../domain/training';

const KC: Record<DayKind, { soft: string; ink: string }> = { lift: { soft: '#E8F8EE', ink: '#137A38' }, mobility: { soft: '#F1EEFF', ink: '#5B3BE0' }, cardio: { soft: '#E6F6FB', ink: '#0B6E8A' }, rest: { soft: '#EFEDE7', ink: '#6B6962' } };

export function TrainSection() {
  const today = appNow(), p = planFor(today), done = doneOn(today), act = active.value;
  const ws = weekStart(today), ids = weekIds(today);
  const [drag, setDrag] = useState<number | null>(null), [over, setOver] = useState<number | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const lastBench = history('DB bench press').at(-1);
  const open = () => p.kind === 'mobility' ? push('mobility', { kind: 'stretch' }) : push('workout');
  return (
    <>
      {p.kind !== 'rest' && (
        <div style={{ background: 'var(--primary)', borderRadius: 22, padding: 20, color: '#fff', boxShadow: 'var(--primary-shadow)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--on-primary-scrim)', padding: '7px 12px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}><Icon n={kindIcon(p.kind)} fill size={18} />วันนี้ · {thDate(today)}</span>
          <div class="col" style={{ gap: 8 }}><span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</span><span style={{ alignSelf: 'flex-start', background: 'var(--on-primary-scrim)', padding: '5px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}>{done ? 'ทำแล้ววันนี้ ✓' : act ? 'กำลังซ้อมอยู่' : daySub(p)}</span></div>
          <button class="btn lg white" onClick={open}>{done ? 'ดูสรุป' : act ? 'ซ้อมต่อ' : p.kind === 'lift' ? 'ดูรายการ' : p.kind === 'mobility' ? 'เริ่มเล่นตาม' : 'เริ่ม'}<Icon n="arrow_forward" size={22} /></button>
        </div>
      )}
      <div class="col" style={{ gap: 8 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span class="h2">สัปดาห์นี้</span><span class="small muted">{weekCount(today)} / {ids.filter((x) => dayById(x).kind !== 'rest').length} ครั้ง</span></div>
        <div class="card" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
          {days.map((d, i) => {
            const wd = d.getDay(), dp = dayById(ids[wd]), isDone = !!doneOn(d), isToday = d.toDateString() === today.toDateString(), canDrag = !isDone;
            const c = KC[dp.kind];
            return (
              <div draggable={canDrag} onDragStart={(e) => { e.dataTransfer?.setData('text/plain', String(wd)); setDrag(wd); }} onDragOver={(e) => { if (drag != null && !isDone) { e.preventDefault(); setOver(wd); } }}
                onDrop={(e) => { e.preventDefault(); if (drag != null && drag !== wd && !isDone) { swapDays(today, drag, wd); toast(`สลับ ${DOW_SHORT[drag]} กับ ${DOW_SHORT[wd]} แล้ว · สัปดาห์นี้`); } setDrag(null); setOver(null); }}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                onClick={() => { if (isToday) open(); else if (dp.kind === 'mobility') push('mobility', { kind: 'stretch' }); else if (dp.kind === 'lift') push('program', { id: dp.id }); }}
                class="row" style={{ gap: 12, minHeight: 64, padding: '6px 4px 6px 8px', borderRadius: 14, background: over === wd && drag !== wd ? '#FFF4F0' : isToday ? '#FBFAF7' : 'transparent', opacity: drag === wd ? 0.4 : 1, boxShadow: over === wd && drag != null && drag !== wd ? 'inset 0 0 0 2px var(--primary)' : 'none', cursor: 'pointer' }}>
                <span class="col" style={{ width: 36, alignItems: 'center', flex: 'none' }}><span style={{ fontSize: 14, fontWeight: 600, color: isToday ? '#B83A1C' : 'var(--ink)' }}>{DOW_SHORT[wd]}</span><span class="muted" style={{ fontSize: 12 }}>{d.getDate()}</span></span>
                <span class="medal" style={{ width: 40, height: 40, background: c.soft, color: c.ink }}><Icon n={kindIcon(dp.kind)} fill size={22} /></span>
                <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600, color: isDone ? 'var(--ink-2)' : 'var(--ink)' }}>{dp.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{daySub(dp)}</span></span>
                {isDone && <span style={{ width: 32, height: 32, marginRight: 8, borderRadius: 999, background: 'var(--check)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" size={20} /></span>}
                {isToday && !isDone && <span style={{ background: '#FFE3DA', color: '#B83A1C', fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>วันนี้</span>}
                {canDrag && <span style={{ width: 40, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', cursor: 'grab' }}><Icon n="drag_indicator" size={22} /></span>}
              </div>
            );
          })}
        </div>
        <span class="cap muted" style={{ padding: '0 4px' }}>ลาก ⋮⋮ เพื่อสลับวันในสัปดาห์นี้ · วันที่ทำแล้วล็อกไว้</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button class="card press" style={{ minHeight: 88, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left' }} onClick={() => push('program', { id: ids[today.getDay()] })}><Icon n="edit_note" /><span style={{ fontSize: 15.5, fontWeight: 600 }}>แก้โปรแกรม</span></button>
        <button class="card press" style={{ minHeight: 88, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left' }} onClick={() => push('history', { name: 'DB bench press' })}><Icon n="show_chart" /><span class="col"><span style={{ fontSize: 15.5, fontWeight: 600 }}>ประวัติท่า</span><span class="muted" style={{ fontSize: 12.5 }}>{lastBench ? `Bench ${lastBench.kg} × ${lastBench.reps}` : 'DB bench press'}</span></span></button>
      </div>
    </>
  );
}
