import { useState } from 'preact/hooks';
import { snackbar, sheet, closeSheet, scopeAsk } from '../store/ui';
import { Icon } from './kit';
import { useBack } from './back';

export function Snackbar() {
  const s = snackbar.value;
  if (!s) return null;
  return (
    <div key={s.id} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(398px, calc(100% - 32px))', bottom: 'calc(100px + env(safe-area-inset-bottom))', zIndex: 80, overflow: 'hidden', background: 'var(--ink)', color: '#fff', borderRadius: 18, minHeight: 56, padding: '4px 4px 4px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(23,24,28,.2)', animation: 'iam-up 240ms var(--ease-out)' }}>
      <Icon n={s.undo ? 'delete' : 'check_circle'} size={22} />
      <span style={{ flex: 1, fontSize: 15 }}>{s.text}</span>
      {s.undo && <button class="btn" style={{ color: '#FFC93C', fontSize: 16, fontWeight: 700 }} onClick={() => { s.undo?.(); snackbar.value = null; }}>เลิกทำ</button>}
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.18)' }}><span style={{ display: 'block', height: '100%', background: '#fff', transformOrigin: 'left', animation: 'iam-count 5s linear forwards' }} /></span>
    </div>
  );
}

export function SheetHost() {
  const s = sheet.value;
  useBack(() => { closeSheet(); return true; }, !!s);
  if (!s) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 430, margin: '0 auto' }}>
      <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', animation: 'iam-fade 200ms ease-out' }} />
      <div class="no-scrollbar" style={{ position: 'relative', background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-sheet)', animation: 'iam-sheet 280ms var(--ease-out)', maxHeight: s.tall ? '92dvh' : '85dvh', overflowY: 'auto' }}>
        <span style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 999, background: '#D9D6CE', flex: 'none' }} />
        {s.title && <span class="h2">{s.title}</span>}
        {s.body()}
      </div>
    </div>
  );
}

export function ScopeSheet() {
  const q = scopeAsk.value;
  const [pick, setPick] = useState<0 | 1>(0);
  const done = (v: 'today' | 'always' | null) => { if (!q) return; scopeAsk.value = null; setPick(0); q.resolve(v); };
  useBack(() => { done(null); return true; }, !!q);
  if (!q) return null;
  const opts: [string, string][] = [['แค่วันนี้', 'เปลี่ยนเฉพาะครั้งนี้'], ['ทุกครั้งต่อจากนี้', 'แก้แม่แบบ ใช้กับครั้งต่อไปทั้งหมด']];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 430, margin: '0 auto' }}>
      <div onClick={() => done(null)} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', animation: 'iam-fade 200ms ease-out' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 20px calc(32px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-sheet)', animation: 'iam-sheet 280ms var(--ease-out)' }}>
        <span style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 999, background: '#D9D6CE' }} />
        <span class="h2">{q.title}</span>
        {opts.map(([t, sub], i) => {
          const on = pick === i;
          return (
            <button onClick={() => setPick(i as 0 | 1)} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 14px', borderRadius: 16, background: on ? '#fff' : 'var(--bg)', boxShadow: on ? '0 0 0 2px var(--ink)' : 'none', textAlign: 'left' }}>
              <span style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, boxShadow: on ? 'inset 0 0 0 7px var(--ink)' : 'inset 0 0 0 2px #CFCBC1', transition: 'box-shadow 160ms var(--ease-spring)' }} />
              <span class="col"><span class="t16">{t}</span><span class="cap muted">{sub}</span></span>
            </button>
          );
        })}
        <div class="row" style={{ gap: 8 }}>
          <button class="btn soft lg" onClick={() => done(null)}>ยกเลิก</button>
          <button class="btn primary lg grow" onClick={() => done(pick ? 'always' : 'today')}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}
