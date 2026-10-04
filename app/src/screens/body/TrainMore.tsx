import { useEffect, useState } from 'preact/hooks';
import { Icon, Ring, TopBar, Seg } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { toast, showUndo } from '../../store/ui';
import { alertNow } from '../../store/notify';
import { dayKey, DOW_SHORT, parseKey } from '../../domain/time';
import { appNow, blocksFor, setStatus } from '../../domain/plan';
import { ExImg } from './ExerciseInfo';
import { MOB, LIB, EQ, program, weekIds, dayById, exFromLib, exLogFrom, active, warmDone, history, kindIcon } from '../../domain/training';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export function Mobility({ kind = 'warm' }: { kind?: 'warm' | 'stretch' }) {
  const which = kind;
  const d = MOB[which];
  const [i, setI] = useState(0), [left, setLeft] = useState(d.list[0][2]), [paused, setPaused] = useState(false);
  const go = (n: number) => {
    const j = i + n; if (j < 0) return;
    if (j >= d.list.length) { if (which === 'warm') warmDone.value = dayKey(appNow()); else { const wb = blocksFor(appNow()).find((b) => b.kind === 'workout'); if (wb) setStatus(dayKey(appNow()), wb.id, 'done'); } toast(which === 'warm' ? 'วอร์มเสร็จ พร้อมเริ่ม' : 'ยืดเหยียดเสร็จ'); back(); return; }
    setI(j); setLeft(d.list[j][2]); setPaused(false);
  };
  useEffect(() => { const iv = setInterval(() => { if (!paused) setLeft((l) => { if (l <= 1) { alertNow('ท่าต่อไป'); setTimeout(() => go(1), 0); return 0; } return l - 1; }); }, 1000); return () => clearInterval(iv); }, [i, paused]);
  const m = d.list[i];
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', animation: 'iam-up 260ms var(--ease-out)' }}>
      <div class="row" style={{ gap: 4, padding: '8px 8px 0' }}><button class="btn icon" onClick={back} aria-label="ปิด"><Icon n="close" /></button><span class="grow" style={{ fontSize: 15, fontWeight: 600, textAlign: 'center' }}>{d.title}</span><span class="num muted" style={{ width: 48, fontSize: 14, fontWeight: 600 }}>{i + 1}/{d.list.length}</span></div>
      <div class="row" style={{ gap: 4, padding: '6px 16px 0' }}>{d.list.map((_, j) => <span style={{ flex: 1, height: 4, borderRadius: 999, background: j < i ? 'var(--recovery)' : j === i ? '#B8A8FF' : 'var(--surface-3)' }} />)}</div>
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div class="col" style={{ gap: 8 }}><ExImg name={m[0]} h={240} /><div class="row" style={{ justifyContent: 'space-between' }}><span style={{ background: 'var(--recovery-soft)', color: 'var(--recovery-ink)', padding: '5px 10px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{m[3]}</span><button class="small" style={{ fontWeight: 600, textDecoration: 'underline' }} onClick={() => push('exercise', { name: m[0] })}>ทำไม · ทำอย่างไร</button></div></div>
        <div class="row" style={{ gap: 14 }}>
          <span class="col grow" style={{ gap: 4 }}><span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25 }}>{m[0]}</span><span class="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>{m[1]}</span></span>
          <Ring value={left / m[2]} size={96} stroke={10} color="#7C5CFF" track="#E0D9FF"><span class="num" style={{ fontSize: 24, fontWeight: 700 }}>{mmss(left)}</span></Ring>
        </div>
        <span class="small muted">ต่อไป · <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{d.list[i + 1]?.[0] ?? 'จบ'}</b></span>
      </div>
      <div class="row" style={{ justifyContent: 'center', gap: 28, padding: '8px 16px calc(32px + env(safe-area-inset-bottom))' }}>
        <button class="card" style={{ width: 60, height: 60, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => go(-1)} aria-label="ย้อน"><Icon n="skip_previous" fill size={30} /></button>
        <button class="press" style={{ width: 80, height: 80, borderRadius: 999, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--primary-shadow)' }} onClick={() => setPaused(!paused)} aria-label="หยุด/เล่น"><Icon n={paused ? 'play_arrow' : 'pause'} fill size={44} /></button>
        <button class="card" style={{ width: 60, height: 60, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => go(1)} aria-label="ข้าม"><Icon n="skip_next" fill size={30} /></button>
      </div>
    </div>
  );
}

export function ProgramEdit({ id }: { id?: string }) {
  const ids = weekIds(appNow());
  const [sel, setSel] = useState(Math.max(0, ids.indexOf(id ?? ids[appNow().getDay()])));
  const day = dayById(ids[sel]);
  const upd = (j: number, k: 'sets' | 'reps' | 'rest' | 'kg', dlt: number, min: number) => (program.value = program.value.map((d) => (d.id === day.id ? { ...d, exercises: d.exercises.map((e, i) => (i === j ? { ...e, [k]: Math.max(min, +(e[k] + dlt).toFixed(1)) } : e)) } : d)));
  const del = (j: number) => { const before = program.value, name = day.exercises[j].name; program.value = program.value.map((d) => (d.id === day.id ? { ...d, exercises: d.exercises.filter((_, i) => i !== j) } : d)); showUndo(`ลบ ${name}`, () => (program.value = before)); };
  const mv = (j: number, to: number) => (program.value = program.value.map((d) => { if (d.id !== day.id) return d; const ex = [...d.exercises]; const [m] = ex.splice(j, 1); ex.splice(to, 0, m); return { ...d, exercises: ex }; }));
  const rename = () => { const n = prompt('ชื่อวันนี้', day.name); if (n?.trim()) program.value = program.value.map((d) => (d.id === day.id ? { ...d, name: n.trim() } : d)); };
  return (
    <div class="screen sub" style={{ gap: 10 }}>
      <TopBar title="แก้โปรแกรม" onBack={back} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => { const on = wd === sel, dp = dayById(ids[wd]); return (
          <button style={{ height: 56, borderRadius: 14, background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }} onClick={() => setSel(wd)}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{DOW_SHORT[wd]}</span><Icon n={kindIcon(dp.kind)} fill size={14} color={on ? '#fff' : 'var(--ink-2)'} /></button>); })}
      </div>
      <button class="row" style={{ gap: 8, textAlign: 'left', marginTop: 4 }} onClick={rename}><span style={{ fontSize: 24, fontWeight: 600 }}>{day.name}</span><Icon n="edit" size={18} color="var(--ink-2)" /></button>
      {day.kind !== 'lift' && day.exercises.length === 0 && <div class="card small muted" style={{ padding: 16, lineHeight: 1.55 }}>วันนี้ไม่มีท่าน้ำหนัก ลากวันในหน้าสัปดาห์เพื่อสลับได้ หรือเพิ่มท่าจากคลัง</div>}
      {day.exercises.map((e, j) => (
        <div class="card" style={{ borderRadius: 18, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div class="row" style={{ gap: 4 }}>
            <span class="col grow"><span class="t16">{e.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{e.eq} · {e.unit === 'BW' ? 'ตัวเปล่า' : `${e.kg} ${e.unit}`}</span></span>
            <button class="btn icon" disabled={j === 0} onClick={() => mv(j, j - 1)} aria-label="ขึ้น"><Icon n="arrow_upward" size={20} color="var(--ink-2)" /></button>
            <button class="btn icon" onClick={() => del(j)} aria-label="ลบท่า"><Icon n="delete" size={22} color="var(--ink-2)" /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {([['เซ็ต', 'sets', 1, 1], [e.repUnit, 'reps', 1, 1], ['พัก (วิ)', 'rest', 15, 0], [e.unit === 'BW' ? '—' : e.unit, 'kg', e.step, 0]] as const).map(([l, k, st, mn]) => (
              <div class="col" style={{ gap: 2 }}><span class="muted" style={{ fontSize: 11.5, fontWeight: 600, paddingLeft: 4 }}>{l}</span>
                <div class="row" style={{ background: 'var(--bg)', borderRadius: 12, height: 44, gap: 0 }}><button style={{ width: 26, height: 44 }} onClick={() => upd(j, k, -st, mn)} aria-label="ลด"><Icon n="remove" size={16} /></button><span class="num grow" style={{ textAlign: 'center', fontSize: 15, fontWeight: 600 }}>{e[k]}</span><button style={{ width: 26, height: 44 }} onClick={() => upd(j, k, st, mn)} aria-label="เพิ่ม"><Icon n="add" size={16} /></button></div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button style={{ minHeight: 56, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15.5, fontWeight: 600 }} onClick={() => push('library', { ctx: 'program', dayId: day.id })}><Icon n="add" size={22} />เพิ่มท่าจากคลัง</button>
      <span class="cap muted" style={{ padding: '0 4px' }}>น้ำหนักตรงนี้คือค่าเริ่มต้น ครั้งต่อไปแอปจะใช้ค่าจากที่ซ้อมจริงและแนะนำเพิ่มเอง</span>
    </div>
  );
}

export function Library({ ctx, dayId }: { ctx: 'log' | 'program'; dayId?: string }) {
  const [q, setQ] = useState(''), [eqf, setEqf] = useState<string[]>([]);
  const list = LIB.filter((l) => (!q || l[0].toLowerCase().includes(q.toLowerCase())) && (!eqf.length || l[1].some((e) => eqf.includes(e))));
  const addOne = (name: string) => {
    const ne = exFromLib(name);
    if (ctx === 'log' && active.value) { const a = JSON.parse(JSON.stringify(active.value)); a.ex.push(exLogFrom(ne)); a.cur = a.ex.length - 1; active.value = a; toast(`เพิ่ม ${name} · แค่วันนี้`); back(); return; }
    program.value = program.value.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, ne] } : d)); toast(`เพิ่ม ${name}`); back();
  };
  return (
    <div class="screen sub" style={{ gap: 10 }}>
      <TopBar title="คลังท่า" onBack={back} />
      <div class="card row" style={{ borderRadius: 999, height: 52, padding: '0 16px', gap: 8 }}><Icon n="search" size={22} color="var(--ink-2)" /><input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="ค้นหาท่า" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 16 }} /></div>
      <div class="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>{EQ.map((l) => { const on = eqf.includes(l); return <button style={{ height: 40, flex: 'none', padding: '0 14px', borderRadius: 999, background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }} onClick={() => setEqf(on ? eqf.filter((x) => x !== l) : [...eqf, l])}>{l}</button>; })}</div>
      <div class="card" style={{ padding: '6px 6px 6px 14px' }}>
        {list.map((l, i) => <div class="row" style={{ gap: 10, minHeight: 60, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><button class="col grow" style={{ textAlign: 'left' }} onClick={() => push('exercise', { name: l[0] })}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{l[0]}</span><span class="muted" style={{ fontSize: 12.5 }}>{l[2]} · {l[1].join(' + ')}</span></button><button class="btn icon" style={{ background: 'var(--bg)' }} onClick={() => addOne(l[0])} aria-label="เพิ่ม"><Icon n="add" size={22} /></button></div>)}
        {list.length === 0 && <div class="small muted" style={{ padding: '16px 0' }}>ไม่เจอท่านี้ ลองลบตัวกรองอุปกรณ์</div>}
      </div>
    </div>
  );
}

export function History({ name: name0 }: { name?: string }) {
  const names = [...new Set(program.value.flatMap((d) => d.exercises.filter((e) => e.unit === 'kg').map((e) => e.name)))];
  const [name, setName] = useState(name0 ?? names[0]);
  const [m, setM] = useState<'w' | 'r'>('w');
  const h = history(name), vals = h.map((x) => (m === 'w' ? x.kg : x.reps));
  const lo = vals.length ? Math.min(...vals) - 2 : 0, hi = vals.length ? Math.max(...vals) + 2 : 10;
  const px = (i: number) => 28 + (vals.length > 1 ? (i / (vals.length - 1)) * 292 : 146), py = (v: number) => 140 - ((v - lo) / (hi - lo || 1)) * 124;
  const pts = vals.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const last = h.at(-1), first = h[0];
  const c = m === 'w' ? '#22B455' : '#2F7BFF';
  const fmtD = (k: string) => { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title="ประวัติท่า" onBack={back} />
      <select class="field" value={name} onChange={(e) => setName((e.target as HTMLSelectElement).value)}>{names.map((n) => <option value={n}>{n}</option>)}</select>
      <Seg value={m} onChange={setM} options={[['w', 'น้ำหนัก'], ['r', 'ครั้ง']]} />
      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {h.length === 0 ? <div class="empty"><Icon n="show_chart" size={40} color="var(--ink-3)" /><span class="muted">ยังไม่มีประวัติ ซ้อมท่านี้สักครั้งแล้วกราฟจะขึ้น</span></div> : <>
          <div class="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span class="col"><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>{m === 'w' ? 'น้ำหนักต่อข้าง สูงสุด' : 'ครั้งของเซ็ตหนักสุด'}</span><span class="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.15 }}>{m === 'w' ? `${last!.kg} kg × ${last!.reps}` : `${last!.reps} ครั้ง @ ${last!.kg} kg`}</span></span>
            {h.length > 1 && <span style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 10px 0 6px', borderRadius: 999, background: 'var(--success-tint)', color: 'var(--workout-ink)', fontSize: 14, fontWeight: 600 }}><Icon n="arrow_upward" size={18} />{m === 'w' ? `${+(last!.kg - first.kg).toFixed(1)} kg` : `${last!.reps - first.reps}`}</span>}
          </div>
          <svg viewBox="0 0 326 170" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <polygon points={`28,140 ${pts} ${px(vals.length - 1)},140`} fill={c} opacity={0.1} />
            <polyline points={pts} fill="none" stroke={c} stroke-width={3} stroke-linejoin="round" stroke-linecap="round" />
            {vals.map((v, i) => <circle cx={px(i)} cy={py(v)} r={i === vals.length - 1 ? 6 : 4} fill={i === vals.length - 1 ? c : '#fff'} stroke={c} stroke-width={2.5} />)}
            <text x="28" y="166" fill="#6B6962" style={{ font: "500 11px 'Anuphan',sans-serif" }}>{fmtD(first.date)}</text>
            <text x="320" y="166" fill="#6B6962" text-anchor="end" style={{ font: "500 11px 'Anuphan',sans-serif" }}>{fmtD(last!.date)}</text>
          </svg>
        </>}
      </div>
      {h.length > 0 && <div class="card" style={{ padding: '6px 14px' }}>{[...h].reverse().slice(0, 8).map((x, i) => <div class="row" style={{ minHeight: 56, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span class="muted" style={{ width: 64, fontSize: 14 }}>{fmtD(x.date)}</span><span class="num grow" style={{ fontSize: 16, fontWeight: 600 }}>{x.kg} kg × {x.reps}</span></div>)}</div>}
    </div>
  );
}
