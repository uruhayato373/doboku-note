#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

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

let anyError = false;
for (const file of files) {
const plan = JSON.parse(readFileSync(file, "utf8"));
const errors = [];
const dates = new Set();
const funnelCounts = {};
const examCounts = {};
let previousFunnel = null;

for (const [index, post] of plan.posts.entries()) {
  const label = `posts[${index}] ${post.date}`;
  if (!post.date.startsWith(`${plan.month}-`)) errors.push(`${label}: 月が不一致`);
  if (dates.has(post.date)) errors.push(`${label}: 同日に複数投稿`);
  dates.add(post.date);
  funnelCounts[post.funnel] = (funnelCounts[post.funnel] ?? 0) + 1;
  examCounts[post.exam] = (examCounts[post.exam] ?? 0) + 1;

  if (post.funnel === "linkless" && post.target !== null) {
    errors.push(`${label}: linklessのtargetはnull`);
  }
  if (post.funnel !== "linkless" && !post.target) {
    errors.push(`${label}: ${post.funnel}にtargetがない`);
  }
  if (["note", "coconala", "brain"].includes(post.funnel) && previousFunnel === "sales") {
    errors.push(`${label}: 販売投稿が連続`);
  }
  previousFunnel = ["note", "coconala", "brain"].includes(post.funnel)
    ? "sales"
    : post.funnel;

  if (post.funnel === "site") {
    const url = new URL(post.target);
    const slug = url.pathname.replace(/^\/docs\//, "");
    if (!docs.has(slug)) errors.push(`${label}: サイトslugが存在しない ${slug}`);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      if (!url.searchParams.get(key)) errors.push(`${label}: ${key}がない`);
    }
  }
  if (post.funnel === "note") {
    const url = new URL(post.target);
    if (url.hostname !== "note.com") errors.push(`${label}: note URLではない`);
  }
  if (post.funnel === "coconala" && !post.target.startsWith("https://coconala.com/services/")) {
    errors.push(`${label}: ココナラURLではない`);
  }
  if (post.funnel === "brain" && !post.target.startsWith("https://brain-market.com/a/")) {
    errors.push(`${label}: Brain URLではない`);
  }
}

// 月の実日数で判定（旧実装は 31 固定＝8月専用だった）
const [y, mo] = plan.month.split("-").map(Number);
const daysInMonth = new Date(y, mo, 0).getDate();
if (plan.posts.length !== daysInMonth || dates.size !== daysInMonth) {
  errors.push(`${plan.month} は ${daysInMonth} 日分必要: posts=${plan.posts.length}, uniqueDates=${dates.size}`);
}

if (errors.length) {
  anyError = true;
  console.error(`[check-x-campaign-plan] NG: ${basename(file)}`);
  for (const error of errors) console.error(`- ${error}`);
} else {
  console.log(`[check-x-campaign-plan] OK: ${basename(file)} ${plan.posts.length}件`);
  console.log(`  exam=${JSON.stringify(examCounts)} funnel=${JSON.stringify(funnelCounts)}`);
}
}
if (anyError) process.exit(1);
