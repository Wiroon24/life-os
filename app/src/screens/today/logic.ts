import { blocksFor, statusOf, appNow, appNowMin, type Block, type Status } from '../../domain/plan';
import { dayKey, fromMin } from '../../domain/time';
import { totalsOn, targetsFor, suggestForProtein } from '../../domain/food';
import { recovery, nightFor, hoursOf } from '../../domain/sleep';
import { safeToSpend } from '../../domain/money';
import { doneOn, planFor } from '../../domain/training';

export interface DayView {
  date: Date; key: string; now: number; blocks: (Block & { st?: Status })[];
  pending: (Block & { st?: Status })[]; missed: (Block & { st?: Status })[]; done: number; total: number;
}

export function dayView(): DayView {
  const date = appNow(), key = dayKey(date), now = appNowMin();
  const blocks = blocksFor(date).map((b) => ({ ...b, st: statusOf(key, b, now) }));
  const counted = blocks.filter((b) => b.kind !== 'sleep');
  return {
    date, key, now, blocks,
    pending: blocks.filter((b) => !b.st && b.kind !== 'sleep'),
    missed: blocks.filter((b) => b.st === 'miss'),
    done: counted.filter((b) => b.st === 'done').length,
    total: counted.length,
  };
}

export function nowLabel(b: Block, now: number) {
  if (now >= b.start - 30 && now <= b.start + b.dur) return `ทำตอนนี้ · ${fromMin(b.start)}`;
  if (b.start > now) return `ถัดไป · ${fromMin(b.start)}`;
  return `เลยเวลา ${now - b.start - b.dur} นาที`;
}

export function rings(date: Date) {
  const t = targetsFor(date), have = totalsOn(date), rec = recovery(date), plan = planFor(date), w = doneOn(date), s = safeToSpend(date);
  return [
    { role: 'food' as const, icon: 'restaurant', label: 'กิน', v: have.k / t.k, val: have.k.toLocaleString() },
    { role: 'workout' as const, icon: 'fitness_center', label: 'ซ้อม', v: plan.kind === 'rest' ? 1 : w ? 1 : 0, val: plan.kind === 'rest' ? 'พัก' : w ? `${Math.round(((w.t1 ?? w.t0) - w.t0) / 60000)} น.` : '0' },
    { role: 'recovery' as const, icon: 'bedtime', label: 'ฟื้นตัว', v: (rec ?? 0) / 100, val: rec == null ? '—' : String(rec) },
    { role: 'money' as const, icon: 'account_balance_wallet', label: 'ใช้ได้', v: s.allowance > 0 ? Math.max(0, s.left) / s.allowance : 0, val: `${Math.round(Math.max(0, s.left)).toLocaleString()} ฿` },
  ];
}

/** The single most useful "so what" line right now. */
export function soWhat(date: Date, now: number) {
  const sug = suggestForProtein(date), rec = recovery(date), s = safeToSpend(date);
  if (now >= 12 * 60 && sug && sug.miss > 20) return { role: 'food' as const, head: `โปรตีนขาด ${sug.miss} g`, tail: sug.items.length ? `→ ${sug.items.map((i) => i.name).join(' + ')}` : '→ เพิ่มไข่หรือเวย์' };
  if (now < 12 * 60 && rec != null) return rec >= 70 ? { role: 'recovery' as const, head: `ฟื้นตัว ${rec} ดีพอ`, tail: '→ ซ้อมน้ำหนักเต็มได้วันนี้' } : { role: 'recovery' as const, head: `ฟื้นตัว ${rec} ต่ำ`, tail: '→ ลดน้ำหนักเวทลง 10% และนอนให้เร็วขึ้นคืนนี้' };
  if (now >= 21 * 60) { const h = hoursOf(nightFor(date)); return { role: 'recovery' as const, head: 'นอนให้ถึง 7.5 ชม.', tail: h != null && h < 6.5 ? '→ เมื่อคืนนอนน้อย คืนนี้เข้านอนเร็วขึ้น' : '→ วางมือถือก่อนเที่ยงคืน' }; }
  if (s.left < 0) return { role: 'money' as const, head: `ใช้เกินวันนี้ ${Math.round(-s.left).toLocaleString()} ฿`, tail: `→ พรุ่งนี้เหลือ ${Math.round(s.tomorrow).toLocaleString()} ฿` };
  return { role: 'money' as const, head: `ยังใช้ได้ ${Math.round(Math.max(0, s.left)).toLocaleString()} ฿`, tail: `→ พรุ่งนี้ ${Math.round(s.tomorrow).toLocaleString()} ฿ ถ้าใช้ตามนี้` };
}
