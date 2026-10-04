import { useState } from 'preact/hooks';
import { Icon, Ring, ROLE, Seg, TopBar } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { showUndo, toast } from '../../store/ui';
import { thDate, dayKey } from '../../domain/time';
import { appNow } from '../../domain/plan';
import { uid } from '../../store/persist';
import { targetsFor, totalsOn, entriesOn, suggestForProtein, water, WATER_GOAL, fridge, eatBox, daysLeft, logFood, unlogFood, dayType, INGREDIENTS, shopping, aiTargets, customTargets, tdee, type DayType, type Macro } from '../../domain/food';
import { latestW, rate } from '../../domain/body';
import { Stepper } from '../sheets';

export function EatSection() {
  const date = appNow(), t = targetsFor(date), have = totalsOn(date), meals = entriesOn(date), sug = suggestForProtein(date);
  const dt = dayType(date), ml = water.value[dayKey(date)] ?? 0;
  const addWater = (n: number) => { const k = dayKey(date), before = water.value[k] ?? 0; water.value = { ...water.value, [k]: before + n }; showUndo(`น้ำ +${n} ml`, () => (water.value = { ...water.value, [k]: before })); };
  const mac: [string, keyof Macro, string, string, string][] = [['โปรตีน', 'p', '#FF9F1C', '#FFE9C7', '#9A5800'], ['คาร์บ', 'c', '#22B455', '#D3F2DD', '#137A38'], ['ไขมัน', 'f', '#7C5CFF', '#E6E0FF', '#5B3BE0']];
  const boxes = fridge.value.filter((b) => b.qty > 0 || daysLeft(b) > -2);
  return (
    <>
      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div class="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: dt === 'train' ? 'var(--workout-soft)' : 'var(--surface-2)', color: dt === 'train' ? 'var(--workout-ink)' : 'var(--ink-2)', height: 32, padding: '0 12px', borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}><Icon n={dt === 'train' ? 'fitness_center' : 'bedtime'} fill size={18} />{dt === 'train' ? 'วันซ้อม' : 'วันพัก'} · {thDate(date)}</span>
          <button class="row muted" style={{ height: 36, padding: '0 10px', gap: 4, fontSize: 13.5, fontWeight: 600 }} onClick={() => push('goals')}>{customTargets.value[dt] ? 'เป้าตั้งเอง' : 'เป้าโดย AI'}<Icon n="chevron_right" size={18} /></button>
        </div>
        <div class="row" style={{ gap: 16 }}>
          <Ring value={have.k / t.k} size={148} stroke={14} color={ROLE.food.c} track={ROLE.food.tint}><span class="num" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{Math.max(0, t.k - have.k).toLocaleString()}</span><span class="muted" style={{ fontSize: 12.5 }}>kcal ที่เหลือ</span></Ring>
          <div class="col grow" style={{ gap: 10 }}>
            {mac.map(([l, k, c, track, ink]) => (
              <div class="col" style={{ gap: 4 }}>
                <div class="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span style={{ fontWeight: 600, color: ink }}>{l}</span><span class="num"><b style={{ fontWeight: 600 }}>{have[k]}</b><span class="muted"> / {t[k]} g</span></span></div>
                <span class="bar" style={{ background: track }}><span style={{ width: `${Math.min(100, (have[k] / t[k]) * 100)}%`, background: c }} /></span>
              </div>
            ))}
          </div>
        </div>
        <span class="num muted" style={{ fontSize: 13 }}>กินแล้ว {have.k.toLocaleString()} จาก {t.k.toLocaleString()} kcal</span>
      </div>

      {sug && sug.items.length > 0 ? (
        <div style={{ background: 'var(--food-soft)', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div class="col" style={{ gap: 2 }}><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--food-ink)' }}>ยังขาดอีก</span><span class="h2">โปรตีน {sug.miss} g</span><span class="muted" style={{ fontSize: 13.5 }}>จากของที่มีตอนนี้</span></div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '4px 12px' }}>
            {sug.items.map((s, i) => <div class="row" style={{ gap: 10, minHeight: 52, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><Icon n={s.icon} fill size={22} color="var(--food-ink)" /><span class="grow" style={{ fontSize: 15.5, fontWeight: 600 }}>{s.name}</span><span class="num" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--workout-ink)' }}>+{s.p} g</span></div>)}
          </div>
          <span class="num muted" style={{ fontSize: 13.5 }}>รวม +{sug.p} g · {sug.k} kcal · {sug.left >= 0 ? `ยังอยู่ในเป้า (เหลือ ${sug.left} kcal)` : `เกินเป้า ${-sug.left} kcal`}</span>
          <button class="btn dark" style={{ height: 52, fontSize: 16 }} onClick={() => {
            const undos: (() => void)[] = []; const quick = sug.items.filter((s) => !s.boxId);
            for (const s of sug.items) if (s.boxId) { const u = eatBox(s.boxId); if (u) undos.push(u); }
            if (quick.length) { const ids = logFood(quick.map((q) => ({ ...q, source: 'quick' as const }))); undos.push(() => unlogFood(ids)); }
            showUndo(`บันทึก ${sug.items.length} รายการ · โปรตีน +${sug.p} g`, () => undos.forEach((u) => u()));
          }}><Icon n="check" size={22} />กินตามนี้ · บันทึก{sug.items.length > 1 ? 'ทั้งคู่' : ''}</button>
        </div>
      ) : have.p >= t.p - 5 && (
        <div class="row" style={{ background: 'var(--workout-soft)', borderRadius: 22, padding: 16 }}><Icon n="check_circle" fill size={28} color="var(--workout-ink)" /><span class="t16">โปรตีนครบเป้าวันนี้แล้ว</span></div>
      )}

      <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span class="row" style={{ gap: 8, fontSize: 17, fontWeight: 600 }}><Icon n="water_drop" fill size={22} color="#0B6E8A" />น้ำ</span><span class="num" style={{ fontSize: 15 }}><b style={{ fontSize: 20, fontWeight: 600 }}>{(ml / 1000).toFixed(ml % 1000 ? 2 : 1).replace(/0$/, '')}</b><span class="muted"> / {WATER_GOAL / 1000} L</span></span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13,1fr)', gap: 3 }}>{Array.from({ length: 13 }, (_, i) => <span style={{ height: 20, borderRadius: 5, background: i < Math.floor(ml / 250) ? '#22A6C9' : '#E6F6FB', transition: 'background 200ms' }} />)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[250, 500].map((n) => <button class="btn press" style={{ height: 52, background: '#E6F6FB', color: '#0B6E8A', fontSize: 16 }} onClick={() => addWater(n)}>+{n} ml</button>)}</div>
      </div>

      <div class="col" style={{ gap: 8 }}>
        <span class="h2">มื้อวันนี้</span>
        {meals.length === 0 && <span class="small muted" style={{ padding: '0 4px' }}>ยังไม่ได้บันทึก กด ⊕ ถ่ายรูป หรือแตะกล่องในตู้ด้านล่าง</span>}
        {meals.map((m) => (
          <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 10 }}>
            <span class="num" style={{ fontSize: 14.5, fontWeight: 600, textAlign: 'right', paddingTop: 16 }}>{m.time}</span>
            <button class="card row" style={{ borderRadius: 18, padding: '10px 14px 10px 12px', minHeight: 64, textAlign: 'left' }} onClick={() => { const before = [...entriesOn(date)]; unlogFood([m.id]); showUndo(`ลบ ${m.name}`, () => logFood([before.find((x) => x.id === m.id)!])); }}>
              <span class="medal" style={{ width: 36, height: 36, background: 'var(--food-soft)', color: 'var(--food-ink)' }}><Icon n={m.icon} fill size={20} /></span>
              <span class="col grow"><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--food-ink)' }}>{m.slot}</span><span style={{ fontSize: 15.5, fontWeight: 600 }}>{m.name}</span></span>
              <span class="col num" style={{ alignItems: 'flex-end' }}><span style={{ fontSize: 15, fontWeight: 600 }}>{m.k} kcal</span><span class="muted" style={{ fontSize: 12.5 }}>P {m.p} g</span></span>
            </button>
          </div>
        ))}
        {meals.length > 0 && <span class="cap muted" style={{ padding: '0 4px' }}>แตะมื้อเพื่อลบ (เลิกทำได้)</span>}
      </div>

      <div class="col" style={{ gap: 8 }}>
        <div class="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span class="h2">ตู้ meal prep</span><span class="cap muted">แตะกล่อง = กินแล้ว</span></div>
        {boxes.length === 0 && <button class="card press" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }} onClick={() => push('batch')}><span class="medal" style={{ background: 'var(--food-soft)', color: 'var(--food-ink)' }}><Icon n="soup_kitchen" fill /></span><span class="col grow"><span class="t16">ตู้ยังว่าง</span><span class="cap muted">ทำ batch แรก แล้วกินแต่ละกล่องแค่แตะเดียว</span></span><Icon n="chevron_right" color="var(--ink-2)" /></button>}
        {boxes.map((b) => { const dl = daysLeft(b), warn = b.qty > 0 && dl <= 1; return (
          <button class="card press" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, padding: '10px 12px', borderRadius: 18, textAlign: 'left', opacity: b.qty ? 1 : 0.45 }}
            onClick={() => { if (!b.qty) return; const u = eatBox(b.id); if (u) showUndo(`${b.name} · ${b.k} kcal · เหลือ ${b.qty - 1} กล่อง`, u); }}>
            <span class="num" style={{ width: 48, height: 48, flex: 'none', borderRadius: 14, background: 'var(--food-soft)', color: 'var(--food-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>×{b.qty}</span>
            <span class="col grow" style={{ gap: 2 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{b.name}</span>
              <span class="num muted" style={{ fontSize: 12.5 }}>{b.k} kcal · P {b.p} · C {b.c} · F {b.f}</span>
              {warn ? <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, background: 'var(--error-tint)', color: '#B42318', height: 24, padding: '0 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}><Icon n="schedule" size={14} />{dl <= 0 ? 'กินวันนี้' : 'กินภายในพรุ่งนี้'}</span>
                : <span class="muted" style={{ fontSize: 12 }}>{b.qty === 0 ? 'หมดแล้ว' : `เก็บได้อีก ${dl} วัน`}</span>}
            </span>
            <span class="medal" style={{ background: 'var(--bg)' }}><Icon n="check" size={22} /></span>
          </button>); })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {([['ทำ batch', 'soup_kitchen', 'batch'], ['ซื้อของ', 'shopping_cart', 'shop'], ['เป้าโภชนาการ', 'tune', 'goals']] as const).map(([l, ic, r]) => (
          <button class="card press" style={{ minHeight: 92, borderRadius: 18, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left' }} onClick={() => push(r)}><Icon n={ic} /><span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{l}</span></button>
        ))}
      </div>
    </>
  );
}

const sumMacro = (rows: { g: number; i: number }[]) => rows.reduce((a, r) => { const p = INGREDIENTS[r.i].per100; return { k: a.k + (p.k * r.g) / 100, p: a.p + (p.p * r.g) / 100, c: a.c + (p.c * r.g) / 100, f: a.f + (p.f * r.g) / 100 }; }, { k: 0, p: 0, c: 0, f: 0 });

export function Batch() {
  const [rows, setRows] = useState([{ i: 0, g: 1000 }, { i: 7, g: 900 }, { i: 11, g: 600 }, { i: 14, g: 30 }]);
  const [boxes, setBoxes] = useState(5), [tgtP, setTgtP] = useState(45), [name, setName] = useState('');
  const [keep, setKeep] = useState(4);
  const tot = sumMacro(rows), prot = rows[0] ? INGREDIENTS[rows[0].i] : null;
  const otherP = sumMacro(rows.slice(1)).p, need = prot ? Math.max(0, Math.round((tgtP * boxes - otherP) / (prot.per100.p / 100) / 10) * 10) : 0;
  const autoName = rows.slice(0, 3).map((r) => INGREDIENTS[r.i].name.replace(/ดิบ|สุก|นึ่ง|\s*\(.*\)/g, '')).join(' ');
  const save = () => {
    const per = { k: Math.round(tot.k / boxes), p: Math.round(tot.p / boxes), c: Math.round(tot.c / boxes), f: Math.round(tot.f / boxes) };
    const id = uid(); fridge.value = [{ id, name: name.trim() || autoName, qty: boxes, ...per, madeAt: dayKey(), keepDays: keep }, ...fridge.value];
    showUndo(`เข้าตู้ ${boxes} กล่อง · P ${per.p} g ต่อกล่อง`, () => (fridge.value = fridge.value.filter((b) => b.id !== id))); back();
  };
  return (
    <div class="screen sub" style={{ gap: 12, paddingBottom: 120 }}>
      <TopBar title="ทำ batch" onBack={back} />
      <input class="field" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder={autoName || 'ชื่อกล่อง'} />
      <span class="label" style={{ marginBottom: -4 }}>วัตถุดิบดิบ (กรัม)</span>
      <div class="card" style={{ padding: '4px 12px' }}>
        {rows.map((r, j) => (
          <div class="row" style={{ gap: 8, minHeight: 60, boxShadow: j ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
            <span class="col grow" style={{ minWidth: 0 }}>
              <select style={{ border: 'none', background: 'none', fontSize: 15.5, fontWeight: 600, padding: 0, maxWidth: '100%' }} value={r.i} onChange={(e) => setRows(rows.map((x, k) => (k === j ? { ...x, i: +(e.target as HTMLSelectElement).value } : x)))}>{INGREDIENTS.map((g, gi) => <option value={gi}>{g.name}</option>)}</select>
              <span class="muted" style={{ fontSize: 12 }}>P {INGREDIENTS[r.i].per100.p} g ต่อ 100 g</span>
            </span>
            <Stepper value={r.g} onChange={(v) => setRows(rows.map((x, k) => (k === j ? { ...x, g: v } : x)))} step={INGREDIENTS[r.i].step} w={56} />
            <button class="btn icon" style={{ width: 36 }} onClick={() => setRows(rows.filter((_, k) => k !== j))} aria-label="ลบ"><Icon n="close" size={18} color="var(--ink-2)" /></button>
          </div>
        ))}
        <button class="row" style={{ minHeight: 52, gap: 6, fontWeight: 600, color: 'var(--ink-2)' }} onClick={() => setRows([...rows, { i: 12, g: 200 }])}><Icon n="add" size={20} />เพิ่มวัตถุดิบ</button>
      </div>
      <div class="card row" style={{ padding: '8px 12px 8px 16px', justifyContent: 'space-between' }}><span class="t16">แบ่งเป็น</span><Stepper value={boxes} onChange={(v) => setBoxes(Math.max(1, v))} min={1} fmt={(v) => `${v} กล่อง`} w={70} /></div>
      <div class="card row" style={{ padding: '8px 12px 8px 16px', justifyContent: 'space-between' }}><span class="t16">เก็บได้</span><Stepper value={keep} onChange={(v) => setKeep(Math.max(1, v))} min={1} fmt={(v) => `${v} วัน`} w={70} /></div>
      <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#C9C6BD' }}>ต่อกล่อง</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>{([['kcal', tot.k], ['โปรตีน g', tot.p], ['คาร์บ g', tot.c], ['ไขมัน g', tot.f]] as const).map(([l, v]) => <span class="col"><span class="num" style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(v / boxes)}</span><span style={{ fontSize: 12, color: '#C9C6BD' }}>{l}</span></span>)}</div>
      </div>
      {prot && <div class="card" style={{ borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span class="label" style={{ margin: 0 }}>คำนวณย้อนกลับ</span>
        <span style={{ fontSize: 16, lineHeight: 1.5 }}>อยากได้โปรตีน <b class="num" style={{ fontWeight: 700 }}>{tgtP} g</b> ต่อกล่อง</span>
        <input type="range" min={25} max={60} step={1} value={tgtP} onInput={(e) => setTgtP(+(e.target as HTMLInputElement).value)} style={{ width: '100%', height: 32, accentColor: 'var(--food)', margin: 0 }} aria-label="โปรตีนต่อกล่อง" />
        <div class="row" style={{ gap: 10, background: 'var(--food-soft)', borderRadius: 14, padding: '10px 10px 10px 14px' }}><span class="grow" style={{ fontSize: 15, lineHeight: 1.45 }}>ต้องใช้{prot.name} <b class="num" style={{ fontWeight: 700 }}>{need.toLocaleString()} g</b></span><button class="btn dark" style={{ height: 44, fontSize: 14 }} onClick={() => setRows(rows.map((x, k) => (k === 0 ? { ...x, g: need } : x)))}>ใช้ค่านี้</button></div>
      </div>}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)' }}><button class="btn primary lg block" style={{ fontSize: 17 }} onClick={save}>เก็บเข้าตู้ {boxes} กล่อง</button></div>
    </div>
  );
}

export function Shop() {
  const items = shopping.value, groups = [...new Set(items.map((i) => i.group))], done = items.filter((i) => i.done).length;
  const [add, setAdd] = useState('');
  const toggle = (id: string) => (shopping.value = shopping.value.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="รายการซื้อของ" onBack={back} right={<span class="num muted" style={{ fontSize: 14, fontWeight: 600 }}>{done}/{items.length}</span>} />
      <div class="row" style={{ gap: 8 }}><input class="field" value={add} onInput={(e) => setAdd((e.target as HTMLInputElement).value)} placeholder="เพิ่มของ เช่น อกไก่ 1 kg" onKeyDown={(e) => { if (e.key === 'Enter' && add.trim()) { shopping.value = [...shopping.value, { id: uid(), group: 'อื่นๆ', name: add.trim(), qty: '', done: false }]; setAdd(''); } }} /><button class="btn dark icon" style={{ height: 52, width: 52 }} onClick={() => { if (add.trim()) { shopping.value = [...shopping.value, { id: uid(), group: 'อื่นๆ', name: add.trim(), qty: '', done: false }]; setAdd(''); } }} aria-label="เพิ่ม"><Icon n="add" /></button></div>
      {groups.map((g) => (
        <div class="col" style={{ gap: 6 }}><span class="label" style={{ margin: 0 }}>{g}</span>
          <div class="card" style={{ padding: '4px 8px' }}>{items.filter((i) => i.group === g).map((i, k) => (
            <button class="row" style={{ width: '100%', gap: 12, minHeight: 56, padding: '0 6px', textAlign: 'left', boxShadow: k ? 'inset 0 1px 0 var(--surface-2)' : 'none' }} onClick={() => toggle(i.id)}>
              <span style={{ width: 26, height: 26, flex: 'none', borderRadius: 8, background: i.done ? 'var(--check)' : 'transparent', boxShadow: i.done ? 'none' : 'inset 0 0 0 2px #CFCBC1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i.done && <Icon n="check" size={18} />}</span>
              <span class="grow" style={{ fontSize: 15.5, fontWeight: 500, color: i.done ? 'var(--ink-2)' : 'var(--ink)', textDecoration: i.done ? 'line-through' : 'none' }}>{i.name}</span><span class="num muted" style={{ fontSize: 14 }}>{i.qty}</span>
            </button>))}</div>
        </div>
      ))}
      {done > 0 && <button class="btn soft" onClick={() => { const before = shopping.value; shopping.value = shopping.value.map((i) => ({ ...i, done: false })); showUndo('รีเซ็ตรายการแล้ว', () => (shopping.value = before)); }}>เริ่มรอบใหม่ (เอาติ๊กออก)</button>}
    </div>
  );
}

export function Goals() {
  const [d, setD] = useState<DayType>(dayType(appNow()));
  const ai = aiTargets(d), cur = customTargets.value[d] ?? ai, isC = !!customTargets.value[d];
  const set = (k: keyof Macro, dl: number) => (customTargets.value = { ...customTargets.value, [d]: { ...cur, [k]: Math.max(0, cur[k] + dl) } });
  const w = latestW()?.kg, r = rate();
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="เป้าโภชนาการ" onBack={back} />
      <Seg value={d} onChange={setD} options={[['train', 'วันซ้อม'], ['rest', 'วันพัก']]} />
      <div class="row" style={{ gap: 10, background: isC ? 'var(--surface-2)' : 'var(--recovery-soft)', borderRadius: 16, padding: '12px 14px' }}>
        <Icon n={isC ? 'person' : 'auto_awesome'} fill size={22} color={isC ? 'var(--ink)' : 'var(--recovery-ink)'} />
        <span class="col grow"><span style={{ fontSize: 15, fontWeight: 600, color: isC ? 'var(--ink)' : 'var(--recovery-ink)' }}>{isC ? 'คุณตั้งเอง' : 'AI ตั้งให้'}</span>
          <span class="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{isC ? `AI แนะนำ ${ai.k.toLocaleString()} kcal · P ${ai.p} g` : `TDEE ประมาณ ${tdee.value.kcal.toLocaleString()} kcal${w ? ` · น้ำหนัก ${w} kg` : ''}${r != null ? ` · ลด ${r.toFixed(2)} kg/สัปดาห์` : ''} · ปรับทุกเช็กอินวันอาทิตย์`}</span></span>
      </div>
      <div class="card" style={{ padding: '4px 12px' }}>
        {([['แคลอรี่', 'k', 50, ' kcal'], ['โปรตีน', 'p', 5, ' g'], ['คาร์บ', 'c', 10, ' g'], ['ไขมัน', 'f', 5, ' g']] as const).map(([l, k, st, u], i) => (
          <div class="row" style={{ gap: 8, minHeight: 64, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}><span class="t16 grow">{l}</span><Stepper value={cur[k]} onChange={(v) => set(k, v - cur[k])} step={st} fmt={(v) => v.toLocaleString() + u} w={84} /></div>
        ))}
      </div>
      {isC && <button class="btn soft" style={{ height: 52 }} onClick={() => { const c = { ...customTargets.value }; delete c[d]; customTargets.value = c; toast('กลับไปใช้ค่า AI'); }}><Icon n="auto_awesome" size={20} />กลับไปใช้ค่า AI</button>}
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span class="h2">ทำไมโปรตีน {cur.p} g</span>
        <span style={{ fontSize: 15, lineHeight: 1.6 }}>มวลไม่รวมไขมัน (LBM) ของคุณจาก InBody ราว 63 kg ไม่ใช่น้ำหนักตัวทั้งหมด{w ? ` (${w} kg)` : ''} เลขโปรตีนจึงดูสูงเมื่อเทียบกับ LBM ที่ตัวเลขดูน้อย</span>
        <div class="col" style={{ gap: 4, background: 'var(--surface-2)', borderRadius: 14, padding: 12 }}>
          {[['ตามมวล LBM', `${(cur.p / 63.2).toFixed(1)} g/kg LBM`], ['ตามน้ำหนักปัจจุบัน', w ? `${(cur.p / w).toFixed(2)} g/kg` : '-'], ['ตามน้ำหนักเป้าหมาย ~79 kg', `${(cur.p / 79).toFixed(1)} g/kg`]].map(([a, b]) => <div class="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14 }}>{a}</span><span class="num" style={{ fontSize: 14, fontWeight: 600 }}>{b}</span></div>)}
        </div>
        <span class="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>ช่วงที่งานวิจัยรองรับสำหรับคนที่ลดไขมันพร้อมเล่นเวทคือ ประมาณ 1.6–2.4 g ต่อน้ำหนักตัวหนึ่งกิโล หรือ 2.0–2.5 g ต่อ LBM ในช่วงขาดแคลอรี่ ซึ่งคือราว 130–160 g สำหรับคุณ 160 g เป็นปลายบน (เผื่อกล้ามเนื้อไม่หายตอนขาด) ถ้ากินได้ยาก ลดเหลือ 140 g ผลต่างกันไม่มาก ให้ปรับด้านบนได้เลย</span>
        <span class="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>แคลอรี่ = TDEE ลบประมาณ 450 kcal ต่อวัน (ลดราว 0.4–0.5 kg/สัปดาห์ ไม่ลดเร็วจนเสียกล้ามเนื้อ) วันซ้อมได้คาร์บเพิ่ม เพราะเป็นเชื้อเพลิงของเวท</span>
      </div>
    </div>
  );
}
