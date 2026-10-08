// Builds app/public/exlib.json from free-exercise-db (public domain, https://github.com/yuhonas/free-exercise-db).
// Data only: downloads one JSON file, keeps the fields the app uses. Nothing from that repo is executed.
// Run: node scripts/build-exlib.mjs
import { writeFileSync } from 'node:fs';

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const res = await fetch(SRC);
if (!res.ok) throw new Error(`download failed ${res.status}`);
const all = await res.json();
const ok = (s) => typeof s === 'string' && /^[A-Za-z0-9_\-]+$/.test(s); // ids become URL path parts
const out = all.filter((e) => ok(e.id) && e.name).map((e) => ({
  id: e.id, n: String(e.name), eq: e.equipment ?? null, cat: e.category, lvl: e.level, force: e.force ?? null, mech: e.mechanic ?? null,
  pm: e.primaryMuscles ?? [], sm: e.secondaryMuscles ?? [], ins: (e.instructions ?? []).map(String), img: (e.images ?? []).length,
}));
writeFileSync(new URL('../public/exlib.json', import.meta.url), JSON.stringify(out));
console.log(`exlib.json: ${out.length} exercises`);
