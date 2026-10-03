import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, ROLE, Tag, EditToggle } from '../../ui/kit';
import { back } from '../../store/nav';
import { askScope, showUndo, tick } from '../../store/ui';
import { thDate, fromMin } from '../../domain/time';
import { editBlock, removeBlock, dayState, patchDay, type Block } from '../../domain/plan';
import { dayView } from './logic';
import { openBlockActions, openBlockEdit } from '../sheets';

const HOUR = 72, H0 = 6;
const snap = (m: number) => Math.round(m / 15) * 15;

export function Timeline({ edit: edit0 }: { edit?: boolean }) {
  tick.value;
  const v = dayView(), { key, date, now } = v;
  const [edit, setEdit] = useState(!!edit0);
  const [g, setG] = useState<{ id: string; x0: number; y0: number; s0: number; d0: number; mode: null | 'move' | 'swipe' | 'resize'; dx: number; s: number; d: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const H1 = Math.max(26, Math.ceil((Math.max(...v.blocks.map((b) => b.start + b.dur), 0) + 30) / 60));
  useEffect(() => { const el = document.scrollingElement; if (el) el.scrollTop = Math.max(0, ((now / 60 - H0) * HOUR) - 200); }, []);

  const y = (m: number) => (m / 60 - H0) * HOUR;
  const counts = { done: v.blocks.filter((b) => b.st === 'done').length, skip: v.blocks.filter((b) => b.st === 'skip').length, miss: v.missed.length };

  const commit = async (b: Block, s: number, d: number, kind: 'move' | 'resize') => {
    const scope = await askScope(`${kind === 'resize' ? 'ปรับเวลา' : 'ย้าย'} “${b.title}” ${fromMin(b.start)}–${fromMin(b.start + b.dur)} → ${fromMin(s)}–${fromMin(s + d)}`);
    if (!scope) return;
    const before = dayState(key);
    editBlock(key, b, { start: s, dur: d }, scope);
    showUndo(`บันทึกแล้ว · ${scope === 'today' ? 'แค่วันนี้' : 'ทุกครั้งต่อจากนี้'}`, scope === 'today' ? () => patchDay(key, () => before) : undefined);
  };

  const down = (e: PointerEvent, b: Block, mode: 'resize' | null = null) => {
    if (!edit) return;
    if (mode) { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    setG({ id: b.id, x0: e.clientX, y0: e.clientY, s0: b.start, d0: b.dur, mode, dx: 0, s: b.start, d: b.dur });
  };
  const move = (e: PointerEvent) => {
    if (!g) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    let mode = g.mode;
    if (!mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) { mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'move'; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ } }
    if (!mode) return;
    const s = mode === 'move' ? Math.max(H0 * 60, snap(g.s0 + (dy / HOUR) * 60)) : g.s0;
    const d = mode === 'resize' ? Math.max(15, snap(g.d0 + (dy / HOUR) * 60)) : g.d0;
    setG({ ...g, mode, dx, s, d });
  };
  const up = async (b: Block & { st?: string }) => {
    const cur = g; setG(null);
    if (!cur) return;
    if (!cur.mode) { if (!edit) return; openBlockEdit(key, date, b); return; }
    if (cur.mode === 'swipe' && cur.dx < -90) {
      const scope = await askScope(`ลบ “${b.title}”`); if (!scope) return;
      const before = dayState(key); removeBlock(key, b, scope);
      showUndo(`ลบ “${b.title}” แล้ว`, scope === 'today' ? () => patchDay(key, () => before) : undefined); return;
    }
    if ((cur.mode === 'move' || cur.mode === 'resize') && (cur.s !== cur.s0 || cur.d !== cur.d0)) commit(b, cur.s, cur.d, cur.mode);
  };

  const sorted = [...v.blocks].sort((a, b) => a.start - b.start);
  const gaps = edit ? sorted.slice(0, -1).map((b, i) => ({ end: b.start + b.dur, nx: sorted[i + 1].start })).filter((x) => x.nx - x.end >= 45) : [];

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '4px 12px 10px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div class="row" style={{ gap: 4 }}>
          <button class="btn icon" onClick={back} aria-label="กลับ"><Icon n="arrow_back" size={26} /></button>
          <span class="col grow"><span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>ทั้งวัน</span><span class="cap muted">{thDate(date)} · เสร็จ {counts.done} · ข้าม {counts.skip} · พลาด {counts.miss}</span></span>
          <EditToggle on={edit} onClick={() => setEdit(!edit)} />
        </div>
        <div class="no-scrollbar" style={{ display: 'flex', gap: 6, paddingLeft: 12, overflowX: 'auto' }}>
          {(['food', 'workout', 'recovery', 'money', 'work'] as const).map((r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ROLE[r].soft, color: ROLE[r].ink, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}><span style={{ width: 8, height: 8, borderRadius: 999, background: ROLE[r].c }} />{ROLE[r].label}</span>)}
        </div>
        {edit && <span class="cap muted" style={{ paddingLeft: 12 }}>ลากบล็อก = ย้าย · ลากขีดดำ = ยืด/หด · ปัดซ้าย = ลบ · แตะ = แก้</span>}
      </div>
      <div ref={scroller} style={{ position: 'relative', height: (H1 - H0) * HOUR + 24, margin: '8px 12px 160px 0' }}>
        {Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i).map((h) => (
          <div style={{ position: 'absolute', left: 0, right: 0, top: (h - H0) * HOUR, display: 'flex', alignItems: 'flex-start', gap: 8, pointerEvents: 'none' }}>
            <span class="num" style={{ width: 48, textAlign: 'right', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', transform: 'translateY(-8px)' }}>{fromMin(h * 60)}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--surface-3)' }} />
          </div>
        ))}
        {gaps.map((gp) => (
          <button style={{ position: 'absolute', left: 58, right: 0, top: y((gp.end + gp.nx) / 2), height: 32, display: 'flex', alignItems: 'center', gap: 8, transform: 'translateY(-50%)', zIndex: 2, animation: 'iam-pop 260ms var(--ease-spring)' }}
            onClick={() => openBlockEdit(key, date, null, { start: snap(gp.end + 5), dur: 30, title: '' })}>
            <span style={{ flex: 1, height: 2, borderRadius: 2, background: '#D9D6CE' }} />
            <span style={{ height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}><Icon n="add" size={18} />แทรก {fromMin(snap(gp.end + 5))}</span>
            <span style={{ flex: 1, height: 2, borderRadius: 2, background: '#D9D6CE' }} />
          </button>
        ))}
        {sorted.map((b) => {
          const active = g?.id === b.id, s = active ? g!.s : b.start, d = active ? g!.d : b.dur;
          const past = s + d <= now, R = ROLE[b.role], greyed = b.st === 'skip' || b.st === 'miss';
          const sx = active && g!.mode === 'swipe' ? Math.min(0, g!.dx) : 0;
          return (
            <div style={{ position: 'absolute', left: 58, right: 0, top: y(s) + 2, height: Math.max(48, (d / 60) * HOUR - 4), zIndex: active ? 15 : 3, borderRadius: 16, background: 'var(--error)' }}>
              <div style={{ position: 'absolute', right: 16, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#fff', opacity: Math.min(1, -sx / 90) }}><Icon n="delete" size={22} /></div>
              <div onPointerDown={(e) => down(e as unknown as PointerEvent, b)} onPointerMove={(e) => move(e as unknown as PointerEvent)} onPointerUp={() => up(b)} onPointerCancel={() => setG(null)}
                onClick={() => { if (!edit) openBlockActions(key, date, b); }}
                style={{ position: 'absolute', inset: 0, borderRadius: 16, background: past ? '#fff' : R.soft, padding: '6px 4px 6px 8px', display: 'flex', alignItems: 'flex-start', gap: 10, opacity: past && !edit ? 0.78 : 1,
                  boxShadow: active && g!.mode !== 'swipe' ? 'var(--shadow-2)' : past ? 'none' : '0 1px 2px rgba(23,24,28,.04)', transform: `translateX(${sx}px) scale(${active && g!.mode === 'move' ? 1.02 : 1})`,
                  transition: active ? 'none' : 'transform 300ms var(--ease-spring)', touchAction: edit ? 'none' : 'pan-y', userSelect: 'none', cursor: edit ? 'grab' : 'pointer' }}>
                <span class="medal" style={{ width: 36, height: 36, background: greyed ? 'var(--ink-3)' : R.c, color: '#fff' }}><Icon n={b.icon} fill size={20} /></span>
                <span class="col grow" style={{ paddingTop: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: greyed ? 'var(--ink-2)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
                  <span class="num muted" style={{ fontSize: 12, lineHeight: 1.35 }}>{fromMin(s)}–{fromMin(s + d)}</span>
                </span>
                {b.st && <span style={{ marginTop: 6 }}><Tag kind={b.st}>{{ done: 'เสร็จ', skip: 'ข้าม', miss: 'พลาด' }[b.st]}</Tag></span>}
                {edit && <span style={{ width: 40, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon n="drag_indicator" size={22} /></span>}
                {edit && <span onPointerDown={(e) => down(e as unknown as PointerEvent, b, 'resize')} onPointerMove={(e) => move(e as unknown as PointerEvent)} onPointerUp={() => up(b)}
                  style={{ position: 'absolute', left: '50%', bottom: -14, width: 64, height: 28, marginLeft: -32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', touchAction: 'none', zIndex: 3 }}>
                  <span style={{ width: 32, height: 6, borderRadius: 999, background: 'var(--ink)', boxShadow: '0 0 0 3px #fff' }} /></span>}
              </div>
            </div>
          );
        })}
        {now >= H0 * 60 && now <= H1 * 60 && (
          <div style={{ position: 'absolute', left: 44, right: 0, top: y(now), zIndex: 20, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <span class="num" style={{ background: 'var(--ink)', color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '3px 6px', borderRadius: 999, transform: 'translateX(-40%)' }}>{fromMin(now)}</span>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--primary)', marginLeft: -6 }} />
            <span style={{ flex: 1, height: 2, background: 'var(--primary)' }} />
          </div>
        )}
      </div>
      {edit && <button class="btn dark lg" style={{ position: 'fixed', right: 'max(16px, calc(50% - 199px))', bottom: 'calc(28px + env(safe-area-inset-bottom))', zIndex: 30, boxShadow: 'var(--shadow-2)' }} onClick={() => openBlockEdit(key, date, null, { start: snap(Math.max(now + 30, H0 * 60)), dur: 30 })}><Icon n="add" />เพิ่มรายการ</button>}
    </div>
  );
}
