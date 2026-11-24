// quality-audit を import する側（weekly-collect）の引数を、検査側が自分の引数と取り違えないこと。
// 2026-11-24、`weekly-collect --only note-sync` が import の時点で「--only の id が CHECKS に無い」と exit 2 で落ちていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(import.meta.dirname, '..');
const qa = pathToFileURL(resolve(repo, 'scripts/ops/quality-audit.mjs')).href;

test('import した側の --only <段> で quality-audit が終了しない', () => {
  // weekly-collect と同じ形: 別のスクリプトを `--only <段>` つきで起動し、その中から import する
  const dir = mkdtempSync(join(tmpdir(), 'qa-import-'));
  const entry = join(dir, 'importer.mjs');
  writeFileSync(entry, `const m = await import(${JSON.stringify(qa)}); console.log('checks', m.CHECKS.length);\n`);
  const r = spawnSync(process.execPath, [entry, '--only', 'note-sync'], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /checks \d+/);
});

test('CLI として起動したときは、知らない id を今までどおり検査不成立（exit 2）にする', () => {
  const r = spawnSync(process.execPath, ['scripts/ops/quality-audit.mjs', '--only', 'no-such-check'], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /CHECKS に無い: no-such-check/);
});
