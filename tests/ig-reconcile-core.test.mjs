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
  planRegistryPublished,
  registryRowTouchable,
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
    liveData: { shortcodes: ["a", "b", "c"], scheduled: { "1日": ["09:00"] }, live: [{ shortcode: "a", head: "見出し", type: "reel", extra: 1 }] },
    source: "graph-api",
    now,
  });
  assert.equal(snap.account, "dobokunotecom");
  assert.equal(snap.at, now.toISOString());
  assert.deepEqual(snap.counts, { published_recorded: 2, published_UNrecorded: 0 });
  assert.deepEqual(snap.live, { posts: 3, scheduledByDay: { "1日": ["09:00"] }, list: [{ shortcode: "a", head: "見出し", type: "reel" }] });
  assert.equal(snap.cats, cats);
  assert.equal(snap.source, "graph-api");
});

// ─── 台帳への反映の計画（planRegistryPublished）──────────────────────
const REF = ".claude/state/ig-reconcile/snapshot.json@2026-10-09T00:00:00.000Z";
const rowsOf = (map) => (folder, format) => map[`${folder}|${format}`] ?? null;
const row = (id, status, extra = {}) => ({ id, status, ...extra });

test("registryRowTouchable: published と stopped(unverified-legacy 以外) は触らない", () => {
  assert.equal(registryRowTouchable(null), false);
  assert.equal(registryRowTouchable(row("a", "published")), false);
  assert.equal(registryRowTouchable(row("a", "stopped", { stopReason: "gone" })), false);
  assert.equal(registryRowTouchable(row("a", "stopped", { stopReason: "unverified-legacy" })), true);
  for (const st of ["draft", "rendered", "approved", "scheduled"]) assert.equal(registryRowTouchable(row("a", st)), true);
});

test("planRegistryPublished: カルーセルは 1 件だけ結び付き衝突の無いものだけ published にする", () => {
  const cats = { published_UNrecorded: [
    { rel: "cem/a", matched: ["SC1"] },
    { rel: "cem/b", matched: ["SC2"], ambiguous: true },
    { rel: "cem/c", matched: ["SC3", "SC4"] },
    { rel: "cem/d", matched: ["SC5"] },
    { rel: "cem/e", matched: ["SC6"] },
    { rel: "cem/f", matched: ["SC7"] },
  ] };
  const rowOf = rowsOf({
    "cem/a|carousel": row("x/a", "scheduled"),
    "cem/b|carousel": row("x/b", "approved"),
    "cem/c|carousel": row("x/c", "approved"),
    "cem/d|carousel": row("x/d", "published"),
    "cem/e|carousel": row("x/e", "stopped", { stopReason: "unverified-legacy" }),
    "cem/f|carousel": row("x/f", "stopped", { stopReason: "gone" }),
  });
  const r = planRegistryPublished({ cats, liveList: [], reelCandidates: [], rowOf, snapRef: REF });
  assert.deepEqual(r.updates.map((u) => [u.folder, u.id, u.url]), [
    ["cem/a", "x/a", "https://www.instagram.com/p/SC1/"],
    ["cem/e", "x/e", "https://www.instagram.com/p/SC6/"],
  ]);
  assert.deepEqual(r.updates[0].evidence, { kind: "ig-snapshot", ref: REF });
  assert.deepEqual(r.skipped.map((s) => s.folder).sort(), ["cem/b", "cem/c"]);
  assert.equal(r.skipped.find((s) => s.folder === "cem/c").format, "carousel");
});

test("planRegistryPublished: 台帳に行が無いカルーセルは見送りに出す", () => {
  const r = planRegistryPublished({ cats: { published_UNrecorded: [{ rel: "cem/z", matched: ["S"] }] }, liveList: [], reelCandidates: [], rowOf: rowsOf({}), snapRef: REF });
  assert.deepEqual(r.updates, []);
  assert.deepEqual(r.skipped, [{ folder: "cem/z", format: "carousel", reason: "台帳に行が無い" }]);
});

test("planRegistryPublished: リールは公開中のリールに先頭が 1 件だけ一致したときだけ published にする", () => {
  const liveList = [
    { shortcode: "R1", head: "ひとつだけ", type: "reel" },
    { shortcode: "R2", head: "ふたつ", type: "reel" },
    { shortcode: "R3", head: "ふたつ", type: "reel" },
    { shortcode: "C1", head: "かるせる", type: "carousel" },
    { shortcode: "R4", head: "かぶり", type: "reel" },
  ];
  const reelCandidates = [
    { folder: "v/one", head: "ひとつだけ" },
    { folder: "v/two", head: "ふたつ" },
    { folder: "v/car", head: "かるせる" },
    { folder: "v/dup1", head: "かぶり" },
    { folder: "v/dup2", head: "かぶり" },
    { folder: "v/done", head: "ひとつだけ" },
    { folder: "v/none", head: "ない" },
  ];
  const rowOf = rowsOf({
    "v/one|reel": row("r/one", "rendered"), "v/two|reel": row("r/two", "approved"), "v/car|reel": row("r/car", "approved"),
    "v/dup1|reel": row("r/d1", "approved"), "v/dup2|reel": row("r/d2", "approved"), "v/done|reel": row("r/done", "published"),
    "v/none|reel": row("r/none", "approved"),
  });
  const r = planRegistryPublished({ cats: {}, liveList, reelCandidates, rowOf, snapRef: REF });
  // v/one は同じ先頭の v/done（published）も候補だが、触る側の候補としては v/one だけ。v/done は触らない。
  assert.deepEqual(r.updates.map((u) => [u.folder, u.url]), []);
  assert.deepEqual(r.skipped.map((s) => s.folder).sort(), ["v/dup1", "v/dup2", "v/one", "v/two"]);
});

test("planRegistryPublished: リールが 1 件だけ一致し、先頭を持つフォルダも 1 つなら published にする", () => {
  const r = planRegistryPublished({
    cats: {}, liveList: [{ shortcode: "R1", head: "ひとつだけ", type: "reel" }],
    reelCandidates: [{ folder: "v/one", head: "ひとつだけ" }], rowOf: rowsOf({ "v/one|reel": row("r/one", "rendered") }), snapRef: REF,
  });
  assert.deepEqual(r.updates, [{ folder: "v/one", format: "reel", id: "r/one", url: "https://www.instagram.com/reel/R1/", evidence: { kind: "ig-snapshot", ref: REF } }]);
});

test("planRegistryPublished: 台帳が published で投稿が削除済みなら後戻りの所見に出す（台帳は触らない）", () => {
  const r = planRegistryPublished({
    cats: {}, liveList: [], reelCandidates: [], rowOf: rowsOf({}), snapRef: REF,
    publishedRows: [{ id: "a", shortcode: "GONE" }, { id: "b", shortcode: "ALIVE" }, { id: "c", shortcode: "UNKNOWN" }, { id: "d", shortcode: null }],
    recordedInfo: { GONE: { exists: false }, ALIVE: { exists: true }, UNKNOWN: { exists: null } },
  });
  assert.deepEqual(r.regressions.map((x) => x.id), ["a"]);
  assert.deepEqual(r.updates, []);
});

test("planRegistryPublished: 台帳のほかの行がすでに使っている shortcode は候補から外し、今回付ける分も重ねない", () => {
  const cats = { published_UNrecorded: [
    { rel: "cem/a", matched: ["USED"] },
    { rel: "cem/b", matched: ["NEW"] },
    { rel: "cem/c", matched: ["NEW"] },
  ] };
  const rowOf = rowsOf({
    "cem/a|carousel": row("x/a", "approved"), "cem/b|carousel": row("x/b", "approved"), "cem/c|carousel": row("x/c", "approved"),
    "v/r|reel": row("r/r", "approved"),
  });
  const r = planRegistryPublished({
    cats, liveList: [{ shortcode: "USED", head: "り", type: "reel" }], reelCandidates: [{ folder: "v/r", head: "り" }], rowOf,
    publishedRows: [{ id: "other", shortcode: "USED" }], snapRef: REF,
  });
  assert.deepEqual(r.updates.map((u) => [u.folder, u.url]), [["cem/b", "https://www.instagram.com/p/NEW/"]]);
  assert.deepEqual(r.skipped.map((s) => s.folder).sort(), ["cem/a", "cem/c", "v/r"]);
});
