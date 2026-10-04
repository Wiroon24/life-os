import { persisted } from '../store/persist';
import { alertNow } from '../store/notify';
import { appNow, appNowMin, blocksFor, statusOf } from './plan';
import { dayKey, fromMin, toMin } from './time';
import { medProgress } from './meds';
import { entriesOn } from './food';
import { pending } from './money';

export type Topic = 'workout' | 'meds' | 'brief' | 'food' | 'water' | 'money' | 'bills' | 'checkin' | 'blocks';
export const TOPICS: { k: Topic; l: string; s: string; time?: boolean }[] = [
  { k: 'workout', l: 'ซ้อม', s: 'ก่อนเริ่ม 15 นาที' }, { k: 'meds', l: 'ยาและสกินแคร์', s: 'เช้าและก่อนนอน · ทวงจนกว่าจะติ๊ก' },
  { k: 'brief', l: 'สรุปเช้า', s: 'นอน · ซ้อมวันนี้ · ใช้ได้', time: true }, { k: 'food', l: 'อาหาร', s: 'ทักถ้าไม่บันทึก 3 ชม.' },
  { k: 'water', l: 'น้ำ', s: 'ทุก 2 ชม. ถ้ายังไม่ถึงเป้า' }, { k: 'money', l: 'เงินรอยืนยัน', s: 'เมื่อมีรายการใหม่' },
  { k: 'bills', l: 'บิล', s: 'วันครบกำหนด', time: true }, { k: 'checkin', l: 'เช็กอินสัปดาห์', s: 'วันอาทิตย์', time: true },
  { k: 'blocks', l: 'รายการอื่นในตาราง', s: 'มื้อ ลุกเดิน งาน ตามเวลา' },
];
export const notif = persisted('notifSettings', {
  level: 1 as 0 | 1, dnd: [1350, 450] as [number, number],
  on: { workout: true, meds: true, brief: true, food: true, water: false, money: true, bills: true, checkin: true, blocks: true } as Record<Topic, boolean>,
  time: { brief: 465, bills: 540, checkin: 1140 } as Partial<Record<Topic, number>>,
});
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
    const lead = b.lead ?? (topic === 'workout' ? 15 : 0);
    if (now >= b.start - lead && now <= b.start + 5) fire(b.id, b.title, b.sub, topic === 'meds');
    // Escalation (strict): re-nag at +10/+20/+30 min for workout & meds until done.
    if (n.level === 1 && (topic === 'workout' || topic === 'meds')) for (const [i, gap] of [10, 20, 30].entries()) {
      if (now >= b.start + gap && now <= b.start + gap + 5) {
        if (topic === 'meds' && medProgress(b.kind === 'meds-night' ? 'night' : 'morning', d).total === medProgress(b.kind === 'meds-night' ? 'night' : 'morning', d).done) break;
        fire(`${b.id}:nag${i}`, i === 2 ? `ยังไม่ได้${b.title}เลยนะ อีก 10 นาทีจะบันทึกว่าพลาด` : `ยังไม่ได้${b.title}`, undefined, topic === 'meds');
      }
    }
  }
  if (n.on.brief && n.time.brief != null && now >= n.time.brief && now < n.time.brief + 60) fire('brief', 'สรุปตอนตื่น', 'แผนวันนี้ + 3 เรื่องสำคัญ');
  if (n.on.food && now >= 15 * 60 && now < 21 * 60) { const last = entriesOn(d).at(-1); if (!last || now - toMin(last.time) >= 180) fire(`food:${Math.floor(now / 180)}`, 'ยังไม่ได้บันทึกอาหาร', 'กินอะไรไปหรือยัง'); }
  if (n.on.money) { const p = pending().length; if (p > 0) fire(`money:${p}`, `มีรายการรอยืนยัน ${p} รายการ`); }
  if (n.on.checkin && d.getDay() === 0 && n.time.checkin != null && now >= n.time.checkin && now < n.time.checkin + 60) fire('checkin', 'เช็กอินประจำสัปดาห์', '2 นาทีกับโค้ช');
}
export const fmtT = fromMin;
