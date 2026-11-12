// cmd-help: コマンドの用途を package.json と冒頭コメントから引く。commands.md（手で写した一覧）を消した代わりの入口なので、
// 起動するファイルの取り出し・冒頭コメントの読み方・検索の並びを固定する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { headerComment, scriptFile, scriptsWithoutHeader, searchCommands } from '../scripts/lib/cmd-help.mjs';
import { compareHeaderBaseline, NO_HEADER_BASELINE } from '../scripts/check-command-guidance.mjs';

test('冒頭コメントの基準: 基準に無いファイルの欠けは止め、冒頭コメントが付いたファイルは基準から消させる', () => {
  const base = ['scripts/old-a.mjs', 'scripts/old-b.mjs'];
  assert.deepEqual(compareHeaderBaseline(['scripts/old-a.mjs', 'scripts/old-b.mjs'], base), { added: [], cleared: [] });
  assert.deepEqual(compareHeaderBaseline(['scripts/old-a.mjs', 'scripts/old-b.mjs', 'scripts/new.mjs'], base), { added: ['scripts/new.mjs'], cleared: [] });
  assert.deepEqual(compareHeaderBaseline(['scripts/old-a.mjs'], base), { added: [], cleared: ['scripts/old-b.mjs'] });
  // 基準は増やさない（2026-11-11 の 32 本から減らす方向だけ）
  assert.ok(NO_HEADER_BASELINE.length <= 32, `基準が増えている: ${NO_HEADER_BASELINE.length}`);
  assert.equal(new Set(NO_HEADER_BASELINE).size, NO_HEADER_BASELINE.length);
});

test('scriptFile: node / tsx / npx tsx が最初に起動するファイルを返し、ファイルを起動しない script は null', () => {
  assert.equal(scriptFile('node scripts/deploy-main.mjs'), 'scripts/deploy-main.mjs');
  assert.equal(scriptFile('node --test --test-concurrency=2 tests/a.test.mjs'), 'tests/a.test.mjs');
  assert.equal(scriptFile('tsx scripts/build-standards-data.ts && node scripts/check-standards-data.mjs'), 'scripts/build-standards-data.ts');
  assert.equal(scriptFile('npx tsx scripts/x.mts --ci'), 'scripts/x.mts');
  assert.equal(scriptFile('node .claude/scripts/build-doc-meta-index.mjs --ci'), '.claude/scripts/build-doc-meta-index.mjs');
  assert.equal(scriptFile('tsc --noEmit'), null);
  assert.equal(scriptFile('npm run build-backlinks && npm run build-indexes'), null);
});

test('headerComment: shebang と空行を飛ばし、ブロックと行コメントの記号を外して読む', () => {
  const block = headerComment('#!/usr/bin/env node\n/**\n * 用途の説明。\n *\n *   node x.mjs --flag\n */\nimport a from "a";\n// 本文のコメント\n');
  assert.equal(block.kind, 'block');
  assert.deepEqual(block.lines, ['用途の説明。', '', '  node x.mjs --flag']);
  assert.deepEqual([block.start, block.end], [1, 5]);

  const line = headerComment('// 一行目\r\n//\r\n// 三行目\r\nimport a from "a";\r\n');
  assert.equal(line.kind, 'line');
  assert.deepEqual(line.lines, ['一行目', '', '三行目']);
  assert.deepEqual([line.start, line.end], [0, 2]);

  const oneLineBlock = headerComment('/* 1 行だけ */\nconst a = 1;\n');
  assert.deepEqual([oneLineBlock.kind, oneLineBlock.lines, oneLineBlock.end], ['block', ['1 行だけ'], 0]);
});

test('headerComment: import から始まるファイルは冒頭コメントなし（途中のコメントを冒頭と見なさない）', () => {
  const none = headerComment('#!/usr/bin/env node\nimport a from "a";\n// あとのコメント\n');
  assert.equal(none.kind, 'none');
  assert.deepEqual(none.lines, []);
  assert.equal(none.start, 1);
});

const FILES = {
  'scripts/deploy-main.mjs': '// develop の検査済み commit を main へ昇格する。\n// exit 0 は本番の確認まで通ったときだけ。\n',
  'scripts/check-production-ssr.mjs': '/** 本番の SSR を確かめる。deploy:main が最後に呼ぶ。 */\n',
  'scripts/no-header.mjs': 'import a from "a";\n',
};
const SCRIPTS = {
  'check-production-ssr': 'node scripts/check-production-ssr.mjs',
  'deploy:main': 'node scripts/deploy-main.mjs',
  'type-check': 'tsc --noEmit',
  'no-header': 'node scripts/no-header.mjs',
  'gone': 'node scripts/gone.mjs',
};
const readFile = (f) => FILES[f] ?? null;

test('searchCommands: 名前・実コマンド・冒頭コメントから探し、名前に当たったものを先に出す', () => {
  const hits = searchCommands({ scripts: SCRIPTS, readFile, query: 'deploy' });
  assert.deepEqual(hits.map((h) => h.name), ['deploy:main', 'check-production-ssr']);
  assert.deepEqual(hits[0].header, ['develop の検査済み commit を main へ昇格する。', 'exit 0 は本番の確認まで通ったときだけ。']);
  assert.equal(hits[0].file, 'scripts/deploy-main.mjs');
});

test('searchCommands: 語を並べると全部を含むものだけ。大文字小文字は区別しない。語なしは 0 件', () => {
  assert.deepEqual(searchCommands({ scripts: SCRIPTS, readFile, query: 'DEPLOY 昇格' }).map((h) => h.name), ['deploy:main']);
  assert.deepEqual(searchCommands({ scripts: SCRIPTS, readFile, query: 'tsc' }).map((h) => h.name), ['type-check']);
  assert.deepEqual(searchCommands({ scripts: SCRIPTS, readFile, query: '   ' }), []);
  assert.deepEqual(searchCommands({ scripts: SCRIPTS, readFile, query: '存在しない語' }), []);
});

test('scriptsWithoutHeader: 起動するファイルのうち冒頭コメントの無いものを返し、検査した数も出す', () => {
  const r = scriptsWithoutHeader({ scripts: SCRIPTS, readFile });
  // type-check（ファイルを起動しない）と gone（ファイルが無い）は数えない
  assert.equal(r.checked, 3);
  assert.deepEqual(r.missing, [{ name: 'no-header', file: 'scripts/no-header.mjs' }]);
});
