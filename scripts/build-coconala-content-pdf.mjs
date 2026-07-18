#!/usr/bin/env node
/**
 * build-coconala-content-pdf.mjs — ココナラ納品用 PDF を note 記事から生成（外部誘導ゼロ保証）
 * ---------------------------------------------------------------------------
 * note 記事を coconala 単発コンテンツ商品の PDF にする再現可能ビルド。
 *   1. 源 article.md を読む
 *   2. stripNoteFunnel で note 導線（CTA/URL/商品誘導/ペイウォール文）を機械除去
 *   3. クリーン版を .tmp/coconala-pdf-src/<out>/article.md へ書き出し
 *   4. magazine-to-pdf 用 spec を生成 → 実行 → .claude/config/coconala/assets/pdf/<out>.pdf
 *   5. 生成 PDF を pdftotext で検証し note.com/doboku-note/URL が **0件** でなければ FAIL
 *
 * マッピングは PRODUCTS 定数（＝coconala-listings.json の商品と対応）。
 * 使い方: CHROME_PATH=... node scripts/build-coconala-content-pdf.mjs [--product C1|C2]
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stripNoteFunnel, assertNoFunnel } from './lib/strip-note-funnel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_BASE = join(ROOT, 'docs/note/1級・2級土木/1級土木/magazines');
const STAGE = join(ROOT, '.tmp/coconala-pdf-src');
const OUT_PDF = join(ROOT, '.claude/config/coconala/assets/pdf');
const SPEC_DIR = join(ROOT, '.tmp/coconala-specs');

// 各商品 = 複数 article を strip → PDF 化。includeFrom は H1/intro をスキップする開始見出し。
const PRODUCTS = {
  C1: {
    label: 'coconala-bunseki-pdf',
    articles: [
      {
        src: '1級土木-R8二次-出題分析直前重点/article.md',
        out: 'coconala-C1-出題分析-1級土木二次',
        title: '1級土木 第2次検定 出題分析と直前2週間ロードマップ（令和3〜7年度の実績分析）',
        includeFrom: '^\\*\\*こんな人のための',
      },
    ],
  },
  C2: {
    label: 'coconala-kanseitoan-pdf',
    articles: ['品質管理', '安全管理', '工程管理', '施工計画', '環境対策'].map((t, i) => ({
      src: `1級土木-施工経験記述-完成答案集/${t}/article.md`,
      out: `coconala-C2-完成答案-${String(i + 1).padStart(2, '0')}-${t}`,
      // H1・note-intro をスキップし「採点者が見るポイント」から
      includeFrom: '^## .+の答案で採点者が見るポイント',
    })),
  },
};

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const only = argv.includes('--product') ? argv[argv.indexOf('--product') + 1] : null;

mkdirSync(OUT_PDF, { recursive: true });
mkdirSync(SPEC_DIR, { recursive: true });

let fail = 0;
for (const [key, prod] of Object.entries(PRODUCTS)) {
  if (only && only !== key) continue;
  console.log(`\n=== ${key} (${prod.label}) ===`);
  const specArticles = [];
  for (const a of prod.articles) {
    const raw = readFileSync(join(SRC_BASE, a.src), 'utf8');
    const { clean, removed } = stripNoteFunnel(raw);
    const chk = assertNoFunnel(clean);
    if (!chk.ok) { console.error(`  ✗ ${a.out}: strip 後も funnel 残存 ${JSON.stringify(chk.hits)}`); fail++; continue; }
    const stageDir = join(STAGE, a.out);
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(stageDir, 'article.md'), clean);
    console.log(`  strip ${a.src} → 除去${removed.length}件 (${[...clean].length}字)`);
    specArticles.push({ srcDir: `.tmp/coconala-pdf-src/${a.out}`, src: 'article.md', out: a.out, title: a.title, includeFrom: a.includeFrom });
  }
  // article ごとに 1 spec（srcDir が異なるため）
  for (const sa of specArticles) {
    const spec = {
      srcDir: sa.srcDir,
      outDir: '.claude/config/coconala/assets/pdf',
      articles: [{ src: sa.src, out: sa.out, ...(sa.title ? { title: sa.title } : {}), include: [{ from: sa.includeFrom, to: null }] }],
    };
    const specPath = join(SPEC_DIR, `${sa.out}.json`);
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    try {
      execFileSync('node', [join(ROOT, 'scripts/magazine-to-pdf.mjs'), '--spec', specPath], { env: { ...process.env, CHROME_PATH: CHROME }, stdio: 'pipe' });
    } catch (e) {
      console.error(`  ✗ ${sa.out}: magazine-to-pdf 失敗\n${(e.stderr || e.stdout || e.message).toString().slice(0, 300)}`); fail++; continue;
    }
    // 検証: PDF に note/URL が無いこと
    const pdf = join(OUT_PDF, `${sa.out}.pdf`);
    if (!existsSync(pdf)) { console.error(`  ✗ ${sa.out}: PDF 未生成`); fail++; continue; }
    let urlHits = -1;
    try { const txt = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' }); urlHits = (txt.match(/note\.com|doboku-note|https?:\/\//gi) || []).length; }
    catch { urlHits = -1; }
    if (urlHits > 0) { console.error(`  ✗ ${sa.out}: PDF に note/URL が ${urlHits} 件（外部誘導）→ 納品不可`); fail++; continue; }
    console.log(`  ✓ ${sa.out}.pdf  (URL検証 ${urlHits === 0 ? '0件' : 'pdftotext不可・要目視'})`);
  }
}
// _work 掃除（Chrome プロファイル等をコミットしない）
rmSync(join(OUT_PDF, '_work'), { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} 件 FAIL` : '\n✓ 全 PDF 生成・URL検証 OK');
process.exit(fail ? 1 : 0);
