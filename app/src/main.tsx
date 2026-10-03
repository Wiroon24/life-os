import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
// Domain modules register plan providers/decorators on import.
import './domain/training';
import './domain/money';
import { autoWake } from './domain/sleep';
import { App } from './app';
import { checkReminders } from './domain/reminders';
import { initNative, isNative } from './native';

autoWake();
initNative().catch(() => {});
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) navigator.serviceWorker.register('/sw.js').catch(() => {});
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoWake();
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) navigator.serviceWorker.register('/sw.js').catch(() => {}); });
setInterval(checkReminders, 30_000);
setTimeout(checkReminders, 3000);
render(<App />, document.getElementById('app')!);
