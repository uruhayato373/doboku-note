#!/usr/bin/env node
// verify-ig-status.mjs — IG ローカル SoT(posted.json/status.json) ↔ ライブ公開状態 の照合 reconciler。
//
// 背景（再発防止の対象）: 手動投稿のあと posted.json を残し忘れる/draft のまま放置するドリフトが
//   頻発する（2026-06-25、keyword-packs 18件中 6件が未記録・1件 draft 誤記録・削除済み黒背景の
//   旧 URL が記録に残存）。`ig-status.mjs` はローカルしか見ず検知できなかった。本スクリプトは
//   ライブの IG グリッド＋プランナーと突合し、何がドリフトしているかを分類して出す（read-only）。
//
// 設計: verify-note-status.mjs（note 版 reconciler）の IG 版。投稿も削除もしない＝検知と報告のみ。
//   実際の是正/予約は `/ig-reconcile` スキルが operator 確認のうえ行う。
//
// 真実源: アカウントハンドルは .claude/config/ig-account.json（@dobokunotecom）。
// 前提: Playwright + ログイン済み永続プロファイル .local/playwright-ig-bs-profile が必要。
//   ローカル実行限定（会社 PC のプロキシ下では外部到達不可・[[measurement-incidents]] 参照）。
//
// 使い方:
//   node scripts/verify-ig-status.mjs               # 全パック照合（人間向けサマリ）
//   node scripts/verify-ig-status.mjs --json        # JSON で stdout 出力
//   node scripts/verify-ig-status.mjs --exam=cem    # 試験で絞る（cem / civil-1 / civil-2 ...）
//   node scripts/verify-ig-status.mjs --no-planner  # プランナー読取をスキップ（高速・予約確認なし）
//   node scripts/verify-ig-status.mjs --max=60      # ライブ caption を取得する最大投稿数（既定 60）
//
// exit code: 0 = ドリフトなし / 2 = ドリフトあり（published_UNrecorded / draft_misrecorded /
//   recorded_but_gone / anomaly のいずれかが 1 件以上）。network 失敗は 1。

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { IG_DIR, walkPacks, packInfo, readPostedRaw } from "./ig-status.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes("--json");
const NO_PLANNER = argv.includes("--no-planner");
const EXAM = (argv.find((a) => a.startsWith("--exam=")) || "").split("=")[1] || null;
const MAX = Number((argv.find((a) => a.startsWith("--max=")) || "").split("=")[1]) || 60;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };

// ─── アカウント SSOT ───────────────────────────────────────────
function loadAccount() {
  const p = join(ROOT, ".claude/config/ig-account.json");
  if (!existsSync(p)) {
    console.error("[verify-ig-status] .claude/config/ig-account.json が見つかりません（アカウント SSOT）");
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

// caption の先頭行を正規化（記号/空白を除き先頭 24 文字）。ローカル caption.txt とライブ og:title の突合キー。
function normHead(s) {
  if (!s) return "";
  const first = String(s).split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
  return first.replace(/[\s　・「」（）()【】、。:：!！?？📋✅▶#＃]/g, "").slice(0, 24);
}

// ─── ローカルパック収集 ────────────────────────────────────────
function captionHead(packDir) {
  for (const rel of ["carousel/caption.txt", "caption.txt"]) {
    const p = join(packDir, rel);
    if (existsSync(p)) return normHead(readFileSync(p, "utf8"));
  }
  return "";
}
function shortcodeOf(url) {
  const m = String(url || "").match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
function localPacks() {
  return walkPacks(IG_DIR)
    .map((dir) => {
      const info = packInfo(dir);
      if (EXAM && info.exam !== EXAM) return null;
      const postedRaw = readPostedRaw(dir);
      const carouselUrl = postedRaw?.carousel?.url || (postedRaw?.url ?? null);
      // status.json（schema A: {carousel:{status,scheduled_at}} / schema B: {carousel:"draft",posted}）
      let statusRaw = null;
      const sp = join(dir, "status.json");
      if (existsSync(sp)) { try { statusRaw = JSON.parse(readFileSync(sp, "utf8")); } catch {} }
      const carStatus = statusRaw?.carousel;
      const scheduled = typeof carStatus === "object" && carStatus?.status === "scheduled" ? carStatus.scheduled_at : null;
      const draftFlag = carStatus === "draft" || statusRaw?.posted === false;
      const hasContent = existsSync(join(dir, "carousel/caption.txt")) || existsSync(join(dir, "caption.txt"));
      return {
        rel: info.rel, head: captionHead(dir),
        recordedShortcode: shortcodeOf(carouselUrl), recordedUrl: carouselUrl,
        scheduledAt: scheduled, draftFlag, hasContent,
      };
    })
    .filter(Boolean)
    .filter((p) => p.hasContent || p.recordedShortcode); // 投稿素材か記録を持つパックのみ
}

// 投稿が現存するか直接チェック（「ご利用いただけません」= 削除/非公開）。記録済み shortcode は
// グリッド走査の取りこぼし（遅延ロードで全件は載らない）に左右されないよう、URL を直接叩く。
async function postExists(page, sc) {
  try {
    await page.goto(`https://www.instagram.com/p/${sc}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText().catch(() => "");
    if (/ご利用いただけません|isn't available|削除されました/.test(body)) return false;
    return true;
  } catch { return null; }
}

// ─── ライブ側（Playwright）─────────────────────────────────────
async function readLive(account, recordedShortcodes) {
  const ctx = await chromium.launchPersistentContext(join(ROOT, account.playwrightProfile), {
    headless: true, channel: "chrome", viewport: { width: 1500, height: 1400 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  try {
    // 1) プロフィールグリッドから公開中 shortcode を収集（未記録投稿の発見用・直近を best-effort）
    await page.goto(account.profileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4500);
    if (await page.locator('input[name="username"]').count().catch(() => 0)) {
      throw new Error("NOT_LOGGED_IN: プロファイルのセッション切れ（publish-ig-bs ... login をやり直す）");
    }
    const seen = new Set();
    for (let i = 0; i < 14; i++) {
      const hrefs = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', (as) => as.map((a) => a.getAttribute("href")));
      for (const h of hrefs) { const m = (h || "").match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/); if (m) seen.add(m[1]); }
      await page.mouse.wheel(0, 2600); await page.waitForTimeout(1400);
    }
    const shortcodes = [...seen].slice(0, MAX);
    // 2) グリッド投稿の caption 先頭を取得（og:title）。ただし記録済み URL のものは後段の存在チェックで拾うので、
    //    ここでは「記録に無い＝未記録候補」の発見に使う head マップを作る。
    const live = [];
    for (const sc of shortcodes) {
      try {
        await page.goto(`https://www.instagram.com/p/${sc}/`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        let cap = await page.locator('meta[property="og:title"]').getAttribute("content").catch(() => "");
        cap = (cap || "").replace(/^.*?Instagram:\s*"?/s, "").replace(/"\s*$/, "");
        live.push({ shortcode: sc, head: normHead(cap) });
      } catch { live.push({ shortcode: sc, head: "" }); }
    }
    // 3) 記録済み shortcode を直接存在チェック（グリッド取りこぼしに依存しない authoritative な記録側判定）
    const recordedExists = {};
    for (const sc of recordedShortcodes) { if (!(sc in recordedExists)) recordedExists[sc] = await postExists(page, sc); }
    // 4) プランナーの予約スロット（月ビューの時刻チップを日別抽出）
    let scheduled = null;
    if (!NO_PLANNER) { try { scheduled = await readPlanner(page, account); } catch (e) { scheduled = { error: String(e).slice(0, 80) }; } }
    return { shortcodes, live, recordedExists, scheduled };
  } finally {
    await ctx.close();
  }
}

// プランナー予約確認: 週送りボタンは自動クリック不可・日セルのクリックは投稿作成画面を開く（禁止）。
// 月ビューに切替え→日番号の座標で列を作り→時刻チップ(HH:MM)を日別に割り当てる、が唯一動く方法。
async function readPlanner(page, account) {
  await page.goto(account.plannerUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await page.locator('[role="button"], button').filter({ hasText: /^月$/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(4000);
  const days = await page.$$eval("*", (ns) =>
    ns.filter((n) => /^\d{1,2}日$/.test((n.textContent || "").trim()) && n.children.length === 0)
      .map((n) => { const r = n.getBoundingClientRect(); return { d: n.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y) }; }));
  const chips = await page.$$eval("*", (ns) =>
    ns.filter((n) => /^\d{1,2}:\d{2}$/.test((n.textContent || "").trim()) && n.children.length === 0)
      .map((n) => { const r = n.getBoundingClientRect(); return { t: n.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y) }; }));
  // チップを最も近い（同じ行・同じ列）日セルに割り当て
  const byDay = {};
  for (const c of chips) {
    let best = null, bestD = 1e9;
    for (const d of days) {
      if (c.y < d.y) continue;               // チップは日番号の下にある
      const dist = Math.abs(c.x - d.x) + (c.y - d.y) * 0.2;
      if (Math.abs(c.x - d.x) < 80 && c.y - d.y < 260 && dist < bestD) { best = d; bestD = dist; }
    }
    if (best) { (byDay[best.d] ||= []).push(c.t); }
  }
  return byDay;
}

// ─── 照合 ─────────────────────────────────────────────────────
function reconcile(packs, liveData) {
  const headToLive = {};
  for (const lv of liveData.live) { if (lv.head) (headToLive[lv.head] ||= []).push(lv.shortcode); }

  const cats = { published_recorded: [], published_UNrecorded: [], draft_misrecorded: [], scheduled: [], unpublished: [], recorded_but_gone: [], anomaly: [] };
  for (const p of packs) {
    const matched = p.head ? (headToLive[p.head] || []) : [];
    // 記録側は直接存在チェックの結果を使う（true=生存 / false=削除確定 / null/undefined=取得不能→生存扱い）
    const recExist = p.recordedShortcode ? liveData.recordedExists?.[p.recordedShortcode] : undefined;

    if (matched.length >= 2) cats.anomaly.push({ ...p, matched, reason: "同一テーマが複数のライブ投稿に一致（重複投稿の疑い）" });

    if (p.recordedShortcode) {
      if (recExist === false) cats.recorded_but_gone.push(p);  // 記録 URL が削除済み（確定）
      else cats.published_recorded.push(p);                    // 生存 or 取得不能（誤検知を避け生存扱い）
      continue;
    }
    if (matched.length >= 1) {                                  // 記録は無いがライブ caption に一致
      if (p.draftFlag) cats.draft_misrecorded.push({ ...p, matched });
      else cats.published_UNrecorded.push({ ...p, matched });
      continue;
    }
    if (p.scheduledAt) { cats.scheduled.push(p); continue; }    // status.json で予約済み
    cats.unpublished.push(p);                                   // 真の未公開（予約候補）
  }
  return cats;
}

// ─── main ─────────────────────────────────────────────────────
const account = loadAccount();
const packs = localPacks();
log(`[verify-ig-status] アカウント @${account.handle} / ローカル ${packs.length} パックを照合…`);
const recordedShortcodes = packs.map((p) => p.recordedShortcode).filter(Boolean);
let liveData;
try { liveData = await readLive(account, recordedShortcodes); }
catch (e) { console.error("[verify-ig-status] ライブ取得失敗:", String(e)); process.exit(1); }
const cats = reconcile(packs, liveData);

const driftCount = cats.published_UNrecorded.length + cats.draft_misrecorded.length + cats.recorded_but_gone.length + cats.anomaly.length;
const snapshot = {
  account: account.handle, at: new Date().toISOString(),
  counts: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v.length])),
  live: { posts: liveData.shortcodes.length, scheduledByDay: liveData.scheduled }, cats,
};
const snapDir = join(ROOT, ".claude/state/ig-reconcile");
mkdirSync(snapDir, { recursive: true });
writeFileSync(join(snapDir, "snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n", "utf8");

if (JSON_OUT) { console.log(JSON.stringify(snapshot, null, 2)); }
else {
  const show = (label, arr, fn = (p) => p.rel) => { if (arr.length) { console.log(`\n■ ${label}: ${arr.length}`); for (const p of arr) console.log("  " + fn(p)); } };
  console.log(`\nライブ公開 ${liveData.shortcodes.length} 投稿を取得。`);
  show("公開済み・記録あり（整合）", cats.published_recorded);
  show("★公開済み・記録なし（posted.json backfill 必要）", cats.published_UNrecorded, (p) => `${p.rel}  ← live ${p.matched.join(",")}`);
  show("★draft 誤記録（status.json は draft だが実投稿済）", cats.draft_misrecorded, (p) => `${p.rel}  ← live ${p.matched.join(",")}`);
  show("★記録 URL が削除済み（recorded_but_gone）", cats.recorded_but_gone, (p) => `${p.rel}  (${p.recordedUrl})`);
  show("予約済み（status.json scheduled）", cats.scheduled, (p) => `${p.rel}  @ ${p.scheduledAt}`);
  show("未公開（予約に乗せる候補）", cats.unpublished);
  show("★異常（重複投稿の疑い・要人手判断）", cats.anomaly, (p) => `${p.rel}  → ${p.matched.join(",")}`);
  if (liveData.scheduled && !liveData.scheduled.error) {
    const sched = Object.entries(liveData.scheduled).filter(([, t]) => t.length).map(([d, t]) => `${d}:${[...new Set(t)].sort().join("/")}`);
    if (sched.length) console.log(`\nプランナー予約スロット（月ビュー実体）: ${sched.join("  ")}`);
  }
  console.log(`\nドリフト合計 ${driftCount} 件。snapshot → .claude/state/ig-reconcile/snapshot.json`);
  console.log(driftCount ? "→ 是正は `/ig-reconcile`（operator 確認のうえ posted.json backfill / 未公開を予約）" : "✓ ドリフトなし");
}
process.exit(driftCount ? 2 : 0);
