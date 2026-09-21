// ig-reconcile-core.mjs のテスト。
//
// verify-ig-status.mjs（Playwright でライブ取得する CLI）から切り出した突合ロジックを、
// 実ネットワーク・実 Playwright なしで検証する。fixture は content/sns/instagram の
// パック構造（<exam>/<pack>/carousel/caption.txt, posted.json, status.json, reels/script.txt）を
// 一時ディレクトリに再現し、reconcile() へ手組みの liveData を渡してカテゴリ分類を確認する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normHead,
  shortcodeOf,
  localPacks,
  reconcile,
  driftCount,
  buildSnapshot,
} from "../scripts/lib/ig-reconcile-core.mjs";

// ─── fixture ヘルパー ───────────────────────────────────────────
/**
 * 一時ディレクトリに 1 パックを作る。
 * @param {string} igDir 一時 IG_DIR ルート
 * @param {string} rel "<exam>/<pack>" 相対パス
 * @param {{caption?: string, posted?: object, status?: object, reelMaterial?: boolean}} [opts]
 */
function makePack(igDir, rel, opts = {}) {
  const dir = join(igDir, rel);
  mkdirSync(join(dir, "carousel"), { recursive: true });
  if (opts.caption !== false) {
    writeFileSync(join(dir, "carousel/caption.txt"), opts.caption ?? `${rel} の投稿本文`, "utf8");
  }
  if (opts.posted) writeFileSync(join(dir, "posted.json"), JSON.stringify(opts.posted), "utf8");
  if (opts.status) writeFileSync(join(dir, "status.json"), JSON.stringify(opts.status), "utf8");
  if (opts.reelMaterial) {
    mkdirSync(join(dir, "reels"), { recursive: true });
    writeFileSync(join(dir, "reels/script.txt"), "リール台本", "utf8");
  }
  return dir;
}

function withTmpIgDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "ig-reconcile-core-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── normHead / shortcodeOf ────────────────────────────────────
test("normHead: 記号・空白を除き先頭行の先頭24文字に正規化する", () => {
  assert.equal(normHead("📋 令和7年度・過去問（No.1）\n本文"), normHead("令和7年度過去問No.1"));
  assert.equal(normHead(""), "");
  assert.equal(normHead(null), "");
  const long = "あ".repeat(40);
  assert.equal(normHead(long).length, 24);
});

test("shortcodeOf: /p/ と /reel/ のURLからshortcodeを抽出する", () => {
  assert.equal(shortcodeOf("https://www.instagram.com/p/ABC123-_x/"), "ABC123-_x");
  assert.equal(shortcodeOf("https://www.instagram.com/reel/XYZ789/"), "XYZ789");
  assert.equal(shortcodeOf(""), null);
  assert.equal(shortcodeOf(undefined), null);
});

// ─── localPacks ─────────────────────────────────────────────────
test("localPacks: exam フィルタと igDir 指定でパックを収集する", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA" });
    makePack(igDir, "civil-1/b", { caption: "テーマB" });
    const all = localPacks({ igDir });
    assert.equal(all.length, 2);
    const cemOnly = localPacks({ igDir, exam: "cem" });
    assert.equal(cemOnly.length, 1);
    assert.equal(cemOnly[0].rel, "cem/a");
  });
});

// ─── reconcile: カテゴリ分類 ────────────────────────────────────
function liveData(entries, recordedInfo = {}) {
  return { live: entries, recordedInfo };
}

test("reconcile: 記録あり・生存 → published_recorded", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA", posted: { carousel: { url: "https://www.instagram.com/p/SC1/" } } });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([], { SC1: { exists: true, type: "carousel" } }));
    assert.equal(cats.published_recorded.length, 1);
    assert.equal(cats.published_recorded[0].rel, "cem/a");
  });
});

test("reconcile: recordedInfo.exists=false → recorded_but_gone", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA", posted: { carousel: { url: "https://www.instagram.com/p/SC1/" } } });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([], { SC1: { exists: false, type: null } }));
    assert.equal(cats.recorded_but_gone.length, 1);
    assert.equal(cats.published_recorded.length, 0);
  });
});

test("reconcile: 記録carouselが実はreel → type_mismatch", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA", posted: { carousel: { url: "https://www.instagram.com/p/SC1/" } } });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([], { SC1: { exists: true, type: "reel" } }));
    assert.equal(cats.type_mismatch.length, 1);
    assert.equal(cats.type_mismatch[0].recordedType, "reel");
    assert.equal(cats.published_recorded.length, 0);
  });
});

test("reconcile: 記録なし・head一致 → published_UNrecorded", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA" });
    const packs = localPacks({ igDir });
    const head = packs[0].head;
    const cats = reconcile(packs, liveData([{ shortcode: "SC1", head, type: "carousel" }]));
    assert.equal(cats.published_UNrecorded.length, 1);
    assert.deepEqual(cats.published_UNrecorded[0].matched, ["SC1"]);
  });
});

test("reconcile: 同じ head で 2 パックが未記録一致 → ambiguous としてマークされる", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "civil-1/x", { caption: "同一テーマ" });
    makePack(igDir, "civil-2/x", { caption: "同一テーマ" });
    const packs = localPacks({ igDir });
    const head = packs[0].head;
    assert.equal(packs[1].head, head); // 前提: 同じ head に正規化されている
    const cats = reconcile(packs, liveData([{ shortcode: "SC1", head, type: "carousel" }]));
    assert.equal(cats.published_UNrecorded.length, 2);
    assert.equal(cats.published_UNrecorded.every((p) => p.ambiguous === true), true);
    assert.equal(cats.anomaly.length, 2);
  });
});

test("reconcile: status.json scheduled → scheduled", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA", status: { carousel: { status: "scheduled", scheduled_at: "2026-10-01T00:00:00+09:00" } } });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([]));
    assert.equal(cats.scheduled.length, 1);
    assert.equal(cats.scheduled[0].scheduledAt, "2026-10-01T00:00:00+09:00");
  });
});

test("reconcile: 記録も一致もscheduledも無い → unpublished", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "誰にも一致しないテーマ" });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([]));
    assert.equal(cats.unpublished.length, 1);
  });
});

test("reconcile: カルーセル済みだがリール素材が無い → reel_gap", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", { caption: "テーマA", posted: { carousel: { url: "https://www.instagram.com/p/SC1/" } } });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([], { SC1: { exists: true, type: "carousel" } }));
    assert.equal(cats.reel_gap.length, 1);
    assert.equal(cats.reel_built_unposted.length, 0);
  });
});

test("reconcile: カルーセル済み・リール素材ありだが未投稿 → reel_built_unposted", () => {
  withTmpIgDir((igDir) => {
    makePack(igDir, "cem/a", {
      caption: "テーマA",
      posted: { carousel: { url: "https://www.instagram.com/p/SC1/" } },
      reelMaterial: true,
    });
    const packs = localPacks({ igDir });
    const cats = reconcile(packs, liveData([], { SC1: { exists: true, type: "carousel" } }));
    assert.equal(cats.reel_built_unposted.length, 1);
    assert.equal(cats.reel_gap.length, 0);
  });
});

// ─── driftCount ─────────────────────────────────────────────────
test("driftCount: 5カテゴリの合計を返し reel_gap 等は含めない", () => {
  const cats = {
    published_recorded: [1],
    published_UNrecorded: [1, 2],
    draft_misrecorded: [1],
    scheduled: [1, 2, 3],
    unpublished: [1],
    recorded_but_gone: [1],
    type_mismatch: [1, 2],
    anomaly: [1],
    reel_gap: [1, 2, 3, 4],
    reel_built_unposted: [1, 2],
  };
  assert.equal(driftCount(cats), 2 + 1 + 1 + 2 + 1); // = 7
});

// ─── buildSnapshot ────────────────────────────────────────────
test("buildSnapshot: account/at/counts/live/cats/source を組み立てる", () => {
  const cats = { published_recorded: [1, 2], published_UNrecorded: [] };
  const now = new Date("2026-09-21T03:00:00.000Z");
  const snap = buildSnapshot({
    account: "dobokunotecom",
    cats,
    liveData: { shortcodes: ["a", "b", "c"], scheduled: { "1日": ["09:00"] } },
    source: "graph-api",
    now,
  });
  assert.equal(snap.account, "dobokunotecom");
  assert.equal(snap.at, now.toISOString());
  assert.deepEqual(snap.counts, { published_recorded: 2, published_UNrecorded: 0 });
  assert.deepEqual(snap.live, { posts: 3, scheduledByDay: { "1日": ["09:00"] } });
  assert.equal(snap.cats, cats);
  assert.equal(snap.source, "graph-api");
});
