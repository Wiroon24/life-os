import { useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back } from '../../store/nav';
import { showUndo } from '../../store/ui';
import { uid } from '../../store/persist';
import { profile, type Tone } from '../../domain/profile';
import { memories, type Memory } from '../../domain/coach';

const TONES: [Tone, string, string, string][] = [
  ['strict', 'เข้ม', 'พูดตรง ตามทวงจนกว่าจะทำ', 'ตั้งแต่เที่ยงยังไม่มีบันทึกอาหารเลย 3 ชั่วโมงแล้ว ถ้าไม่กินตอนนี้มื้อเย็นจะกินเกิน กินอะไรไปหรือยัง'],
  ['balanced', 'สมดุล', 'เตือนชัด แต่ไม่กดดัน', 'ยังไม่เห็นบันทึกอาหารตั้งแต่เที่ยงนะ กินรองท้องไว้หน่อยจะดีกว่า'],
  ['gentle', 'อ่อนโยน', 'ชวนคุย ให้กำลังใจ', 'ตั้งแต่เที่ยงยังไม่ได้บันทึกอาหารเลย ไม่เป็นไรนะ ถ้าว่างลองกินอะไรเบาๆ ก่อนดีไหม'],
];
const GROUPS: Memory['group'][] = ['ร่างกาย', 'อาหาร', 'ชีวิต', 'อื่นๆ'];

export function CoachSettings() {
  const tone = profile.value.tone;
  const [editId, setEditId] = useState<string | null>(null), [draft, setDraft] = useState(''), [nt, setNt] = useState('');
  const save = (id: string) => { const d = draft.trim(); if (d) memories.value = memories.value.map((m) => (m.id === id ? { ...m, text: d, src: 'แก้เอง · วันนี้' } : m)); setEditId(null); };
  const add = () => { const t = nt.trim(); if (!t) return; memories.value = [...memories.value, { id: uid(), group: 'อื่นๆ', text: t, src: 'เพิ่มเอง · วันนี้' }]; setNt(''); };
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="ตั้งค่าโค้ช" onBack={back} />
      <div class="col" style={{ gap: 2 }}><span style={{ fontSize: 20, fontWeight: 600 }}>บุคลิก</span><span class="muted" style={{ fontSize: 13.5 }}>ตัวอย่าง: ไม่ได้บันทึกอาหารตั้งแต่เที่ยง</span></div>
      {TONES.map(([k, l, sub, sample]) => { const on = tone === k; return (
        <button style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 20, background: '#fff', textAlign: 'left', boxShadow: on ? '0 0 0 2px var(--ink)' : 'var(--shadow-1)', transition: 'box-shadow 150ms' }} onClick={() => (profile.value = { ...profile.value, tone: k })}>
          <div class="row" style={{ gap: 10, width: '100%' }}><span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, boxShadow: on ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 2px #CFCBC1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 999, background: on ? 'var(--ink)' : 'transparent' }} /></span><span class="col grow"><span class="t16">{l}</span><span class="muted" style={{ fontSize: 12.5 }}>{sub}</span></span></div>
          <div class="col" style={{ gap: 6, width: '100%' }}><div class="row" style={{ gap: 6 }}><span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="sports" fill size={13} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>โค้ช</span></div><span style={{ alignSelf: 'flex-start', background: 'var(--bg)', borderRadius: '6px 18px 18px 18px', padding: '10px 12px', fontSize: 14.5, lineHeight: 1.55 }}>{sample}</span></div>
        </button>); })}
      <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}><span class="col"><span style={{ fontSize: 20, fontWeight: 600 }}>สิ่งที่โค้ชจำได้</span><span class="muted" style={{ fontSize: 13.5 }}>ใช้ตอนแนะนำอาหาร ท่า และเวลา</span></span><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>{memories.value.length} เรื่อง</span></div>
      {GROUPS.map((g) => { const items = memories.value.filter((m) => m.group === g); if (!items.length) return null; return (
        <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>{g}</span>
          <div class="card" style={{ padding: '4px 6px 4px 14px' }}>{items.map((m, i) => (
            <div class="row" style={{ gap: 6, minHeight: 60, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              {editId === m.id ? <>
                <input class="field" style={{ height: 44 }} value={draft} onInput={(e) => setDraft((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') save(m.id); }} aria-label="แก้ข้อความ" />
                <button class="btn dark" style={{ height: 44, fontSize: 14 }} onClick={() => save(m.id)}>บันทึก</button>
              </> : <>
                <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{m.text}</span><span class="muted" style={{ fontSize: 12.5 }}>{m.src}</span></span>
                <button class="btn icon" style={{ color: 'var(--ink-2)' }} onClick={() => { setEditId(m.id); setDraft(m.text); }} aria-label="แก้"><Icon n="edit" size={20} /></button>
                <button class="btn icon" style={{ color: 'var(--error)' }} onClick={() => { const before = memories.value; memories.value = memories.value.filter((x) => x.id !== m.id); showUndo(`ลืม “${m.text}” แล้ว`, () => (memories.value = before)); }} aria-label="ลบ"><Icon n="delete" size={20} /></button>
              </>}
            </div>))}</div>
        </div>); })}
      <div class="row" style={{ gap: 6, background: '#fff', borderRadius: 999, height: 56, padding: '0 6px 0 18px', boxShadow: 'inset 0 0 0 1.5px #E0DDD5' }}>
        <input value={nt} onInput={(e) => setNt((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="บอกโค้ชให้จำเรื่องใหม่" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 15.5 }} />
        <button class="btn icon dark" style={{ width: 44, height: 44 }} onClick={add} aria-label="เพิ่ม"><Icon n="add" size={22} /></button>
      </div>
    </div>
  );
}
