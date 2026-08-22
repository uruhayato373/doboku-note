#!/usr/bin/env node
/**
 * check-x-campaign-plan.mjs — X 月次キャンペーン計画の機械ゲート
 * ---------------------------------------------------------------------------
 * schemaVersion で本数体制を切り替える:
 *   v1（既定・旧計画）= 1日ちょうど1本・全日
 *   v2（1日3本体制・2026-08-13〜）= 1日ちょうど3本・全日 + スロット/間隔/販売制約
 *
 * v2 で増えた検査（1日3本にすると壊れやすい所を機械で止める）:
 *   - 同一日の投稿間隔 >= MIN_GAP_MIN 分（バースト連投は凍結の主因。x-post-policy §11.2）
 *   - スロット A/B/C の重複なし（朝・昼・夜を1本ずつ）
 *   - 販売 funnel（note/coconala/brain）は 1日1本まで、かつ**スロット C のみ**
 *   - 販売投稿の連続禁止（日をまたぐ隣接も含めて時系列で判定）
 *
 * カタログ整合（v1/v2 共通・2026-08-13 追加）:
 *   送客先が「今も売れる状態か」をカタログ SoT と突合する。
 *   受付終了したココナラ出品や未公開 note へ誘導する計画を、投稿を書く前に止める。
 *     coconala → src/lib/coconala-services.ts の status==='listed'
 *     note     → src/lib/note-magazines.ts の published===true
 *     brain    → src/lib/brain-products.ts の status==='listed'
 *   パーサは check-coconala-wiring / verify-note-magazines の parseSoT と同型（ファイル規約）。
 *
 * exit: 0=健全 / 1=違反 or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

const MIN_GAP_MIN = 60;      // 同一日の投稿間隔の下限（分）
const SALES_FUNNELS = ["note", "coconala", "brain"];
const SLOTS = ["A", "B", "C"];

// 引数省略時は x-campaigns/ の全 *.json を検査する（旧実装は 2026-08 固定＝
// 9月以降のファイルを作っても無検査で素通りしていた。2026-08-12 是正）。
const DIR = ".claude/config/x-campaigns";
const files = process.argv[2]
  ? [process.argv[2]]
  : readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => join(DIR, f)).sort();
if (files.length === 0) {
  console.error("[check-x-campaign-plan] NG: 検査対象 0 ファイル（検査不成立）");
  process.exit(1);
}
const docIndex = JSON.parse(readFileSync("src/config/doc-meta-index.json", "utf8"));
const docs = new Set(Object.keys(docIndex.docs ?? docIndex));

// ── カタログ SoT の読み込み ────────────────────────────────────────────────
/** id → status/url の並び順はファイル規約（check-coconala-wiring.mjs parseCatalog と同型） */
function parseCoconala() {
  const p = "src/lib/coconala-services.ts";
  if (!existsSync(p)) return null;
  const ts = readFileSync(p, "utf8");
  const start = ts.indexOf("const SERVICES_RAW");
  const body = start >= 0 ? ts.slice(start) : ts;
  const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*serviceUrl:\s*'([^']*)'/g;
  const out = new Map();
  let m;
  while ((m = re.exec(body)) !== null) if (m[3]) out.set(m[3], { id: m[1], status: m[2] });
  return out;
}
function parseNote() {
  const p = "src/lib/note-magazines.ts";
  if (!existsSync(p)) return null;
  const ts = readFileSync(p, "utf8");
  const re = /id:\s*'([^']+)',\s*published:\s*(true|false),\s*noteUrl:\s*'([^']*)'/g;
  const out = new Map();
  let m;
  while ((m = re.exec(ts)) !== null) if (m[3]) out.set(m[3], { id: m[1], published: m[2] === "true" });
  return out;
}
function parseBrain() {
  const p = "src/lib/brain-products.ts";
  if (!existsSync(p)) return null;
  const ts = readFileSync(p, "utf8");
  const re = /id:\s*'([^']+)',[\s\S]{0,400}?status:\s*'([^']+)',[\s\S]{0,400}?productUrl:\s*'([^']*)'/g;
  const out = new Map();
  let m;
  while ((m = re.exec(ts)) !== null) if (m[3]) out.set(m[3], { id: m[1], status: m[2] });
  return out;
}
const coconala = parseCoconala();
const noteMags = parseNote();
const brain = parseBrain();
for (const [name, cat] of [["coconala", coconala], ["note", noteMags], ["brain", brain]]) {
  if (!cat || cat.size === 0) {
    console.error(`[check-x-campaign-plan] NG: ${name} カタログを 0 件しか読めなかった（検査不成立）`);
    process.exit(1);
  }
}
/** URL からクエリ・末尾スラッシュを落としてカタログ URL と突合する */
const bare = (u) => u.split("?")[0].replace(/\/$/, "");

let anyError = false;
let totalPosts = 0;
for (const file of files) {
  const plan = JSON.parse(readFileSync(file, "utf8"));
  const v = Number(plan.schemaVersion ?? 1);
  const perDay = v >= 2 ? 3 : 1;
  const errors = [];
  const dates = new Map();      // date → [post]
  const funnelCounts = {};
  const examCounts = {};
  const slotCounts = {};

  for (const [index, post] of plan.posts.entries()) {
    const label = `posts[${index}] ${post.date}${post.time ? " " + post.time : ""}`;
    if (!post.date.startsWith(`${plan.month}-`)) errors.push(`${label}: 月が不一致`);
    if (!dates.has(post.date)) dates.set(post.date, []);
    dates.get(post.date).push(post);
    funnelCounts[post.funnel] = (funnelCounts[post.funnel] ?? 0) + 1;
    examCounts[post.exam] = (examCounts[post.exam] ?? 0) + 1;
    if (post.slot) slotCounts[post.slot] = (slotCounts[post.slot] ?? 0) + 1;

    if (v >= 2) {
      if (!post.time || !/^\d{2}:\d{2}$/.test(post.time)) errors.push(`${label}: time (HH:MM) が無い`);
      if (!SLOTS.includes(post.slot)) errors.push(`${label}: slot は A/B/C のいずれか（実際: ${post.slot}）`);
      if (SALES_FUNNELS.includes(post.funnel) && post.slot !== "C") {
        errors.push(`${label}: 販売投稿(${post.funnel})はスロット C（夜）のみ`);
      }
    }

    if (post.funnel === "linkless" && post.target !== null) {
      errors.push(`${label}: linklessのtargetはnull`);
    }
    const awaitingXArticleUrl = post.funnel === "x-article" && post.awaitingTarget === true;
    if (post.funnel !== "linkless" && !post.target && !awaitingXArticleUrl) {
      errors.push(`${label}: ${post.funnel}にtargetがない`);
    }
    if (post.funnel === "x-article" && post.target) {
      const url = new URL(post.target);
      if (!['x.com', 'twitter.com'].includes(url.hostname)) errors.push(`${label}: X Article URLではない`);
    }

    if (post.funnel === "site" && post.target) {
      const url = new URL(post.target);
      const slug = url.pathname.replace(/^\/docs\//, "");
      if (!docs.has(slug)) errors.push(`${label}: サイトslugが存在しない ${slug}`);
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        if (!url.searchParams.get(key)) errors.push(`${label}: ${key}がない`);
      }
    }
    if (post.funnel === "note" && post.target) {
      const url = new URL(post.target);
      if (url.hostname !== "note.com") errors.push(`${label}: note URLではない`);
      const hit = noteMags.get(bare(post.target));
      if (!hit) errors.push(`${label}: note マガジン/記事がカタログに無い ${bare(post.target)}`);
      else if (!hit.published) errors.push(`${label}: note "${hit.id}" は published:false（未公開へ送客）`);
    }
    if (post.funnel === "coconala" && post.target) {
      if (!post.target.startsWith("https://coconala.com/services/")) {
        errors.push(`${label}: ココナラURLではない`);
      } else {
        const hit = coconala.get(bare(post.target));
        if (!hit) errors.push(`${label}: ココナラ出品がカタログに無い ${bare(post.target)}`);
        else if (hit.status !== "listed") errors.push(`${label}: ココナラ "${hit.id}" は status:${hit.status}（受付終了へ送客）`);
      }
    }
    if (post.funnel === "brain" && post.target) {
      if (!post.target.startsWith("https://brain-market.com/a/")) {
        errors.push(`${label}: Brain URLではない`);
      } else {
        const hit = brain.get(bare(post.target));
        if (!hit) errors.push(`${label}: Brain 商品がカタログに無い ${bare(post.target)}`);
        else if (hit.status !== "listed") errors.push(`${label}: Brain "${hit.id}" は status:${hit.status}`);
      }
    }
  }

  // 販売投稿の連続禁止は「時系列で隣接」で判定する（日をまたぐ隣接も対象）。
  // 旧実装は配列順に依存し、日付順でない計画では取りこぼしていた。
  const chrono = [...plan.posts].sort((a, b) =>
    `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
  for (let i = 1; i < chrono.length; i++) {
    if (SALES_FUNNELS.includes(chrono[i].funnel) && SALES_FUNNELS.includes(chrono[i - 1].funnel)) {
      errors.push(`販売投稿が連続: ${chrono[i - 1].date} ${chrono[i - 1].time ?? ""} → ${chrono[i].date} ${chrono[i].time ?? ""}`);
    }
  }

  // 日単位の検査
  const [y, mo] = plan.month.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  // 月の途中から本数を増やす「増強計画」を検査できるようにする（2026-08 は 8/1-15 が 1日1本の
  // v1 計画で、8/16 以降に +2本/日 を重ねた）。coverage があればその範囲だけを対象にする。
  // ※ 別ファイルの計画との時刻衝突までは見ない。それは x-schedule-guard（全 status.json 横断・
  //    同一分の衝突を BLOCK）が予約直前に見る担当。
  const cov = plan.coverage;
  const covDays = [];
  if (cov) {
    if (!cov.from || !cov.to || !cov.perDay) errors.push("coverage は from / to / perDay が必須");
    else {
      for (let d = new Date(cov.from + "T00:00:00Z"); d <= new Date(cov.to + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
        covDays.push(d.toISOString().slice(0, 10));
      }
    }
  }
  const expectPerDay = cov ? Number(cov.perDay) : perDay;
  for (const [date, posts] of dates) {
    if (cov && !covDays.includes(date)) errors.push(`${date}: coverage(${cov.from}〜${cov.to}) の範囲外`);
    if (posts.length !== expectPerDay) errors.push(`${date}: 1日 ${expectPerDay} 本のはずが ${posts.length} 本`);
    if (v >= 2) {
      const slots = posts.map((p) => p.slot).filter(Boolean);
      if (new Set(slots).size !== slots.length) errors.push(`${date}: スロット重複 ${slots.join(",")}`);
      const mins = posts
        .filter((p) => /^\d{2}:\d{2}$/.test(p.time ?? ""))
        .map((p) => Number(p.time.slice(0, 2)) * 60 + Number(p.time.slice(3)))
        .sort((a, b) => a - b);
      for (let i = 1; i < mins.length; i++) {
        if (mins[i] - mins[i - 1] < MIN_GAP_MIN) {
          errors.push(`${date}: 投稿間隔が ${mins[i] - mins[i - 1]} 分（下限 ${MIN_GAP_MIN} 分・バースト連投は凍結の主因）`);
        }
      }
      const sales = posts.filter((p) => SALES_FUNNELS.includes(p.funnel));
      if (sales.length > 1) errors.push(`${date}: 販売投稿が ${sales.length} 本（1日1本まで）`);
    }
  }
  const expectDays = cov ? covDays.length : daysInMonth;
  const label = cov ? `${cov.from}〜${cov.to}` : plan.month;
  if (dates.size !== expectDays) {
    errors.push(`${label} は ${expectDays} 日分必要: uniqueDates=${dates.size}`);
  }
  if (plan.posts.length !== expectDays * expectPerDay) {
    errors.push(`${label} は ${expectDays * expectPerDay} 本必要（${expectDays}日 × ${expectPerDay}本）: posts=${plan.posts.length}`);
  }

  totalPosts += plan.posts.length;
  if (errors.length) {
    anyError = true;
    console.error(`[check-x-campaign-plan] NG: ${basename(file)} (schemaVersion ${v})`);
    for (const error of errors) console.error(`- ${error}`);
  } else {
    // 表示は「実際に検査した本数/日」を出す。coverage 付き（部分月の増強計画）で
    // schemaVersion 由来の既定値を出すと、2本/日の計画を「1日3本」と誤表示する。
    console.log(`[check-x-campaign-plan] OK: ${basename(file)} v${v} ${plan.posts.length}件（${label} / 1日${expectPerDay}本）`);
    console.log(`  exam=${JSON.stringify(examCounts)} funnel=${JSON.stringify(funnelCounts)}${v >= 2 ? ` slot=${JSON.stringify(slotCounts)}` : ""}`);
  }
}
console.log(`[check-x-campaign-plan] ${files.length} ファイル / 投稿 ${totalPosts} 件を実検査（カタログ: ココナラ${coconala.size} / note${noteMags.size} / Brain${brain.size}）`);
if (anyError) process.exit(1);
