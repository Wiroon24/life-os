import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, ROLE } from '../../ui/kit';
import { captureOpen, push } from '../../store/nav';
import { showUndo, toast } from '../../store/ui';
import { uid } from '../../store/persist';
import { live } from '../../store/collection';
import { dayKey } from '../../domain/time';
import { appNow, blocksFor, setStatus } from '../../domain/plan';
import { fileToImg, explain, hasAI } from '../../domain/ai';
import { analyzeImage, analyzeText, quickParse, type Parsed, type Kind } from '../../domain/capture';
import { fridge, eatBox, foodLog, logFood, unlogFood, water, totalsOn, targetsFor, QUICK } from '../../domain/food';
import { addTxn, confirmTxns, txns, categories, safeToSpend } from '../../domain/money';
import { logWeight, weights, inbodies, latestW } from '../../domain/body';
import { workouts } from '../../domain/training';
import { openWeigh } from '../sheets';

type Scr = 'sheet' | 'scan' | 'voice' | 'type' | 'result';
const MEALS = ['เช้า', 'กลางวัน', 'เย็น', 'ว่าง'];
const KIND: Record<Kind, { l: string; icon: string; soft: string; ink: string }> = {
  food: { l: 'อาหาร', icon: 'restaurant', soft: ROLE.food.soft, ink: ROLE.food.ink }, slip: { l: 'สลิปโอนเงิน', icon: 'receipt_long', soft: ROLE.money.soft, ink: ROLE.money.ink },
  receipt: { l: 'ใบเสร็จ', icon: 'receipt', soft: ROLE.money.soft, ink: ROLE.money.ink }, inbody: { l: 'ผล InBody', icon: 'monitor_weight', soft: ROLE.recovery.soft, ink: ROLE.recovery.ink },
  watch: { l: 'หน้าจอนาฬิกา', icon: 'watch', soft: ROLE.workout.soft, ink: ROLE.workout.ink }, other: { l: 'อื่นๆ', icon: 'help', soft: '#EFEDE7', ink: '#6B6962' },
};
const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? 0 : h < 15 ? 1 : h < 17 ? 3 : 2; };

/** Save a parsed capture; returns an undo function. */
function commit(p: Parsed, portion: number, meal: number, cat: string | null): { msg: string; undo: () => void } {
  const undos: (() => void)[] = []; const parts: string[] = [];
  const foods = p.food?.items.filter((i) => i.kcal > 0) ?? [];
  if (foods.length) {
    const ids = logFood(foods.map((i) => ({ name: `${i.name}${i.qty && i.qty !== '1 ที่' ? ' ' + i.qty : ''}`, k: i.kcal * portion, p: i.protein * portion, c: i.carb * portion, f: i.fat * portion, icon: 'restaurant', source: 'photo' as const })));
    foodLog.value = foodLog.value.map((e) => (ids.includes(e.id) ? { ...e, slot: MEALS[meal] } : e));
    undos.push(() => unlogFood(ids));
    parts.push(`มื้อ${MEALS[meal]} ${Math.round(foods.reduce((a, i) => a + i.kcal, 0) * portion)} kcal`);
  }
  if (p.money) {
    const tx = addTxn({ ts: Date.now(), amount: p.money.amount, inc: p.money.income, merchant: p.money.merchant, account: p.money.account || 'บัญชี', source: p.kind === 'slip' ? 'slip' : 'text', cat: cat ?? (live(categories.value).some((c) => c.name === p.money!.category) ? p.money.category : undefined) });
    confirmTxns([tx.id]); undos.push(() => (txns.value = txns.value.filter((x) => x.id !== tx.id)));
    parts.push(`${tx.inc ? 'รายรับ' : 'รายจ่าย'} ${tx.amount.toLocaleString()} ฿ · ${tx.cat}`);
  }
  if (p.inbody && (p.inbody.weight || p.inbody.smm)) {
    const before = weights.value; const kg = p.inbody.weight ?? latestW()?.kg ?? 0;
    logWeight(kg, { fat: p.inbody.fat_pct ?? undefined, smm: p.inbody.smm ?? undefined, visceral: p.inbody.visceral ?? undefined, source: 'inbody' });
    undos.push(() => (weights.value = before)); parts.push('บันทึกผล InBody แล้ว');
  } else if (p.weight) { const before = weights.value; logWeight(p.weight); undos.push(() => (weights.value = before)); parts.push(`น้ำหนัก ${p.weight} kg`); }
  if (p.watch) {
    const id = uid(), now = Date.now(), d = appNow();
    workouts.value = [...workouts.value, { id, date: dayKey(d), dayId: 'watch', dayName: p.watch.activity, t0: now - p.watch.minutes * 60000, t1: now, ex: [] }];
    const blk = blocksFor(d).find((b) => b.title.includes(p.watch!.activity) || (b.kind === 'workout' && /วิ่ง|ลู่|คาร์ดิโอ/.test(p.watch!.activity + b.title)));
    if (blk) setStatus(dayKey(d), blk.id, 'done');
    undos.push(() => (workouts.value = workouts.value.filter((w) => w.id !== id))); parts.push(`${p.watch.activity} ${p.watch.minutes} นาที`);
  }
  return { msg: parts.join(' · ') || 'บันทึกแล้ว', undo: () => undos.forEach((u) => u()) };
}

export function Capture() {
  const [scr, setScr] = useState<Scr>('sheet');
  const [img, setImg] = useState<string | null>(null);
  const [p, setP] = useState<Parsed | null>(null), [err, setErr] = useState<string | null>(null);
  const [portion, setPortion] = useState(1), [meal, setMeal] = useState(defaultMeal()), [cat, setCat] = useState<string | null>(null);
  const [text, setText] = useState(''), [aiBusy, setAiBusy] = useState(false), [listening, setListening] = useState(false);
  const file = useRef<HTMLInputElement>(null), input = useRef<HTMLInputElement>(null), seq = useRef(0);
  const close = () => { captureOpen.value = false; };
  const done = (r: { msg: string; undo: () => void }) => { close(); showUndo(r.msg, r.undo); };

  const onFile = async (f?: File) => {
    if (!f) return;
    setErr(null); setP(null); setScr('scan');
    try {
      const im = await fileToImg(f); setImg(im.url);
      if (!hasAI()) throw new Error('noai');
      const r = await analyzeImage(im); setP(r); setCat(null); setPortion(1); setScr('result');
    } catch (e) { setErr((e as Error).message === 'noai' ? 'ต้องใส่ Claude API key ก่อน ถึงจะอ่านรูปได้ · ไปที่โปรไฟล์ → ตั้งค่า AI' : explain(e)); }
  };

  // Typed/spoken text: instant local parse, then AI refinement after a short pause.
  useEffect(() => {
    if (scr !== 'type' && scr !== 'voice') return;
    const q = quickParse(text); setP(q);
    if (!hasAI() || text.trim().length < 3) return;
    const my = ++seq.current;
    const t = setTimeout(async () => { setAiBusy(true); try { const r = await analyzeText(text); if (my === seq.current) setP(r); } catch { /* keep local parse */ } finally { if (my === seq.current) setAiBusy(false); } }, 900);
    return () => clearTimeout(t);
  }, [text, scr]);

  const startVoice = () => {
    const W = window as unknown as Record<string, unknown>; const SR = (W.SpeechRecognition ?? W.webkitSpeechRecognition) as (new () => { lang: string; interimResults: boolean; start(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void }) | undefined;
    setText(''); setScr('voice');
    if (!SR) { toast('เครื่องนี้พูดสั่งไม่ได้ ใช้ไมค์บนคีย์บอร์ดแทน'); setScr('type'); setTimeout(() => input.current?.focus(), 60); return; }
    const r = new SR(); r.lang = 'th-TH'; r.interimResults = true; setListening(true);
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(''));
    r.onend = () => setListening(false); r.start();
  };

  if (!captureOpen.value) return null;
  const d = appNow(), t = targetsFor(d), have = totalsOn(d);
  const box = fridge.value.filter((b) => b.qty > 0)[0];
  const freq = Object.entries(foodLog.value.slice(-80).reduce<Record<string, number>>((a, e) => ((a[e.name] = (a[e.name] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => foodLog.value.findLast((e) => e.name === n)!);
  const recents = freq.length ? freq.map((e) => ({ t: e.name, sub: `${e.k} kcal · โปรตีน ${e.p} g`, icon: e.icon, go: () => { const ids = logFood([{ ...e, source: 'quick' }]); done({ msg: `${e.name} · โปรตีน +${e.p} g`, undo: () => unlogFood(ids) }); } }))
    : QUICK.slice(0, 3).map((q) => ({ t: q.name, sub: `${q.k} kcal · โปรตีน ${q.p} g`, icon: q.icon, go: () => { const ids = logFood([{ ...q, source: 'quick' }]); done({ msg: `${q.name} · โปรตีน +${q.p} g`, undo: () => unlogFood(ids) }); } }));
  const k = water.value[dayKey(d)] ?? 0;
  const shortcuts = [
    box ? { l: box.name.length > 12 ? 'กล่อง meal prep' : box.name, icon: 'lunch_dining', role: 'food' as const, go: () => { const u = eatBox(box.id); if (u) done({ msg: `${box.name} · ${box.k} kcal`, undo: u }); } }
      : { l: 'ทำ batch', icon: 'soup_kitchen', role: 'food' as const, go: () => { close(); push('batch'); } },
    { l: 'น้ำ +500 ml', icon: 'water_drop', role: 'info' as const, go: () => { const kk = dayKey(d); water.value = { ...water.value, [kk]: k + 500 }; done({ msg: `ดื่มน้ำ +500 ml · รวม ${((k + 500) / 1000).toFixed(1)} L`, undo: () => (water.value = { ...water.value, [kk]: k }) }); } },
    { l: 'ชั่งน้ำหนัก', icon: 'monitor_weight', role: 'recovery' as const, go: () => { close(); openWeigh(); } },
    { l: 'รายจ่าย', icon: 'payments', role: 'money' as const, go: () => { setText('จ่าย '); setScr('type'); setTimeout(() => input.current?.focus(), 60); } },
  ];

  const kcal = p?.food ? Math.round(p.food.items.reduce((a, i) => a + i.kcal, 0) * portion) : 0;
  const parsedCards = p ? [
    ...(p.food?.items.map((i) => ({ kind: 'อาหาร', role: 'food' as const, icon: 'restaurant', t: i.name, sub: i.kcal ? `${Math.round(i.kcal)} kcal · P ${Math.round(i.protein)} g` : hasAI() ? 'AI กำลังประมาณแคลอรี่…' : 'ใส่ API key เพื่อประมาณแคลอรี่' })) ?? []),
    ...(p.money ? [{ kind: p.money.income ? 'รายรับ' : 'รายจ่าย', role: 'money' as const, icon: 'payments', t: `${p.money.amount.toLocaleString()} ฿`, sub: `${p.money.merchant} · ${p.money.category}` }] : []),
    ...(p.weight ? [{ kind: 'น้ำหนัก', role: 'recovery' as const, icon: 'monitor_weight', t: `${p.weight} kg`, sub: 'บันทึกเข้าแนวโน้ม' }] : []),
    ...(p.watch ? [{ kind: 'ออกกำลังกาย', role: 'workout' as const, icon: 'directions_run', t: p.watch.activity, sub: `${p.watch.minutes} นาที` }] : []),
  ] : [];
  const canSave = parsedCards.length > 0 && !(p?.food && p.food.items.some((i) => !i.kcal) && aiBusy);

  const layer = (children: preact.ComponentChildren, dark = false) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, maxWidth: 430, margin: '0 auto', background: dark ? '#101114' : 'var(--bg)', color: dark ? '#fff' : 'var(--ink)', display: 'flex', flexDirection: 'column', animation: 'iam-fade 160ms ease-out' }}>{children}</div>
  );
  const head = (title: string) => <div class="row" style={{ justifyContent: 'space-between', padding: '8px 8px 0' }}><button class="btn icon" onClick={close} aria-label="ปิด"><Icon n="close" /></button><span class="muted" style={{ fontSize: 15, fontWeight: 600 }}>{title}</span><span style={{ width: 48 }} /></div>;
  const cardsList = <>{parsedCards.map((c) => <div class="card row" style={{ borderRadius: 18, padding: 12, minHeight: 64, animation: 'iam-up 220ms var(--ease-out)' }}><span class="medal" style={{ width: 40, height: 40, background: ROLE[c.role].soft, color: ROLE[c.role].ink }}><Icon n={c.icon} fill size={22} /></span><span class="col grow"><span style={{ fontSize: 12, fontWeight: 600, color: ROLE[c.role].ink }}>{c.kind}</span><span class="t16">{c.t}</span><span class="cap muted">{c.sub}</span></span></div>)}</>;
  const fileInput = <input ref={file} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onFile((e.target as HTMLInputElement).files?.[0])} />;

  /* ---------- Sheet ---------- */
  if (scr === 'sheet') return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, maxWidth: 430, margin: '0 auto' }}>
      {fileInput}
      <button onClick={close} aria-label="ปิด" style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', animation: 'iam-fade 200ms ease-out' }} />
      <div class="no-scrollbar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92dvh', overflowY: 'auto', background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 16px calc(28px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 18, animation: 'iam-sheet 320ms var(--ease-out)', boxShadow: '0 -12px 28px rgba(23,24,28,.12)' }}>
        <span style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 999, background: '#D9D6CE' }} />
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span class="h2">บันทึก</span><span class="muted" style={{ fontSize: 13.5 }}>ถ่าย พูด หรือพิมพ์ AI แยกให้เอง</span></div>
        <button class="press" onClick={() => file.current?.click()} style={{ position: 'relative', height: 172, borderRadius: 22, overflow: 'hidden', background: '#1B1C22', color: '#fff', textAlign: 'left' }}>
          <span style={{ position: 'absolute', top: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', padding: '6px 10px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--primary)' }} />กล้องพร้อม</span>
          <Icon n="photo_camera" size={56} color="#3A3B44" style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          <span class="col" style={{ position: 'absolute', left: 14, bottom: 14, gap: 2 }}><span style={{ fontSize: 19, fontWeight: 700 }}>แตะเพื่อถ่าย</span><span style={{ fontSize: 13, color: '#C9C6BD' }}>อาหาร · สลิป · ใบเสร็จ · InBody · นาฬิกา</span></span>
          <span style={{ position: 'absolute', right: 14, bottom: 14, width: 60, height: 60, borderRadius: 999, boxShadow: 'inset 0 0 0 4px #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 46, height: 46, borderRadius: 999, background: '#fff' }} /></span>
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: -10 }}>
          <button class="press" style={{ height: 64, borderRadius: 18, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 17, fontWeight: 600 }} onClick={startVoice}><span class="medal" style={{ width: 36, height: 36, background: 'var(--ink)', color: '#fff' }}><Icon n="mic" fill size={22} /></span>พูด</button>
          <button class="press" style={{ height: 64, borderRadius: 18, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 17, fontWeight: 600 }} onClick={() => { setText(''); setScr('type'); setTimeout(() => input.current?.focus(), 60); }}><span class="medal" style={{ width: 36, height: 36, background: '#fff' }}><Icon n="keyboard" size={22} /></span>พิมพ์</button>
        </div>
        <div class="col" style={{ gap: 8 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>แตะเดียวจบ</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>{shortcuts.map((s) => <button class="press" style={{ minHeight: 84, borderRadius: 18, background: ROLE[s.role].soft, color: ROLE[s.role].ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px' }} onClick={s.go}><Icon n={s.icon} fill size={26} /><span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, textAlign: 'center', color: 'var(--ink)' }}>{s.l}</span></button>)}</div>
        </div>
        <div class="col" style={{ gap: 2 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600, paddingBottom: 4 }}>บันทึกบ่อย</span>
          {recents.map((r) => <button class="row" style={{ gap: 12, minHeight: 56, padding: '4px 4px 4px 0', borderRadius: 14, textAlign: 'left' }} onClick={r.go}><span class="medal" style={{ width: 36, height: 36, background: ROLE.food.soft, color: ROLE.food.ink }}><Icon n={r.icon} fill size={20} /></span><span class="col grow"><span style={{ fontSize: 15.5, fontWeight: 600 }}>{r.t}</span><span class="muted" style={{ fontSize: 12.5 }}>{r.sub}</span></span><span class="medal" style={{ background: 'var(--bg)' }}><Icon n="add" size={22} /></span></button>)}
        </div>
      </div>
    </div>
  );

  /* ---------- Scanning ---------- */
  if (scr === 'scan') return layer(<>
    {fileInput}
    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 236, borderRadius: 24, overflow: 'hidden', background: '#24252B' }}>
      {img && <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />}
      {!err && <span style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'var(--primary)', boxShadow: '0 0 18px var(--primary)', animation: 'iam-scan 1.6s ease-in-out infinite alternate' }} />}
    </div>
    <button class="btn icon" style={{ position: 'absolute', top: 28, left: 28, background: 'rgba(16,17,20,.6)', color: '#fff' }} onClick={close} aria-label="ปิด"><Icon n="close" /></button>
    <div class="col" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(40px + env(safe-area-inset-bottom))', gap: 14 }}>
      <div class="row" style={{ gap: 10, minHeight: 32 }}>{!err && <span style={{ width: 20, height: 20, borderRadius: 999, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#fff', animation: 'iam-spin .8s linear infinite' }} />}<span style={{ fontSize: 20, fontWeight: 600 }}>{err ? 'อ่านรูปไม่สำเร็จ' : 'AI กำลังดูว่าเป็นอะไร…'}</span></div>
      {err ? <><span style={{ fontSize: 15, color: '#C9C6BD', lineHeight: 1.5 }}>{err}</span><div class="row" style={{ gap: 8 }}><button class="btn white" onClick={() => file.current?.click()}>ถ่ายใหม่</button><button class="btn" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }} onClick={() => { setScr('type'); setText(''); }}>พิมพ์แทน</button></div></>
        : <div class="row" style={{ flexWrap: 'wrap', gap: 8 }}>{(['food', 'slip', 'receipt', 'inbody', 'watch'] as Kind[]).map((k2) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 999, background: 'rgba(255,255,255,.1)', color: '#C9C6BD', fontSize: 14, fontWeight: 600 }}><Icon n={KIND[k2].icon} fill size={18} />{KIND[k2].l}</span>)}</div>}
      <span style={{ fontSize: 13.5, color: '#A3A097' }}>ไม่ต้องเลือกโหมด ถ่ายอะไรก็ได้</span>
    </div>
  </>, true);

  /* ---------- Voice / Type ---------- */
  if (scr === 'voice' || scr === 'type') {
    const saveL = parsedCards.length > 1 ? `บันทึกทั้ง ${parsedCards.length} รายการ` : 'บันทึก';
    return layer(<>
      {head(scr === 'voice' ? (listening ? 'กำลังฟัง…' : 'เข้าใจว่า') : 'พิมพ์ประโยคเดียว แยกให้เอง')}
      <div class="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: scr === 'type' ? 'flex-end' : 'flex-start' }}>
        {scr === 'voice' && <><div class="row" style={{ height: 96, justifyContent: 'center', gap: 5 }}>{Array.from({ length: 18 }, (_, i) => <span style={{ width: 5, borderRadius: 999, background: listening ? 'var(--primary)' : 'var(--surface-3)', height: listening ? `${20 + ((i * 37) % 60)}%` : '12%', animation: listening ? `iam-dot ${0.6 + (i % 5) * 0.12}s ${i * 0.04}s infinite` : 'none' }} />)}</div>
          <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.5, minHeight: 72 }}>{text || 'พูดได้เลย เช่น “กินข้าวมันไก่ 60 บาท”'}<span style={{ color: 'var(--primary)' }}>{listening ? '|' : ''}</span></span></>}
        {!p && scr === 'type' && <div class="col" style={{ gap: 8 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>ลองแบบนี้</span><div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>{['กินข้าวมันไก่ 60 บาท', 'น้ำหนัก 95.4', 'วิ่ง 5 กม.', 'ขายหูฟัง 1200 บาท'].map((e) => <button class="card" style={{ height: 44, padding: '0 14px', borderRadius: 999, fontSize: 14.5, fontWeight: 500 }} onClick={() => setText(e)}>{e}</button>)}</div></div>}
        {p && <span class="row muted" style={{ fontSize: 13, fontWeight: 600, gap: 6 }}>แยกได้ {parsedCards.length} รายการ{aiBusy && <span class="spin" style={{ width: 14, height: 14, borderWidth: 2 }} />}</span>}
        {cardsList}
      </div>
      <div class="col" style={{ padding: '8px 16px calc(16px + env(safe-area-inset-bottom))', gap: 8 }}>
        {p && <button class="btn primary lg block" disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }} onClick={() => p && done(commit(p, 1, defaultMeal(), null))}><Icon n="check" />{saveL}</button>}
        {scr === 'type' ? <div class="row" style={{ gap: 8, background: '#fff', borderRadius: 999, padding: '0 6px 0 18px', height: 56, boxShadow: 'inset 0 0 0 2px var(--ink)' }}>
          <input ref={input} value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} placeholder="กินอะไร จ่ายเท่าไหร่ ชั่งได้เท่าไหร่" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 16 }} />
          <button class="btn icon" style={{ color: 'var(--ink-2)' }} onClick={() => setText('')} aria-label="ล้าง"><Icon n="close" size={22} /></button>
        </div> : !p && <div class="col" style={{ alignItems: 'center', gap: 8 }}><button class="medal press" style={{ width: 72, height: 72, background: 'var(--ink)', color: '#fff' }} onClick={startVoice} aria-label="พูดใหม่"><Icon n="mic" fill size={32} /></button><span class="cap muted">หยุดพูดแล้วจะสรุปให้เอง</span></div>}
      </div>
    </>);
  }

  /* ---------- Result (photo) ---------- */
  if (!p) return null;
  const meta = KIND[p.kind];
  const left = safeToSpend().left - (p.money && !p.money.income ? p.money.amount : 0);
  const ib = p.inbody, prevIb = inbodies().at(-1);
  const saveLabel = { food: `บันทึก · มื้อ${MEALS[meal]}`, slip: p.money?.income ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย', receipt: 'บันทึกรายจ่าย', inbody: 'บันทึกผล InBody', watch: 'บันทึกการซ้อม', other: 'บันทึก' }[p.kind];
  return layer(<>
    <div class="row" style={{ gap: 8, padding: '8px 16px 0 8px' }}>
      <button class="btn icon" onClick={close} aria-label="ปิด"><Icon n="close" /></button>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: meta.soft, color: meta.ink, height: 36, padding: '0 12px', borderRadius: 999, fontSize: 14, fontWeight: 600 }}><Icon n={meta.icon} fill size={18} />{meta.l}</span>
      <span class="grow" /><span class="muted" style={{ fontSize: 13 }}>AI มั่นใจ {p.confidence}%</span>
    </div>
    <div class="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {p.kind === 'other' && <div class="card" style={{ padding: 16 }}><span class="t16">{p.summary}</span><span class="cap muted" style={{ display: 'block', marginTop: 4 }}>ไม่แน่ใจว่าเป็นอะไร ลองถ่ายใหม่ให้ชัดขึ้น หรือพิมพ์แทน</span></div>}
      {p.food && <>
        {img && <img src={img} style={{ height: 150, width: '100%', objectFit: 'cover', borderRadius: 20 }} />}
        <div class="card" style={{ padding: '6px 14px' }}>{p.food.items.map((f, i) => <div class="row" style={{ gap: 10, minHeight: 48, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span class="t16 grow">{f.name}</span><span class="muted" style={{ fontSize: 14 }}>{f.qty}</span><span class="num" style={{ width: 72, textAlign: 'right', fontSize: 15, fontWeight: 600 }}>{Math.round(f.kcal * portion)}</span></div>)}</div>
        <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div class="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}><span class="col"><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>ปริมาณ ×{portion}</span><span class="num" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.15 }}>{kcal}<span class="muted" style={{ fontSize: 16, fontWeight: 500 }}> kcal</span></span></span><span class="muted" style={{ fontSize: 13, paddingBottom: 6 }}>เหลือวันนี้ {Math.max(0, t.k - have.k - kcal).toLocaleString()}</span></div>
          <input type="range" min={0.5} max={2} step={0.25} value={portion} onInput={(e) => setPortion(+(e.target as HTMLInputElement).value)} style={{ width: '100%', height: 32, accentColor: 'var(--food)', margin: 0 }} aria-label="ปริมาณ" />
          <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 12, marginTop: -10 }}><span>ครึ่ง</span><span>1 ที่</span><span>2 ที่</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>{([['โปรตีน', 'protein', 'p', '#FF9F1C', '#FFE9C7', '#9A5800'], ['คาร์บ', 'carb', 'c', '#22B455', '#D3F2DD', '#137A38'], ['ไขมัน', 'fat', 'f', '#7C5CFF', '#E6E0FF', '#5B3BE0']] as const).map(([l, key, tk, c, tr, ink]) => { const v = Math.round(p.food!.items.reduce((a, i) => a + i[key], 0) * portion); return <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: ink }}>{l}</span><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{v} g</span><span class="bar" style={{ height: 6, background: tr }}><span style={{ width: `${Math.min(100, (v / t[tk]) * 100)}%`, background: c }} /></span></div>; })}</div>
        </div>
        <div class="col" style={{ gap: 8 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>มื้อ</span><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'var(--surface-2)', borderRadius: 999, padding: 4, gap: 2 }}>{MEALS.map((l, i) => <button style={{ height: 44, borderRadius: 999, background: i === meal ? '#fff' : 'transparent', color: i === meal ? 'var(--ink)' : 'var(--ink-2)', fontSize: 15, fontWeight: 600, boxShadow: i === meal ? 'var(--shadow-1)' : 'none' }} onClick={() => setMeal(i)}>{l}</button>)}</div></div>
      </>}
      {p.money && (p.kind === 'slip' || p.kind === 'receipt' || !p.food) && <>
        <div class="card" style={{ borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div class="row" style={{ gap: 14 }}>{img && <img src={img} style={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 12, flex: 'none' }} />}<span class="col" style={{ gap: 2, minWidth: 0 }}><span class="num" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1 }}>{p.money.amount.toLocaleString()}<span style={{ fontSize: 20, fontWeight: 500 }}> ฿</span></span><span class="t16">{p.money.merchant}</span><span class="cap muted">{p.money.account} · {p.money.income ? 'เงินเข้า' : 'จ่ายออก'}</span></span></div>
          {!p.money.income && <div class="row" style={{ gap: 8, background: 'var(--money-soft)', borderRadius: 14, padding: '10px 12px' }}><Icon n="account_balance_wallet" size={20} color="var(--money-ink)" /><span style={{ fontSize: 14 }}>งบวันนี้เหลือ <b style={{ fontWeight: 600 }}>{Math.round(left).toLocaleString()} ฿</b> หลังรายการนี้</span></div>}
        </div>
        <div class="col" style={{ gap: 8 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600 }}>หมวด · AI เดาว่า {p.money.category} · แตะเพื่อเปลี่ยน</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>{live(categories.value).filter((c) => !!c.income === p.money!.income).map((c) => { const on = (cat ?? p.money!.category) === c.name; return <button class="press" style={{ height: 56, borderRadius: 16, background: on ? c.ink : c.soft, color: on ? '#fff' : c.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600 }} onClick={() => setCat(c.name)}><Icon n={c.icon} fill size={20} />{c.name}</button>; })}</div>
        </div>
      </>}
      {ib && <>
        <div class="card" style={{ borderRadius: 22, padding: '8px 16px' }}>
          <div class="muted" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 1fr 1fr 1.1fr', gap: 8, alignItems: 'center', minHeight: 40, fontSize: 12.5, fontWeight: 600, boxShadow: 'inset 0 -1px 0 var(--surface-2)' }}><span /><span style={{ textAlign: 'right' }}>วันนี้</span><span style={{ textAlign: 'right' }}>ครั้งก่อน</span><span style={{ textAlign: 'right' }}>เปลี่ยน</span></div>
          {([['น้ำหนัก', 'kg', ib.weight, prevIb?.kg, false], ['กล้ามเนื้อ', 'kg', ib.smm, prevIb?.smm, true], ['ไขมัน', '%', ib.fat_pct, prevIb?.fat, false], ['ไขมันช่องท้อง', 'ระดับ', ib.visceral, prevIb?.visceral, false]] as const).map(([l, u, now, prev, up], i) => {
            const dl = now != null && prev != null ? now - prev : null, good = dl == null || Math.abs(dl) < 0.05 ? null : (dl > 0) === up;
            return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 1fr 1fr 1.1fr', gap: 8, alignItems: 'center', minHeight: 56, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span class="col"><span style={{ fontSize: 15, fontWeight: 600 }}>{l}</span><span class="muted" style={{ fontSize: 12 }}>{u}</span></span>
              <span class="num" style={{ textAlign: 'right', fontSize: 17, fontWeight: 600 }}>{now ?? '—'}</span><span class="num muted" style={{ textAlign: 'right', fontSize: 15 }}>{prev ?? '—'}</span>
              <span class="num" style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 2, height: 30, padding: '0 8px 0 4px', borderRadius: 999, background: good == null ? '#EFEDE7' : good ? '#E3F5E8' : '#FDE7E4', color: good == null ? '#6B6962' : good ? '#137A38' : '#D92D20', fontSize: 14, fontWeight: 600 }}><Icon n={dl == null || Math.abs(dl) < 0.05 ? 'remove' : dl > 0 ? 'arrow_upward' : 'arrow_downward'} size={18} />{dl == null ? '—' : Math.abs(dl).toFixed(1)}</span>
            </div>; })}
        </div>
        {prevIb?.smm != null && ib.smm != null && <div class="card row" style={{ padding: '14px 16px', alignItems: 'flex-start' }}><span class="medal" style={{ width: 32, height: 32, background: 'var(--ink)', color: '#fff' }}><Icon n="sports" fill size={18} /></span><span style={{ fontSize: 15, lineHeight: 1.55 }}>{ib.smm >= prevIb.smm ? 'กล้ามเนื้อไม่ลด ทำต่อแบบนี้' : 'กล้ามเนื้อลดลงนิด เพิ่มโปรตีนวันละ 20 g และอย่าลดเวท'}{ib.fat_pct != null && prevIb.fat != null && ib.fat_pct < prevIb.fat ? ' · ไขมันลงดี' : ''}</span></div>}
      </>}
      {p.watch && <div class="card" style={{ borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div class="row"><span class="medal" style={{ width: 48, height: 48, background: 'var(--workout-soft)', color: 'var(--workout-ink)' }}><Icon n={/บาส/.test(p.watch.activity) ? 'sports_basketball' : 'directions_run'} fill size={26} /></span><span class="col"><span style={{ fontSize: 20, fontWeight: 600 }}>{p.watch.activity}</span><span class="cap muted">จากหน้าจอนาฬิกา</span></span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>{[['เวลา', `${p.watch.minutes} นาที`], ['เผาผลาญ', p.watch.kcal ? `${p.watch.kcal} kcal` : '—'], ['หัวใจเฉลี่ย', p.watch.avg_hr ? String(p.watch.avg_hr) : '—']].map(([l, v]) => <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--workout-ink)' }}>{l}</span><span class="num" style={{ fontSize: 18, fontWeight: 600 }}>{v}</span></div>)}</div>
      </div>}
    </div>
    <div style={{ padding: '8px 16px calc(24px + env(safe-area-inset-bottom))' }}>
      {p.kind === 'other' ? <button class="btn soft lg block" onClick={() => { setScr('type'); setText(''); }}>พิมพ์แทน</button>
        : <button class="btn primary lg block" onClick={() => done(commit(p, portion, meal, cat))}><Icon n="check" />{saveLabel}</button>}
    </div>
  </>);
}
