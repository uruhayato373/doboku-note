import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// tag-dictionary.json の並びは localeCompare() でタイブレークしていたため、
// 生成マシンのロケール（ja-JP か en/root か）で count 同値タグの前後が反転し、
// 中身が同一でも 562 行の差分が出ていた。並びが決定的であることを固定する。

const DICT_PATH = 'src/config/tag-dictionary.json';
const BUILDER_PATH = '.claude/scripts/build-tag-index.mjs';

// tag-dictionary.json は git で追跡しない生成物（DN-0792）。無ければここで作ってから並びを確かめる。
if (!existsSync(DICT_PATH)) execFileSync(process.execPath, [BUILDER_PATH], { stdio: 'ignore' });

function compareTagName(a, b) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

test('tag-dictionary.json の並びがロケール非依存な規則どおりである', () => {
  const dict = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const actual = dict.tags.map((t) => t.name);
  const expected = [...dict.tags]
    .sort((a, b) => b.count - a.count || compareTagName(a.name, b.name))
    .map((t) => t.name);
  assert.deepEqual(actual, expected);
});

test('unknown が tags の並びをそのまま引き継いでいる', () => {
  const dict = JSON.parse(readFileSync(DICT_PATH, 'utf8'));
  const expected = dict.tags.filter((t) => !t.inAllowlist).map((t) => t.name);
  assert.deepEqual(dict.unknown, expected);
});

test('ビルダーがタグ名の比較に localeCompare を使っていない', () => {
  const src = readFileSync(BUILDER_PATH, 'utf8');
  const code = src.replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/localeCompare/.test(code), false);
});
