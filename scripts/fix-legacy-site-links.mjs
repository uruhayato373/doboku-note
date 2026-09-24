#!/usr/bin/env node
/**
 * fix-legacy-site-links.mjs — note 原稿の旧 `https://doboku-note.com/docs/...` リンクを新 URL へ張り替える
 * ---------------------------------------------------------------------------
 * 2026-08-22 の URL 移行後も note 原稿 669 本が旧 URL へ 1,990 本リンクしていた（2026-09-24 集計・DN-0289）。
 * 対応表は `public/_redirects`（`scripts/lib/site-links.mjs` 経由）。UTM などのクエリは保持する。
 *
 * **既定は dry-run**。`--write` のときだけ書き込む（`writeMdxFile` で改行コードを保持）。
 * 原稿を書き換えても note 上の本文は変わらない。再公開は `note-update-body`（ops-write）で別に行い、
 * 未反映の記事は `check-note-republish` が「要再公開」として出す。
 *
 * content/sns は既定の対象にしない。X の status.json は投稿承認の hash を持ち、本文を変えると予約が止まる。
 *
 * CLI:
 *   node scripts/fix-legacy-site-links.mjs                    # content/note を dry-run
 *   node scripts/fix-legacy-site-links.mjs --write            # 書き込む
 *   node scripts/fix-legacy-site-links.mjs --root content/note/技術士総監 --write
 *   node scripts/fix-legacy-site-links.mjs --json             # 機械可読
 * exit: 0 = 完了（対象 0 件を含む） / 1 = 張り替えできない旧リンクが残った / 2 = 対応表が読めない（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readMdxFile, writeMdxFile } from "../.claude/scripts/lib/mdx-io.mjs";
import { loadSiteRoutes, rewriteLegacySiteLinks } from "./lib/site-links.mjs";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const JSON_OUT = args.includes("--json");
const roots = args.flatMap((a, i) => (a === "--root" && args[i + 1] ? [args[i + 1]] : []));
if (roots.length === 0) roots.push("content/note");

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".md")) acc.push(p.split("\\").join("/"));
  }
  return acc;
}

const routes = loadSiteRoutes();
if (!routes.loaded) {
  console.error("[fix-legacy-site-links] ✗ 検査不成立: public/_redirects から旧 /docs の対応表を読めない");
  process.exit(2);
}

const files = roots.flatMap((r) => walk(r));
const changed = [];
const unmapped = [];
let replacedTotal = 0;
for (const f of files) {
  const { raw, eol } = readMdxFile(f);
  const { text, replaced, unmapped: miss } = rewriteLegacySiteLinks(raw, routes);
  for (const m of miss) unmapped.push({ file: f, path: m });
  if (replaced === 0) continue;
  replacedTotal += replaced;
  changed.push({ file: f, replaced });
  if (WRITE) writeMdxFile(f, text, eol);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ mode: WRITE ? "write" : "dry-run", scanned: files.length, changed, replaced: replacedTotal, unmapped }, null, 2));
} else {
  console.log(
    `[fix-legacy-site-links] ${WRITE ? "write" : "dry-run"}: ${files.length} ファイルを走査 / ` +
      `${changed.length} ファイル・${replacedTotal} リンクを${WRITE ? "張り替えた" : "張り替え可能"}（対応表 ${routes.legacy.size} 件）`,
  );
  for (const u of unmapped) console.log(`  [unmapped] ${u.file}  ${u.path}（_redirects に転送先が無い）`);
  if (!WRITE && changed.length) console.log("  書き込むには --write");
}
process.exitCode = unmapped.length ? 1 : 0;
