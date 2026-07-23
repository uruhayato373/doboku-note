import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  parseCsv,
  parseCsvRecords,
  stripBom,
  mapHeader,
  normalizePageIndexingCsv,
} from "../scripts/lib/google-console-csv.mjs";
import {
  toComparisonKey,
  toJoinKey,
  tryParseUrl,
} from "../scripts/lib/url-normalization.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fx = (name) =>
  readFileSync(join(__dirname, "fixtures", "google-console", name), "utf-8");

// ─────────────────────────── CSV parser ───────────────────────────

test("BOM を除去し、日本語ヘッダーを正規化フィールドへ写像する", () => {
  const text = fx("ja-page-indexing.csv");
  assert.equal(text.charCodeAt(0), 0xfeff, "fixture が BOM 付きであること");
  const { headers } = parseCsv(text);
  assert.equal(headers[0], "URL"); // BOM が剥がれていること
  assert.equal(mapHeader(headers[0]), "url");
  assert.equal(mapHeader(headers[1]), "lastCrawled");
});

test("英語ヘッダーを正規化フィールドへ写像する", () => {
  const { headers } = parseCsv(fx("en-page-indexing.csv"));
  assert.equal(mapHeader(headers[0]), "url");
  assert.equal(mapHeader(headers[1]), "lastCrawled");
});

test("実データのヘッダー『前回のクロール』を lastCrawled に写像する（実 GSC 表 CSV の列名）", () => {
  // GSC の実 ZIP 内 表 CSV は "URL,前回のクロール"。取得実測で判明した列名を回帰で固定。
  assert.equal(mapHeader("URL"), "url");
  assert.equal(mapHeader("前回のクロール"), "lastCrawled");
  const out = normalizePageIndexingCsv("URL,前回のクロール\nhttps://doboku-note.com/docs/a,2026-07-09\n", {
    runId: "t",
  });
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].lastCrawled, "2026-07-09");
});

test("stripBom は BOM のみ除去し本文は保持する", () => {
  assert.equal(stripBom("﻿URL"), "URL");
  assert.equal(stripBom("URL"), "URL");
});

test("CRLF と LF の両方をレコード区切りとして扱う", () => {
  const crlf = parseCsvRecords("a,b\r\nc,d\r\n");
  const lf = parseCsvRecords("a,b\nc,d\n");
  assert.deepEqual(crlf, [
    ["a", "b"],
    ["c", "d"],
  ]);
  assert.deepEqual(lf, crlf);
});

test("quoted comma を 1 フィールドとして保持する（split(',') 禁止の担保）", () => {
  const recs = parseCsvRecords('URL,note\n"https://x/y","a, b, c"\n');
  assert.equal(recs[1].length, 2);
  assert.equal(recs[1][1], "a, b, c");
});

test("quoted newline を含むフィールドでレコードが割れない", () => {
  const { rows } = parseCsv(fx("quoted-newline.csv"));
  assert.equal(rows.length, 2, "改行入りフィールドでも 2 データ行のまま");
  assert.match(rows[0][2], /line1\nline2, with comma/);
});

test('エスケープされた二重引用符 "" を 1 つの " として復元する', () => {
  const { rows } = parseCsv(fx("quoted-newline.csv"));
  assert.match(rows[1][2], /simple "quoted" value/);
});

test("空行を無視する", () => {
  const recs = parseCsvRecords("a,b\n\n\nc,d\n");
  assert.deepEqual(recs, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

// ─────────────────────── normalizePageIndexingCsv ───────────────────────

test("URL 前後の空白を trim し、parse 不能行は rejects へ送る", () => {
  const csv = "URL,最終クロール日\n  https://doboku-note.com/docs/a  ,2026-07-11\nnot a url,2026-07-01\n";
  const out = normalizePageIndexingCsv(csv, { runId: "t", uiTotal: 2 });
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].url, "https://doboku-note.com/docs/a"); // trim 済み
  assert.equal(out.rejects.length, 1);
  assert.equal(out.rejects[0].reason, "unparseable-url");
});

test("同一 URL 重複は消さず duplicateCount を付ける", () => {
  const out = normalizePageIndexingCsv(fx("ja-page-indexing.csv"), { runId: "t" });
  // example-a が 2 回、b/c が 1 回、"not a url" は reject
  assert.equal(out.rows.length, 4);
  assert.equal(out.rejects.length, 1);
  const aRows = out.rows.filter((r) => r.comparisonKey === "/docs/example-a");
  assert.equal(aRows.length, 2);
  assert.ok(aRows.every((r) => r.duplicateCount === 2));
  const bRow = out.rows.find((r) => r.comparisonKey === "/docs/example-b");
  assert.equal(bRow.duplicateCount, 1);
});

test("raw の全列値を保持する", () => {
  const out = normalizePageIndexingCsv(fx("ja-page-indexing.csv"), { runId: "t" });
  assert.ok(out.rows[0].raw.URL);
  assert.ok("最終クロール日" in out.rows[0].raw);
  assert.equal(out.rows[0].lastCrawled, "2026-07-11");
});

test("uiTotal > exportedRows なら truncated=true（1,000 件上限を含む）", () => {
  const csv = "URL,最終クロール日\nhttps://doboku-note.com/docs/a,2026-07-11\n";
  const truncated = normalizePageIndexingCsv(csv, { uiTotal: 3460, sampleUrlCap: 1000 });
  assert.equal(truncated.truncated, true);
  assert.equal(truncated.uiTotal, 3460);
  assert.equal(truncated.exportedRows, 1);

  const notTruncated = normalizePageIndexingCsv(csv, { uiTotal: 1, sampleUrlCap: 1000 });
  assert.equal(notTruncated.truncated, false);
});

test("exportedRows が 1,000 件上限に達したら truncated=true", () => {
  const lines = ["URL,最終クロール日"];
  for (let i = 0; i < 1000; i++) lines.push(`https://doboku-note.com/docs/p${i},2026-07-11`);
  const out = normalizePageIndexingCsv(lines.join("\n"), { uiTotal: 1000, sampleUrlCap: 1000 });
  assert.equal(out.exportedRows, 1000);
  assert.equal(out.truncated, true);
});

// ─────────────────────────── URL 比較キー ───────────────────────────

test("comparisonKey は fragment を除外する", () => {
  assert.equal(toComparisonKey("https://doboku-note.com/docs/a#sec2"), "/docs/a");
});

test("comparisonKey は query を保持する", () => {
  assert.equal(toComparisonKey("https://doboku-note.com/docs/a?ref=x&y=1"), "/docs/a?ref=x&y=1");
});

test("comparisonKey は percent-encoding を破壊しない", () => {
  assert.equal(toComparisonKey("https://doboku-note.com/docs/a%20b"), "/docs/a%20b");
});

test("comparisonKey は末尾スラッシュを別 URL として保持する（勝手に同一視しない）", () => {
  assert.notEqual(
    toComparisonKey("https://doboku-note.com/docs/a"),
    toComparisonKey("https://doboku-note.com/docs/a/"),
  );
});

test("comparisonKey は重複スラッシュを別 URL として保持する", () => {
  assert.notEqual(
    toComparisonKey("https://doboku-note.com/docs/a"),
    toComparisonKey("https://doboku-note.com/docs//a"),
  );
});

test("comparisonKey は host を落とす（www 差は同一プロパティの別名として吸収）", () => {
  assert.equal(
    toComparisonKey("https://www.doboku-note.com/docs/a"),
    toComparisonKey("https://doboku-note.com/docs/a"),
  );
});

test("parse 不能 URL は comparisonKey=null / tryParseUrl=null", () => {
  assert.equal(tryParseUrl("not a url"), null);
  assert.equal(toComparisonKey("not a url"), null);
});

test("joinKey は host(www)・query・末尾スラッシュを寄せる（既存メトリクス突合用）", () => {
  assert.equal(toJoinKey("https://www.doboku-note.com/docs/a/"), "/docs/a");
  assert.equal(toJoinKey("https://doboku-note.com/docs/a?ref=x"), "/docs/a");
  assert.equal(toJoinKey("https://doboku-note.com/docs/a"), "/docs/a");
});
