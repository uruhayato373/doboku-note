// check-command-guidance の走査範囲と抽出の回帰ゲート（DN-0686・2026-10-11）。
// 走査が scripts・CLAUDE.md・commands.md・rules だけだった間、skills・knowledge に実在しない `npm run` が
// 7 件（character-frames・youtube-covers ほか）あっても誰にも掛からなかった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { findBrokenInSource, DOC_SCOPES, WORKFLOW_SCOPE } from '../scripts/check-command-guidance.mjs';

const pkgScripts = { build: 'x', 'refresh-indexes': 'x' };
const exists = (rel) => rel === 'scripts/real.mjs';
// 例示のパスを文字列連結で組む（このテスト自身が check-command-guidance の走査対象になったとき自分を落とさないため）
const NPM = 'npm ' + 'run ';
const NODE = 'node ' + 'scripts/';

test('実在しない npm run を 1 件入れると broken が 1 件（exit 1 の根拠）', () => {
  const src = `${NPM}build\n${NPM}nope-xyz`;
  const r = findBrokenInSource('doc.md', src, { pkgScripts, exists, checkPaths: false, kindNpm: 'npm-doc' });
  assert.equal(r.refNpm, 2);
  assert.deepEqual(r.broken, [{ file: 'doc.md', kind: 'npm-doc', ref: `${NPM}nope-xyz` }]);
});

test('同じ壊れは 1 ファイルにつき 1 回だけ数える', () => {
  const r = findBrokenInSource('a.mjs', `${NPM}nope\n${NPM}nope`, { pkgScripts, exists, checkPaths: true });
  assert.equal(r.broken.length, 1);
});

test('node パスは checkPaths=true のときだけ見る（doc は例示が混ざる）', () => {
  const src = `${NODE}real.mjs\n${NODE}gone.mjs`;
  const withPaths = findBrokenInSource('a.yml', src, { pkgScripts, exists, checkPaths: true, kindPath: 'path-workflow' });
  assert.deepEqual(withPaths.broken.map((b) => b.kind + ' ' + b.ref), [`path-workflow ${NODE}gone.mjs`]);
  assert.equal(withPaths.refPath, 2);
  const noPaths = findBrokenInSource('a.md', src, { pkgScripts, exists, checkPaths: false });
  assert.deepEqual(noPaths.broken, []);
});

test('プレースホルダ（<name>・X・{script}）は案内として数えない', () => {
  const src = `${NPM}<name>\n${NPM}X\n${NPM}{script}\n${NPM}の一覧\n${NPM}auth:ci-<service>\n${NPM}check-<name>`;
  const r = findBrokenInSource('skill.md', src, { pkgScripts, exists, checkPaths: false });
  assert.equal(r.refNpm, 0);
  assert.deepEqual(r.broken, []);
});

test('走査範囲に skills・knowledge・agents・docs・workflows が入っている（--json の scopes）', () => {
  assert.deepEqual(DOC_SCOPES, ['.claude/rules', '.claude/skills', '.claude/knowledge', '.claude/agents', 'docs']);
  assert.equal(WORKFLOW_SCOPE, '.github/workflows');
  const out = execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', 'check-command-guidance.mjs'), '--json'], {
    cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
  });
  const j = JSON.parse(out);
  assert.ok(j.docFiles >= 100, `正典・手順書の走査が ${j.docFiles} 本（100 未満＝範囲が狭まった）`);
  assert.ok(j.workflowFiles >= 10, `ワークフローの走査が ${j.workflowFiles} 本`);
  assert.equal(j.inconclusive, false);
  assert.deepEqual(j.broken, []);
});

test('git grep の出力は CRLF の行も読む（DN-0780: Windows の checkout で取り戻しの案内が 1 件に減り検査不成立になった）', async () => {
  const { parseGrepLines } = await import('../scripts/check-command-guidance.mjs');
  const lf = 'a.md:3:npm run drive-vault-sync -- --pull --commit\nb.md:7:text\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.deepEqual(parseGrepLines(crlf).map((m) => [m[1], m[2], m[3]]), parseGrepLines(lf).map((m) => [m[1], m[2], m[3]]));
  assert.equal(parseGrepLines(crlf).length, 2);
  assert.ok(!parseGrepLines(crlf)[0][3].endsWith('\r'));
});
