import { useState } from 'preact/hooks';
import { closeSheet, openSheet, showUndo, toast } from '../store/ui';
import { Icon, ROLE, type Role } from '../ui/kit';
import { fridge, eatBox, daysLeft, QUICK, logFood, unlogFood } from '../domain/food';
import { logWeight, latestW, weights } from '../domain/body';
import { editBlock, removeBlock, setStatus, addBlock, type Block } from '../domain/plan';
import { askScope } from '../store/ui';
import { fromMin, toMin } from '../domain/time';

/** Stepper: − value + */
export const Stepper = ({ value, onChange, step = 1, min = 0, fmt = (v: number) => String(v), w = 76 }: { value: number; onChange: (v: number) => void; step?: number; min?: number; fmt?: (v: number) => string; w?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', borderRadius: 12, height: 48 }}>
    <button aria-label="ลด" style={{ width: 44, height: 48 }} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Icon n="remove" size={20} /></button>
    <span class="num" style={{ width: w, textAlign: 'center', fontSize: 17, fontWeight: 600 }}>{fmt(value)}</span>
    <button aria-label="เพิ่ม" style={{ width: 44, height: 48 }} onClick={() => onChange(+(value + step).toFixed(2))}><Icon n="add" size={20} /></button>
  </div>
);

export function openWeigh(after?: () => void) {
  openSheet({ title: 'ชั่งน้ำหนัก', body: () => <WeighBody after={after} /> });
}
function WeighBody({ after }: { after?: () => void }) {
  const [kg, setKg] = useState(latestW()?.kg ?? 96);
  return (
    <div class="col" style={{ gap: 14 }}>
      <span class="small muted">หลังเข้าห้องน้ำ ก่อนกินอะไร · ระบบใช้ค่าเฉลี่ย 7 วัน ไม่ต้องกังวลตัวเลขรายวัน</span>
      <div class="row" style={{ justifyContent: 'center' }}><Stepper value={kg} onChange={setKg} step={0.1} min={30} fmt={(v) => v.toFixed(1) + ' kg'} w={120} /></div>
      <button class="btn primary lg block" onClick={() => { const before = weights.value; logWeight(kg); closeSheet(); showUndo(`บันทึก ${kg.toFixed(1)} kg`, () => (weights.value = before)); after?.(); }}>บันทึก</button>
    </div>
  );
}

export function openFoodQuick(after?: () => void) {
  openSheet({ title: 'กินอะไรไป', body: () => <FoodQuickBody after={after} /> });
}
function FoodQuickBody({ after }: { after?: () => void }) {
  const boxes = fridge.value.filter((b) => b.qty > 0);
  return (
    <div class="col" style={{ gap: 10 }}>
      {boxes.length > 0 && <span class="label">ตู้ meal prep · แตะ = กินแล้ว</span>}
      {boxes.map((b) => (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 12px', borderRadius: 16, background: 'var(--bg)', textAlign: 'left' }}
          onClick={() => { const undo = eatBox(b.id); closeSheet(); if (undo) showUndo(`${b.name} · ${b.k} kcal`, undo); after?.(); }}>
          <span class="num" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--food-soft)', color: 'var(--food-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×{b.qty}</span>
          <span class="col grow"><span class="t16">{b.name}</span><span class="cap muted">{b.k} kcal · P {b.p} · เก็บได้อีก {daysLeft(b)} วัน</span></span>
        </button>
      ))}
      <span class="label" style={{ marginTop: 4 }}>ของกินเร็ว</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {QUICK.map((q) => (
          <button class="press" style={{ minHeight: 64, borderRadius: 16, background: 'var(--bg)', padding: '10px 12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
            onClick={() => { const ids = logFood([{ ...q, source: 'quick' }]); closeSheet(); showUndo(`${q.name} · P ${q.p} g`, () => unlogFood(ids)); after?.(); }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{q.name}</span><span class="cap muted">{q.k} kcal · P {q.p} g</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const ROLES: [Role, string, string][] = [['food', 'กิน', 'restaurant'], ['workout', 'ซ้อม/ขยับ', 'fitness_center'], ['recovery', 'ฟื้นตัว/ผิว', 'spa'], ['money', 'เงิน', 'credit_card'], ['work', 'งาน', 'laptop_mac']];

/** Edit any block: title, time, duration, role — then ask scope. */
export function openBlockEdit(k: string, date: Date, blk: Block | null, defaults?: Partial<Block>) {
  openSheet({ title: blk ? 'แก้รายการ' : 'เพิ่มรายการ', body: () => <BlockEditBody k={k} date={date} blk={blk} defaults={defaults} /> });
}
function BlockEditBody({ k, date, blk, defaults }: { k: string; date: Date; blk: Block | null; defaults?: Partial<Block> }) {
  const [title, setTitle] = useState(blk?.title ?? defaults?.title ?? '');
  const [start, setStart] = useState(fromMin(blk?.start ?? defaults?.start ?? 600));
  const [dur, setDur] = useState(blk?.dur ?? defaults?.dur ?? 30);
  const [role, setRole] = useState<Role>(blk?.role ?? defaults?.role ?? 'work');
  const save = async () => {
    if (!title.trim()) return toast('ใส่ชื่อก่อน');
    let s = toMin(start); if (s < 240) s += 1440;
    const icon = ROLES.find((r) => r[0] === role)![2];
    const scope = await askScope(blk ? `บันทึก “${title}”` : `เพิ่ม “${title}”`);
    if (!scope) return;
    if (blk) editBlock(k, blk, { title: title.trim(), start: s, dur, role, icon: blk.role === role ? blk.icon : icon }, scope);
    else addBlock(k, { title: title.trim(), start: s, dur, role, icon, days: [] }, scope, date);
    closeSheet(); toast(`บันทึกแล้ว · ${scope === 'today' ? 'แค่วันนี้' : 'ทุกครั้งต่อจากนี้'}`);
  };
  return (
    <div class="col" style={{ gap: 14 }}>
      <label><span class="label">ชื่อ</span><input class="field" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="เช่น ประชุมทีม" /></label>
      <div class="row" style={{ gap: 10 }}>
        <label class="grow"><span class="label">เริ่ม</span><input class="field" type="time" value={start} onInput={(e) => setStart((e.target as HTMLInputElement).value)} /></label>
        <label><span class="label">นาน (นาที)</span><Stepper value={dur} onChange={setDur} step={5} min={5} w={52} /></label>
      </div>
      <div><span class="label">หมวด</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ROLES.map(([r, l]) => <button class="chip" onClick={() => setRole(r)} style={{ height: 40, background: role === r ? ROLE[r].c : ROLE[r].soft, color: role === r ? '#fff' : ROLE[r].ink }}>{l}</button>)}
        </div>
      </div>
      <div class="row" style={{ gap: 8 }}>
        {blk && <button class="btn soft lg" style={{ color: 'var(--error)' }} onClick={async () => { const scope = await askScope(`ลบ “${blk.title}”`); if (!scope) return; removeBlock(k, blk, scope); closeSheet(); toast('ลบแล้ว'); }}><Icon n="delete" size={22} /></button>}
        <button class="btn primary lg grow" onClick={save}>บันทึก</button>
      </div>
    </div>
  );
}

/** Status actions for a block (tap in timeline). */
export function openBlockActions(k: string, date: Date, blk: Block & { st?: string }) {
  openSheet({ title: blk.title, body: () => (
    <div class="col" style={{ gap: 8 }}>
      <span class="small muted" style={{ marginTop: -8 }}>{fromMin(blk.start)}–{fromMin(blk.start + blk.dur)}{blk.sub ? ` · ${blk.sub}` : ''}</span>
      {([['done', 'ทำแล้ว', 'check_circle'], ['skip', 'ข้าม', 'redo'], [null, 'ยังไม่ทำ', 'radio_button_unchecked']] as const).map(([s, l, icon]) => (
        <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 56, padding: '0 12px', borderRadius: 14, background: blk.st === s || (!blk.st && s === null) ? 'var(--surface-2)' : 'transparent', textAlign: 'left' }}
          onClick={() => { setStatus(k, blk.id, s); closeSheet(); }}><Icon n={icon} size={24} /><span class="t16">{l}</span></button>
      ))}
      <button class="press" style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 56, padding: '0 12px', borderRadius: 14, textAlign: 'left' }} onClick={() => openBlockEdit(k, date, blk)}><Icon n="edit" size={24} /><span class="t16">แก้รายการ</span></button>
    </div>
  ) });
}
