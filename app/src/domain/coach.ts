import Anthropic from '@anthropic-ai/sdk';
import { persisted, uid } from '../store/persist';
import { client, model, FALLBACK, hasAI, explain } from './ai';
import { profile } from './profile';
import { clock, dayKey, fromMin, toMin, DOW_SHORT } from './time';
import { appNow, appNowMin, blocksFor, editBlock, addBlock, statusOf, setStatus } from './plan';
import { totalsOn, targetsFor, entriesOn, logFood, unlogFood, suggestForProtein, fridge, daysLeft } from './food';
import { addTxn, confirmTxns, safeToSpend, txns, categories } from './money';
import { planFor, swapDays, weekIds, dayById, workouts } from './training';
import { latestW, avg7, rate, logWeight, weekSummary, proposals, checkins } from './body';
import { recovery, nightFor, hoursOf } from './sleep';

export type Card =
  | { type: 'log'; ids: string[]; food: string; k: number; p: number }
  | { type: 'swap'; a: number; b: number; rows: [string, string, string][]; undone?: boolean }
  | { type: 'plan'; plan: [string, string, string][] }
  | { type: 'feel'; picked?: number }
  | { type: 'sum'; sum: [string, string, string][] }
  | { type: 'props'; ids: string[] }
  | { type: 'done'; text: string; undo?: string };
export interface Msg { id: string; who: 'me' | 'c'; ts: number; text?: string; nudge?: boolean; cards?: Card[]; replies?: string[] }
export interface Memory { id: string; group: 'ร่างกาย' | 'อาหาร' | 'ชีวิต' | 'อื่นๆ'; text: string; src: string }

export const chat = persisted<Msg[]>('chat', []);
export const memories = persisted<Memory[]>('coachMemory', () => [
  { id: uid(), group: 'ร่างกาย', text: 'เคยข้อเท้าพลิก ปวดเอ็นลูกสะบ้าและเอ็นน่อง', src: 'จากการสัมภาษณ์ · วอร์มข้อเท้าทุกครั้ง' },
  { id: uid(), group: 'ร่างกาย', text: 'อยากแข็งแรงที่สุด ไม่ตัดท่า compound', src: 'จากการสัมภาษณ์' },
  { id: uid(), group: 'อาหาร', text: 'ทำ meal prep กินเอง ไม่แพ้อาหาร', src: 'จากการสัมภาษณ์' },
  { id: uid(), group: 'ชีวิต', text: 'ทำงานที่บ้าน เริ่มงาน 10:00 · บาสทุกวันจันทร์เย็น', src: 'จากการสัมภาษณ์' },
  { id: uid(), group: 'ชีวิต', text: 'เป้าเงิน: ปลดหนี้ + คุมใช้จ่ายให้อยู่ในงบ', src: 'จากการสัมภาษณ์' },
]);
export const typing = persisted('coachTyping', false);
const nudged = persisted<Record<string, boolean>>('nudged', {});

const say = (m: Omit<Msg, 'id' | 'ts'>) => { const x = { ...m, id: uid(), ts: Date.now() }; chat.value = [...chat.value, x]; return x; };
export const updateMsg = (id: string, patch: Partial<Msg>) => (chat.value = chat.value.map((m) => (m.id === id ? { ...m, ...patch } : m)));

const TONE = {
  strict: 'พูดตรง เข้ม ตามทวงจนกว่าจะทำ ไม่ประชด ไม่ด่า แต่ไม่ปล่อยผ่าน ประโยคสั้น',
  balanced: 'เตือนชัดเจนแต่ไม่กดดัน อบอุ่นพอดี',
  gentle: 'ชวนคุย ให้กำลังใจ อ่อนโยน',
};

/* ---------- Live context for the model ---------- */
function snapshot() {
  const d = appNow(), k = dayKey(d), now = appNowMin(), t = targetsFor(d), have = totalsOn(d), s = safeToSpend(d), p = planFor(d);
  const blocks = blocksFor(d).map((b) => `${fromMin(b.start)} ${b.title} [${statusOf(k, b, now) ?? 'รอ'}]`).join('; ');
  const week = weekIds(d).map((id, i) => `${DOW_SHORT[i]}=${dayById(id).name}`).join(', ');
  const fr = fridge.value.filter((b) => b.qty > 0).map((b) => `${b.name}×${b.qty} (${b.k}kcal P${b.p}, เหลือ ${daysLeft(b)} วัน)`).join('; ') || 'ว่าง';
  const n = nightFor(d), h = hoursOf(n);
  return [
    `ตอนนี้ ${DOW_SHORT[d.getDay()]} ${k} ${clock()}`,
    `แผนวันนี้: ${blocks}`,
    `ซ้อมวันนี้: ${p.name}${workouts.value.some((w) => w.date === k) ? ' (ทำแล้ว)' : ''} · สัปดาห์นี้: ${week}`,
    `กินแล้ว ${have.k}/${t.k} kcal · P ${have.p}/${t.p} · C ${have.c}/${t.c} · F ${have.f}/${t.f} · มื้อ: ${entriesOn(d).map((e) => `${e.time} ${e.name}`).join(', ') || '-'}`,
    `ตู้ meal prep: ${fr}`,
    `น้ำหนักเฉลี่ย 7 วัน ${avg7(d)?.toFixed(1) ?? latestW()?.kg ?? '-'} kg · อัตรา ${rate(d)?.toFixed(2) ?? '-'} kg/สัปดาห์`,
    `นอนเมื่อคืน ${h?.toFixed(1) ?? '-'} ชม. · ฟื้นตัว ${recovery(d) ?? '-'}`,
    `เงิน: ใช้ได้วันนี้ ${Math.round(s.left)} ฿ · ใช้ไป ${s.usedPct}% ของงบรอบนี้ (จังหวะควรเป็น ${s.pacePct}%)`,
  ].join('\n');
}

function systemPrompt() {
  const p = profile.value;
  return `คุณคือโค้ชส่วนตัวในแอป Iam ของผู้ใช้คนเดียว เป็นทั้งเทรนเนอร์ นักโภชนาการ เลขา และผู้ช่วยคุมงบ
ตอบเป็นภาษาไทยเสมอ สั้น กระชับ ทุกคำตอบต้องจบด้วยสิ่งที่ต้องทำต่อ
บุคลิก: ${TONE[p.tone]}
โปรไฟล์: ชาย สูง ${p.heightCm} cm · เป้า ${p.goal} · ตื่น ${p.wake} นอน ${p.sleep} · เริ่มงาน ${p.workStart} · อุปกรณ์ ${p.equipment.join(', ')} · ประวัติเจ็บ ${p.injuries.join(', ')} · เงินเดือนสุทธิ ${p.netSalary} เข้าวันที่ ${p.payday}
ใช้เครื่องมือเมื่อผู้ใช้สั่งหรือบอกสิ่งที่ทำไปแล้ว (กินอะไร จ่ายเงิน ชั่งน้ำหนัก ย้ายตาราง) ให้บันทึกจริงทันที ไม่ต้องถามยืนยันถ้าข้อมูลพอ ถ้าไม่พอให้ถาม 1 คำถาม
ประมาณแคลอรี่และมาโครอาหารไทยอย่างสมเหตุสมผล
เรื่องเงินและหนี้: ให้ตัวเลขและทางเลือก ไม่ฟันธงแทนผู้ใช้ เพราะคุณไม่ใช่ที่ปรึกษาการเงินที่มีใบอนุญาต
เรื่องสุขภาพ: ถ้ามีอาการเจ็บผิดปกติ แนะนำให้พบแพทย์/นักกายภาพ
ห้ามเขียนค่าที่ผู้ใช้ตั้งเองทับ ถ้าจะเสนอให้เสนอเป็นข้อเสนอ`;
}

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'log_food', description: 'บันทึกอาหารที่ผู้ใช้กินแล้ว (ประมาณมาโครถ้าไม่รู้)', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'kcal', 'protein', 'carb', 'fat'], properties: { name: { type: 'string' }, kcal: { type: 'number' }, protein: { type: 'number' }, carb: { type: 'number' }, fat: { type: 'number' } } } } } } },
  { name: 'add_money', description: 'บันทึกรายจ่ายหรือรายรับ', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['amount', 'merchant', 'income', 'category'], properties: { amount: { type: 'number' }, merchant: { type: 'string' }, income: { type: 'boolean' }, category: { type: 'string', description: 'หนึ่งในหมวดของผู้ใช้' } } } },
  { name: 'swap_training_days', description: 'สลับวันซ้อมในสัปดาห์นี้ (0=อาทิตย์ … 6=เสาร์)', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['day_a', 'day_b'], properties: { day_a: { type: 'integer' }, day_b: { type: 'integer' } } } },
  { name: 'move_block', description: 'ย้ายเวลา/ปรับความยาวรายการในตารางวันนี้ ค้นจากชื่อ', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['title_contains', 'new_start', 'duration_min', 'always'], properties: { title_contains: { type: 'string' }, new_start: { type: 'string', description: 'HH:MM' }, duration_min: { type: 'integer', description: '0 = เท่าเดิม' }, always: { type: 'boolean', description: 'true = แก้แม่แบบทุกครั้งต่อจากนี้, false = แค่วันนี้' } } } },
  { name: 'add_block', description: 'เพิ่มรายการ/การเตือนในตาราง', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['title', 'start', 'duration_min', 'role', 'always'], properties: { title: { type: 'string' }, start: { type: 'string', description: 'HH:MM' }, duration_min: { type: 'integer' }, role: { type: 'string', enum: ['food', 'workout', 'recovery', 'money', 'work'] }, always: { type: 'boolean' } } } },
  { name: 'mark_block', description: 'ทำเครื่องหมายรายการวันนี้ว่าทำแล้ว/ข้าม', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['title_contains', 'status'], properties: { title_contains: { type: 'string' }, status: { type: 'string', enum: ['done', 'skip'] } } } },
  { name: 'log_weight', description: 'บันทึกน้ำหนักตัว', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['kg'], properties: { kg: { type: 'number' } } } },
  { name: 'remember', description: 'จำข้อเท็จจริงสำคัญเกี่ยวกับผู้ใช้ไว้ใช้ครั้งต่อไป', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['fact', 'group'], properties: { fact: { type: 'string' }, group: { type: 'string', enum: ['ร่างกาย', 'อาหาร', 'ชีวิต', 'อื่นๆ'] } } } },
];

function runTool(name: string, input: Record<string, unknown>, cards: Card[]): string {
  const d = appNow(), k = dayKey(d);
  const findBlk = (q: string) => blocksFor(d).find((b) => b.title.toLowerCase().includes(String(q).toLowerCase()));
  switch (name) {
    case 'log_food': {
      const items = (input.items as { name: string; kcal: number; protein: number; carb: number; fat: number }[]).map((i) => ({ name: i.name, k: i.kcal, p: i.protein, c: i.carb, f: i.fat, source: 'text' as const }));
      const ids = logFood(items);
      cards.push({ type: 'log', ids, food: items.map((i) => i.name).join(' + '), k: Math.round(items.reduce((a, i) => a + i.k, 0)), p: Math.round(items.reduce((a, i) => a + i.p, 0)) });
      const t = totalsOn(d), tg = targetsFor(d);
      return `บันทึกแล้ว ตอนนี้ ${t.k}/${tg.k} kcal โปรตีน ${t.p}/${tg.p} g`;
    }
    case 'add_money': {
      const cat = categories.value.find((c) => c.name === input.category)?.name;
      const tx = addTxn({ ts: Date.now(), amount: Number(input.amount), inc: !!input.income, merchant: String(input.merchant), account: 'บัญชี', source: 'text', cat });
      confirmTxns([tx.id]);
      cards.push({ type: 'done', text: `${tx.inc ? '+' : '−'}${tx.amount.toLocaleString()} ฿ · ${tx.merchant} · ${tx.cat}`, undo: 'txn:' + tx.id });
      return `บันทึกแล้ว หมวด ${tx.cat} · ใช้ได้วันนี้เหลือ ${Math.round(safeToSpend().left)} ฿`;
    }
    case 'swap_training_days': {
      const a = Number(input.day_a), b = Number(input.day_b), ids = weekIds(d);
      if ([a, b].some((x) => x < 0 || x > 6)) return 'วันไม่ถูกต้อง';
      const rows: [string, string, string][] = [[DOW_SHORT[a], dayById(ids[a]).name, dayById(ids[b]).name], [DOW_SHORT[b], dayById(ids[b]).name, dayById(ids[a]).name]];
      swapDays(d, a, b); cards.push({ type: 'swap', a, b, rows });
      return 'สลับแล้ว';
    }
    case 'move_block': {
      const blk = findBlk(String(input.title_contains)); if (!blk) return 'ไม่เจอรายการนี้ในวันนี้';
      let s = toMin(String(input.new_start)); if (s < 240) s += 1440;
      editBlock(k, blk, { start: s, ...(Number(input.duration_min) > 0 ? { dur: Number(input.duration_min) } : {}) }, input.always ? 'always' : 'today');
      cards.push({ type: 'done', text: `${blk.title} → ${fromMin(s)} · ${input.always ? 'ทุกครั้งต่อจากนี้' : 'แค่วันนี้'}` });
      return 'ย้ายแล้ว';
    }
    case 'add_block': {
      let s = toMin(String(input.start)); if (s < 240) s += 1440;
      const role = input.role as 'food' | 'workout' | 'recovery' | 'money' | 'work';
      addBlock(k, { title: String(input.title), start: s, dur: Number(input.duration_min) || 15, role, icon: { food: 'restaurant', workout: 'fitness_center', recovery: 'spa', money: 'credit_card', work: 'laptop_mac' }[role], days: [] }, input.always ? 'always' : 'today', d);
      cards.push({ type: 'done', text: `เพิ่ม “${input.title}” ${fromMin(s)} · ${input.always ? 'ทุกครั้ง' : 'วันนี้'}` });
      return 'เพิ่มแล้ว';
    }
    case 'mark_block': {
      const blk = findBlk(String(input.title_contains)); if (!blk) return 'ไม่เจอรายการนี้';
      setStatus(k, blk.id, input.status as 'done' | 'skip'); cards.push({ type: 'done', text: `${blk.title} · ${input.status === 'done' ? 'ทำแล้ว' : 'ข้าม'}` });
      return 'บันทึกสถานะแล้ว';
    }
    case 'log_weight': { logWeight(Number(input.kg)); cards.push({ type: 'done', text: `น้ำหนัก ${Number(input.kg).toFixed(1)} kg` }); return `บันทึกแล้ว เฉลี่ย 7 วัน ${avg7(d)?.toFixed(1)}`; }
    case 'remember': { memories.value = [...memories.value, { id: uid(), group: input.group as Memory['group'], text: String(input.fact), src: `จากแชท · ${dayKey()}` }]; return 'จำแล้ว'; }
  }
  return 'ไม่รู้จักเครื่องมือนี้';
}

export function undoCard(c: Card) {
  if (c.type === 'log') unlogFood(c.ids);
  if (c.type === 'swap') swapDays(appNow(), c.a, c.b);
  if (c.type === 'done' && c.undo?.startsWith('txn:')) { const id = c.undo.slice(4); txns.value = txns.value.filter((t) => t.id !== id); }
}

/* ---------- Local (no-AI) intents: always work, instant ---------- */
const DAYNAMES: [RegExp, number][] = [[/อาทิตย์|อา\./, 0], [/จันทร์|จ\./, 1], [/อังคาร|อ\./, 2], [/พุธ|พ\./, 3], [/พฤหัส|พฤ\./, 4], [/ศุกร์|ศ\./, 5], [/เสาร์|ส\./, 6]];

function localIntent(t: string): boolean {
  const d = appNow();
  if (/สรุปสัปดาห์|เช็กอิน/.test(t)) { say({ who: 'c', text: 'เช็กอินสัปดาห์ · ขั้น 1/3\nสัปดาห์นี้รู้สึกยังไงบ้าง', cards: [{ type: 'feel' }] }); return true; }
  if (/กินอะไรดี/.test(t)) {
    const tg = targetsFor(d), have = totalsOn(d), sug = suggestForProtein(d);
    const plan: [string, string, string][] = (sug?.items ?? []).map((i) => ['', i.name, `${i.k} kcal · P ${i.p} g`]);
    plan.push(['', `น้ำอีก ${Math.max(0, 3.3 - 0).toFixed(1)} L`, 'แบ่งดื่มทั้งวัน']);
    say({ who: 'c', text: `เหลือ ${Math.max(0, tg.k - have.k).toLocaleString()} kcal โปรตีนยังขาด ${Math.max(0, tg.p - have.p)} g จัดแบบนี้จากของที่มี`, cards: [{ type: 'plan', plan }], replies: sug?.items.length ? ['กินตามนี้'] : undefined });
    return true;
  }
  if (t === 'กินตามนี้') {
    const sug = suggestForProtein(d); if (!sug?.items.length) return false;
    const ids = logFood(sug.items.map((i) => ({ ...i, source: 'quick' as const })));
    say({ who: 'c', text: 'ดี อย่าลืมน้ำด้วย', cards: [{ type: 'log', ids, food: sug.items.map((i) => i.name).join(' + '), k: sug.k, p: sug.p }] }); return true;
  }
  const ds = DAYNAMES.filter(([r]) => r.test(t)).map(([, n]) => n);
  if (/สลับ/.test(t) && ds.length >= 2) {
    const cards: Card[] = []; runTool('swap_training_days', { day_a: ds[0], day_b: ds[1] }, cards);
    say({ who: 'c', text: `สลับ${DOW_SHORT[ds[0]]}กับ${DOW_SHORT[ds[1]]}ให้แล้ว · สัปดาห์นี้`, cards }); return true;
  }
  if (/เลื่อนเวท|เลื่อนซ้อม/.test(t)) {
    const today = d.getDay(), tm = (today + 1) % 7, ids = weekIds(d);
    say({ who: 'c', text: `เลื่อนได้วันเดียว พรุ่งนี้เป็น${dayById(ids[tm]).name} สลับกันได้ แต่ห้ามข้ามทั้งสองวัน`, replies: [`สลับ${['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'][today]}กับ${['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'][tm]}`, 'ไม่เลื่อนแล้ว'] });
    return true;
  }
  if (t === 'ไม่เลื่อนแล้ว') { say({ who: 'c', text: `ดี เจอกันที่${planFor(d).name}` }); return true; }
  const kg = t.match(/(?:หนัก|น้ำหนัก|ชั่ง)\D{0,6}(\d{2,3}(?:\.\d)?)/);
  if (kg) { const cards: Card[] = []; runTool('log_weight', { kg: +kg[1] }, cards); say({ who: 'c', text: 'จดแล้ว ดูที่ค่าเฉลี่ย 7 วันนะ ไม่ต้องกังวลตัวเลขรายวัน', cards }); return true; }
  return false;
}

export function pickFeel(msgId: string, n: number) {
  const LBL = ['แย่', 'เหนื่อย', 'เฉยๆ', 'ดี', 'ดีมาก'];
  chat.value = chat.value.map((m) => (m.id === msgId ? { ...m, cards: m.cards?.map((c) => (c.type === 'feel' ? { ...c, picked: n } : c)) } : m));
  say({ who: 'me', text: `${n} · ${LBL[n - 1]}` });
  const s = weekSummary(appNow());
  const sum: [string, string, string][] = [['น้ำหนักเฉลี่ย', s.dW == null ? '—' : `${s.dW > 0 ? '+' : '−'}${Math.abs(s.dW).toFixed(1)} kg`, s.dW != null && s.dW <= 0 ? '#137A38' : '#17181C'], ['ซ้อม', `${s.sessions} ครั้ง`, '#17181C'], ['โปรตีนถึงเป้า', `${s.prot} / 7 วัน`, '#17181C'], ['นอนเฉลี่ย', s.avgH == null ? '—' : `${s.avgH.toFixed(1)} ชม.`, s.avgH != null && s.avgH < 7 ? '#B83A1C' : '#17181C']];
  setTimeout(() => say({ who: 'c', text: `ขั้น 2/3 · ตัวเลขสัปดาห์นี้\n${n <= 2 ? 'เหนื่อยสะสม ดูจากการนอนด้วย สัปดาห์หน้าลดความหนักลงนิด' : 'ภาพรวมโอเค ไปดูข้อเสนอกัน'}`, cards: [{ type: 'sum', sum }] }), 500);
  setTimeout(() => { const ps = proposals(appNow()); say(ps.length ? { who: 'c', text: 'ขั้น 3/3 · ข้อเสนอปรับแผน ยอมรับทีละข้อได้', cards: [{ type: 'props', ids: ps.map((p) => p.id) }] } : { who: 'c', text: 'ขั้น 3/3 · สัปดาห์นี้ไม่มีอะไรต้องปรับ ทำแบบเดิมต่อ' }); }, 1100);
}
export function decideProp(id: string, ok: boolean) {
  const p = proposals(appNow()).find((x) => x.id === id); const wk = dayKey(appNow());
  if (ok && p) p.apply(p.value);
  const rec = checkins.value[wk] ?? { decided: {}, at: Date.now() };
  checkins.value = { ...checkins.value, [wk]: { decided: { ...rec.decided, [id]: ok ? 'ok' : 'no' }, at: Date.now() } };
}

/* ---------- Send ---------- */
export async function send(text: string) {
  const t = text.trim(); if (!t) return;
  chat.value = chat.value.map((m) => ({ ...m, replies: undefined }));
  say({ who: 'me', text: t });
  if (localIntent(t)) return;
  if (!hasAI()) { say({ who: 'c', text: 'ยังไม่ได้เชื่อม AI เลยตอบได้แค่คำสั่งพื้นฐาน (สรุปสัปดาห์ · วันนี้กินอะไรดี · สลับวัน · ชั่งน้ำหนัก) ใส่ Claude API key ในโปรไฟล์ → ตั้งค่า AI แล้วสั่งอะไรก็ได้' }); return; }
  typing.value = true;
  try {
    const history: Anthropic.Beta.BetaMessageParam[] = [];
    for (const m of chat.value.slice(-21, -1)) if (m.text) history.push({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text });
    while (history.length && history[0].role !== 'user') history.shift();
    const mem = memories.value.map((m) => `- ${m.text}`).join('\n');
    const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: 'user', content: [{ type: 'text', text: `<context>\nสิ่งที่จำได้:\n${mem}\n\n${snapshot()}\n</context>` }, { type: 'text', text: t }] }];
    const cards: Card[] = [];
    let final = '';
    for (let i = 0; i < 6; i++) {
      const res = await client().beta.messages.create({
        model: model(), max_tokens: 16000, ...FALLBACK, output_config: { effort: 'medium' },
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }], tools: TOOLS, messages,
      });
      final = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim() || final;
      if (res.stop_reason === 'refusal') { final = final || 'เรื่องนี้ช่วยไม่ได้ ลองถามแบบอื่นนะ'; break; }
      if (res.stop_reason !== 'tool_use') break;
      messages.push({ role: 'assistant', content: res.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use').map((b) => {
        try { return { type: 'tool_result', tool_use_id: b.id, content: runTool(b.name, b.input as Record<string, unknown>, cards) }; }
        catch (e) { return { type: 'tool_result', tool_use_id: b.id, content: String(e), is_error: true }; }
      });
      messages.push({ role: 'user', content: results });
    }
    say({ who: 'c', text: final || (cards.length ? 'เรียบร้อย' : '…'), cards: cards.length ? cards : undefined });
  } catch (e) {
    say({ who: 'c', text: explain(e) });
  } finally { typing.value = false; }
}

/* ---------- Proactive nudges (rule-based, once per day each) ---------- */
export function maybeNudge() {
  const d = appNow(), k = dayKey(d), now = appNowMin(), key = (x: string) => `${k}:${x}`;
  const fire = (id: string, m: Omit<Msg, 'id' | 'ts'>) => { if (nudged.value[key(id)]) return; nudged.value = { ...nudged.value, [key(id)]: true }; say({ ...m, nudge: true }); };
  const tone = profile.value.tone, last = entriesOn(d).at(-1);
  const sinceLast = last ? now - toMin(last.time) : now - 12 * 60;
  if (now >= 15 * 60 && now < 21 * 60 && sinceLast >= 180) {
    const msg = { strict: `${last ? `ไม่มีบันทึกอาหารมา ${Math.floor(sinceLast / 60)} ชั่วโมงแล้ว` : 'วันนี้ยังไม่มีบันทึกอาหารเลย'} ถ้าไม่กินตอนนี้มื้อเย็นจะกินเกิน กินอะไรไปหรือยัง`, balanced: 'ยังไม่เห็นบันทึกอาหารสักพักแล้วนะ กินรองท้องไว้หน่อยจะดีกว่า', gentle: 'ช่วงนี้ยังไม่ได้บันทึกอาหารเลย ไม่เป็นไรนะ ถ้าว่างลองกินอะไรเบาๆ ก่อนดีไหม' }[tone];
    fire('food', { who: 'c', text: msg, replies: ['วันนี้กินอะไรดี', 'กินแล้ว ลืมบันทึก'] });
  }
  const p = planFor(d), wb = blocksFor(d).find((b) => b.kind === 'workout');
  if (wb && p.kind === 'lift' && !workouts.value.some((w) => w.date === k) && now > wb.start + wb.dur + 30 && now < 22 * 60)
    fire('workout', { who: 'c', text: tone === 'gentle' ? `วันนี้ยังไม่ได้ซ้อม${p.name}นะ ถ้าเหนื่อย เดินเร็ว 30 นาทีแทนก็ได้` : `${p.name}ยังไม่ได้ซ้อม เลยเวลามาแล้ว ซ้อมเย็นนี้หรือเลื่อนไปพรุ่งนี้ เลือกมาเลย`, replies: ['เลื่อนเวทได้ไหม', 'เดี๋ยวซ้อมเย็นนี้'] });
  const s = safeToSpend(d);
  if (s.left < -200) fire('money', { who: 'c', text: `วันนี้ใช้เกินไป ${Math.round(-s.left).toLocaleString()} ฿ พรุ่งนี้เหลือใช้ได้ ${Math.round(s.tomorrow).toLocaleString()} ฿ ต่อวัน` });
  if (d.getDay() === 0 && now >= 18 * 60) fire('checkin', { who: 'c', text: 'วันอาทิตย์แล้ว เช็กอินสัปดาห์ 2 นาที', replies: ['สรุปสัปดาห์'] });
}

export const greeting = () => ({ who: 'c' as const, text: 'สวัสดี ผมคือโค้ชของคุณ รู้ข้อมูลซ้อม กิน นอน เงิน และสั่งงานได้ เช่น “กินข้าวมันไก่ 60 บาท”, “ย้ายเวทไป 18:00”, “สลับพุธกับศุกร์”', replies: ['วันนี้กินอะไรดี', 'สรุปสัปดาห์'] });
export { say as coachSay };
