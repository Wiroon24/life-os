import { useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { toast } from '../../store/ui';
import { addDays, dayKey, parseKey, thDate } from '../../domain/time';
import { appNow } from '../../domain/plan';
import { sleepLog, hoursOf } from '../../domain/sleep';
import { profile } from '../../domain/profile';
import { weights, avg7, rate, MILESTONES, START_KG, etaFor, inbodies, weekSummary, proposals, checkins, latestW } from '../../domain/body';
import { openWeigh } from '../sheets';

const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const dstr = (d: Date) => `${d.getDate()} ${TH[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + String(d.getFullYear() + 543).slice(2) : ''}`;
const ROLEC = { food: ['#FFF4E3', '#9A5800'], workout: ['#E8F8EE', '#137A38'], recovery: ['#F1EEFF', '#5B3BE0'] } as const;

function Checkin() {
  const today = appNow(), wk = dayKey(today), ps = proposals(today), s = weekSummary(today);
  const rec = checkins.value[wk] ?? { decided: {}, at: Date.now() };
  const [vals, setVals] = useState<Record<string, number>>({}), [editing, setEditing] = useState<string | null>(null);
  const decide = (id: string, v: 'ok' | 'no' | null) => { const d = { ...rec.decided }; if (v) d[id] = v; else delete d[id]; checkins.value = { ...checkins.value, [wk]: { decided: d, at: Date.now() } }; };
  const hours = s.avgH;
  return (
    <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 0 0 2px var(--ink)' }}>
      <div class="col" style={{ gap: 2 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>เช็กอินสัปดาห์ · {thDate(today)}</span><span class="h2">{ps.length ? 'สัปดาห์นี้มีเรื่องให้ปรับ' : 'สัปดาห์นี้ไปได้ดี ไม่ต้องปรับ'}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[['น้ำหนักเฉลี่ย', s.dW == null ? '—' : `${s.dW > 0 ? '+' : '−'}${Math.abs(s.dW).toFixed(1)} kg`], ['ซ้อม', `${s.sessions} ครั้ง`], ['โปรตีนถึงเป้า', `${s.prot} / 7 วัน`], ['นอนเฉลี่ย', hours == null ? '—' : `${Math.floor(hours)} ชม. ${Math.round((hours % 1) * 60)} น.`]].map(([l, v]) => (
          <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{v}</span></div>
        ))}
      </div>
      {ps.length > 0 && <span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>AI เสนอปรับแผน</span>}
      {ps.map((p) => {
        const st = rec.decided[p.id], v = vals[p.id] ?? p.value, [soft, ink] = ROLEC[p.role];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 16, background: st === 'ok' ? '#F2FAF4' : 'var(--bg)' }}>
            <div class="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span class="medal" style={{ width: 36, height: 36, background: soft, color: ink }}><Icon n={p.icon} fill size={20} /></span>
              <span class="col grow"><span class="t16" style={{ textDecoration: st === 'no' ? 'line-through' : 'none', color: st === 'no' ? 'var(--ink-2)' : 'var(--ink)' }}>{p.title(v)}</span><span class="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{p.why}</span></span>
              {st && <span style={{ height: 28, padding: '0 10px', borderRadius: 999, background: st === 'ok' ? 'var(--success-tint)' : 'var(--surface-2)', color: st === 'ok' ? 'var(--workout-ink)' : 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{st === 'ok' ? 'ใช้แล้ว' : 'ข้าม'}</span>}
            </div>
            {editing === p.id && !st && <div class="row" style={{ gap: 8 }}>
              <div class="row grow" style={{ background: '#fff', borderRadius: 12, height: 48, gap: 0 }}><button style={{ width: 44, height: 48 }} onClick={() => setVals({ ...vals, [p.id]: Math.max(p.step, v - p.step) })}><Icon n="remove" size={20} /></button><span class="num grow" style={{ textAlign: 'center', fontSize: 17, fontWeight: 600 }}>{p.unit(v)}</span><button style={{ width: 44, height: 48 }} onClick={() => setVals({ ...vals, [p.id]: v + p.step })}><Icon n="add" size={20} /></button></div>
              <button class="btn dark" onClick={() => { p.apply(v); decide(p.id, 'ok'); setEditing(null); toast(`ใช้แล้ว · ${p.title(v)}`); }}>ใช้ค่านี้</button>
            </div>}
            {!st && editing !== p.id && <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 6 }}>
              <button class="btn dark" style={{ height: 44, fontSize: 14.5 }} onClick={() => { p.apply(v); decide(p.id, 'ok'); toast(`ใช้แล้ว · ${p.title(v)}`); }}>ยอมรับ</button>
              <button class="btn white" style={{ height: 44, fontSize: 14.5 }} onClick={() => setEditing(p.id)}>แก้</button>
              <button class="btn" style={{ height: 44, fontSize: 14.5, color: 'var(--ink-2)' }} onClick={() => decide(p.id, 'no')}>ไม่เอา</button>
            </div>}
          </div>
        );
      })}
    </div>
  );
}

export function TrendsSection() {
  const today = appNow(), [range, setRange] = useState<30 | 90>(30);
  const showCheckin = today.getDay() === 0 || today.getDay() === 1;
  const N = range, F = Math.round(N / 2);
  const daysArr = Array.from({ length: N }, (_, i) => addDays(today, i - N + 1));
  const daily = daysArr.map((d) => weights.value.filter((w) => w.date === dayKey(d)).at(-1)?.kg ?? null);
  const avg = daysArr.map((d) => avg7(d));
  const now = avg7(today) ?? latestW()?.kg ?? START_KG, r = rate(today);
  const all = [...daily, ...avg].filter((x): x is number => x != null);
  const lo = Math.floor(Math.min(MILESTONES[0] - 1, ...all, now - 2)), hi = Math.ceil(Math.max(...all, now) + 0.5);
  const px = (i: number) => 28 + (i / (N - 1 + F)) * 292, py = (v: number) => 8 + ((hi - v) / (hi - lo)) * 164;
  const avgPts = avg.map((v, i) => (v == null ? null : `${px(i).toFixed(1)},${py(v).toFixed(1)}`)).filter(Boolean).join(' ');
  const projEnd = now - ((r ?? 0.6) * F) / 7;
  const ib = inbodies(), first = ib[0], lastIb = ib.at(-1);
  const nights = Array.from({ length: 14 }, (_, i) => sleepLog.value[dayKey(addDays(today, i - 13))]);
  const hrs = nights.map((n) => hoursOf(n) ?? 0), bedM = nights.map((n) => { if (!n) return null; const d = new Date(n.bed); const m = d.getHours() * 60 + d.getMinutes(); return m < 720 ? m + 1440 : m; });
  const [th, tm] = profile.value.sleep.split(':').map(Number), target = (th < 12 ? th + 24 : th) * 60 + tm;
  const bLo = 23 * 60, bHi = 25.5 * 60, by = (m: number) => 8 + ((Math.min(bHi, Math.max(bLo, m)) - bLo) / (bHi - bLo)) * 84, bx = (i: number) => 8 + i * (310 / 13);
  const logged = hrs.filter((h) => h > 0), avgH = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null;
  const onT = bedM.slice(-7).filter((m) => m != null && m <= target + 10).length;
  const delta = (dv: number, goodUp: boolean) => { const z = Math.abs(dv) < 0.05, good = z ? null : (dv > 0) === goodUp; return { A: z ? 'remove' : dv > 0 ? 'arrow_upward' : 'arrow_downward', D: z ? '0' : Math.abs(dv).toFixed(1), soft: good == null ? '#EFEDE7' : good ? '#E3F5E8' : '#FDE7E4', ink: good == null ? '#6B6962' : good ? '#137A38' : '#D92D20' }; };

  return (
    <>
      {showCheckin && <Checkin />}
      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span class="col"><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>น้ำหนัก · ค่าเฉลี่ย 7 วัน</span><span class="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.15 }}>{now.toFixed(1)}<span class="muted" style={{ fontSize: 16, fontWeight: 500 }}> kg</span></span><span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--workout-ink)' }}>{r == null ? 'ชั่งทุกเช้าเพื่อดูแนวโน้ม' : `${r >= 0 ? '↓' : '↑'} ${Math.abs(r).toFixed(2)} kg / สัปดาห์`}</span></span>
          <div class="col" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--surface-2)', borderRadius: 999, padding: 3, height: 40 }}>{([30, 90] as const).map((n) => <button style={{ padding: '0 12px', borderRadius: 999, background: range === n ? '#fff' : 'transparent', color: range === n ? 'var(--ink)' : 'var(--ink-2)', fontSize: 13.5, fontWeight: 600 }} onClick={() => setRange(n)}>{n} วัน</button>)}</div>
            <button class="btn dark" style={{ height: 40, fontSize: 14 }} onClick={() => openWeigh()}><Icon n="add" size={18} />ชั่ง</button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {[Math.ceil(lo + 1), Math.round((lo + hi) / 2), hi - 1].map((v) => <div style={{ position: 'absolute', left: 0, right: 0, top: `${(py(v) / 180) * 100}%`, display: 'flex', alignItems: 'center', gap: 6, transform: 'translateY(-50%)', pointerEvents: 'none' }}><span class="num muted" style={{ width: 22, fontSize: 11, fontWeight: 500 }}>{v}</span><span style={{ flex: 1, height: 1, background: 'var(--surface-2)' }} /></div>)}
          {MILESTONES[0] > lo && <div style={{ position: 'absolute', left: 28, right: 0, top: `${(py(MILESTONES[0]) / 180) * 100}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><span style={{ flex: 1, borderTop: '2px dashed var(--workout)' }} /><span style={{ background: 'var(--success-tint)', color: 'var(--workout-ink)', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>ด่าน 1 · {MILESTONES[0]}</span></div>}
          <svg viewBox="0 0 326 180" style={{ position: 'relative', width: '100%', height: 'auto', display: 'block' }}>
            {daily.map((v, i) => v != null && <circle cx={px(i)} cy={py(v)} r={2.6} fill="#B9B5AB" opacity={0.55} />)}
            {avgPts && <polyline points={avgPts} fill="none" stroke="var(--ink)" stroke-width={3} stroke-linejoin="round" stroke-linecap="round" />}
            <polyline points={`${px(N - 1)},${py(now)} ${px(N - 1 + F)},${py(projEnd)}`} fill="none" stroke="var(--ink)" stroke-width={2} stroke-dasharray="4 5" opacity={0.5} />
            <circle cx={px(N - 1)} cy={py(now)} r={6} fill="var(--primary)" stroke="#fff" stroke-width={3} />
          </svg>
          <div class="row muted" style={{ justifyContent: 'space-between', paddingLeft: 28, fontSize: 11 }}><span>{dstr(daysArr[0])}</span><span>วันนี้</span><span>{dstr(addDays(today, F))}</span></div>
        </div>
        <div class="row muted" style={{ gap: 14, fontSize: 12 }}><span class="row" style={{ gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: '#B9B5AB' }} />รายวัน</span><span class="row" style={{ gap: 4 }}><span style={{ width: 14, height: 3, borderRadius: 999, background: 'var(--ink)' }} />เฉลี่ย 7 วัน</span><span class="row" style={{ gap: 4 }}><span style={{ width: 14, borderTop: '2px dashed #8D8A82' }} />คาดการณ์</span></div>
        <div class="col" style={{ gap: 2, marginTop: 4 }}>
          {MILESTONES.map((kg, i) => { const top = i ? MILESTONES[i - 1] : START_KG, pct = Math.max(0, Math.min(1, (top - now) / (top - kg))), eta = etaFor(kg, today), on = i === 0 || now <= MILESTONES[i - 1]; return (
            <div class="row" style={{ minHeight: 56, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 999, background: on ? 'var(--success-tint)' : 'var(--surface-2)', color: on ? 'var(--workout-ink)' : 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
              <span class="col grow" style={{ gap: 4 }}><span class="row" style={{ justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}><span>{kg} kg</span><span class="num">{typeof eta === 'string' ? eta : `~${dstr(eta)}`}</span></span><span class="bar" style={{ height: 6 }}><span style={{ width: `${pct * 100}%`, background: on ? 'var(--workout)' : '#CFCBC1' }} /></span></span>
            </div>); })}
        </div>
      </div>

      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 17, fontWeight: 600 }}>InBody</span><span class="cap muted">กล้ามเนื้อต้องไม่ลด · ถ่ายรูปผลด้วย ⊕</span></div>
        {lastIb && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ l: 'กล้ามเนื้อ', v: lastIb.smm != null ? `${lastIb.smm} kg` : '—', d: first?.smm != null && lastIb.smm != null && ib.length > 1 ? `${lastIb.smm - first.smm >= 0 ? '↑' : '↓'} ${Math.abs(lastIb.smm - first.smm).toFixed(1)} จากเริ่ม` : 'ครั้งแรก', ok: !(first?.smm != null && lastIb.smm != null && lastIb.smm < first.smm) },
            { l: 'ไขมัน', v: lastIb.fat != null ? `${lastIb.fat} %` : '—', d: first?.fat != null && lastIb.fat != null && ib.length > 1 ? `${lastIb.fat - first.fat <= 0 ? '↓' : '↑'} ${Math.abs(lastIb.fat - first.fat).toFixed(1)} จากเริ่ม` : `ไขมันช่องท้อง ${lastIb.visceral ?? '—'}`, ok: !(first?.fat != null && lastIb.fat != null && lastIb.fat > first.fat) }].map((h) => (
            <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{h.l}</span><span class="num" style={{ fontSize: 22, fontWeight: 600 }}>{h.v}</span><span style={{ fontSize: 12.5, fontWeight: 600, color: h.ok ? 'var(--workout-ink)' : 'var(--error)' }}>{h.d}</span></div>
          ))}
        </div>}
        <div class="col">
          {[...ib].reverse().map((b, i, arr) => { const p = arr[i + 1], m = p?.smm != null && b.smm != null ? delta(b.smm - p.smm, true) : null, f = p?.fat != null && b.fat != null ? delta(b.fat - p.fat, false) : null; return (
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: 8, alignItems: 'center', minHeight: 52 }}>
              <span class="muted" style={{ fontSize: 13.5 }}>{dstr(parseKey(b.date))}</span>
              {([[b.smm, m], [b.fat, f]] as const).map(([v, dd]) => <span class="row num" style={{ gap: 4 }}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{v?.toFixed(1) ?? '—'}</span>{dd && <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 6px 0 2px', borderRadius: 999, background: dd.soft, color: dd.ink, fontSize: 12, fontWeight: 600 }}><Icon n={dd.A} size={15} />{dd.D}</span>}</span>)}
            </div>); })}
          <div class="muted" style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: 8, fontSize: 11.5, paddingTop: 4 }}><span /><span>กล้ามเนื้อ kg</span><span>ไขมัน %</span></div>
        </div>
      </div>

      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 17, fontWeight: 600 }}>การนอนและการฟื้นตัว</span><span class="cap muted">14 คืน</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['นอนเฉลี่ย', avgH == null ? '—' : `${avgH.toFixed(1)} ชม.`], ['เข้านอนตรงเป้า', `${onT} / 7 คืน`]].map(([l, v]) => <div style={{ background: 'var(--recovery-soft)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--recovery-ink)' }}>{l}</span><span class="num" style={{ fontSize: 20, fontWeight: 600 }}>{v}</span></div>)}
        </div>
        {logged.length === 0 ? <span class="small muted">ยังไม่มีข้อมูล กด “นอนแล้ว” ตอนปิดวัน หรือเชื่อม Health Connect (เร็วๆ นี้)</span> : <>
          <span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>ชั่วโมงนอน · เป้า 7.5</span>
          <div style={{ position: 'relative', height: 96, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: `${(7.5 / 9) * 100}%`, borderTop: '2px dashed var(--recovery)', opacity: 0.6 }} />
            {hrs.map((h) => <span style={{ flex: 1, height: `${Math.max(2, (h / 9) * 100)}%`, borderRadius: '6px 6px 3px 3px', background: h >= 7.5 ? '#7C5CFF' : h >= 6.5 ? '#B8A8FF' : h > 0 ? '#E0D9FF' : '#EFEDE7' }} />)}
          </div>
          <span class="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>เวลาเข้านอน · เป้า {profile.value.sleep}</span>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${by(target)}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}><span style={{ flex: 1, borderTop: '2px dashed var(--recovery)', opacity: 0.6 }} /><span style={{ fontSize: 11, fontWeight: 600, color: 'var(--recovery-ink)' }}>{profile.value.sleep}</span></div>
            <svg viewBox="0 0 326 100" style={{ position: 'relative', width: '100%', height: 'auto', display: 'block' }}>
              <polyline points={bedM.map((m, i) => (m == null ? null : `${bx(i)},${by(m)}`)).filter(Boolean).join(' ')} fill="none" stroke="#7C5CFF" stroke-width={2.5} stroke-linejoin="round" />
              {bedM.map((m, i) => m != null && <circle cx={bx(i)} cy={by(m)} r={4} fill={m <= target + 10 ? '#7C5CFF' : '#fff'} stroke="#7C5CFF" stroke-width={2} />)}
            </svg>
          </div>
        </>}
      </div>
    </>
  );
}
