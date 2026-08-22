#!/usr/bin/env node
/**
 * check-public-bloat.mjs — public/ に生成物が滞留してビルドを潰すのを検知するゲート
 * ---------------------------------------------------------------------------
 * 背景（2026-07-30）: ローカルビルドが 32.5 分かかっていた。原因は `public/pagefind/` に
 *   `pagefind/pagefind/pagefind/…` と **20 段の再帰的な入れ子**が育ち、**92,803 個のゴミ**が
 *   滞留していたこと。Next.js は `public/` の中身を毎ビルド `out/` へ全コピーするので、
 *   `out/` が 108,408 ファイルへ膨張し `rm -rf out` だけで 11 分・`next build` が 18 分になっていた。
 *   掃除後は 8.0 分（out/ 15,605 ファイル）。
 *
 *   7 週間気づけなかったのは、見る仕組みがどこにも無かったから:
 *     - public/pagefind/ は .gitignore 済み → **CI では絶対に検出できない**（クリーンチェックアウト
 *       に存在しない）。CI のビルド時間は元から正常だったので CI 側の異常としても出ない
 *     - pre-commit は staged を見る → gitignore されたファイルは永久に staged にならない
 *     - Next.js の自己申告時間（コンパイル 19.9s＋静的生成 62s）は実時間の 8% しか説明しない
 *
 *   したがって本ゲートは **prebuild（ローカルのビルド直前）** に置く。コストを実際に払う直前が
 *   唯一の有効な検査点。会社 PC は EDR が全ファイル操作をスキャンするためファイル数が
 *   そのまま時間に比例する（1 ファイル 20〜45ms）。
 *
 * 判定:
 *   (1) 再帰入れ子      … public/ 配下に「自分と同名の子ディレクトリ」があれば FAIL
 *                          （pagefind/pagefind が典型。生成物が自分を再帰的に取り込んだ痕跡）
 *   (2) ファイル数上限  … public/ 配下の総ファイル数が MAX_FILES 超で FAIL
 *
 * 検査件数を必ず出力する（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。public/ が存在しない・
 * 1 件も数えられなかった場合は緑を返さず FAIL（それは「異常なし」ではなく「検査できていない」）。
 *
 * 使い方:
 *   node scripts/check-public-bloat.mjs          # prebuild から自動実行
 *   node scripts/check-public-bloat.mjs --json
 * ---------------------------------------------------------------------------
 */
import { readdirSync, existsSync, statSync, writeSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'public';
// 正常値は 991（2026-07-30 実測・うち pagefind の正規出力が ~950）。事故時は 93,794 だった。
// 正当な追加の余地を残しつつ、桁違いの膨張だけを捕まえる高さに置く。
const MAX_FILES = 5000;
const JSON_OUT = process.argv.includes('--json');

if (!existsSync(ROOT)) {
  console.error(`[check-public-bloat] ✗ ${ROOT}/ が無い。検査できていないので緑にしない。`);
  process.exit(1);
}

/** public/ を1回walkして「総ファイル数」「自己同名の入れ子」「サブツリー別件数」を同時に集める。 */
let files = 0;
let dirs = 0;
const nested = [];
const perTop = new Map();

function walk(dir, topLabel, depth) {
  dirs++;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // 読めないディレクトリは件数に数えない（数えたふりをしない）
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      // 自分と同名の子＝生成物が自分を取り込んで再帰した痕跡。深さも記録して段数を示す。
      if (e.name === dir.split(/[\\/]/).pop()) nested.push({ path: p, depth: depth + 1 });
      walk(p, topLabel ?? e.name, depth + 1);
    } else {
      files++;
      const k = topLabel ?? '(直下)';
      perTop.set(k, (perTop.get(k) || 0) + 1);
    }
  }
}

walk(ROOT, null, 0);

const result = { root: ROOT, files, dirs, maxFiles: MAX_FILES, nested, byTop: Object.fromEntries(perTop) };

if (JSON_OUT) {
  writeSync(1, JSON.stringify(result, null, 2) + '\n');
  process.exit(nested.length || files > MAX_FILES || files === 0 ? 1 : 0);
}

console.log(`[check-public-bloat] 実検査 ${files} ファイル / ${dirs} ディレクトリ（上限 ${MAX_FILES}）`);

// 0 件は「異常なし」ではなく「走査が壊れている」。緑を返さない。
if (files === 0) {
  console.error(`\n[check-public-bloat] ✗ ${ROOT}/ で1件も数えられなかった＝検査不成立（走査ロジックか権限を疑う）。`);
  process.exit(1);
}

let bad = false;

if (nested.length) {
  bad = true;
  const deepest = nested.reduce((a, b) => (b.depth > a.depth ? b : a));
  // 消すのは **最浅** の入れ子。そこを消せば配下の再帰サブツリーごと消える（最深を消しても親が残る）。
  const shallowest = nested.reduce((a, b) => (b.depth < a.depth ? b : a));
  console.error(`\n[check-public-bloat] ✗ 自己同名の入れ子 ${nested.length} 件（生成物が自分を再帰的に取り込んでいる）:`);
  for (const n of nested.slice(0, 5)) console.error(`    ${n.path}（${n.depth} 段目）`);
  if (nested.length > 5) console.error(`    … 他 ${nested.length - 5} 件`);
  console.error(`  最深 ${deepest.depth} 段。Next.js は public/ を毎ビルド out/ へ全コピーするため、`);
  console.error('  ここが膨らむとビルド時間がそのまま比例して伸びる（2026-07-30 は 20 段・92,803 件で 32.5 分）。');
  console.error('  除去（最浅を消せば配下ごと消える。Git Bash の rm -rf より PowerShell が速い）:');
  console.error(`    powershell -c "Remove-Item -Recurse -Force '${shallowest.path.replace(/\//g, '\\')}'"`);
}

if (files > MAX_FILES) {
  bad = true;
  const top = [...perTop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.error(`\n[check-public-bloat] ✗ public/ が ${files} ファイル（上限 ${MAX_FILES}）。内訳上位:`);
  for (const [k, v] of top) console.error(`    ${String(v).padStart(7)}  ${ROOT}/${k}`);
  console.error('  public/ は毎ビルド out/ へ全コピーされる。生成物を置かない。');
  console.error('  pagefind のローカル検索用は fragment/ + index/ + ランタイム12点（計 ~950）だけが正しい姿。');
}

// ---- リポジトリ直下のスクラッチ滞留（2026-08-22 追加） ----------------------
//
// public/ と同じ構造の事故。`.gitignore` には `/*.png` `/*.jpeg` `/*.zip` があり、
// **Git に入れないための規則はあった**が、消す仕組みが無かった。結果、UI 確認の
// スクショや handoff zip が 9 個 2.5 MB、2026-06〜07 から 2 か月放置されていた
// （gitignore 済みなので `git status` に出ず、誰も気づかない）。
//
// 一時ファイルの正しい置き場は `.tmp/` 配下（CLAUDE.md §3）。
// **CI のクリーンチェックアウトでは 0 件になる**ので、件数を必ず出して
// 「0 件検査」と「異常なし」を見分けられるようにする。
const SCRATCH_RE = /\.(png|jpe?g|gif|webp|svg|zip|mp4|wav|pdf)$/i;
const rootEntries = readdirSync(process.cwd(), { withFileTypes: true })
  .filter((e) => e.isFile() && SCRATCH_RE.test(e.name));
console.log(`[check-public-bloat] リポジトリ直下のスクラッチ: ${rootEntries.length} 件`
  + (rootEntries.length === 0 ? '（クリーンチェックアウトでは 0 件が正常）' : ''));
if (rootEntries.length) {
  bad = true;
  const total = rootEntries.reduce((sum, e) => {
    try { return sum + statSync(e.name).size; } catch { return sum; }
  }, 0);
  console.error(`\n[check-public-bloat] ✗ リポジトリ直下に一時ファイルが ${rootEntries.length} 件（${(total / 1048576).toFixed(1)} MiB）:`);
  for (const e of rootEntries.slice(0, 12)) console.error(`    ${e.name}`);
  if (rootEntries.length > 12) console.error(`    … 他 ${rootEntries.length - 12} 件`);
  console.error('  一時ファイルは .tmp/ 配下へ出すこと（CLAUDE.md §3）。');
  console.error('  .gitignore が Git への混入は止めているが、消すのは誰もやらない。');
  console.error('  不要なら削除する:');
  console.error(`    rm ${rootEntries.slice(0, 3).map((e) => JSON.stringify(e.name)).join(' ')}${rootEntries.length > 3 ? ' …' : ''}`);
}

if (bad) process.exit(1);

console.log(`[check-public-bloat] ✓ 生成物の滞留なし（入れ子 0 件・${files} ≤ ${MAX_FILES}・直下スクラッチ 0 件）`);
