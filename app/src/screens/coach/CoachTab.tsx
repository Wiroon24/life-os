import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { push, captureOpen } from '../../store/nav';
import { clock } from '../../domain/time';
import { chat, send, typing, pickFeel, decideProp, undoCard, updateMsg, maybeNudge, greeting, coachSay, type Msg, type Card } from '../../domain/coach';
import { proposals, checkins } from '../../domain/body';
import { appNow } from '../../domain/plan';
import { dayKey } from '../../domain/time';
import { unlogFood, logFood, foodLog } from '../../domain/food';

const time = (ts: number) => clock(new Date(ts));
const B = 'inset 0 0 0 1.5px var(--surface-3)';

function CardView({ m, c, i }: { m: Msg; c: Card; i: number }) {
  const setCard = (patch: Partial<Card>) => updateMsg(m.id, { cards: m.cards!.map((x, j) => (j === i ? ({ ...x, ...patch } as Card) : x)) });
  if (c.type === 'swap') return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: B }}>
      <div class="muted" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 8, fontSize: 12, fontWeight: 600 }}><span /><span>ก่อน</span><span>หลัง</span></div>
      {c.rows.map((r) => <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 8, alignItems: 'center', minHeight: 44 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{r[0]}</span><span class="muted" style={{ fontSize: 13.5, textDecoration: c.undone ? 'none' : 'line-through' }}>{r[1]}</span><span style={{ fontSize: 13.5, fontWeight: 600, background: c.undone ? 'transparent' : 'var(--food-soft)', borderRadius: 10, padding: '6px 8px' }}>{c.undone ? r[1] : r[2]}</span></div>)}
      <div class="row" style={{ justifyContent: 'space-between', boxShadow: 'inset 0 1px 0 var(--surface-2)', paddingTop: 6 }}><span style={{ fontSize: 13, fontWeight: 600, color: c.undone ? 'var(--ink-2)' : 'var(--workout-ink)' }}>{c.undone ? 'เลิกทำแล้ว · ตารางกลับเป็นเดิม' : 'ตารางซ้อมอัปเดตแล้ว'}</span>
        {!c.undone && <button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => { undoCard(c); setCard({ undone: true }); }}><Icon n="undo" size={18} />เลิกทำ</button>}</div>
    </div>);
  if (c.type === 'log') return <LogCard c={c} onChange={setCard} />;
  if (c.type === 'done') return (
    <div class="row" style={{ background: '#fff', borderRadius: 18, padding: '10px 12px', boxShadow: B }}>
      <span class="medal" style={{ width: 36, height: 36, background: 'var(--success-tint)', color: 'var(--workout-ink)' }}><Icon n="check_circle" fill size={20} /></span>
      <span class="grow" style={{ fontSize: 14.5, fontWeight: 600 }}>{c.text}</span>
      {c.undo && <button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => { undoCard(c); setCard({ undo: undefined, text: c.text + ' · เลิกทำแล้ว' }); }}>เลิกทำ</button>}
    </div>);
  if (c.type === 'plan') return <div style={{ background: '#fff', borderRadius: 18, padding: '6px 14px', boxShadow: B }}>{c.plan.map((p, j) => <div class="row" style={{ gap: 10, minHeight: 56, boxShadow: j ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>{p[0] && <span class="num" style={{ width: 44, fontSize: 13.5, fontWeight: 700 }}>{p[0]}</span>}<span class="col grow"><span style={{ fontSize: 15, fontWeight: 600 }}>{p[1]}</span><span class="muted" style={{ fontSize: 12.5 }}>{p[2]}</span></span></div>)}</div>;
  if (c.type === 'feel') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>{['แย่', 'เหนื่อย', 'เฉยๆ', 'ดี', 'ดีมาก'].map((l, j) => { const on = c.picked === j + 1; return (
      <button class="press" style={{ minHeight: 68, borderRadius: 16, background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, boxShadow: B }} onClick={() => { if (c.picked == null) pickFeel(m.id, j + 1); }}><span style={{ fontSize: 22, fontWeight: 700 }}>{j + 1}</span><span style={{ fontSize: 11.5, fontWeight: 600 }}>{l}</span></button>); })}</div>);
  if (c.type === 'sum') return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{c.sum.map(([l, v, fg]) => <div style={{ background: '#fff', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', boxShadow: B }}><span class="muted" style={{ fontSize: 12, fontWeight: 600 }}>{l}</span><span class="num" style={{ fontSize: 18, fontWeight: 600, color: fg }}>{v}</span></div>)}</div>;
  if (c.type === 'props') {
    const ps = proposals(appNow()), dec = checkins.value[dayKey(appNow())]?.decided ?? {};
    return (
      <div class="col" style={{ gap: 6 }}>{c.ids.map((id) => { const p = ps.find((x) => x.id === id); const d = dec[id]; if (!p && !d) return null; return (
        <div style={{ background: d === 'ok' ? '#F2FAF4' : '#fff', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: B }}>
          <div class="row" style={{ alignItems: 'flex-start', gap: 8 }}><span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600, textDecoration: d === 'no' ? 'line-through' : 'none' }}>{p ? p.title(p.value) : id}</span>{p && <span class="muted" style={{ fontSize: 12.5 }}>{p.why}</span>}</span>{d && <span style={{ fontSize: 12.5, fontWeight: 700, color: d === 'ok' ? 'var(--workout-ink)' : 'var(--ink-2)' }}>{d === 'ok' ? 'ยอมรับแล้ว' : 'ไม่เอา'}</span>}</div>
          {!d && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}><button class="btn dark" style={{ height: 44, fontSize: 14 }} onClick={() => decideProp(id, true)}>ยอมรับ</button><button class="btn soft" style={{ height: 44, fontSize: 14 }} onClick={() => decideProp(id, false)}>ไม่เอา</button></div>}
        </div>); })}</div>);
  }
  return null;
}

function LogCard({ c, onChange }: { c: Extract<Card, { type: 'log' }>; onChange: (p: Partial<Card>) => void }) {
  const [edit, setEdit] = useState(false), [portion, setPortion] = useState(1);
  const save = () => {
    const old = foodLog.value.filter((e) => c.ids.includes(e.id)); unlogFood(c.ids);
    const ids = logFood(old.map((e) => ({ ...e, k: e.k * portion, p: e.p * portion, c: e.c * portion, f: e.f * portion })));
    onChange({ ids, k: Math.round(c.k * portion), p: Math.round(c.p * portion) }); setEdit(false); setPortion(1);
  };
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: B }}>
      <div class="row">
        <span class="medal" style={{ width: 40, height: 40, background: 'var(--success-tint)', color: 'var(--workout-ink)' }}><Icon n="check_circle" fill size={22} /></span>
        <span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{c.ids.length ? `บันทึกอาหารแล้ว ${Math.round(c.k * (edit ? portion : 1))} kcal · โปรตีน ${Math.round(c.p * (edit ? portion : 1))} g` : 'ลบรายการแล้ว'}</span><span class="muted" style={{ fontSize: 12.5 }}>{c.food}</span></span>
        {!edit && c.ids.length > 0 && <button class="btn soft" style={{ height: 40, fontSize: 14 }} onClick={() => setEdit(true)}>แก้</button>}
      </div>
      {edit && <div class="row" style={{ gap: 8 }}>
        <span class="grow" style={{ fontSize: 14, fontWeight: 600 }}>ปริมาณ</span>
        <div class="row" style={{ background: 'var(--bg)', borderRadius: 12, height: 44, gap: 0 }}><button style={{ width: 40, height: 44 }} onClick={() => setPortion(Math.max(0.5, portion - 0.5))} aria-label="ลด"><Icon n="remove" size={20} /></button><span class="num" style={{ width: 56, textAlign: 'center', fontSize: 16, fontWeight: 600 }}>×{portion}</span><button style={{ width: 40, height: 44 }} onClick={() => setPortion(portion + 0.5)} aria-label="เพิ่ม"><Icon n="add" size={20} /></button></div>
        <button class="btn dark" style={{ height: 44, fontSize: 14 }} onClick={save}>บันทึก</button>
        <button class="btn icon" style={{ color: 'var(--error)' }} onClick={() => { unlogFood(c.ids); onChange({ ids: [] }); setEdit(false); }} aria-label="ลบ"><Icon n="delete" size={20} /></button>
      </div>}
    </div>
  );
}

export function CoachTab() {
  const [text, setText] = useState(''), [listening, setListening] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!chat.value.length) coachSay(greeting()); maybeNudge(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat.value.length, typing.value]);
  const msgs = chat.value, last = msgs[msgs.length - 1];
  const go = (t: string) => { setText(''); send(t); };
  const mic = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!SR) { coachSay({ who: 'c', text: 'เครื่องนี้ยังพูดสั่งไม่ได้ ใช้คีย์บอร์ดไมค์ของ Android แทนได้' }); return; }
    const r = new SR(); r.lang = 'th-TH'; r.interimResults = true; setListening(true);
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(''));
    r.onend = () => setListening(false); r.start();
  };
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 10px', background: 'var(--bg)', boxShadow: '0 1px 0 var(--surface-3)' }}>
        <div class="row" style={{ gap: 10, padding: '0 8px 0 16px' }}><span class="col grow"><span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>โค้ช</span><span class="muted" style={{ fontSize: 12.5 }}>รู้ข้อมูลซ้อม กิน นอน เงิน · สั่งงานได้</span></span><button class="btn icon" onClick={() => push('coach-settings')} aria-label="ตั้งค่าโค้ช"><Icon n="psychology" /></button></div>
        <div class="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px' }}>{['วันนี้กินอะไรดี', 'เลื่อนเวทได้ไหม', 'สรุปสัปดาห์'].map((l) => <button class="press" style={{ height: 40, flex: 'none', padding: '0 14px', borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'inset 0 0 0 1.5px #E0DDD5' }} onClick={() => go(l)}>{l}</button>)}</div>
      </div>
      <div style={{ flex: 1, padding: '14px 16px 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m) => m.who === 'me' ? (
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, animation: 'iam-up 280ms var(--ease-out)' }}><span style={{ background: 'var(--ink)', color: '#fff', borderRadius: '20px 20px 6px 20px', padding: '10px 14px', fontSize: 15.5, lineHeight: 1.5 }}>{m.text}</span><span class="muted" style={{ fontSize: 11.5, paddingRight: 4 }}>{time(m.ts)}</span></div>
        ) : (
          <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '92%', animation: 'iam-up 280ms var(--ease-out)' }}>
            <div class="row" style={{ gap: 6 }}><span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="sports" fill size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>โค้ช</span><span class="muted" style={{ fontSize: 11.5 }}>{time(m.ts)}</span>{m.nudge && <span style={{ background: '#FFE3DA', color: '#B83A1C', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>ทักก่อน</span>}</div>
            {m.text && <span style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: '6px 20px 20px 20px', padding: '12px 14px', fontSize: 15.5, lineHeight: 1.55, whiteSpace: 'pre-line', boxShadow: B }}>{m.text}</span>}
            {m.cards?.map((c, i) => <CardView m={m} c={c} i={i} />)}
            {m === last && m.replies?.length ? <div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>{m.replies.map((l, i) => <button class="btn press" style={{ height: 44, fontSize: 14.5, background: i === 0 ? 'var(--ink)' : '#fff', color: i === 0 ? '#fff' : 'var(--ink)', boxShadow: i ? B : 'none' }} onClick={() => go(l)}>{l}</button>)}</div> : null}
          </div>
        ))}
        {typing.value && <div class="row" style={{ alignSelf: 'flex-start', gap: 5, background: '#fff', borderRadius: '6px 20px 20px 20px', padding: '14px 16px', boxShadow: B }}>{[0, 0.15, 0.3].map((dl) => <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ink-2)', animation: `iam-dot 1s ${dl}s infinite` }} />)}</div>}
        <div ref={end} />
      </div>
      <div class="row" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(406px, calc(100% - 24px))', bottom: 'calc(100px + env(safe-area-inset-bottom))', zIndex: 7, gap: 6, background: '#fff', borderRadius: 999, padding: '4px 4px 4px 6px', height: 60, boxShadow: '0 6px 20px rgba(23,24,28,.10), inset 0 0 0 1.5px #E0DDD5' }}>
        <button class="btn icon" style={{ color: 'var(--ink-2)' }} onClick={() => { captureOpen.value = true; }} aria-label="กล้อง"><Icon n="photo_camera" /></button>
        <input value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) go(text); }} placeholder={listening ? 'กำลังฟัง…' : 'พิมพ์หรือสั่งงานโค้ช'} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 16 }} />
        <button class="press" onClick={() => (text.trim() ? go(text) : mic())} aria-label={text.trim() ? 'ส่ง' : 'พูด'} style={{ width: 52, height: 52, flex: 'none', borderRadius: 999, background: listening ? 'var(--primary)' : 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n={text.trim() ? 'arrow_upward' : 'mic'} fill /></button>
      </div>
    </div>
  );
}

interface SpeechRec { lang: string; interimResults: boolean; start(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void }
