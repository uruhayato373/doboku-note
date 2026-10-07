/**
 * report-career-funnel の純関数テスト。
 *
 * 守りたい不変条件:
 *   - 柱の分類が first-match-wins で、実在の 38 slug が全部どこかへ落ちる
 *   - GA4 と GSC の窓が違うことを「揃っている」と誤認しない
 *   - (not set) と A8 取消（マイナス確定）を握り潰さない
 *   - stats47 混入疑い（GA4 クリックより A8 クリックが極端に多い）を数字として出せる
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  attributeByPage,
  checkWindows,
  joinRulesToWindow,
  pageContextOf,
  classifyNotSet,
  classifyPillar,
  foldEvents,
  isHighIntentQuery,
  stalenessDays,
  summarizeAfb,
  sumA8,
} from "../.claude/scripts/report-career-funnel.mjs";
import { matchesPage } from "../src/lib/affiliate-placement-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "config/career-funnel.json"), "utf8"));
const RULES = cfg.pillarRules;

test("柱分類: 代表 slug が意図した柱に落ちる", () => {
  assert.equal(classifyPillar("civil-construction-1-guide-quit-or-stay", RULES), "quit");
  assert.equal(classifyPillar("civil-construction-1-guide-market-value", RULES), "market-value");
  assert.equal(classifyPillar("civil-construction-1-guide-hatchu-shien", RULES), "career-path");
  assert.equal(classifyPillar("civil-construction-1-guide-resume", RULES), "application");
  assert.equal(classifyPillar("civil-construction-1-guide-career-agents", RULES), "service-choice");
});

test("柱分類: first-match-wins（後段の規則に食われない）", () => {
  // "career-agent-comparison" は career-path の "guide-career" にも当たるが、
  // service-choice が先に定義されているのでサービス比較になる。
  assert.equal(classifyPillar("civil-construction-1-guide-career-agent-comparison", RULES), "service-choice");
  // "career-consultation-before-quit" は career-path の "consultant" に**当たらず** quit になる。
  assert.equal(classifyPillar("civil-construction-1-guide-career-consultation-before-quit", RULES), "quit");
  // "career-salary" は市場価値（salary）であり career-path ではない。
  assert.equal(classifyPillar("civil-construction-1-guide-career-salary", RULES), "market-value");
});

test("柱分類: 未知 slug は失敗ではなく unclassified", () => {
  assert.equal(classifyPillar("civil-construction-1-guide-something-new", RULES), "unclassified");
});

test("柱分類: 実在の career 記事が 1 本も unclassified に落ちない", () => {
  const index = JSON.parse(readFileSync(join(ROOT, "src/config/doc-meta-index.json"), "utf8"));
  const slugs = Object.entries(index.docs)
    .filter(([, m]) => (m.tags ?? []).includes("career"))
    .map(([s]) => s);
  // 検査ゼロを PASS と呼ばない: 対象が取れていること自体を先に主張する
  assert.ok(slugs.length >= 30, `career 記事が ${slugs.length} 本しか取れていない（index の破損を疑う）`);
  const unclassified = slugs.filter((s) => classifyPillar(s, RULES) === "unclassified");
  assert.deepEqual(unclassified, [], `未分類: ${unclassified.join(", ")}`);
});

test("高意図 query: 語彙の部分一致で拾う", () => {
  const terms = cfg.highIntentQueryTerms;
  assert.equal(isHighIntentQuery("施工管理 転職エージェント", terms), true);
  assert.equal(isHighIntentQuery("ビルドジョブ 評判", terms), true);
  assert.equal(isHighIntentQuery("1級土木施工管理技士 過去問", terms), false);
});

test("窓: GA4 と GSC の日付がずれていたら aligned=false", () => {
  const w = checkWindows(
    { startDate: "2026-07-16", endDate: "2026-08-12" },
    { startDate: "2026-07-13", endDate: "2026-08-10" },
  );
  assert.equal(w.aligned, false);
  assert.equal(w.usable, true);
});

test("窓: 同一日付なら aligned=true", () => {
  const w = checkWindows(
    { startDate: "2026-07-16", endDate: "2026-08-12" },
    { startDate: "2026-07-16", endDate: "2026-08-12" },
  );
  assert.equal(w.aligned, true);
});

test("窓: 片方欠落は usable=false（推測で埋めない）", () => {
  assert.equal(checkWindows(null, { startDate: "a", endDate: "b" }).usable, false);
  assert.equal(checkWindows({ startDate: "a", endDate: "b" }, null).usable, false);
});

test("鮮度: 終端からの経過日数を返す", () => {
  const now = Date.parse("2026-08-21T00:00:00Z");
  assert.equal(stalenessDays("2026-08-12", now), 9);
  assert.equal(stalenessDays("2026-08-21", now), 0);
  assert.equal(stalenessDays("not-a-date", now), null);
});

test("入力 0 件: 畳んだ結果は空で、matched も 0（0 件を沈黙で PASS にしない）", () => {
  const { map, matched } = foldEvents([], "placement", {
    impressionEvent: "affiliate_cta_impression",
    clickEvent: "affiliate_cta_click",
  });
  assert.equal(map.size, 0);
  assert.equal(matched, 0);
});

test("(not set): 次元値として保持され、クリックが消えない", () => {
  const rows = [
    { placement: "sidebar", eventName: "affiliate_cta_impression", eventCount: 100 },
    { placement: "sidebar", eventName: "affiliate_cta_click", eventCount: 1 },
    { placement: "(not set)", eventName: "affiliate_cta_click", eventCount: 9 },
  ];
  const { map, matched } = foldEvents(rows, "placement", {
    impressionEvent: "affiliate_cta_impression",
    clickEvent: "affiliate_cta_click",
  });
  assert.equal(matched, 3);
  assert.equal(map.get("(not set)").clicks, 9);
  assert.equal(map.get("(not set)").impressions, 0);
  const totalClicks = [...map.values()].reduce((s, v) => s + v.clicks, 0);
  assert.equal(totalClicks, 10, "帰属不明クリックを総数から落とさない");
});

test("対象外イベントは畳まない（note CTA を affiliate に混ぜない）", () => {
  const rows = [
    { placement: "sidebar", eventName: "note_cta_click", eventCount: 393 },
    { placement: "sidebar", eventName: "affiliate_cta_click", eventCount: 4 },
  ];
  const { map, matched } = foldEvents(rows, "placement", {
    impressionEvent: "affiliate_cta_impression",
    clickEvent: "affiliate_cta_click",
  });
  assert.equal(matched, 1);
  assert.equal(map.get("sidebar").clicks, 4);
});

test("A8 取消: 確定がマイナスでも合算が壊れない", () => {
  const rows = [
    { month: "2026-06", clicks: 20, conversions: 1, approved: 0, revenueYen: 0 },
    { month: "2026-07", clicks: 12, conversions: 0, approved: -1, revenueYen: -50000 },
  ];
  const s = sumA8(rows);
  assert.equal(s.conversions, 1);
  assert.equal(s.approved, -1);
  assert.equal(s.revenueYen, -50000, "取消を 0 に丸めない（EPC が実態より良く見える）");
});

test("A8: 欠損フィールドは 0 として扱い NaN を作らない", () => {
  const s = sumA8([{ month: "2026-05" }, { month: "2026-06", clicks: 3 }]);
  assert.deepEqual(s, { clicks: 3, conversions: 0, approved: 0, revenueYen: 0 });
});

test("afb: 状態別件数を数える（fetch-afb-outcomes.mjs の records は conversionId で重複排除済み）", () => {
  const afb = {
    records: [
      { conversionId: "1", status: "pending" },
      { conversionId: "2", status: "approved" },
      { conversionId: "3", status: "approved" },
      { conversionId: "4", status: "rejected" },
    ],
  };
  assert.deepEqual(summarizeAfb(afb), { pending: 1, approved: 2, rejected: 1 });
});

test("afb: records が空でも 0 件として数える（未取得と混同しない側の責務は呼び出し側）", () => {
  assert.deepEqual(summarizeAfb({ records: [] }), { pending: 0, approved: 0, rejected: 0 });
});

test("stats47 混入疑い: A8 クリックが GA4 クリックを大きく上回る形を数値で示せる", () => {
  // A8 は doboku-note と stats47 が同一口座に同居するため、A8 側クリックが
  // サイト固有クリックより多くなりうる。分母に使わない判断の根拠を数字で持つ。
  const a8 = sumA8([{ month: "2026-07", clicks: 60, conversions: 0, approved: 0, revenueYen: 0 }]);
  const ga4Clicks = 19;
  assert.ok(a8.clicks > ga4Clicks * 2, "この形を検知できることをテストで固定する");
});

test("(not set) の切り分け: 窓が作成日より前なら遡及不可（仕様）", () => {
  // 2026-08-21 の実データ: cta_placement 作成 2026-07-25 / 窓の始端 2026-07-16
  const v = classifyNotSet({ windowStart: "2026-07-16", registeredAt: "2026-07-25" });
  assert.equal(v.kind, "pre-registration");
  assert.equal(v.preRegistrationDays, 9);
});

test("(not set) の切り分け: 窓が全て作成日以降なら配線欠落", () => {
  const v = classifyNotSet({ windowStart: "2026-08-01", registeredAt: "2026-07-25" });
  assert.equal(v.kind, "wiring-gap");
  assert.equal(v.preRegistrationDays, 0);
});

test("(not set) の切り分け: 始端と作成日が同日なら配線欠落側（境界）", () => {
  assert.equal(classifyNotSet({ windowStart: "2026-07-25", registeredAt: "2026-07-25" }).kind, "wiring-gap");
});

test("(not set) の切り分け: 作成日が不明なら断定しない", () => {
  assert.equal(classifyNotSet({ windowStart: "2026-08-01", registeredAt: null }).kind, "unknown");
});

test("設定のディメンション作成日が GA4 desired state と一致する", () => {
  const ga4 = JSON.parse(readFileSync(join(ROOT, "config/ga4-admin-desired-state.json"), "utf8"));
  const observed = JSON.stringify(ga4);
  for (const [param, date] of Object.entries(cfg.dimensionRegisteredAt)) {
    assert.ok(observed.includes(param), `${param} が ga4-admin-desired-state.json に無い`);
    assert.ok(observed.includes(date.replace(/-/g, "-")), `${param} の作成日 ${date} が実機観測値と食い違う`);
  }
});

test("joinRulesToWindow: ルールを GA4 の配置別の窓と A8 の月へ結び、同じ面を分け合うルールと窓の一部だけ有効なルールを明示する", () => {
  const rules = [
    { id: "PL-0001", program: "buildjob", slot: "article-end", experiment: "EXP-008", period: { from: "2026-09-08T00:00:00+09:00", until: null } },
    { id: "PL-0002", program: "dx-consulting", slot: "article-end", experiment: null, period: { from: "2026-09-08T00:00:00+09:00", until: null } },
    { id: "PL-0003", program: "buildjob", slot: "sidebar", experiment: null, period: { from: "2026-09-08T00:00:00+09:00", until: "2026-09-26T00:00:00+09:00" } },
    { id: "PL-0004", program: "buildjob", slot: "article-mid", experiment: null, period: { from: "2026-11-01T00:00:00+09:00", until: null } },
  ];
  const byPlacement = new Map([["article-end", { impressions: 3960, clicks: 0 }], ["sidebar", { impressions: 11504, clicks: 2 }]]);
  const a8 = [
    { month: "2026-09", program: "buildjob", conversions: 0, approved: 0, revenueYen: 0 },
    { month: "2026-10", program: "buildjob", conversions: 1, approved: 0, revenueYen: 0 },
  ];
  const got = joinRulesToWindow(rules, { start: "2026-09-04", end: "2026-10-01" }, byPlacement, a8);
  assert.deepEqual(got.map((r) => r.ruleId), ["PL-0001", "PL-0002", "PL-0003"], "窓に掛からないルール（11 月から）は出さない");
  const [end, , sidebar] = got;
  assert.deepEqual(end.ga4, { source: "placement", coveredDays: 24, windowDays: 28, impressions: 3960, clicks: 0, impressionsShared: 0, clicksShared: 0, ctr: 0, sharedWith: ["PL-0002"] });
  assert.equal(sidebar.ga4.coveredDays, 18, "9/8〜9/25 の 18 日");
  assert.deepEqual(end.a8.months, ["2026-09"], "窓の端の 1 日（10/1）だけで 10 月の成果を拾わない");
  assert.equal(end.a8.conversions, 0);
  assert.deepEqual(joinRulesToWindow(rules, null, byPlacement, a8), [], "窓が無ければ空");
});

test("pageContextOf: 記事はカテゴリとキャリア記事か、資格トップ・実務トップはカテゴリ、ツールは tool、公的基準は standards、トップは home、分からなければ null", () => {
  const index = { docs: { "civil-construction-1-secondary-r07": { category: "civil-construction-1", tags: ["試験"] }, "civil-construction-1-guide-resume": { category: "civil-construction-1", tags: ["career"] } } };
  const slugOf = (p) => ({ "/exam/civil-construction-1/secondary/r07": "civil-construction-1-secondary-r07", "/exam/civil-construction-1/guide/resume": "civil-construction-1-guide-resume" })[p] ?? null;
  assert.deepEqual(pageContextOf("/exam/civil-construction-1/secondary/r07", index, slugOf), { pageKind: "doc", category: "civil-construction-1", isCareerDoc: false });
  assert.equal(pageContextOf("/exam/civil-construction-1/guide/resume", index, slugOf).isCareerDoc, true);
  assert.deepEqual(pageContextOf("/exam/rccm/", index, slugOf), { pageKind: "category", category: "rccm", isCareerDoc: false });
  assert.equal(pageContextOf("/practice", index, slugOf).category, "civil-practice");
  assert.equal(pageContextOf("/tools/career-check", index, slugOf).pageKind, "tool");
  assert.deepEqual(pageContextOf("/standards/mlit/doboku-kyotsu-shiyosho/chapters/1-1", index, slugOf), { pageKind: "standards", category: null, isCareerDoc: false });
  assert.deepEqual(pageContextOf("/", index, slugOf), { pageKind: "home", category: null, isCareerDoc: false });
  assert.equal(pageContextOf("/about", index, slugOf), null);
});

test("attributeByPage: ページ・面・案件・日付でルールを 1 つに決め、決まらないものは推測で分けない", () => {
  const civil1 = ["civil-construction-1"];
  const rules = [
    // 同じ面（本文カード）・同じ案件を 9/20 に閉じて開き直した前後のルール
    { id: "PL-0001", program: "buildjob", slot: "article-inline", target: { pageKind: "doc", categories: civil1 }, experiment: "EXP-008", period: { from: "2026-09-08T00:00:00+09:00", until: "2026-09-20T12:00:00+09:00" } },
    { id: "PL-0002", program: "buildjob", slot: "article-inline", target: { pageKind: "doc", categories: civil1 }, experiment: "EXP-017", period: { from: "2026-09-20T12:00:00+09:00", until: null } },
    // 同じ面の別案件（総監だけ）
    { id: "PL-0003", program: "dx-consulting", slot: "article-inline", target: { pageKind: "doc", categories: ["pe-comprehensive-management"] }, experiment: null, period: { from: "2026-09-08T00:00:00+09:00", until: null } },
  ];
  const ctx = (p) => (p.startsWith("/exam/civil-construction-1/") ? { pageKind: "doc", category: "civil-construction-1", isCareerDoc: false } : p.startsWith("/exam/pe-") ? { pageKind: "doc", category: "pe-comprehensive-management", isCareerDoc: false } : null);
  const labels = new Map([["ビルドジョブ", "buildjob"], ["ハイクラス DX・コンサル転職", "dx-consulting"]]);
  const row = (page, label, date, eventName, eventCount) => ({ page, label, placement: "article-inline", date, eventName, eventCount });
  const rows = [
    row("/exam/civil-construction-1/secondary/r07", "ビルドジョブ", "2026-09-10", "affiliate_cta_click", 2), // 閉じる前 → PL-0001
    row("/exam/civil-construction-1/secondary/r07", "ビルドジョブ", "2026-09-28", "affiliate_cta_click", 1), // 開き直した後 → PL-0002
    row("/exam/civil-construction-1/secondary/r07", "ビルドジョブ", "2026-09-20", "affiliate_cta_click", 1), // 境界の日 → 両方の clicksShared
    row("/exam/civil-construction-1/secondary/r07", "ビルドジョブ", null, "affiliate_cta_impression", 500), // 表示は日付なし → 両方の impressionsShared
    row("/exam/pe-comprehensive-management/keywords/x", "ハイクラス DX・コンサル転職", null, "affiliate_cta_impression", 80), // → PL-0003
    row("/exam/pe-comprehensive-management/keywords/x", "ハイクラス DX・コンサル転職", "2026-09-15", "affiliate_cta_click", 1),
    row("/about", "ビルドジョブ", "2026-09-12", "affiliate_cta_click", 1), // ページ不明 → unattributed
    row("/exam/civil-construction-1/secondary/r07", "BuildJob-sidebar", null, "affiliate_cta_impression", 30), // ラベル未登録 → unattributed
  ];
  const a8 = [{ month: "2026-09", program: "buildjob", conversions: 1, approved: 0, revenueYen: 0 }];
  const got = attributeByPage(rules, { start: "2026-09-04", end: "2026-10-01" }, rows, ctx, labels, a8, { matchesPage });
  const by = Object.fromEntries(got.byRule.map((r) => [r.ruleId, r.ga4]));
  assert.deepEqual([by["PL-0001"].clicks, by["PL-0001"].clicksShared, by["PL-0001"].impressions, by["PL-0001"].impressionsShared], [2, 1, 0, 500]);
  assert.deepEqual([by["PL-0002"].clicks, by["PL-0002"].clicksShared, by["PL-0002"].impressionsShared], [1, 1, 500]);
  assert.deepEqual(by["PL-0001"].sharedWith, ["PL-0002"]);
  assert.equal(by["PL-0001"].ctr, null, "分けられない数字があるルールの率は出さない");
  assert.deepEqual([by["PL-0003"].impressions, by["PL-0003"].clicks, by["PL-0003"].ctr, by["PL-0003"].source], [80, 1, 1 / 80, "page"]);
  assert.deepEqual([got.unattributed.clicks, got.unattributed.impressions], [1, 30]);
  assert.equal(got.clickLog.length, 5, "クリックは全部日付つきで残す（ルールに当たらないものも）");
  assert.equal(got.clickLog[0].date, "2026-09-28", "新しい順");
  assert.equal(got.clickLog.find((c) => c.date === "2026-09-20").ruleId, null, "境界の日はルールを決めない");
  assert.equal(got.clickLog.find((c) => c.date === "2026-09-10").ruleId, "PL-0001");
  assert.deepEqual(got.byRule.find((r) => r.ruleId === "PL-0001").a8.months, ["2026-09"]);
});
