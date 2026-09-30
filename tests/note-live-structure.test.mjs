/**
 * note ライブ本文の構造検査（見出しの食い違い・太字記号の残り）の判定を固定する。
 *
 * 背景（2026-09-23）: 冒頭 CTA の部分更新が CTA 文を <h2> にし、直後の見出しを
 * 「R」の段落＋カード＋「8 で何が出るのか…」の段落に割った記事が 3 本あった。見出しに URL は
 * 入らないので既存の URL 見出し検査では拾えず、週次 CI は緑のままだった。
 * 同時に、太字が記号のまま表示される記事（`**「管理行為」**で`）もライブに 9 本あった。
 *
 * 公開中 906 本で実測した誤検出の型（記事タイトルの `#`、本文中の `#` 見出し）も固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { normalizeHeading, sotH2s, liveH2s, diffHeadings, findLiteralStars } from '../scripts/lib/note-live-check.mjs';

test('原稿の見出し: 本文先頭の # はタイトルなので数えず、本文中の # と ## は h2 として数える', () => {
  const md = [
    '# 記事タイトル',
    '',
    'リード文',
    '## はじめに',
    '### 小見出しは h3 なので数えない',
    '# 主：必出の3管理',
    '```',
    '## コード内は数えない',
    '```',
    '<!-- ## コメント内も数えない -->',
    '## 学習の優先順位',
  ].join('\n');
  assert.deepEqual(sotH2s(md), ['はじめに', '主:必出の3管理', '学習の優先順位']);
});

test('原稿の見出し: limitLine より後（有料境界の先）は数えない', () => {
  const md = ['## 無料の節', '本文', '## 試験問題', '## 有料の節'].join('\n');
  assert.deepEqual(sotH2s(md, 2), ['無料の節']);
});

test('本文先頭が見出しでなければ、最初の # も本文の見出しとして数える', () => {
  assert.deepEqual(sotH2s('リード文\n# 大見出し'), ['大見出し']);
});

test('正規化: 記法・タグ・空白・全半角の揺れを落として同じ見出しとみなす', () => {
  assert.equal(normalizeHeading('**R8** で何が出るのか — 予想の根拠'), normalizeHeading('<strong>R8</strong> で何が出るのか — 予想の根拠'));
  assert.equal(normalizeHeading('[記述式](https://example.com)の型'), '記述式の型');
  assert.equal(normalizeHeading('主：必出の3管理'), normalizeHeading('主: 必出の３管理'));
});

test('ライブの h2 を抜き出す（属性付き・中のタグは落とす）', () => {
  const html = '<h2 name="a" id="a">はじめに</h2><p>x</p><h3>小</h3><h2 id="b"><strong>40問</strong>の配分</h2>';
  assert.deepEqual(liveH2s(html), ['はじめに', '40問の配分']);
});

test('2026-09-23 の実例: CTA が見出しになり、直後の見出しが割れたら欠落と余分の両方が出る', () => {
  const sot = sotH2s(['## はじめに', '本文', '## 40問の配分は完全に固定されている'].join('\n'));
  const live = liveH2s([
    '<h2>記述式の型、5管理のトレードオフ…記述式コアパックから始められます。</h2>',
    '<p>https://note.com/dobokunote/m/m6e7de5e4ea3d</p>',
    '<p>は</p><figure embedded-service="external-article"></figure><p>じめに</p>',
    '<h2>40問の配分は完全に固定されている</h2>',
  ].join(''));
  const d = diffHeadings(sot, live);
  assert.deepEqual(d.missing, ['はじめに']);
  assert.equal(d.extra.length, 1);
  assert.match(d.extra[0], /記述式コアパック/);
});

test('一致していれば食い違いは空。同じ見出しの重複は回数で比べる', () => {
  assert.deepEqual(diffHeadings(['a', 'b'], ['a', 'b']), { missing: [], extra: [] });
  assert.deepEqual(diffHeadings(['まとめ', 'まとめ'], ['まとめ']), { missing: ['まとめ'], extra: [] });
});

test('太字記号: 本文テキストに残った ** を拾い、コード内と正しく太字になったものは拾わない', () => {
  assert.equal(findLiteralStars('<p>不十分で、**「管理行為」**で書きます。</p>').length, 1);
  assert.equal(findLiteralStars('<p><strong>「管理行為」</strong>で書きます。</p>').length, 0);
  assert.equal(findLiteralStars('<pre><code>a ** b</code></pre><p>x</p>').length, 0);
});

test('タグ・コメントの除去は 1 回で終わらせず、除去後に現れたものも落とす', async () => {
  const { stripTags, stripHtmlComments } = await import('../scripts/lib/note-live-check.mjs');
  assert.doesNotMatch(stripTags('<scr<b>ipt>見出し</b><<i>i>'), /<[a-z/!]/i);
  assert.equal(stripHtmlComments('a<!-<!-- x -->- y -->b'), 'ab');
});

test('割れ見出し: 1〜2 字の段落の直後のカードを拾い、普通の段落＋カードは拾わない（DN-0272）', async () => {
  const { findSplitBeforeCard } = await import('../scripts/lib/note-live-check.mjs');
  assert.deepEqual(findSplitBeforeCard('<p>R</p><figure embedded-service="external-article"></figure><p>8 で何が出るのか</p>'), ['R']);
  assert.deepEqual(findSplitBeforeCard('<p>は</p>\n<figure name="x" embedded-service="note"></figure>'), ['は']);
  assert.deepEqual(findSplitBeforeCard('<p>まずは無料の分析記事から読み進めてください。</p><figure embedded-service="note"></figure>'), []);
  assert.deepEqual(findSplitBeforeCard('<p>R</p><figure><img src="a.png"></figure>'), []);
});

test('長い見出し: 60 字超の h2/h3 を拾い、原稿の長い見出しの数と比べられる（DN-0272）', async () => {
  const { findLongHeadings, countSotLongHeadings } = await import('../scripts/lib/note-live-check.mjs');
  const long = 'あ'.repeat(61);
  assert.deepEqual(findLongHeadings(`<h2>${long}</h2><h3>${'い'.repeat(60)}</h3><h2>短い</h2>`), [long]);
  assert.equal(countSotLongHeadings(['# タイトル', `## ${long}`, `### ${long}`, '```', `## ${long}`, '```', `#### ${long}`].join('\n')), 2);
  assert.equal(countSotLongHeadings(`## ${long}`, 0), 0);
});
