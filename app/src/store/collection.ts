import type { Signal } from '@preact/signals';
import { uid } from './persist';
import { showUndo } from './ui';

/** Every editable record: ordered, soft-deletable, and marks who set it (AI must not overwrite user values). */
export interface Item {
  id: string;
  order: number;
  deletedAt?: number;
  updatedAt?: number;
  source?: 'user' | 'ai' | 'seed';
}

export const live = <T extends Item>(xs: T[]) => xs.filter((x) => !x.deletedAt).sort((a, b) => a.order - b.order);

export function add<T extends Item>(s: Signal<T[]>, data: Omit<T, 'id' | 'order'> & Partial<Item>, at?: number): T {
  const xs = live(s.value);
  let order: number;
  if (at == null || at >= xs.length) order = (xs[xs.length - 1]?.order ?? 0) + 1;
  else order = at <= 0 ? (xs[0]?.order ?? 1) - 1 : (xs[at - 1].order + xs[at].order) / 2;
  const item = { source: 'user', ...data, id: data.id ?? uid(), order, updatedAt: Date.now() } as T;
  s.value = [...s.value, item];
  return item;
}

export function update<T extends Item>(s: Signal<T[]>, id: string, patch: Partial<T>) {
  s.value = s.value.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
}

/** Soft delete + 5s undo snackbar. Trash keeps it 30 days (see purgeTrash). */
export function remove<T extends Item>(s: Signal<T[]>, id: string, label = 'ลบแล้ว') {
  update(s, id, { deletedAt: Date.now() } as Partial<T>);
  showUndo(label, () => update(s, id, { deletedAt: undefined } as Partial<T>));
}

export function move<T extends Item>(s: Signal<T[]>, id: string, toIndex: number) {
  const xs = live(s.value).filter((x) => x.id !== id);
  const i = Math.max(0, Math.min(toIndex, xs.length));
  const order = xs.length === 0 ? 1 : i === 0 ? xs[0].order - 1 : i === xs.length ? xs[xs.length - 1].order + 1 : (xs[i - 1].order + xs[i].order) / 2;
  update(s, id, { order } as Partial<T>);
}

export function purgeTrash<T extends Item>(s: Signal<T[]>, days = 30) {
  const cutoff = Date.now() - days * 864e5;
  if (s.value.some((x) => x.deletedAt && x.deletedAt < cutoff)) s.value = s.value.filter((x) => !x.deletedAt || x.deletedAt >= cutoff);
}
