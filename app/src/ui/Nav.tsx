import { Icon } from './kit';
import { tab, goTab, captureOpen, type Tab } from '../store/nav';
import { pending } from '../domain/money';

const TABS: [Tab, string, string][] = [['today', 'วันนี้', 'sunny'], ['body', 'ร่างกาย', 'exercise'], ['money', 'เงิน', 'account_balance_wallet'], ['coach', 'โค้ช', 'forum']];

export function BottomNav() {
  const cur = tab.value, inbox = pending().length;
  const item = ([k, l, ic]: (typeof TABS)[number]) => {
    const on = cur === k;
    return (
      <button onClick={() => goTab(k)} style={{ width: 60, height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: on ? 'var(--ink)' : 'var(--ink-2)', position: 'relative' }} aria-current={on ? 'page' : undefined}>
        <span style={{ width: 52, height: 30, borderRadius: 999, background: on ? 'var(--surface-2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n={ic} fill={on} size={24} /></span>
        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{l}</span>
        {k === 'money' && inbox > 0 && <span style={{ position: 'absolute', top: 2, right: 8, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inbox}</span>}
      </button>
    );
  };
  return (
    <nav style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(398px, calc(100% - 32px))', bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 999, padding: 8, boxShadow: 'var(--shadow-nav)' }}>
      {item(TABS[0])}{item(TABS[1])}
      <button class="press" onClick={() => { captureOpen.value = true; try { history.pushState({ c: 1 }, ''); } catch { /* */ } }} aria-label="บันทึก" style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--primary-shadow)' }}><Icon n="add" size={32} /></button>
      {item(TABS[2])}{item(TABS[3])}
    </nav>
  );
}
