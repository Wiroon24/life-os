import type { ComponentType } from 'preact';
import { tab, top } from './store/nav';
import { BottomNav } from './ui/Nav';
import { Snackbar, SheetHost, ScopeSheet } from './ui/overlays';
import { TodayTab } from './screens/today/TodayTab';
import { Timeline } from './screens/today/Timeline';
import { Meds } from './screens/today/Meds';
import { Brief } from './screens/today/Brief';
import { CloseDay } from './screens/today/CloseDay';
import { BodyTab } from './screens/body/BodyTab';
import { Workout } from './screens/body/Workout';
import { ExerciseDetail, Analysis } from './screens/body/ExerciseInfo';
import { Scores } from './screens/today/Scores';
import { Pantry, ReceiptReview } from './screens/body/Pantry';
import { Mobility, ProgramEdit, Library, History } from './screens/body/TrainMore';
import { Batch, Shop, Goals } from './screens/body/Eat';
import { MoneyTab } from './screens/money/MoneyTab';
import { Payday } from './screens/money/Payday';
import { Debt } from './screens/money/Debt';
import { Bills } from './screens/money/Bills';
import { CoachTab } from './screens/coach/CoachTab';
import { CoachSettings } from './screens/coach/CoachSettings';
import { Capture } from './screens/capture/Capture';
import { Profile } from './screens/profile/Profile';
import { Onboarding } from './screens/onboarding/Onboarding';
import { profile } from './domain/profile';

/* Screens are registered by name so tabs can push them (max depth: tab → screen → sheet). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCREENS: Record<string, ComponentType<any>> = {
  timeline: Timeline, meds: Meds, brief: Brief, close: CloseDay, scores: Scores,
  workout: Workout, mobility: Mobility, program: ProgramEdit, library: Library, history: History, exercise: ExerciseDetail, analysis: Analysis, pantry: Pantry, receipt: ReceiptReview, batch: Batch, shop: Shop, goals: Goals,
  payday: Payday, debt: Debt, bills: Bills, 'coach-settings': CoachSettings, profile: Profile,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TABS: Record<string, ComponentType<any>> = { today: TodayTab, body: BodyTab, money: MoneyTab, coach: CoachTab };

const Placeholder = ({ name }: { name: string }) => <div class="screen"><span class="h1">{name}</span><span class="muted">กำลังสร้าง</span></div>;

export function App() {
  if (!profile.value.onboarded) return <><Onboarding /><Snackbar /></>;
  const r = top.value;
  const Screen = r ? SCREENS[r.name] : null;
  const Tab = TABS[tab.value];
  return (
    <>
      {r ? (Screen ? <Screen key={r.name} {...(r.params ?? {})} /> : <Placeholder name={r.name} />) : Tab ? <Tab /> : <Placeholder name={tab.value} />}
      {!r && <BottomNav />}
      <Capture />
      <Snackbar />
      <SheetHost />
      <ScopeSheet />
    </>
  );
}
