/**
 * Pure ordering helpers (no imports, so Node can test them directly).
 * Order values are one global sequence; lists are always sorted ascending by `order`.
 */

/**
 * Repairs records whose `order` is missing, non-finite or duplicated (old/imported data).
 * Returns the SAME array when everything is already valid, so callers can skip writes.
 * Keeps every record (deleted ones too) and every field; only `order` is rewritten to 1..n,
 * following current display order (finite orders first, then the rest by array position).
 */
export function normalizeOrder<T extends { order?: number }>(xs: T[]): T[] {
  const seen = new Set<number>();
  let ok = true;
  for (const x of xs) {
    const o = x.order;
    if (typeof o !== 'number' || !Number.isFinite(o) || seen.has(o)) { ok = false; break; }
    seen.add(o);
  }
  if (ok) return xs;
  const fin = (o: unknown): o is number => typeof o === 'number' && Number.isFinite(o);
  const idx = xs.map((x, i) => ({ x, i }));
  idx.sort((a, b) => {
    const fa = fin(a.x.order), fb = fin(b.x.order);
    if (fa && fb) return (a.x.order as number) - (b.x.order as number) || a.i - b.i;
    if (fa !== fb) return fa ? -1 : 1;
    return a.i - b.i;
  });
  const next = new Map<number, number>();
  idx.forEach(({ i }, rank) => next.set(i, rank + 1));
  return xs.map((x, i) => ({ ...x, order: next.get(i)! }));
}

/**
 * New order values for a scoped list (e.g. one slot's live items, sorted) so it reads in `ids` order.
 * Reuses the scope's existing order values, so items outside the scope keep their place.
 * Unknown ids are ignored; scoped ids missing from `ids` keep their relative order at the end.
 */
export function permuteOrder<T extends { id: string; order: number }>(scoped: T[], ids: string[]): Map<string, number> {
  const known = new Set(scoped.map((x) => x.id)), used = new Set<string>();
  const seq: string[] = [];
  for (const id of ids) if (known.has(id) && !used.has(id)) { used.add(id); seq.push(id); }
  for (const x of [...scoped].sort((a, b) => a.order - b.order)) if (!used.has(x.id)) seq.push(x.id);
  let vals = scoped.map((x) => x.order).sort((a, b) => a - b);
  if (new Set(vals).size !== vals.length || vals.some((v) => !Number.isFinite(v))) {
    const min = vals.filter(Number.isFinite).reduce((m, v) => Math.min(m, v), Infinity);
    vals = vals.map((_, i) => (Number.isFinite(min) ? min : 1) + i);
  }
  return new Map(seq.map((id, i) => [id, vals[i]]));
}

/** Order value that places a new item just before `scoped[beforeIndex]` (scoped is sorted). */
export function orderBefore(scoped: { order: number }[], beforeIndex: number): number {
  if (scoped.length === 0) return 1;
  if (beforeIndex >= scoped.length) return scoped[scoped.length - 1].order + 1;
  if (beforeIndex <= 0) return scoped[0].order - 1;
  return (scoped[beforeIndex - 1].order + scoped[beforeIndex].order) / 2;
}

/** Order value after every record (pass ALL records, deleted included, so restored items land last). */
export function orderAtEnd(all: { order: number }[]): number {
  let max = 0;
  for (const x of all) if (Number.isFinite(x.order) && x.order > max) max = x.order;
  return max + 1;
}
