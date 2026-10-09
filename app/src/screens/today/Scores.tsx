import { useState } from 'preact/hooks';
import { Icon, Ring, TopBar, Seg } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { toast } from '../../store/ui';
import { dayKey, addDays, parseKey } from '../../domain/time';
import { sleepScore, strainScore, recoveryScore, strainTarget, coachLine, type Score } from '../../domain/scores';
import { healthState, syncHealth } from '../../health';

type K = 'sleep' | 'strain' | 'rec';
/** Sleep keeps the app's recovery/sleep purple; strain uses the workout green; recovery gets its own teal so the three never blur. */
export const SC: Record<K, { l: string; long: string; icon: string; c: string; tint: string; ink: string; fn: (k: string) => Score | null }> = {
  sleep: { l: 'นอน', long: 'คะแนนการนอน', icon: 'bedtime', c: '#7C5CFF', tint: '#E6E0FF', ink: '#5B3BE0', fn: sleepScore },
  strain: { l: 'ความหนัก', long: 'ความหนักของวัน', icon: 'local_fire_department', c: '#22B455', tint: '#D3F2DD', ink: '#137A38', fn: strainScore },
  rec: { l: 'ฟื้นตัว', long: 'การฟื้นตัว', icon: 'battery_charging_full', c: '#14A38B', tint: '#D2F1EA', ink: '#0B7360', fn: recoveryScore },
};
const ORDER: K[] = ['strain', 'rec', 'sleep'];
export const hasScores = (key: string) => ORDER.some((k) => SC[k].fn(key));

export function ScoreCard({ date }: { date: Date }) {
  const key = dayKey(date), t = strainTarget(key);
  const vals = ORDER.map((k) => [k, SC[k].fn(key)] as const);
  if (!healthState.value.on && !vals.some(([, s]) => s)) return null;
  return (
    <button class="card press" style={{ padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }} onClick={() => push('scores')} aria-label="ดูรายละเอียดคะแนนสุขภาพ">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {vals.map(([k, s]) => (
          <span class="col" style={{ alignItems: 'center', gap: 6 }}>
            <Ring value={(s?.v ?? 0) / 100} size={76} stroke={9} color={SC[k].c} track={SC[k].tint}>
              <span class="num" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{s ? s.v : '—'}</span>
              {k === 'strain' && s && <span class="muted" style={{ fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>เป้า {t}</span>}
            </Ring>
            <span class="row" style={{ gap: 4, fontSize: 13, fontWeight: 600, color: SC[k].ink }}><Icon n={SC[k].icon} fill size={16} />{SC[k].l}{s?.est && <span title="ประมาณการ" style={{ color: 'var(--ink-3)' }}>*</span>}</span>
          </span>
        ))}
      </div>
      <div class="row" style={{ gap: 8, background: 'var(--bg)', borderRadius: 14, padding: '10px 12px', alignItems: 'flex-start' }}>
        <Icon n="sports" fill size={20} color="var(--ink-2)" />
        <span class="grow" style={{ fontSize: 14.5, lineHeight: 1.5 }}>{coachLine(key)}</span>
        <Icon n="chevron_right" size={20} color="var(--ink-3)" />
      </div>
    </button>
  );
}

/** Small 7/30-day bars for one score. */
function Trend({ k, days, end }: { k: K; days: number; end: Date }) {
  const xs = Array.from({ length: days }, (_, i) => { const d = addDays(end, i - days + 1); return { d, s: SC[k].fn(dayKey(d)) }; });
  const have = xs.filter((x) => x.s), avg = have.length ? Math.round(have.reduce((a, x) => a + x.s!.v, 0) / have.length) : null;
  const bw = days > 10 ? 6 : 26, gap = days > 10 ? 3.5 : 14, W = days * (bw + gap);
  return <div class="col" style={{ gap: 6 }}>
    <span class="cap muted">เฉลี่ย {days} วัน {avg ?? '—'}</span>
    <svg viewBox={`0 0 ${W} 84`} style={{ width: '100%', height: 84 }} role="img" aria-label={`${SC[k].long} ${days} วันล่าสุด เฉลี่ย ${avg ?? 'ไม่มีข้อมูล'}`}>
      {xs.map((x, i) => { const h = x.s ? Math.max(4, (x.s.v / 100) * 64) : 4; return <g>
        <rect x={i * (bw + gap)} y={68 - h} width={bw} height={h} rx={bw / 2} fill={x.s ? SC[k].c : SC[k].tint} />
        {days <= 10 && <text x={i * (bw + gap) + bw / 2} y={82} text-anchor="middle" fill="#6B6962" style={{ font: "500 10px 'Anuphan',sans-serif" }}>{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][x.d.getDay()]}</text>}
      </g>; })}
    </svg>
  </div>;
}

export function Scores({ day }: { day?: string }) {
  const [sel, setSel] = useState<K>('rec'), [span, setSpan] = useState<'7' | '30'>('7'), [busy, setBusy] = useState(false);
  const date = day ? parseKey(day) : new Date(), key = dayKey(date), h = healthState.value;
  const s = SC[sel].fn(key);
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title="คะแนนสุขภาพวันนี้" onBack={back} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {ORDER.map((k) => { const v = SC[k].fn(key), on = sel === k; return (
          <button class="card press" aria-pressed={on} onClick={() => setSel(k)} style={{ padding: '12px 4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: on ? `inset 0 0 0 2px ${SC[k].c}` : undefined }}>
            <Ring value={(v?.v ?? 0) / 100} size={60} stroke={7} color={SC[k].c} track={SC[k].tint}><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{v ? v.v : '—'}</span></Ring>
            <span style={{ fontSize: 13, fontWeight: 600, color: SC[k].ink }}>{SC[k].l}</span>
          </button>); })}
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span class="h2">{SC[sel].long}</span>
          <span class="num" style={{ fontSize: 28, fontWeight: 600, color: SC[sel].ink }}>{s ? s.v : '—'}<span class="muted" style={{ fontSize: 14, fontWeight: 500 }}> / 100</span></span>
        </div>
        {sel === 'strain' && <span class="cap muted" style={{ marginTop: -6 }}>เป้าวันนี้ {strainTarget(key)} · ปรับตามการฟื้นตัวและแผนซ้อม</span>}
        {s ? s.parts.map((p) => <div class="row" style={{ alignItems: 'flex-start', gap: 8 }}><Icon n="chevron_right" size={20} color="var(--ink-3)" /><span style={{ fontSize: 15, lineHeight: 1.55 }}>{p}</span></div>)
          : <span class="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{sel === 'sleep' ? 'ยังไม่มีข้อมูลการนอนของคืนที่แล้ว ใส่นาฬิกานอนแล้วเปิด Zepp ให้ซิงก์' : sel === 'rec' ? 'ต้องมีการนอนหรือชีพจรขณะพักของวันนี้ก่อน' : 'ยังไม่มีชีพจร ก้าว หรือการซ้อมของวันนี้'}</span>}
        {s?.est && <span style={{ fontSize: 12.5, color: '#9A5800', background: '#FFF4E3', borderRadius: 10, padding: '6px 10px', alignSelf: 'flex-start' }}>* ประมาณการ ข้อมูลยังไม่ครบ</span>}
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div class="row" style={{ justifyContent: 'space-between' }}><span class="h2">แนวโน้ม</span><Seg value={span} onChange={setSpan} options={[['7', '7 วัน'], ['30', '30 วัน']]} /></div>
        <Trend k={sel} days={+span} end={date} />
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span class="h2">คิดจากอะไร</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.6 }}>
          {sel === 'sleep' && 'ชั่วโมงนอนเทียบเวลาตื่น/นอนที่ตั้งไว้ (50) + เข้านอนตรงเวลา (25) + สัดส่วนหลับลึก ≥15% และ REM ≥20% และตื่นกลางดึกน้อย (25)'}
          {sel === 'strain' && 'นาทีที่ชีพจรอยู่ในโซน 1–5 (คิดจากชีพจรสูงสุดตามอายุ) ถ่วงน้ำหนัก 1–5 + เซ็ตที่ซ้อมในแอป + ก้าว แล้วแปลงเป็น 0–100 ยิ่งหนักยิ่งขึ้นช้าลง'}
          {sel === 'rec' && 'ชีพจรขณะพักเทียบค่าปกติ 30 วันของคุณเอง (45%) + คะแนนนอนเมื่อคืน (40%) + ความหนักเมื่อวาน (15%) · Bip 3 ไม่ส่ง HRV จึงแม่นน้อยกว่านาฬิกาที่มี HRV'}
        </span>
      </div>
      <button class="btn soft" style={{ height: 52 }} disabled={busy || !h.on} onClick={async () => { setBusy(true); try { await syncHealth(true); toast('ซิงก์แล้ว'); } finally { setBusy(false); } }}>
        <Icon n="sync" size={20} />{h.on ? `ซิงก์ตอนนี้${h.last ? ` · ล่าสุด ${new Date(h.last).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'เชื่อม Health Connect ที่โปรไฟล์ก่อน'}
      </button>
    </div>
  );
}
