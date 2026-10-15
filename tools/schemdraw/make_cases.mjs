// Writes random expressions, their =SCHEMDRAW() output and their minterms as
// JSON, using the built Apps Script bundle (run `npm run build` first). The
// cases feed check_export.py, which confirms Schemdraw's own parser reads
// every exported string as the same function.
//
// Usage: node tools/schemdraw/make_cases.mjs > cases.json
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../../build/core.js', import.meta.url), 'utf8'), context);
const { SheetsLogic } = context;

let seed = 12345;
const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = (xs) => xs[Math.floor(random() * xs.length)];

function expression(depth) {
  if (depth === 0 || random() < 0.25) {
    const leaf = random() < 0.05 ? pick(['0', '1']) : pick(['A', 'B', 'C', 'D']);
    return random() < 0.3 ? `!${leaf}` : leaf;
  }
  if (random() < 0.2) return `!(${expression(depth - 1)})`;
  return `(${expression(depth - 1)} ${pick(['&', '|', '^'])} ${expression(depth - 1)})`;
}

const cases = [];
for (let i = 0; i < 500; i++) {
  const e = expression(5);
  const header = SheetsLogic.truthTable(e)[0];
  cases.push({
    expression: e,
    schemdraw: SheetsLogic.schemdraw(e),
    variables: header.slice(0, -1),
    minterms: SheetsLogic.minterms(e)[0].filter((m) => m !== ''),
  });
}
console.log(JSON.stringify(cases));
