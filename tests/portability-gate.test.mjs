/**
 * macOS（BSD）と Linux（GNU）でふるまいが違うコマンドの書き方のゲート（scripts/lib/portability-gate.mjs・DN-0560）。
 * CI は Linux だけなので、Mac でだけ落ちる書き方はここでだけ止まる。
 * 2026-10-07: tests/sync-index-after-commit.test.mjs の拡張子なしの sed -i が BSD sed で落ち、Mac の npm run test が赤くなっていた。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findNonPortable, scanText } from '../scripts/lib/portability-gate.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('tests・scripts・.claude/scripts・package.json・フックに BSD と GNU で挙動が違う書き方が無い', () => {
  const { files, hits } = findNonPortable(ROOT);
  console.log(`[portability-gate] ${files} ファイルを実検査 / 検出 ${hits.length} 件`);
  assert.ok(files > 1000, `検査したファイルが少なすぎる（${files} 件）＝範囲の指定が壊れている`);
  assert.deepEqual(hits.map((h) => `${h.file}:${h.line} [${h.rule}] ${h.text} → ${h.hint}`), []);
});

test('検出器: Mac でだけ落ちる書き方を拾う', () => {
  // 下の行はすべて検出器への入力（portable-ok は各行の末尾で、scanText に渡す文字列には入らない）
  const bad = [
    ['sed -i "s/a/b/" f', 'sed-i'], // portable-ok: 検出器のテストの入力
    ["sed -Ei 's/x/y/' f", 'sed-i'], // portable-ok: 検出器のテストの入力
    ["sed -i '' 's/x/y/' f", 'sed-i'], // portable-ok: 検出器のテストの入力
    ["execFileSync('sed', ['-i', 's/a/b/', f]);", 'sed-i'], // portable-ok: 検出器のテストの入力
    ["git diff | grep -P '\\d+'", 'grep-P'], // portable-ok: 検出器のテストの入力
    ['grep -rnP x .', 'grep-P'], // portable-ok: 検出器のテストの入力
    ["date -d '1 day ago' +%F", 'date-d'], // portable-ok: 検出器のテストの入力
    ['date -u --date=@0', 'date-d'], // portable-ok: 検出器のテストの入力
    ['readlink -f "$0"', 'readlink-f'], // portable-ok: 検出器のテストの入力
    ['stat -c %s f', 'stat-c'], // portable-ok: 検出器のテストの入力
    ['ls | xargs -r rm', 'xargs-r'], // portable-ok: 検出器のテストの入力
    ['find . -print0 | xargs -0r rm', 'xargs-r'], // portable-ok: 検出器のテストの入力
  ];
  for (const [line, rule] of bad) {
    assert.deepEqual(scanText(line).map((h) => h.rule), [rule], line);
  }
});

test('検出器: 移植できる書き方・コメント・portable-ok の行は拾わない', () => {
  const ok = [
    "sed -i.bak 's/a/b/' f && rm f.bak",
    'git grep -P "x" -- src',
    'ls | xargs rm -rf',
    'grep -qx "worktree $WT"',
    'echo "$(date -Iseconds)"',
    'const s = statSync(f); const date = d - 1;',
    '// sed -i はバックアップの拡張子を付ける', // portable-ok: 検出器のテストの入力
    '  * date -d は BSD に無い', // portable-ok: 検出器のテストの入力
    '# stat -c は GNU だけ', // portable-ok: 検出器のテストの入力
    "run('sed -i \"s/a/b/\" f'); // portable-ok: Linux の CI でだけ動く",
  ];
  for (const line of ok) assert.deepEqual(scanText(line), [], line);
});

test('検出器: ファイルを走査して件数と場所を返す（拡張子の無い -i を付けた sed を入れたファイルで落ちる）', () => {
  const root = mkdtempSync(join(tmpdir(), 'portability-'));
  try {
    mkdirSync(join(root, 'tests'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'tests/a.test.mjs'), "import { execSync } from 'node:child_process';\nexecSync('sed -i \"s/a/b/\" f');\n"); // portable-ok: 検出器のテストの入力
    writeFileSync(join(root, 'scripts/b.sh'), '#!/bin/sh\nsed -i.bak "s/a/b/" f\n');
    writeFileSync(join(root, 'package.json'), '{ "scripts": { "x": "stat -c %s f" } }\n'); // portable-ok: 検出器のテストの入力
    const { files, hits } = findNonPortable(root);
    assert.equal(files, 3);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}:${h.rule}`), ['tests/a.test.mjs:2:sed-i', 'package.json:1:stat-c']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
