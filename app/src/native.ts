import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { effect, signal } from '@preact/signals';
import { addTxn, parseNotification, txns } from './domain/money';
import { appNow, blocksFor, statusOf, setStatus, template, days } from './domain/plan';
import { dayKey, addDays } from './domain/time';
import { notif, tune } from './domain/reminders';
import { medLog, meds } from './domain/meds';
import { workouts } from './domain/training';
import { toast } from './store/ui';
import { handleBack, setExitApp } from './ui/back';

export const isNative = Capacitor.isNativePlatform();

interface Captured { label: string; title: string; text: string; ts: number }
interface CapturePlugin {
  status(): Promise<{ enabled: boolean; labels: string[]; senders: string[] }>;
  openSettings(): Promise<void>;
  setAllowed(o: { labels: string[]; senders: string[] }): Promise<void>;
  drain(): Promise<{ items: Captured[] }>;
  listApps(): Promise<{ apps: { pkg: string; label: string; selected: boolean }[] }>;
  setPackages(o: { pkgs: string[] }): Promise<void>;
  setSenders(o: { senders: string[] }): Promise<void>;
  addListener(ev: 'captured', cb: () => void): Promise<{ remove(): void }>;
}
const Capture = isNative ? registerPlugin<CapturePlugin>('NotificationCapture') : null;

export const captureStatus = signal<{ enabled: boolean; labels: string[]; senders: string[] } | null>(null);
export async function refreshCaptureStatus() { if (Capture) captureStatus.value = await Capture.status().catch(() => null); }
export const openListenerSettings = () => Capture?.openSettings();
export const listApps = () => (Capture ? Capture.listApps().then((r) => r.apps) : Promise.resolve([]));
export const setCapturePackages = (pkgs: string[]) => Capture?.setPackages({ pkgs });
export const setCaptureSenders = async (senders: string[]) => { await Capture?.setSenders({ senders }); await refreshCaptureStatus(); };

/** Pull everything the native listener queued (even while the app was closed) into the money inbox. */
export async function importCaptured() {
  if (!Capture) return;
  const { items } = await Capture.drain().catch(() => ({ items: [] as Captured[] }));
  let n = 0;
  for (const it of items) {
    const text = [it.title, it.text].filter(Boolean).join(' ');
    const p = parseNotification(text, it.label); if (!p) continue;
    const before = _txCount(); addTxn({ ...p, ts: it.ts || Date.now(), source: 'notif' });
    if (_txCount() > before) n++;
  }
  if (n) toast(`มีรายการรอยืนยันใหม่ ${n} รายการ`);
}
const _txCount = () => txns.value.length;

/* ---------- Local notifications ---------- */
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2_000_000_000 + 1; };
let timer: ReturnType<typeof setTimeout> | undefined;

async function scheduleAll() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });
  const n = notif.value, now = Date.now(), list: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  const [dndA, dndB] = n.dnd;
  const inDnd = (m: number) => { const x = m % 1440; return dndA < dndB ? x >= dndA && x < dndB : x >= dndA || x < dndB; };
  for (const off of [0, 1, 2, 3, 4, 5, 6]) {
    const date = addDays(appNow(), off), key = dayKey(date), midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const add = (id: string, minute: number, title: string, body: string | undefined, extra: Record<string, unknown>, bypassDnd = false) => {
      const at = midnight + minute * 60_000; if (at <= now + 5000) return;
      if (!bypassDnd && inDnd(minute)) return;
      list.push({ id: hash(`${key}:${id}`), title, body: body ?? '', schedule: { at: new Date(at), allowWhileIdle: true }, smallIcon: 'ic_stat_iam', channelId: 'iam-reminders', actionTypeId: 'iam-block', extra: { key, ...extra } });
    };
    for (const b of blocksFor(date)) {
      if (statusOf(key, b, off ? 0 : undefined, off === 0)) continue;
      const topic = b.kind === 'workout' ? 'workout' : b.kind?.startsWith('med') ? 'meds' : b.kind === 'bill' ? 'bills' : b.kind === 'checkin' ? 'checkin' : 'blocks';
      if (!n.on[topic] || b.mute) continue;
      const tn = tune(), lead = b.lead ?? tn.lead[topic] ?? 0, bypass = topic === 'meds';
      add(`${b.id}`, b.start - lead, b.title, b.sub, { blockId: b.id }, bypass);
      if (off <= 1 && n.level === 1 && (topic === 'workout' || topic === 'meds')) Array.from({ length: tn.nagCount }, (_, j) => tn.nagGap * (j + 1)).forEach((g, i) => add(`${b.id}:nag${i}`, b.start + g, i === tn.nagCount - 1 ? `ยังไม่ได้${b.title}เลยนะ อีก ${tn.nagGap} นาทีจะบันทึกว่าพลาด` : `ยังไม่ได้${b.title}`, undefined, { blockId: b.id }, bypass));
    }
    if (n.on.brief && n.time.brief != null) add('brief', n.time.brief, 'สรุปตอนตื่น', 'แผนวันนี้ + 3 เรื่องสำคัญ', {});
  }
  list.sort((a, b) => (a.schedule!.at as Date).getTime() - (b.schedule!.at as Date).getTime());
  if (list.length) await LocalNotifications.schedule({ notifications: list.slice(0, 120) });
}

export async function initNative() {
  if (!isNative) return;
  setExitApp(() => { App.exitApp(); });
  App.addListener('backButton', () => { handleBack(); });
  await LocalNotifications.createChannel({ id: 'iam-reminders', name: 'การเตือน', importance: 5, vibration: true, visibility: 1 }).catch(() => {});
  await LocalNotifications.registerActionTypes({ types: [{ id: 'iam-block', actions: [{ id: 'done', title: '✓ ทำแล้ว' }, { id: 'snooze', title: 'เลื่อน 15 นาที' }] }] }).catch(() => {});
  await LocalNotifications.requestPermissions().catch(() => {});
  LocalNotifications.addListener('localNotificationActionPerformed', async (ev) => {
    const x = ev.notification.extra as { key?: string; blockId?: string } | undefined;
    if (ev.actionId === 'done' && x?.key && x.blockId) { setStatus(x.key, x.blockId, 'done'); await LocalNotifications.cancel({ notifications: [{ id: ev.notification.id }] }); scheduleSoon(); }
    if (ev.actionId === 'snooze') await LocalNotifications.schedule({ notifications: [{ id: hash(`snz:${ev.notification.id}:${Date.now()}`), title: ev.notification.title ?? '', body: ev.notification.body ?? undefined, schedule: { at: new Date(Date.now() + 15 * 60_000), allowWhileIdle: true }, smallIcon: 'ic_stat_iam', channelId: 'iam-reminders', actionTypeId: 'iam-block', extra: x }] });
  });
  // Re-plan whenever anything that affects reminders changes.
  effect(() => { void [days.value, template.value, notif.value, medLog.value, meds.value, workouts.value]; scheduleSoon(); });
  // Notification capture
  await refreshCaptureStatus();
  await importCaptured();
  Capture?.addListener('captured', () => importCaptured());
  App.addListener('resume', () => { refreshCaptureStatus(); importCaptured(); scheduleSoon(); });
}
function scheduleSoon() { clearTimeout(timer); timer = setTimeout(() => scheduleAll().catch(() => {}), 1500); }
