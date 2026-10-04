import { useState } from 'preact/hooks';
import { Icon, ROLE, type Role } from '../ui/kit';
import { openSheet, closeSheet, toast } from '../store/ui';
import { addBlock, addTemplateBlock, appNow } from '../domain/plan';
import { dayKey, toMin, DOW_SHORT } from '../domain/time';
import { Stepper } from './sheets';

const ROLES: [Role, string, string][] = [['work', 'งาน', 'laptop_mac'], ['workout', 'ซ้อม/กีฬา', 'sports_basketball'], ['food', 'กิน', 'restaurant'], ['recovery', 'ส่วนตัว/สุขภาพ', 'spa'], ['money', 'เงิน', 'credit_card']];
const LEADS: [number | null, string][] = [[null, 'ไม่เตือน'], [0, 'ตรงเวลา'], [15, '15 นาทีก่อน'], [30, '30 นาทีก่อน'], [60, '1 ชม.ก่อน']];
type Repeat = 'once' | 'daily' | 'days';

/** Add an activity (e.g. basketball every Monday) or a to-do with a date, time and reminder. */
export function openTaskEditor(opts: { date?: Date; kind?: 'event' | 'todo'; title?: string } = {}) {
  openSheet({ title: 'เพิ่มกิจกรรม / สิ่งที่ต้องทำ', tall: true, body: () => <TaskEditor {...opts} /> });
}

const pad = (n: number) => String(n).padStart(2, '0');
function TaskEditor({ date, kind: k0, title: t0 }: { date?: Date; kind?: 'event' | 'todo'; title?: string }) {
  const base = date ?? appNow();
  const nowM = new Date().getHours() * 60 + new Date().getMinutes(), nextHour = Math.min(23 * 60, Math.ceil((nowM + 15) / 30) * 30);
  const [title, setTitle] = useState(t0 ?? ''), [kind, setKind] = useState<'event' | 'todo'>(k0 ?? 'event');
  const [d, setD] = useState(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`), [time, setTime] = useState(`${pad(Math.floor(nextHour / 60))}:${pad(nextHour % 60)}`);
  const [dur, setDur] = useState(kind === 'todo' ? 15 : 60), [rep, setRep] = useState<Repeat>('once'), [days, setDays] = useState<number[]>([base.getDay()]);
  const [lead, setLead] = useState<number | null>(15), [role, setRole] = useState<Role>('work'), [note, setNote] = useState('');
  const pick = (kk: 'event' | 'todo') => { setKind(kk); setDur(kk === 'todo' ? 15 : 60); };
  const save = () => {
    if (!title.trim()) return toast('ใส่ชื่อก่อน');
    const [y, m, dd] = d.split('-').map(Number), date2 = new Date(y, m - 1, dd);
    let start = toMin(time); if (start < 240) start += 1440;
    const data = { title: title.trim(), start, dur, role, icon: kind === 'todo' ? 'task_alt' : ROLES.find((r) => r[0] === role)![2], kind, sub: note.trim() || undefined, ...(lead == null ? { mute: true } : { lead }) };
    if (rep === 'once') addBlock(dayKey(date2), { ...data, days: [] }, 'today', date2);
    else addTemplateBlock(data, rep === 'daily' ? [] : days.length ? days : [date2.getDay()]);
    closeSheet();
    toast(`เพิ่มแล้ว · ${rep === 'once' ? `${dd}/${m} ${time}` : rep === 'daily' ? `ทุกวัน ${time}` : `ทุก${days.map((x) => DOW_SHORT[x]).join(' ')} ${time}`}${lead == null ? '' : ' · มีแจ้งเตือน'}`);
  };
  return (
    <div class="col" style={{ gap: 14 }}>
      <input class="field" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder={kind === 'todo' ? 'เช่น ส่งงานลูกค้า, จ่ายค่าน้ำ' : 'เช่น เล่นบาส, นัดหมอฟัน'} style={{ fontSize: 18, fontWeight: 600 }} />
      <div class="seg"><button class={kind === 'event' ? 'on' : ''} onClick={() => pick('event')}>กิจกรรม</button><button class={kind === 'todo' ? 'on' : ''} onClick={() => pick('todo')}>สิ่งที่ต้องทำ</button></div>
      <div class="row" style={{ gap: 8 }}>
        <label class="grow"><span class="label">{rep === 'once' ? 'วันที่' : 'เริ่มตั้งแต่'}</span><input class="field" type="date" value={d} onInput={(e) => setD((e.target as HTMLInputElement).value)} /></label>
        <label style={{ width: 130 }}><span class="label">เวลา</span><input class="field" type="time" value={time} onInput={(e) => setTime((e.target as HTMLInputElement).value)} /></label>
      </div>
      <div class="row" style={{ justifyContent: 'space-between' }}><span class="t16">ใช้เวลา (นาที)</span><Stepper value={dur} onChange={(v) => setDur(Math.max(5, v))} step={kind === 'todo' ? 5 : 15} min={5} w={56} /></div>
      <div><span class="label">ทำซ้ำ</span>
        <div class="row" style={{ gap: 6 }}>{([['once', 'ครั้งเดียว'], ['daily', 'ทุกวัน'], ['days', 'เลือกวัน']] as const).map(([r, l]) => <button class={`chip${rep === r ? ' on' : ''}`} style={{ height: 40 }} onClick={() => setRep(r)}>{l}</button>)}</div>
        {rep === 'days' && <div class="row" style={{ gap: 4, marginTop: 8 }}>{[1, 2, 3, 4, 5, 6, 0].map((x) => <button class={`chip${days.includes(x) ? ' on' : ''}`} style={{ height: 44, flex: 1, justifyContent: 'center', padding: 0 }} onClick={() => setDays(days.includes(x) ? days.filter((y) => y !== x) : [...days, x])}>{DOW_SHORT[x]}</button>)}</div>}</div>
      <div><span class="label">แจ้งเตือน</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{LEADS.map(([l, t]) => <button class={`chip${lead === l ? ' on' : ''}`} style={{ height: 40 }} onClick={() => setLead(l)}>{t}</button>)}</div></div>
      {kind === 'event' && <div><span class="label">หมวด (สีในตาราง)</span><div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>{ROLES.map(([r, l]) => <button class="chip" style={{ height: 40, background: role === r ? ROLE[r].c : ROLE[r].soft, color: role === r ? '#fff' : ROLE[r].ink }} onClick={() => setRole(r)}>{l}</button>)}</div></div>}
      <input class="field" value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} placeholder="โน้ต (ไม่บังคับ) เช่น สถานที่ ของที่ต้องเอาไป" />
      <button class="btn primary lg block" onClick={save}><Icon n="check" />บันทึก</button>
    </div>
  );
}
