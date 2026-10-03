import { useState } from 'preact/hooks';
import { Icon, Ring, ROLE } from '../../ui/kit';
import { back } from '../../store/nav';
import { thDate, fromMin, toMin, addDays, dayKey } from '../../domain/time';
import { addBlock, blocksFor, editBlock, setStatus } from '../../domain/plan';
import { asleep, goToSleep, cancelSleep } from '../../domain/sleep';
import { program, weekIds, swapDays } from '../../domain/training';
import { profile } from '../../domain/profile';
import { totalsOn, targetsFor } from '../../domain/food';
import { dayView } from './logic';

export function CloseDay() {
  const v = dayView(), { date, key } = v;
  const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
  const t = targetsFor(date), have = totalsOn(date), protMiss = Math.round(t.p - have.p);
  const tm = addDays(date, 1), tmKey = dayKey(tm);
  const wakeBlk = blocksFor(tm)[0];
  const missed = [...v.missed.filter((b) => b.kind !== 'close' && b.kind !== 'sleep').map((b) => ({ id: b.id, icon: b.icon, t: b.title, sub: `${fromMin(b.start)} · ${b.sub ?? ''}`, blk: b })),
    ...(protMiss > 10 ? [{ id: 'protein', icon: 'egg', t: `โปรตีนขาด ${protMiss} g`, sub: `ได้ ${have.p} / ${t.p} g`, blk: null }] : [])];
  const [miss, setMiss] = useState<Record<string, 0 | 1>>({});
  const wakeOpts = ['07:15', '07:45', '08:15'];
  const [wake, setWake] = useState<string | null>(null);
  const tmPlanId = weekIds(tm)[tm.getDay()];
  const liftOpts = program.value.filter((p) => p.kind !== 'rest').slice(0, 2).map((p) => p.id);
  const trainOpts = [...new Set([tmPlanId, ...liftOpts, 'rest'])].slice(0, 3);
  const [train, setTrain] = useState<string | null>(null);
  const lunchOpts = ['meal prep', 'ซื้อข้างนอก'];
  const [lunch, setLunch] = useState<number | null>(null);
  const setN = [wake, train, lunch].filter((x) => x != null).length;
  const sel = (on: boolean) => ({ background: on ? 'var(--ink)' : 'var(--bg)', color: on ? '#fff' : 'var(--ink)' });

  const sleep = () => {
    for (const m of missed) if (m.blk && miss[m.id] === 0) addBlock(tmKey, { ...m.blk, days: [], sub: 'ย้ายมาจากเมื่อวาน' }, 'today', tm);
    for (const m of missed) if (m.blk) setStatus(key, m.id, miss[m.id] === 0 ? 'skip' : 'miss');
    if (wake) { profile.value = { ...profile.value }; const wb = blocksFor(tm).find((b) => b.kind === 'weigh'); if (wb) editBlock(tmKey, wb, { start: toMin(wake) }, 'today'); }
    if (train && train !== tmPlanId) { const ids = weekIds(tm), j = ids.indexOf(train); if (j >= 0) swapDays(tm, tm.getDay(), j); }
    if (lunch === 1) { const lb = blocksFor(tm).find((b) => b.kind === 'meal' && b.start >= 12 * 60 && b.start < 14 * 60); if (lb) editBlock(tmKey, lb, { sub: 'ซื้อข้างนอก · เลือกโปรตีนสูง ≤ 150 ฿' }, 'today'); }
    const closeBlk = v.blocks.find((b) => b.kind === 'close'); if (closeBlk) setStatus(key, closeBlk.id, 'done');
    goToSleep();
  };

  if (asleep.value) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--ink)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center', animation: 'iam-fade 400ms ease-out' }}>
        <span style={{ position: 'relative', width: 96, height: 96, borderRadius: 999, background: 'rgba(124,92,255,.25)', color: '#C9B8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iam-pop 600ms var(--ease-spring)' }}><Icon n="bedtime" fill size={48} /></span>
        <span style={{ fontSize: 26, fontWeight: 600, marginTop: 8 }}>ฝันดีนะ</span>
        <span style={{ fontSize: 16, lineHeight: 1.55, color: '#C9C6BD' }}>ปลุก {wake ?? fromMin(wakeBlk?.start ?? toMin(profile.value.wake))}<br />วางมือถือได้แล้ว เปิดแอปพรุ่งนี้เช้าระบบจะจับเวลานอนให้เอง</span>
        <button class="btn" style={{ marginTop: 12, background: 'rgba(255,255,255,.12)', color: '#fff' }} onClick={() => { cancelSleep(); back(); }}>ยังไม่นอน</button>
      </div>
    );
  }

  return (
    <div class="screen sub" style={{ gap: 14, paddingBottom: 130 }}>
      <div class="row" style={{ marginLeft: -12 }}><button class="btn icon" onClick={back} aria-label="ปิด"><Icon n="close" size={26} /></button><span class="small muted" style={{ fontWeight: 500 }}>ปิดวัน · {thDate(date)}</span></div>
      <div class="card row" style={{ borderRadius: 22, padding: 20, gap: 18 }}>
        <Ring value={pct / 100} size={120} stroke={14} color={ROLE.workout.c} track={ROLE.workout.tint}><span class="num" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1 }}>{pct}<span style={{ fontSize: 18 }}>%</span></span><span class="muted" style={{ fontSize: 12 }}>ทำได้</span></Ring>
        <span class="col grow" style={{ gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.35 }}>{pct >= 85 ? 'วันดีมาก' : pct >= 60 ? 'วันดีนะ ไปต่อพรุ่งนี้' : 'พรุ่งนี้เริ่มใหม่ได้'}</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--success-tint)', color: 'var(--success)', fontSize: 12.5, fontWeight: 600, padding: '4px 8px', borderRadius: 8 }}>เสร็จ {v.done}</span>
            <span style={{ background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, padding: '4px 8px', borderRadius: 8 }}>ข้าม {v.blocks.filter((b) => b.st === 'skip').length}</span>
            <span style={{ background: 'var(--error-tint)', color: 'var(--error)', fontSize: 12.5, fontWeight: 600, padding: '4px 8px', borderRadius: 8 }}>พลาด {v.missed.length}</span>
          </span>
        </span>
      </div>

      {missed.length > 0 && (
        <div class="card" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span class="title">สิ่งที่พลาด</span>
          {missed.map((m) => (
            <div class="col" style={{ gap: 8, padding: '8px 0' }}>
              <div class="row" style={{ gap: 10 }}><span class="medal" style={{ width: 36, height: 36, background: 'var(--error-tint)', color: 'var(--error)' }}><Icon n={m.icon} size={20} /></span><span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{m.t}</span><span class="cap muted">{m.sub}</span></span></div>
              {m.blk && <div class="row" style={{ gap: 6, paddingLeft: 46 }}>{['ย้ายไปพรุ่งนี้', 'ปล่อยไป'].map((o, j) => <button class="btn" style={{ height: 40, padding: '0 14px', fontSize: 14, ...sel(miss[m.id] === j) }} onClick={() => setMiss({ ...miss, [m.id]: j as 0 | 1 })}>{o}</button>)}</div>}
            </div>
          ))}
        </div>
      )}

      <div class="card" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div class="row" style={{ justifyContent: 'space-between' }}><span class="title">ตั้งพรุ่งนี้ใน 1 นาที</span><span class="muted" style={{ fontSize: 13, fontWeight: 600, background: 'var(--bg)', padding: '5px 10px', borderRadius: 999 }}>{setN} / 3</span></div>
        {([
          ['ตื่นกี่โมง', 'alarm', 'recovery', wakeOpts.map((o) => [o, o]), wake, setWake],
          ['ซ้อมอะไร', 'fitness_center', 'workout', trainOpts.map((id) => [id, program.value.find((p) => p.id === id)?.name ?? id]), train, setTrain],
          ['มื้อกลางวัน', 'restaurant', 'food', lunchOpts.map((o, i) => [i, o]), lunch, setLunch],
        ] as const).map(([q, icon, role, opts, val, set]) => (
          <div class="col" style={{ gap: 8 }}>
            <span class="row" style={{ gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}><Icon n={icon} fill size={18} color={ROLE[role].ink} />{q}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{opts.map(([k, l]) => <button class="btn" style={{ fontSize: 14.5, ...sel(val === k) }} onClick={() => (set as (x: unknown) => void)(k)}>{l}</button>)}</div>
          </div>
        ))}
      </div>

      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px, 100%)', bottom: 0, padding: '16px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)', zIndex: 6 }}>
        <button class="btn primary lg block" onClick={sleep}><Icon n="bedtime" fill />นอนแล้ว</button>
      </div>
    </div>
  );
}
