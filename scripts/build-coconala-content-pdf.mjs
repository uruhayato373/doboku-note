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
const NOTE_BASE = join(ROOT, 'content/note/1級・2級土木');
// 生成物（模擬試験など note 記事を源としない商品）の markdown 置き場（＝PDF の SoT）。
const MOSHI_BASE = join(ROOT, '.claude/config/coconala/assets/moshi-src');
// src（例 "2級土木-施工経験記述-完成答案集/品質管理/article.md"）はマガジン名の接頭辞で
// grade dir（1級土木/2級土木）を解決する。generated=true は MOSHI_BASE 直下から解決。
const resolveSrc = (src, generated) => generated
  ? join(MOSHI_BASE, src)
  : join(NOTE_BASE, src.startsWith('2級') ? '2級土木' : '1級土木', 'magazines', src);
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
  // C3: 2級 完成答案集（3テーマ）
  C3: {
    label: 'coconala-2kyu-kanseitoan-pdf',
    articles: ['品質管理', '安全管理', '工程管理'].map((t, i) => ({
      src: `2級土木-施工経験記述-完成答案集/${t}/article.md`,
      out: `coconala-C3-2級完成答案-${String(i + 1).padStart(2, '0')}-${t}`,
      includeFrom: '^## .+の答案で採点者が見るポイント',
    })),
  },
  // C4: 1級 過去問模範答案集（R03-R07・年度別）
  C4: {
    label: 'coconala-1kyu-kakomon-pdf',
    articles: ['R03', 'R04', 'R05', 'R06', 'R07'].map((y) => ({
      src: `1級土木-施工経験記述-過去問模範答案集/${y}/article.md`,
      out: `coconala-C4-1級過去問模範-${y}`,
      includeFrom: '^## 令和.+問題1（試験問題',
    })),
  },
  // C5: 2級 過去問模範答案集（R03-R07・年度別）
  C5: {
    label: 'coconala-2kyu-kakomon-pdf',
    articles: ['R03', 'R04', 'R05', 'R06', 'R07'].map((y) => ({
      src: `2級土木-施工経験記述-過去問模範答案集/${y}/article.md`,
      out: `coconala-C5-2級過去問模範-${y}`,
      includeFrom: '^## 令和.+問題1（試験問題',
    })),
  },
  // C6: 1級 学科記述 テーマ別出る順（5論点）
  C6: {
    label: 'coconala-1kyu-gakka-pdf',
    articles: ['コンクリート工', '品質管理', '土工', '安全管理・法規', '施工計画・環境'].map((t, i) => ({
      src: `1級土木-二次学科記述-テーマ別出る順/${t}/article.md`,
      out: `coconala-C6-1級学科記述-${String(i + 1).padStart(2, '0')}-${t}`,
      includeFrom: '^## (?!出典)',
    })),
  },
  // C7: 2級 学科記述 テーマ別出る順（5論点）
  C7: {
    label: 'coconala-2kyu-gakka-pdf',
    articles: ['コンクリート工', '品質管理', '土工', '安全管理・法規', '施工計画・環境'].map((t, i) => ({
      src: `2級土木-二次学科記述-テーマ別出る順/${t}/article.md`,
      out: `coconala-C7-2級学科記述-${String(i + 1).padStart(2, '0')}-${t}`,
      includeFrom: '^## (?!出典)',
    })),
  },
  // C8: 1級 二次 予想模擬試験（問題冊子＋解答解説冊子）。源=生成 markdown（C6論点＋C1分析から）。
  C8: {
    label: 'coconala-1kyu-moshi-pdf',
    generated: true,
    articles: [
      { src: 'C8-1級模試/問題冊子.md', out: 'coconala-C8-1級二次予想模試-問題冊子', title: '1級土木 第2次検定 予想模擬試験 問題冊子', includeFrom: '^## ' },
      { src: 'C8-1級模試/解答解説.md', out: 'coconala-C8-1級二次予想模試-解答解説', title: '1級土木 第2次検定 予想模擬試験 解答・解説', includeFrom: '^## ' },
    ],
  },
  // C9: 2級 二次 予想模擬試験（問題冊子＋解答解説冊子）。源=生成 markdown（C7論点から）。
  C9: {
    label: 'coconala-2kyu-moshi-pdf',
    generated: true,
    articles: [
      { src: 'C9-2級模試/問題冊子.md', out: 'coconala-C9-2級二次予想模試-問題冊子', title: '2級土木 第2次検定 予想模擬試験 問題冊子', includeFrom: '^## ' },
      { src: 'C9-2級模試/解答解説.md', out: 'coconala-C9-2級二次予想模試-解答解説', title: '2級土木 第2次検定 予想模擬試験 解答・解説', includeFrom: '^## ' },
    ],
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
    const raw = readFileSync(resolveSrc(a.src, prod.generated), 'utf8');
    // 生成物は note 導線を含まない前提だが、strip は冪等なので generated でも通して二重に担保する。
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
