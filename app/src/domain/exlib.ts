import { signal } from '@preact/signals';
import type { ExInfo, Group } from './exerciseInfo';

/** One entry of /exlib.json (free-exercise-db, public domain). Names and steps are English. */
export interface LibEx { id: string; n: string; eq: string | null; cat: string; lvl: string; force: string | null; mech: string | null; pm: string[]; sm: string[]; ins: string[]; img: number }

export const exLib = signal<LibEx[] | null>(null);
let loading: Promise<void> | null = null;
/** Loaded on demand (~150 KB gzipped) the first time a screen needs it. */
export function loadExLib() {
  return (loading ??= fetch('/exlib.json').then((r) => r.json()).then((d: LibEx[]) => { exLib.value = d; }).catch(() => { loading = null; }));
}
export const libByName = (name: string) => exLib.value?.find((e) => e.n === name);

/** Images live in the free-exercise-db repo; the 30 used most are also bundled under /ex for offline use. */
const LOCAL = new Set(['Ankle_Circles', 'Barbell_Hip_Thrust', 'Bent-Arm_Dumbbell_Pullover', 'Bodyweight_Squat', 'Calf_Stretch_Hands_Against_Wall', 'Cat_Stretch', 'Close-Grip_Front_Lat_Pulldown', 'Dead_Bug', 'Dumbbell_Bench_Press', 'Dumbbell_Rear_Lunge', 'Dumbbell_Shoulder_Press', 'Dumbbell_Step_Ups', 'Farmers_Walk', 'Goblet_Squat', 'Hammer_Curls', 'Incline_Dumbbell_Press',
  'Kneeling_Hip_Flexor', 'Leg_Extensions', 'One-Arm_Dumbbell_Row', 'Plank', 'Pushups', 'Running_Treadmill', 'Seated_Bent-Over_Rear_Delt_Raise', 'Side_Lateral_Raise', 'Split_Squat_with_Dumbbells', 'Standing_Dumbbell_Calf_Raise', 'Standing_Dumbbell_Triceps_Extension', 'Stiff-Legged_Dumbbell_Deadlift', 'Walking_Treadmill', 'Wide-Grip_Lat_Pulldown']);
export const imgUrl = (id: string, f: number) => LOCAL.has(id) ? `/ex/${id}/${f}.jpg` : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}/${f}.jpg`;

export const MUSCLE_TH: Record<string, string> = {
  abdominals: 'หน้าท้อง', hamstrings: 'หลังต้นขา', adductors: 'ต้นขาด้านใน', abductors: 'สะโพกด้านนอก', quadriceps: 'ต้นขาหน้า', biceps: 'ไบเซ็ป', triceps: 'ไตรเซ็ป',
  shoulders: 'ไหล่', chest: 'อก', 'middle back': 'หลังกลาง', 'lower back': 'หลังล่าง', lats: 'ปีกหลัง', traps: 'บ่า', calves: 'น่อง', glutes: 'ก้น', forearms: 'ปลายแขน', neck: 'คอ',
};
export const EQ_TH: Record<string, string> = {
  'body only': 'ตัวเปล่า', dumbbell: 'ดัมเบล', barbell: 'บาร์เบล', machine: 'เครื่อง', cable: 'เคเบิล', kettlebells: 'เคตเทิลเบล', bands: 'ยางยืด',
  'medicine ball': 'เมดิซินบอล', 'exercise ball': 'ลูกบอลโยคะ', 'e-z curl bar': 'บาร์ EZ', 'foam roll': 'โฟมโรล', other: 'อื่นๆ',
};
export const CAT_TH: Record<string, string> = { strength: 'เวท', stretching: 'ยืดเหยียด', plyometrics: 'กระโดด', strongman: 'สตรองแมน', powerlifting: 'พาวเวอร์ลิฟติ้ง', cardio: 'คาร์ดิโอ', 'olympic weightlifting': 'ยกน้ำหนักโอลิมปิก' };
export const LVL_TH: Record<string, string> = { beginner: 'เริ่มต้น', intermediate: 'กลาง', expert: 'ยาก' };
export const eqTh = (e: LibEx) => (e.eq ? EQ_TH[e.eq] ?? e.eq : 'ไม่ระบุ');

/** App muscle bucket (Exercise.muscle) for a library entry. */
export function bucketOf(e: LibEx): string {
  if (e.cat === 'cardio') return 'คาร์ดิโอ';
  const m = e.pm[0] ?? '';
  if (m === 'chest') return 'อก';
  if (['lats', 'middle back', 'lower back', 'traps'].includes(m)) return 'หลัง';
  if (m === 'shoulders' || m === 'neck') return 'ไหล่';
  if (['biceps', 'triceps', 'forearms'].includes(m)) return 'แขน';
  if (m === 'calves') return 'น่อง';
  if (m === 'abdominals') return 'แกนกลาง';
  return 'ขา';
}
const GROUP: Record<string, Group> = {
  chest: 'อก', lats: 'หลัง', 'middle back': 'หลัง', 'lower back': 'สะโพกและหลังต้นขา', traps: 'หลัง', shoulders: 'ไหล่', neck: 'ไหล่', biceps: 'แขน', triceps: 'แขน', forearms: 'แขน',
  quadriceps: 'ต้นขาหน้า', hamstrings: 'สะโพกและหลังต้นขา', glutes: 'สะโพกและหลังต้นขา', adductors: 'ต้นขาหน้า', abductors: 'สะโพกและหลังต้นขา', calves: 'น่อง', abdominals: 'แกนกลาง',
};

/** Coaching-card shape for library entries, so weekly analysis and the detail screen work the same as for the curated 30. */
export function libInfo(e: LibEx): ExInfo {
  const groups = [...new Set(e.pm.map((m) => GROUP[m]).filter(Boolean))] as Group[];
  const m = e.pm[0];
  const pattern: ExInfo['pattern'] = e.cat === 'cardio' ? 'คาร์ดิโอ' : e.cat === 'stretching' ? 'ยืดเหยียด' : m === 'abdominals' ? 'แกนกลาง'
    : m === 'quadriceps' ? 'ย่อเข่า' : m === 'hamstrings' || m === 'glutes' || m === 'lower back' ? 'ก้มสะโพก' : e.force === 'pull' ? 'ดึง' : 'ดัน';
  return {
    img: e.img >= 2 ? e.id : undefined, pattern, groups: groups.length ? groups : ['แกนกลาง'],
    muscles: [...e.pm, ...e.sm].map((x) => MUSCLE_TH[x] ?? x).join(' · '),
    steps: e.ins, why: `${CAT_TH[e.cat] ?? e.cat} · ระดับ${LVL_TH[e.lvl] ?? e.lvl} · อุปกรณ์ ${eqTh(e)}`, mistakes: [], alt: `${e.n} exercise`,
  };
}
