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
 *   end   = `<!-- cta:civil-membership-lab -->` か `## 印刷用PDF` の手前、どちらも無ければ EOF（`## 出典` は残す）
 *   除外  = `<!-- cta:civil-mokuji -->` ブロックと `**関連リンク**` ブロック（マーカー〜次の H2 直前か本文の終わり）
 *
 * 使い方:
 *   node scripts/gen-pdf-specs-civil-keiken.mjs            # dry-run（生成内容を表示）
 *   node scripts/gen-pdf-specs-civil-keiken.mjs --apply    # scripts/pdf-specs/ へ書き出し
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { escapeRegExp } from './lib/regexp-escape.mjs';

const APPLY = process.argv.includes('--apply');
const OUT_DIR = join(REPO_ROOT, 'scripts/pdf-specs');

const MAGAZINES = [
  // 工事件数を商品表示と一致させるため、総合案内や横断付録は個別工事 PDF に含めない。
  { dir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック', spec: '1級土木-経験記述-完全攻略パック', prefix: '1級土木-経験記述', subdirPattern: /^工事\d{2,3}-/ },
  { dir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク', spec: '2級土木-想定工事バンク', prefix: '2級土木-想定工事', subdirPattern: /^工事\d{2,3}-/ },
  { dir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全', spec: '1級土木-施工経験記述-2テーマ組合せ大全', prefix: '1級土木-2テーマ組合せ' },
  { dir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-テーマ別出る順', spec: '1級土木-二次学科記述-テーマ別出る順', prefix: '1級土木-学科記述' },
  { dir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-テーマ別出る順', spec: '2級土木-二次学科記述-テーマ別出る順', prefix: '2級土木-学科記述' },
];

const fmv = (r, k) => { const m = r.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };

let totalArticles = 0;
const summary = [];

for (const mag of MAGAZINES) {
  if (!existsSync(mag.dir)) { console.log('SKIP (dir なし):', mag.dir); continue; }
  const subs = readdirSync(mag.dir)
    .filter((e) => statSync(join(mag.dir, e)).isDirectory())
    .filter((e) => !mag.subdirPattern || mag.subdirPattern.test(e))
    .sort();
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
    const boundary = pb ? lines.find((l) => new RegExp('^## ' + escapeRegExp(pb)).test(l)) : null;
    const start = gaiyou || boundary;
    if (!start) { skipped.push(sub + '（開始H2を特定できず）'); continue; }

    // 終わりは会員 CTA か「## 印刷用PDF」の手前（どちらも無ければ EOF）。「## 出典」は本文の一部として残す
    // （2026-10-22 DN-0518: 出典で止めると末尾の出典節が PDF から落ちていた）。
    const END = '^<!-- cta:civil-membership-lab|^## 印刷用PDF';
    const hasEnd = lines.some((l) => l.trim() === '<!-- cta:civil-membership-lab -->' || /^## 印刷用PDF/.test(l));

    const a = {
      src: `${sub}/article.md`,
      out: `${mag.prefix}-${sub}`,
      include: [{ from: '^' + escapeRegExp(start), ...(hasEnd ? { to: END } : {}) }],
    };
    // 回遊 CTA（もくじ）と無料記事への関連リンクは紙面に不要。関連リンクは本文の途中にも末尾にもあるため、
    // 次の H2 か本文の終わりまでを落とす（DN-0518: 経験記述パックで「関連リンク」が PDF に混入していた）。
    const exclude = [];
    if (lines.some((l) => l.trim() === '<!-- cta:civil-mokuji -->')) exclude.push({ from: '^<!-- cta:civil-mokuji', to: '^## ' });
    if (lines.some((l) => l.trim() === '**関連リンク**')) exclude.push({ from: '^\\*\\*関連リンク\\*\\*', to: '^## |(?![\\s\\S])' });
    if (exclude.length) a.exclude = exclude;
    articles.push(a);
  }

  totalArticles += articles.length;
  summary.push({ spec: mag.spec, n: articles.length, skipped });
  const spec = { srcDir: mag.dir, articles };
  const outPath = join(OUT_DIR, mag.spec + '.json');
  if (APPLY) writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  console.log(`${mag.spec}: ${articles.length} 記事${skipped.length ? ` / skip ${skipped.length}` : ''} -> ${relative(REPO_ROOT, outPath).split('\\').join('/')}${APPLY ? '' : '（dry-run）'}`);
  skipped.forEach((s) => console.log('    skip:', s));
}

console.log(`\n計 ${totalArticles} 記事 / ${summary.length} spec ${APPLY ? '書き出し済み' : '（dry-run・未書き込み）'}`);
if (totalArticles === 0) { console.error('[gen-pdf-specs] FAIL: 1 記事も spec 化していない'); process.exit(1); }
