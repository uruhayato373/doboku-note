#!/usr/bin/env node
/**
 * build-figure-provenance.mjs
 *
 * 記事図クロップ 1 枚ごとに「出所ヒント・品質・公開/掲載・次にすべきアクション(needs)」を
 * 既存シグナルを join して算出し .claude/state/figure-provenance.json に恒久化する。
 * 「この図の元は何？何をすべき？」を毎回手で辿らないための土台（provenance system）。
 *
 * 入力（既にあるものを join・二重計算しない）:
 *   - content/site/**\/img/*.{png,webp,jpg}   … 記事図（png/webp は basename で 1 レコード）
 *   - .claude/state/figure-text-audit.json         … 品質(sharp/soft/blurry)・写り込み(leak/prose/...)
 *   - config/figure-sources.json           … 資格別ソース台帳（元素材・再スキャン要否）
 *   - 各記事 article.mdx                            … published / 図の本文参照(掲載)
 *   - .claude/state/quality/figure-review-ledger.json … /figure-quality-loop の目視判定（今の画像のハッシュと一致する記録だけ）
 *
 * needs（次アクション）の決め方:
 *   blurry/soft   → 再クロップでは直らない → rescannable で分岐（rescan / rescan-need-source / rescan-or-svg）
 *   leak(答え漏らし) → recrop-urgent（既存から答えテキストを除いて切り直し）
 *   prose/maybe(写り込み) → recrop
 *   それ以外(sharp+clean) → ok
 *   上書き: manual_needs（手動）→ 判定台帳（ok→ok / needs-source→reextract / source-unavailable→rescan-need-source）
 *
 * Usage: node scripts/build-figure-provenance.mjs [--json | --list <needs>]
 *   --list recrop … 公開×掲載の図のうち needs=recrop のパスを1行1件で出す（対象選び用）
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { articleInfo, referencedExt, servedExt, fileSha, validEntry, needsFromVerdict, LEDGER_FILE } from './lib/figure-review.mjs';

const ROOT = process.cwd();
const POSTS = SITE_CONTENT_ROOT;
const OUT = path.join(ROOT, ".claude", "state", "figure-provenance.json");
const quiet = process.argv.includes("--json");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

const audit = readJson(path.join(ROOT, ".claude", "state", "figure-text-audit.json"));
const sourcesDoc = readJson(path.join(ROOT, datasetPath("config.figure-sources")));
const sources = sourcesDoc?.categories || {};
const manualNeeds = Array.isArray(sourcesDoc?.manual_needs) ? sourcesDoc.manual_needs : [];
const reviewLedger = readJson(path.join(ROOT, LEDGER_FILE));
const resolveSrc = (cat) => {
  let s = sources[cat];
  if (s && s._alias) s = sources[s._alias];
  return s || null;
};

const IMG_RE = /\/img\/[^/]+\.(png|webp|jpg|jpeg)$/i;
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

// 記事(slug=cat/localSlug)ごとに MDX を 1 回読み published / content をキャッシュ（判定は figure-review.mjs と共通）。
const artCache = new Map();
const article = (slug) => articleInfo(POSTS, slug, artCache);

const all = walk(POSTS)
  .map((p) => path.relative(POSTS, p).split(path.sep).join("/"))
  .filter((rel) => IMG_RE.test(rel) && !/\/ogp\.(png|webp)$/i.test(rel));

const seenBase = new Set();
const figures = {};
const summary = {};
for (const rel of all) {
  const baseRel = rel.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  if (seenBase.has(baseRel)) continue; // png/webp ペアは 1 レコード
  seenBase.add(baseRel);

  const parts = path.dirname(baseRel).split("/"); // [cat, localSlug, img]
  const category = parts[0];
  const slug = parts.slice(0, 2).join("/");
  const name = baseRel.split("/").pop();
  const art = article(slug);
  const refExt = art.found ? referencedExt(art.content, name) : null;
  const referenced = refExt !== null;

  const a = audit?.figures?.[baseRel] || {};
  const quality = a.quality || "unknown";
  const textStatus = a.status || "unaudited";
  const src = resolveSrc(category);
  const rescannable = src?.rescannable || "na";
  const yearMatch = name.match(/(?:^|[-_])([rh]\d{2})(?:[-_]|$|[a-z])/i);
  const year = yearMatch ? yearMatch[1].toLowerCase() : null;

  // needs（次アクション）
  let needs;
  if (quality === "blurry" || quality === "soft") {
    needs = rescannable === "true" ? "rescan" : rescannable === "needs-source" ? "rescan-need-source" : "rescan-or-svg";
  } else if (textStatus === "leak") {
    needs = "recrop-urgent";       // 答え漏らし＝最優先
  } else if (textStatus === "writein") {
    needs = "recrop";              // 問題文/選択肢の写り込み（高精度）
  } else if (textStatus === "maybe") {
    needs = "recrop-review";       // 句点あり but QA構造なし＝凡例かも→要目視
  } else {
    needs = "ok";
  }

  // per-figure 手動上書き（機械監査で検出不能な欠陥＝見切れ等。baseRel 末尾一致）
  const manual = manualNeeds.find((m) => baseRel === m.figure || baseRel.endsWith("/" + m.figure) || baseRel.endsWith(m.figure));
  const manualReason = manual ? manual.reason || null : null;
  if (manual) needs = manual.needs;

  // /figure-quality-loop の目視判定（今の画像のハッシュと一致する記録だけ効く＝差し替え後の画像を素通りさせない）
  const servedAt = servedExt(path.join(POSTS, baseRel), refExt);
  const reviewed = servedAt ? validEntry(reviewLedger, baseRel, fileSha(path.join(POSTS, `${baseRel}.${servedAt}`))) : null;
  if (reviewed) needs = needsFromVerdict(reviewed.verdict) ?? needs;

  figures[baseRel] = {
    category,
    slug,
    year,
    published: art.published,
    referenced,
    quality,
    sharpness: a.sharpness ?? null,
    textStatus,
    source_dir: src?.source_dir || null,
    figure_origin: src?.figure_origin || "unknown",
    rescannable,
    needs,
    ...(manualReason ? { manualReason } : {}),
    ...(reviewed ? { reviewVerdict: reviewed.verdict, reviewReason: reviewed.reason } : {}),
  };
  summary[needs] = (summary[needs] || 0) + 1;
}

const payload = {
  generated_at: new Date().toISOString(),
  note: "図provenance。needs=次アクション。真実源: figure-sources.json(台帳)+figure-text-audit.json(品質)。再生成可。",
  figure_count: Object.keys(figures).length,
  summary,
  figures,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

// --list <needs>: 公開×掲載の図のうち needs が一致するものを1行1件で出す（対象選びは機械側で行う）
const listIdx = process.argv.indexOf("--list");
if (listIdx >= 0) {
  const want = process.argv[listIdx + 1];
  const hits = Object.entries(figures).filter(([, f]) => f.published && f.referenced && f.needs === want);
  hits.forEach(([rel]) => console.log(rel));
  console.error(`[build-figure-provenance --list ${want}] 公開×掲載 ${hits.length} 件 / 全 ${payload.figure_count} 図を検査`);
} else if (!quiet) {
  console.log(`[build-figure-provenance] ${payload.figure_count} 図 → ${path.relative(ROOT, OUT)}`);
  console.log("  needs 別:", Object.entries(summary).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" / "));
  // 優先（公開×掲載）の needs 内訳
  const live = Object.values(figures).filter((f) => f.published && f.referenced && f.needs !== "ok");
  const liveByNeed = {};
  live.forEach((f) => (liveByNeed[f.needs] = (liveByNeed[f.needs] || 0) + 1));
  console.log("  うち公開×掲載(=ライブで要改善):", Object.entries(liveByNeed).map(([k, v]) => `${k}:${v}`).join(" / ") || "なし");
}
