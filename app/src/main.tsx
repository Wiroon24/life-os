import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
// Domain modules register plan providers/decorators on import.
import './domain/training';
import './domain/money';
import './domain/medsPlan';
import { autoWake } from './domain/sleep';
import { trimRaw } from './domain/money';
import { App } from './app';
import { checkReminders } from './domain/reminders';
import { initNative } from './native';
import { initHealth } from './health';
import { loadExLib } from './domain/exlib';

autoWake();
trimRaw();
initNative().catch(() => {});
initHealth();
// Exercise library (public domain) for names/images/analysis of exercises added from it; loads in the background.
setTimeout(() => void loadExLib(), 1500);
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {});
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoWake();
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {}); });
setInterval(checkReminders, 30_000);
setTimeout(checkReminders, 3000);
render(<App />, document.getElementById('app')!);
