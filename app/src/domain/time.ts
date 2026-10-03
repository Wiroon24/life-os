export const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m: number) => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
export const clock = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const dow = (d: Date) => DOW[d.getDay()];
export const dowFull = (d: Date) => DOW_FULL[d.getDay()];
export const thDate = (d = new Date()) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
export const thDateLong = (d = new Date()) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear() + 543}`;
export const DOW_SHORT = DOW;

export const fmt = (n: number, digits = 0) => n.toLocaleString('th-TH', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const baht = (n: number) => `${fmt(Math.round(n))} ฿`;
export const hm = (min: number) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? (m ? `${h} ชม. ${m} นาที` : `${h} ชม.`) : `${m} นาที`; };
