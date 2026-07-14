#!/usr/bin/env node
/**
 * x-thread-replies.mjs
 *
 * 予約スレッドのリプライランナー。
 *
 * 背景: X のネイティブ予約はスレッド非対応（2026-07-14 実機プローブ:
 * composer に tweetTextarea_1 を追加すると scheduleOption が aria-disabled=true になる）。
 * そのため publish-x.ts は [thread] ツイートを「ヘッドのみ予約」し、リプライ本文を
 * status.json の `thread: { parts, replies_posted_at: null }` に記録する。
 * 本スクリプトは予約時刻を過ぎた pending スレッドを見つけ、ライブになったヘッドツイートを
 * 自分のプロフィールから特定してリプライをぶら下げる（Yuri 型 2 連投の完成形）。
 *
 * リプライは数十分〜数時間遅れても自然（自己リプライは通常運用）。厳密な時刻同期は不要。
 *
 * Usage:
 *   node scripts/x-thread-replies.mjs             # --list と同じ（pending 一覧）
 *   node scripts/x-thread-replies.mjs --list      # 予約時刻経過済みの未処理スレッドを列挙
 *   node scripts/x-thread-replies.mjs --run       # 実行（ヘッド特定→リプライ投稿→status 更新）
 *   node scripts/x-thread-replies.mjs --run --dry-run  # ヘッド特定まで（投稿しない）
 *
 * 運用: publish-x で予約したスレッドがある週は、各ヘッドの予約時刻経過後（当日中で可）に
 *       `--run` を1回叩く。凍結回避の観点から cron 常駐はせず人間トリガーで回す（policy §11.3）。
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRAFTS = ["docs/sns/x/draft", "docs/sns/x/published"].map((d) => path.join(ROOT, d));
const PROFILE = path.join(ROOT, ".local/playwright-x-profile");
const DEBUG_DIR = path.join(ROOT, ".local/playwright-x-debug");
const ACCOUNT = "doboku373"; // 運用アカウント（x-post-policy §2）

const args = process.argv.slice(2);
const RUN = args.includes("--run");
const DRY = args.includes("--dry-run");

// ─── pending スレッド収集 ─────────────────────────────
function collectPending() {
  const out = [];
  for (const base of DRAFTS) {
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      if (name.startsWith("_") || name.startsWith(".")) continue;
      const f = path.join(base, name, "status.json");
      if (!fs.existsSync(f)) continue;
      let data;
      try { data = JSON.parse(fs.readFileSync(f, "utf-8")); } catch { continue; }
      for (const [num, t] of Object.entries(data.tweets || {})) {
        if (!t.thread || !Array.isArray(t.thread.parts) || t.thread.parts.length === 0) continue;
        if (t.thread.replies_posted_at) continue; // 処理済み
        const at = t.scheduled_at || t.posted_at;
        if (!at) continue;
        const due = new Date(at).getTime() <= Date.now();
        out.push({ statusPath: f, draft: name, num, title: t.title, headText: t.text || "", scheduled_at: at, due, parts: t.thread.parts });
      }
    }
  }
  return out;
}

function normalize(s) {
  return (s || "").replace(/https?:\/\/\S+/g, "").replace(/[\s　]+/g, "").trim();
}

// ─── リプライ投稿（1スレッド分）────────────────────────
async function postReplies(page, item) {
  const headKey = normalize(item.headText).slice(0, 30);
  if (!headKey) { console.error(`  🚨 head 本文が status.json にありません（text フィールド必須）`); return false; }

  // 自分のプロフィールからヘッドツイートを特定
  await page.goto(`https://x.com/${ACCOUNT}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  let headUrl = null;
  for (let scroll = 0; scroll < 6 && !headUrl; scroll++) {
    headUrl = await page.evaluate((key) => {
      const norm = (s) => (s || "").replace(/https?:\/\/\S+/g, "").replace(/[\s　]+/g, "").trim();
      for (const art of document.querySelectorAll("article")) {
        const textEl = art.querySelector('[data-testid="tweetText"]');
        if (!textEl) continue;
        if (norm(textEl.innerText).startsWith(key.slice(0, 25))) {
          const link = art.querySelector('a[href*="/status/"]');
          if (link) return link.href.split("?")[0];
        }
      }
      return null;
    }, headKey);
    if (!headUrl) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(1500); }
  }

  if (!headUrl) {
    console.error(`  🚨 ヘッドツイートが見つかりません（未配信 or 削除済み？）: "${headKey.slice(0, 20)}…"`);
    return false;
  }
  console.log(`  🎯 ヘッド特定: ${headUrl}`);
  if (DRY) { console.log("  🧪 dry-run: リプライ投稿はスキップ"); return false; }

  // 各 part を順にリプライ（2本目以降は直前リプライにぶら下げてチェーン化）
  let replyTo = headUrl;
  for (let i = 0; i < item.parts.length; i++) {
    const part = item.parts[i];
    await page.goto(replyTo, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);

    const box = page.locator('[data-testid="tweetTextarea_0"]').first();
    try { await box.waitFor({ state: "visible", timeout: 10000 }); } catch {
      console.error(`  🚨 リプライ欄が見つかりません: ${replyTo}`);
      await screenshot(page, `thread-reply-box-missing`);
      return false;
    }
    await box.click();
    await page.waitForTimeout(400);
    await page.keyboard.insertText(part);
    await page.waitForTimeout(1000);
    const len = (await box.innerText().catch(() => "")).replace(/\s+/g, "").length;
    if (len === 0) { console.error(`  🚨 リプライ本文の入力失敗`); await screenshot(page, `thread-reply-empty`); return false; }

    // 投稿（Ctrl+Enter）→ 欄が空に戻る/消えるのを確認（偽成功防止）
    await page.keyboard.press("ControlOrMeta+Enter");
    let posted = false;
    for (let w = 0; w < 16; w++) {
      await page.waitForTimeout(500);
      const remain = (await box.innerText().catch(() => "")).replace(/\s+/g, "").length;
      if (remain === 0) { posted = true; break; }
    }
    if (!posted) { console.error(`  🚨 リプライ投稿を確認できません`); await screenshot(page, `thread-reply-not-posted`); return false; }
    console.log(`  ✅ リプライ ${i + 1}/${item.parts.length} 投稿OK`);
    await page.waitForTimeout(2500);

    // 次の part は今投稿したリプライにぶら下げる: ページ再読込して自分の当該リプライを探す
    if (i + 1 < item.parts.length) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      const partKey = normalize(part).slice(0, 25);
      const next = await page.evaluate((key) => {
        const norm = (s) => (s || "").replace(/https?:\/\/\S+/g, "").replace(/[\s　]+/g, "").trim();
        for (const art of document.querySelectorAll("article")) {
          const textEl = art.querySelector('[data-testid="tweetText"]');
          if (textEl && norm(textEl.innerText).startsWith(key)) {
            const link = art.querySelector('a[href*="/status/"]');
            if (link) return link.href.split("?")[0];
          }
        }
        return null;
      }, partKey);
      if (!next) { console.error(`  🚨 直前リプライの URL を特定できずチェーン継続不可`); return false; }
      replyTo = next;
    }
  }
  return true;
}

async function screenshot(page, label) {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({ path: path.join(DEBUG_DIR, `${ts}_${label}.png`), fullPage: true }).catch(() => {});
}

function markDone(item) {
  const data = JSON.parse(fs.readFileSync(item.statusPath, "utf-8"));
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00");
  data.tweets[item.num].thread.replies_posted_at = nowJst;
  data.updated_at = nowJst;
  fs.writeFileSync(item.statusPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  📝 status.json 更新: ${item.draft} Tweet ${item.num} replies_posted_at=${nowJst}`);
}

// ─── main ─────────────────────────────────────────────
const pending = collectPending();
const due = pending.filter((p) => p.due);

console.log(`🧵 x-thread-replies — pending スレッド: ${pending.length} 件（予約時刻経過済み: ${due.length} 件）`);
for (const p of pending) {
  console.log(`  ${p.due ? "⏰ DUE" : "🕒 未来"}  [${p.draft}] Tweet ${p.num} ${p.title}（${p.scheduled_at}・リプライ${p.parts.length}本）`);
}

if (!RUN) {
  if (due.length) console.log(`\n実行するには: node scripts/x-thread-replies.mjs --run`);
  process.exit(0);
}
if (due.length === 0) { console.log("実行対象なし"); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: "chrome", ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 1000 },
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = ctx.pages()[0] || (await ctx.newPage());

let ok = 0, ng = 0;
for (const item of due) {
  console.log(`\n━━━ [${item.draft}] Tweet ${item.num}: ${item.title} ━━━`);
  const done = await postReplies(page, item);
  if (done) { markDone(item); ok++; } else { ng++; }
}
await ctx.close();
console.log(`\n完了: 成功 ${ok} / 失敗 ${ng}${DRY ? "（dry-run）" : ""}`);
process.exit(ng > 0 ? 1 : 0);
