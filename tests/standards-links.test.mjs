import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStandardsLinks,
  resolveStandardsHref,
  repositorySource,
  auditStandardsLinks,
} from '../scripts/check-standards-links.mjs';

/**
 * 共通仕様書へのリンク検査の契約（DN-0879）。
 * 過去問の解説から正誤の根拠になる条へ結ぶリンクは、毎年の改定で章・節・条が変わると黙って切れる。
 * 切れを止める側と、実在するリンクを誤って止めない側を同じ強さで固定する。
 */

const CHAPTER_MD = ['## 第1節 適用', '', '### 9-1-1-1 一般事項', '', '本文', '', '## 第4節 ダムコンクリート工', '', '### 9-1-4-9 コンクリートの打込み', ''].join('\n');
const SPLIT_MD = ['## 第1節 適用', '', '### 3-2-1-1 適用工種', '', '## 第6節 一般舗装工', '', '### 3-2-6-12 コンクリート舗装工', '', '#### 12. コンクリート舗装のコンクリート養生の規定', ''].join('\n');

const fake = {
  hasAgency: (a) => a === 'kanto',
  hasDocument: (a, d) => a === 'kanto' && d === 'common',
  manifest: () => ({
    chapters: [
      { chapterId: '9-1', file: 'chapters/9-1.md', splitBySection: false, sections: [{ number: 1 }, { number: 4 }] },
      { chapterId: '3-2', file: 'chapters/3-2.md', splitBySection: true, sections: [{ number: 1 }, { number: 6 }] },
    ],
  }),
  chapterMarkdown: (_a, _d, chapter) => (chapter.chapterId === '3-2' ? SPLIT_MD : CHAPTER_MD),
};
const ok = (href) => assert.deepEqual(resolveStandardsHref(href, fake), { ok: true }, href);
const ng = (href, pattern) => {
  const r = resolveStandardsHref(href, fake);
  assert.equal(r.ok, false, href);
  assert.match(r.reason, pattern);
};

test('実在する章・節・条のリンクは通す（日本語のアンカー・URL エンコード・絶対 URL）', () => {
  ok('/standards/kanto/common/chapters/9-1');
  ok('/standards/kanto/common/chapters/9-1#9-1-4-9-コンクリートの打込み');
  ok(`/standards/kanto/common/chapters/9-1#${encodeURIComponent('9-1-4-9-コンクリートの打込み')}`);
  ok('https://doboku-note.com/standards/kanto/common/chapters/3-2/sections/6#3-2-6-12-コンクリート舗装工');
  ok('/standards/kanto/common/chapters/3-2/sections/6#12-コンクリート舗装のコンクリート養生の規定');
  ok('/standards/kanto/common/chapters/3-2');
  ok('/standards');
  ok('/standards/kanto');
  ok('/standards/kanto/common');
});

test('改定で消えた章・節・条、形の違う URL を止める', () => {
  ng('/standards/kanto/common/chapters/9-9', /章 9-9/);
  ng('/standards/kanto/common/chapters/9-1#9-1-4-10-締固め', /見出しの ID/);
  ng('/standards/kanto/common/chapters/3-2/sections/7', /第7節/);
  ng('/standards/kanto/common/chapters/9-1/sections/4', /節ページに分けていない/);
  ng('/standards/kanto/common/chapters/3-2#3-2-6-12-コンクリート舗装工', /節の一覧だけ/);
  ng('/standards/tohoku/common/chapters/1-1', /catalog に無い/);
  ng('/standards/mlit', /機関 mlit/);
  ng('/standards/kanto/common/part-01', /URL の形/);
});

test('節ページの条の ID は、章全体ではなく節の中の見出しから作る', () => {
  // 第1節の条は第6節のページには無い
  ng('/standards/kanto/common/chapters/3-2/sections/6#3-2-1-1-適用工種', /見出しの ID/);
});

test('Markdown リンクと JSX の href を抜き、コードブロックの中は抜かない', () => {
  const links = extractStandardsLinks([
    '[a](/standards/kanto/common/chapters/1-3#1-3-6-9-養生) と [b](https://doboku-note.com/standards/kinki/common)',
    '<a href="/standards/compare">c</a>',
    '```',
    '[x](/standards/kanto/common/chapters/99-9)',
    '```',
    '[d](/standardsfoo) [e](/docs/standards)',
  ].join('\n'));
  assert.deepEqual(links.map((l) => [l.href, l.line]), [
    ['/standards/kanto/common/chapters/1-3#1-3-6-9-養生', 1],
    ['https://doboku-note.com/standards/kinki/common', 1],
    ['/standards/compare', 2],
  ]);
});

test('リポジトリの実データ: 過去問の解説が結ぶ条は実在し、条の題名が変われば止まる', () => {
  const source = repositorySource();
  const real = [
    '/standards/kanto/common/chapters/3-2/sections/6#3-2-6-12-コンクリート舗装工',
    '/standards/kanto/common/chapters/9-1#9-1-4-9-コンクリートの打込み',
  ];
  for (const href of real) assert.deepEqual(resolveStandardsHref(href, source), { ok: true }, href);
  assert.equal(resolveStandardsHref('/standards/kanto/common/chapters/9-1#9-1-4-9-コンクリートの打設', source).ok, false);
});

test('全 MDX の走査は 1 本以上のリンクを検査し、切れは 0 本（検査ゼロを PASS にしない）', () => {
  const r = auditStandardsLinks();
  assert.ok(r.links > 0 && r.checked === r.links, `links=${r.links} checked=${r.checked}`);
  assert.deepEqual(r.broken, []);
});
