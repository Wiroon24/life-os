/** Pure parsing of bank / card notifications. No app imports so the Android listener and tests can share it. */
export interface ParsedNotif {
  amount: number; cur: string; inc: boolean; merchant: string; account: string; card?: string; raw: string;
}

/** OTPs and verification texts must never become transactions (they often contain the amount too). */
export const isOtp = (s: string) => /OTP|รหัสผ่านใช้ครั้งเดียว|ห้ามเปิดเผย|รหัสยืนยัน|verification code|one[- ]time/i.test(s);

/**
 * Bank apps also push ads that quote amounts ("ผ่อน 0% 3 เดือน … ขั้นต่ำ 1,000 บ."). Real transaction
 * texts don't use this wording, so any match means "not a transaction".
 */
export const isPromo = (s: string) =>
  /โปรโมชั่น|โปรฯ|ผ่อน(?:สบาย|ได้|ชำระ)?\s*0\s*%|\d+\s*%|ขั้นต่ำ|ส่วนลด|รับสิทธิ์|สิทธิพิเศษ|แคมเปญ|ลุ้น|สมัคร|เงื่อนไข|ทุกร้าน|ช้อปครบ|ใช้จ่ายครบ|เมื่อมียอด|ตั้งแต่วันนี้|ถึงวันที่|คลิก|กดเลย|ดูรายละเอียด|https?:\/\/|promo|discount|cashback|privilege|limited|offer|\bsale\b/i.test(s);

const BANKS: [RegExp, string][] = [[/ktc|เคทีซี/i, 'KTC'], [/k\s?plus|กสิกร|kbank|make\s*by/i, 'กสิกร'], [/scb|ไทยพาณิชย์/i, 'SCB'], [/ktb|กรุงไทย/i, 'กรุงไทย'], [/bangkok\s*bank|ธนาคารกรุงเทพ|bualuang/i, 'กรุงเทพ'], [/true\s?money|ทรูมันนี่/i, 'TrueMoney']];
const CUR = '(THB|USD|EUR|JPY|SGD|GBP|CNY|HKD|AUD|KRW|MYR)';

/** `appLabel` is the sending app (e.g. 'MAKE by KBank'); it identifies the bank when the text itself does not. */
export function parseNotification(text: string, appLabel = ''): ParsedNotif | null {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s || isOtp(s) || isPromo(s)) return null;
  // "ยอด 1,180 THB" / "ยอด 21.40 USD" (KTC) first, then "฿359" / "359.00 บาท".
  const m = s.match(new RegExp(`ยอด\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*${CUR}?`, 'i'))
    ?? s.match(new RegExp(`${CUR}\\s?([\\d,]+(?:\\.\\d{1,2})?)`, 'i'))
    ?? s.match(/฿\s?([\d,]+(?:\.\d{1,2})?)(?!\d)|(?<![\d/.,])([\d,]+(?:\.\d{1,2})?)\s?(?:บาท|บ\.|฿)/);
  if (!m) return null;
  let cur = 'THB', num: string | undefined;
  if (/^ยอด/i.test(m[0])) { num = m[1]; cur = (m[2] ?? 'THB').toUpperCase(); }
  else if (new RegExp(`^${CUR}`, 'i').test(m[0])) { cur = m[1].toUpperCase(); num = m[2]; }
  else num = m[1] ?? m[2];
  const amount = parseFloat((num ?? '').replace(/,/g, ''));
  if (!amount) return null;
  const inc = /เงินเข้า|รับโอน|ได้รับ|received|deposit|โอนเข้า|incoming/i.test(s);
  const account = BANKS.find(([r]) => r.test(s))?.[1] ?? BANKS.find(([r]) => r.test(appLabel))?.[1] ?? (appLabel.trim() || 'บัญชี');
  // Card last4: "X-7292", "x7292", "*7292".
  const card = s.match(/(?:\bX-?|\*)(\d{4})\b/i)?.[1];
  // "@SHOPEE *SHOPEE", "@ANTHROPIC +1415…" → stop at "*", "+", or a long digit run.
  const at = s.match(/@\s*([A-Za-z0-9ก-๙&.'\- ]+?)(?=\s*(?:[*+]|…|\d{7,})|$)/);
  const th = s.match(/(?:ที่|at|ร้าน|to|ให้|ไปยัง|จาก|from)\s+([A-Za-z0-9ก-๙*&.'\- ]{2,40}?)(?=\s(?:วันที่|เวลา|ยอด|คงเหลือ|on|\d{1,2}[/:])|[…;]|$|[.,])/i);
  const merchant = (at?.[1] ?? th?.[1] ?? (inc ? 'เงินเข้า' : `รายการจาก ${account}`)).trim();
  return { amount, cur, inc, merchant, account, card, raw: text };
}
