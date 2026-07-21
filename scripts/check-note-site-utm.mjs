#!/usr/bin/env node
// note 公開対象（docs/note/**/article.md のみ・内部の企画/設計/READMEは対象外）内の
// 「doboku-note.com/docs/ サイト送客リンク」が UTM 規約に従っているかを検証する。
//
// 規約（真実源: docs/project/03_SNS/02_チャネル動線設計.md／2026-07-22 改訂＝戦略的併用）:
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
//   node scripts/check-note-site-utm.mjs            # docs/note 全体を監査（--all 相当）
//   node scripts/check-note-site-utm.mjs --staged   # git staged の docs/note/*.md のみ（pre-commit 用）
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
const ROOT = 'docs/note';

function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\/article\.md$/.test(p)) acc.push(p); // note公開対象のみ(Convention B)。企画/設計/READMEの内部docは対象外
  }
  return acc;
}

let files;
if (STAGED) {
  // -c core.quotepath=false: 日本語パスを生UTF-8で出力（既定は引用符+8進エスケープで
  // startsWith('docs/note/') と existsSync に不一致→日本語パス記事が素通りする）
  files = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.startsWith('docs/note/') && /\/article\.md$/.test(f) && existsSync(f));
} else {
  files = walk(ROOT, []);
}

// `](url)` のインライン / それ以外（裸 or <url>）を 1 パスで分類する。
// group1 = "](" があればインライン、無ければ裸URL（<url> 含む）。
const RE = /(\]\()?<?(https?:\/\/doboku-note\.com\/docs\/[^\s)>]+)/g;

const problems = [];
// カード許可コンテキスト: 「関連リソース」等の補助節配下、または <!-- card-ok --> マーカー直後の
// 裸URL（サイト送客）は視覚的回遊カードとして許可する（計測粒度は捨てる）。
// 主要ファネルCTA（本文の地の文）はインライン+UTM必須。真実源: docs/project/03_SNS/02_チャネル動線設計.md
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let inCardSection = false;   // 関連リソース系の見出し配下か
  let cardOkArmed = false;     // <!-- card-ok --> 直後か（空行は跨ぐ）
  lines.forEach((line, i) => {
    const h = line.match(/^#{1,6}\s*(.+?)\s*$/);
    if (h) { inCardSection = /関連(リソース|リンク|記事|コンテンツ)/.test(h[1]); }
    if (/^\s*<!--\s*card-ok\s*-->/.test(line)) { cardOkArmed = true; return; }
    if (line.trim() === '') return; // 空行は状態を保持（マーカー→空行→URL に対応）
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(line)) !== null) {
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
  console.error('生 URL 単独行は /note-publish がカード化し UTM が落ちる。真実源: docs/project/03_SNS/02_チャネル動線設計.md');
  console.error('（既存違反のバーンダウン中は SKIP_NOTE_UTM=1 で一時回避可）');
  process.exit(1);
}

console.log(`[check-note-site-utm] ✓ ${files.length} ファイルのサイト送客リンクは UTM 規約に適合`);
