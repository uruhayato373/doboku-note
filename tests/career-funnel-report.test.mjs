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
  checkWindows,
  classifyNotSet,
  classifyPillar,
  foldEvents,
  isHighIntentQuery,
  stalenessDays,
  sumA8,
} from "../.claude/scripts/report-career-funnel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, ".claude/config/career-funnel.json"), "utf8"));
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
  const ga4 = JSON.parse(readFileSync(join(ROOT, ".claude/config/ga4-admin-desired-state.json"), "utf8"));
  const observed = JSON.stringify(ga4);
  for (const [param, date] of Object.entries(cfg.dimensionRegisteredAt)) {
    assert.ok(observed.includes(param), `${param} が ga4-admin-desired-state.json に無い`);
    assert.ok(observed.includes(date.replace(/-/g, "-")), `${param} の作成日 ${date} が実機観測値と食い違う`);
  }
});
