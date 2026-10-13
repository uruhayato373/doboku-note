// check-client-chunk-size（DN-0684・2026-10-11）の回帰ゲート。/search のチャンクに doc-meta-index が同梱されて
// 1.66MB になっていたのを、build 直後に 1 本 600KB の上限で止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts', 'check-client-chunk-size.mjs');

function run(outDir, extra = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--out', outDir, '--json', ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, json: JSON.parse(stdout) };
  } catch (e) {
    return { status: e.status, json: e.stdout ? safeJson(e.stdout) : null, stderr: String(e.stderr ?? '') };
  }
}
const safeJson = (s) => { try { return JSON.parse(s); } catch { return null; } };

function makeOut(files) {
  const root = mkdtempSync(join(tmpdir(), 'chunk-size-'));
  const chunks = join(root, '_next', 'static', 'chunks');
  mkdirSync(join(chunks, 'app'), { recursive: true });
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(chunks, name), Buffer.alloc(bytes, 0x20));
  return root;
}

test('上限を超える JS が 1 本あれば exit 1 で名前を挙げる', () => {
  const out = makeOut({ 'small.js': 10_000, 'app/huge.js': 700_000 });
  try {
    const r = run(out);
    assert.equal(r.status, 1);
    assert.equal(r.json.checked, 2);
    assert.deepEqual(r.json.over.map((x) => x.path.endsWith('app/huge.js')), [true]);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('全て上限以内なら exit 0・検査数を出す', () => {
  const out = makeOut({ 'a.js': 10_000, 'b.js': 599_999, 'c.css': 900_000 });
  try {
    const r = run(out);
    assert.equal(r.status, 0);
    assert.equal(r.json.checked, 2, 'CSS は数えない');
    assert.equal(r.json.over.length, 0);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('--max-bytes で上限を変えられる', () => {
  const out = makeOut({ 'a.js': 10_000 });
  try {
    assert.equal(run(out, ['--max-bytes', '5000']).status, 1);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('out/ が無い・JS が 0 本は検査不成立（exit 2）で PASS と呼ばない', () => {
  assert.equal(run(join(tmpdir(), 'chunk-size-missing-' + Date.now())).status, 2);
  const out = makeOut({ 'only.css': 100 });
  try { assert.equal(run(out).status, 2); } finally { rmSync(out, { recursive: true, force: true }); }
});
