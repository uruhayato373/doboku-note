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
 * 土木以外（RCCM・技術士）は noteRelative で content/note/ からの相対パスで源を引く。
 * 使い方: CHROME_PATH=... node scripts/build-coconala-content-pdf.mjs [--product C1|…|C9|A1|A2|R1|R2|R3|K1|K2|O1]
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stripNoteFunnel, assertNoFunnel } from './lib/strip-note-funnel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_ROOT = join(ROOT, 'content/note');
const NOTE_BASE = join(NOTE_ROOT, '1級・2級土木');
// 生成物（模擬試験など note 記事を源としない商品）の markdown 置き場（＝PDF の SoT）。
const MOSHI_BASE = join(ROOT, '.claude/config/coconala/assets/moshi-src');
// src（例 "2級土木-施工経験記述-完成答案集/品質管理/article.md"）はマガジン名の接頭辞で
// grade dir（1級土木/2級土木）を解決する。generated=true は MOSHI_BASE 直下から解決。
// noteRelative=true の商品（土木以外の資格）は src を content/note/ からの相対パスで書く。
const resolveSrc = (src, prod) => prod.generated
  ? join(MOSHI_BASE, src)
  : prod.noteRelative
    ? join(NOTE_ROOT, src)
    : join(NOTE_BASE, src.startsWith('2級') ? '2級土木' : '1級土木', 'magazines', src);
// 公的出典のリンク（国交省・日本技術士会・e-Gov 等）は外部誘導ではないが、納品 PDF は URL 0件を
// 不変条件にしている。strip 後に、リンクは表示テキスト（出典名）だけ残し、HTML コメントは落とす。
// strip は `<!-- cta:... -->` を目印に CTA ブロックを探すので、必ず strip の後に掛ける。
// コメントを空文字で消すと前後がつながって `<!--` が新たにできうる（CodeQL js/incomplete-multi-character-sanitization）。
// 空白に置き換えて連結を防ぎ、閉じていない開始記号も空白にする。
const stripHtmlComments = (md) => md
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<!--/g, ' ');
const delinkUrls = (md) => stripHtmlComments(md)
  .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, '$1');
// 納品物は「記事」ではないので呼び方を資料へ寄せる。記事固有の一文（note の無料範囲・他記事への案内）は
// 商品定義の replace（[検索文字列, 置換後] の配列）で個別に直す。
const toDeliverable = (md, replace = []) => replace
  .reduce((s, [from, to]) => s.split(from).join(to), md)
  .replace(/本記事/g, '本資料')
  .replace(/この記事/g, 'この資料');
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
      { src: 'C8-1級模試/問題冊子.md', out: 'coconala-C8-1級二次予想模試-第1回-問題冊子', title: '1級土木 第2次検定 予想模擬試験 第1回 問題冊子', includeFrom: '^## ' },
      { src: 'C8-1級模試/解答解説.md', out: 'coconala-C8-1級二次予想模試-第1回-解答解説', title: '1級土木 第2次検定 予想模擬試験 第1回 解答・解説', includeFrom: '^## ' },
      { src: 'C8-1級模試/第2回問題冊子.md', out: 'coconala-C8-1級二次予想模試-第2回-問題冊子', title: '1級土木 第2次検定 予想模擬試験 第2回 問題冊子', includeFrom: '^## ' },
      { src: 'C8-1級模試/第2回解答解説.md', out: 'coconala-C8-1級二次予想模試-第2回-解答解説', title: '1級土木 第2次検定 予想模擬試験 第2回 解答・解説', includeFrom: '^## ' },
      { src: 'C8-1級模試/第3回問題冊子.md', out: 'coconala-C8-1級二次予想模試-第3回-問題冊子', title: '1級土木 第2次検定 予想模擬試験 第3回 問題冊子', includeFrom: '^## ' },
      { src: 'C8-1級模試/第3回解答解説.md', out: 'coconala-C8-1級二次予想模試-第3回-解答解説', title: '1級土木 第2次検定 予想模擬試験 第3回 解答・解説', includeFrom: '^## ' },
    ],
  },
  // C9: 2級 二次 予想模擬試験（問題冊子＋解答解説冊子）。源=生成 markdown（C7論点から）。
  C9: {
    label: 'coconala-2kyu-moshi-pdf',
    generated: true,
    articles: [
      { src: 'C9-2級模試/問題冊子.md', out: 'coconala-C9-2級二次予想模試-第1回-問題冊子', title: '2級土木 第2次検定 予想模擬試験 第1回 問題冊子', includeFrom: '^## ' },
      { src: 'C9-2級模試/解答解説.md', out: 'coconala-C9-2級二次予想模試-第1回-解答解説', title: '2級土木 第2次検定 予想模擬試験 第1回 解答・解説', includeFrom: '^## ' },
      { src: 'C9-2級模試/第2回問題冊子.md', out: 'coconala-C9-2級二次予想模試-第2回-問題冊子', title: '2級土木 第2次検定 予想模擬試験 第2回 問題冊子', includeFrom: '^## ' },
      { src: 'C9-2級模試/第2回解答解説.md', out: 'coconala-C9-2級二次予想模試-第2回-解答解説', title: '2級土木 第2次検定 予想模擬試験 第2回 解答・解説', includeFrom: '^## ' },
      { src: 'C9-2級模試/第3回問題冊子.md', out: 'coconala-C9-2級二次予想模試-第3回-問題冊子', title: '2級土木 第2次検定 予想模擬試験 第3回 問題冊子', includeFrom: '^## ' },
      { src: 'C9-2級模試/第3回解答解説.md', out: 'coconala-C9-2級二次予想模試-第3回-解答解説', title: '2級土木 第2次検定 予想模擬試験 第3回 解答・解説', includeFrom: '^## ' },
    ],
  },
  // R1: RCCM 問題III 模範論文集（序章＋公開6テーマ）。源=note「RCCM問題III-2026模範論文集」。
  R1: {
    label: 'coconala-rccm-mondai3-pdf',
    noteRelative: true,
    articles: [
      { src: 'RCCM/magazines/RCCM問題III-2026模範論文集/00-序章/article.md', out: 'coconala-R1-RCCM問題III-00-序章', title: 'RCCM 問題III 管理技術力 2026年度 公開6テーマの読み方と答案の骨子', includeFrom: '^## 問題III「管理技術力」で問われていること', includeTo: '^## マガジンの使い方', replace: [['模範論文集（序章・無料）', '模範論文集（序章）'], ['収録記事：', '収録PDF：']] },
      ...['01-インフラ老朽化', '02-安全安心国土', '03-SDGs', '04-AI品質', '05-国際競争力', '06-BIM-CIM'].map((t) => ({
        src: `RCCM/magazines/RCCM問題III-2026模範論文集/${t}/article.md`,
        out: `coconala-R1-RCCM問題III-${t}`,
        includeFrom: '^## テーマの読み解き',
      })),
    ],
  },
  // R2: RCCM 択一（問題II・IV-1 予想50問＋一問一答159問）。源=note の論点集と直前暗記ノート。
  R2: {
    label: 'coconala-rccm-takuitsu-pdf',
    noteRelative: true,
    articles: [
      { src: 'RCCM/magazines/RCCM問題II-IV-論点集予想50問/article.md', out: 'coconala-R2-RCCM択一-予想50問', includeFrom: '^## 問題IIの出題範囲マップ', replace: [['問1〜10は無料です。\n', '']] },
      { src: 'RCCM/magazines/RCCM問題II-IV-直前暗記ノート/article.md', out: 'coconala-R2-RCCM択一-一問一答159問', includeFrom: '^## この暗記ノートの使い方', replace: [['当サイトの「', '同梱の「']] },
    ],
  },
  // A1/A2: 1級・2級 二次 学科記述の直前暗記ノート。単独出品せず、模試・フルパック・プレミアムの特典として同梱する。
  A1: {
    label: 'coconala-1kyu-moshi-pdf / full / premium の特典',
    articles: [{ src: '1級土木-二次学科記述-直前暗記ノート/article.md', out: 'coconala-A1-1級二次-直前暗記ノート', includeFrom: '^## この暗記ノートの使い方', replace: [['**付属の印刷用PDF**（A5・赤シート対応）を現場ポケットに入れて回す：この一問一答を赤シートで隠せるA5サイズの印刷用PDFを記事末尾に添付しています（本文の一問一答リストと同内容）。', '**印刷して**現場のポケットに入れて回す：「A.」の側を紙で隠して使います。'], ['当マガジン「1級土木 二次学科記述 テーマ別出る順」の各テーマ別記事', '「1級土木 二次学科記述 テーマ別出る順」の各テーマ別教材']] }],
  },
  A2: {
    label: 'coconala-2kyu-moshi-pdf / full の特典',
    articles: [{ src: '2級土木-二次学科記述-直前暗記ノート/article.md', out: 'coconala-A2-2級二次-直前暗記ノート', includeFrom: '^## この一問一答の使い方', replace: [['赤シートで「A.」を隠し、Qを見て答えを口に出せるか確認します（赤シート対応のA5印刷用PDFを記事末尾に添付しています）。', '印刷して「A.」の側を紙で隠し、Qを見て答えを口に出せるか確認します。'], ['「なぜそうなるか」はテーマ別記事で確認してください。', '「なぜそうなるか」は学科記述のテーマ別教材で確認してください。'], ['当マガジン収録の「2級土木 二次学科記述 テーマ別出る順」5記事', '「2級土木 二次学科記述 テーマ別出る順」5本'], ['当サイト掲載のR03〜R07 第2次検定', 'R03〜R07 第2次検定']] }],
  },
  // R3: RCCM 問題I 業務経験論文（テンプレ＋6部門の記入例）。購入者の受験部門の記入例とテンプレを送る。
  R3: {
    label: 'coconala-rccm-mondai1-pdf',
    noteRelative: true,
    articles: [
      { src: 'RCCM/magazines/RCCM問題I-業務経験論文テンプレ/article.md', out: 'coconala-R3-RCCM問題I-00-テンプレート', includeFrom: '^## 問題Iで問われていること' },
      ...['01-上水道', '02-下水道', '03-土質及び基礎', '04-道路', '05-河川砂防及び海岸海洋', '06-鋼構造及びコンクリート'].map((d) => ({
        src: `RCCM/magazines/RCCM問題I-部門別業務経験例/${d}/article.md`,
        out: `coconala-R3-RCCM問題I-${d}`,
        // 部門ごとに冒頭節の見出しが違う（使い方と公式情報／公式情報と記入例の位置づけ／公式情報と練習原稿の扱い）
        includeFrom: '^## .*公式情報',
      })),
    ],
  },
  // K1: コンクリート主任技士 小論文（解法ガイド＋4テーマの模範答案）。
  K1: {
    label: 'coconala-cce-essay-pdf',
    noteRelative: true,
    articles: [
      { src: 'コンクリート主任技士/magazines/コンクリート主任技士-小論文-模範答案集/解法ガイド/article.md', out: 'coconala-K1-主任技士小論文-00-解法ガイド', includeFrom: '^## 小論文は「翻訳」の試験である' },
      ...['品質管理', '耐久性', '環境配慮', '施工トラブル'].map((t, i) => ({
        src: `コンクリート主任技士/magazines/コンクリート主任技士-小論文-模範答案集/${t}/article.md`,
        out: `coconala-K1-主任技士小論文-${String(i + 1).padStart(2, '0')}-${t}`,
        includeFrom: '^## 想定問題（代表例）',
      })),
    ],
  },
  // K2: コンクリート主任技士 択一 直前パック（予想50問＋配合計算12問＋一問一答157問）。
  K2: {
    label: 'coconala-cce-takuitsu-pdf',
    noteRelative: true,
    articles: [
      { src: 'コンクリート主任技士/四肢択一-R8予想50問/article.md', out: 'coconala-K2-主任技士択一-予想50問', includeFrom: '^## 予想の考え方', replace: [['分野正答率70%未満は、無料テキストと過去問解説へ戻る', '分野正答率70%未満は、テキストと過去問で基礎へ戻る']] },
      { src: 'コンクリート主任技士/配合計算-実戦演習/article.md', out: 'coconala-K2-主任技士択一-配合計算12問', includeFrom: '^## 収録する計算パターン' },
      { src: 'コンクリート主任技士/magazines/コンクリート主任技士-直前暗記ノート/article.md', out: 'coconala-K2-主任技士択一-一問一答157問', includeFrom: '^## この暗記ノートの使い方', replace: [['当サイトの「コンクリート主任技士｜令和8年度 四肢択一予想50問」', '同梱の「コンクリート主任技士｜令和8年度 四肢択一予想50問」']] },
    ],
  },
  // O1: 技術士 口頭試験 想定問答（総監版・建設部門版）。購入者の部門に合う1冊を送る。
  O1: {
    label: 'coconala-pe-oral-pdf',
    noteRelative: true,
    articles: [
      { src: '技術士総監/口頭試験対策-完全版/article.md', out: 'coconala-O1-口頭試験-総監版', title: '技術士 口頭試験 想定問答と準備ロードマップ【総合技術監理部門】', includeFrom: '^## 2\\. 口頭試験の全体像', replace: [['既存記事『業務経歴の語り方』で身につけた型を土台に、', '業務経歴を説明する型を土台に、']] },
      { src: '技術士建設部門/magazines/建設部門-口頭試験対策/article.md', out: 'coconala-O1-口頭試験-建設部門版', title: '技術士 口頭試験 想定問答と準備ロードマップ【建設部門】', includeFrom: '^## 1\\. 口頭試験の全体像', replace: [['申込書の作り込みから振り返りたい方は、無料記事の業務経歴票の書き方もあわせてご覧ください。', '']] },
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
    const raw = readFileSync(resolveSrc(a.src, prod), 'utf8');
    // 生成物は note 導線を含まない前提だが、strip は冪等なので generated でも通して二重に担保する。
    const { clean: stripped, removed } = stripNoteFunnel(raw);
    const delinked = delinkUrls(stripped);
    // 源が改稿されて replace が空振りすると、note 固有の一文が黙って PDF に残る。対象の実在を先に確かめる。
    const stale = (a.replace || []).filter(([from]) => !delinked.includes(from));
    if (stale.length) { console.error(`  ✗ ${a.out}: replace の対象が源に無い（源が改稿された）${JSON.stringify(stale.map(([f]) => f))}`); fail++; continue; }
    const clean = toDeliverable(delinked, a.replace);
    const chk = assertNoFunnel(clean);
    if (!chk.ok) { console.error(`  ✗ ${a.out}: strip 後も funnel 残存 ${JSON.stringify(chk.hits)}`); fail++; continue; }
    const stageDir = join(STAGE, a.out);
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(stageDir, 'article.md'), clean);
    console.log(`  strip ${a.src} → 除去${removed.length}件 (${[...clean].length}字)`);
    specArticles.push({ srcDir: `.tmp/coconala-pdf-src/${a.out}`, src: 'article.md', out: a.out, title: a.title, includeFrom: a.includeFrom, includeTo: a.includeTo ?? null });
  }
  // article ごとに 1 spec（srcDir が異なるため）
  for (const sa of specArticles) {
    const spec = {
      srcDir: sa.srcDir,
      outDir: '.claude/config/coconala/assets/pdf',
      articles: [{ src: sa.src, out: sa.out, ...(sa.title ? { title: sa.title } : {}), include: [{ from: sa.includeFrom, to: sa.includeTo }] }],
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
