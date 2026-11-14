// Fails when the locale files disagree: a key missing in one of them, a value
// of another kind, or a list of another length. Run: node scripts/i18n-check.mjs
// The same check as the company's other sites.
import { readFileSync } from 'node:fs';

const LOCALES = ['en', 'pt-BR', 'es'];
const dir = new URL('../v1/assets/i18n/', import.meta.url);
const flat = (o, p = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
    else out[key] = Array.isArray(v) ? `list:${v.length}` : typeof v;
  }
  return out;
};
const maps = Object.fromEntries(LOCALES.map((l) => [l, flat(JSON.parse(readFileSync(new URL(`${l}.json`, dir), 'utf8')))]));
const all = new Set(LOCALES.flatMap((l) => Object.keys(maps[l])));
const problems = [];
for (const key of all) {
  const kinds = LOCALES.map((l) => maps[l][key]);
  LOCALES.forEach((l, i) => { if (kinds[i] === undefined) problems.push(`${l}: missing ${key}`); });
  if (new Set(kinds.filter(Boolean)).size > 1) problems.push(`${key}: ${LOCALES.map((l, i) => `${l}=${kinds[i]}`).join(' ')}`);
}
for (const l of LOCALES) console.log(`${l}: ${Object.keys(maps[l]).length} keys`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('i18n: all locales aligned');
