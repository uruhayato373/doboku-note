#!/usr/bin/env node
/**
 * gen-pdf-specs-civil-keiken.mjs
 * ---------------------------------------------------------------------------
 * 1級・2級土木 施工経験記述系の note 有料マガジンについて、magazine-to-pdf.mjs 用の
 * spec(JSON) を記事の実構造から生成する。
 *
 * 背景（2026-07-31）: 建設部門は 200 本すべてが「印刷用PDF付き」で運用されているのに、
 * 土木の経験記述 178 本は PDF が一切なかった。ココナラの PDF 商品に対応する 18 本だけ
 * spec が手書きされていた状態。note へ一本化する方針（C-2）に伴い、残りの spec を
 * 手書きせず構造から起こす。
 *
 * 抽出範囲の決め方（記事を実読して決定・CTA は必ず除く）:
 *   start = `## 〔...概要...〕` があればそこ、無ければ frontmatter の paidBoundary H2
 *   end   = `<!-- cta:civil-membership-lab -->` があればそこ、無ければ `## 出典`、無ければ EOF
 *   除外  = `<!-- cta:civil-mokuji -->` ブロック（マーカー〜次の H2 直前）
 *
 * 使い方:
 *   node scripts/gen-pdf-specs-civil-keiken.mjs            # dry-run（生成内容を表示）
 *   node scripts/gen-pdf-specs-civil-keiken.mjs --apply    # scripts/pdf-specs/ へ書き出し
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const OUT_DIR = 'scripts/pdf-specs';

const MAGAZINES = [
  { dir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック', spec: '1級土木-経験記述-完全攻略パック', prefix: '1級土木-経験記述' },
  { dir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク', spec: '2級土木-想定工事バンク', prefix: '2級土木-想定工事' },
  { dir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全', spec: '1級土木-施工経験記述-2テーマ組合せ大全', prefix: '1級土木-2テーマ組合せ' },
  { dir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-テーマ別出る順', spec: '1級土木-二次学科記述-テーマ別出る順', prefix: '1級土木-学科記述' },
  { dir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-テーマ別出る順', spec: '2級土木-二次学科記述-テーマ別出る順', prefix: '2級土木-学科記述' },
];

const fmv = (r, k) => { const m = r.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let totalArticles = 0;
const summary = [];

for (const mag of MAGAZINES) {
  if (!existsSync(mag.dir)) { console.log('SKIP (dir なし):', mag.dir); continue; }
  const subs = readdirSync(mag.dir).filter((e) => statSync(join(mag.dir, e)).isDirectory()).sort();
  const articles = [];
  const skipped = [];

  for (const sub of subs) {
    const f = join(mag.dir, sub, 'article.md').split('\\').join('/');
    if (!existsSync(f)) continue;
    const raw = readFileSync(f, 'utf8');
    if (fmv(raw, 'notePricing') !== 'paid') { skipped.push(sub + '（無料）'); continue; }
    const lines = raw.split(/\r?\n/);

    const gaiyou = lines.find((l) => /^## 〔.*概要/.test(l));
    const pb = fmv(raw, 'paidBoundary');
    const boundary = pb ? lines.find((l) => new RegExp('^## ' + esc(pb)).test(l)) : null;
    const start = gaiyou || boundary;
    if (!start) { skipped.push(sub + '（開始H2を特定できず）'); continue; }

    const hasMemb = lines.some((l) => l.trim() === '<!-- cta:civil-membership-lab -->');
    const shutten = lines.find((l) => /^## 出典/.test(l));
    const end = hasMemb ? '^<!-- cta:civil-membership-lab' : shutten ? '^## 出典' : null;

    const a = {
      src: `${sub}/article.md`,
      out: `${mag.prefix}-${sub}`,
      include: [{ from: '^' + esc(start), ...(end ? { to: end } : {}) }],
    };
    // 無料域の回遊 CTA は紙面に不要
    if (lines.some((l) => l.trim() === '<!-- cta:civil-mokuji -->')) {
      a.exclude = [{ from: '^<!-- cta:civil-mokuji', to: '^## ' }];
    }
    articles.push(a);
  }

  totalArticles += articles.length;
  summary.push({ spec: mag.spec, n: articles.length, skipped });
  const spec = { srcDir: mag.dir, articles };
  const outPath = join(OUT_DIR, mag.spec + '.json');
  if (APPLY) writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  console.log(`${mag.spec}: ${articles.length} 記事${skipped.length ? ` / skip ${skipped.length}` : ''} -> ${outPath}${APPLY ? '' : '（dry-run）'}`);
  skipped.forEach((s) => console.log('    skip:', s));
}

console.log(`\n計 ${totalArticles} 記事 / ${summary.length} spec ${APPLY ? '書き出し済み' : '（dry-run・未書き込み）'}`);
if (totalArticles === 0) { console.error('[gen-pdf-specs] FAIL: 1 記事も spec 化していない'); process.exit(1); }
