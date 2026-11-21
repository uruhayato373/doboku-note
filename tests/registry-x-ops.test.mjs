/**
 * X の状態の正本を台帳へ移す部品（DN-0612 P7）を固定する。
 * - tweets.md のブロックの本文は publish-x が投稿する本文と同じ作り方（見出し・コメント・末尾の --- を落とす）
 * - 台帳の copy（tweets.md#tweet/N）から本文を引ける
 * - 取り込みは台帳に無い投稿の行だけを足す（既にある行を作り直さない）
 * - 照合は本文の先頭 40 字と投稿時刻 ±10 分の両方で 1 件だけ結べた行だけ
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTweetBlocks } from '../scripts/lib/x-tweets-md.mjs';
import { resolveCopy } from '../scripts/lib/content-registry.mjs';
import { xPhase } from '../scripts/lib/registry-x-store.mjs';
import { reconcileXPosts, xFolderRows, xFolderRef, xRetirePlan } from '../scripts/lib/registry-x-ops.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistryConfig } from '../scripts/lib/content-registry.mjs';

const MD = [
  '# 題',
  '',
  '<!-- x-stock: x-c1-restart-2027 -->',
  '',
  '## Tweet 01: 11/02 12:20 civil-1 / 型 / linkless',
  '',
  '<!-- 画像: img/tweet-01-a.png -->',
  '',
  '本文 1 行目',
  '本文 2 行目',
  '',
  '---',
  '',
  '## Tweet 02: [thread] 型',
  '',
  'ヘッド',
  '--- リプライ ---',
  'リプライ 1',
  '',
].join('\n');

test('parseTweetBlocks: 見出し・コメント・末尾の --- を落とし、題と印は捨てる', () => {
  const b = parseTweetBlocks(MD);
  assert.deepEqual(b.map((x) => x.key), ['1', '2']);
  assert.equal(b[0].text, '本文 1 行目\n本文 2 行目');
  assert.equal(b[0].title, '11/02 12:20 civil-1 / 型 / linkless');
  assert.deepEqual(b[0].threadParts, []);
  assert.equal(b[1].text, 'ヘッド');
  assert.deepEqual(b[1].threadParts, ['リプライ 1']);
});

test('parseTweetBlocks: CRLF でも見出し行が本文に残らない', () => {
  const b = parseTweetBlocks('## Tweet 03: 見出し\r\n\r\n本文\r\n');
  assert.equal(b[0].key, '3');
  assert.equal(b[0].text, '本文');
});

function tmpRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'x-ops-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), body);
  }
  return root;
}

test('resolveCopy: tweets.md#tweet/N から本文を引き、無い番号は null', () => {
  const root = tmpRepo({ 'content/sns/x/draft/201-civil1-foo/tweets.md': MD });
  try {
    assert.deepEqual(resolveCopy(root, 'content/sns/x/draft/201-civil1-foo/tweets.md#tweet/1'), { text: '本文 1 行目\n本文 2 行目' });
    assert.deepEqual(resolveCopy(root, 'content/sns/x/draft/201-civil1-foo/tweets.md#tweet/2'), { text: 'ヘッド', thread: ['リプライ 1'] });
    assert.equal(resolveCopy(root, 'content/sns/x/draft/201-civil1-foo/tweets.md#tweet/9'), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('xFolderRef: フォルダ名・draft/名前・フルパスを同じ形にそろえる', () => {
  for (const v of ['201-civil1-foo', 'draft/201-civil1-foo', 'content/sns/x/draft/201-civil1-foo/']) {
    assert.deepEqual(xFolderRef(v), { name: '201-civil1-foo', rel: 'draft/201-civil1-foo', dir: 'content/sns/x/draft/201-civil1-foo' });
  }
});

test('xFolderRows: 台帳に無い投稿の行だけを draft で足す', () => {
  const root = tmpRepo({ 'content/sns/x/draft/201-civil1-foo/tweets.md': MD });
  const rules = loadRegistryConfig(REPO_ROOT).idRules;
  try {
    const empty = xFolderRows(root, '201-civil1-foo', { reg: { works: [], publications: [] }, rules, slot: 'x-c1-restart-2027' });
    assert.equal(empty.exam, 'civil-construction-1');
    assert.equal(empty.work.id, 'civil1-foo');
    assert.deepEqual(empty.publications.map((p) => [p.variant, p.status, p.copy, p.planSlot]), [
      ['t01', 'draft', 'content/sns/x/draft/201-civil1-foo/tweets.md#tweet/1', 'x-c1-restart-2027'],
      ['t02', 'draft', 'content/sns/x/draft/201-civil1-foo/tweets.md#tweet/2', 'x-c1-restart-2027'],
    ]);
    const reg = {
      works: [{ id: 'civil1-foo', exam: 'civil-construction-1', definition: 'content/sns/x/draft/201-civil1-foo' }],
      publications: [{ ...empty.publications[0], channel: 'x', status: 'scheduled' }],
    };
    const again = xFolderRows(root, '201-civil1-foo', { reg, rules });
    assert.equal(again.work, null);
    assert.equal(again.skipped, 1);
    assert.deepEqual(again.publications.map((p) => p.variant), ['t02']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('xFolderRows: 資格が決まらないフォルダは --exam が無ければ止まる', () => {
  const root = tmpRepo({ 'content/sns/x/draft/202-merit/tweets.md': MD });
  const rules = loadRegistryConfig(REPO_ROOT).idRules;
  try {
    assert.throws(() => xFolderRows(root, '202-merit', { reg: { works: [], publications: [] }, rules }), /--exam/);
    assert.equal(xFolderRows(root, '202-merit', { reg: { works: [], publications: [] }, rules, exam: 'pe-construction' }).exam, 'pe-construction');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('xPhase: 台帳の状態を運用の段階に写す（予約キューで確かめたかを分ける）', () => {
  assert.equal(xPhase({ status: 'draft' }), 'draft');
  assert.equal(xPhase({ status: 'approved' }), 'planned');
  assert.equal(xPhase({ status: 'scheduled' }), 'submitted');
  assert.equal(xPhase({ status: 'scheduled', times: { queueVerified: '2026-11-21T00:00:00.000Z' } }), 'queued');
  assert.equal(xPhase({ status: 'published' }), 'posted');
  assert.equal(xPhase({ status: 'stopped' }), 'retired');
});

test('reconcileXPosts: 本文の先頭 40 字と投稿時刻 ±10 分の両方で 1 件だけ結ぶ', () => {
  const now = new Date('2026-11-21T00:00:00Z');
  const text = 'コンクリートの側圧は、スランプが大きく打上がり速度が速いほど大きくなる。温度は低いほど大きい方向。\n\nhttps://doboku-note.com/x #1級土木施工管理技士';
  const post = (over) => ({ id: 'p', exam: 'civil-construction-1', status: 'scheduled', publishAt: '2026-11-20T07:40:00.000+09:00', text, platform: null, row: {}, ...over });
  const own = { ref: 'own', posts: [
    { id: '100', text: 'コンクリートの側圧は、スランプが大きく打上がり速度が速いほど大きくなる。温度は低いほど大きい方向。 https://t.co/x #1級土木施工管理技士', postedAtJst: '2026-11-20T07:41:00.000+09:00' },
    { id: '101', text: 'まったく別の本文', postedAtJst: '2026-11-20T07:40:00.000+09:00' },
  ] };
  const r = reconcileXPosts([
    post({ id: 'hit' }),
    post({ id: 'late', publishAt: '2026-11-20T09:00:00.000+09:00' }), // 時刻が外れる
    post({ id: 'future', publishAt: '2026-11-22T07:40:00.000+09:00' }), // まだ日時が来ていない
    post({ id: 'draft', status: 'draft' }), // 対象外
  ], own, now);
  assert.equal(r.target, 2);
  assert.deepEqual(r.matched.map((m) => [m.post.id, m.own.id]), [['hit', '100']]);
  assert.deepEqual(r.unmatched.map((p) => p.id), ['late']);
});

test('reconcileXPosts: 既に台帳で使った投稿 ID は二重に結ばない', () => {
  const now = new Date('2026-11-21T00:00:00Z');
  const text = '同じ本文の投稿がふたつある場合の照合の確認用の文面です。ここまでで四十字を超えるように書く。';
  const own = { ref: 'own', posts: [{ id: '200', text, postedAtJst: '2026-11-20T07:40:00.000+09:00' }] };
  const r = reconcileXPosts([
    { id: 'a', status: 'published', platform: { id: '200' }, text, publishAt: '2026-11-20T07:40:00.000+09:00' },
    { id: 'b', status: 'scheduled', text, publishAt: '2026-11-20T07:40:00.000+09:00' },
  ], own, now);
  assert.equal(r.matched.length, 0);
});

test('xRetirePlan: 下書きフォルダの無い作品は、止めた行・下書きを消し、投稿済みは文面の場所を外して残す', () => {
  const now = new Date('2026-11-21T00:00:00Z');
  const w = (id, definition) => ({ id, kind: 'x-thread', definition, exam: 'civil-construction-1' });
  const p = (work, n, over) => ({ id: `civil-construction-1/${work}/x.post.t0${n}`, work, exam: 'civil-construction-1', channel: 'x', file: 'f.json', copy: `content/sns/x/draft/${work}/tweets.md#tweet/${n}`, ...over });
  const reg = {
    works: [w('gone-mixed', 'content/sns/x/draft/gone-mixed'), w('gone-empty', 'content/sns/x/draft/gone-empty'), w('alive', 'content/sns/x/draft/alive'), w('gone-done', 'content/sns/x/draft/gone-done'),
      { id: 'pack', kind: 'video-pack', definition: 'content/sns/video-packs/none', exam: 'civil-construction-1' }],
    publications: [
      p('gone-mixed', 1, { status: 'published', platform: { id: '1' } }),
      p('gone-mixed', 2, { status: 'stopped', stopReason: 'gone' }),
      p('gone-mixed', 3, { status: 'draft' }),
      p('gone-mixed', 4, { status: 'approved', publishAt: '2026-10-01T07:00:00+09:00' }),
      p('gone-empty', 1, { status: 'stopped', stopReason: 'unverified-legacy' }),
      p('alive', 1, { status: 'draft' }),
      { ...p('gone-done', 1, { status: 'published', platform: { id: '2' } }), copy: undefined },
    ],
  };
  const r = xRetirePlan(reg, (d) => d.endsWith('/alive'), now);
  assert.equal(r.works, 2); // 生きているフォルダ・片付け済み・X 以外の作品は数えない
  assert.deepEqual(r.removePublications.map((x) => x.id.split('.').pop()), ['t02', 't03', 't04', 't01']);
  assert.deepEqual(r.strip.map((x) => [x.row.id, 'copy' in x.row, 'exam' in x.row]), [['civil-construction-1/gone-mixed/x.post.t01', false, false]]);
  assert.deepEqual(r.removeWorks, [{ exam: 'civil-construction-1', id: 'gone-empty' }]);
  assert.deepEqual(r.blockers, []);
});

test('xRetirePlan: 予約に入れた行と、これからの承認済みは片付けない', () => {
  const now = new Date('2026-11-21T00:00:00Z');
  const reg = {
    works: [{ id: 'gone', kind: 'x-thread', definition: 'content/sns/x/draft/gone', exam: 'account' }],
    publications: [
      { id: 'account/gone/x.post.t01', work: 'gone', exam: 'account', channel: 'x', status: 'scheduled', publishAt: '2026-10-26T19:20:00+09:00' },
      { id: 'account/gone/x.post.t02', work: 'gone', exam: 'account', channel: 'x', status: 'approved', publishAt: '2026-11-28T07:40:00+09:00' },
      { id: 'account/gone/x.post.t03', work: 'gone', exam: 'account', channel: 'x', status: 'stopped', stopReason: 'gone' },
    ],
  };
  const r = xRetirePlan(reg, () => false, now);
  assert.equal(r.blockers.length, 2);
  assert.deepEqual(r.removeWorks, []);
});
