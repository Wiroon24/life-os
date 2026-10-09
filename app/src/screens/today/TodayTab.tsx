import { useState } from 'preact/hooks';
import { Icon, Ring, ROLE, Burst, SoWhat, Medal } from '../../ui/kit';
import { ScoreCard, hasScores } from './Scores';
import { tick, toast } from '../../store/ui';
import { openBody } from '../body/BodyTab';
import { push, goTab } from '../../store/nav';
import { thDate, fromMin, addDays, dayKey } from '../../domain/time';
import { setStatus, editBlock, patchDay, addBlock, blocksFor, type Block } from '../../domain/plan';
import { medProgress, medsFor, isEvenDay } from '../../domain/meds';
import { nightFor, hoursOf, recovery } from '../../domain/sleep';
import { profile } from '../../domain/profile';
import { dayView, nowLabel, rings, soWhat } from './logic';
import { openWeigh, openFoodQuick } from '../sheets';
import { openTaskEditor } from '../task';
import { persisted } from '../../store/persist';
import { doneOn } from '../../domain/training';

export const briefSeen = persisted<string>('briefSeen', '');

function greet(now: number, done: boolean, missed: number) {
  if (done) return 'วันนี้สุดยอด';
  if (missed >= 3) return 'ยังเริ่มใหม่ได้';
  if (now < 11 * 60) return 'อรุณสวัสดิ์ ลุยกัน';
  if (now < 17 * 60) return 'บ่ายนี้สู้ต่อ';
  if (now < 22 * 60) return 'เย็นนี้อีกนิด';
  return 'อีกนิดเดียว';
}

/** What tapping the main CTA does depends on the block kind. */
function primaryFor(b: Block): { label: string; icon: string; go?: () => void } {
  switch (b.kind) {
    case 'workout': return { label: 'เริ่ม', icon: 'play_arrow', go: () => push('workout') };
    case 'meds-morning': return { label: 'เปิดรายการ', icon: 'checklist', go: () => push('meds', { slot: 'morning' }) };
    case 'meds-night': return { label: 'เปิดรายการ', icon: 'checklist', go: () => push('meds', { slot: 'night' }) };
    case 'close': return { label: 'ปิดวัน', icon: 'bedtime', go: () => push('close') };
    case 'checkin': return { label: 'เริ่มเช็กอิน', icon: 'forum', go: () => openBody('trends') };
    case 'med-item': return { label: 'เปิดรายการ', icon: 'checklist', go: () => push('meds', { slot: 'timed' }) };
    case 'weigh': return { label: 'ชั่งเลย', icon: 'monitor_weight' };
    case 'meal': return { label: 'บันทึก', icon: 'add' };
    default: return { label: 'ทำแล้ว', icon: 'check' };
  }
}

export function TodayTab() {
  tick.value; // re-render on clock tick
  const v = dayView(), { date, key, now } = v;
  const [anim, setAnim] = useState(0);
  const [plan, setPlan] = useState<'idle' | 'loading' | 'done'>('idle');
  const cur = v.pending.find((b) => b.start + b.dur + 60 >= now) ?? v.pending[0];
  const next = cur ? v.pending[v.pending.indexOf(cur) + 1] : undefined;
  const allDone = v.pending.length === 0 && v.total > 0;
  const missedMode = !allDone && v.missed.length >= 3;
  const rs = rings(date), sw = soWhat(date, now);
  const rows = hasScores(dayKey(date)) ? rs.filter((r) => r.role !== 'recovery') : rs;
  const medSlot = now < 15 * 60 ? 'morning' : 'night', mp = medProgress(medSlot, date);
  const up = v.pending.filter((b) => b !== cur && b !== next && b.start >= now - 30).slice(0, 3);
  const upcoming = [1, 2, 3, 4, 5, 6, 7].flatMap((o) => { const dd = addDays(date, o); return blocksFor(dd).filter((b) => (b.kind === 'todo' || b.kind === 'event') && b.source === 'user').map((b) => ({ b, dayLabel: o === 1 ? 'พรุ่งนี้' : thDate(dd).split(' ').slice(0, 2).join(' ') })); }).slice(0, 4);
  const showBrief = now < 13 * 60 && briefSeen.value !== key;
  const showClose = now >= 21 * 60;
  const sleptH = hoursOf(nightFor(date)), rec = recovery(date);

  const markDone = (b: Block) => { setStatus(key, b.id, 'done'); setAnim((x) => x + 1); };
  const onPrimary = (b: Block) => {
    const p = primaryFor(b);
    if (p.go) return p.go();
    if (b.kind === 'weigh') return openWeigh(() => markDone(b));
    if (b.kind === 'meal') return openFoodQuick(() => markDone(b));
    markDone(b);
  };
  const snooze = (b: Block) => { editBlock(key, b, { start: Math.max(now, b.start) + 15 }, 'today'); toast(`เลื่อนไป ${fromMin(Math.max(now, b.start) + 15)}`); };

  const replanItems = () => {
    const missedWorkout = v.missed.find((b) => b.kind === 'workout');
    const items: { time: string; t: string; sub: string; c: string }[] = [];
    if (missedWorkout) items.push({ time: fromMin(Math.max(now + 60, 19 * 60)), t: 'เดินเร็ว 30 นาที', sub: `แทน${missedWorkout.title}`, c: ROLE.workout.c });
    v.pending.filter((b) => b.kind === 'meal' || b.kind === 'sleep' || b.kind === 'meds-night').slice(0, 3).forEach((b) => items.push({ time: fromMin(b.start), t: b.title, sub: b.kind === 'meal' ? 'เน้นโปรตีนชดเชย' : b.sub ?? '', c: ROLE[b.role].c }));
    return items;
  };
  const applyReplan = () => {
    const missedWorkout = v.missed.find((b) => b.kind === 'workout');
    if (missedWorkout) addBlock(key, { title: 'เดินเร็ว 30 นาที', start: Math.max(now + 60, 19 * 60), dur: 30, role: 'workout', icon: 'directions_walk', days: [], sub: `แทน${missedWorkout.title}` }, 'today', date);
    patchDay(key, (d) => ({ ...d, st: { ...d.st, ...Object.fromEntries(v.missed.map((b) => [b.id, 'skip' as const])) } }));
    setPlan('idle'); toast('ใช้แผนใหม่แล้ว');
  };

  return (
    <div class="screen">
      <div class="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div class="col" style={{ gap: 2 }}>
          <span class="small muted" style={{ fontWeight: 500 }}>{thDate(date)}{profile.value.name ? ` · ${profile.value.name}` : ''}</span>
          <span class="h1">{greet(now, allDone, v.missed.length)}</span>
        </div>
        <div class="row" style={{ gap: 8 }}>
          <button class="card" style={{ width: 48, height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => push('timeline', { edit: true })} aria-label="แก้ตารางวัน"><Icon n="edit" /></button>
          <button style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} onClick={() => push('profile')} aria-label="โปรไฟล์">{(profile.value.name || 'I').slice(0, 1)}</button>
        </div>
      </div>

      {showBrief && (
        <button class="card press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px 12px 12px', textAlign: 'left', marginTop: -6 }} onClick={() => push('brief')}>
          <Medal icon="wb_twilight" role="recovery" />
          <span class="col grow"><span class="t16">สรุปตอนตื่น</span><span class="cap muted">{sleptH != null ? `นอน ${Math.floor(sleptH)} ชม. ${Math.round((sleptH % 1) * 60)} นาที · ฟื้นตัว ${rec}` : 'แผนวันนี้ + 3 เรื่องสำคัญ'}</span></span>
          <Icon n="chevron_right" color="var(--ink-2)" style={{ width: 40, textAlign: 'center' }} />
        </button>
      )}

      {cur && !missedMode && (
        <div class="col" style={{ gap: 8 }}>
          <div key={cur.id} style={{ position: 'relative', background: 'var(--primary)', borderRadius: 22, padding: 20, color: '#fff', boxShadow: 'var(--primary-shadow)', display: 'flex', flexDirection: 'column', gap: 16, animation: 'iam-up 260ms var(--ease-out)' }}>
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--on-primary-scrim)', padding: '7px 12px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}><Icon n={cur.icon} fill size={18} />{nowLabel(cur, now)}</span>
            <div class="col" style={{ gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{cur.title}</span>
              {(cur.meta?.length || cur.sub) && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(cur.meta ?? [cur.sub!]).map((m) => <span style={{ background: 'var(--on-primary-scrim)', padding: '5px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}>{m}</span>)}</div>}
            </div>
            <div class="row" style={{ gap: 8 }}>
              <button class="btn lg white grow" onClick={() => onPrimary(cur)}><Icon n={primaryFor(cur).icon} size={24} style={{ fontVariationSettings: "'wght' 600" }} />{primaryFor(cur).label}</button>
              <button class="btn lg scrim" style={{ fontSize: 16, fontWeight: 600 }} onClick={() => snooze(cur)}>เลื่อน</button>
              <button class="btn lg scrim" style={{ fontSize: 16, fontWeight: 600 }} onClick={() => setStatus(key, cur.id, 'skip')}>ข้าม</button>
            </div>
            <Burst k={anim} colors={['#FFFFFF', '#FFC93C', '#D3F2DD']} dist={70} />
          </div>
          {next && <div class="row small muted" style={{ gap: 10, padding: '4px 8px 0' }}><Icon n="subdirectory_arrow_right" size={18} /><span>ถัดไป <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{next.title}</b> · {fromMin(next.start)}{next.sub ? ` · ${next.sub}` : ''}</span></div>}
        </div>
      )}

      {allDone && (
        <div class="card" style={{ borderRadius: 22, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <span style={{ position: 'relative', display: 'flex', gap: 6 }}>{rs.map((r) => <Ring value={1} size={44} stroke={6} color={ROLE[r.role].c} track={ROLE[r.role].tint} />)}<Burst k={1} colors={['#FF9F1C', '#22B455', '#7C5CFF', '#2F7BFF', '#FF5A36', '#FFC93C']} dist={110} /></span>
          <span style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>ครบทุกอย่างแล้ว!</span>
          <span class="muted" style={{ fontSize: 15 }}>{v.done} / {v.total} อย่าง</span>
        </div>
      )}

      {missedMode && (
        <div class="card" style={{ borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div class="row" style={{ gap: 10 }}><Medal icon="sports" dark size={36} /><span style={{ fontSize: 15, fontWeight: 600 }}>โค้ช</span></div>
          {plan === 'idle' && <>
            <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4 }}>วันนี้หลุดไป {v.missed.length} อย่าง ไม่เป็นไร ที่เหลือยังทัน</span>
            <span style={{ fontSize: 15.5, lineHeight: 1.55 }}>ไม่ต้องชดเชยทั้งหมด เอาแค่โปรตีนให้ถึงกับนอนให้ตรงเวลา</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{v.missed.slice(0, 5).map((m) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--error-tint)', color: 'var(--error)', fontSize: 13, fontWeight: 600, padding: '5px 10px', borderRadius: 8 }}><Icon n="close" size={15} />{m.title}</span>)}</div>
            <button class="btn primary lg" onClick={() => { setPlan('loading'); setTimeout(() => setPlan('done'), 700); }}><Icon n="auto_fix_high" />จัดแผนที่เหลือใหม่</button>
          </>}
          {plan === 'loading' && <div class="row muted" style={{ gap: 10, minHeight: 120, justifyContent: 'center' }}><span class="spin" />จัดแผนให้ใหม่…</div>}
          {plan === 'done' && <div class="col" style={{ gap: 10, animation: 'iam-up 260ms var(--ease-out)' }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>แผนใหม่ เหลือ {replanItems().length} อย่าง</span>
            {replanItems().map((n) => <div class="row" style={{ background: 'var(--bg)', borderRadius: 16, padding: '10px 12px', minHeight: 56 }}><span class="num" style={{ fontSize: 14, fontWeight: 700, width: 44 }}>{n.time}</span><span style={{ width: 8, height: 8, borderRadius: 999, background: n.c }} /><span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{n.t}</span><span class="muted" style={{ fontSize: 12.5 }}>{n.sub}</span></span></div>)}
            <div class="row" style={{ gap: 8, marginTop: 4 }}><button class="btn soft" onClick={() => setPlan('idle')}>เลิกทำ</button><button class="btn dark grow" onClick={applyReplan}>ใช้แผนนี้</button></div>
          </div>}
        </div>
      )}

      <div class="col" style={{ gap: 10 }}>
        <ScoreCard date={date} />
        {/* Recovery lives in the score card when there is watch data, so the ring row doesn't repeat it. */}
        <div class="card" style={{ padding: '14px 6px 12px', display: 'grid', gridTemplateColumns: `repeat(${rows.length},1fr)` }}>
          {rows.map((r) => (
            <button class="col" style={{ alignItems: 'center', gap: 6 }} onClick={() => (r.role === 'money' ? goTab('money') : r.role === 'recovery' ? openBody('trends') : openBody(r.role === 'food' ? 'eat' : 'train'))}>
              <Ring value={r.v} size={60} stroke={8} color={ROLE[r.role].c} track={ROLE[r.role].tint}><Icon n={r.icon} fill size={22} color={ROLE[r.role].ink} /></Ring>
              <span class="col" style={{ alignItems: 'center' }}><span class="num" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{r.val}</span><span class="muted" style={{ fontSize: 11.5, lineHeight: 1.35 }}>{r.label}</span></span>
            </button>
          ))}
        </div>
        <SoWhat head={sw.head} tail={sw.tail} role={sw.role} />
      </div>

      {mp.total > 0 && (
        <button class="card press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px 12px 12px', textAlign: 'left' }} onClick={() => push('meds', { slot: medSlot })}>
          <Medal icon="medication" role="info" />
          <span class="col grow"><span class="t16">ยาและผิว · {medSlot === 'morning' ? 'เช้า' : 'ก่อนนอน'}</span><span class="cap muted">{medsFor(medSlot, date).find((m) => m.alt)?.label ? `วันนี้ใช้ ${medsFor(medSlot, date).find((m) => m.alt)!.label.replace(/^(ทา|สระผม|สระ)\s*/, '').split(' ')[0]} (${isEvenDay(date) ? 'วันคู่' : 'วันคี่'})` : `${mp.total} รายการ`}</span></span>
          <span class="num" style={{ fontSize: 16, fontWeight: 600, padding: '0 4px' }}>{mp.done}/{mp.total}</span>
          <Icon n="chevron_right" color="var(--ink-2)" style={{ width: 32 }} />
        </button>
      )}

      {doneOn(date) && now < 18 * 60 && !missedMode && (
        <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div class="row" style={{ gap: 10 }}><Medal icon="sports" dark size={32} /><span style={{ fontSize: 14, fontWeight: 600 }}>โค้ช</span></div>
          <span style={{ fontSize: 16, lineHeight: 1.55, fontWeight: 500 }}>ซ้อมเสร็จแล้ว เก่งมาก ที่เหลือคือกินโปรตีนให้ถึงกับลุกเดินทุกชั่วโมง</span>
          <button class="btn dark" style={{ alignSelf: 'flex-start' }} onClick={() => goTab('coach')}>คุยกับโค้ช</button>
        </div>
      )}

      <div class="col" style={{ gap: 8 }}>
        <div class="sec-head"><span class="h2">ต่อจากนี้</span><span class="row" style={{ gap: 4 }}><button class="btn soft" style={{ height: 40, padding: '0 14px', fontSize: 14 }} onClick={() => openTaskEditor()}><Icon n="add" size={18} />เพิ่ม</button><button class="btn" style={{ padding: '0 4px 0 8px' }} onClick={() => push('timeline')}>ดูทั้งวัน<Icon n="chevron_right" size={22} /></button></span></div>
        {up.length === 0 && <span class="small muted" style={{ padding: '0 4px' }}>ไม่มีอะไรต่อแล้ววันนี้</span>}
        {up.map((u) => (
          <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 10 }}>
            <span class="num" style={{ fontSize: 14.5, fontWeight: 600, textAlign: 'right', paddingTop: 14 }}>{fromMin(u.start)}</span>
            <button class="card press" style={{ borderRadius: 18, padding: '10px 12px', minHeight: 60, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }} onClick={() => push('timeline')}>
              <Medal icon={u.icon} role={u.role} size={36} iconSize={20} />
              <span class="col" style={{ minWidth: 0 }}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{u.title}</span>{u.sub && <span class="muted" style={{ fontSize: 12.5 }}>{u.sub}</span>}</span>
            </button>
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div class="col" style={{ gap: 6 }}>
          <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>นัดหมายที่จะถึง</span>
          <div class="card" style={{ padding: '2px 12px' }}>{upcoming.map((u, i) => (
            <button class="row" style={{ width: '100%', gap: 10, minHeight: 56, textAlign: 'left', boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }} onClick={() => push('timeline')}>
              <span class="col" style={{ width: 46, alignItems: 'center' }}><span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.dayLabel}</span><span class="num muted" style={{ fontSize: 12 }}>{fromMin(u.b.start)}</span></span>
              <span class="grow" style={{ fontSize: 15, fontWeight: 600 }}>{u.b.title}</span><Icon n={u.b.kind === 'todo' ? 'task_alt' : u.b.icon} size={20} color="var(--ink-2)" />
            </button>))}</div>
        </div>
      )}

      {showClose && (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ink)', color: '#fff', borderRadius: 20, padding: '14px 8px 14px 14px', textAlign: 'left' }} onClick={() => push('close')}>
          <span class="medal" style={{ background: 'rgba(255,255,255,.12)' }}><Icon n="bedtime" fill /></span>
          <span class="col grow"><span class="t16">ปิดวัน</span><span class="cap" style={{ color: '#C9C6BD' }}>ทำได้ {v.total ? Math.round((v.done / v.total) * 100) : 0}% · ตั้งพรุ่งนี้ใน 1 นาที</span></span>
          <Icon n="chevron_right" style={{ width: 32 }} />
        </button>
      )}
    </div>
  );
}
