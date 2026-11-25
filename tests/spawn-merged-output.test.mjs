// 子の stdout と stderr を書かれた順で集め、note 同期の失敗をその記事に結び付ける（DN-1301）。
// 2026-11-24: stdout + stderr でつないでいたため、stderr の ABORT が最後の記事に付き、ほかは「結果なし」になった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNodeMerged } from '../scripts/lib/spawn-merged-output.mjs';
import { classifyNoteSyncRun } from '../scripts/lib/note-sync-results.mjs';

// note-update-body と同じ出し分け: 記事の見出しと OK は stdout、ABORT は stderr
const CHILD = `
console.log('[article] n1 — a.md');
console.error('[4.6] ABORT: 添付の復元に失敗（a.pdf）→ 保存しない: n1');
console.log('[article] n2 — b.md');
console.log('[OK] n2 ライブ反映完了');
console.log('[article] n3 — c.md');
console.error('[4.6] ABORT: 添付の復元に失敗（c.pdf）→ 保存しない: n3');
process.exit(1);
`;

test('stderr の ABORT は、その直前の記事の失敗として結び付く', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merged-test-'));
  try {
    const script = join(dir, 'child.mjs');
    const log = join(dir, 'run.log');
    writeFileSync(script, CHILD);
    const run = runNodeMerged([script], { cwd: dir, log });
    assert.equal(run.status, 1);
    assert.equal(run.timedOut, false);
    assert.equal(readFileSync(log, 'utf8'), run.out, 'log に同じ出力を残す');
    const items = ['n1', 'n2', 'n3'].map((noteId) => ({ noteId, path: `${noteId}.md`, parts: ['body'] }));
    const r = classifyNoteSyncRun(items, run.out);
    assert.deepEqual(r.updated.map((x) => x.path), ['n2.md']);
    assert.deepEqual(r.failed.map((x) => [x.path, /a\.pdf/.test(x.reason) ? 'a' : /c\.pdf/.test(x.reason) ? 'c' : x.reason]), [['n1.md', 'a'], ['n3.md', 'c']]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('log を渡さなければ一時ファイルを使い、出力は返す', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merged-test-'));
  try {
    const script = join(dir, 'child.mjs');
    writeFileSync(script, "console.log('out'); console.error('err');");
    const run = runNodeMerged([script], { cwd: dir });
    assert.equal(run.status, 0);
    assert.equal(run.out, 'out\nerr\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('添付の失敗理由にアップロードの応答を載せる（応答が無いことも書く）', async () => {
  const { UPLOAD_API, describeUploads } = await import('../scripts/lib/note-attach.mjs');
  assert.ok(UPLOAD_API.test('https://note.com/api/v2/attachments/upload'));
  assert.ok(!UPLOAD_API.test('https://note.com/api/v2/notes/n1'));
  assert.equal(describeUploads([]), 'アップロードの応答なし');
  assert.equal(describeUploads([{ status: 429, body: '{"error":"limit"}' }]), 'アップロードの応答 429 {"error":"limit"}');
});
