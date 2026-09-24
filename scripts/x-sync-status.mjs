#!/usr/bin/env node
/**
 * x-sync-status.mjs
 *
 * X の予約キュー（Playwright 実ダンプ）と content/sns/x/ 配下の status.json を突合し、
 * 未来予約の実在を照合する。過去日時のキュー不在だけでは公開済みと判定しない。
 *
 * Usage:
 *   node scripts/x-sync-status.mjs          # sync + 表示
 *   node scripts/x-sync-status.mjs --dry    # 変更せず確認のみ
 *   npm run x-sync-status
 */
import fs from "fs";
import path from "path";
import { readScheduledQueue, isTweetInQueue } from "./lib/x-scheduled-queue.mjs";
import { createOutput, isCliEntry, runAsCli } from "./lib/cli-run.mjs";

// ── 2. status.json 収集 ─────────────────────────────────────────────────────
function loadAllStatuses(ROOT) {
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

// ── main ────────────────────────────────────────────────────────────────────
// session-start.mjs は import して run({ argv: ['--dry'], quiet: true, root }) を呼ぶ（DN-0236・子の node を立てない）
export async function run({ argv = [], quiet = false, root = process.cwd() } = {}) {
  const out = createOutput({ quiet });
  const ROOT = root;
  const DRY = argv.includes("--dry");
  const NOW = new Date();

  out.log(`\n🔄 X status sync ${DRY ? "[DRY RUN]" : ""} — ${NOW.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
  out.log("📡 X 予約キューをダンプ中（Playwright、ヘッドレス）...");
  let snippets, queueRows;
  try {
    const snapshot = await readScheduledQueue({ root: ROOT });
    queueRows = snapshot.rows;
    snippets = new Set(snapshot.rows.flatMap(r => r.text.split("\n").map(s => s.trim()).filter(Boolean)));
    out.log(`   キュー取得: ${snippets.size} 行`);
  } catch (e) {
    out.error("❌ Playwright エラー:", e.message);
    return out.result(1);
  }

  const entries = loadAllStatuses(ROOT);
  let unconfirmed = 0, alreadyPosted = 0, stillScheduled = 0, future = 0, queued = 0, notQueued = 0, manualOnly = 0, missingFromQueue = 0;
  const missingList = [];
  const unconfirmedList = [];
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
      const inQueue = isTweetInQueue(tweet, queueRows);

      if (scheduledAt > NOW) {
        // 未来予約。キューに在れば scheduled→queued へ昇格（偽成功の実査 + 後日 guard の二重誤検出回避）
        if (tweet.status === "scheduled") {
          if (inQueue) {
            if (!DRY) { tweet.status = "queued"; tweet.queue_verified_at = NOW.toISOString(); dirty = true; }
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

      // キュー不在は未投入・取消でも起きる。公開URLを実査するまで posted にしない。
      if (inQueue) stillScheduled++;
      else {
        unconfirmed++;
        unconfirmedList.push({ file: entry.file, title: tweet.title, at: tweet.scheduled_at });
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

  out.log(`\n━━━ 結果 ━━━`);
  out.log(`  期限超過・公開未確認: ${unconfirmed} 件（状態は変更しない）`);
  out.log(`  queued に昇格    : ${queued} 件${DRY ? " (dry: 未書込み)" : ""}（未来予約をキューで実査）`);
  out.log(`  既存 posted     : ${alreadyPosted} 件`);
  out.log(`  X キュー残存    : ${stillScheduled} 件`);
  out.log(`  既 queued        : ${future} 件（キュー実在を実照合）`);
  out.log(`  未投入(計画)     : ${notQueued} 件（status=scheduled・キュー未投入。次バッチで publish 予定）`);
  out.log(`  手動公開枠       : ${manualOnly} 件（X Article等。予約キュー同期の対象外）`);
  if (queuedList.length) {
    out.log(`\nqueued 昇格（キュー実在を確認・§9 偽成功検証）:`);
    queuedList.forEach(p => out.log(`  📥 ${p.at?.slice(0, 16)}  ${p.title}`));
    out.log(`  → 直前に投稿したバッチ数と queued 昇格数が一致するか確認（不一致＝偽成功）。`);
  }
  if (missingList.length) {
    out.log(`\n★ queued なのに X キューに不在（＝予約が消えている・投稿が静かに止まる）:`);
    missingList.forEach(p => out.log(`  ⚠ ${p.at?.slice(0, 16)}  ${p.title}`));
    out.log(`  → X 側で予約解除/下書き化/凍結が起きていないか確認し、必要なら再投入する。`);
  }
  if (unconfirmedList.length) {
    out.log(`\n期限超過・公開未確認:`);
    unconfirmedList.forEach(p => out.log(`  ⚠ ${p.at?.slice(0, 16)}  ${p.title}`));
  }
  out.log();

  return out.result(missingFromQueue > 0 ? 1 : 0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
