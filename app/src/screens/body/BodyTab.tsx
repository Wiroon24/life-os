import { Seg } from '../../ui/kit';
import { TrainSection } from './Train';
import { EatSection } from './Eat';
import { TrendsSection } from './Trends';
import { persisted } from '../../store/persist';
import { goTab } from '../../store/nav';

type S = 'train' | 'eat' | 'trends';
export const bodySeg = persisted<S>('bodySeg', 'train');
const last = bodySeg;
export const openBody = (s: S) => { bodySeg.value = s; goTab('body'); };

export function BodyTab({ seg }: { seg?: S }) {
  const s = seg ?? last.value;
  const set = (v: S) => { last.value = v; window.scrollTo(0, 0); };
  return (
    <div class="screen" style={{ gap: 16 }}>
      <span class="h1">ร่างกาย</span>
      <div style={{ marginTop: -6 }}><Seg value={s} onChange={set} options={[['train', 'ซ้อม'], ['eat', 'กิน'], ['trends', 'แนวโน้ม']]} /></div>
      {s === 'train' && <TrainSection />}
      {s === 'eat' && <EatSection />}
      {s === 'trends' && <TrendsSection />}
    </div>
  );
}
