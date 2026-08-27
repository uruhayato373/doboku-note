// check-production-ssr の判定のテスト。
//
// 守りたい踏み間違い（2026-08-27）: deploy 後の検証を `curl --noproxy '*'` で行い、
// 会社 PC のプロキシを自分で外していたため HTTP 000 / <main 0 件 が返った。
// これを「デプロイ失敗・SSR 破壊」と報告しかけた。
// **接続できていないことは、サイトが壊れている証拠ではない** を判定として固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, DEFAULT_URLS, KEYWORDS } from '../scripts/check-production-ssr.mjs';

const OK_BODY = '<html><body><main class="flex-grow"><h1>1級土木施工管理技士</h1><p>技術士</p></main></body></html>';

test('200 + <main + キーワード は ok', () => {
  const r = classify({ url: 'https://x', code: '200', body: OK_BODY });
  assert.equal(r.level, 'ok');
  assert.ok(r.mains >= 1);
  assert.ok(r.keywords >= 2);
});

test('回帰: HTTP 000 は fail ではなく unreachable（検査不成立）', () => {
  const r = classify({ url: 'https://x', code: '000', body: '' });
  assert.equal(r.level, 'unreachable');
  assert.match(r.reason, /接続できていない/);
});

test('code が空でも unreachable として扱う', () => {
  assert.equal(classify({ url: 'https://x', code: '', body: '' }).level, 'unreachable');
});

test('500 は fail（unreachable と混ぜない）', () => {
  const r = classify({ url: 'https://x', code: '500', body: '' });
  assert.equal(r.level, 'fail');
  assert.match(r.reason, /HTTP 500/);
});

test('200 でも <main が無ければ SSR 破壊として fail', () => {
  const r = classify({ url: 'https://x', code: '200', body: '<html><body>土木 技術士</body></html>' });
  assert.equal(r.level, 'fail');
  assert.match(r.reason, /SSR 破壊/);
});

test('class 付きの <main class="..."> を数えられる（完全一致 grep の偽赤を避ける）', () => {
  const r = classify({ url: 'https://x', code: '200', body: OK_BODY });
  assert.equal(r.mains, 1);
});

test('<mainfoo> のような別タグは数えない', () => {
  const r = classify({ url: 'https://x', code: '200', body: '<mainframe>土木 技術士</mainframe>' });
  assert.equal(r.mains, 0);
  assert.equal(r.level, 'fail');
});

test('200 + <main でもキーワード 0 なら fail（中身が空）', () => {
  const r = classify({ url: 'https://x', code: '200', body: '<main class="a"></main>' });
  assert.equal(r.level, 'fail');
  assert.match(r.reason, /キーワード/);
});

test('既定の検証先が 2 つあり、本番ドメインを含む', () => {
  assert.equal(DEFAULT_URLS.length, 2);
  assert.ok(DEFAULT_URLS.some((u) => u.includes('doboku-note.com')));
  assert.ok(DEFAULT_URLS.some((u) => u.includes('pages.dev')));
  assert.deepEqual(KEYWORDS, ['土木', '技術士']);
});
