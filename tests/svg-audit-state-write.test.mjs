// tests/svg-audit-state-write.test.mjs
//
// audit.mjs が .claude/state/svg-audit.json を書くのは全件走査のときだけ。
// --file / --path / --severity の部分実行で全体の監査結果を上書きしない回帰テスト
// （2026-09-30 に .tmp の図 1 枚の結果で 627 件分の state が消えた）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const AUDIT = resolve('.claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs');
// P4-tiny-font（LOW）を 1 件出す最小の SVG
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="x" style="max-width:400px;width:100%" font-family="sans-serif"><text x="10" y="20" font-size="9">小さい文字</text></svg>';

function setup() {
  const cwd = mkdtempSync(join(tmpdir(), 'svg-audit-state-'));
  mkdirSync(join(cwd, 'content/site/a/img'), { recursive: true });
  writeFileSync(join(cwd, 'content/site/a/img/figure-a.svg'), SVG);
  writeFileSync(join(cwd, 'content/site/a/img/figure-b.svg'), SVG);
  return cwd;
}

const run = (cwd, args = []) => execFileSync('node', [AUDIT, ...args], { cwd, encoding: 'utf8' });
const statePath = (cwd) => join(cwd, '.claude/state/svg-audit.json');

test('全件走査は state を書く', () => {
  const cwd = setup();
  try {
    run(cwd);
    const state = JSON.parse(readFileSync(statePath(cwd), 'utf8'));
    assert.equal(state.summary.scanned_files, 2);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('--file / --path / --severity の部分実行は既存の state を上書きしない', () => {
  const cwd = setup();
  try {
    run(cwd);
    const before = readFileSync(statePath(cwd), 'utf8');
    for (const args of [
      ['--file=content/site/a/img/figure-a.svg'],
      ['--path=content/site/a/img/figure-a.svg'],
      ['--severity=HIGH'],
    ]) {
      const out = run(cwd, args);
      assert.match(out, /部分実行のため/, `${args} の出力`);
      assert.equal(readFileSync(statePath(cwd), 'utf8'), before, `${args} が state を書き換えた`);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('部分実行は state が無くても作らず、所見を標準出力へ出す', () => {
  const cwd = setup();
  try {
    const out = run(cwd, ['--file=content/site/a/img/figure-a.svg']);
    assert.equal(existsSync(statePath(cwd)), false);
    assert.match(out, /LOW P4-tiny-font content\/site\/a\/img\/figure-a\.svg/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
