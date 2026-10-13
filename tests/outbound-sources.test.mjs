import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveSourceOf } from '../scripts/lib/outbound-sources.mjs';

const status = JSON.stringify({ tweets: {
  1: { status: 'posted', text: 'old https://note.com/dobokunote/m/mdead1' },
  2: { status: 'queued', text: 'live https://note.com/dobokunote/m/mlive2' },
  3: { status: 'replaced', text: 'gone https://note.com/dobokunote/m/mdead3' },
  4: { status: 'scheduled', text: 'plan https://note.com/dobokunote/n/nlive4' },
} });

test('X の status.json は未投稿の原稿だけを見る', () => {
  const out = liveSourceOf('content/sns/x/draft/090/status.json', status);
  assert.match(out, /mlive2/);
  assert.match(out, /nlive4/);
  assert.doesNotMatch(out, /mdead1|mdead3/);
});

test('X の tweets.md と計画は見ない（台帳の日程変更とずれるため）', () => {
  assert.equal(liveSourceOf('content/sns/x/draft/090/tweets.md', 'https://note.com/dobokunote/m/mx'), '');
  assert.equal(liveSourceOf('content/sns/x/campaigns/2026-09.json', 'https://note.com/dobokunote/m/mx'), '');
});

test('X 以外のファイルと、壊れた台帳は丸ごと見る（黙って外さない）', () => {
  assert.equal(liveSourceOf('content/site/a/article.mdx', 'abc'), 'abc');
  assert.equal(liveSourceOf('content/sns/x/draft/090/status.json', '{broken'), '{broken');
});
