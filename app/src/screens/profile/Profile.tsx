import { useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { openSheet, closeSheet, toast } from '../../store/ui';
import { exportAll, resetAll } from '../../store/persist';
import { live, type Item } from '../../store/collection';
import { profile, settings } from '../../domain/profile';
import { template } from '../../domain/plan';
import { meds } from '../../domain/meds';
import { bills, categories, debts, fixedTotal } from '../../domain/money';
import { program } from '../../domain/training';
import { latestW } from '../../domain/body';
import { notif, TOPICS } from '../../domain/reminders';
import { ensurePermission } from '../../store/notify';
import { fromMin } from '../../domain/time';
import type { Signal } from '@preact/signals';
import { Stepper } from '../sheets';

type V = 'hub' | 'tpl' | 'conn' | 'notif' | 'trash' | 'ai';
const T: Record<V, string> = { hub: 'โปรไฟล์และตั้งค่า', tpl: 'แม่แบบ', conn: 'การเชื่อมต่อ', notif: 'แจ้งเตือน', trash: 'ถังขยะ', ai: 'ตั้งค่า AI' };
const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} aria-pressed={on} style={{ width: 52, height: 32, flex: 'none', borderRadius: 999, background: on ? 'var(--ink)' : '#D9D6CE', position: 'relative', transition: 'background 150ms' }}><span style={{ position: 'absolute', top: 4, left: on ? 24 : 4, width: 24, height: 24, borderRadius: 999, background: '#fff', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>
);
const Row = ({ icon, l, sub, soft, ink, go, i }: { icon: string; l: string; sub: string; soft: string; ink: string; go: () => void; i: number }) => (
  <button class="row" style={{ width: '100%', gap: 12, minHeight: 60, textAlign: 'left', boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }} onClick={go}>
    <span class="medal" style={{ width: 36, height: 36, background: soft, color: ink }}><Icon n={icon} fill size={20} /></span>
    <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{sub}</span></span>
    <Icon n="chevron_right" size={22} color="var(--ink-3)" />
  </button>
);

// Every soft-deletable collection, so the trash can restore anything.
const BINS: { name: string; icon: string; s: Signal<(Item & { name?: string; title?: string })[]> }[] = [
  { name: 'ตารางวัน', icon: 'calendar_view_day', s: template as never }, { name: 'ยาและผิว', icon: 'medication', s: meds as never },
  { name: 'บิล', icon: 'event', s: bills as never }, { name: 'หมวดเงิน', icon: 'label', s: categories as never }, { name: 'หนี้', icon: 'trending_down', s: debts as never },
];

export function Profile() {
  const [v, setV] = useState<V>('hub');
  const p = profile.value, n = notif.value;
  const days = Math.max(1, Math.round((Date.now() - new Date(p.startDate).getTime()) / 864e5));
  const trash = BINS.flatMap((b) => b.s.value.filter((x) => x.deletedAt).map((x) => ({ ...x, bin: b }))).sort((a, b) => b.deletedAt! - a.deletedAt!);
  const goBack = () => (v === 'hub' ? back() : setV('hub'));
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title={T[v]} onBack={goBack} />
      {v === 'hub' && <>
        <button class="card row" style={{ borderRadius: 22, padding: 16, gap: 14, textAlign: 'left' }} onClick={editProfile}>
          <span style={{ width: 64, height: 64, flex: 'none', borderRadius: 999, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>{(p.name || 'I').slice(0, 1)}</span>
          <span class="col grow"><span style={{ fontSize: 22, fontWeight: 600 }}>{p.name || 'ตั้งชื่อ'}</span><span class="muted" style={{ fontSize: 13.5 }}>{latestW()?.kg ?? '—'} kg · hybrid · ใช้มา {days} วัน</span></span>
          <Icon n="edit" size={22} color="var(--ink-2)" />
        </button>
        {([
          ['แม่แบบ', [['dashboard_customize', 'แม่แบบทั้งหมด', 'ตารางวัน · โปรแกรมซ้อม · checklist · หมวดเงิน · บิล', '#FFE3DA', '#B83A1C', () => setV('tpl')]]],
          ['ระบบ', [
            ['auto_awesome', 'ตั้งค่า AI', settings.value.apiKey ? `เชื่อมแล้ว · ${settings.value.model}` : 'ยังไม่ได้ใส่ API key · อ่านรูปและแชทยังใช้ไม่ได้', '#F1EEFF', '#5B3BE0', () => setV('ai')],
            ['link', 'การเชื่อมต่อ', 'Health Connect · กสิกร · KTC', '#E3F5E8', '#137A38', () => setV('conn')],
            ['notifications', 'แจ้งเตือน', `${Object.values(n.on).filter(Boolean).length} เรื่อง · ${n.level ? 'ทวงซ้ำ 3 ครั้ง' : 'เตือนครั้งเดียว'}`, '#FFF4E3', '#9A5800', () => setV('notif')],
            ['psychology', 'โค้ช', 'บุคลิก · สิ่งที่จำได้', '#F1EEFF', '#5B3BE0', () => push('coach-settings')],
          ]],
          ['อื่นๆ', [
            ['delete', 'ถังขยะ', `${trash.length} รายการ · กู้คืนได้ 30 วัน`, '#EFEDE7', '#6B6962', () => setV('trash')],
            ['download', 'สำรองข้อมูล', 'ดาวน์โหลดไฟล์ JSON · กู้คืนได้', '#ECF2FF', '#1F5FD6', backup],
          ]],
        ] as [string, [string, string, string, string, string, () => void][]][]).map(([h, rows]) => (
          <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>{h}</span>
            <div class="card" style={{ padding: '2px 10px 2px 14px' }}>{rows.map(([icon, l, sub, soft, ink, go], i) => <Row icon={icon} l={l} sub={sub} soft={soft} ink={ink} go={go} i={i} />)}</div></div>
        ))}
      </>}

      {v === 'tpl' && <>
        <span class="small muted">แม่แบบทั้งหมดของแอป แก้ที่นี่แล้วใช้กับทุกวันถัดไป</span>
        {([
          ['calendar_view_day', 'ตารางวัน', `${live(template.value).length} รายการ ตั้งแต่ตื่นถึงนอน`, '#FFE3DA', '#B83A1C', () => push('timeline', { edit: true })],
          ['fitness_center', 'โปรแกรมซ้อม', `${program.value.filter((d) => d.kind !== 'rest').length} วัน · ${program.value.reduce((a, d) => a + d.exercises.length, 0)} ท่า`, '#E8F8EE', '#137A38', () => push('program')],
          ['checklist', 'ยาและผิว', `${live(meds.value).length} รายการ`, '#F1EEFF', '#5B3BE0', () => push('meds')],
          ['restaurant', 'เป้าโภชนาการ', 'วันซ้อม · วันพัก', '#FFF4E3', '#9A5800', () => push('goals')],
          ['label', 'หมวดเงินและบิล', `${live(categories.value).length} หมวด · ค่าคงที่ ${fixedTotal().toLocaleString()} ฿`, '#ECF2FF', '#1F5FD6', () => push('bills')],
        ] as [string, string, string, string, string, () => void][]).map(([icon, l, s, soft, ink, go]) => (
          <button class="card row" style={{ borderRadius: 18, padding: '12px 10px 12px 12px', minHeight: 72, textAlign: 'left' }} onClick={go}>
            <span class="medal" style={{ borderRadius: 14, background: soft, color: ink }}><Icon n={icon} fill /></span>
            <span class="col grow"><span class="t16">{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{s}</span></span><Icon n="chevron_right" size={22} color="var(--ink-3)" />
          </button>))}
      </>}

      {v === 'ai' && <AISettings />}

      {v === 'conn' && <>
        <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div class="row"><span class="medal" style={{ borderRadius: 14, background: 'var(--success-tint)', color: 'var(--workout-ink)' }}><Icon n="favorite" fill /></span><span class="col grow"><span class="t16">Health Connect</span><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>ใช้ได้ในแอป Android (กำลังทำ)</span></span></div>
          <span class="small muted">เมื่อติดตั้งเป็นแอป Android แล้ว จะดึงการนอน ก้าวเดิน น้ำหนัก และหัวใจจาก Zepp/Amazfit ผ่าน Health Connect เอง ตอนนี้ใช้ปุ่ม “นอนแล้ว” และชั่งน้ำหนักในแอปแทน</span>
        </div>
        <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>แอปธนาคาร · อ่านแจ้งเตือน</span>
        <div class="card" style={{ padding: '2px 12px 2px 14px' }}>
          {([['กสิกร', 'K', '#1C9C4A'], ['KTC', 'KTC', '#D92D20']] as const).map(([nm, ab, c], i) => (
            <div class="row" style={{ minHeight: 64, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span style={{ width: 40, height: 40, flex: 'none', borderRadius: 12, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{ab}</span>
              <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{nm}</span><span class="muted" style={{ fontSize: 12.5 }}>แอป Android: อ่านเอง · ตอนนี้: วางข้อความในหน้าเงิน</span></span>
            </div>))}
        </div>
      </>}

      {v === 'notif' && <>
        <button class="btn soft" onClick={async () => { await ensurePermission(); toast(typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'อนุญาตแจ้งเตือนแล้ว' : 'ยังไม่ได้รับอนุญาต เปิดในตั้งค่าเบราว์เซอร์'); }}><Icon n="notifications_active" size={20} />อนุญาตแจ้งเตือนบนเครื่องนี้</button>
        <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>ระดับการทวง</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{([['เตือนครั้งเดียว', 'แจ้งตามเวลา ไม่ทวง'], ['ทวงซ้ำ 3 ครั้ง', 'ทุก 10 นาที รอบ 3 แจ้งว่าจะบันทึกว่าพลาด']] as const).map(([l, s], i) => (
          <button style={{ minHeight: 84, borderRadius: 18, background: n.level === i ? 'var(--ink)' : '#fff', color: n.level === i ? '#fff' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', textAlign: 'left' }} onClick={() => (notif.value = { ...n, level: i as 0 | 1 })}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12.5, opacity: 0.8, lineHeight: 1.4 }}>{s}</span></button>))}</div>
        <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px', marginTop: 4 }}>เรื่องที่เตือน</span>
        <div class="card" style={{ padding: '2px 12px 2px 14px' }}>{TOPICS.map((t, i) => { const on = n.on[t.k]; return (
          <div class="row" style={{ gap: 10, minHeight: 68, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
            <span class="col grow" style={{ opacity: on ? 1 : 0.45 }}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.l}</span><span class="muted" style={{ fontSize: 12.5 }}>{t.s}</span></span>
            {t.time && n.time[t.k] != null && <div style={{ opacity: on ? 1 : 0.45 }}><Stepper value={n.time[t.k]!} onChange={(x) => (notif.value = { ...n, time: { ...n.time, [t.k]: (x + 1440) % 1440 } })} step={15} fmt={fromMin} w={52} /></div>}
            <Toggle on={on} label={t.l} onClick={() => (notif.value = { ...n, on: { ...n.on, [t.k]: !on } })} />
          </div>); })}</div>
        <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px', marginTop: 4 }}>ช่วงห้ามรบกวน</span>
        <div class="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{(['เริ่ม', 'ถึง'] as const).map((l, i) => <div class="col" style={{ gap: 4 }}><span class="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span><Stepper value={n.dnd[i]} onChange={(x) => { const d2 = [...n.dnd] as [number, number]; d2[i] = (x + 1440) % 1440; notif.value = { ...n, dnd: d2 }; }} step={15} fmt={fromMin} w={60} /></div>)}</div>
          <span class="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>ยกเว้นเตือนทายาก่อนนอน · แอป Android จะส่งแจ้งเตือนได้แม้ปิดแอป ตอนนี้เตือนได้ขณะเปิดแอปอยู่</span>
        </div>
      </>}

      {v === 'trash' && <>
        <span class="small muted">กู้คืนได้ภายใน 30 วัน หลังจากนั้นลบถาวรเอง</span>
        {trash.length === 0 && <div class="card" style={{ padding: 20, textAlign: 'center' }}><span class="muted">ถังขยะว่าง</span></div>}
        {trash.map((t) => { const left = 30 - Math.floor((Date.now() - t.deletedAt!) / 864e5); return (
          <div class="card row" style={{ borderRadius: 18, padding: '10px 10px 10px 12px', minHeight: 68 }}>
            <span class="medal" style={{ width: 36, height: 36, background: 'var(--surface-2)', color: 'var(--ink-2)' }}><Icon n={t.bin.icon} size={20} /></span>
            <span class="col grow"><span style={{ fontSize: 15, fontWeight: 600 }}>{t.name ?? t.title ?? 'รายการ'}</span><span style={{ fontSize: 12.5, color: left <= 5 ? '#B83A1C' : 'var(--ink-2)' }}>{t.bin.name} · เหลือ {left} วัน</span></span>
            <button class="btn dark" style={{ height: 40, fontSize: 14 }} onClick={() => { t.bin.s.value = t.bin.s.value.map((x) => (x.id === t.id ? { ...x, deletedAt: undefined } : x)); toast('กู้คืนแล้ว'); }}>กู้คืน</button>
          </div>); })}
      </>}
    </div>
  );
}

function AISettings() {
  const [key, setKey] = useState(settings.value.apiKey), [show, setShow] = useState(false);
  const MODELS: [string, string, string][] = [['claude-sonnet-5-5', 'Claude Sonnet 5.5 (แนะนำ)', 'เร็ว ประหยัด เหมาะกับงบ 100–300 ฿/เดือน'], ['claude-opus-5-5', 'Claude Opus 5.5', 'ฉลาดที่สุด · ค่าใช้จ่ายสูงกว่า'], ['claude-haiku-4-5', 'Claude Haiku 4.5', 'ถูกที่สุด อ่านรูปได้ แม่นน้อยกว่า']];
  return <>
    <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span class="t16">Claude API key</span>
      <span class="small muted">ใช้อ่านรูปอาหาร สลิป InBody และให้โค้ชคุยและสั่งงานได้ · key เก็บในเครื่องนี้เท่านั้น สร้างได้ที่ console.anthropic.com</span>
      <div class="row" style={{ gap: 8 }}><input class="field" type={show ? 'text' : 'password'} value={key} onInput={(e) => setKey((e.target as HTMLInputElement).value.trim())} placeholder="sk-ant-..." autoComplete="off" /><button class="btn icon soft" style={{ height: 52, width: 52 }} onClick={() => setShow(!show)} aria-label="แสดง/ซ่อน"><Icon n={show ? 'visibility_off' : 'visibility'} /></button></div>
      <button class="btn primary lg" onClick={() => { settings.value = { ...settings.value, apiKey: key }; toast(key ? 'บันทึก API key แล้ว' : 'ลบ API key แล้ว'); }}>บันทึก</button>
    </div>
    <span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>รุ่น AI</span>
    {MODELS.map(([id, l, s]) => { const on = settings.value.model === id; return (
      <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'var(--shadow-1)' }} onClick={() => (settings.value = { ...settings.value, model: id, modelChosen: true })}>
        <span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, boxShadow: on ? 'inset 0 0 0 7px var(--ink)' : 'inset 0 0 0 2px #CFCBC1' }} /><span class="col"><span class="t16">{l}</span><span class="cap muted">{s}</span></span>
      </button>); })}
  </>;
}

function editProfile() { openSheet({ title: 'แก้โปรไฟล์', tall: true, body: () => <ProfileEdit /> }); }
function ProfileEdit() {
  const p = profile.value;
  const [f, setF] = useState({ name: p.name, heightCm: p.heightCm, wake: p.wake, sleep: p.sleep, workStart: p.workStart, payday: p.payday, netSalary: p.netSalary });
  const set = (k: keyof typeof f) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  return (
    <div class="col" style={{ gap: 12 }}>
      <label><span class="label">ชื่อเล่น</span><input class="field" value={f.name} onInput={set('name')} /></label>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">ตื่น</span><input class="field" type="time" value={f.wake} onInput={set('wake')} /></label><label class="grow"><span class="label">นอน</span><input class="field" type="time" value={f.sleep} onInput={set('sleep')} /></label></div>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">เริ่มงาน</span><input class="field" type="time" value={f.workStart} onInput={set('workStart')} /></label><label class="grow"><span class="label">ส่วนสูง (cm)</span><input class="field num" inputMode="numeric" value={f.heightCm} onInput={set('heightCm')} /></label></div>
      <div class="row" style={{ gap: 8 }}><label class="grow"><span class="label">เงินเดือนสุทธิ</span><input class="field num" inputMode="numeric" value={f.netSalary} onInput={set('netSalary')} /></label><label style={{ width: 120 }}><span class="label">เข้าวันที่</span><input class="field num" inputMode="numeric" value={f.payday} onInput={set('payday')} /></label></div>
      <button class="btn primary lg block" onClick={() => { profile.value = { ...p, ...f, heightCm: +f.heightCm || p.heightCm, payday: Math.min(28, Math.max(1, +f.payday || p.payday)), netSalary: +f.netSalary || p.netSalary }; closeSheet(); toast('บันทึกแล้ว'); }}>บันทึก</button>
      <button class="btn soft" style={{ color: 'var(--error)' }} onClick={() => { if (confirm('ลบข้อมูลทั้งหมดในเครื่องนี้และเริ่มใหม่? (แนะนำให้สำรองข้อมูลก่อน)')) { resetAll(); location.reload(); } }}>ลบข้อมูลทั้งหมดและเริ่มใหม่</button>
    </div>
  );
}

function backup() {
  const blob = new Blob([JSON.stringify({ app: 'iam5', at: new Date().toISOString(), data: exportAll() }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iam-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  toast('ดาวน์โหลดไฟล์สำรองแล้ว');
}
