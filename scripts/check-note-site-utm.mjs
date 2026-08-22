#!/usr/bin/env node
// note 公開対象（content/note/**/article.md のみ・内部の企画/設計/READMEは対象外）内の
// 「doboku-note.com/docs/ サイト送客リンク」が UTM 規約に従っているかを検証する。
//
// 規約（真実源: docs/marketing/02_チャネル動線設計.md／2026-07-22 改訂＝戦略的併用）:
//   - 主要ファネルCTA（本文の地の文）は「アンカー文言付きインライン」 [テキスト](url?utm…) で張り、
//     URL に utm_source=note と utm_medium=referral を付ける（計測対象）。
//   - 補助・視覚的送客は「## 関連(リソース|リンク|記事|コンテンツ)」節配下、または
//     <!-- card-ok --> マーカー直後の「単独行の生 URL」= リンクカードを許可（計測粒度は捨てる）。
//   - それ以外の場所の生 URL は /note-publish がカード化し UTM が落ちるため不可。
//
// 検出する違反:
//   [bare-url]  </? https://doboku-note.com/docs/...> もしくは裸の URL（](… でない） … カード化で UTM 消失
//   [utm-missing] [テキスト](https://doboku-note.com/docs/...) だが utm_source=note が無い
//
// note.com/ のマガジン CTA（note 内部リンク）は対象外（UTM 不要）。doboku-note.com/docs/ のみ対象。
//
// 使い方:
//   node scripts/check-note-site-utm.mjs            # content/note 全体を監査（--all 相当）
//   node scripts/check-note-site-utm.mjs --staged   # git staged の content/note/*.md のみ（pre-commit 用）
//   SKIP_NOTE_UTM=1 で回避（既存違反のバーンダウン中など）
// 違反 1 件でも exit 1。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

if (process.env.SKIP_NOTE_UTM === '1') {
  console.log('[check-note-site-utm] SKIP_NOTE_UTM=1 のためスキップ');
  process.exit(0);
}

const STAGED = process.argv.includes('--staged');
const ROOT = 'content/note';

// note 公開対象のファイル名（Convention B の article.md と、型別の article-II1.md 等）。
// 企画/設計/README の内部 doc は対象外。他の note 系ゲート（check-note-structure /
// check-note-price-consistency）と同じパターンに揃える。
const ARTICLE_RE = /^article(-[^/\\]+)?\.md$/;

function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    // ★ パス全体ではなくファイル名で判定する。join() は Windows で "\" 区切りを返すため、
    //   従来の /\/article\.md$/ はローカルで**一件もマッチせず全量実行が常に0件＝偽PASS**だった
    //   （--staged は git の "/" 区切り出力なので動いていた・2026-07-28 修正）。
    else if (ARTICLE_RE.test(name)) acc.push(p);
  }
  return acc;
}

let files;
if (STAGED) {
  // -c core.quotepath=false: 日本語パスを生UTF-8で出力（既定は引用符+8進エスケープで
  // startsWith('content/note/') と existsSync に不一致→日本語パス記事が素通りする）
  files = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n')
    .filter((f) => f.startsWith('content/note/') && ARTICLE_RE.test(f.split('/').pop() || '') && existsSync(f));
} else {
  files = walk(ROOT, []);
}

// `](url)` のインライン / それ以外（裸 or <url>）を 1 パスで分類する。
// group1 = "](" があればインライン、無ければ裸URL（<url> 含む）。
const RE = /(\]\()?<?(https?:\/\/doboku-note\.com\/docs\/[^\s)>]+)/g;

// note 記事内でサイトへ送客するリンクは**絶対URLでなければ届かない**。相対パス `](/docs/slug)`
// や裸 slug `](slug)` は note.com 上で解決されリンク切れになる（2026-07-28、建設部門で
// 相対41件・裸slug23件を実測）。UTM 以前の到達性の問題なのでこのゲートで一緒に止める。
const BROKEN_RE = /\]\((\/docs\/[^\s)]+|(?!https?:|mailto:|tel:|#|\/|\.)[a-z][a-z0-9]*(?:-[a-z0-9]+){2,})\)/g;

const problems = [];
let linkCount = 0;   // 実検査したリンク数（「検査ゼロの緑」を読み分けるため出力する）
// カード許可コンテキスト: 「関連リソース」等の補助節配下、または <!-- card-ok --> マーカー直後の
// 裸URL（サイト送客）は視覚的回遊カードとして許可する（計測粒度は捨てる）。
// 主要ファネルCTA（本文の地の文）はインライン+UTM必須。真実源: docs/marketing/02_チャネル動線設計.md
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let inCardSection = false;   // 関連リソース系の見出し配下か
  let cardOkArmed = false;     // <!-- card-ok --> 直後か（空行は跨ぐ）
  lines.forEach((line, i) => {
    const h = line.match(/^#{1,6}\s*(.+?)\s*$/);
    if (h) { inCardSection = /関連(リソース|リンク|記事|コンテンツ)/.test(h[1]); }
    if (/^\s*<!--\s*card-ok\s*-->/.test(line)) { cardOkArmed = true; return; }
    if (line.trim() === '') return; // 空行は状態を保持（マーカー→空行→URL に対応）
    let b;
    BROKEN_RE.lastIndex = 0;
    while ((b = BROKEN_RE.exec(line)) !== null) {
      problems.push(`${f}:${i + 1} [broken-link] ](${b[1]}) は note 上で解決できない（絶対URL https://doboku-note.com/docs/... にする）`);
    }
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(line)) !== null) {
      linkCount++;
      const inline = Boolean(m[1]);
      const url = m[2];
      if (inline) {
        if (!url.includes('utm_source=note')) {
          problems.push(`${f}:${i + 1} [utm-missing] ${url}`);
        } else if (!url.includes('utm_medium=referral')) {
          // referral は GA4 標準 medium（Referral チャネルへ正しく分類）。
          // inline/banner 等の非標準値は Unassigned 化するため referral に統一する。
          problems.push(`${f}:${i + 1} [utm-medium] ${url}（utm_medium=referral が必要）`);
        }
      } else if (!inCardSection && !cardOkArmed) {
        // 補助節/マーカー外の裸URLは主要送客の計測を壊すため NG（インライン+UTM にする）
        problems.push(`${f}:${i + 1} [bare-url] ${url}`);
      }
    }
    cardOkArmed = false; // コンテンツ行を処理したらマーカーを消費
  });
}

if (problems.length) {
  console.error(`[check-note-site-utm] ✗ UTM 規約違反のサイト送客リンク ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n対処: サイト送客リンクは [テキスト](https://doboku-note.com/docs/{slug}?utm_source=note&utm_medium=referral&utm_campaign={記事slug}&utm_content={送客先}) のインライン形式にする。');
  console.error('生 URL 単独行は /note-publish がカード化し UTM が落ちる。真実源: docs/marketing/02_チャネル動線設計.md');
  console.error('（既存違反のバーンダウン中は SKIP_NOTE_UTM=1 で一時回避可）');
  process.exit(1);
}

console.log(
  `[check-note-site-utm] ✓ ${files.length} ファイル / 送客リンク ${linkCount} 件を実検査 — UTM 規約違反 0`,
);
// 検査の射程を出力に書く: この検査は /docs/ 宛だけを見る。root・/category/・/tools/ 宛の
// 裸 URL カード（2026-08-20 実測 9 件）は対象外なので、緑を「全送客リンクが規約適合」と
// 読んではいけない（CLAUDE.md §9）。
console.log('[check-note-site-utm]   対象は /docs/ への送客リンクのみ（root・/category/・/tools/ 宛は射程外）');
