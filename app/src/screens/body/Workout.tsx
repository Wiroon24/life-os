import { useEffect, useState } from 'preact/hooks';
import { Icon, Ring, Burst } from '../../ui/kit';
import { ExImg } from './ExerciseInfo';
import { back, push, stack } from '../../store/nav';
import { openSheet, closeSheet, askScope, toast } from '../../store/ui';
import { alertNow, ensurePermission } from '../../store/notify';
import { thDate } from '../../domain/time';
import { appNow } from '../../domain/plan';
import { active, planFor, startWorkout, finishWorkout, estMinutes, suggest, volumeOf, prsOf, warmDone, weekCount, program, LIB, exFromLib, exLogFrom, workouts, type ExLog } from '../../domain/training';
import { dayKey } from '../../domain/time';
import { useBack } from '../../ui/back';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const fmtSet = (kg: number | undefined, r: number | undefined, e: ExLog) => r == null ? '—' : e.unit === 'BW' ? `${r}${e.repUnit !== 'ครั้ง' ? ' ' + e.repUnit : ''}` : e.repUnit === 'นาที' ? `${r} นาที` : `${kg} × ${r}`;
const RPE: [number, string, string][] = [[3, 'สบาย', '#137A38'], [6, 'กำลังดี', '#137A38'], [8, 'หนักแต่ไหว', '#9A5800'], [9, 'หนักมาก', '#B83A1C'], [10, 'สุดแรง', '#D92D20']];

export function Workout() {
  const date = appNow(), p = planFor(date), a = active.value;
  const finished = workouts.value.find((w) => w.date === dayKey(date));
  const [scr, setScr] = useState<'preview' | 'log' | 'finish'>(a ? 'log' : finished ? 'finish' : 'preview');
  const [, setT] = useState(0);
  const [rpe, setRpe] = useState<number | null>(finished?.rpe ?? null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setT((x) => x + 1);
      const cur = active.value;
      if (cur?.rest && Date.now() >= cur.rest.until) { active.value = { ...cur, rest: null }; alertNow('หมดเวลาพัก', 'ลุยเซ็ตถัดไป'); toast('หมดเวลาพัก · ลุยเซ็ตถัดไป'); }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useBack(() => { const r = active.value?.rest; if (r && !r.min) { active.value = { ...active.value!, rest: { ...r, min: true } }; return true; } return false; }, !!(a?.rest && !a.rest.min));
  const setA = (f: (x: NonNullable<typeof a>) => void) => { const c = active.value; if (!c) return; const n = JSON.parse(JSON.stringify(c)); f(n); active.value = n; };

  /* ---------- Preview ---------- */
  if (scr === 'preview') {
    const min = estMinutes(p), warmed = warmDone.value === dayKey(date);
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', animation: 'iam-up 260ms var(--ease-out)' }}>
        <div style={{ padding: '8px 8px 0' }}><button class="btn icon" onClick={back} aria-label="กลับ"><Icon n="arrow_back" /></button></div>
        <div style={{ flex: 1, padding: '4px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div class="col" style={{ gap: 8 }}><span class="small muted" style={{ fontWeight: 500 }}>{thDate(date)} · ก่อนเริ่มซ้อม</span><span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{[`${p.exercises.length} ท่า`, `~${min} นาที`, `${p.exercises.reduce((x, e) => x + e.sets, 0)} เซ็ต`].map((c) => <span style={{ background: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}>{c}</span>)}</div></div>
          <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--recovery-soft)', borderRadius: 20, padding: '14px 8px 14px 14px', textAlign: 'left' }} onClick={() => push('mobility', { kind: 'warm' })}>
            <span class="medal" style={{ background: '#fff', color: 'var(--recovery-ink)' }}><Icon n="directions_walk" fill /></span>
            <span class="col grow"><span class="t16">วอร์มข้อเท้าและเข่า</span><span style={{ fontSize: 13, color: 'var(--recovery-ink)', fontWeight: 500 }}>8 นาที · 6 ท่า · เล่นตาม</span></span>
            {warmed && <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--check)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="check" size={18} /></span>}
            <Icon n="play_circle" color="var(--recovery-ink)" style={{ width: 36, textAlign: 'center' }} />
          </button>
          <div class="card" style={{ padding: '6px 14px' }}>
            {p.exercises.map((e, i) => { const s = suggest(e); return (
              <div class="row" style={{ minHeight: 64, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
                <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: 'var(--surface-2)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <button class="col grow" style={{ textAlign: 'left' }} onClick={() => push('exercise', { name: e.name })}><span class="t16">{e.name}</span><span class="cap muted">{e.sets} × {e.reps}{e.repUnit !== 'ครั้ง' ? ' ' + e.repUnit : ''} · {e.unit === 'BW' ? 'ตัวเปล่า' : e.unit === 'kg' ? `${s.kg} kg` : `${e.kg}${e.unit}`}</span></button>
                <span class="num cap muted">~{Math.round(e.sets * (0.75 + e.rest / 60) + (e.repUnit === 'นาที' ? e.reps : 0))} น.</span>
              </div>); })}
          </div>
        </div>
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)' }}>
          <button class="btn primary block" style={{ height: 60, fontSize: 20 }} onClick={() => { ensurePermission(); if (!active.value) startWorkout(date); setScr('log'); }}><Icon n="play_arrow" fill size={26} />เริ่ม</button>
        </div>
      </div>
    );
  }

  /* ---------- Finish ---------- */
  if (scr === 'finish') {
    const w = finished ?? (a ? { ...a, t1: Date.now() } : null);
    if (!w) return null;
    const vol = volumeOf(w), sets = w.ex.reduce((x, e) => x + e.sets.filter((s) => s.done).length, 0), prs = prsOf(w as never);
    const meta = rpe ? RPE.find((r) => rpe <= r[0])! : null;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', animation: 'iam-fade 240ms ease-out' }}>
        <div style={{ flex: 1, padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div class="col" style={{ alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <span style={{ position: 'relative', width: 96, height: 96, borderRadius: 999, background: 'var(--success-tint)', color: 'var(--check)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iam-pop 560ms var(--ease-spring)' }}><Icon n="trophy" fill size={52} /><Burst k={burst || 1} colors={['#FF9F1C', '#22B455', '#7C5CFF', '#2F7BFF', '#FF5A36', '#FFC93C']} dist={110} n={20} /></span>
            <span style={{ fontSize: 30, fontWeight: 700 }}>ซ้อมเสร็จแล้ว!</span><span class="muted" style={{ fontSize: 15 }}>{w.dayName} · สัปดาห์นี้ครั้งที่ {weekCount(date) + (finished ? 0 : 1)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[['เวลารวม', `${Math.max(1, Math.round(((w.t1 ?? Date.now()) - w.t0) / 60000))} นาที`], ['ปริมาณรวม', `${Math.round(vol).toLocaleString()} kg`], ['เซ็ต', String(sets)]].map(([l, v]) => <div class="card" style={{ borderRadius: 18, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span><span class="num" style={{ fontSize: 22, fontWeight: 600 }}>{v}</span></div>)}
          </div>
          {prs.length > 0 && <div style={{ background: 'var(--food-soft)', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div class="row" style={{ gap: 8 }}><Icon n="military_tech" fill size={22} color="var(--food-ink)" /><span style={{ fontSize: 17, fontWeight: 700, color: 'var(--food-ink)' }}>สถิติใหม่ {prs.length} รายการ</span></div>
            {prs.map((x) => <div class="row" style={{ background: '#fff', borderRadius: 16, padding: '10px 12px', minHeight: 60 }}><span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{x.n}</span><span class="cap muted">ก่อนหน้า {x.before}</span></span><span class="col" style={{ alignItems: 'flex-end' }}><span class="num" style={{ fontSize: 18, fontWeight: 700 }}>{x.now}</span><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--workout-ink)' }}>{x.gain}</span></span></div>)}
          </div>}
          <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div class="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 17, fontWeight: 600 }}>เหนื่อยแค่ไหน</span><span style={{ fontSize: 14, fontWeight: 600, color: meta ? meta[2] : 'var(--ink-2)' }}>{meta ? `${rpe} · ${meta[1]}` : 'แตะ 1–10'}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button class="press" style={{ height: 52, borderRadius: 14, background: rpe === n ? 'var(--ink)' : 'var(--bg)', color: rpe === n ? '#fff' : 'var(--ink)', fontSize: 18, fontWeight: 700 }} onClick={() => setRpe(n)}>{n}</button>)}</div>
          </div>
        </div>
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)' }}>
          <button class="btn lg block" style={{ background: rpe ? 'var(--primary)' : 'var(--surface-2)', color: rpe ? '#fff' : 'var(--ink-2)', fontSize: 19 }} onClick={() => {
            if (!rpe) return toast('ให้คะแนนความเหนื่อยก่อน');
            if (finished) { workouts.value = workouts.value.map((x) => (x.id === finished.id ? { ...x, rpe } : x)); back(); return; }
            finishWorkout(rpe); toast(`บันทึกแล้ว · เหนื่อย ${rpe}/10`); stack.value = []; }}>{finished ? 'บันทึก' : 'บันทึกการซ้อม'}</button>
        </div>
      </div>
    );
  }

  /* ---------- Log ---------- */
  if (!a) return null;
  const ex = a.ex[a.cur], ai = ex ? ex.sets.findIndex((s) => !s.done) : -1;
  const allDone = a.ex.every((e) => e.sets.every((s) => s.done)), exDone = ex?.sets.every((s) => s.done);
  const nextIdx = a.ex.findIndex((e, i) => i > a.cur && e.sets.some((s) => !s.done)), firstOpen = a.ex.findIndex((e) => e.sets.some((s) => !s.done));
  const nIdx = nextIdx > -1 ? nextIdx : firstOpen !== a.cur ? firstOpen : -1;
  const restLeft = a.rest ? Math.ceil((a.rest.until - Date.now()) / 1000) : 0;
  const upNext = ex && ai > -1 ? `${ex.name} · เซ็ต ${ai + 1} · ${fmtSet(ex.sets[ai].kg, ex.sets[ai].reps, ex)}` : nIdx > -1 ? a.ex[nIdx].name : 'จบการซ้อม';

  const doneSet = () => {
    const last = ai === ex.sets.length - 1;
    setA((x) => { const s = x.ex[x.cur].sets; s[ai].done = true; if (s[ai + 1] && !s[ai + 1].done) s[ai + 1].kg = s[ai].kg; x.rest = ex.rest ? { until: Date.now() + ex.rest * 1000, total: ex.rest, min: false } : null; });
    setJustDone(`${a.cur}-${ai}`);
    if (last && !ex.rest) toast('ท่านี้ครบแล้ว');
  };
  const adj = (k: 'kg' | 'reps', d: number) => setA((x) => { const s = x.ex[x.cur].sets[ai]; s[k] = Math.max(k === 'kg' ? 0 : 1, +(s[k] + d).toFixed(1)); });

  const menu = () => openSheet({ title: ex.name, body: () => (
    <div class="col" style={{ gap: 2 }}>
      {([['สลับท่า', 'swap_horiz', swapSheet], ['เพิ่มท่า', 'add', () => { closeSheet(); push('library', { ctx: 'log' }); }], ['เรียงท่า', 'drag_indicator', orderSheet], ['ลบท่านี้', 'delete', delEx], ['จบการซ้อม', 'flag', () => { closeSheet(); setA((x) => { x.rest = null; }); setBurst((b) => b + 1); setScr('finish'); }]] as [string, string, () => void][]).map(([l, ic, go]) => (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 56, padding: '0 8px', borderRadius: 14, textAlign: 'left', color: ic === 'delete' ? 'var(--error)' : 'var(--ink)' }} onClick={go}><Icon n={ic} /><span class="t16">{l}</span></button>
      ))}
    </div>) });
  const alsoProgram = async (msg: string, f: (exs: typeof program.value[number]['exercises']) => typeof program.value[number]['exercises']) => {
    const scope = await askScope(msg); if (!scope) return false;
    if (scope === 'always') program.value = program.value.map((d) => (d.id === a.dayId ? { ...d, exercises: f(d.exercises) } : d));
    toast(`${msg} · ${scope === 'always' ? 'ทุกครั้ง' : 'แค่วันนี้'}`); return true;
  };
  const delEx = async () => { closeSheet(); const name = ex.name; if (!(await alsoProgram(`ลบ ${name}`, (l) => l.filter((e) => e.name !== name)))) return; setA((x) => { x.ex.splice(x.cur, 1); x.cur = Math.max(0, Math.min(x.cur, x.ex.length - 1)); }); };
  const swapSheet = () => {
    const muscle = ex.muscle, opts = LIB.filter((l) => l[2] === muscle && l[0] !== ex.name && !a.ex.some((e) => e.name === l[0])).slice(0, 5);
    openSheet({ title: 'สลับเป็นท่าไหน', body: () => (
      <div class="col" style={{ gap: 6 }}><span class="small muted" style={{ marginTop: -8 }}>กล้ามมัดเดียวกัน ใช้อุปกรณ์ที่มี</span>
        {opts.length === 0 && <span class="muted">ไม่มีท่าทดแทนในคลัง</span>}
        {opts.map((l) => <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '0 14px', borderRadius: 16, background: 'var(--bg)', textAlign: 'left' }} onClick={async () => {
          closeSheet(); const from = ex.name, ne = exFromLib(l[0]);
          if (!(await alsoProgram(`สลับเป็น ${l[0]}`, (lst) => lst.map((e) => (e.name === from ? { ...ne, sets: e.sets, reps: e.reps, rest: e.rest } : e))))) return;
          setA((x) => { const lg = exLogFrom(ne); x.ex[x.cur] = { ...lg, sets: x.ex[x.cur].sets.map((s) => ({ ...lg.sets[0], done: s.done })) }; });
        }}><span class="col grow"><span class="t16">{l[0]}</span><span class="cap muted">{l[1].join(' + ')}</span></span><Icon n="swap_horiz" size={22} /></button>)}
      </div>) });
  };
  const orderSheet = () => openSheet({ title: 'เรียงท่า', body: () => <OrderList /> });

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <div class="row" style={{ gap: 4, padding: '8px 8px 0' }}>
          <button class="btn icon" onClick={back} aria-label="ย่อ"><Icon n="keyboard_arrow_down" size={26} /></button>
          <span class="col grow" style={{ alignItems: 'center' }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>{a.dayName}</span><span class="num" style={{ fontSize: 15, fontWeight: 600 }}>{mmss(Math.floor((Date.now() - a.t0) / 1000))}</span></span>
          <button class="btn icon" onClick={menu} aria-label="จัดการท่า"><Icon n="more_vert" /></button>
        </div>
        <div class="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 16px 4px' }}>
          {a.ex.map((e, i) => { const d = e.sets.every((s) => s.done), on = i === a.cur; return (
            <button style={{ height: 40, flex: 'none', padding: '0 12px 0 6px', borderRadius: 999, background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }} onClick={() => setA((x) => { x.cur = i; })}>
              <span style={{ width: 28, height: 28, borderRadius: 999, background: d ? 'var(--check)' : on ? 'rgba(255,255,255,.16)' : 'var(--surface-2)', color: d ? '#fff' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700 }}>{d ? '✓' : i + 1}</span>{e.name.length > 14 ? e.name.slice(0, 13) + '…' : e.name}
            </button>); })}
        </div>
        {a.rest?.min && <button style={{ margin: '6px 16px 0', width: 'calc(100% - 32px)', height: 48, borderRadius: 999, background: 'var(--recovery-ink)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 16px', animation: 'iam-up 220ms var(--ease-out)' }} onClick={() => setA((x) => { x.rest!.min = false; })}>
          <Icon n="timer" fill size={20} /><span style={{ fontSize: 15, fontWeight: 600 }}>พัก</span><span class="num" style={{ fontSize: 17, fontWeight: 700 }}>{mmss(restLeft)}</span>
          <span style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(restLeft / a.rest.total) * 100}%`, background: '#fff', borderRadius: 999, transition: 'width 1s linear' }} /></span>
          <Icon n="open_in_full" size={22} style={{ width: 32 }} /></button>}
      </div>

      {ex ? <div style={{ flex: 1, padding: '12px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>ท่า {a.cur + 1}/{a.ex.length} · {ex.eq}</span><span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>{ex.name}</span><span class="small muted">{ex.target}</span></div>
        <ExImg name={ex.name} h={170} /><button class="small" style={{ alignSelf: 'flex-start', fontWeight: 600, textDecoration: 'underline' }} onClick={() => push('exercise', { name: ex.name })}>ทำไมท่านี้ · ทำอย่างไร</button>
        {ex.hint && <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--success-tint)', color: 'var(--workout-ink)', height: 36, padding: '0 12px', borderRadius: 999, fontSize: 14.5, fontWeight: 600 }}><Icon n={/\+/.test(ex.hint) ? 'trending_up' : 'tips_and_updates'} fill size={18} />{ex.hint}</span>}
        <div class="col" style={{ gap: 6 }}>
          {ex.sets.map((s, i) => i === ai ? (
            <div style={{ background: '#fff', borderRadius: 22, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 0 0 2px var(--ink), 0 8px 20px rgba(23,24,28,.08)' }}>
              <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 17, fontWeight: 700 }}>เซ็ต {i + 1}</span><span class="num" style={{ fontSize: 14, color: 'var(--ink-3)' }}>ครั้งก่อน {fmtSet(s.pkg, s.preps, ex)}</span></div>
              <div class="row" style={{ gap: 10 }}>
                <div class="grow" style={{ display: 'grid', gridTemplateColumns: ex.unit === 'BW' ? '1fr' : '1fr 1fr', gap: 8 }}>
                  {ex.unit !== 'BW' && <StepBox label={ex.unit} v={s.kg} dn={() => adj('kg', -ex.step)} up={() => adj('kg', ex.step)} />}
                  <StepBox label={ex.repUnit} v={s.reps} dn={() => adj('reps', -1)} up={() => adj('reps', 1)} />
                </div>
                <button class="press" onClick={doneSet} aria-label="เซ็ตนี้เสร็จ" style={{ width: 76, height: 76, flex: 'none', alignSelf: 'flex-end', borderRadius: 999, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--primary-shadow)' }}><Icon n="check" size={44} style={{ fontVariationSettings: "'wght' 600" }} /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setA((x) => { x.ex[x.cur].sets[i].done = !x.ex[x.cur].sets[i].done; })} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto 44px', gap: 10, alignItems: 'center', minHeight: 56, padding: '0 6px 0 12px', borderRadius: 16, background: s.done ? '#fff' : 'transparent', textAlign: 'left' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: s.done ? 'var(--workout-ink)' : 'var(--ink-3)' }}>{i + 1}</span>
              <span class="num" style={{ fontSize: 13, color: 'var(--ink-3)' }}>ก่อน {fmtSet(s.pkg, s.preps, ex)}</span>
              <span class="num" style={{ fontSize: 17, fontWeight: 600, color: s.done ? 'var(--ink)' : 'var(--ink-3)' }}>{fmtSet(s.kg, s.reps, ex)}</span>
              <span style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 32, height: 32, borderRadius: 999, background: s.done ? 'var(--check)' : 'transparent', boxShadow: s.done ? 'none' : 'inset 0 0 0 2px #CFCBC1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: justDone === `${a.cur}-${i}` ? 'iam-pop 420ms var(--ease-spring)' : 'none' }}>{s.done && <Icon n="check" size={20} />}</span></span>
            </button>
          ))}
          <button style={{ height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }} onClick={() => setA((x) => { const ss = x.ex[x.cur].sets, l = ss[ss.length - 1]; ss.push({ ...l, done: false }); })}><Icon n="add" size={20} />เพิ่มเซ็ต</button>
        </div>
      </div> : <div class="empty"><span class="muted">ไม่มีท่าในวันนี้</span><button class="btn soft" onClick={() => push('library', { ctx: 'log' })}>เพิ่มท่า</button></div>}

      <div class="row" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', gap: 8, background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)' }}>
        {nIdx > -1 && !allDone && <button class="btn lg grow" style={{ background: exDone ? 'var(--ink)' : 'var(--surface-2)', color: exDone ? '#fff' : 'var(--ink)', fontSize: 16, fontWeight: 600, overflow: 'hidden' }} onClick={() => setA((x) => { x.cur = nIdx; })}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ถัดไป · {a.ex[nIdx].name}</span><Icon n="arrow_forward" size={22} /></button>}
        {(allDone || nIdx === -1) && <button class="btn primary lg grow" onClick={() => { setA((x) => { x.rest = null; x.t1 = Date.now(); }); setBurst((b) => b + 1); setScr('finish'); }}><Icon n="flag" fill />จบการซ้อม</button>}
      </div>

      {a.rest && !a.rest.min && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'var(--recovery-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px calc(36px + env(safe-area-inset-bottom))', animation: 'iam-fade 200ms ease-out', maxWidth: 430, margin: '0 auto' }}>
          <div class="row" style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}><button class="btn icon" style={{ background: '#fff' }} onClick={() => setA((x) => { x.rest!.min = true; })} aria-label="ย่อ"><Icon n="close_fullscreen" /></button><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--recovery-ink)' }}>พักระหว่างเซ็ต</span><span style={{ width: 48 }} /></div>
          <div class="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <RestRing left={restLeft} total={a.rest.total} />
            <div class="col" style={{ alignItems: 'center', gap: 2 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>ถัดไป</span><span style={{ fontSize: 19, fontWeight: 600, textAlign: 'center' }}>{upNext}</span></div>
          </div>
          <div style={{ alignSelf: 'stretch', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button class="btn press" style={{ height: 60, background: '#fff', fontSize: 18, fontWeight: 700, color: 'var(--recovery-ink)' }} onClick={() => setA((x) => { x.rest!.until += 30000; x.rest!.total += 30; })}>+30 วิ</button>
            <button class="btn dark press" style={{ height: 60, fontSize: 18, fontWeight: 700 }} onClick={() => setA((x) => { x.rest = null; })}>ข้าม</button>
          </div>
        </div>
      )}
    </div>
  );
}

const StepBox = ({ label, v, dn, up }: { label: string; v: number; dn: () => void; up: () => void }) => (
  <div class="col" style={{ gap: 4 }}><span class="muted" style={{ fontSize: 12, fontWeight: 600, paddingLeft: 4 }}>{label}</span>
    <div class="row" style={{ background: 'var(--bg)', borderRadius: 14, height: 56, gap: 0 }}>
      <button style={{ width: 40, height: 56 }} onClick={dn} aria-label="ลด"><Icon n="remove" size={22} /></button>
      <span class="num grow" style={{ textAlign: 'center', fontSize: 22, fontWeight: 700 }}>{v}</span>
      <button style={{ width: 40, height: 56 }} onClick={up} aria-label="เพิ่ม"><Icon n="add" size={22} /></button>
    </div>
  </div>
);

const RestRing = ({ left, total }: { left: number; total: number }) => (
  <Ring value={Math.max(0, left) / total} size={272} stroke={16} color="#7C5CFF" track="#E0D9FF">
    <span class="num" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1 }}>{mmss(Math.max(0, left))}</span>
    <span style={{ fontSize: 14, color: 'var(--recovery-ink)', fontWeight: 600 }}>จาก {mmss(total)}</span>
  </Ring>
);

function OrderList() {
  const a = active.value; const [drag, setDrag] = useState<number | null>(null);
  if (!a) return null;
  const mv = (from: number, to: number) => { const n = JSON.parse(JSON.stringify(a)); const curName = n.ex[n.cur].name; const [m] = n.ex.splice(from, 1); n.ex.splice(to, 0, m); n.cur = n.ex.findIndex((e: ExLog) => e.name === curName); active.value = n; };
  return (
    <div class="col" style={{ gap: 6 }}>
      {a.ex.map((e, i) => (
        <div draggable onDragStart={() => setDrag(i)} onDragOver={(ev) => ev.preventDefault()} onDrop={() => { if (drag != null && drag !== i) mv(drag, i); setDrag(null); }}
          class="row" style={{ minHeight: 56, padding: '0 6px 0 14px', borderRadius: 16, background: 'var(--bg)', opacity: drag === i ? 0.4 : 1, cursor: 'grab' }}>
          <span style={{ fontSize: 14, fontWeight: 700, width: 20 }}>{i + 1}</span><span class="t16 grow">{e.name}</span>
          <button class="btn icon" disabled={i === 0} onClick={() => mv(i, i - 1)} aria-label="ขึ้น"><Icon n="arrow_upward" size={20} /></button>
          <button class="btn icon" disabled={i === a.ex.length - 1} onClick={() => mv(i, i + 1)} aria-label="ลง"><Icon n="arrow_downward" size={20} /></button>
        </div>
      ))}
      <button class="btn dark lg" style={{ marginTop: 6 }} onClick={closeSheet}>เสร็จ</button>
    </div>
  );
}
