import { useState } from 'preact/hooks';
import { Icon, TopBar } from '../../ui/kit';
import { back, push } from '../../store/nav';
import { appNow } from '../../domain/plan';
import { program, weekIds, dayById } from '../../domain/training';
import { infoFor, type Group } from '../../domain/exerciseInfo';
import { send } from '../../domain/coach';
import { goTab } from '../../store/nav';

/** Two demo frames (start / end) that flip on tap; falls back to a YouTube search when no image exists. */
export function ExImg({ name, h = 220 }: { name: string; h?: number }) {
  const info = infoFor(name), [f, setF] = useState(0);
  if (!info?.img) return (
    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(info?.alt ?? name + ' วิธีทำ')}`} target="_blank" rel="noreferrer" style={{ height: h, borderRadius: 20, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-2)', textDecoration: 'none', fontSize: 14 }}><Icon n="play_circle" size={36} />ท่านี้ยังไม่มีรูป · ดูตัวอย่างวิดีโอ</a>
  );
  return (
    <button class="press" onClick={() => setF(1 - f)} style={{ position: 'relative', height: h, borderRadius: 20, overflow: 'hidden', background: '#fff', padding: 0 }} aria-label="สลับภาพต้น/ปลายท่า">
      <img src={`/ex/${info.img}/${f}.jpg`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      <span style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(23,24,28,.72)', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>{f ? 'ปลายท่า' : 'ต้นท่า'} · แตะเพื่อสลับ</span>
    </button>
  );
}

export function ExerciseDetail({ name }: { name: string }) {
  const i = infoFor(name);
  const e = program.value.flatMap((d) => d.exercises).find((x) => x.name === name);
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title={name} onBack={back} />
      <ExImg name={name} h={250} />
      {!i ? <div class="card" style={{ padding: 16 }}><span class="muted">ยังไม่มีคำอธิบายของท่านี้ ถามโค้ชในแท็บโค้ชได้</span></div> : <>
        <div class="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span class="chip on">{i.pattern}</span><span class="chip">{i.muscles}</span>{e && <span class="chip">{e.sets} × {e.reps}{e.repUnit !== 'ครั้ง' ? ' ' + e.repUnit : ''}</span>}
        </div>
        <div style={{ background: 'var(--recovery-soft)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--recovery-ink)' }}>ทำไมท่านี้อยู่ในโปรแกรมของคุณ</span>
          <span style={{ fontSize: 15, lineHeight: 1.6 }}>{i.why}</span>
        </div>
        <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span class="h2">ทำอย่างไร</span>
          {i.steps.map((s, n) => <div class="row" style={{ alignItems: 'flex-start', gap: 10 }}><span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, background: 'var(--ink)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n + 1}</span><span style={{ fontSize: 15, lineHeight: 1.55 }}>{s}</span></div>)}
        </div>
        <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span class="h2">ที่มักพลาด</span>
          {i.mistakes.map((m) => <div class="row" style={{ alignItems: 'flex-start', gap: 8 }}><Icon n="close" size={20} color="var(--error)" /><span style={{ fontSize: 15, lineHeight: 1.5 }}>{m}</span></div>)}
          {i.tip && <div class="row" style={{ alignItems: 'flex-start', gap: 8, marginTop: 4 }}><Icon n="tips_and_updates" fill size={20} color="var(--workout-ink)" /><span style={{ fontSize: 15, lineHeight: 1.5 }}>{i.tip}</span></div>}
        </div>
      </>}
      <a class="btn soft" style={{ height: 52, textDecoration: 'none' }} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(i?.alt ?? name + ' วิธีทำ')}`} target="_blank" rel="noreferrer"><Icon n="play_circle" size={20} />ดูวิดีโอเพิ่ม (ถ้าอยากเห็นการเคลื่อนไหวจริง)</a>
    </div>
  );
}

const TARGET: Partial<Record<Group, [number, number]>> = { 'อก': [10, 20], 'หลัง': [10, 20], 'ไหล่': [8, 16], 'แขน': [6, 14], 'ต้นขาหน้า': [10, 20], 'สะโพกและหลังต้นขา': [8, 16], 'น่อง': [6, 12], 'แกนกลาง': [6, 12] };

/** Weekly working sets per muscle group, balance ratios and rule-based notes. */
export function weekAnalysis() {
  const ids = weekIds(appNow()), sets: Partial<Record<Group, number>> = {}, pat: Record<string, number> = {};
  let cardioMin = 0;
  const days = ids.map((id) => dayById(id));
  for (const d of days) for (const e of d.exercises) {
    const i = infoFor(e.name); if (!i) continue;
    if (i.pattern === 'คาร์ดิโอ') { cardioMin += e.reps; continue; }
    i.groups.forEach((g, n) => { sets[g] = (sets[g] ?? 0) + (n === 0 ? e.sets : e.sets / 2); }); // กลุ่มรองนับครึ่งเซ็ต
    pat[i.pattern] = (pat[i.pattern] ?? 0) + e.sets;
  }
  const notes: string[] = [];
  const push_ = pat['ดัน'] ?? 0, pull = pat['ดึง'] ?? 0;
  if (pull < push_) notes.push(`ท่าดึง ${pull} เซ็ต น้อยกว่าท่าดัน ${push_} เซ็ต ไหล่มีโอกาสห่อ ลองเพิ่ม rear delt fly หรือ row 1–2 เซ็ต`);
  else notes.push(`ท่าดึง ${pull} เซ็ต ไม่น้อยกว่าท่าดัน ${push_} เซ็ต ไหล่และท่าทางสมดุลดี`);
  for (const [g, [lo, hi]] of Object.entries(TARGET) as [Group, [number, number]][]) { const n = Math.round(sets[g] ?? 0); if (n < lo) notes.push(`${g} ${n} เซ็ต/สัปดาห์ ต่ำกว่าช่วงที่แนะนำ ${lo}–${hi}`); else if (n > hi) notes.push(`${g} ${n} เซ็ต/สัปดาห์ เกินช่วง ${lo}–${hi} ระวังฟื้นตัวไม่ทัน`); }
  const knee = Math.round(sets['ต้นขาหน้า'] ?? 0);
  notes.push(`เข่า/เอ็นลูกสะบ้า: ต้นขาหน้า ${knee} เซ็ต แต่ลงช้า 3 วิ และมี leg extension, wall sit ช่วยให้เอ็นแข็งแรงทีละน้อย ถ้าปวดเกิน 4/10 หรือแย่ลงวันถัดไปให้ลดน้ำหนัก`);
  notes.push(`น่อง/ข้อเท้า: เขย่งลงช้าและหมุนข้อเท้า/ยืดน่องก่อนหลังซ้อมช่วยกับเอ็นน่องและข้อเท้าที่เคยบาดเจ็บ`);
  notes.push(`คาร์ดิโอรวม ~${cardioMin} นาที/สัปดาห์ (นอกเหนือการเล่นบาสวันจันทร์) พอสำหรับลดไขมันโดยไม่แย่งแรงฟื้นตัวของเวท`);
  return { sets, pat, cardioMin, notes };
}

export function Analysis() {
  const a = weekAnalysis();
  const rows = (Object.keys(TARGET) as Group[]).map((g) => [g, Math.round(a.sets[g] ?? 0), TARGET[g]!] as const);
  const ids = weekIds(appNow());
  return (
    <div class="screen sub" style={{ gap: 14 }}>
      <TopBar title="ทำไมจัดโปรแกรมแบบนี้" onBack={back} />
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span class="h2">หลักคิด</span>
        <span style={{ fontSize: 15, lineHeight: 1.6 }}>เป้าคือลดไขมันโดยรักษาและเพิ่มกล้ามเนื้อ จึงเน้นท่าประกอบ (compound) ที่ใช้ดัมเบลและเครื่องที่คุณมี สลับบน/ล่างวันเว้นวัน เพื่อให้แต่ละกลุ่มกล้ามเนื้อได้ซ้อม 2 ครั้ง/สัปดาห์ ส่วนข้อเท้า เข่า และน่องที่เคยมีปัญหา ใช้การลงช้า การค้างเกร็ง ท่าทีละขา และวอร์ม/ยืดเฉพาะจุด โดยไม่หลีกเลี่ยงท่าที่โหลดเข่า เพราะเอ็นต้องได้รับแรงอย่างค่อยเป็นค่อยไปถึงจะแข็งแรงขึ้น</span>
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span class="h2">เซ็ตต่อสัปดาห์ แยกตามกลุ่มกล้ามเนื้อ</span>
        {rows.map(([g, n, [lo, hi]]) => { const ok = n >= lo && n <= hi; return (
          <div class="col" style={{ gap: 4 }}>
            <div class="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 15 }}>{g}</span><span class="num" style={{ fontSize: 14, fontWeight: 600, color: ok ? 'var(--workout-ink)' : 'var(--error)' }}>{n} <span class="muted" style={{ fontWeight: 400 }}>/ {lo}–{hi}</span></span></div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: `${(lo / 24) * 100}%`, width: `${((hi - lo) / 24) * 100}%`, top: 0, bottom: 0, background: '#CDEFD8' }} />
              <div style={{ position: 'absolute', left: 0, width: `${Math.min(100, (n / 24) * 100)}%`, top: 0, bottom: 0, borderRadius: 999, background: ok ? '#22B455' : '#E5484D', opacity: 0.85 }} />
            </div>
          </div>); })}
        <span class="cap muted">แถบเขียวอ่อน = ช่วงที่งานวิจัยแนะนำสำหรับการเพิ่มกล้ามเนื้อ (ประมาณ 10–20 เซ็ตต่อกลุ่มต่อสัปดาห์) ตัวเลขคิดจากโปรแกรมสัปดาห์นี้ของคุณ (กล้ามเนื้อรองนับครึ่งเซ็ต)</span>
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span class="h2">ข้อสังเกต</span>
        {a.notes.map((n) => <div class="row" style={{ alignItems: 'flex-start', gap: 8 }}><Icon n="chevron_right" size={20} color="var(--ink-3)" /><span style={{ fontSize: 15, lineHeight: 1.55 }}>{n}</span></div>)}
      </div>
      <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span class="h2">แต่ละวัน และเหตุผลของท่า</span>
        {ids.map((id) => dayById(id)).filter((d, i, l) => d.kind !== 'rest' && l.findIndex((x) => x.id === d.id) === i).map((d) => (
          <div class="col" style={{ gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</span>
            {d.exercises.map((e) => <button class="row" style={{ minHeight: 44, gap: 10, textAlign: 'left' }} onClick={() => push('exercise', { name: e.name })}><span class="grow" style={{ fontSize: 15 }}>{e.name}</span><Icon n="chevron_right" size={20} color="var(--ink-3)" /></button>)}
          </div>))}
      </div>
      <button class="btn soft" style={{ height: 52 }} onClick={() => { goTab('coach'); void send('วิเคราะห์โปรแกรมซ้อมสัปดาห์นี้ของฉันอย่างละเอียด เรื่องความสมดุลกล้ามเนื้อ mobility ความยืดหยุ่น และข้อเท้า/เข่า/น่อง แล้วบอกว่าควรปรับอะไร'); }}><Icon n="auto_awesome" size={20} />ให้โค้ช AI วิเคราะห์ลึก</button>
    </div>
  );
}
