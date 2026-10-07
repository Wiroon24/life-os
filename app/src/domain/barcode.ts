import { Capacitor } from '@capacitor/core';
import { products, saveProduct, type FoodRef } from './foodDb';

type Scanner = typeof import('@capacitor-mlkit/barcode-scanning').BarcodeScanner;
/** Keep the plugin proxy inside a plain object: Capacitor proxies answer `.then`, so awaiting one directly never settles. */
let S: { api: Scanner; fmt: typeof import('@capacitor-mlkit/barcode-scanning').BarcodeFormat } | null = null;
const scanner = async () => { if (!S) { const m = await import('@capacitor-mlkit/barcode-scanning'); S = { api: m.BarcodeScanner, fmt: m.BarcodeFormat }; } return S; };

export const canScan = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BarcodeScanner');

/** Opens Google's scanner UI (no camera permission needed). Returns the code, or null if cancelled. */
export async function scanBarcode(): Promise<string | null> {
  const { api, fmt } = await scanner();
  const avail = await api.isGoogleBarcodeScannerModuleAvailable();
  if (!avail.available) { await api.installGoogleBarcodeScannerModule(); throw new Error('กำลังติดตั้งตัวสแกนของ Google ลองใหม่ในอีกสักครู่'); }
  try {
    const r = await api.scan({ formats: [fmt.Ean13, fmt.Ean8, fmt.UpcA, fmt.UpcE] });
    return r.barcodes[0]?.rawValue ?? null;
  } catch (e) { if (/cancel/i.test(String(e))) return null; throw e; }
}

const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && v.trim() && isFinite(+v) ? +v : null);

/**
 * Looks a barcode up: scanned/edited products saved on this phone first, then Open Food Facts
 * (free, no key; only the barcode number leaves the phone). Prefers per-serving values, else per 100 g.
 */
export async function lookupBarcode(code: string): Promise<FoodRef | null> {
  const mine = products.value[code]; if (mine) return mine;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_th,product_name_en,brands,nutriments,serving_size,quantity`);
  if (!res.ok) { if (res.status === 404) return null; throw new Error(`ค้นสินค้าไม่สำเร็จ (${res.status})`); }
  const j = await res.json() as { status?: number; product?: { product_name?: string; product_name_th?: string; product_name_en?: string; brands?: string; serving_size?: string; quantity?: string; nutriments?: Record<string, unknown> } };
  const p = j.product; if (!j.status || !p) return null;
  const m = p.nutriments ?? {};
  const per = (k: string, s: string) => n(m[`${k}_${s}`]);
  const kcalOf = (s: string) => per('energy-kcal', s) ?? (per('energy', s) != null ? per('energy', s)! / 4.184 : null);
  const useServing = kcalOf('serving') != null;
  const s = useServing ? 'serving' : '100g', k = kcalOf(s);
  const name = [p.product_name_th || p.product_name || p.product_name_en, p.brands?.split(',')[0]].filter(Boolean).join(' · ') || `สินค้า ${code}`;
  if (k == null) return { name, serving: 'ไม่มีข้อมูลโภชนาการ', k: 0, p: 0, c: 0, f: 0, src: 'product', barcode: code };
  const r: FoodRef = {
    name, serving: useServing ? `1 หน่วยบริโภค${p.serving_size ? ` (${p.serving_size})` : ''}` : '100 g/ml',
    k: Math.round(k), p: Math.round(per('proteins', s) ?? 0), c: Math.round(per('carbohydrates', s) ?? 0), f: Math.round(per('fat', s) ?? 0), src: 'product', barcode: code,
  };
  saveProduct(r);
  return r;
}
