import Anthropic from '@anthropic-ai/sdk';
import { settings } from './profile';

/**
 * Claude access. Until the Cloud Function proxy exists the key lives on-device (single-user app),
 * so the SDK runs in the browser. Server-side fallback is on so a safety decline is retried on a fallback model.
 */
export const hasAI = () => !!settings.value.apiKey;
let cached: { key: string; c: Anthropic } | null = null;
export function client() {
  const key = settings.value.apiKey;
  if (!key) throw new AIError('ยังไม่ได้ใส่ Claude API key · ไปที่โปรไฟล์ → ตั้งค่า AI');
  if (!cached || cached.key !== key) cached = { key, c: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true }) };
  return cached.c;
}
export const model = () => settings.value.model || 'claude-opus-5-5';
export const FALLBACK = { betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[], fallbacks: 'default' as const };

export class AIError extends Error {}
export function explain(e: unknown): string {
  if (e instanceof AIError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'API key ไม่ถูกต้อง ตรวจในหน้าตั้งค่า AI';
  if (e instanceof Anthropic.PermissionDeniedError) return 'API key ไม่มีสิทธิ์ใช้รุ่นนี้ ลองเปลี่ยนรุ่นในตั้งค่า AI';
  if (e instanceof Anthropic.RateLimitError) return 'เรียกถี่เกินไป รอสักครู่แล้วลองใหม่';
  if (e instanceof Anthropic.APIConnectionError) return 'ต่ออินเทอร์เน็ตไม่ได้';
  if (e instanceof Anthropic.APIError) return `AI ขัดข้อง (${e.status ?? '?'}) ลองใหม่อีกครั้ง`;
  return 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
}

export interface Img { data: string; media_type: 'image/jpeg' | 'image/png' | 'image/webp' }

/** Downscale a photo to keep requests small and fast (long edge 1280px, JPEG). */
export async function fileToImg(file: Blob, max = 1280): Promise<Img & { url: string }> {
  const url = URL.createObjectURL(file);
  const im = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
  const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
  c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/jpeg', 0.85).split(',')[1], media_type: 'image/jpeg', url };
}

/** One-shot structured extraction (photo or text → JSON matching `schema`). */
export async function extract<T>(opts: { system: string; text: string; images?: Img[]; schema: Record<string, unknown>; effort?: 'low' | 'medium' | 'high' }): Promise<T> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(opts.images ?? []).map((i) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: i.media_type, data: i.data } })),
    { type: 'text', text: opts.text },
  ];
  const res = await client().beta.messages.create({
    model: model(), max_tokens: 16000, ...FALLBACK,
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: opts.effort ?? 'low', format: { type: 'json_schema', schema: opts.schema } },
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new AIError('AI ไม่สามารถอ่านรายการนี้ได้');
  if (res.stop_reason === 'max_tokens') throw new AIError('คำตอบยาวเกิน ลองใหม่อีกครั้ง');
  const txt = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!txt) throw new AIError('AI ไม่ได้ตอบกลับ ลองใหม่อีกครั้ง');
  try { return JSON.parse(txt) as T; } catch { throw new AIError('อ่านคำตอบ AI ไม่ได้ ลองใหม่อีกครั้ง'); }
}
