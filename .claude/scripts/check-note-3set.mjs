#!/usr/bin/env node
/**
 * check-note-3set.mjs — note 記事「3点セット」（article.md + img/cover.png + hashtags.txt）の充足ゲート
 *
 * note 記事1本の完成条件は3点セット（[feedback_note_article_three_set_dod]）。だが cover.png /
 * hashtags.txt は別工程（generate-note-covers.mjs / /note-hashtags）で後から生成するため、
 * 公開時に生成漏れが起きやすい（2026-06-12、公開済 194 本中 2 本が hashtags.txt 欠落のまま公開）。
 * 本チェッカーで「公開状態の記事はアセット必須」を機械強制する。
 *
 * 2 モード:
 *   - 既定           : frontmatter が公開状態（noteUrl 非空 OR noteStatus に publish 含む）の記事のみ必須化。
 *                      下書き（draft）は欠落が正常なので対象外。→ note-lint.mjs（pre-commit）用
 *   - --require <…>  : 渡したファイルを公開状態に関わらず無条件で必須化。公開直前は noteUrl 未設定の
 *                      ことが多いため、この検査は state を見ない。→ /note-prepublish-review Phase 1 用
 *
 * cover:    <dir>/img/cover.png または <dir>/../img/cover.png（マガジン共用図に対応）
 * hashtags: <dir>/hashtags.txt
 * 真実源: .claude/knowledge/reference/content-principles.md §14-d
 * 兄弟:   check-note-bold-paren.mjs / check-note-magazine-cta.mjs（1チェッカー×2呼出元パターン）
 *
 * 終了コード: 0 = 充足 / 1 = 欠落あり / 2 = 引数エラー
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { argv } from "node:process";

// hashtags.txt の下限タグ数（過少生成の検知フロア）。標準は ~90（/note-hashtags）。
// 下限は「壊れた過少（10〜20 個）」を確実に捕捉する保守値。環境変数で調整可。
const MIN_TAGS = Number(process.env.NOTE_MIN_HASHTAGS || 40);

let args = argv.slice(2);
let requireAll = false;
if (args[0] === "--require") { requireAll = true; args = args.slice(1); }
if (args.length === 0) {
  console.error("usage: check-note-3set.mjs [--require] <file1> [file2 ...]");
  process.exit(2);
}

function isPublished(front) {
  const noteUrl = (front.match(/^noteUrl:\s*["']?([^"'\r\n]*)/m) || [])[1] || "";
  const status = (front.match(/^noteStatus:\s*["']?([^"'\r\n]*)/m) || [])[1] || "";
  return noteUrl.trim().length > 0 || /publish/i.test(status);
}

const reports = [];
for (const file of args) {
  let c;
  try {
    c = readFileSync(file, "utf-8");
  } catch (e) {
    console.error(`SKIP: ${file} — ${e.message}`);
    continue;
  }
  const fm = c.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const front = fm ? fm[1] : "";
  if (!requireAll && !isPublished(front)) continue; // 下書き → 対象外
  const dir = dirname(file);
  // サフィックス記事（BK 選択科目等の article-II1.md 形式）はアセットも同サフィックス
  // （img/cover-II1.png / hashtags-II1.txt = generate-note-covers.mjs の outName 規約）。
  // 固定名だけ見ると suffix 記事が全て偽陽性になる（2026-07-24 全量 staged で顕在化）。
  const sfx = (file.match(/article-([A-Za-z0-9][A-Za-z0-9-]*)\.md$/) || [])[1];
  const coverName = sfx ? `cover-${sfx}.png` : "cover.png";
  const hasCover =
    existsSync(join(dir, "img", coverName)) ||
    existsSync(join(dir, "..", "img", coverName)) ||
    existsSync(join(dir, "..", "img", "cover.png"));
  const tagsPath = join(dir, sfx ? `hashtags-${sfx}.txt` : "hashtags.txt");
  const hasTags = existsSync(tagsPath);
  const miss = [];
  if (!hasCover) miss.push("img/cover.png");
  if (!hasTags) miss.push("hashtags.txt");
  // hashtags.txt は「存在」だけでなく「タグ数」も検査する。10 個等の過少生成
  // （generator 未実行・手書き最小）が gate を素通りして本番へ到達していた
  // （2026-07-05、civil 二次学科13本が10個・LP がライブ3個で発覚）。
  // 標準は note 上限 99 近くの ~90 個（/note-hashtags）。下限 MIN 未満は未完扱い。
  else if (hasTags) {
    const nTags = (readFileSync(tagsPath, "utf-8").match(/#/g) || []).length;
    if (nTags < MIN_TAGS) miss.push(`hashtags.txt(タグ ${nTags}<${MIN_TAGS}・標準~90)`);
  }
  if (miss.length) reports.push({ file, miss });
}

if (reports.length === 0) {
  console.log("✅ 3-point set : OK");
  process.exit(0);
} else {
  console.log("3-point set : NG（公開状態の記事にアセット欠落）");
  reports.forEach(({ file, miss }) => console.log(`  欠落 ${file}: ${miss.join(" / ")}`));
  console.log(`\nTotal: ${reports.length} 記事でアセット欠落/過少`);
  console.log("生成: カバー= node scripts/generate-note-covers.mjs <slug> / タグ= /note-hashtags <slug>（~90個生成）");
  process.exit(1);
}
