import { useState } from 'preact/hooks';
import { Icon } from '../../ui/kit';
import { back } from '../../store/nav';
import { toast, showUndo } from '../../store/ui';
import { live } from '../../store/collection';
import { thDate } from '../../domain/time';
import { profile } from '../../domain/profile';
import { bills, cycle, fixedTotal, payPlans, planOf, isPayday, nextPayday, livePockets, mainPocket, pockets, moves, addMove, POCKET_KIND, type Move } from '../../domain/money';
import { Stepper } from '../sheets';

const fmt = (n: number) => Math.round(n).toLocaleString();

/** Salary → fixed bills (stay in the salary account) + a fill for every pocket + extra debt payment. Applying records the moves made in MAKE. */
export function Payday() {
  const today = new Date(), T = profile.value.netSalary, FIX = fixedTotal(), main = mainPocket();
  const now = cycle(today), nowPlan = payPlans.value[now.key];
  // Early in a cycle whose plan was not applied yet → this cycle; otherwise plan the next one.
  const c = !nowPlan?.applied && now.dayNo <= 7 ? now : cycle(nextPayday(today));
  const cur = planOf(c.key), applied = !!payPlans.value[c.key]?.applied, canApply = c.key === now.key;
  const ps = livePockets().filter((p) => p.kind !== 'main');
  const [fills, setFills] = useState<Record<string, number>>(() => Object.fromEntries(ps.map((p) => [p.id, cur.fills?.[p.id] ?? p.monthly])));
  const [debt, setDebt] = useState(cur.debt);
  const fillSum = ps.reduce((a, p) => a + (fills[p.id] ?? 0), 0), left = T - FIX - fillSum - debt;
  const segs: [string, number, string][] = [['ค่าคงที่', FIX, '#CFCBC1'], ['กระเป๋า', fillSum, '#2F7BFF'], ['หนี้', debt, '#FF9F1C'], ['เหลือ', Math.max(0, left), '#22B455']];
  const save = (apply: boolean) => {
    if (left < 0) return toast('แบ่งเกินเงินเดือน ลดกระเป๋าหรือเงินโปะลง');
    const nonDaily = ps.filter((p) => !p.daily).reduce((a, p) => a + (fills[p.id] ?? 0), 0);
    const plan = { debt, reserve: nonDaily, fills };
    const beforePlans = payPlans.value, beforePockets = pockets.value, beforeMoves = moves.value;
    payPlans.value = { ...payPlans.value, [c.key]: { ...plan, applied: apply || applied }, default: plan };
    pockets.value = pockets.value.map((p) => (fills[p.id] != null ? { ...p, monthly: fills[p.id] } : p));
    const made: Move[] = [];
    if (apply && !applied) for (const p of ps) {
      if (fills[p.id] > 0) made.push(addMove({ from: main?.id ?? 'ext', to: p.id, amount: fills[p.id], kind: 'fill', note: `เติมรอบ ${thDate(c.start)}` }));
      if (p.partner) made.push(addMove({ from: 'ext', to: p.id, amount: p.partner, kind: 'fill', note: 'ส่วนของแฟน' }));
    }
    showUndo(apply ? `บันทึกการเติม ${made.length} กระเป๋าแล้ว` : 'บันทึกแผนแล้ว', () => { payPlans.value = beforePlans; pockets.value = beforePockets; moves.value = beforeMoves; });
    back();
  };
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--money)', color: '#fff', padding: '8px 16px 24px', borderRadius: '0 0 28px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button class="btn icon" style={{ marginLeft: -8, color: '#fff' }} onClick={back} aria-label="ปิด"><Icon n="close" /></button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{thDate(c.start)} · {isPayday(today) ? 'เงินเดือนเข้าแล้ว' : canApply ? 'รอบนี้' : 'แผนรอบหน้า'}{applied ? ' · เติมกระเป๋าแล้ว' : ''}</span>
        <span class="num" style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.05 }}>+{fmt(T)}<span style={{ fontSize: 24, fontWeight: 500 }}> ฿</span></span>
        <span style={{ fontSize: 15 }}>แบ่งให้ตรงกับกระเป๋าใน MAKE ทุกบาทมีหน้าที่</span>
      </div>
      <div style={{ flex: 1, padding: '18px 16px 140px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', height: 40, borderRadius: 14, overflow: 'hidden' }} aria-hidden="true">
          {segs.map(([l, v, col]) => <span style={{ width: `${T ? (Math.max(0, v) / T) * 100 : 0}%`, background: col, color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', paddingLeft: 8, overflow: 'hidden', whiteSpace: 'nowrap' }}>{T && v / T > 0.12 ? l : ''}</span>)}
        </div>

        <div class="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div class="row"><span class="col grow"><span class="t16">ค่าคงที่</span><span class="cap muted">ตัดจาก {main?.name ?? 'บัญชีเงินเดือน'}</span></span><span class="num" style={{ fontSize: 20, fontWeight: 600 }}>{fmt(FIX)}</span></div>
          <div class="row" style={{ flexWrap: 'wrap', gap: 6 }}>{live(bills.value).filter((b) => b.fixed).map((b) => <span class="num" style={{ background: 'var(--bg)', borderRadius: 999, padding: '5px 10px', fontSize: 13 }}>{b.name} {b.approx ? '~' : ''}{fmt(b.amount)}</span>)}</div>
        </div>

        <div class="card" style={{ padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div class="row"><span class="col grow"><span class="t16">เติมกระเป๋า</span><span class="cap muted">ย้ายจาก {main?.name ?? 'บัญชีเงินเดือน'} ไป MAKE</span></span><span class="num" style={{ fontSize: 20, fontWeight: 600 }}>{fmt(fillSum)}</span></div>
          {ps.map((p) => (
            <div class="row" style={{ gap: 8, minHeight: 60, boxShadow: 'inset 0 1px 0 var(--surface-2)' }}>
              <span class="medal" style={{ width: 32, height: 32, background: POCKET_KIND[p.kind].soft, color: POCKET_KIND[p.kind].ink }}><Icon n={p.icon} fill size={18} /></span>
              <span class="col grow" style={{ minWidth: 0 }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span><span class="muted" style={{ fontSize: 12 }}>{p.partner ? `+ แฟนเติม ${fmt(p.partner)} · รวม ${fmt((fills[p.id] ?? 0) + p.partner)}` : p.daily ? `≈ ${fmt((fills[p.id] ?? 0) / c.totalDays)} ฿/วัน` : POCKET_KIND[p.kind].l}</span></span>
              <Stepper value={fills[p.id] ?? 0} onChange={(v) => setFills({ ...fills, [p.id]: Math.max(0, v) })} step={500} fmt={fmt} w={64} />
            </div>))}
          {!ps.length && <span class="muted" style={{ padding: '8px 0 10px', fontSize: 14 }}>ยังไม่มีกระเป๋า เพิ่มได้ที่หน้าเงิน</span>}
        </div>

        <div class="card row" style={{ padding: 14, gap: 8 }}>
          <span class="col grow"><span class="t16">โปะหนี้เพิ่ม</span><span class="cap muted">{debt ? 'เข้าตามแผนปลดหนี้ที่เลือก' : 'ไม่โปะรอบนี้'}</span></span>
          <Stepper value={debt} onChange={(v) => setDebt(Math.max(0, v))} step={500} fmt={fmt} w={64} />
        </div>

        <div class="row" style={{ gap: 8, fontSize: 14.5, color: left >= 0 ? 'var(--workout-ink)' : 'var(--error)', fontWeight: 600, padding: '0 4px' }}>
          <Icon n={left >= 0 ? 'check_circle' : 'error'} fill size={20} />{left > 0 ? `เหลือใน ${main?.name ?? 'บัญชีเงินเดือน'} ${fmt(left)} ฿ · ใส่กระเป๋าไหนดี` : left === 0 ? 'ทุกบาทมีหน้าที่แล้ว' : `แบ่งเกินเงินเดือน ${fmt(-left)} ฿`}
        </div>
      </div>
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(430px,100%)', bottom: 0, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', background: 'linear-gradient(rgba(246,245,241,0), var(--bg) 30%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {canApply && !applied && <button class="btn primary lg block" style={{ fontSize: 17 }} onClick={() => save(true)}>ย้ายเงินใน MAKE ตามนี้แล้ว</button>}
        <button class={`btn ${canApply && !applied ? 'soft' : 'primary'} lg block`} style={{ fontSize: 16 }} onClick={() => save(false)}>{applied ? 'อัปเดตแผน' : 'บันทึกแผนไว้ก่อน'}</button>
      </div>
    </div>
  );
}
