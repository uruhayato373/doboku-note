#!/usr/bin/env node
/**
 * x-schedule-view.mjs
 *
 * content/sns/x/ 配下の全 status.json を読んで投稿スケジュールを俯瞰する。
 * Playwright 不要・瞬時実行。
 *
 * Usage:
 *   node scripts/x-schedule-view.mjs         # 今後7日 + サマリ
 *   node scripts/x-schedule-view.mjs --all   # 全期間
 *   npm run x-schedule-view
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const ALL = process.argv.includes("--all");
const NOW = new Date();
const JST = t => new Date(t).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo",
  month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit" });
const dateKey = t => new Date(t).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit" });

// 全 status.json を読む
const bases = ["content/sns/x/draft", "content/sns/x/published"];
const all = [];
for (const base of bases) {
  const baseDir = path.join(ROOT, base);
  if (!fs.existsSync(baseDir)) continue;
  for (const name of fs.readdirSync(baseDir)) {
    if (name.startsWith("_")) continue; // _archive 等（旧アカウント退避）は除外
    const f = path.join(baseDir, name, "status.json");
    if (!fs.existsSync(f)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(f, "utf-8"));
      const tweets = raw.tweets
        ? (typeof raw.tweets === "object" && !Array.isArray(raw.tweets)
            ? Object.values(raw.tweets) : raw.tweets)
        : [];
      tweets.forEach(t => all.push({ draft: name, ...t }));
    } catch { /* skip */ }
  }
}

// 集計（scheduled=未投入 / queued=キュー投入済 をまとめて「予約」として扱う）
const posted   = all.filter(t => t.status === "posted");
const scheduled = all.filter(t => (t.status === "scheduled" || t.status === "queued") && t.scheduled_at);
const future   = scheduled.filter(t => new Date(t.scheduled_at) >= NOW)
                          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
const WINDOW   = ALL ? Infinity : 7 * 24 * 3600 * 1000;
const view     = future.filter(t => new Date(t.scheduled_at) - NOW <= WINDOW);

// 日付ごとにグループ
const byDay = {};
for (const t of view) {
  const k = dateKey(t.scheduled_at);
  (byDay[k] ??= []).push(t);
}

console.log(`\n📅 X 投稿スケジュール — ${NOW.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
console.log(`   投稿済: ${posted.length}件  予約中: ${scheduled.length}件  表示範囲: ${ALL ? "全期間" : "今後7日"}\n`);

for (const [day, items] of Object.entries(byDay).sort()) {
  const isToday = day === dateKey(NOW.toISOString());
  const label = isToday ? `▶ ${day}（今日）` : `  ${day}`;
  console.log(label);
  for (const t of items.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))) {
    const time = new Date(t.scheduled_at).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
    const title = (t.title || "").slice(0, 44);
    console.log(`    ${time}  ${title}`);
  }
}

// 空き確認（今後7日で1日2件未満の日）
if (!ALL) {
  const gaps = [];
  for (let d = 0; d < 7; d++) {
    const dt = new Date(NOW); dt.setDate(dt.getDate() + d);
    const k = dateKey(dt.toISOString());
    const cnt = (byDay[k] || []).length;
    if (cnt === 0) gaps.push(`${k}（0件）`);
    else if (cnt === 1) gaps.push(`${k}（1件のみ）`);
  }
  if (gaps.length) {
    console.log(`\n⚠ 投稿が少ない日: ${gaps.join("  ")}`);
  } else {
    console.log(`\n✅ 今後7日はすべて2件以上確保`);
  }
}

// 終了日
if (future.length) {
  const last = future[future.length - 1];
  console.log(`\n最終予約: ${JST(last.scheduled_at)}  "${(last.title || "").slice(0, 40)}"`);
}
console.log();
