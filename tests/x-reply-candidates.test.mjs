import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  checkSendAllowed,
  classifyPost,
  cleanText,
  hashUser,
  parseRealtimeHtml,
  selectCandidates,
} from '../scripts/lib/x-reply-candidates.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../config/x-reply-trial.json', import.meta.url), 'utf8'));
const NOW = Date.parse('2026-11-08T03:00:00Z');
const post = (over) => ({ id: '1', user: 'a', text: '', createdAt: NOW - 3600_000, inReplyTo: '', ...over });

test('検索ページの投稿を取り出し、強調の印を消す', () => {
  const data = { props: { pageProps: { pageData: { timeline: { entry: [{
    id: '9', screenName: 'u', displayTextBody: '\tSTART\t技術士\tEND\t 合格', createdAt: 100, replyCount: 1, likesCount: 2,
  }] } } } } };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
  const [item] = parseRealtimeHtml(html);
  assert.equal(item.text, '技術士 合格');
  assert.equal(item.createdAt, 100_000);
  assert.equal(item.url, 'https://x.com/u/status/9');
});

test('構造が違うページは null を返し、空の成功にしない', () => {
  assert.equal(parseRealtimeHtml('<html></html>'), null);
  assert.equal(parseRealtimeHtml('<script id="__NEXT_DATA__">{}</script>'), null);
});

test('強調の印は単語の間に残らない', () => {
  assert.equal(cleanText('a\tSTART\tb\tEND\tc'), 'abc');
});

test('尋ねている投稿・合格・不合格を分ける', () => {
  assert.equal(classifyPost(post({ text: '口頭試験までに何をすれば' }), config), 'ask');
  assert.equal(classifyPost(post({ text: '筆記に合格しました' }), config), 'pass');
  assert.equal(classifyPost(post({ text: '技術士、不合格でした' }), config), 'fail');
});

test('配慮が要る投稿は、ほかの語より先に判定する', () => {
  assert.equal(classifyPost(post({ text: '不合格。どうすればいいのか。もう死にたい' }), config), 'care');
  assert.equal(classifyPost(post({ text: '不合格で失格でした。講座も考える' }), config), 'care');
});

test('講座側・返信・リポストは候補にしない', () => {
  assert.equal(classifyPost(post({ text: '合格しました', user: 'pafe_purin' }), config), 'supplier');
  assert.equal(classifyPost(post({ text: '添削の受付中。どうすれば合格できるか' }), config), 'supplier');
  assert.equal(classifyPost(post({ text: '合格しました', inReplyTo: '1' }), config), 'reply');
  assert.equal(classifyPost(post({ text: 'RT @x: 合格しました' }), config), 'reply');
});

test('1 アカウント 1 件で、尋ねている投稿を先に出す', () => {
  const posts = [
    post({ id: '1', user: 'a', text: '不合格でした' }),
    post({ id: '2', user: 'a', text: '不合格でした。どうすれば' }),
    post({ id: '3', user: 'b', text: '合格しました' }),
    post({ id: '3', user: 'b', text: '合格しました' }),
  ];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW });
  assert.deepEqual(candidates.map((c) => c.id), ['2', '3']);
  assert.equal(counts.total, 3);
});

test('古い投稿と返信済みの相手を除き、配慮の投稿は件数だけ残す', () => {
  const posts = [
    post({ id: '1', user: 'old', text: '合格しました', createdAt: NOW - 100 * 3600_000 }),
    post({ id: '2', user: 'done', text: '合格しました' }),
    post({ id: '3', user: 'c', text: 'もう死にたい' }),
  ];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW, repliedHashes: new Set([hashUser('done')]) });
  assert.equal(candidates.length, 0);
  assert.deepEqual([counts.old, counts.replied, counts.care], [1, 1, 1]);
});

test('上限で切る', () => {
  const posts = Array.from({ length: 20 }, (_, i) => post({ id: String(i), user: `u${i}`, text: '合格しました' }));
  assert.equal(selectCandidates(posts, config, { now: NOW }).candidates.length, config.limits.candidatesPerRun);
});

test('送信の門番: 期間・間隔・同じ相手を止める', () => {
  const base = { limits: config.limits, trial: config.trial };
  const at = (min) => new Date(NOW - min * 60_000).toISOString();
  const row = (min, user = 'x') => ({ at: at(min), userHash: hashUser(user) });
  assert.match(checkSendAllowed([], { ...base, user: 'a', now: Date.parse('2026-11-06T03:00:00Z') }), /試行期間/);
  assert.match(checkSendAllowed([], { ...base, user: 'a', now: Date.parse('2026-12-01T03:00:00Z') }), /試行期間/);
  assert.equal(checkSendAllowed([], { ...base, user: 'a', now: NOW }), null);
  assert.match(checkSendAllowed([row(10)], { ...base, user: 'a', now: NOW }), /分あけます/);
  assert.equal(checkSendAllowed([row(61), row(62), row(63), row(64)], { ...base, user: 'a', now: NOW }), null);
  assert.match(checkSendAllowed([row(90, 'a')], { ...base, user: 'A', now: NOW }), /すでに返信/);
  assert.equal(checkSendAllowed([row(90)], { ...base, user: 'a', now: NOW }), null);
});

test('見送った相手は候補に戻らず、送信も止まる', () => {
  const posts = [post({ id: '1', user: 'skip', text: '合格しました' }), post({ id: '2', user: 'ok', text: '合格しました' })];
  const { candidates, counts } = selectCandidates(posts, config, { now: NOW, skippedHashes: new Set([hashUser('SKIP')]) });
  assert.deepEqual(candidates.map((c) => c.user), ['ok']);
  assert.equal(counts.skipped, 1);
  const base = { limits: config.limits, trial: config.trial, now: NOW };
  assert.match(checkSendAllowed([], { ...base, user: 'skip', skips: [{ userHash: hashUser('skip') }] }), /見送り/);
});
