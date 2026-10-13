import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/exam-brand.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: () => ({ qualificationShortLabel: id => id }),
});

test('全部門共通の口頭教材には技術士の共通ラベルを使う', () => {
  assert.equal(exports.brandOf('pe-oral-general-guide').label, 'professional-engineer');
});

test('建設部門と総監の口頭教材はそれぞれの部門表示を保つ', () => {
  assert.equal(exports.brandOf('pe-construction-oral-guide').label, 'pe-construction');
  assert.equal(exports.brandOf('tankan-oral-complete').label, 'pe-comprehensive-management');
});
