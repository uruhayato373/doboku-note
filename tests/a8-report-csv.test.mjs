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
} from "../scripts/lib/a8-report-csv.mjs";

const cfg = JSON.parse(readFileSync(".claude/config/a8-report-automation.json", "utf-8"));

test("parseNumber: カンマ・通貨記号・単位を落とす", () => {
  assert.equal(parseNumber("1,234"), 1234);
  assert.equal(parseNumber("¥12,000"), 12000);
  assert.equal(parseNumber("3件"), 3);
  assert.equal(parseNumber("0"), 0);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("-"), null);
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
  assert.equal(parseMonth("2026/07/05"), "2026-07");
});

test("decodeCsvBuffer: Shift_JIS を復号し、誤指定なら UTF-8 へ自動切替", () => {
  const utf8 = Buffer.from("日付,クリック数\n2026/07/01,5\n", "utf-8");
  const r = decodeCsvBuffer(utf8, "shift_jis");
  assert.ok(r.text.includes("クリック数"), "UTF-8 実体を shift_jis 指定でも読めること");
  assert.equal(r.switched, true);
  assert.equal(r.encoding, "utf-8");
});

test("mapColumns: 完全一致優先・部分一致フォールバック", () => {
  const cols = mapColumns(["日付", "プログラム名", "クリック数", "確定報酬額"], cfg.a8.columnAliases);
  assert.equal(cols.date, 0);
  assert.equal(cols.programName, 1);
  assert.equal(cols.clicks, 2);
  assert.equal(cols.revenueYen, 3);
});

test("normalizeA8Csv: program-detail を正規化し programIdMap で写像", () => {
  const csv = [
    "年月,プログラム名,クリック数,発生件数,確定件数,確定報酬",
    "2026/07,ビルドジョブ,120,3,2,\"8,000\"",
    "2026/07,建設JOBs,80,1,1,3000",
    "2026/07,謎のプログラム,10,0,0,0",
  ].join("\n");
  const { rows, rejects, fatal } = normalizeA8Csv(csv, { reportKey: "program-detail", cfg });
  assert.equal(fatal, null);
  assert.equal(rejects.length, 0);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].month, "2026-07");
  assert.equal(rows[0].program, "buildjob");
  assert.equal(rows[0].clicks, 120);
  assert.equal(rows[0].revenueYen, 8000);
  assert.equal(rows[1].program, "kensetsu-jobs");
  assert.equal(rows[2].program, null, "未知プログラムは写像せず null で保持する");
  assert.equal(rows[2].programRaw, "謎のプログラム");
});

test("normalizeA8Csv: 必須列が無ければ fatal を返し行を作らない", () => {
  const csv = "なにか,ほか\n1,2\n";
  const { rows, fatal } = normalizeA8Csv(csv, { reportKey: "program-detail", cfg });
  assert.ok(fatal, "fatal が立つこと");
  assert.equal(rows.length, 0);
});

test("normalizeA8Csv: site-column モードでは他サイト行を除外する", () => {
  const siteCfg = { ...cfg, a8: { ...cfg.a8, isolationMode: "site-column" } };
  const csv = [
    "年月,サイト,プログラム名,クリック数,確定報酬",
    "2026/07,doboku-note,ビルドジョブ,120,8000",
    "2026/07,統計で見る都道府県,ビルドジョブ,900,50000",
  ].join("\n");
  const { rows } = normalizeA8Csv(csv, { reportKey: "program-detail", cfg: siteCfg });
  assert.equal(rows.length, 1, "doboku-note の行だけ残る");
  assert.equal(rows[0].clicks, 120);
});

test("normalizeA8Csv: site-column モードでサイト列が空なら reject（帰属不明を通さない）", () => {
  const siteCfg = { ...cfg, a8: { ...cfg.a8, isolationMode: "site-column" } };
  const csv = ["年月,サイト,プログラム名,クリック数", "2026/07,,ビルドジョブ,120"].join("\n");
  const { rows, rejects } = normalizeA8Csv(csv, { reportKey: "program-detail", cfg: siteCfg });
  assert.equal(rows.length, 0);
  assert.equal(rejects.length, 1);
});

test("upsertBy: 同一キーは最新で置換し、行が増えない（冪等）", () => {
  const first = [
    { month: "2026-07", programRaw: "ビルドジョブ", approved: 1, revenueYen: 3000 },
    { month: "2026-06", programRaw: "ビルドジョブ", approved: 5, revenueYen: 15000 },
  ];
  const second = [{ month: "2026-07", programRaw: "ビルドジョブ", approved: 2, revenueYen: 8000 }];

  const once = upsertBy([], first, KEY.programMonthly);
  const twice = upsertBy(once, second, KEY.programMonthly);
  const thrice = upsertBy(twice, second, KEY.programMonthly);

  assert.equal(twice.length, 2, "既存 2 件のまま（重複追加しない）");
  assert.equal(thrice.length, 2, "同じ入力を再適用しても増えない");
  const jul = thrice.find((r) => r.month === "2026-07");
  assert.equal(jul.approved, 2, "確定が遡及更新されて最新値になる");
  assert.equal(jul.revenueYen, 8000);
  assert.equal(thrice[0].month, "2026-06", "キー順で安定ソート");
});

test("toResultsRecords: 既存 a8-results スキーマへ写像し、未写像は unmapped で返す", () => {
  const rows = [
    { month: "2026-07", programRaw: "ビルドジョブ", program: "buildjob", clicks: 120, conversions: 3, approved: 2, revenueYen: 8000 },
    { month: "2026-07", programRaw: "謎", program: null, clicks: 10 },
  ];
  const { records, unmapped } = toResultsRecords(rows);
  assert.equal(records.length, 1);
  assert.deepEqual(Object.keys(records[0]).sort(), ["approved", "clicks", "conversions", "month", "note", "program", "revenueYen"]);
  assert.equal(records[0].program, "buildjob");
  assert.equal(unmapped.length, 1, "写像できない行は黙って捨てず報告する");
  assert.equal(unmapped[0].programRaw, "謎");
});
