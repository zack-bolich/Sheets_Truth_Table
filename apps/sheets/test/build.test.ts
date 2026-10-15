// Builds the clasp output and loads it the way Apps Script does: every file
// evaluated as a plain script in one shared global scope, with no module
// system. Then calls the custom functions as globals.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
let outdir: string;
let context: vm.Context;

const call = (fn: string, ...args: unknown[]): unknown => {
  context.args = args;
  // Round-trip through JSON so results compare as plain arrays outside the vm realm.
  return JSON.parse(vm.runInContext(`JSON.stringify(${fn}(...args))`, context) as string);
};

beforeAll(() => {
  outdir = mkdtempSync(join(tmpdir(), 'sheets-logic-build-'));
  execFileSync(process.execPath, [join(root, 'scripts/build.mjs'), '--outdir', outdir]);
  context = vm.createContext({});
  for (const file of ['core.js', 'functions.js']) {
    vm.runInContext(readFileSync(join(outdir, file), 'utf8'), context, { filename: file });
  }
}, 30_000);

afterAll(() => {
  rmSync(outdir, { recursive: true, force: true });
});

describe('build output', () => {
  it('contains exactly the files clasp should push', () => {
    expect(readdirSync(outdir).sort()).toEqual(['appsscript.json', 'core.js', 'functions.js']);
  });

  it('ships a V8 manifest', () => {
    const manifest = JSON.parse(readFileSync(join(outdir, 'appsscript.json'), 'utf8')) as {
      runtimeVersion: string;
    };
    expect(manifest.runtimeVersion).toBe('V8');
  });

  it('keeps the @customfunction JSDoc in functions.js', () => {
    const js = readFileSync(join(outdir, 'functions.js'), 'utf8');
    for (const name of [
      'TRUTHTABLE',
      'MINTERMS',
      'MAXTERMS',
      'EVALLOGIC',
      'MINIMIZE',
      'MINIMIZE_M',
      'EQUIVALENT',
      'KMAP',
      'KMAP_M',
      'SCHEMDRAW',
    ]) {
      expect(js).toMatch(new RegExp(`\\* @customfunction\\n \\*/\\nfunction ${name}\\(`));
    }
  });

  it('exposes the custom functions as globals', () => {
    expect(call('TRUTHTABLE', 'A & B | !C')).toEqual([
      ['A', 'B', 'C', 'A & B | !C'],
      [0, 0, 0, 1],
      [0, 0, 1, 0],
      [0, 1, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 1, 0],
      [1, 1, 0, 1],
      [1, 1, 1, 1],
    ]);
    expect(call('MINTERMS', 'AB + C')).toEqual([[1, 3, 5, 6, 7]]);
    expect(call('MAXTERMS', 'AB + C')).toEqual([[0, 2, 4]]);
    expect(call('EVALLOGIC', 'A & !B', 1, 0)).toBe(1);
    expect(call('MINIMIZE', 'A & B | !C')).toBe("AB + C'");
    expect(call('MINIMIZE_M', 4, [[1, 3, 7, 11, 15]], [[0, 2, 5]])).toBe("A'B' + CD");
    expect(call('EQUIVALENT', 'A ^ B', '(A|B)&!(A&B)')).toBe(true);
    expect(call('SCHEMDRAW', "E'S'W", 'GW')).toBe('GW = not E and not S and W');
    expect(call('KMAP', 'A ^ B')).toEqual([
      ['A\\B', '0', '1'],
      ['0', 0, 1],
      ['1', 1, 0],
    ]);
    expect(call('KMAP_M', 2, [[3]], [[0]])).toEqual([
      ['A\\B', '0', '1'],
      ['0', 'X', 0],
      ['1', 0, 1],
    ]);
  });

  it('surfaces readable errors', () => {
    expect(() => call('TRUTHTABLE', 'A & (B')).toThrow("Missing ')' to close '(' at position 5");
  });
});
