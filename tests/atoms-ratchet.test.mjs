// 原子の層（ボタン・小見出しのラベル・パンくず・矢印）は共通の部品だけで描く（2026-11-17 アトミックデザインの棚卸し）。
//   Button / ButtonLink・Eyebrow（EYEBROW）・Breadcrumb・Arrow（src/components/ui/*）
// 商品の導線（note・アフィリエイト）の見た目は CTA の部品が持つので、理由つきの許可リストで外す。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const files = () => listFiles(`${REPO_ROOT}/src`, { ext: '.tsx' }).map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));
const classStrings = (src) => [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|'([^']*)')/g)].map((m) => ({ cls: m[1] ?? m[2] ?? m[3], index: m.index }));
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

const NOTE_CTA = '商品の導線（note。rel=NOTE_LINK_REL を持つ。DN-0976 で CTA の部品と一緒に整理する）';
const RULES = [
  {
    name: '主ボタン（accent の地＋paper の文字）は Button / ButtonLink',
    hit: (cls) => /\bbg-\(--accent\)/.test(cls) && /\btext-\(--paper\)/.test(cls) && !/hover:|group-hover:/.test(cls.match(/\S*bg-\(--accent\)\S*/)?.[0] ?? ''),
    allow: new Map([
      ['src/components/ui/Button/Button.tsx', '部品'],
      ['src/components/ui/AuthorProfile/AuthorProfile.tsx', NOTE_CTA],
      ['src/components/ui/AuthorCard/AuthorCard.tsx', NOTE_CTA],
      ['src/components/category/CategoryViews.tsx', 'キーワード索引へのタイル（LinkTile の icon）の四角（ボタンではない）'],
    ]),
  },
  {
    name: '小見出しのラベル（11px・太字・大文字・字間）は Eyebrow / EYEBROW',
    hit: (cls) => /text-\[11px\] font-bold uppercase tracking-wider/.test(cls),
    allow: new Map([['src/components/ui/Eyebrow/Eyebrow.tsx', '部品']]),
  },
];

for (const rule of RULES) {
  test(rule.name, () => {
    const all = files();
    const hits = all.filter((f) => !rule.allow.has(f.rel)).flatMap((f) => classStrings(f.src).filter((c) => rule.hit(c.cls)).map((c) => `${f.rel}:${lineOf(f.src, c.index)}`));
    console.log(`[atoms] ${rule.name}: 検査 ${all.length} ファイル・手書き ${hits.length}`);
    assert.ok(all.length > 100);
    assert.deepEqual(hits, [], hits.join('\n'));
  });
}

test('パンくずは Breadcrumb の 1 実装', () => {
  const hits = files().filter((f) => f.rel !== 'src/components/ui/Breadcrumb/Breadcrumb.tsx' && /aria-label="breadcrumb"/.test(f.src)).map((f) => f.rel);
  assert.deepEqual(hits, []);
});

test('矢印のアイコン（lucide の ArrowRight）は商品の導線と右端のアイコンだけ。行き先の矢印は Arrow', () => {
  const allow = new Set([
    'src/components/ui/AffiliateParts.tsx',
    'src/components/ui/CareerAffiliate/CareerAffiliateExperiment.tsx',
    'src/components/ui/NavLinkCard/NavLinkCard.tsx',
    'src/components/ui/PersonaSelector/PersonaSelector.tsx',
    'src/components/ui/Arrow/Arrow.tsx', // 部品の説明のコメント
  ]);
  const hits = files().filter((f) => !allow.has(f.rel) && /\bArrowRight\b/.test(f.src)).map((f) => f.rel);
  assert.deepEqual(hits, []);
});
