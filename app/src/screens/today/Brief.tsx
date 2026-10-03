import { Icon, Ring, Medal, Stat, ROLE } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { thDate, fromMin } from '../../domain/time';
import { appNow, blocksFor } from '../../domain/plan';
import { nightFor, hoursOf, recovery } from '../../domain/sleep';
import { planFor, suggest } from '../../domain/training';
import { targetsFor } from '../../domain/food';
import { safeToSpend, upcomingBills, daysToPayday } from '../../domain/money';
import { avg7, rate } from '../../domain/body';
import { briefSeen } from './TodayTab';
import { dayKey } from '../../domain/time';

export function Brief() {
  const date = appNow(), n = nightFor(date), h = hoursOf(n), rec = recovery(date);
  const p = planFor(date), wblk = blocksFor(date).find((b) => b.kind === 'workout');
  const t = targetsFor(date), s = safeToSpend(date), bill = upcomingBills(date, 2)[0];
  const w = avg7(date), r = rate(date);
  const top3 = [
    p.kind !== 'rest' && wblk ? { t: `${p.name} ตอน ${fromMin(wblk.start)}`, sub: 'ทำสิ่งที่ยากที่สุดก่อน', c: ROLE.workout.c } : { t: 'วันพัก · เดินเล่น 30 นาที', sub: 'ให้กล้ามเนื้อซ่อม', c: ROLE.workout.c },
    { t: `โปรตีนให้ถึง ${t.p} g`, sub: 'เริ่มจากกล้วย + เวย์ หรือไข่ 3 ฟอง', c: ROLE.food.c },
    bill ? { t: `จ่าย${bill.name} ${Math.round(bill.amount).toLocaleString()} ฿`, sub: bill.days === 0 ? 'ครบกำหนดวันนี้' : `ครบกำหนดอีก ${bill.days} วัน`, c: ROLE.money.c } : { t: 'นอนให้ถึง 7.5 ชม.', sub: 'วางมือถือก่อนเที่ยงคืน', c: ROLE.recovery.c },
  ];
  const start = () => { briefSeen.value = dayKey(date); back(); };
  return (
    <div class="screen sub" style={{ gap: 14, paddingBottom: 130 }}>
      <div class="row" style={{ justifyContent: 'space-between', marginLeft: -12 }}><button class="btn icon" onClick={start} aria-label="ปิด"><Icon n="close" size={26} /></button></div>
      <span class="col" style={{ gap: 2, marginTop: -4 }}><span class="small muted" style={{ fontWeight: 500 }}>{thDate(date)} · สรุปตอนตื่น</span><span class="h1">อรุณสวัสดิ์ วันนี้พร้อมลุย</span></span>

      <div class="card" style={{ borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="row">
          <span class="col grow" style={{ gap: 2 }}>
            <span class="row" style={{ gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--recovery-ink)' }}><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--recovery)' }} />เมื่อคืนนอน</span>
            {h != null ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}><span class="num" style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.05 }}>{Math.floor(h)}</span><span class="muted" style={{ fontSize: 18, fontWeight: 600 }}>ชม.</span><span class="num" style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.05 }}>{Math.round((h % 1) * 60)}</span><span class="muted" style={{ fontSize: 18, fontWeight: 600 }}>นาที</span></span>
              : <span style={{ fontSize: 20, fontWeight: 600 }}>ยังไม่มีข้อมูล</span>}
            <span class="cap muted">{n?.wake ? `หลับ ${new Date(n.bed).toTimeString().slice(0, 5)} → ตื่น ${new Date(n.wake).toTimeString().slice(0, 5)}` : 'กด “นอนแล้ว” ตอนปิดวัน แอปจะจับเวลาให้เอง'}</span>
          </span>
          <Ring value={(rec ?? 0) / 100} size={96} stroke={11} color={ROLE.recovery.c} track={ROLE.recovery.tint}><span class="num" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{rec ?? '—'}</span><span class="muted" style={{ fontSize: 11.5 }}>ฟื้นตัว</span></Ring>
        </div>
        <div style={{ background: 'var(--recovery-soft)', borderRadius: 14, padding: '10px 12px', display: 'flex', gap: 8, fontSize: 14.5, lineHeight: 1.45 }}>
          <Icon n="arrow_forward" size={20} color="var(--recovery-ink)" style={{ lineHeight: 1.15 }} />
          <span>{rec == null ? <><b style={{ fontWeight: 600 }}>เริ่มจับการนอน</b> คืนนี้กด “นอนแล้ว” ในหน้าปิดวัน</> : rec >= 70 ? <><b style={{ fontWeight: 600 }}>ฟื้นตัวดีพอ</b> ซ้อมน้ำหนักเต็มได้</> : <><b style={{ fontWeight: 600 }}>ฟื้นตัวต่ำ</b> ลดน้ำหนักเวท 10% · คืนนี้นอนเร็วขึ้น</>}</span>
        </div>
      </div>

      {p.kind !== 'rest' && (
        <button class="card press" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }} onClick={() => push('workout')}>
          <div class="row"><Medal icon="fitness_center" role="workout" /><span class="col grow"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--workout-ink)' }}>วันนี้ซ้อม{wblk ? ` · ${fromMin(wblk.start)}` : ''}</span><span style={{ fontSize: 20, fontWeight: 600 }}>{p.name}</span></span><span class="cap muted" style={{ textAlign: 'right' }}>{p.exercises.length} ท่า</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {p.exercises.slice(0, 3).map((e) => { const s = suggest(e); return <span style={{ background: 'var(--bg)', fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 999 }}>{e.name} {e.unit === 'kg' ? `${s.kg} × ${s.reps}` : `${e.reps} ${e.repUnit}`}</span>; })}
            {p.exercises.length > 3 && <span class="muted" style={{ background: 'var(--bg)', fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 999 }}>+{p.exercises.length - 3}</span>}
          </div>
        </button>
      )}

      <div class="card" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span class="title" style={{ marginBottom: 4 }}>3 เรื่องสำคัญวันนี้</span>
        {top3.map((x, i) => <div class="row" style={{ minHeight: 52 }}><span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span><span class="col grow"><span class="t16">{x.t}</span><span class="cap muted">{x.sub}</span></span><span style={{ width: 10, height: 10, borderRadius: 999, background: x.c }} /></div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Stat label="ใช้ได้วันนี้" value={Math.round(Math.max(0, s.left)).toLocaleString()} unit="฿" sub={`เงินเดือนเข้าอีก ${daysToPayday(date)} วัน`} role="money" />
        <Stat label="น้ำหนักแนวโน้ม" value={w ? w.toFixed(1) : '—'} unit="kg" sub={r != null ? `${r >= 0 ? '−' : '+'}${Math.abs(r).toFixed(2)} kg/สัปดาห์` : 'ชั่งทุกเช้าเพื่อดูแนวโน้ม'} role="workout" />
      </div>

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px, 100%)', bottom: 0, padding: '16px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)', zIndex: 6 }}>
        <button class="btn primary lg block" onClick={start}><Icon n="wb_sunny" />เริ่มวัน</button>
      </div>
    </div>
  );
}
