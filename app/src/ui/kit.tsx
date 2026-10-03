import type { ComponentChildren } from 'preact';
type CSS = Record<string, string | number | undefined>;
import { useEffect, useRef, useState } from 'preact/hooks';

export const Icon = ({ n, fill, size = 24, color, style, class: cls }: { n: string; fill?: boolean; size?: number; color?: string; style?: CSS; class?: string }) => (
  <span class={`ic${fill ? ' fill' : ''}${cls ? ' ' + cls : ''}`} style={{ fontSize: size, color, ...style }} aria-hidden="true">{n}</span>
);

export type Role = 'food' | 'workout' | 'recovery' | 'money' | 'work' | 'info';
export const ROLE: Record<Role, { c: string; tint: string; soft: string; ink: string; label: string }> = {
  food: { c: '#FF9F1C', tint: '#FFE9C7', soft: '#FFF4E3', ink: '#9A5800', label: 'กิน' },
  workout: { c: '#22B455', tint: '#D3F2DD', soft: '#E8F8EE', ink: '#137A38', label: 'ซ้อม' },
  recovery: { c: '#7C5CFF', tint: '#E6E0FF', soft: '#F1EEFF', ink: '#5B3BE0', label: 'ฟื้นตัว/ผิว' },
  money: { c: '#2F7BFF', tint: '#DCE8FF', soft: '#ECF2FF', ink: '#1F5FD6', label: 'เงิน' },
  work: { c: '#6B6962', tint: '#E6E3DB', soft: '#EFEDE7', ink: '#17181C', label: 'งาน' },
  info: { c: '#2F6FE0', tint: '#E6EEFF', soft: '#E6EEFF', ink: '#2F6FE0', label: 'ข้อมูล' },
};

/** Icon medallion — tinted circle with filled role icon. */
export const Medal = ({ icon, role = 'work', size = 44, iconSize, dark }: { icon: string; role?: Role; size?: number; iconSize?: number; dark?: boolean }) => (
  <span class="medal" style={{ width: size, height: size, background: dark ? 'var(--ink)' : ROLE[role].soft, color: dark ? '#fff' : ROLE[role].ink }}>
    <Icon n={icon} fill size={iconSize ?? Math.round(size * 0.55)} />
  </span>
);

/** Progress ring with spring fill on mount. value 0..1 */
export function Ring({ value, size = 60, stroke = 8, color, track, children }: { value: number; size?: number; stroke?: number; color: string; track: string; children?: ComponentChildren }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} stroke-width={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round"
          stroke-dasharray={C} stroke-dashoffset={on ? C * (1 - v) : C} opacity={v > 0 ? 1 : 0}
          style={{ transition: 'stroke-dashoffset 1000ms var(--ease-spring)' }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
    </span>
  );
}

/** Confetti burst — re-fires whenever `k` changes (and is > 0). */
export function Burst({ k, colors, dist = 56, n = 16 }: { k: number; colors: string[]; dist?: number; n?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const host = ref.current; if (!host || !k) return;
    host.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = dist * (i % 2 ? 0.65 : 1), dx = Math.cos(a) * d, dy = Math.sin(a) * d, s = i % 3 ? 6 : 8;
      const el = document.createElement('span');
      Object.assign(el.style, { position: 'absolute', left: '0', top: '0', width: s + 'px', height: s + 'px', borderRadius: i % 4 ? '999px' : '2px', background: colors[i % colors.length] });
      host.appendChild(el);
      el.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx * 1.2}px),calc(-50% + ${dy * 1.2}px)) scale(.2)`, opacity: 0 },
      ], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    }
  }, [k]);
  return <span ref={ref} style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }} />;
}

/** Top bar for layer-1 screens. */
export const TopBar = ({ title, sub, onBack, icon = 'arrow_back', right }: { title?: ComponentChildren; sub?: ComponentChildren; onBack: () => void; icon?: string; right?: ComponentChildren }) => (
  <div class="row" style={{ gap: 4, marginLeft: -12, position: 'sticky', top: 0, zIndex: 4, background: 'var(--bg)', padding: '4px 0' }}>
    <button class="btn icon" onClick={onBack} aria-label="กลับ"><Icon n={icon} size={26} /></button>
    <span class="col grow">
      {title && <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{title}</span>}
      {sub && <span class="cap muted">{sub}</span>}
    </span>
    {right}
  </div>
);

export const EditToggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button class="btn" onClick={onClick} style={{ background: on ? 'var(--ink)' : '#fff', color: on ? '#fff' : 'var(--ink)', fontSize: 16 }}>{on ? 'เสร็จ' : 'แก้ไข'}</button>
);

/** "→ action" so-what strip. */
export const SoWhat = ({ head, tail, role = 'food' }: { head: ComponentChildren; tail?: ComponentChildren; role?: Role }) => (
  <div style={{ background: ROLE[role].soft, borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
    <Icon n="arrow_forward" size={20} color={ROLE[role].ink} style={{ lineHeight: 1.2 }} />
    <span style={{ fontSize: 14.5, lineHeight: 1.45 }}><b style={{ fontWeight: 600 }}>{head}</b> {tail}</span>
  </div>
);

export const Check = ({ on, onClick, burst }: { on: boolean; onClick: () => void; burst?: number }) => (
  <button onClick={onClick} style={{ position: 'relative', width: 52, height: 52, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-pressed={on}>
    {on
      ? <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--check)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iam-pop 420ms var(--ease-spring)' }}><Icon n="check" size={20} style={{ fontVariationSettings: "'wght' 700" }} /></span>
      : <span style={{ width: 28, height: 28, borderRadius: 999, boxShadow: 'inset 0 0 0 2px #CFCBC1' }} />}
    {burst ? <Burst k={burst} colors={['#1C9C4A', '#2F7BFF', '#FFC93C', '#7C5CFF']} dist={30} n={14} /> : null}
  </button>
);

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void }) {
  return (
    <div class="seg">
      {options.map(([v, l, icon]) => (
        <button class={v === value ? 'on' : ''} onClick={() => onChange(v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {icon && <Icon n={icon} fill size={20} />}{l}
        </button>
      ))}
    </div>
  );
}

export const Tag = ({ kind, children }: { kind: 'done' | 'skip' | 'miss'; children?: ComponentChildren }) => {
  const s = { done: ['#E3F5E8', '#17863F', 'check'], skip: ['#E6E3DB', '#6B6962', 'redo'], miss: ['#FDE7E4', '#D92D20', 'close'] }[kind];
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: s[0], color: s[1], fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}><Icon n={s[2]} size={14} />{children}</span>;
};

export const Stat = ({ label, value, unit, sub, role }: { label: string; value: ComponentChildren; unit?: string; sub?: ComponentChildren; role: Role }) => (
  <div class="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: ROLE[role].ink }}>{label}</span>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span class="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>{value}</span>{unit && <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}>{unit}</span>}</span>
    {sub && <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{sub}</span>}
  </div>
);

/** Swipe-left-to-delete row wrapper. */
export function Swipe({ onDelete, children, disabled }: { onDelete: () => void; children: ComponentChildren; disabled?: boolean }) {
  const [dx, setDx] = useState(0);
  const st = useRef<{ x: number; y: number; mode: 'h' | 'v' | null; id: number } | null>(null);
  return (
    <div style={{ position: 'relative', borderRadius: 16, background: dx < 0 ? 'var(--error)' : 'transparent' }}>
      <span style={{ position: 'absolute', right: 16, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#fff', opacity: Math.min(1, -dx / 90) }}><Icon n="delete" size={22} /></span>
      <div
        style={{ transform: `translateX(${dx}px)`, transition: st.current ? 'none' : 'transform 300ms var(--ease-spring)', touchAction: 'pan-y' }}
        onPointerDown={(e) => { if (disabled) return; st.current = { x: e.clientX, y: e.clientY, mode: null, id: e.pointerId }; }}
        onPointerMove={(e) => {
          const s = st.current; if (!s) return;
          const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
          if (!s.mode && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) { s.mode = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v'; if (s.mode === 'h') (e.currentTarget as HTMLElement).setPointerCapture(s.id); }
          if (s.mode === 'h') setDx(Math.min(0, ddx));
        }}
        onPointerUp={() => { const s = st.current; st.current = null; if (s?.mode === 'h' && dx < -110) { setDx(-500); setTimeout(() => { onDelete(); setDx(0); }, 160); } else setDx(0); }}
        onPointerCancel={() => { st.current = null; setDx(0); }}
      >{children}</div>
    </div>
  );
}
