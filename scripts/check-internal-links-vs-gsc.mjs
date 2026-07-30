#!/usr/bin/env node
/**
 * check-internal-links-vs-gsc.mjs — 内部リンクが「GSC が 404/リダイレクトと認識している URL」を
 * 指していないか検査する（オフライン・追跡 SSOT を使う）
 * ---------------------------------------------------------------------------
 * なぜ必要か（2026-07-30 新設）: GSC の「見つかりませんでした(404)」297 件・
 * 「ページにリダイレクトがあります」856 件は、**サイトマップには 1 件も入っていない旧 URL**で、
 * 放置しても登録ページ数には影響しない（実測: 直近 28 日の表示は 404 で 0・redirect で 1）。
 * だが **内部リンクがまだ旧 URL を指している場合だけは実害**（ユーザーが 404 に当たる／
 * Google が旧 URL を再クロールし続ける理由を我々が与え続ける）。
 * 実測ではその残存が 3 件あり、しかも既存の機械チェックはどれも拾っていなかった。
 *
 * この検査が「リダイレクト/404 を減らす」唯一の能動的レバーである。
 * （旧 URL 自体を GSC から消す方法は無い。Google が再クロールをやめるまで数ヶ月〜年単位で残る。
 *   301 を 410 に変えれば「リダイレクト」バケットからは早く外れるが「404」バケットへ移るだけで、
 *   外部被リンクの評価を捨てるリスクがあるため既定では推奨しない。）
 *
 * 判定:
 *   FAIL … 404 リストの slug を指す内部リンク（ただし現在 published なら Google 側が古いだけ＝INFO）
 *   WARN … redirect リストの slug を指す内部リンク（301 で繋がるが直リンクへ更新すべき）
 *   FAIL … SSOT が無く検査できない（検査ゼロを PASS と呼ばない・CLAUDE.md §9）
 *
 * 使い方:
 *   npm run check-internal-links-vs-gsc
 *   npm run check-internal-links-vs-gsc -- --json
 * exit 0=OK / 1=壊れた内部リンクあり or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const SSOT = ".claude/state/metrics/gsc-ui/ssot/urls";
const META = "src/config/doc-meta-index.json";
const SCAN_ROOTS = [".local/r2/posts", "src"];
const WANT_JSON = process.argv.includes("--json");

function loadSsotSlugs(file) {
  const p = join(SSOT, file);
  if (!existsSync(p)) return null;
  const rows = JSON.parse(readFileSync(p, "utf8")).rows ?? [];
  // フラット slug（/docs/xxx で終わる）だけを対象にする。旧階層 URL（/docs/road/road-law/041）は
  // 内部リンクの書式ではないので照合対象外。
  const out = new Set();
  for (const r of rows) {
    const m = String(r.url ?? "").match(/\/docs\/([a-z0-9-]+)\/?(?:[?#].*)?$/);
    if (m) out.add(m[1]);
  }
  return out;
}

function walk(dir, exts, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, exts, acc);
    } else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

const notFound = loadSsotSlugs("notFound--allKnownPages.json");
const redirect = loadSsotSlugs("redirect--allKnownPages.json");

if (notFound == null && redirect == null) {
  const msg =
    "[check-internal-links-vs-gsc] ✗ 検査不成立: GSC UI の SSOT が無い" +
    `（${SSOT}）。先に \`npm run search-growth:audit\` を実行してください。`;
  if (WANT_JSON) console.log(JSON.stringify({ check: "internal-links-vs-gsc", error: msg }, null, 2));
  else console.error(msg);
  process.exit(1);
}

const meta = existsSync(META) ? JSON.parse(readFileSync(META, "utf8")).docs ?? {} : {};
const files = [...walk(SCAN_ROOTS[0], [".mdx", ".md"]), ...walk(SCAN_ROOTS[1], [".tsx", ".ts", ".mdx"])];

/**
 * リンク**元**が公開されているか。未公開ページから未公開ページへのリンクは実害が無い
 * （どちらもライブに出ない＝整合している）ので、そこを赤くしてはいけない。
 * frontmatter の `published:` を直接読む（doc-meta-index は published のみ収録なので不在＝未公開とは限らない）。
 */
function sourceIsPublished(file, cache) {
  if (cache.has(file)) return cache.get(file);
  let pub = true; // src/** の TSX 等はサイト実装＝常に公開扱い
  if (/\.mdx?$/.test(file)) {
    const head = readFileSync(file, "utf8").slice(0, 4000);
    const m = head.match(/^published:\s*(true|false)/m);
    pub = m ? m[1] === "true" : true;
  }
  cache.set(file, pub);
  return pub;
}

const broken = new Map(); // slug -> { kind, files:Set, fromPublished:boolean }
const pubCache = new Map();
let refCount = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/\/docs\/([a-z0-9-]+)/g)) {
    refCount += 1;
    const slug = m[1];
    const is404 = notFound?.has(slug);
    const isRedir = redirect?.has(slug);
    if (!is404 && !isRedir) continue;
    const key = slug;
    const cur = broken.get(key) ?? { slug, kind: is404 ? "404" : "redirect", files: new Set(), fromPublished: false };
    cur.files.add(f.split(sep).slice(-3).join("/"));
    if (sourceIsPublished(f, pubCache)) cur.fromPublished = true;
    broken.set(key, cur);
  }
}

const errors = [];
const warnings = [];
const infos = [];
for (const b of broken.values()) {
  const m = meta[b.slug];
  const livesNow = !!m && m.published === true;
  const where = [...b.files].join(", ");
  if (livesNow) {
    // 現在は公開されている＝GSC のデータが古いだけ。内部リンクは正しい。
    infos.push(`${b.slug}（GSC は ${b.kind} と記録しているが現在 published＝Google 側が古い）: ${where}`);
  } else if (!b.fromPublished) {
    // リンク元も未公開＝ライブに出ないので実害なし。同時公開すればよい（整合している）。
    infos.push(
      `${b.slug}（GSC ${b.kind}・リンク先もリンク元も未公開＝ライブでは 404 にならない。同時公開すれば解消）: ${where}`,
    );
  } else if (b.kind === "404") {
    errors.push(`公開ページから 404 URL への内部リンク: /docs/${b.slug}（リンク先が存在しない）→ ${where}`);
  } else {
    warnings.push(`公開ページからリダイレクト URL への内部リンク: /docs/${b.slug}（301 で繋がるが直リンクへ更新推奨）→ ${where}`);
  }
}

const result = {
  check: "internal-links-vs-gsc",
  scannedFiles: files.length,
  scannedRefs: refCount,
  ssot: { notFound: notFound?.size ?? null, redirect: redirect?.size ?? null },
  errors,
  warnings,
  infos,
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const i of infos) console.log(`[check-internal-links-vs-gsc] INFO ${i}`);
  for (const w of warnings) console.log(`[check-internal-links-vs-gsc] WARN ${w}`);
  for (const e of errors) console.error(`[check-internal-links-vs-gsc] ERROR ${e}`);
  // §9: 検査対象数を必ず出す
  console.log(
    `[check-internal-links-vs-gsc] ${files.length} ファイル / ${refCount} 件の /docs/ 参照を検査` +
      `（GSC 側 404 ${notFound?.size ?? "?"} slug・redirect ${redirect?.size ?? "?"} slug と突合）`,
  );
}

if (errors.length > 0) {
  if (!WANT_JSON) console.error(`\n[check-internal-links-vs-gsc] ✗ 壊れた内部リンク ${errors.length} 件`);
  process.exit(1);
}
if (refCount === 0) {
  if (!WANT_JSON) console.error("\n[check-internal-links-vs-gsc] ✗ /docs/ 参照が 0 件（走査対象の指定が壊れている）");
  process.exit(1);
}
if (!WANT_JSON) console.log(`\n[check-internal-links-vs-gsc] ✓ 壊れた内部リンクなし（WARN ${warnings.length} 件）`);
process.exit(0);
