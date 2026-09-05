#!/usr/bin/env node
/**
 * x-schedule-guard.mjs
 *
 * X 予約投稿の「再発防止ゲート」。**予約を実行する前に必ず通す門番**。
 * SSOT＝content/sns/x/ 配下の全 status.json（tweet ごとに status / scheduled_at / text）を読み、
 * 凍結リスク（x-post-policy §11）と二重投稿事故をブロック判定する。
 *
 * 検査（BLOCK = exit 1、WARN = 表示のみ）:
 *   1. 同時刻衝突   : 同じ scheduled_at(分精度) に2件以上               → BLOCK
 *                     （古い予約が残ったまま同枠に再予約 = あなたが踏んだ二重投稿の直接原因）
 *   2. near-duplicate: 正規化トライグラム Jaccard 類似度がしきい値超     → BLOCK
 *                     （§11.1 同一テンプレ反復 = 前回凍結カテゴリ「spam」の本丸）
 *   3. 1日上限超     : 1日の予約が --max-per-day(既定3) を超える         → BLOCK
 *   4. 時刻ジッタ無  : 毎日まったく同一 HH:MM に固定（機械的等間隔列）   → WARN（§11.2）
 *   5. 同一URL反復   : 同じ /docs/ URL を多数の予約に貼る                → WARN（§11.1）
 *   --queue          : X 実キュー(Playwright)もダンプし、予約予定の本文が
 *                      既にキューに存在 → BLOCK（実体での二重投稿検出）
 *
 * Usage:
 *   node scripts/x-schedule-guard.mjs               # SSOT 内のみ（高速・Playwright不要）
 *   node scripts/x-schedule-guard.mjs --queue       # X 実キューとも突合（要ログイン済プロファイル）
 *   node scripts/x-schedule-guard.mjs --max-per-day 2
 *   node scripts/x-schedule-guard.mjs --dup 0.55    # near-dup BLOCK しきい値（既定 0.62）
 *   npm run x-schedule-guard
 */
import fs from "fs";
import path from "path";
import { resolveProfileDir } from "./lib/playwright-auth-profile.mjs";

const ROOT = process.cwd();
const ARGV = process.argv.slice(2);
const flag = (name, def) => {
  const i = ARGV.indexOf(name);
  return i >= 0 && ARGV[i + 1] ? ARGV[i + 1] : def;
};
const WITH_QUEUE = ARGV.includes("--queue");
const MAX_PER_DAY = Number(flag("--max-per-day", "3"));
const DUP_BLOCK = Number(flag("--dup", "0.62"));
const DUP_WARN = 0.45;
const NOW = new Date();

const JST = t => new Date(t).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo",
  month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit" });
const dayKey = t => new Date(t).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit" });
const hhmm = t => new Date(t).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo",
  hour: "2-digit", minute: "2-digit" });
const minuteKey = t => new Date(t).toISOString().slice(0, 16); // 分精度

// ── SSOT 台帳を読む ────────────────────────────────────────────────────────
function loadTweets() {
  const bases = ["content/sns/x/draft", "content/sns/x/published"];
  const out = [];
  for (const base of bases) {
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith("_")) continue; // _archive 等（旧アカウント退避）は除外
      const f = path.join(dir, name, "status.json");
      if (!fs.existsSync(f)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(f, "utf-8"));
        const list = raw.tweets
          ? (Array.isArray(raw.tweets) ? raw.tweets : Object.values(raw.tweets))
          : [];
        list.forEach(t => out.push({ draft: name, ...t }));
      } catch { /* skip corrupt */ }
    }
  }
  return out;
}

// ── near-duplicate 検出（正規化 → 文字トライグラム Jaccard）───────────────
function normalize(text) {
  return (text || "")
    .replace(/https?:\/\/\S+/g, " ")     // URL 除去
    .replace(/#\S+/g, " ")               // ハッシュタグ除去
    .replace(/[0-9０-９]+/g, "#")         // 数字を正規化（カウントダウンの日数差を無視）
    .replace(/\s+/g, "")                 // 空白除去
    .toLowerCase();
}
function trigrams(s) {
  const g = new Set();
  for (let i = 0; i < s.length - 2; i++) g.add(s.slice(i, i + 3));
  return g;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── main ───────────────────────────────────────────────────────────────────
const all = loadTweets();
// active = まだ送信前の未来予約（scheduled=未投入 + queued=キュー投入済）。衝突/near-dup/上限の判定対象。
const active = all
  .filter(t => (t.status === "scheduled" || t.status === "queued") && t.scheduled_at && new Date(t.scheduled_at) >= NOW)
  .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
const future = active; // 以降の衝突/near-dup/上限/ジッタ/URL 判定は active 全体で行う
const nScheduled = active.filter(t => t.status === "scheduled").length;
const nQueued = active.filter(t => t.status === "queued").length;
const recentPosted = all.filter(t => t.status === "posted" && t.posted_at &&
  (NOW - new Date(t.posted_at)) <= 14 * 24 * 3600 * 1000);

console.log(`\n🛡  X 予約ゲート — ${NOW.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
console.log(`   未来予約: ${active.length}件（未投入 scheduled=${nScheduled} / キュー投入済 queued=${nQueued}）  直近14日投稿済: ${recentPosted.length}件`);
console.log(`   しきい値: near-dup BLOCK ≥${DUP_BLOCK} / WARN ≥${DUP_WARN}  1日上限 ${MAX_PER_DAY}本\n`);

const blocks = [];
const warns = [];

// 1. 同時刻衝突 -------------------------------------------------------------
const bySlot = {};
for (const t of future) (bySlot[minuteKey(t.scheduled_at)] ??= []).push(t);
for (const [slot, items] of Object.entries(bySlot)) {
  if (items.length > 1) {
    blocks.push(`同時刻衝突 ${JST(items[0].scheduled_at)} に ${items.length}件: ` +
      items.map(t => `${t.draft}/${(t.title || t.text || "").slice(0, 20)}`).join(" | "));
  }
}

// 2. near-duplicate ---------------------------------------------------------
const grams = future.map(t => ({ t, g: trigrams(normalize(t.text || t.title)) }));
const postedGrams = recentPosted.map(t => ({ t, g: trigrams(normalize(t.text || t.title)) }));
for (let i = 0; i < grams.length; i++) {
  // 予約 × 予約
  for (let j = i + 1; j < grams.length; j++) {
    const sim = jaccard(grams[i].g, grams[j].g);
    if (sim >= DUP_BLOCK) {
      blocks.push(`near-dup ${(sim * 100).toFixed(0)}% : ` +
        `[${grams[i].t.draft}] "${(grams[i].t.text || grams[i].t.title || "").slice(0, 28)}" ≒ ` +
        `[${grams[j].t.draft}] "${(grams[j].t.text || grams[j].t.title || "").slice(0, 28)}"`);
    } else if (sim >= DUP_WARN) {
      warns.push(`類似 ${(sim * 100).toFixed(0)}% : [${grams[i].t.draft}] ≒ [${grams[j].t.draft}] ` +
        `"${(grams[i].t.text || grams[i].t.title || "").slice(0, 24)}"`);
    }
  }
  // 予約 × 直近投稿済（過去と同じ文面の再投稿も spam）
  for (const p of postedGrams) {
    const sim = jaccard(grams[i].g, p.g);
    if (sim >= DUP_BLOCK) {
      blocks.push(`near-dup(投稿済と) ${(sim * 100).toFixed(0)}% : ` +
        `[${grams[i].t.draft}] "${(grams[i].t.text || grams[i].t.title || "").slice(0, 28)}"`);
    }
  }
}

// 3. 1日上限 ----------------------------------------------------------------
const byDay = {};
for (const t of future) (byDay[dayKey(t.scheduled_at)] ??= []).push(t);
for (const [day, items] of Object.entries(byDay)) {
  if (items.length > MAX_PER_DAY) {
    blocks.push(`1日上限超 ${day}: ${items.length}件（上限 ${MAX_PER_DAY}）`);
  }
}

// 4. 時刻ジッタ無 -----------------------------------------------------------
const times = future.map(t => hhmm(t.scheduled_at));
const uniqTimes = new Set(times);
if (future.length >= 4 && uniqTimes.size <= Math.max(2, Math.ceil(future.length / 7))) {
  warns.push(`時刻ジッタ不足: 予約時刻が ${[...uniqTimes].join(",")} に固定気味。` +
    `±30〜90分ずらして機械的等間隔を避ける（§11.2）`);
}

// 5. 同一URL反復 ------------------------------------------------------------
const urlCount = {};
for (const t of future) {
  const m = (t.text || "").match(/\/docs\/[a-z0-9-]+/gi) || [];
  m.forEach(u => (urlCount[u] = (urlCount[u] || 0) + 1));
}
for (const [u, c] of Object.entries(urlCount)) {
  if (c >= 3) warns.push(`同一URL反復: ${u} を ${c}件の予約に貼付（一部のみに限定、§11.1）`);
}

// 6. X 実キュー突合（--queue）-----------------------------------------------
if (WITH_QUEUE) {
  console.log("📡 X 予約キューをダンプ中（Playwright, headless）...");
  try {
    const { chromium } = await import("playwright");
    const PROFILE_DIR = resolveProfileDir("x", { cwd: ROOT, repoRoot: ROOT });
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
      let stable = 0, last = -1;
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
        if (snippets.size === last) stable++; else stable = 0;
        last = snippets.size;
      }
    } finally { await ctx.close(); }
    console.log(`   キュー取得: ${snippets.size} 行`);
    // 未投入(scheduled)のみ照合。queued は既にキュー投入済＝在って当然なので除外（後日 run の二重誤検出回避）。
    for (const t of future.filter(t => t.status === "scheduled" && t.manual_only !== true)) {
      const needle = (t.text || t.title || "").slice(0, 15).replace(/\s+/g, " ").trim();
      if (!needle) continue;
      for (const s of snippets) {
        if (s.includes(needle)) {
          blocks.push(`実キュー二重 : [${t.draft}] "${needle}…" は status=scheduled なのに既にX予約キューに存在。` +
            `再予約すると同枠二重投稿になる（x-sync-status で queued へ昇格させるか、この予約を外す）`);
          break;
        }
      }
    }
  } catch (e) {
    blocks.push(`キュー突合に失敗（Playwrightエラー: ${e.message}）。--queue 無しの結果は信用できるが実体未検証`);
  }
}

// ── 結果 ─────────────────────────────────────────────────────────────────
if (warns.length) {
  console.log(`\n⚠ WARN (${warns.length})`);
  warns.forEach(w => console.log(`   - ${w}`));
}
if (blocks.length) {
  console.log(`\n⛔ BLOCK (${blocks.length}) — 予約してはいけない`);
  blocks.forEach(b => console.log(`   ✗ ${b}`));
  console.log(`\n→ 上記を解消してから再実行。文面は x-post-writer で差し替え、時刻は重複/固定を解消する。\n`);
  process.exit(1);
}
console.log(`\n✅ ゲート通過 — 予約してよい（WARN は確認のうえ自己判断）\n`);
