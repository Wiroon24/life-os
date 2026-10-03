import { useRef, useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { toast } from '../../store/ui';
import { uid } from '../../store/persist';
import { live } from '../../store/collection';
import { profile, type Tone } from '../../domain/profile';
import { template } from '../../domain/plan';
import { meds } from '../../domain/meds';
import { debts } from '../../domain/money';
import { weekTemplate, dayById } from '../../domain/training';
import { aiTargets } from '../../domain/food';
import { latestW, logWeight, etaFor } from '../../domain/body';
import { fileToImg, hasAI, explain } from '../../domain/ai';
import { analyzeImage } from '../../domain/capture';
import { ensurePermission } from '../../store/notify';
import { fromMin, toMin, thDateLong } from '../../domain/time';
import { Stepper } from '../sheets';

const STEPS = ['intro', 'name', 'body', 'goal', 'injury', 'equip', 'days', 'sleep', 'meds', 'money', 'debt', 'tone', 'perm0', 'perm1', 'perm2', 'done'] as const;
type K = (typeof STEPS)[number];
const CH: Partial<Record<K, string[]>> = {
  goal: ['ลดไขมัน', 'รักษากล้ามเนื้อ', 'แข็งแรงแบบ hybrid', 'วิ่งได้ไกลขึ้น', 'เล่นบาสได้ดีขึ้น'],
  injury: ['ข้อเท้า', 'เข่า', 'เอ็นน่อง', 'หลังล่าง', 'ไหล่', 'ข้อมือ', 'ไม่มี'],
  equip: ['ดัมเบล', 'ม้านั่ง', 'ลู่วิ่ง', 'Leg extension', 'Lat pulldown', 'บาร์โหน', 'ยางยืด', 'ไม่มีอุปกรณ์'],
  meds: ['ใช้ชุดที่ตั้งไว้แล้ว', 'ไม่มี'],
  debt: ['ผ่อนรถ', 'ผ่อนบ้าน', 'กยศ.', 'บัตรเครดิต', 'สินเชื่อส่วนตัว', 'ไม่มี'],
};
const Q: Record<K, [string, string]> = {
  intro: ['สวัสดี ผมเป็นโค้ชของคุณ', 'ขอถาม 11 ข้อ ใช้เวลาราว 3 นาที ตอบด้วยปุ่มเป็นหลัก ข้ามได้ทุกข้อ'], name: ['ให้เรียกว่าอะไรดี', ''],
  body: ['ขอข้อมูลร่างกายหน่อย', 'ถ่ายใบ InBody ได้เลย จะอ่านให้เอง หรือกรอกเอง'], goal: ['อยากได้อะไรจากการซ้อม', 'เลือกได้หลายข้อ'],
  injury: ['เคยบาดเจ็บตรงไหนไหม', 'จะเพิ่มท่าเสริมข้อต่อให้ ไม่ตัดท่าหลัก'], equip: ['มีอุปกรณ์อะไรบ้าง', 'จะจัดท่าให้ใช้ได้ครบ'],
  days: ['ซ้อมได้วันไหน เวลาไหน', 'แนะนำ 5–6 วัน มีวันพักอย่างน้อย 1 วัน'], sleep: ['อยากตื่นกี่โมง นอนกี่โมง', 'ใช้ตั้งเวลาเตือนและสรุปเช้า'],
  meds: ['มียาหรือสกินแคร์ประจำไหม', 'ตั้งชุดตามที่เคยบอกไว้แล้ว แก้ได้ในหน้ายาและผิว'], money: ['เงินเดือนเท่าไหร่ เข้าวันไหน', 'ใช้คำนวณ “ใช้ได้วันนี้” ไม่ส่งข้อมูลไปที่ไหน'],
  debt: ['มีหนี้อะไรบ้าง', 'รายละเอียดยอดและงวด แก้ทีหลังได้ในหน้าหนี้'], tone: ['อยากให้โค้ชพูดแบบไหน', 'เปลี่ยนได้ตลอดในตั้งค่า'],
  perm0: ['ขอส่งแจ้งเตือนได้ไหม', ''], perm1: ['เชื่อม Health Connect ไหม', ''], perm2: ['ให้อ่านแจ้งเตือนธนาคารไหม', ''], done: ['แผนของคุณพร้อมแล้ว', ''],
};
const PERM = [
  { icon: 'notifications', soft: '#FFE3DA', ink: '#B83A1C', why: ['เตือนซ้อมและทายาตรงเวลา', 'สรุปเช้าทุกวัน', 'ทวงซ้ำได้ ตั้งระดับเองได้'], note: 'ตั้งช่วงห้ามรบกวนได้ในตั้งค่า' },
  { icon: 'favorite', soft: '#E3F5E8', ink: '#137A38', why: ['ดึงการนอนและก้าวเดินจาก Amazfit', 'ดึงน้ำหนักจากเครื่องชั่ง', 'ไม่ต้องกรอกเองทุกวัน'], note: 'ใช้ได้เมื่อติดตั้งเป็นแอป Android · อ่านอย่างเดียว ไม่เขียนกลับ' },
  { icon: 'account_balance', soft: '#ECF2FF', ink: '#1F5FD6', why: ['ดึงรายการจากกสิกรและ KTC ให้เอง', 'คุณแค่ปัดยืนยัน', 'อ่านเฉพาะแอปธนาคารที่เลือก'], note: 'ใช้ได้เมื่อติดตั้งเป็นแอป Android · ไม่อ่านแอปอื่น ไม่ต้องให้รหัสธนาคาร' },
];
const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DEBTMAP: Record<string, string> = { 'ผ่อนรถ': 'รถ', 'ผ่อนบ้าน': 'บ้าน', 'กยศ.': 'กยศ.', 'บัตรเครดิต': 'บัตรเครดิต', 'สินเชื่อส่วนตัว': 'สินเชื่อส่วนตัว' };

export function Onboarding() {
  const p = profile.value, wt = weekTemplate.value;
  const [i, setI] = useState(0);
  const [s, setS] = useState({
    name: p.name, w: latestW()?.kg ?? 96, h: p.heightCm, age: new Date().getFullYear() - p.birthYear, mode: 'manual' as 'scan' | 'manual',
    sel: { goal: ['ลดไขมัน', 'รักษากล้ามเนื้อ', 'แข็งแรงแบบ hybrid'], injury: p.injuries.length ? ['ข้อเท้า', 'เข่า', 'เอ็นน่อง'] : [], equip: ['ดัมเบล', 'ม้านั่ง', 'ลู่วิ่ง', 'Leg extension', 'Lat pulldown'], meds: ['ใช้ชุดที่ตั้งไว้แล้ว'], debt: live(debts.value).map((d) => Object.keys(DEBTMAP).find((k) => DEBTMAP[k] === d.name) ?? '').filter(Boolean) } as Record<string, string[]>,
    days: [1, 2, 3, 4, 5, 6, 0].map((wd): number => (dayById(wt[wd]).kind === 'rest' ? 0 : 1)), time: 0, wake: toMin(p.wake), bed: toMin(p.sleep), salary: p.netSalary, payday: p.payday, tone: p.tone as Tone,
    ib: null as null | { weight: number | null; smm: number | null; fat_pct: number | null; visceral: number | null }, scanning: false,
  });
  const file = useRef<HTMLInputElement>(null);
  const k = STEPS[i], isPerm = k.startsWith('perm'), P = isPerm ? PERM[+k[4]] : null;
  const total = 11, set = (patch: Partial<typeof s>) => setS({ ...s, ...patch });
  const go = (d: number) => setI(Math.max(0, Math.min(STEPS.length - 1, i + d)));
  const opt = (on: boolean) => ({ background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)' });
  const togg = (key: string, l: string) => { let cur = s.sel[key]; const none = /^ไม่มี/.test(l); cur = cur.includes(l) ? cur.filter((x) => x !== l) : none ? [l] : [...cur.filter((x) => !/^ไม่มี/.test(x)), l]; set({ sel: { ...s.sel, [key]: cur } }); };

  const scan = async (f?: File) => {
    if (!f) return; if (!hasAI()) { toast('ใส่ API key ในโปรไฟล์ก่อน หรือกรอกเอง'); set({ mode: 'manual' }); return; }
    set({ scanning: true });
    try { const r = await analyzeImage(await fileToImg(f)); if (!r.inbody) throw new Error('ไม่ใช่ใบ InBody'); setS((x) => ({ ...x, scanning: false, ib: r.inbody, w: r.inbody!.weight ?? x.w })); }
    catch (e) { toast(e instanceof Error && e.message === 'ไม่ใช่ใบ InBody' ? e.message : explain(e)); setS((x) => ({ ...x, scanning: false, mode: 'manual' })); }
  };

  const finish = () => {
    const wake = fromMin(s.wake), bed = fromMin(s.bed);
    const bedM = s.bed < 600 ? s.bed + 1440 : s.bed, wakeM = s.wake;
    const trainStart = [wakeM + 30, 17 * 60 + 30, 19 * 60 + 30][s.time];
    template.value = template.value.map((b) => {
      if (b.source === 'user') return b;
      if (b.kind === 'weigh') return { ...b, start: wakeM };
      if (b.kind === 'workout') return { ...b, start: trainStart };
      if (b.kind === 'sleep') return { ...b, start: bedM };
      if (b.kind === 'close') return { ...b, start: bedM - 20 };
      if (b.kind === 'meds-night') return { ...b, start: bedM - 30 };
      if (b.title === 'กล้วย + เวย์') return { ...b, start: trainStart - 15 };
      return b;
    });
    const order = [1, 2, 3, 4, 5, 6, 0];
    weekTemplate.value = wt.map((id, wd) => (s.days[order.indexOf(wd)] ? (dayById(id).kind === 'rest' ? 'car' : id) : 'rest'));
    if (s.ib) logWeight(s.ib.weight ?? s.w, { fat: s.ib.fat_pct ?? undefined, smm: s.ib.smm ?? undefined, visceral: s.ib.visceral ?? undefined, source: 'inbody' });
    else if (Math.abs(s.w - (latestW()?.kg ?? 0)) > 0.05) logWeight(s.w);
    if (s.sel.meds.includes('ไม่มี')) meds.value = meds.value.map((m) => ({ ...m, deletedAt: Date.now() }));
    const want = s.sel.debt.filter((d) => DEBTMAP[d]).map((d) => DEBTMAP[d]);
    debts.value = [...debts.value.map((d) => (want.includes(d.name) || d.deletedAt ? d : { ...d, deletedAt: Date.now() })),
      ...want.filter((n) => !debts.value.some((d) => d.name === n && !d.deletedAt)).map((n, j) => ({ id: uid(), order: 100 + j, name: n, icon: n === 'บัตรเครดิต' ? 'credit_card' : 'account_balance', balance: 0, orig: 0, payment: 0, rate: n === 'บัตรเครดิต' ? 16 : 20, meta: 'แตะเพื่อกรอกยอด', inBills: false, source: 'user' as const }))];
    profile.value = { ...p, name: s.name.trim(), heightCm: s.h, birthYear: new Date().getFullYear() - s.age, goal: s.sel.goal.join(' · ') || p.goal, injuries: s.sel.injury.filter((x) => x !== 'ไม่มี'),
      equipment: s.sel.equip.filter((x) => x !== 'ไม่มีอุปกรณ์'), wake, sleep: bed, netSalary: s.salary, payday: s.payday, tone: s.tone, onboarded: true };
    window.scrollTo(0, 0);
  };

  const next = async () => {
    if (k === 'perm0') await ensurePermission();
    if (k === 'body' && s.mode === 'scan' && !s.ib) return file.current?.click();
    if (k === 'done') return finish();
    go(1);
  };
  const q = Q[k];
  const nextL = k === 'intro' ? 'เริ่มเลย' : k === 'perm0' ? 'อนุญาต' : k === 'perm1' || k === 'perm2' ? 'รับทราบ' : k === 'done' ? 'เริ่มวันแรก' : k === 'body' && s.mode === 'scan' && !s.ib ? (s.scanning ? 'กำลังอ่าน…' : 'ถ่ายใบ InBody') : 'ต่อไป';
  const hot = k === 'done' || k === 'intro' || isPerm;
  const tTrain = aiTargets('train'), tRest = aiTargets('rest'), eta = etaFor(90);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <input ref={file} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => scan((e.target as HTMLInputElement).files?.[0])} />
      <div class="row" style={{ gap: 8, padding: '8px 16px 0 8px', minHeight: 56 }}>
        {i > 0 && k !== 'done' ? <button class="btn icon" onClick={() => go(-1)} aria-label="ย้อน"><Icon n="arrow_back" /></button> : <span style={{ width: 8 }} />}
        <div class="row grow" style={{ gap: 3, paddingLeft: 8 }}>{Array.from({ length: total }, (_, j) => <span style={{ flex: 1, height: 4, borderRadius: 999, background: j < Math.min(i, total) ? 'var(--ink)' : '#E0DDD5', transition: 'background 240ms' }} />)}</div>
        <span class="num muted" style={{ width: 48, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{i >= 1 && i <= total ? `${i}/${total}` : ''}</span>
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div key={k} class="col" style={{ gap: 10, animation: 'iam-up 300ms var(--ease-out)' }}>
          <div class="row" style={{ gap: 6 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="sports" fill size={16} /></span><span style={{ fontSize: 13, fontWeight: 700 }}>โค้ช</span></div>
          <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{k === 'done' ? `แผนของ${s.name || 'คุณ'}พร้อมแล้ว` : q[0]}</span>
          {q[1] && <span class="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{q[1]}</span>}
        </div>

        {k === 'intro' && <div class="col" style={{ gap: 8 }}>{([['fitness_center', 'ตารางซ้อมที่ปรับตามจริง', 'workout'], ['restaurant', 'กินตามเป้าจาก meal prep', 'food'], ['bedtime', 'นอนและฟื้นตัว', 'recovery'], ['account_balance_wallet', 'รู้ว่าวันนี้ใช้เงินได้เท่าไหร่', 'money']] as const).map(([icon, t, r]) => <div class="row" style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', minHeight: 64 }}><span class="medal" style={{ width: 40, height: 40, background: `var(--${r}-soft)`, color: `var(--${r}-ink)` }}><Icon n={icon} fill size={22} /></span><span style={{ fontSize: 15.5, fontWeight: 600 }}>{t}</span></div>)}</div>}
        {k === 'name' && <input value={s.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} placeholder="ชื่อเล่น" aria-label="ชื่อเล่น" style={{ height: 64, border: 'none', outline: 'none', borderRadius: 18, background: '#fff', padding: '0 18px', fontSize: 22, fontWeight: 600, boxShadow: 'inset 0 0 0 2px var(--ink)' }} />}
        {k === 'body' && <div class="col" style={{ gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{([['scan', 'photo_camera', 'ถ่ายใบ InBody'], ['manual', 'edit', 'กรอกเอง']] as const).map(([m, ic, l]) => <button style={{ minHeight: 96, borderRadius: 18, ...opt(s.mode === m), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, textAlign: 'left' }} onClick={() => set({ mode: m })}><Icon n={ic} size={26} /><span style={{ fontSize: 15.5, fontWeight: 600 }}>{l}</span></button>)}</div>
          {s.scanning && <div class="row muted" style={{ gap: 10 }}><span class="spin" />กำลังอ่านใบ InBody…</div>}
          {s.ib && <div style={{ background: 'var(--workout-soft)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, animation: 'iam-up 260ms var(--ease-out)' }}><span class="row" style={{ gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--workout-ink)' }}><Icon n="check_circle" fill size={20} />อ่านใบ InBody แล้ว</span><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>{[['น้ำหนัก', s.ib.weight], ['กล้าม', s.ib.smm], ['ไขมัน %', s.ib.fat_pct]].map(([l, v]) => <span class="col" style={{ background: '#fff', borderRadius: 12, padding: '8px 10px' }}><span class="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{l}</span><span class="num" style={{ fontSize: 17, fontWeight: 600 }}>{v ?? '—'}</span></span>)}</div></div>}
          {(s.mode === 'manual' || s.ib) && <div class="card" style={{ padding: '4px 12px' }}>{([['น้ำหนัก', 'w', 0.1, ' kg'], ['ส่วนสูง', 'h', 1, ' cm'], ['อายุ', 'age', 1, ' ปี']] as const).map(([l, key, st], j) => <div class="row" style={{ gap: 8, minHeight: 64, boxShadow: j ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span class="t16 grow">{l}</span><Stepper value={s[key]} onChange={(v) => set({ [key]: v } as Partial<typeof s>)} step={st} fmt={(v) => (key === 'w' ? v.toFixed(1) : String(v)) + (key === 'w' ? ' kg' : key === 'h' ? ' cm' : ' ปี')} w={80} /></div>)}</div>}
        </div>}
        {CH[k] && <div class="row" style={{ flexWrap: 'wrap', gap: 8 }}>{CH[k]!.map((l) => { const on = s.sel[k].includes(l); return <button class="press" style={{ minHeight: 52, padding: '0 18px', borderRadius: 999, ...opt(on), fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => togg(k, l)}>{on && <Icon n="check" size={20} />}{l}</button>; })}</div>}
        {k === 'days' && <div class="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>{DAYS.map((l, j) => <button style={{ height: 60, borderRadius: 14, ...opt(!!s.days[j]), fontSize: 15, fontWeight: 600 }} onClick={() => set({ days: s.days.map((v, x) => (x === j ? 1 - v : v)) })}>{l}</button>)}</div>
          <span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>ช่วงเวลาซ้อม</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>{([['เช้า', 'หลังตื่น'], ['เย็น', '17:30'], ['ค่ำ', '19:30']] as const).map(([l, sub], j) => <button style={{ minHeight: 64, borderRadius: 16, ...opt(s.time === j), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }} onClick={() => set({ time: j })}><span>{l}</span><span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>{sub}</span></button>)}</div>
        </div>}
        {k === 'sleep' && <div class="card" style={{ padding: '4px 12px' }}>{([['wb_sunny', 'ตื่น', 'wake'], ['bedtime', 'นอน', 'bed']] as const).map(([ic, l, key], j) => <div class="row" style={{ gap: 8, minHeight: 72, boxShadow: j ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span class="medal" style={{ width: 40, height: 40, background: 'var(--recovery-soft)', color: 'var(--recovery-ink)' }}><Icon n={ic} fill size={22} /></span><span class="t16 grow">{l}</span><Stepper value={s[key]} onChange={(v) => set({ [key]: (v + 1440) % 1440 } as Partial<typeof s>)} step={15} fmt={fromMin} w={72} /></div>)}</div>}
        {k === 'money' && <div class="col" style={{ gap: 12 }}>
          <div class="card row" style={{ padding: 14 }}><span class="t16 grow">เงินเดือนสุทธิ</span><Stepper value={s.salary} onChange={(v) => set({ salary: v })} step={500} fmt={(v) => v.toLocaleString()} w={100} /></div>
          <span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>เงินเข้าวันที่ · รอบงบจะนับจากวันนี้</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>{[1, 25, 27, 28].map((d) => <button style={{ height: 56, borderRadius: 16, ...opt(s.payday === d), fontSize: 16, fontWeight: 600 }} onClick={() => set({ payday: d })}>{d}</button>)}</div>
        </div>}
        {k === 'tone' && <div class="col" style={{ gap: 8 }}>{([['strict', 'เข้ม', 'ยังไม่ได้ทายาเลยนะ อีก 10 นาทีจะบันทึกว่าพลาด'], ['balanced', 'สมดุล', 'ถึงเวลาทายาแล้ว ทำก่อนนอนนะ'], ['gentle', 'อ่อนโยน', 'ทายาก่อนนอนด้วยนะ ผิวจะได้ดีขึ้นเรื่อยๆ']] as const).map(([key, l, sample]) => { const on = s.tone === key; return (
          <button style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 20, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'none' }} onClick={() => set({ tone: key })}>
            <span class="row" style={{ justifyContent: 'space-between', width: '100%' }}><span style={{ fontSize: 17, fontWeight: 600 }}>{l}</span><span style={{ width: 24, height: 24, borderRadius: 999, boxShadow: on ? 'inset 0 0 0 7px var(--ink)' : 'inset 0 0 0 2px #CFCBC1' }} /></span>
            <span style={{ background: 'var(--bg)', borderRadius: '6px 16px 16px 16px', padding: '10px 12px', fontSize: 14.5, lineHeight: 1.5 }}>{sample}</span>
          </button>); })}</div>}
        {P && <div class="card" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span class="medal" style={{ width: 56, height: 56, borderRadius: 18, background: P.soft, color: P.ink }}><Icon n={P.icon} fill size={30} /></span>
          {P.why.map((w) => <div class="row" style={{ gap: 10, alignItems: 'flex-start' }}><Icon n="check" size={20} color="var(--workout-ink)" style={{ lineHeight: 1.4 }} /><span style={{ fontSize: 15, lineHeight: 1.5 }}>{w}</span></div>)}
          <span class="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{P.note}</span>
        </div>}
        {k === 'done' && <div class="col" style={{ gap: 10, animation: 'iam-up 320ms var(--ease-out)' }}>
          <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 22, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['วันซ้อม', tTrain], ['วันพัก', tRest]] as const).map(([l, t]) => <span class="col"><span style={{ fontSize: 12.5, color: '#C9C6BD', fontWeight: 600 }}>{l}</span><span class="num" style={{ fontSize: 28, fontWeight: 600 }}>{t.k.toLocaleString()}</span><span style={{ fontSize: 12.5, color: '#C9C6BD' }}>kcal · P {t.p} g</span></span>)}
          </div>
          <div class="card" style={{ padding: '4px 14px' }}>{[1, 2, 3, 4, 5, 6, 0].map((wd, j) => { const on = s.days[j], d = dayById(wt[wd]), name = on ? (d.kind === 'rest' ? 'คาร์ดิโอ' : d.name) : 'พัก'; return <div class="row" style={{ gap: 10, minHeight: 44, boxShadow: j ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span style={{ width: 30, fontSize: 14, fontWeight: 700 }}>{DAYS[j]}</span><span style={{ width: 8, height: 8, borderRadius: 999, background: name === 'พัก' ? '#CFCBC1' : /ฟื้นตัว/.test(name) ? '#7C5CFF' : /คาร์ดิโอ/.test(name) ? '#22A6C9' : '#22B455' }} /><span class="grow" style={{ fontSize: 14.5, fontWeight: 500 }}>{name}</span></div>; })}</div>
          <div class="row" style={{ background: 'var(--success-tint)', borderRadius: 20, padding: 14 }}><span class="medal" style={{ background: '#fff', color: 'var(--workout-ink)' }}><Icon n="flag" fill /></span><span class="col"><span class="t16">ด่านแรก 90 kg · ~{typeof eta === 'string' ? eta : thDateLong(eta)}</span><span style={{ fontSize: 13, color: 'var(--workout-ink)', fontWeight: 500 }}>ลดสัปดาห์ละ ~0.6 kg · กล้ามเนื้อต้องไม่ลด</span></span></div>
        </div>}
      </div>
      <div class="col" style={{ padding: '8px 16px calc(28px + env(safe-area-inset-bottom))', gap: 6 }}>
        <button class="btn block press" style={{ height: 60, fontSize: 18, fontWeight: 700, background: hot ? 'var(--primary)' : 'var(--ink)', color: '#fff', boxShadow: hot ? 'var(--primary-shadow)' : 'none' }} onClick={next} disabled={s.scanning}>{nextL}</button>
        {k !== 'intro' && k !== 'done' && <button class="btn muted" style={{ fontSize: 15 }} onClick={() => go(1)}>{isPerm ? 'ไว้ทีหลัง' : 'ข้ามข้อนี้'}</button>}
      </div>
    </div>
  );
}
