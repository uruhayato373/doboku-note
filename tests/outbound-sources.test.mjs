import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveSourceOf, liveXSources } from '../scripts/lib/outbound-sources.mjs';

const post = (phase, text, folder = '090-x', key = '1') => ({ phase, text, thread: [], folder, key, row: { legacyKey: `draft/${folder}#${key}` } });
const posts = [
  post('posted', 'old https://note.com/dobokunote/m/mdead1'),
  post('queued', 'live https://note.com/dobokunote/m/mlive2'),
  post('retired', 'gone https://note.com/dobokunote/m/mdead3'),
  post('planned', 'plan https://note.com/dobokunote/n/nlive4'),
];

test('X は台帳の未投稿の原稿だけを見る', () => {
  const out = liveXSources(posts).map((s) => s.text).join('\n');
  assert.match(out, /mlive2/);
  assert.match(out, /nlive4/);
  assert.doesNotMatch(out, /mdead1|mdead3/);
  assert.equal(liveXSources(posts)[0].rel, 'content/sns/x/draft/090-x/tweets.md');
});

test('X の tweets.md・計画は見ない（台帳の日程変更とずれるため）', () => {
  assert.equal(liveSourceOf('content/sns/x/draft/090/tweets.md', 'https://note.com/dobokunote/m/mx'), '');
  assert.equal(liveSourceOf('content/sns/x/campaigns/2026-09.json', 'https://note.com/dobokunote/m/mx'), '');
});

test('X 以外のファイルは丸ごと見る（黙って外さない）', () => {
  assert.equal(liveSourceOf('content/site/a/article.mdx', 'abc'), 'abc');
});

test('文面の無い行・スレッドの返信も落とさない', () => {
  const out = liveXSources([{ ...post('queued', null), thread: ['reply https://note.com/dobokunote/n/nth'] }])[0].text;
  assert.match(out, /nth/);
});
