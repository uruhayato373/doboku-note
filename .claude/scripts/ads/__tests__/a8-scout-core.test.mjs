import assert from "node:assert/strict";
import test from "node:test";

import {
  isBlocked,
  resolveVertical,
  isDuplicate,
  rewardNorm,
  gapBonus,
  scoreProgram,
  scoreAndRank,
  canTransition,
  transition,
  upsertCandidates,
  upsertApproved,
  confirmedEpc,
  computePriority,
  summarize,
  entriesByStatus,
  loadCurated,
} from "../lib/a8-scout-core.mjs";

const curated = loadCurated(); // doboku 版 a8-curated.json (career 3軸・転職一本)

// doboku は inventory を持たないため coverage は手で組む (gap/thin の分岐検証用)。
const coverage = {
  gapVerticals: ["civil-career"],
  thinVerticals: ["pe-career"],
};

test("curated: 係数と blocklist が読める (doboku)", () => {
  assert.equal(typeof curated.weeklyApplyMax, "number");
  assert.ok(Array.isArray(curated.blocklistKeywords));
  assert.equal(curated.scoreWeights.reward, 0.4);
  assert.equal(curated.scoreNorm.rewardCapYen, 50000);
});

test("isBlocked: NG ジャンル + 廃止カテゴリ(講座/教材) を検出", () => {
  assert.equal(isBlocked({ name: "占い師の館", genre: "占い" }, curated), true);
  assert.equal(isBlocked({ name: "情報商材で稼ぐ", genre: "情報商材" }, curated), true);
  // doboku Red Line: 講座/教材/添削 は転職一本方針で除外
  assert.equal(isBlocked({ name: "施工管理技士の通信講座", genre: "学び" }, curated), true);
  assert.equal(isBlocked({ name: "○○資格の教材ショップ", genre: "教材" }, curated), true);
  // 転職案件は通す
  assert.equal(isBlocked({ name: "施工管理の転職支援", genre: "転職" }, curated), false);
});

test("resolveVertical: doboku career 3軸 (最長一致)", () => {
  assert.equal(resolveVertical({ name: "施工管理の求人サイト", genre: "転職" }, curated), "civil-career");
  assert.equal(resolveVertical({ name: "技術士のハイクラス転職", genre: "転職" }, curated), "pe-career");
  assert.equal(resolveVertical({ name: "第二新卒の転職サイト", genre: "求人" }, curated), "career");
  assert.equal(resolveVertical({ name: "謎のサービス", genre: "その他" }, curated), null);
});

test("isDuplicate: a8mat / title 一致で重複", () => {
  const existing = [
    { title: "ビルドジョブ", htmlContent: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH" },
  ];
  assert.equal(isDuplicate({ name: "別名", a8mat: "4B5OO5+FHBA2+5B0Y+NTZCH" }, existing), true);
  assert.equal(isDuplicate({ name: "ビルドジョブ", a8mat: "OTHER" }, existing), true);
  assert.equal(isDuplicate({ name: "新規案件", a8mat: "NEWTOKEN" }, existing), false);
});

test("rewardNorm: 定額と定率の正規化 (doboku cap=50000)", () => {
  assert.equal(rewardNorm({ rewardType: "fixed", rewardYen: 25000 }, curated), 0.5); // 25000/50000
  assert.equal(rewardNorm({ rewardType: "fixed", rewardYen: 60000 }, curated), 1); // cap
  assert.equal(rewardNorm({ rewardType: "rate", rewardRatePct: 25 }, curated), 0.5); // 25/50
  assert.equal(rewardNorm({}, curated), 0);
});

test("gapBonus: gap=1.0 / thin=0.7 / other=0.2 / null=other", () => {
  assert.equal(gapBonus("civil-career", coverage, curated), 1.0);
  assert.equal(gapBonus("pe-career", coverage, curated), 0.7);
  assert.equal(gapBonus("career", coverage, curated), 0.2);
  assert.equal(gapBonus(null, coverage, curated), 0.2);
});

test("scoreProgram: 高単価×gap は高スコア", () => {
  const hi = scoreProgram(
    { rewardType: "fixed", rewardYen: 50000, epcYen: 500, confirmRatePct: 100 },
    "civil-career",
    coverage,
    curated,
  );
  const lo = scoreProgram(
    { rewardType: "fixed", rewardYen: 500, epcYen: 10, confirmRatePct: 10 },
    "career",
    coverage,
    curated,
  );
  assert.ok(hi > lo);
  assert.ok(hi <= 1 && lo >= 0);
});

test("scoreAndRank: blocked/duplicate を分離し score 降順", () => {
  const programs = [
    { programId: "p1", name: "施工管理の転職", genre: "転職", rewardType: "fixed", rewardYen: 30000, epcYen: 300, confirmRatePct: 80 },
    { programId: "p2", name: "占いの館", genre: "占い", rewardType: "fixed", rewardYen: 9000 },
    { programId: "p3", name: "重複案件", genre: "転職", a8mat: "DUPTOKEN", rewardType: "fixed", rewardYen: 5000 },
    { programId: "p4", name: "ハイクラス転職エージェント", genre: "転職", rewardType: "fixed", rewardYen: 15000, epcYen: 200, confirmRatePct: 60 },
  ];
  const existingAds = [{ title: "既存", htmlContent: "a8mat=DUPTOKEN" }];
  const r = scoreAndRank(programs, { coverage, existingAds, curated });
  assert.equal(r.blocked.length, 1);
  assert.equal(r.blocked[0].programId, "p2");
  assert.equal(r.duplicates.length, 1);
  assert.equal(r.duplicates[0].programId, "p3");
  // candidates は score 降順
  for (let i = 1; i < r.candidates.length; i++) {
    assert.ok(r.candidates[i - 1].score >= r.candidates[i].score);
  }
  // vertical が解決されている
  const p1 = r.candidates.find((c) => c.programId === "p1");
  assert.equal(p1.vertical, "civil-career");
});

test("canTransition: 正当な遷移のみ true", () => {
  assert.equal(canTransition(null, "candidate"), true);
  assert.equal(canTransition("candidate", "applied"), true);
  assert.equal(canTransition("applied", "approved"), true);
  assert.equal(canTransition("harvested", "registered"), true);
  assert.equal(canTransition("harvested", "pending-vertical"), true);
  // 不正
  assert.equal(canTransition("candidate", "published"), false);
  assert.equal(canTransition("published", "candidate"), false);
  assert.equal(canTransition("rejected", "applied"), false); // 再申請しない
});

test("transition: 不正遷移で throw / 正当で history 追記", () => {
  const e = { status: "candidate", history: [] };
  const applied = transition(e, "applied", { at: "2026-07-19T00:00:00Z" });
  assert.equal(applied.status, "applied");
  assert.equal(applied.history.length, 1);
  assert.equal(applied.history[0].to, "applied");
  assert.throws(() => transition(e, "published"), /invalid transition/);
});

test("upsertCandidates: 新規は candidate / 既存 status は巻き戻さない", () => {
  let catalog = { entries: {} };
  catalog = upsertCandidates(catalog, [{ programId: "x", name: "A", vertical: "civil-career", score: 0.8 }], { at: "t1" });
  assert.equal(catalog.entries.x.status, "candidate");
  // x を applied に進める
  catalog.entries.x = transition(catalog.entries.x, "applied", { at: "t2" });
  // 再 scout で同 programId が来ても status は applied のまま (score だけ更新)
  catalog = upsertCandidates(catalog, [{ programId: "x", name: "A", vertical: "civil-career", score: 0.9 }], { at: "t3" });
  assert.equal(catalog.entries.x.status, "applied");
  assert.equal(catalog.entries.x.score, 0.9);
});

test("upsertApproved: EPC/確定率/報酬を保存 (新規は全保存・既存は欠損補完のみ)", () => {
  let cat = { entries: {} };
  cat = upsertApproved(cat, [{ programId: "m1", name: "A", vertical: "career", epcYen: 9.53, confirmRatePct: 100, rewardType: "rate", rewardRatePct: 60 }], { at: "t" });
  assert.equal(cat.entries.m1.epcYen, 9.53);
  assert.equal(cat.entries.m1.confirmRatePct, 100);
  assert.equal(cat.entries.m1.rewardRatePct, 60);
  // 既存の手調整値は上書きしない (欠損補完のみ)
  cat.entries.m1.confirmRatePct = 50; // 手調整
  cat = upsertApproved(cat, [{ programId: "m1", confirmRatePct: 100, epcYen: 20 }], { at: "t2" });
  assert.equal(cat.entries.m1.confirmRatePct, 50); // 上書きされない
  assert.equal(cat.entries.m1.epcYen, 9.53); // 既存あり → 補完しない
  // 欠損フィールドは補完される
  cat.entries.m2 = { programId: "m2", name: "B", status: "approved", history: [] };
  cat = upsertApproved(cat, [{ programId: "m2", epcYen: 300 }], { at: "t3" });
  assert.equal(cat.entries.m2.epcYen, 300);
});

test("upsertApproved: 新規は approved / 既存 candidate は昇格 / registered は据え置き", () => {
  let cat = { entries: {} };
  // 新規の既存提携 → approved
  cat = upsertApproved(cat, [{ programId: "e1", name: "建設JOBs", vertical: "civil-career" }], { at: "t", note: "existing" });
  assert.equal(cat.entries.e1.status, "approved");
  assert.equal(cat.entries.e1.source, "existing-partnership");
  // candidate だったものは approved に昇格
  cat.entries.c1 = { programId: "c1", name: "X", status: "candidate", history: [] };
  cat = upsertApproved(cat, [{ programId: "c1", vertical: "career" }], { at: "t2" });
  assert.equal(cat.entries.c1.status, "approved");
  // registered は据え置き
  cat.entries.r1 = { programId: "r1", name: "Y", status: "registered", vertical: "pe-career", history: [] };
  cat = upsertApproved(cat, [{ programId: "r1", vertical: "civil-career" }], { at: "t3" });
  assert.equal(cat.entries.r1.status, "registered");
  assert.equal(cat.entries.r1.vertical, "pe-career"); // 巻き戻さない
});

test("confirmedEpc / computePriority: バンド式 + targetRankingKeys ボーナス", () => {
  assert.equal(confirmedEpc({ epcYen: 942, confirmRatePct: 48.97 }).toFixed(1), "461.3");
  assert.equal(confirmedEpc({ epcYen: 0, confirmRatePct: 100 }), 0);
  // バンド境界
  assert.equal(computePriority({ epcYen: 1100, confirmRatePct: 100 }, curated), 80); // 1100≥1000
  assert.equal(computePriority({ epcYen: 700, confirmRatePct: 50 }, curated), 60); // 350≥300
  assert.equal(computePriority({ epcYen: 500, confirmRatePct: 40 }, curated), 40); // 200≥100
  assert.equal(computePriority({ epcYen: 100, confirmRatePct: 40 }, curated), 20); // 40≥30
  assert.equal(computePriority({ epcYen: 10, confirmRatePct: 50 }, curated), 10); // 5 <30
  assert.equal(computePriority({}, curated), 10); // 欠損
  // targetRankingKeys で +5
  assert.equal(computePriority({ epcYen: 700, confirmRatePct: 50, targetRankingKeys: ["x"] }, curated), 65);
});

test("summarize / entriesByStatus", () => {
  const catalog = {
    entries: {
      a: { status: "candidate", score: 0.5 },
      b: { status: "candidate", score: 0.9 },
      c: { status: "applied", score: 0.7 },
    },
  };
  assert.deepEqual(summarize(catalog), { candidate: 2, applied: 1 });
  const cands = entriesByStatus(catalog, "candidate");
  assert.equal(cands.length, 2);
  assert.equal(cands[0].score, 0.9); // 降順
});
