import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { paginateRealtime, parseRealtimeApi, parseXPosts, topicOf } from '../scripts/lib/x-reply-candidates.mjs';
import { buildExtractorJs, xScreens } from '../scripts/lib/x-reply-screens.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../config/x-reply-trial.json', import.meta.url), 'utf8'));
const HOUR = 3600_000;
const NOW = Date.parse('2026-11-10T12:00:00Z');
// id が大きいほど新しい（X の投稿 ID と同じ）
const p = (id, hoursAgo) => ({ id: String(id), user: 'u', text: '技術士', createdAt: NOW - hoursAgo * HOUR });

test('Yahoo の続きを since まで古い方へたどり、重複を捨てる', async () => {
  const pages = { 100: [p(99, 3), p(98, 4)], 98: [p(98, 4), p(97, 200)] };
  const asked = [];
  const r = await paginateRealtime({
    fetchFirst: async () => [p(101, 1), p(100, 2)],
    fetchNext: async (id) => { asked.push(id); return pages[id] ?? []; },
    since: NOW - 120 * HOUR,
    maxPages: 10,
  });
  assert.deepEqual(asked, ['100', '98']);
  assert.deepEqual(r.posts.map((x) => x.id), ['101', '100', '99', '98', '97']);
  assert.equal(r.stop, 'since');
  assert.equal(r.pages, 2);
});

test('続きの上限・続きなし・取得失敗を区別して返す（黙って読み切りと言わない）', async () => {
  const base = { fetchFirst: async () => [p(10, 1)], since: NOW - 120 * HOUR };
  const capped = await paginateRealtime({ ...base, fetchNext: async (id) => [p(Number(id) - 1, 1)], maxPages: 3 });
  assert.equal(capped.stop, 'maxPages');
  assert.equal(capped.pages, 3);
  assert.equal((await paginateRealtime({ ...base, fetchNext: async () => [], maxPages: 3 })).stop, 'end');
  assert.equal((await paginateRealtime({ ...base, fetchNext: async () => { throw new Error('x'); }, maxPages: 3 })).stop, 'error');
  await assert.rejects(paginateRealtime({ ...base, fetchFirst: async () => null, fetchNext: async () => [], maxPages: 3 }));
});

test('続きの応答から投稿を取り出し、形が違えば null を返す', () => {
  const [item] = parseRealtimeApi({ timeline: { entry: [{ id: 5, screenName: 'u', name: '技術士めざす人', displayText: '筆記通った', createdAt: 100 }] } });
  assert.equal(item.name, '技術士めざす人');
  assert.equal(item.createdAt, 100_000);
  assert.equal(parseRealtimeApi({}), null);
});

test('本文に資格の語が無くても、表示名に資格の語があり本文が試験の話なら振り分ける', () => {
  const words = config.nameContextWords;
  assert.equal(topicOf({ text: '筆記通った！', name: 'たろう@技術士目指す' }, config.topics, words)?.id, 'pe');
  // 表示名だけでは振り分けない（雑談は拾わない）
  assert.equal(topicOf({ text: 'ラーメン食べた', name: 'たろう@技術士目指す' }, config.topics, words), null);
  // 本文の語が先（表示名が技術士でも本文がコンクリート技士ならそちら）
  assert.equal(topicOf({ text: 'コンクリート技士の勉強', name: '技術士' }, config.topics, words)?.id, 'concrete');
});

test('X の画面の取り出し結果は表示名も運ぶ', () => {
  const { posts } = parseXPosts([{ id: '1', user: 'a', name: '技術士の卵', text: '口頭の練習', createdAt: NOW }]);
  assert.equal(posts[0].name, '技術士の卵');
});

test('読む画面: ホームのタブと、話題ごとの X の検索（最新）', () => {
  const screens = xScreens(config);
  assert.ok(screens.some((s) => s.tab === 'フォロー中'));
  assert.ok(screens.some((s) => s.tab === 'おすすめ'));
  const pe = screens.find((s) => s.id === 'search-pe');
  assert.match(decodeURIComponent(pe.url), /q=技術士 lang:ja -filter:retweets&f=live$/);
  assert.equal(new Set(screens.map((s) => s.id)).size, screens.length);
});

test('画面で実行するスクリプトは構文が通り、タブ・語・期間を埋め込む', () => {
  for (const screen of xScreens(config)) {
    const js = buildExtractorJs(screen, config);
    assert.doesNotThrow(() => new Function(`return ${js}`), screen.id);
    assert.ok(js.includes('技術士'));
    assert.ok(js.includes(String(config.limits.lookbackHours * HOUR)));
    if (screen.tab) assert.ok(js.includes(JSON.stringify(screen.tab)));
  }
});
