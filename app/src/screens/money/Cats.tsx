import { Icon, TopBar } from '../../ui/kit';
import { back } from '../../store/nav';
import { live, remove } from '../../store/collection';
import { categories, pocketById } from '../../domain/money';
import { openCategoryEditor, KIND_LABEL } from './catSheet';

/** Categories grouped by kind; each shows the pocket its money comes from by default. */
export function Cats() {
  return (
    <div class="screen sub" style={{ gap: 12 }}>
      <TopBar title="หมวดรายจ่าย" sub="แตะเพื่อแก้ชื่อ ประเภท หรือกระเป๋าเริ่มต้น" onBack={back} />
      {(['expense', 'income', 'invest', 'transfer'] as const).map((k) => { const l = live(categories.value).filter((c) => (c.kind ?? (c.income ? 'income' : 'expense')) === k); if (!l.length) return null; return (
        <div class="col" style={{ gap: 6 }}><span class="muted" style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>{KIND_LABEL[k]}{k !== 'expense' ? ' · ไม่นับเป็นรายจ่าย' : ''}</span>
          <div class="card" style={{ padding: '4px 8px 4px 12px' }}>{l.map((c, i) => { const p = pocketById(c.pocket); return (
            <div class="row" style={{ gap: 10, minHeight: 60, boxShadow: i ? 'inset 0 1px 0 var(--surface-2)' : 'none' }}>
              <span class="medal" style={{ width: 36, height: 36, background: c.soft, color: c.ink }}><Icon n={c.icon} fill size={20} /></span>
              <button class="col grow" style={{ textAlign: 'left', alignItems: 'flex-start' }} onClick={() => openCategoryEditor(c)}><span style={{ fontSize: 15.5, fontWeight: 600 }}>{c.name}</span><span class="muted" style={{ fontSize: 12.5 }}>{p ? `ใช้เงินจาก ${p.name}` : 'ไม่ผูกกระเป๋า · เลือกตอนยืนยันรายการ'}</span></button>
              <button class="btn icon" style={{ width: 36, color: 'var(--error)' }} onClick={() => remove(categories, c.id, `ลบหมวด ${c.name}`)} aria-label={`ลบหมวด ${c.name}`}><Icon n="delete" size={22} /></button>
            </div>); })}</div></div>); })}
      <button style={{ minHeight: 52, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600 }} onClick={() => openCategoryEditor(null)}><Icon n="add" size={22} />เพิ่มหมวด</button>
    </div>
  );
}
