/**
 * 宙に浮いた「表N.M」参照ガード — 本文が指す表が実在しないと検知する。
 *
 * 背景: 印刷教材から転記した記事には `（表2.1）` のような参照だけが残り、対応する表も
 *   キャプションも本文に無いものが混じる。読者は存在しない表を探すことになる。
 *   図版側（`図N.M`）は 2026-08-03 に 19 件を解消し、表側は 2026-08-18 に 19 件を解消した。
 *   転記由来の記事を追加すると同型が復活するため機械で止める。
 *
 * 判定:
 *   - 参照 = 本文中の `表N.M`（`表 6.4` のように**空白が入る形**も拾う。図版側で2件見落とした実績あり）
 *   - 解決済み = 同一記事に**キャプション行**が実在する
 *       `**表N.M　…**` / `表N.M：…` など、行頭（太字可）＋区切り（全角空白・空白・コロン）
 *   - 表の中身が markdown 表か箇条書きかは**問わない**。モバイル可読性のため箇条書きへ
 *     変換済みの表があり、`|` の有無で測ると誤検知する（2026-08-18 に実測で確認）
 *   - alt="..." 内の言及と、`図表N.M`（外部テキストの引用形）は本文参照ではないので無視する
 *
 * Usage:
 *   node scripts/check-table-references.mjs            全記事
 *   node scripts/check-table-references.mjs --staged   staged された記事のみ（pre-commit）
 *   node scripts/check-table-references.mjs --list     一覧を出すだけ（exit 0）
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = SITE_CONTENT_ROOT;
const staged = process.argv.includes("--staged");
const listOnly = process.argv.includes("--list");

// 「図表N.M（社会環境管理 標準テキスト）」は**外部テキストの引用**であって本文内の表を指さない。
// 直前の「図」を除外しないと総監キーワードページで誤検知する（2026-08-18 実測 2 件）。
const REF_RE = /(?<!図)表[ 　]*(\d+\.\d+)/g;
// キャプション行: 行頭（太字可）に 表N.M があり、直後が区切り文字
const capRe = (n) =>
  new RegExp(`^\\s*(\\*\\*)?表[ 　]*${n.replace(".", "\\.")}(?!\\d)[ 　\\t:：]`, "m");

function listArticles() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/[^/]+\.(mdx|md)$/.test(p) && !p.includes("/img/"))
    .map((rel) => join(POSTS, rel));
}

function stagedArticles() {
  let out = "";
  try {
    out = execFileSync("git", ["-c", "core.quotepath=false", "diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd: ROOT,
      encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null;
  }
  return out
    .split("\n")
    .map((l) => l.trim().replace(/\\/g, "/"))
    .filter((l) => /^\content\/site\/.+\.(mdx|md)$/.test(l) && !l.includes("/img/"))
    .map((l) => join(ROOT, l));
}

let articles = listArticles();
if (staged) {
  const s = stagedArticles();
  if (s === null) {
    console.log("[check-table-references] staged 取得不可のためスキップ");
    process.exit(0);
  }
  const want = new Set(s.map((p) => p.replace(/\\/g, "/")));
  articles = articles.filter((p) => want.has(p.replace(/\\/g, "/")));
}

const dangling = [];
let refTotal = 0;
let checked = 0;

for (const file of articles) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  checked += 1;
  const body = text.replace(/alt="[^"]*"/g, "");
  const refs = new Set();
  for (const m of body.matchAll(REF_RE)) refs.add(m[1]);
  if (refs.size === 0) continue;
  refTotal += refs.size;
  for (const n of [...refs].sort()) {
    if (!capRe(n).test(body)) {
      dangling.push({ file: file.replace(ROOT + "/", "").replace(/\\/g, "/"), ref: n });
    }
  }
}

// 検査ゼロを無言の PASS にしない（CLAUDE.md §9）。対象数と実検査数を必ず出す。
console.log(
  `[check-table-references] 記事 ${checked} 件を実検査 / 表参照 ${refTotal} 件 / 未解決 ${dangling.length} 件`,
);

if (dangling.length === 0) {
  console.log("[check-table-references] ✓ すべての「表N.M」参照にキャプションが実在");
  process.exit(0);
}

for (const d of dangling) console.error(`  ${d.file}  表${d.ref} を指すキャプションが無い`);
console.error(
  "\n対処は 3 択: ①実体があるならキャプション `**表N.M　見出し**` を与える" +
    " ②中身が本文に散文/箇条書きであるならポインタ `（表N.M）` を外す" +
    " ③表そのものに価値があるなら起こす（CLAUDE.md §2「2軸比較のみ・4列以上禁止」に従う）\n",
);
process.exit(listOnly ? 0 : 1);
