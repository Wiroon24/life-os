import { persisted } from '../store/persist';
import { alertNow } from '../store/notify';
import { appNow, appNowMin, blocksFor, statusOf } from './plan';
import { dayKey, fromMin, toMin } from './time';
import { medProgress } from './meds';
import { entriesOn, water, WATER_GOAL } from './food';
import { pending } from './money';

export type Topic = 'workout' | 'meds' | 'brief' | 'food' | 'water' | 'money' | 'bills' | 'checkin' | 'blocks';
export const TOPICS: { k: Topic; l: string; s: string; time?: boolean }[] = [
  { k: 'workout', l: 'ซ้อม', s: 'เตือนก่อนเริ่มตามที่ตั้ง' }, { k: 'meds', l: 'ยาและสกินแคร์', s: 'เช้าและก่อนนอน · ทวงจนกว่าจะติ๊ก' },
  { k: 'brief', l: 'สรุปเช้า', s: 'นอน · ซ้อมวันนี้ · ใช้ได้', time: true }, { k: 'food', l: 'อาหาร', s: 'ทักถ้าไม่บันทึกนาน' },
  { k: 'water', l: 'น้ำ', s: 'ทักเมื่อดื่มน้อยกว่าที่ควร' }, { k: 'money', l: 'เงินรอยืนยัน', s: 'เมื่อมีรายการใหม่' },
  { k: 'bills', l: 'บิล', s: 'วันครบกำหนด', time: true }, { k: 'checkin', l: 'เช็กอินสัปดาห์', s: 'วันอาทิตย์', time: true },
  { k: 'blocks', l: 'รายการอื่นในตาราง', s: 'มื้อ ลุกเดิน งาน ตามเวลา' },
];
export const notif = persisted('notifSettings', {
  level: 1 as 0 | 1, dnd: [1350, 450] as [number, number],
  on: { workout: true, meds: true, brief: true, food: true, water: true, money: true, bills: true, checkin: true, blocks: true } as Record<Topic, boolean>,
  time: { brief: 465, bills: 540, checkin: 1140 } as Partial<Record<Topic, number>>,
});
/** Tunables with fallbacks so settings saved by older versions keep working. */
export const DEF = { lead: { workout: 15, meds: 0, bills: 0, blocks: 0 } as Record<string, number>, nagGap: 10, nagCount: 3, foodGap: 180, foodFrom: 900, foodTo: 1260, waterGap: 120, waterFrom: 540, waterTo: 1260 };
export const tune = () => { const n = notif.value as typeof notif.value & Partial<typeof DEF>; return { lead: { ...DEF.lead, ...(n.lead ?? {}) }, nagGap: n.nagGap ?? DEF.nagGap, nagCount: n.nagCount ?? DEF.nagCount, foodGap: n.foodGap ?? DEF.foodGap, foodFrom: n.foodFrom ?? DEF.foodFrom, foodTo: n.foodTo ?? DEF.foodTo, waterGap: n.waterGap ?? DEF.waterGap, waterFrom: n.waterFrom ?? DEF.waterFrom, waterTo: n.waterTo ?? DEF.waterTo }; };

/** Water slots for a day. A slot is worth a nudge only if intake is behind the straight-line pace to the goal at that time. */
export function waterSlots(ml: number, onlyBehind = true) {
  const t = tune(), out: { at: number; left: number }[] = [];
  for (let m = t.waterFrom + t.waterGap; m <= t.waterTo; m += t.waterGap) { const pace = WATER_GOAL * (m - t.waterFrom) / Math.max(1, t.waterTo - t.waterFrom); if (!onlyBehind || ml < pace) out.push({ at: m, left: Math.max(0, WATER_GOAL - ml) }); }
  return out;
}
const fired = persisted<Record<string, number>>('firedReminders', {});

const inDnd = (m: number) => { const [a, b] = notif.value.dnd, x = m % 1440; return a < b ? x >= a && x < b : x >= a || x < b; };

/** Called every 30s while the app runs. On Android (Capacitor) the same schedule is handed to LocalNotifications. */
export function checkReminders() {
  const d = appNow(), k = dayKey(d), now = appNowMin(), n = notif.value;
  const fire = (id: string, title: string, body?: string, ignoreDnd = false) => {
    const key = `${k}:${id}`; if (fired.value[key]) return;
    if (!ignoreDnd && inDnd(now)) return;
    fired.value = { ...fired.value, [key]: Date.now() }; alertNow(title, body);
  };
  for (const b of blocksFor(d)) {
    if (statusOf(k, b, now)) continue;
    const topic: Topic = b.kind === 'workout' ? 'workout' : b.kind?.startsWith('med') ? 'meds' : b.kind === 'bill' ? 'bills' : b.kind === 'checkin' ? 'checkin' : 'blocks';
    if (!n.on[topic] || b.mute) continue;
    const tn = tune(), lead = b.lead ?? tn.lead[topic] ?? 0;
    if (now >= b.start - lead && now <= b.start + 5) fire(b.id, b.title, b.sub, topic === 'meds');
    // Escalation (strict): re-nag at +10/+20/+30 min for workout & meds until done.
    if (n.level === 1 && (topic === 'workout' || topic === 'meds')) for (const [i, gap] of Array.from({ length: tn.nagCount }, (_, j) => tn.nagGap * (j + 1)).entries()) {
      if (now >= b.start + gap && now <= b.start + gap + 5) {
        if (topic === 'meds' && medProgress(b.kind === 'meds-night' ? 'night' : 'morning', d).total === medProgress(b.kind === 'meds-night' ? 'night' : 'morning', d).done) break;
        fire(`${b.id}:nag${i}`, i === tn.nagCount - 1 ? `ยังไม่ได้${b.title}เลยนะ อีก ${tn.nagGap} นาทีจะบันทึกว่าพลาด` : `ยังไม่ได้${b.title}`, undefined, topic === 'meds');
      }
    }
  }
  if (n.on.brief && n.time.brief != null && now >= n.time.brief && now < n.time.brief + 60) fire('brief', 'สรุปตอนตื่น', 'แผนวันนี้ + 3 เรื่องสำคัญ');
  if (n.on.food && now >= tune().foodFrom && now < tune().foodTo) { const last = entriesOn(d).at(-1); if (!last || now - toMin(last.time) >= tune().foodGap) fire(`food:${Math.floor(now / tune().foodGap)}`, 'ยังไม่ได้บันทึกอาหาร', 'กินอะไรไปหรือยัง'); }
  if (n.on.water) { const ml = water.value[k] ?? 0, tn = tune(); const slot = waterSlots(ml).filter((s) => now >= s.at && now < s.at + 5).at(-1); if (slot) fire(`water:${slot.at}`, 'ดื่มน้ำได้แล้ว', `วันนี้ ${ml.toLocaleString()} จาก ${WATER_GOAL.toLocaleString()} ml · เหลืออีก ${slot.left.toLocaleString()} ml`); void tn; }
  if (n.on.money) { const p = pending().length; if (p > 0) fire(`money:${p}`, `มีรายการรอยืนยัน ${p} รายการ`); }
  if (n.on.checkin && d.getDay() === 0 && n.time.checkin != null && now >= n.time.checkin && now < n.time.checkin + 60) fire('checkin', 'เช็กอินประจำสัปดาห์', '2 นาทีกับโค้ช');
}
export const fmtT = fromMin;
