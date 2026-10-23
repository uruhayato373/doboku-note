import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { driveUnreadableWarning, isDriveReadError, readVaultDir, readVaultFile, readVaultJson } from '../scripts/lib/drive-vault.mjs';
import { basisDriveIssues, loadBasis } from '../scripts/lib/content-series.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';

/**
 * Drive の読み取りの時間切れ（2026-10-22: Google ドライブ アプリの不調で readFileSync が即 ETIMEDOUT を投げ、
 * 記事と無関係の pre-commit の check-content-series が例外で止まった）。ETIMEDOUT・EIO などは
 * 「Drive を読めない」として照合せず、件数を WARN で出す（Drive の無い端末と同じ扱い・偽 PASS にしない）。
 */
const ROOT = REPO_ROOT;
const throwing = (code) => () => { const e = new Error(code); e.code = code; throw e; };

test('readVaultFile / readVaultJson / readVaultDir は Drive の読み取り失敗を { ok:false, code } で返し、それ以外は投げる', () => {
  for (const code of ['ETIMEDOUT', 'EIO']) {
    assert.ok(isDriveReadError({ code }));
    assert.deepEqual(readVaultFile('/x', 'utf8', { readFile: throwing(code), env: {} }), { ok: false, code });
    assert.deepEqual(readVaultJson('/x', { readFile: throwing(code), env: {} }), { ok: false, code });
    assert.deepEqual(readVaultDir('/x', { readDir: throwing(code), env: {} }), { ok: false, code });
  }
  assert.throws(() => readVaultFile('/x', 'utf8', { readFile: throwing('ENOENT'), env: {} }), /ENOENT/);
  assert.throws(() => readVaultJson('/x', { readFile: () => '{', env: {} }), SyntaxError);
  assert.deepEqual(readVaultJson('/x', { readFile: () => '{"a":1}', env: {} }), { ok: true, data: { a: 1 } });
  // 故障注入（手元の確認用）
  assert.deepEqual(readVaultFile('/x', 'utf8', { readFile: () => 'ok', env: { DOBOKU_DRIVE_READ_FAULT: 'ETIMEDOUT' } }), { ok: false, code: 'ETIMEDOUT' });
  assert.match(driveUnreadableWarning('check-x', 3, 'ETIMEDOUT'), /WARN: Drive を読めないので照合しない（3 件・ETIMEDOUT）/);
});

/** 割り当ての全書籍について、空の候補表を置いた一時の vault を作る（existsSync は通り、読むと故障注入で ETIMEDOUT になる） */
function fakeVault() {
  const vault = mkdtempSync(join(tmpdir(), 'drive-fault-'));
  writeFileSync(join(vault, 'README.md'), 'test vault\n');
  const sources = readDataset(ROOT, 'config.reference-sources').sources;
  const books = Object.keys(loadBasis(ROOT).books ?? {});
  for (const id of books) {
    const dir = sources.find((s) => s.id === id)?.origin?.vaultDir;
    if (!dir) continue;
    mkdirSync(join(vault, ...dir.split('/'), 'coverage'), { recursive: true });
    writeFileSync(join(vault, ...dir.split('/'), 'coverage', 'candidates.json'), '{"units":[]}');
  }
  return { vault, books: books.length, sources };
}

test('basisDriveIssues: ETIMEDOUT の本は照合せず unreadable に数え、例外を投げない', () => {
  const { vault, books, sources } = fakeVault();
  try {
    const r = basisDriveIssues(loadBasis(ROOT), vault, sources, { readFile: throwing('ETIMEDOUT'), env: {} });
    assert.ok(books > 0, '割り当ての書籍が 0 冊（検査していない）');
    assert.equal(r.checked, 0);
    assert.equal(r.unreadable.length, books);
    assert.equal(r.code, 'ETIMEDOUT');
    assert.deepEqual(r.issues, []);
    assert.equal(basisDriveIssues(loadBasis(ROOT), null, sources), null);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('check-content-series: Drive の読み取りが ETIMEDOUT でも落ちずに WARN と件数を出す', () => {
  const { vault, books } = fakeVault();
  try {
    const r = spawnSync(process.execPath, ['scripts/check-content-series.mjs'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, DOBOKU_DRIVE_VAULT: vault, DOBOKU_DRIVE_READ_FAULT: 'ETIMEDOUT' },
    });
    const out = r.stdout + r.stderr;
    assert.equal(r.status, 0, out);
    assert.match(out, new RegExp(`WARN: Drive を読めないので照合しない（${books} 件・ETIMEDOUT）`));
    assert.match(out, new RegExp(`Drive の候補表と id を照合 0 冊・読めず件数だけ ${books} 冊`));
    assert.match(out, /✓ PASS/);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
