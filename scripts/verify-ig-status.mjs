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
import { markAmbiguousClaims } from "./lib/ig-ambiguity.mjs";

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
      // リール軸: posted.json.reels（投稿済）/ status.json.reel scheduled（予約）/ reels 素材（script.txt|video.mp4）
      const reelStatus = statusRaw?.reel;
      const reelPostedUrl = postedRaw?.reels?.url || null;
      const reelScheduledAt = typeof reelStatus === "object" && reelStatus?.status === "scheduled" ? reelStatus.scheduled_at : null;
      const reelMaterial = existsSync(join(dir, "reels/script.txt")) || existsSync(join(dir, "reels/video.mp4"));
      return {
        rel: info.rel, head: captionHead(dir),
        recordedShortcode: shortcodeOf(carouselUrl), recordedUrl: carouselUrl,
        scheduledAt: scheduled, draftFlag, hasContent,
        reelPostedUrl, reelScheduledAt, reelMaterial,
      };
    })
    .filter(Boolean)
    .filter((p) => p.hasContent || p.recordedShortcode); // 投稿素材か記録を持つパックのみ
}

// 投稿の現存＋型を直接チェック。記録済み shortcode はグリッド走査の取りこぼし（遅延ロードで全件は
// 載らない）に左右されないよう URL を直接叩く。型は reel / carousel を区別する（rio 事故＝リールを
// 白カルーセルと誤認して黒カルーセルを削除した再発防止。/reel/ へのリダイレクト or「オリジナル音源」
// 「リール動画を宣伝」マーカーでリール判定）。返り値 {exists: true|false|null, type: 'reel'|'carousel'|null}。
async function postInfo(page, sc) {
  try {
    await page.goto(`https://www.instagram.com/p/${sc}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText().catch(() => "");
    if (/ご利用いただけません|isn't available|削除されました/.test(body)) return { exists: false, type: null };
    // リール判定（強い順）: <video> 要素の有無＝最も確実（実測 reel=1/carousel=0）。次いで /reel/ リダイレクト・本文マーカー。
    const hasVideo = (await page.locator("video").count().catch(() => 0)) > 0;
    const isReel = hasVideo || /\/reel\//.test(page.url()) || /オリジナル音源|リール動画を宣伝/.test(body);
    return { exists: true, type: isReel ? "reel" : "carousel" };
  } catch { return { exists: null, type: null }; }
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
    // グリッドの href で型を推定（/reel/ → reel・/p/ → carousel。reel が優先）
    const gridType = new Map();
    for (let i = 0; i < 14; i++) {
      const hrefs = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', (as) => as.map((a) => a.getAttribute("href")));
      for (const h of hrefs) {
        const m = (h || "").match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
        if (m) { const t = m[1] === "reel" ? "reel" : "carousel"; if (t === "reel" || !gridType.has(m[2])) gridType.set(m[2], t); }
      }
      await page.mouse.wheel(0, 2600); await page.waitForTimeout(1400);
    }
    const shortcodes = [...gridType.keys()].slice(0, MAX);
    // 2) グリッド投稿の caption 先頭＋型を取得（未記録投稿の発見用 head マップ）。
    const live = [];
    for (const sc of shortcodes) {
      try {
        await page.goto(`https://www.instagram.com/p/${sc}/`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        let cap = await page.locator('meta[property="og:title"]').getAttribute("content").catch(() => "");
        cap = (cap || "").replace(/^.*?Instagram:\s*"?/s, "").replace(/"\s*$/, "");
        const hasVideo = (await page.locator("video").count().catch(() => 0)) > 0;
        const isReel = hasVideo || /\/reel\//.test(page.url()) || gridType.get(sc) === "reel";
        live.push({ shortcode: sc, head: normHead(cap), type: isReel ? "reel" : "carousel" });
      } catch { live.push({ shortcode: sc, head: "", type: gridType.get(sc) || "carousel" }); }
    }
    // 3) 記録済み shortcode を直接存在チェック＋型判定（グリッド取りこぼしに依存しない authoritative な記録側）
    const recordedInfo = {};
    for (const sc of recordedShortcodes) { if (!(sc in recordedInfo)) recordedInfo[sc] = await postInfo(page, sc); }
    // 4) プランナーの予約スロット（月ビューの時刻チップを日別抽出）
    let scheduled = null;
    if (!NO_PLANNER) { try { scheduled = await readPlanner(page, account); } catch (e) { scheduled = { error: String(e).slice(0, 80) }; } }
    return { shortcodes, live, recordedInfo, scheduled };
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
  // head → [{shortcode,type}]（型を保持し anomaly を型考慮にする）
  const headToLive = {};
  for (const lv of liveData.live) { if (lv.head) (headToLive[lv.head] ||= []).push({ shortcode: lv.shortcode, type: lv.type || "carousel" }); }

  const cats = { published_recorded: [], published_UNrecorded: [], draft_misrecorded: [], scheduled: [], unpublished: [], recorded_but_gone: [], type_mismatch: [], anomaly: [], reel_gap: [], reel_built_unposted: [] };
  for (const p of packs) {
    const matched = p.head ? (headToLive[p.head] || []) : [];
    const matchedCarousel = matched.filter((m) => m.type === "carousel").map((m) => m.shortcode);
    // 記録側は直接存在チェック＋型の結果を使う（exists: true=生存/false=削除/null=取得不能→生存扱い）
    const recInfo = p.recordedShortcode ? liveData.recordedInfo?.[p.recordedShortcode] : undefined;

    // anomaly は「同テーマの同型（カルーセル）が 2 件以上」のみ。カルーセル＋リールの併存は正常運用なので除外。
    if (matchedCarousel.length >= 2) cats.anomaly.push({ ...p, matched: matchedCarousel, reason: "同一テーマが複数のカルーセル投稿に一致（重複の疑い・型考慮済み）" });

    if (p.recordedShortcode) {
      if (recInfo?.exists === false) { cats.recorded_but_gone.push(p); continue; }  // 記録 URL が削除済み（確定）
      if (recInfo?.type === "reel") {                                                // ★記録 carousel が実はリール（rio 型）
        // カルーセル記録がリールを指す＝カルーセル実質欠落。型不整合として赤フラグし、carousel-done に含めない。
        cats.type_mismatch.push({ ...p, recordedType: "reel", note: "posted.json は carousel だが実体はリール＝カルーセル実質なし" });
        continue;
      }
      cats.published_recorded.push(p);                                               // 生存 carousel or 取得不能（生存扱い）
      continue;
    }
    if (matchedCarousel.length >= 1) {                          // 記録は無いがライブのカルーセルに一致
      if (p.draftFlag) cats.draft_misrecorded.push({ ...p, matched: matchedCarousel });
      else cats.published_UNrecorded.push({ ...p, matched: matchedCarousel });
      continue;
    }
    if (p.scheduledAt) { cats.scheduled.push(p); continue; }    // status.json で予約済み
    cats.unpublished.push(p);                                   // 真の未公開（予約候補）
  }

  // リール軸（別axis・carousel カテゴリと排他ではない）: カルーセルは出たがリールが無いパックを surface。
  const carouselDone = new Set([...cats.published_recorded, ...cats.published_UNrecorded, ...cats.draft_misrecorded, ...cats.scheduled].map((p) => p.rel));
  for (const p of packs) {
    if (!carouselDone.has(p.rel)) continue;                     // カルーセル未了はリールギャップに含めない
    if (p.reelPostedUrl || p.reelScheduledAt) continue;        // リール投稿済み or 予約済み＝OK
    if (p.reelMaterial) cats.reel_built_unposted.push(p);       // 素材はあるが未投稿/未予約
    else cats.reel_gap.push(p);                                 // カルーセル済みだがリール未作成（素材も無し）
  }

  // 逆方向の衝突検査: matched はパック→ライブの片方向しか見ないので、1 本のライブ投稿に複数パックが
  // マッチしても各パックは matched=1 のまま published_UNrecorded に入る。これを「一意対応」と読んで
  // backfill すると未投稿のパックに投稿済みの記録が付く（2026-08-27 の事故未遂・[[ig-ambiguity]]）。
  markAmbiguousClaims(cats);
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

const driftCount = cats.published_UNrecorded.length + cats.draft_misrecorded.length + cats.recorded_but_gone.length + cats.type_mismatch.length + cats.anomaly.length;
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
  const nlIndent = "\n      ";
  const show = (label, arr, fn = (p) => p.rel) => { if (arr.length) { console.log(`\n■ ${label}: ${arr.length}`); for (const p of arr) console.log("  " + fn(p)); } };
  console.log(`\nライブ公開 ${liveData.shortcodes.length} 投稿を取得。`);
  show("公開済み・記録あり（整合）", cats.published_recorded);
  // ⚠ 付きは逆方向の衝突（同じライブ投稿を複数パックが主張）＝matched=1 でも backfill してはいけない
  const amb = (p) => (p.ambiguous ? `  ⚠衝突: 他 ${p.ambiguousWith.length} パックが同じ投稿を主張＝backfill 不可` : "");
  show("★公開済み・記録なし（posted.json backfill 必要／⚠は衝突＝人手判断）", cats.published_UNrecorded, (p) => `${p.rel}  ← live ${p.matched.join(",")}${amb(p)}`);
  show("★draft 誤記録（status.json は draft だが実投稿済）", cats.draft_misrecorded, (p) => `${p.rel}  ← live ${p.matched.join(",")}${amb(p)}`);
  show("★記録 URL が削除済み（recorded_but_gone）", cats.recorded_but_gone, (p) => `${p.rel}  (${p.recordedUrl})`);
  show("★型不整合（posted.json carousel が実はリール＝カルーセル実質なし）", cats.type_mismatch, (p) => `${p.rel}  (${p.recordedUrl} はリール)`);
  show("予約済み（status.json scheduled）", cats.scheduled, (p) => `${p.rel}  @ ${p.scheduledAt}`);
  show("未公開（予約に乗せる候補）", cats.unpublished);
  show("★異常（重複投稿の疑い・要人手判断）", cats.anomaly, (p) => `${p.rel}  → ${p.matched.join(",")}${p.reason ? nlIndent + p.reason : ""}`);
  show("◆リールギャップ（カルーセル済みだがリール未作成・素材も無し）", cats.reel_gap);
  show("◆リール素材あり・未投稿（figure-reel 生成済みだが予約していない）", cats.reel_built_unposted);
  if (liveData.scheduled && !liveData.scheduled.error) {
    const sched = Object.entries(liveData.scheduled).filter(([, t]) => t.length).map(([d, t]) => `${d}:${[...new Set(t)].sort().join("/")}`);
    if (sched.length) console.log(`\nプランナー予約スロット（月ビュー実体）: ${sched.join("  ")}`);
  }
  console.log(`\nドリフト合計 ${driftCount} 件（SoT 整合）／リールギャップ ${cats.reel_gap.length} 件・素材未投稿 ${cats.reel_built_unposted.length} 件（リール軸）。snapshot → .claude/state/ig-reconcile/snapshot.json`);
  if (driftCount) console.log("→ SoT 是正は `/ig-reconcile`（operator 確認のうえ posted.json backfill / 未公開を予約）");
  else console.log("✓ SoT ドリフトなし");
  if (cats.reel_gap.length) console.log("→ リールギャップは figure-reel-create.mjs でナレーション付きリール生成 → publish-ig-bs --reel で予約");
}
process.exit(driftCount ? 2 : 0);
