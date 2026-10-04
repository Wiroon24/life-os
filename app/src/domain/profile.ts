import { persisted } from '../store/persist';

export type Tone = 'strict' | 'balanced' | 'gentle';
export interface Profile {
  name: string;
  sex: 'm' | 'f';
  birthYear: number;
  heightCm: number;
  goal: string;
  tone: Tone;
  wake: string;      // HH:MM target
  sleep: string;     // HH:MM target (may be after midnight)
  workStart: string;
  payday: number;    // day of month salary arrives (used when paydayMode is 'fixed')
  paydayMode?: 'fixed' | 'eom'; // 'eom' = the day before the last working day (Mon–Fri) of the month
  netSalary: number;
  equipment: string[];
  injuries: string[];
  onboarded: boolean;
  startDate: string;
}

export const profile = persisted<Profile>('profile', {
  name: '',
  sex: 'm',
  birthYear: 1996,
  heightCm: 173,
  goal: 'ลดไขมัน + เพิ่มกล้าม (hybrid)',
  tone: 'strict',
  wake: '07:45',
  sleep: '00:15',
  workStart: '10:00',
  payday: 28,
  paydayMode: 'eom',
  netSalary: 33618,
  equipment: ['ดัมเบล', 'ม้านั่ง', 'ลู่วิ่ง', 'Leg extension', 'Lat pulldown'],
  injuries: ['ข้อเท้าพลิก', 'ปวดเอ็นลูกสะบ้า', 'ปวดเอ็นน่อง'],
  onboarded: false,
  startDate: new Date().toISOString().slice(0, 10),
});

/** AI key for direct calls until the Cloud Function proxy exists. */
export const settings = persisted('settings', { apiKey: '', model: 'claude-sonnet-5-5', modelChosen: false, numFont: 'Anuphan' as 'Anuphan' | 'Outfit', nagLevel: 3, quietFrom: '00:30', quietTo: '07:30' });

/** Devices that saved the old Opus default (without ever choosing it) move to the new Sonnet default. */
if (!settings.value.modelChosen && settings.value.model === 'claude-opus-5-5') settings.value = { ...settings.value, model: 'claude-sonnet-5-5' };
