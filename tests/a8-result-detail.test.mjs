// A8 の成果別（/report/result）を 1 成果 1 行で記録し、クリックしたページで配置ルールへ寄せる（2026-10-07〜）。
// 10/05 のビルドジョブ成果は、A8 のリファラがドメインだけで GA4 もクリックを取りこぼし、ページを特定できなかった。
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeA8ResultCsv, periodQueryFor, sitePageOf, REFERRER_FULL_SINCE } from "../scripts/lib/a8-report-csv.mjs";
import { attributeConversions } from "../.claude/scripts/report-career-funnel.mjs";
import { matchesPage } from "../src/lib/affiliate-placement-core.mjs";

const cfg = { a8: { targetSite: "doboku-note", relatedSites: ["doboku-note（note）"], programIdMap: { s00000024757004: "buildjob" } } };
const HEAD = '"プログラムID","プログラム名","ステータス","成果種別","クリック日","注文日","確定日","発生金額","確定金額","注文金額","注文ID","素材ID","デバイス","サイト","コンバージョンリファラ"';
const row = (site, clicked, ref, id = "1") => `"s00000024757004","ビルドジョブ｜建設","未確定","掲載広告",${clicked},${clicked},"-",13534,0,1,${id},003,"PC","${site}","${ref}"`;

test("このサイトと副サイトの成果だけを残し、自サイトのページの path を取る", () => {
  const csv = [HEAD,
    row("doboku-note", "2026-10-09 10:00:00", "https://doboku-note.com/practice/backfill-river-excavation?x=1", "a"),
    row("統計で見る都道府県", "2026-10-09 11:00:00", "https://stats47.jp/", "b"),
    row("doboku-note（note）", "2026-10-09 12:00:00", "https://note.com/dobokunote/n/abc", "c"),
  ].join("\n");
  const { rows, fatal } = normalizeA8ResultCsv(csv, { cfg, fetchedAt: "2026-10-10T00:00:00.000Z" });
  assert.equal(fatal, null);
  assert.deepEqual(rows.map((r) => [r.orderId, r.site, r.program, r.page, r.clickedAt]), [
    ["a", "doboku-note", "buildjob", "/practice/backfill-river-excavation", "2026-10-09T10:00:00+09:00"],
    ["c", "doboku-note（note）", "buildjob", null, "2026-10-09T12:00:00+09:00"],
  ]);
});

test("ページの URL を渡す前のクリックはドメインだけなので page を null にする（トップと区別できない）", () => {
  const csv = [HEAD, row("doboku-note", "2026-10-05 10:37:13", "https://doboku-note.com/")].join("\n");
  assert.equal(normalizeA8ResultCsv(csv, { cfg }).rows[0].page, null);
  assert.ok(Date.parse("2026-10-05T10:37:13+09:00") < Date.parse(REFERRER_FULL_SINCE));
  const after = [HEAD, row("doboku-note", "2026-10-08 09:00:00", "https://doboku-note.com/")].join("\n");
  assert.equal(normalizeA8ResultCsv(after, { cfg }).rows[0].page, "/");
});

test("列名が変わったら推測で埋めずに fatal", () => {
  assert.match(normalizeA8ResultCsv('"プログラムID","注文ID"\n"s1","1"', { cfg }).fatal, /必須列/);
});

test("期間の URL は単月なら月初〜月末（当月は今日まで・JST）", () => {
  const now = new Date("2026-10-07T03:00:00Z");
  assert.equal(periodQueryFor("2026-09", now), "?start_date=2026-09-01&end_date=2026-09-30");
  assert.equal(periodQueryFor("2026-10", now), "?start_date=2026-10-01&end_date=2026-10-07");
  assert.equal(periodQueryFor(null, new Date("2026-09-30T20:00:00Z")), "?start_date=2026-10-01&end_date=2026-10-01");
});

test("sitePageOf は自サイトだけ path を返す", () => {
  assert.equal(sitePageOf("https://doboku-note.com/exam/rccm/"), "/exam/rccm/");
  assert.equal(sitePageOf("https://example.com/x"), null);
  assert.equal(sitePageOf(""), null);
});

test("成果をページ・案件・クリック時刻で有効だった配置ルールへ寄せる（候補が 1 つなら面まで決まる）", () => {
  const rules = [
    { id: "PL-0025", program: "buildjob", slot: "article-mid", target: { pageKind: "doc", categories: ["civil-practice"] }, period: { from: "2026-10-07T17:00:00+09:00", until: null } },
    { id: "PL-0026", program: "buildjob", slot: "article-end", target: { pageKind: "doc", categories: ["civil-practice"], careerDoc: "exclude" }, period: { from: "2026-10-07T17:00:00+09:00", until: null } },
    { id: "PL-0033", program: "buildjob", slot: "home-section", target: { pageKind: "home" }, period: { from: "2026-10-07T17:00:00+09:00", until: null } },
  ];
  const pageCtx = (p) => (p === "/" ? { pageKind: "home", category: null, isCareerDoc: false } : { pageKind: "doc", category: "civil-practice", isCareerDoc: false });
  const out = attributeConversions(
    [
      { clickedAt: "2026-10-08T09:00:00+09:00", program: "buildjob", status: "未確定", grossRevenueYen: 13534, revenueYen: 0, device: "PC", site: "doboku-note", page: "/" },
      { clickedAt: "2026-10-09T09:00:00+09:00", program: "buildjob", status: "未確定", grossRevenueYen: 13534, revenueYen: 0, device: "PC", site: "doboku-note", page: "/practice/x" },
      { clickedAt: "2026-10-05T10:37:13+09:00", program: "buildjob", status: "未確定", grossRevenueYen: 13534, revenueYen: 0, device: "PC", site: "doboku-note", page: null },
    ],
    rules, pageCtx, { matchesPage },
  );
  assert.deepEqual(out.map((c) => [c.page, c.ruleId, c.candidates.map((x) => x.ruleId)]), [
    ["/practice/x", null, ["PL-0025", "PL-0026"]],
    ["/", "PL-0033", ["PL-0033"]],
    [null, null, []],
  ]);
});
