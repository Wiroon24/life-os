/** Best-effort local alert. On Android (Capacitor) this becomes a LocalNotification; on web it's Notification + vibrate. */
export async function ensurePermission() {
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* ignore */ }
}
export function alertNow(title: string, body?: string) {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      navigator.serviceWorker?.getRegistration().then((r) => { if (r) r.showNotification(title, { body, tag: 'iam-' + title }); else new Notification(title, { body }); });
    }
  } catch { /* ignore */ }
}
