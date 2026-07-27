import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  decodeCsvBuffer,
  parseNumber,
  parseDate,
  parseMonth,
  mapColumns,
  normalizeA8Csv,
  upsertBy,
  KEY,
  toResultsRecords,
  resolveProgram,
  parsePeriodFromFilename,
  crossCheckAgainstSite,
} from "../scripts/lib/a8-report-csv.mjs";

const cfg = JSON.parse(readFileSync(".claude/config/a8-report-automation.json", "utf-8"));

// ─── 実機 fixture（2026-07-27 に A8 から実際に DL した CSV のヘッダーと行）──────────
// 画面のヘッダー（説明文つき）とは別物で、CSV はクリーンな短い列名。合計行は含まれない。
const SITE_CSV = [
  '"サイト","imp数","click数","CTR","発生件数","発生金額","CVR","確定件数","確定金額","確定率","キャンセル件数","キャンセル金額","未確定件数","未確定金額"',
  '"doboku-note",40928,137,0.33,1,50000,0.73,0,0,0,1,50000,0,0',
  '"統計で見る都道府県",105220,643,0.61,0,0,0,0,0,"-",0,0,0,0',
].join("\n");

const PROGRAM_CSV = [
  '"プログラムID","プログラム名","imp数","click数","CTR","発生件数","発生金額","CVR","EPC","確定件数","確定金額","確定率","キャンセル件数","キャンセル金額","未確定件数","未確定金額"',
  '"s00000024757004","ビルドジョブ｜建設業界特化の転職エージェントの無料キャリア面談",15422,56,0.36,1,50000,1.79,892,0,0,0,1,50000,0,0',
  '"s00000023057002","日本最大級 施工管理・建設業界の転職サイト「建設JOBs」",10387,16,0.15,0,0,0,0,0,0,"-",0,0,0,0',
  '"s00000027444001","環境構築不要！AIエージェント開発を非エンジニアでも即実践【AI Agent Camp】",26439,179,0.68,0,0,0,0,0,0,"-",0,0,0,0',
].join("\n");

test("parseNumber: カンマ・通貨記号・単位・ハイフンを落とす", () => {
  assert.equal(parseNumber("1,234"), 1234);
  assert.equal(parseNumber("¥12,000"), 12000);
  assert.equal(parseNumber("3件"), 3);
  assert.equal(parseNumber("0"), 0);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("-"), null, 'A8 は算出不能を "-" で返す');
  assert.equal(parseNumber(null), null);
});

test("parseDate / parseMonth: A8 の表記ゆれを吸収", () => {
  assert.equal(parseDate("2026/07/05"), "2026-07-05");
  assert.equal(parseDate("2026-7-5"), "2026-07-05");
  assert.equal(parseDate("20260705"), "2026-07-05");
  assert.equal(parseDate("なにか"), null);
  assert.equal(parseMonth("2026/07"), "2026-07");
  assert.equal(parseMonth("2026年7月"), "2026-07");
  assert.equal(parseMonth("202607"), "2026-07");
  // ★実機の期間別（月別）CSV は "2026-07" 形式。文字クラスを [/-年] と書くと
  //   「/ から 年 まで」の範囲になりハイフンを取りこぼす（2026-07-27 の実走で発覚）
  assert.equal(parseMonth("2026-07"), "2026-07");
  assert.equal(parseMonth("2026-6"), "2026-06");
});

test("decodeCsvBuffer: 誤ったエンコーディング指定でも UTF-8 へ自動切替", () => {
  const utf8 = Buffer.from("サイト,click数\ndoboku-note,5\n", "utf-8");
  const r = decodeCsvBuffer(utf8, "shift_jis");
  assert.ok(r.text.includes("click数"));
  assert.equal(r.switched, true);
  assert.equal(r.encoding, "utf-8");
});

test("mapColumns: 実機ヘッダーを写像し、未確定/確定を取り違えない", () => {
  const headers = SITE_CSV.split("\n")[0].split(",").map((h) => h.replace(/"/g, ""));
  const cols = mapColumns(headers, cfg.a8.columnAliases);
  assert.equal(cols.site, 0);
  assert.equal(cols.impressions, 1);
  assert.equal(cols.clicks, 2);
  assert.equal(cols.conversions, 4);
  assert.equal(cols.grossRevenueYen, 5, "発生金額");
  assert.equal(cols.approved, 7, "確定件数");
  assert.equal(cols.revenueYen, 8, "確定金額（EPC の分子）");
  assert.equal(cols.cancelledCount, 10);
  assert.equal(cols.cancelledYen, 11);
  assert.equal(cols.pendingCount, 12, "『未確定件数』が『確定件数』に吸われないこと");
  assert.equal(cols.pendingRevenueYen, 13, "『未確定金額』が『確定金額』に吸われないこと");
});

test("mapColumns: 配列でない解説キー（_note 等）は無視する", () => {
  const withNote = { ...cfg.a8.columnAliases, _note: "解説文" };
  assert.doesNotThrow(() => mapColumns(["サイト", "click数"], withNote));
});

test("normalizeA8Csv[site-summary]: doboku-note の行だけを採る（真実源）", () => {
  const { rows, rejects, fatal, siteScope } = normalizeA8Csv(SITE_CSV, { reportKey: "site-summary", cfg });
  assert.equal(fatal, null);
  assert.equal(siteScope, "site-rows");
  assert.equal(rejects.length, 0);
  assert.equal(rows.length, 1, "統計で見る都道府県の行は除外される");
  const r = rows[0];
  assert.equal(r.site, "doboku-note");
  assert.equal(r.clicks, 137);
  assert.equal(r.conversions, 1);
  assert.equal(r.grossRevenueYen, 50000);
  assert.equal(r.approved, 0);
  assert.equal(r.revenueYen, 0, "確定金額は 0（発生 ¥50,000 はキャンセル済み）");
  assert.equal(r.cancelledCount, 1);
  assert.equal(r.cancelledYen, 50000);
});

test("normalizeA8Csv[site-summary]: サイト列が空なら reject（帰属不明を通さない）", () => {
  const csv = ['"サイト","click数"', '"",120'].join("\n");
  const { rows, rejects } = normalizeA8Csv(csv, { reportKey: "site-summary", cfg });
  assert.equal(rows.length, 0);
  assert.equal(rejects.length, 1);
});

test("normalizeA8Csv[program-detail]: 口座横断を明示し、プログラムID で写像する", () => {
  const { rows, fatal } = normalizeA8Csv(PROGRAM_CSV, { reportKey: "program-detail", cfg });
  assert.equal(fatal, null);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.accountWide === true), "account-wide の事実を各行に刻む");
  assert.equal(rows[0].programId, "s00000024757004");
  assert.equal(rows[0].program, "buildjob");
  assert.equal(rows[0].clicks, 56);
  assert.equal(rows[1].program, "kensetsu-jobs");
  assert.equal(rows[2].program, null, "stats47 のプログラムは allowlist 外＝写像しない");
});

test("resolveProgram: プログラムID を名前より優先する", () => {
  const map = { s00000024757004: "buildjob", ビルドジョブ: "buildjob", 建設JOBs: "kensetsu-jobs" };
  assert.equal(resolveProgram("まったく別の名前に改名された", map, "s00000024757004"), "buildjob");
  assert.equal(resolveProgram("ビルドジョブ｜…", map, null), "buildjob", "ID が無ければ名前の部分一致");
  assert.equal(resolveProgram("知らないプログラム", map, "s99999999999"), null);
});

test("normalizeA8Csv: 合計行は集計に混ぜない", () => {
  const csv = ['"サイト","click数"', '"合計",780', '"doboku-note",137'].join("\n");
  const { rows } = normalizeA8Csv(csv, { reportKey: "site-summary", cfg });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].clicks, 137);
});

test("normalizeA8Csv: 必須列が無ければ fatal を返し行を作らない", () => {
  const { rows, fatal } = normalizeA8Csv("なにか,ほか\n1,2\n", { reportKey: "program-detail", cfg });
  assert.ok(fatal);
  assert.equal(rows.length, 0);
});

test("parsePeriodFromFilename: 期間と単月判定を取り出す", () => {
  const multi = parsePeriodFromFilename("site_202601-202607_20260727105756.csv");
  assert.equal(multi.start, "2026-01");
  assert.equal(multi.end, "2026-07");
  assert.equal(multi.singleMonth, null, "複数月にまたがる期間は単月ではない");

  const single = parsePeriodFromFilename("program_detail_monthly_202607-202607_20260727.csv");
  assert.equal(single.singleMonth, "2026-07");
  assert.equal(parsePeriodFromFilename("なんとか.csv"), null);
});

test("upsertBy: 同一キーは最新で置換し、行が増えない（冪等）", () => {
  const first = [
    { period: "202607-202607", programId: "s001", approved: 1, revenueYen: 3000 },
    { period: "202606-202606", programId: "s001", approved: 5, revenueYen: 15000 },
  ];
  const second = [{ period: "202607-202607", programId: "s001", approved: 2, revenueYen: 8000 }];

  const once = upsertBy([], first, KEY.programPeriod);
  const twice = upsertBy(once, second, KEY.programPeriod);
  const thrice = upsertBy(twice, second, KEY.programPeriod);

  assert.equal(twice.length, 2, "重複追加しない");
  assert.equal(thrice.length, 2, "同じ入力を再適用しても増えない");
  const jul = thrice.find((r) => r.period === "202607-202607");
  assert.equal(jul.approved, 2, "確定が遡及更新されて最新値になる");
  assert.equal(jul.revenueYen, 8000);
});

test("toResultsRecords: 期間が単月でなければ月次 SSOT へ写さない", () => {
  const rows = [{ programId: "s001", programRaw: "ビルドジョブ", program: "buildjob", clicks: 56, revenueYen: 0, period: "202601-202607" }];
  const multi = toResultsRecords(rows, { singleMonth: null });
  assert.equal(multi.records.length, 0, "累計値を特定月の実績として書き込まない");
  assert.equal(multi.notAttributable.length, 1);

  const single = toResultsRecords(rows, { singleMonth: "2026-07" });
  assert.equal(single.records.length, 1);
  assert.equal(single.records[0].month, "2026-07");
  assert.equal(single.records[0].program, "buildjob");
});

test("toResultsRecords: 未写像プログラムは黙って捨てず unmapped で返す", () => {
  const { records, unmapped } = toResultsRecords(
    [{ programId: "s999", programRaw: "謎", program: null }],
    { singleMonth: "2026-07" },
  );
  assert.equal(records.length, 0);
  assert.equal(unmapped.length, 1);
  assert.equal(unmapped[0].programId, "s999");
});

test("crossCheckAgainstSite: allowlist 抽出がサイト別を超えたら混入を検出する", () => {
  const siteRow = { clicks: 137, conversions: 1, grossRevenueYen: 50000, approved: 0, revenueYen: 0 };

  const ok = crossCheckAgainstSite(siteRow, [{ clicks: 56 }, { clicks: 16 }, { clicks: 30 }]);
  assert.equal(ok.comparable, true);
  assert.equal(ok.exceeded, false, "102 ≤ 137 なので範囲内");

  const bad = crossCheckAgainstSite(siteRow, [{ clicks: 56 }, { clicks: 200 }]);
  assert.equal(bad.exceeded, true, "サイト別を超えたら他サイト混入の疑い");

  assert.equal(crossCheckAgainstSite(null, []).comparable, false);
});
