import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyIndexingResult,
  classifyUiFetchExit,
  decideIndexingRun,
  lastCommitRunAt,
} from "../scripts/lib/gsc-local-routine.mjs";

const now = new Date("2026-09-25T01:30:00Z");

test("直近の送信は mode=commit だけを見る（dry-run の診断は数えない）", () => {
  const runs = [
    { mode: "commit", collectedAt: "2026-09-20T01:00:00Z" },
    { mode: "dry-run", collectedAt: "2026-09-24T23:00:00Z" },
    { mode: "commit", collectedAt: "2026-09-17T06:53:24Z" },
  ];
  assert.equal(lastCommitRunAt(runs).toISOString(), "2026-09-20T01:00:00.000Z");
  assert.equal(lastCommitRunAt([]), null);
});

test("順位表が無い・20 時間以内に送信済みなら送らない", () => {
  assert.equal(decideIndexingRun({ runs: [], hasPriorityList: false, now }).run, false);
  const recent = decideIndexingRun({ runs: [{ mode: "commit", collectedAt: "2026-09-24T12:00:00Z" }], hasPriorityList: true, now });
  assert.equal(recent.run, false);
  assert.match(recent.reason, /13 時間/);
  assert.equal(decideIndexingRun({ runs: [{ mode: "commit", collectedAt: "2026-09-24T01:00:00Z" }], hasPriorityList: true, now }).run, true);
});

test("結果の読み分け: 送信済み・送る URL なし・未ログイン・失敗", () => {
  const before = { runId: "A" };
  assert.equal(classifyIndexingResult({ exitCode: 0, before, after: { runId: "B", status: "ok", summary: { accepted: 10 } } }).outcome, "sent");
  // 1 件でも送れないと exit 2 になるが、受理があれば「送信済み」として読む（内訳は history に残る）
  assert.equal(classifyIndexingResult({ exitCode: 2, before, after: { runId: "B", status: "ok", summary: { accepted: 8 } } }).outcome, "sent");
  // runId が変わらない＝ブラウザを開く前に止まった。exit 2 は「対象 0 件」
  assert.equal(classifyIndexingResult({ exitCode: 2, before, after: { runId: "A" } }).outcome, "nothing-to-send");
  assert.equal(classifyIndexingResult({ exitCode: 1, before, after: { runId: "A" } }).outcome, "failed");
  assert.equal(classifyIndexingResult({ exitCode: 2, before, after: { runId: "B", status: "not-signed-in" } }).outcome, "needs-login");
  assert.equal(classifyIndexingResult({ exitCode: 2, before, after: { runId: "B", status: "inspection-unreadable" } }).outcome, "failed");
  assert.equal(classifyIndexingResult({ exitCode: 2, before: null, after: null }).outcome, "nothing-to-send");
  // 送る前に全部登録済みだった・dry-run の診断は失敗ではない
  assert.equal(classifyIndexingResult({ exitCode: 2, before, after: { runId: "B", status: "no-requests", summary: { inspected: 12 }, items: [{ request: { status: "already-indexed" } }] } }).outcome, "nothing-to-send");
  // 受理 0 件でも、送信を試みて失敗したものがあれば失敗（「全部登録済み」と混同しない）
  const allFailed = classifyIndexingResult({ exitCode: 2, before, after: { runId: "B", status: "no-requests", items: [{ request: { status: "button-not-found" } }, { request: { status: "already-indexed" } }] } });
  assert.equal(allFailed.outcome, "failed");
  assert.match(allFailed.detail, /button-not-found/);
  assert.equal(classifyIndexingResult({ exitCode: 0, before, after: { runId: "B", status: "dry-ok", summary: { inspected: 12 } } }).outcome, "diagnosed");
});

test("UI CSV の exit code: 不完全でも正規化はする・未ログインと失敗は正規化しない", () => {
  assert.deepEqual(classifyUiFetchExit(0), { outcome: "complete", normalize: true });
  assert.deepEqual(classifyUiFetchExit(2), { outcome: "incomplete", normalize: true });
  assert.deepEqual(classifyUiFetchExit(3), { outcome: "needs-login", normalize: false });
  assert.deepEqual(classifyUiFetchExit(6), { outcome: "failed", normalize: false });
});
