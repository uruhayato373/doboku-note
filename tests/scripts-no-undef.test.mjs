/**
 * scripts の未定義参照のゲート（scripts/lib/no-undef-gate.mjs）。
 * eslint.config は scripts/ を対象外にしているので、import 漏れや引用符の付け忘れはここでだけ止まる。
 * 2026-10-02: report-site-to-sales の readdirSync の import 漏れ（書き込み経路だけで落ちた）、
 * note-sync-plan の 'no-cover'・'synced' などの引用符なし（live-changed は引き算として素通りしていた）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUndefined } from '../scripts/lib/no-undef-gate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('scripts・.claude/scripts・.claude/skills の .mjs に未定義の参照が無い', async () => {
  const { files, problems } = await findUndefined(ROOT);
  console.log(`[scripts-no-undef] ${files} ファイルを実検査 / 未定義 ${problems.length} 件`);
  assert.ok(files > 500, `検査したファイルが少なすぎる（${files} 件）＝範囲の指定が壊れている`);
  assert.deepEqual(problems.map((p) => `${p.file}:${p.line} ${p.message}`), []);
});

test('import 漏れ・引用符の付け忘れを検出する（検出器そのものの確認）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'no-undef-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'scripts/a.mjs'), "import { readFileSync } from 'node:fs';\nexport const f = () => readdirSync('.');\nexport const g = (s) => (s === ready ? readFileSync('x') : process.cwd());\n");
    writeFileSync(join(root, 'scripts/b.mjs'), "export const h = async (page) => page.evaluate(() => document.querySelector('a') && new MouseEvent('click'));\n");
    const { files, problems } = await findUndefined(root);
    assert.equal(files, 2);
    assert.deepEqual(problems.map((p) => p.message).sort(), ["'readdirSync' is not defined.", "'ready' is not defined."]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
