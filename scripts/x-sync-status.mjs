#!/usr/bin/env node
/**
 * x-sync-status.mjs
 *
 * X の予約キュー（Playwright 実ダンプ）と content/sns/x/ 配下の status.json を突合し、
 * 「scheduled_at が過去 かつ X キューに存在しない」→ posted に昇格させる。
 *
 * Usage:
 *   node scripts/x-sync-status.mjs          # sync + 表示
 *   node scripts/x-sync-status.mjs --dry    # 変更せず確認のみ
 *   npm run x-sync-status
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { glob } from "glob";

const ROOT = process.cwd();
const PROFILE_DIR = path.join(ROOT, ".local/playwright-x-profile");
const DRY = process.argv.includes("--dry");
const NOW = new Date();

// ── 1. X キューから予約本文スニペット収集 ───────────────────────────────────
async function dumpScheduledSnippets() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true, channel: "chrome",
    viewport: { width: 1280, height: 900 }, locale: "ja-JP", timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  const snippets = new Set();
  try {
    await page.goto("https://x.com/compose/post/unsent/scheduled", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    let stable = 0, lastSize = -1;
    for (let i = 0; i < 50 && stable < 4; i++) {
      const lines = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]') || document.body;
        return (dlg.innerText || "").split("\n").map(s => s.trim()).filter(s => s.length > 4);
      });
      lines.forEach(l => snippets.add(l));
      await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]') || document.body;
        let best = dlg, bestH = 0;
        dlg.querySelectorAll("div").forEach(d => {
          if (d.scrollHeight > d.clientHeight + 20 && d.clientHeight > bestH) { best = d; bestH = d.clientHeight; }
        });
        best.scrollBy(0, 1200);
      });
      await page.waitForTimeout(700);
      if (snippets.size === lastSize) stable++; else stable = 0;
      lastSize = snippets.size;
    }
  } finally { await ctx.close(); }
  return snippets;
}

// ── 2. status.json 収集 ─────────────────────────────────────────────────────
function loadAllStatuses() {
  const dirs = ["content/sns/x/draft", "content/sns/x/published"];
  const results = [];
  for (const base of dirs) {
    const files = fs.existsSync(path.join(ROOT, base))
      ? fs.readdirSync(path.join(ROOT, base), { withFileTypes: true })
          .filter(d => d.isDirectory() && !d.name.startsWith("_")) // _archive 除外
          .map(d => path.join(ROOT, base, d.name, "status.json"))
          .filter(f => fs.existsSync(f))
      : [];
    for (const f of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(f, "utf-8"));
        const tweets = raw.tweets
          ? Object.entries(raw.tweets).map(([k, v]) => ({ key: k, ...v }))
          : Array.isArray(raw) ? raw.map((v, i) => ({ key: String(i), ...v })) : [];
        results.push({ file: f, raw, tweets });
      } catch { /* skip corrupt */ }
    }
  }
  return results;
}

// ── 3. スニペット突合：本文冒頭15字がキューに含まれるか ─────────────────────
function isInQueue(tweet, snippets) {
  const text = tweet.text || tweet.title || "";
  const needle = text.slice(0, 15).replace(/\s+/g, " ").trim();
  if (!needle) return false;
  for (const s of snippets) { if (s.includes(needle)) return true; }
  return false;
}

// ── main ────────────────────────────────────────────────────────────────────
console.log(`\n🔄 X status sync ${DRY ? "[DRY RUN]" : ""} — ${NOW.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
console.log("📡 X 予約キューをダンプ中（Playwright、ヘッドレス）...");
let snippets;
try {
  snippets = await dumpScheduledSnippets();
  console.log(`   キュー取得: ${snippets.size} 行`);
} catch (e) {
  console.error("❌ Playwright エラー:", e.message);
  process.exit(1);
}

const entries = loadAllStatuses();
let promoted = 0, alreadyPosted = 0, stillScheduled = 0, future = 0, queued = 0, notQueued = 0, manualOnly = 0, missingFromQueue = 0;
const missingList = [];
const promotedList = [];
const queuedList = [];

for (const entry of entries) {
  let dirty = false;
  const tweetsMap = entry.raw.tweets && typeof entry.raw.tweets === "object" && !Array.isArray(entry.raw.tweets)
    ? entry.raw.tweets : null;

  const process_tweet = (tweet, key) => {
    if (tweet.status === "posted") { alreadyPosted++; return; }
    if (tweet.status !== "scheduled" && tweet.status !== "queued") return;
    // X Article など、Xネイティブ予約を使わない枠も日別上限には含めるが、
    // ネイティブ予約キューとの同期対象にはしない。ここで除外しないと、
    // 予約時刻を過ぎただけで未公開の Article を posted へ偽昇格させてしまう。
    if (tweet.manual_only === true) { manualOnly++; return; }
    const scheduledAt = tweet.scheduled_at ? new Date(tweet.scheduled_at) : null;
    if (!scheduledAt) return;
    const inQueue = isInQueue(tweet, snippets);

    if (scheduledAt > NOW) {
      // 未来予約。キューに在れば scheduled→queued へ昇格（偽成功の実査 + 後日 guard の二重誤検出回避）
      if (tweet.status === "scheduled") {
        if (inQueue) {
          if (!DRY) { tweet.status = "queued"; dirty = true; }
          queued++;
          queuedList.push({ file: entry.file, title: tweet.title, at: tweet.scheduled_at });
        } else {
          // status=scheduled かつキュー不在 = まだ publish-x で投入していない計画分（正常）。
          // 偽成功検証は投稿直後にバッチ単位で「投稿数 = queued 昇格数」を突合して行う（§9）。
          notQueued++;
        }
      } else {
        // 旧実装は「既に queued なら実在するはず」と前提を置き、キューを一度も見ていなかった。
        // これは検査ゼロを PASS と呼ぶのと同じで、X 側で予約が消えても（凍結・下書き化・
        // 予約解除・publish の偽成功）ローカルは queued のまま緑になり、投稿が静かに止まる。
        // 実在するので `inQueue` は既に計算済み。使うだけで検査が成立する。
        if (inQueue) {
          future++;
        } else {
          missingFromQueue++;
          missingList.push({ file: entry.file, title: tweet.title, at: tweet.scheduled_at });
        }
      }
      return;
    }

    // 過去予約（送信時刻が過ぎた）→ キューから消えていれば posted
    if (inQueue) {
      stillScheduled++;
    } else {
      if (!DRY) {
        tweet.status = "posted";
        tweet.posted_at = tweet.posted_at || scheduledAt.toISOString();
        dirty = true;
      }
      promoted++;
      promotedList.push({ file: entry.file, title: tweet.title, at: tweet.scheduled_at });
    }
  };

  if (tweetsMap) {
    for (const [k, v] of Object.entries(tweetsMap)) process_tweet(v, k);
  } else if (Array.isArray(entry.raw.tweets)) {
    entry.raw.tweets.forEach((v, i) => process_tweet(v, i));
  }

  if (dirty) {
    entry.raw.updatedAt = NOW.toISOString();
    fs.writeFileSync(entry.file, JSON.stringify(entry.raw, null, 2), "utf-8");
  }
}

console.log(`\n━━━ 結果 ━━━`);
console.log(`  posted に昇格   : ${promoted} 件${DRY ? " (dry: 未書込み)" : ""}`);
console.log(`  queued に昇格    : ${queued} 件${DRY ? " (dry: 未書込み)" : ""}（未来予約をキューで実査）`);
console.log(`  既存 posted     : ${alreadyPosted} 件`);
console.log(`  X キュー残存    : ${stillScheduled} 件`);
console.log(`  既 queued        : ${future} 件（キュー実在を実照合）`);
console.log(`  未投入(計画)     : ${notQueued} 件（status=scheduled・キュー未投入。次バッチで publish 予定）`);
console.log(`  手動公開枠       : ${manualOnly} 件（X Article等。予約キュー同期の対象外）`);
if (queuedList.length) {
  console.log(`\nqueued 昇格（キュー実在を確認・§9 偽成功検証）:`);
  queuedList.forEach(p => console.log(`  📥 ${p.at?.slice(0, 16)}  ${p.title}`));
  console.log(`  → 直前に投稿したバッチ数と queued 昇格数が一致するか確認（不一致＝偽成功）。`);
}
if (missingList.length) {
  console.log(`\n★ queued なのに X キューに不在（＝予約が消えている・投稿が静かに止まる）:`);
  missingList.forEach(p => console.log(`  ⚠ ${p.at?.slice(0, 16)}  ${p.title}`));
  console.log(`  → X 側で予約解除/下書き化/凍結が起きていないか確認し、必要なら再投入する。`);
}
if (promotedList.length) {
  console.log(`\nposted 昇格:`);
  promotedList.forEach(p => console.log(`  ✅ ${p.at?.slice(0, 16)}  ${p.title}`));
}
console.log();
