#!/usr/bin/env node
/**
 * x-sync-status.mjs
 *
 * X の予約キュー（Playwright 実ダンプ）とコンテンツ台帳の X の行（loadXPosts）を突合し、
 * 未来予約の実在を照合する。初めてキューで確かめた行に times.queueVerified を書く（台帳だけ・DN-0612 P7）。
 * 過去日時のキュー不在だけでは公開済みと判定しない（公開済みへの照合は npm run registry -- reconcile-x）。
 *
 * Usage:
 *   node scripts/x/x-sync-status.mjs          # sync + 表示
 *   node scripts/x/x-sync-status.mjs --dry    # 変更せず確認のみ
 *   node scripts/x/x-sync-status.mjs --dry --max-age-minutes 240
 *       # 前回の完走（state.x-sync-last-run）が 240 分以内で、queued の不在が無かったなら Playwright を起動せず終わる。
 *       # SessionStart はこれで呼ぶ（毎セッション x.com をログイン済みプロファイルで開いて 9.6 秒掛かっていた・DN-0688）
 *   npm run x-sync-status
 */
import { readScheduledQueue, isTweetInQueue } from "../lib/x-scheduled-queue.mjs";
import { createOutput, isCliEntry, runAsCli } from "../lib/cli-run.mjs";
import { REPO_ROOT } from "../lib/repository-paths.mjs";
import { parseCliArgs } from "../lib/cli-args.mjs";
import { datasetPath } from "../lib/datasets.mjs";
import { readJsonIf, writeJson } from "../lib/json-io.mjs";
import { loadXPosts } from "../lib/registry-x-store.mjs";
import { upsertPublications } from "../lib/content-registry-write.mjs";

const LAST_RUN = datasetPath("state.x-sync-last-run");

/**
 * 前回の完走記録が TTL 内なら true。queued の不在（予約が消えている）を見つけた回は鮮度とみなさず、
 * 次のセッションでも Playwright を起動して警告を出し直す。
 */
export function isSyncFresh(marker, nowMs, maxAgeMinutes) {
  if (!marker || !Number.isFinite(maxAgeMinutes) || maxAgeMinutes <= 0) return false;
  const t = Date.parse(marker.syncedAt);
  if (!Number.isFinite(t) || t > nowMs) return false;
  if (marker.missingFromQueue > 0) return false;
  return nowMs - t <= maxAgeMinutes * 60_000;
}

// ── main ────────────────────────────────────────────────────────────────────
// session-start.mjs は import して run({ argv: ['--dry'], quiet: true, root }) を呼ぶ（DN-0236・子の node を立てない）
export async function run({ argv = [], quiet = false, root = REPO_ROOT } = {}) {
  const out = createOutput({ quiet });
  const ROOT = root;
  const flags = parseCliArgs({ dry: { type: "boolean" }, "max-age-minutes": { type: "integer" } }, argv);
  const DRY = flags.dry;
  const NOW = new Date();

  const marker = readJsonIf(ROOT, LAST_RUN);
  if (isSyncFresh(marker, NOW.getTime(), flags.maxAgeMinutes)) {
    const ago = Math.round((NOW.getTime() - Date.parse(marker.syncedAt)) / 60_000);
    out.log(`⏭ X status sync: 前回 ${ago} 分前に完走（TTL ${flags.maxAgeMinutes} 分内・キュー ${marker.queueRows ?? "?"} 行・不在 0）。Playwright は起動しない`);
    return out.result(0);
  }

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

  const posts = loadXPosts(ROOT);
  let unconfirmed = 0, alreadyPosted = 0, stillScheduled = 0, future = 0, queued = 0, notQueued = 0, missingFromQueue = 0;
  const missingList = [];
  const unconfirmedList = [];
  const queuedList = [];
  const verified = new Map(); // exam → 書き直す行

  for (const post of posts) {
    if (post.status === "published") { alreadyPosted++; continue; }
    // approved（承認済み・まだ publish-x で予約に入れていない）と scheduled（予約に入れた）だけを見る
    if (post.status !== "approved" && post.status !== "scheduled") continue;
    if (!post.publishAt) continue;
    const label = `${post.folder}#${post.key}`;
    const inQueue = isTweetInQueue({ text: post.text, scheduled_at: post.publishAt }, queueRows);
    if (Date.parse(post.publishAt) > NOW.getTime()) {
      if (post.status === "approved") {
        // 承認済みでキューに無い＝まだ publish-x で投入していない計画分（正常）
        if (inQueue) { future++; } else { notQueued++; }
        continue;
      }
      if (!inQueue) {
        // 予約に入れたはずの行がキューに無い（偽成功・予約解除・下書き化・凍結）。投稿が静かに止まる
        missingFromQueue++;
        missingList.push({ title: label, at: post.publishAt });
        continue;
      }
      if (post.queuedAt) { future++; continue; }
      // 初めてキューで確かめた（偽成功の実査）
      queued++;
      queuedList.push({ title: label, at: post.publishAt });
      if (!DRY) {
        const row = Object.fromEntries(Object.entries(post.row).filter(([k]) => !["file", "exam", "channel"].includes(k)));
        row.times = { ...(row.times ?? {}), queueVerified: NOW.toISOString() };
        verified.set(post.exam, [...(verified.get(post.exam) ?? []), row]);
      }
      continue;
    }
    // キュー不在は未投入・取消でも起きる。公開を照合するまで published にしない
    if (inQueue) stillScheduled++;
    else {
      unconfirmed++;
      unconfirmedList.push({ title: label, at: post.publishAt });
    }
  }
  for (const [exam, rows] of verified) upsertPublications(ROOT, "x", exam, rows);

  out.log(`\n━━━ 結果 ━━━`);
  out.log(`  期限超過・公開未確認: ${unconfirmed} 件（状態は変更しない。npm run registry -- reconcile-x で照合）`);
  out.log(`  キューで初確認  : ${queued} 件${DRY ? " (dry: 未書込み)" : ""}（予約に入れた行をキューで実査・times.queueVerified）`);
  out.log(`  投稿済み        : ${alreadyPosted} 件`);
  out.log(`  X キュー残存    : ${stillScheduled} 件`);
  out.log(`  確認済みの予約  : ${future} 件（キュー実在を実照合）`);
  out.log(`  未投入(承認済み) : ${notQueued} 件（台帳 approved・キュー未投入。次バッチで publish 予定）`);
  if (queuedList.length) {
    out.log(`\nキューで初確認（§9 偽成功検証）:`);
    queuedList.forEach(p => out.log(`  📥 ${p.at?.slice(0, 16)}  ${p.title}`));
    out.log(`  → 直前に投稿したバッチ数と初確認の数が一致するか確認（不一致＝偽成功）。`);
  }
  if (missingList.length) {
    out.log(`\n★ 予約に入れた行（台帳 scheduled）が X キューに不在（＝予約が消えている・投稿が静かに止まる）:`);
    missingList.forEach(p => out.log(`  ⚠ ${p.at?.slice(0, 16)}  ${p.title}`));
    out.log(`  → X 側で予約解除/下書き化/凍結が起きていないか確認し、必要なら再投入する。`);
  }
  if (unconfirmedList.length) {
    out.log(`\n期限超過・公開未確認:`);
    unconfirmedList.forEach(p => out.log(`  ⚠ ${p.at?.slice(0, 16)}  ${p.title}`));
  }
  out.log();

  // 完走の記録（台帳とは別の state。--dry でも書く＝次のセッションの TTL 判定に使う）
  writeJson(ROOT, LAST_RUN, { schemaVersion: 1, syncedAt: NOW.toISOString(), dry: DRY, queueRows: queueRows.length, missingFromQueue, unconfirmed, queued });

  return out.result(missingFromQueue > 0 ? 1 : 0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
