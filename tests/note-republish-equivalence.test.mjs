// check-note-republish の「301 で等価な張り替えだけ」の判定（DN-0297）。
// 2026-09-24 に PR #598 の張り替えで要再公開が 674 本になり、本当に要る 404 修正の 1 本が埋もれた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodyHash, canonBodyHash, canonEntry, classifyBodyDrift } from '../scripts/lib/note-republish-hash.mjs';
import { findRecordedVersions, parseCatFileBatch } from '../scripts/lib/note-republish-history.mjs';
import { loadSiteRoutes } from '../scripts/lib/site-links.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'note-republish-eq-'));
const redirects = join(tmp, '_redirects');
writeFileSync(redirects, '/docs/concrete-chief-engineer-textbook-mix-design /exam/concrete-chief-engineer/textbook/mix-design 301\n');
const routes = loadSiteRoutes(redirects);
const fm = '---\ntitle: t\nnoteUrl: https://note.com/x/n/n1\n---\n';
const UTM = '?utm_source=note&utm_medium=referral';

test('bodyHash は台帳の既存値と同じ（normalizeBody へ分けても互換）', () => {
  const raw = '﻿---\r\ntitle: x\r\nnoteUrl: https://note.com/a\r\n---\r\n# 見出し  \r\n\r\n\r\n\r\n本文 [リンク](https://doboku-note.com/docs/abc?utm_source=note) 末尾   \r\n';
  assert.equal(bodyHash(raw), '4b5e0e9635bd44ee');
});

test('旧 /docs → 転送先の張り替えだけなら canon が一致する（UTM は保持）', () => {
  const live = `${fm}[配合](https://doboku-note.com/docs/concrete-chief-engineer-textbook-mix-design${UTM})\n`;
  const src = `${fm}[配合](https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design${UTM})\n`;
  assert.notEqual(bodyHash(live), bodyHash(src));
  assert.equal(canonBodyHash(live, routes), canonBodyHash(src, routes));
});

test('404 の打ち間違いを直した差分は等価にしない', () => {
  const live = `${fm}[配合](https://doboku-note.com/exam/concrete-chief-engineer/textbook-mix-design${UTM})\n`;
  const src = `${fm}[配合](https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design${UTM})\n`;
  assert.notEqual(canonBodyHash(live, routes), canonBodyHash(src, routes));
});

test('張り替えと同時に本文も変えた差分は等価にしない', () => {
  const live = `${fm}経験記述は**「受かる水準」**です [配合](https://doboku-note.com/docs/concrete-chief-engineer-textbook-mix-design)\n`;
  const src = `${fm}経験記述は **「受かる水準」** です [配合](https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design)\n`;
  assert.notEqual(canonBodyHash(live, routes), canonBodyHash(src, routes));
});

test('classifyBodyDrift: 記録時の canon が無ければ判定不能（呼び出し側は要再公開に残す）', () => {
  assert.equal(classifyBodyDrift({ rec: 'a', cur: 'a', recCanon: null, curCanon: 'x' }), 'synced');
  assert.equal(classifyBodyDrift({ rec: 'a', cur: 'b', recCanon: 'x', curCanon: 'x' }), 'equivalent');
  assert.equal(classifyBodyDrift({ rec: 'a', cur: 'b', recCanon: 'x', curCanon: 'y' }), 'drift');
  assert.equal(classifyBodyDrift({ rec: 'a', cur: 'b', recCanon: null, curCanon: 'y' }), 'unjudged');
});

test('canonEntry は _redirects を読めないとき記録しない（張り替えの対応が分からない canon を残さない）', () => {
  assert.equal(canonEntry(`${fm}本文\n`, loadSiteRoutes(join(tmp, 'missing'))), null);
  const e = canonEntry(`${fm}本文\n`, routes);
  assert.equal(e.of, bodyHash(`${fm}本文\n`));
});

test('parseCatFileBatch はバイト数で切り出す（日本語でずれない）・missing は null', () => {
  const a = Buffer.from('配合計算\n', 'utf8');
  const b = Buffer.from('b', 'utf8');
  const buf = Buffer.concat([
    Buffer.from(`${'1'.repeat(40)} blob ${a.length}\n`), a, Buffer.from('\n'),
    Buffer.from('deadbeef:content/note/x.md missing\n'),
    Buffer.from(`${'2'.repeat(40)} blob ${b.length}\n`), b, Buffer.from('\n'),
  ]);
  assert.deepEqual(parseCatFileBatch(buf, 3), ['配合計算\n', null, 'b']);
});

test('findRecordedVersions は台帳 hash に一致する過去の版を返し、無ければ返さない', () => {
  const repo = join(tmp, 'repo');
  const file = 'content/note/配合 計算/article.md'; // 日本語と空白を含むパス
  mkdirSync(join(repo, 'content/note/配合 計算'), { recursive: true });
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'core.autocrlf=false', ...a], { cwd: repo, encoding: 'utf8' });
  git('init', '-q');
  const v1 = `${fm}[配合](https://doboku-note.com/docs/concrete-chief-engineer-textbook-mix-design)\n`;
  const v2 = `${fm}[配合](https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design)\n`;
  writeFileSync(join(repo, file), v1); git('add', '-A'); git('commit', '-qm', 'v1');
  writeFileSync(join(repo, file), v2); git('add', '-A'); git('commit', '-qm', 'v2');

  const r = findRecordedVersions([{ file, rec: bodyHash(v1) }, { file: 'content/note/none/article.md', rec: 'x' }], { cwd: repo });
  assert.equal(r.available, true);
  assert.equal(bodyHash(r.found.get(file)), bodyHash(v1));
  assert.equal(r.found.has('content/note/none/article.md'), false);
  assert.equal(canonBodyHash(r.found.get(file), routes), canonBodyHash(v2, routes));
});

test.after(() => rmSync(tmp, { recursive: true, force: true }));
