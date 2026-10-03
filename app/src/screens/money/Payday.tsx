import { useRef, useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { back } from '../../store/nav';
import { toast } from '../../store/ui';
import { live } from '../../store/collection';
import { thDate } from '../../domain/time';
import { profile } from '../../domain/profile';
import { bills, cycle, fixedTotal, payPlans, planOf, reserveBalance, isPayday, nextPayday } from '../../domain/money';

const fmt = (n: number) => Math.round(n).toLocaleString();
const MIN_SPEND = 6000;

export function Payday() {
  const today = new Date(), T = profile.value.netSalary, FIX = fixedTotal();
  const c = isPayday(today) ? cycle(today) : cycle(nextPayday(today));
  const cur = planOf(c.key);
  const [debt, setDebt] = useState(cur.debt), [res, setRes] = useState(cur.reserve), [drag, setDrag] = useState<number | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const spend = T - FIX - debt - res, p1 = FIX + debt, p2 = p1 + res;
  const pct = (v: number) => `${((v / T) * 100).toFixed(2)}%`;
  const val = (e: PointerEvent) => { const r = bar.current!.getBoundingClientRect(); return Math.round((Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * T) / 100) * 100; };
  const move = (k: number, e: PointerEvent) => {
    if (drag !== k) return; const v = val(e);
    if (k === 1) { const np1 = Math.max(FIX, Math.min(FIX + debt + res, v)); setDebt(np1 - FIX); setRes(FIX + debt + res - np1); }
    else { const np2 = Math.max(FIX + debt, Math.min(T - MIN_SPEND, v)); setRes(np2 - FIX - debt); }
  };
  const applied = payPlans.value[c.key]?.applied;
  const segs: [string, number, string, string, string][] = [['ค่าคงที่', FIX, '#CFCBC1', 'var(--ink)', 'repeating-linear-gradient(135deg,rgba(255,255,255,.35) 0 6px,transparent 6px 12px)'], ['หนี้', debt, '#FF9F1C', 'var(--ink)', 'none'], ['สำรอง', res, '#22B455', '#fff', 'none'], ['ใช้ได้', spend, '#2F7BFF', '#fff', 'none']];
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--money)', color: '#fff', padding: '8px 16px 24px', borderRadius: '0 0 28px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button class="btn icon" style={{ marginLeft: -8, color: '#fff' }} onClick={back} aria-label="ปิด"><Icon n="close" /></button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{thDate(c.start)} · {isPayday(today) ? 'เงินเดือนเข้าแล้ว' : 'แผนรอบหน้า'}</span>
        <span class="num" style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05, animation: 'iam-pop 520ms var(--ease-spring)' }}>+{fmt(T)}<span style={{ fontSize: 24, fontWeight: 500 }}> ฿</span></span>
        <span style={{ fontSize: 15 }}>ให้ทุกบาทมีหน้าที่ ลากขีดบนแถบเพื่อปรับ</span>
      </div>
      <div style={{ flex: 1, padding: '18px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div class="col" style={{ gap: 8 }}>
          <div ref={bar} style={{ position: 'relative', height: 64, display: 'flex', touchAction: 'none' }}>
            {segs.map(([l, v, col, fg, pat], i) => <span style={{ width: pct(Math.max(0, v)), flex: 'none', height: '100%', background: col, backgroundImage: pat, borderRadius: i === 0 ? '18px 0 0 18px' : i === 3 ? '0 18px 18px 0' : 0, display: 'flex', alignItems: 'flex-end', padding: '0 0 8px 8px', color: fg, fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}>{v / T > 0.1 ? l : ''}</span>)}
            {[[1, p1], [2, p2]].map(([k, pos]) => (
              <span onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag(k); }} onPointerMove={(e) => move(k, e as unknown as PointerEvent)} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} aria-label="ลากปรับ"
                style={{ position: 'absolute', top: -8, bottom: -8, left: pct(pos), width: 44, marginLeft: -22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize', touchAction: 'none' }}>
                <span style={{ width: 8, height: '100%', borderRadius: 999, background: 'var(--ink)', boxShadow: '0 0 0 3px #fff', transform: `scaleX(${drag === k ? 1.4 : 1})`, transition: 'transform 120ms' }} /></span>
            ))}
          </div>
          <div class="row muted" style={{ justifyContent: 'space-between', fontSize: 12 }}><span>0</span><span>{fmt(T)} ฿</span></div>
        </div>
        {[
          { l: 'ค่าคงที่', sub: 'หักอัตโนมัติ ล็อกไว้', v: FIX, c: '#CFCBC1', pat: segs[0][4], parts: live(bills.value).filter((b) => b.fixed).map((b) => `${b.name} ${b.approx ? '~' : ''}${fmt(b.amount)}`) },
          { l: 'หนี้ · โปะเพิ่ม', sub: debt ? 'เข้าตามแผนปลดหนี้ที่เลือก' : 'ไม่โปะรอบนี้', v: debt, c: '#FF9F1C', pat: 'none' },
          { l: 'เงินสำรอง', sub: `ฉุกเฉิน · ตอนนี้มี ${fmt(reserveBalance.value)} ฿`, v: res, c: '#22B455', pat: 'none' },
          { l: 'ใช้ได้', sub: 'อาหาร เดินทาง ของใช้ ฯลฯ', v: spend, c: '#2F7BFF', pat: 'none', daily: true },
        ].map((r) => (
          <div class="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div class="row"><span style={{ width: 14, height: 40, flex: 'none', borderRadius: 999, background: r.c, backgroundImage: r.pat }} /><span class="col grow"><span class="t16">{r.l}</span><span class="cap muted">{r.sub}</span></span><span class="num" style={{ fontSize: 22, fontWeight: 600 }}>{fmt(r.v)}</span></div>
            {r.parts && <div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>{r.parts.map((p) => <span class="num" style={{ background: 'var(--bg)', borderRadius: 999, padding: '5px 10px', fontSize: 13 }}>{p}</span>)}</div>}
            {r.daily && <div class="row" style={{ gap: 6, alignItems: 'baseline', background: 'var(--money-soft)', borderRadius: 14, padding: '10px 12px' }}><span style={{ fontSize: 14, color: 'var(--money-ink)', fontWeight: 600 }}>ใช้ได้ต่อวัน</span><span class="num" style={{ fontSize: 24, fontWeight: 700 }}>{fmt(spend / c.totalDays)} ฿</span><span class="cap muted">× {c.totalDays} วัน</span></div>}
          </div>
        ))}
        <div class="row" style={{ gap: 8, fontSize: 14, color: spend >= 0 ? 'var(--workout-ink)' : 'var(--error)', fontWeight: 600, padding: '0 4px' }}><Icon n={spend >= 0 ? 'check_circle' : 'error'} fill size={20} />{spend >= 0 ? 'ทุกบาทมีหน้าที่ · เหลือ 0 ฿ ไม่มีหน้าที่' : 'แบ่งเกินเงินเดือน ลดหนี้หรือเงินสำรองลง'}</div>
      </div>
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)' }}>
        <button class="btn primary lg block" style={{ fontSize: 18 }} onClick={() => {
          if (spend < 0) return toast('แบ่งเกินเงินเดือน');
          const was = payPlans.value[c.key]?.applied;
          payPlans.value = { ...payPlans.value, [c.key]: { debt, reserve: res, applied: true }, default: { debt, reserve: res } };
          if (!was && isPayday(today)) reserveBalance.value += res;
          toast('ใช้แผนนี้แล้ว · ใช้ได้ต่อวันอัปเดตแล้ว'); back();
        }}>{applied ? 'อัปเดตแผน' : 'ใช้แผนนี้'}</button>
      </div>
    </div>
  );
}
