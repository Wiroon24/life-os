/** Pure parsing of bank / card notifications. No app imports so the Android listener and tests can share it. */
export interface ParsedNotif {
  amount: number; cur: string; inc: boolean; merchant: string; account: string; card?: string; raw: string;
}

/** OTPs and verification texts must never become transactions (they often contain the amount too). */
export const isOtp = (s: string) => /OTP|รหัสผ่านใช้ครั้งเดียว|ห้ามเปิดเผย|รหัสยืนยัน|verification code|one[- ]time/i.test(s);

const BANKS: [RegExp, string][] = [[/ktc|เคทีซี/i, 'KTC'], [/k\s?plus|กสิกร|kbank|make\s*by/i, 'กสิกร'], [/scb|ไทยพาณิชย์/i, 'SCB'], [/ktb|กรุงไทย/i, 'กรุงไทย']];
const CUR = '(THB|USD|EUR|JPY|SGD|GBP|CNY|HKD|AUD|KRW|MYR)';

export function parseNotification(text: string): ParsedNotif | null {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s || isOtp(s)) return null;
  // "ยอด 1,180 THB" / "ยอด 21.40 USD" (KTC) first, then "฿359" / "359.00 บาท".
  const m = s.match(new RegExp(`ยอด\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*${CUR}?`, 'i'))
    ?? s.match(new RegExp(`${CUR}\\s?([\\d,]+(?:\\.\\d{1,2})?)`, 'i'))
    ?? s.match(/(?:฿)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(?:บาท|บ\.)/);
  if (!m) return null;
  let cur = 'THB', num: string | undefined;
  if (/^ยอด/i.test(m[0])) { num = m[1]; cur = (m[2] ?? 'THB').toUpperCase(); }
  else if (new RegExp(`^${CUR}`, 'i').test(m[0])) { cur = m[1].toUpperCase(); num = m[2]; }
  else num = m[1] ?? m[2];
  const amount = parseFloat((num ?? '').replace(/,/g, ''));
  if (!amount) return null;
  const inc = /เงินเข้า|รับโอน|ได้รับ|received|deposit|โอนเข้า|incoming/i.test(s);
  const account = BANKS.find(([r]) => r.test(s))?.[1] ?? 'บัญชี';
  const card = s.match(/X-?(\d{4})\b/i)?.[1];
  // "@SHOPEE *SHOPEE", "@ANTHROPIC +1415…" → stop at "*", "+", or a long digit run.
  const at = s.match(/@\s*([A-Za-z0-9ก-๙&.'\- ]+?)(?=\s*(?:[*+]|…|\d{7,})|$)/);
  const th = s.match(/(?:ที่|at|ร้าน|to|ให้|ไปยัง|จาก|from)\s+([A-Za-z0-9ก-๙*&.'\- ]{2,40}?)(?=\s(?:วันที่|เวลา|ยอด|คงเหลือ|on|\d{1,2}[/:])|$|[.,])/i);
  const merchant = (at?.[1] ?? th?.[1] ?? (inc ? 'เงินเข้า' : `รายการจาก ${account}`)).trim();
  return { amount, cur, inc, merchant, account, card, raw: text };
}

/** Same purchase often arrives twice (bank SMS + bank app push). */
export const dupKey = (p: Pick<ParsedNotif, 'amount' | 'cur' | 'merchant' | 'card' | 'account'>) =>
  [p.account, p.card ?? '', p.cur, p.amount.toFixed(2), p.merchant.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '')].join('|');
