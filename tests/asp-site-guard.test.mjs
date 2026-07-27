import { test } from "node:test";
import assert from "node:assert/strict";

import {
  verifySite,
  assertSiteOrThrow,
  extractSiteId,
  SiteAttributionError,
} from "../scripts/lib/asp-site-guard.mjs";

// 実機の値（2026-07-27）
const DOBOKU_AFB = "984453";
const STATS47_AFB = "959426";
const FORBIDDEN = ["統計で見る都道府県", "stats47"];

test("verifySite: ID が一致すれば通す", () => {
  const r = verifySite({ actualSiteId: DOBOKU_AFB, expectedSiteId: DOBOKU_AFB });
  assert.equal(r.ok, true);
  assert.equal(r.matchedBy, "id");
});

test("verifySite: ID 不一致は落とす（今回の事故そのもの）", () => {
  // afb の走査で SID=959426（stats47）のまま続行し「建設系 0 件」と誤報告した再現
  const r = verifySite({ actualSiteId: STATS47_AFB, expectedSiteId: DOBOKU_AFB });
  assert.equal(r.ok, false);
  assert.match(r.reason, /不一致/);
  assert.match(r.reason, /959426/);
});

test("verifySite: ID を read-back できないときは通さない", () => {
  const r = verifySite({ actualSiteId: null, expectedSiteId: DOBOKU_AFB });
  assert.equal(r.ok, false, "取れなかった＝OK ではない");
});

test("verifySite: 空文字の ID も read-back 失敗として扱う", () => {
  const r = verifySite({ actualSiteId: "   ", expectedSiteId: DOBOKU_AFB });
  assert.equal(r.ok, false);
});

test("verifySite: ID 一致でも他サイト名が同居していれば落とす（口座横断画面）", () => {
  const r = verifySite({
    actualSiteId: DOBOKU_AFB,
    expectedSiteId: DOBOKU_AFB,
    visibleText: "doboku-note と 統計で見る都道府県 の両方が並ぶ一覧",
    forbiddenText: FORBIDDEN,
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /口座横断/);
});

test("verifySite: ID が無い ASP は表示名で判定できる", () => {
  const r = verifySite({
    actualSiteId: null,
    expectedSiteId: null,
    expectedSiteName: "doboku-note",
    visibleText: "サイト名 doboku-note の実績",
    forbiddenText: FORBIDDEN,
  });
  assert.equal(r.ok, true);
  assert.equal(r.matchedBy, "name");
});

test("verifySite: 表示名フォールバックでも他サイト名が見えたら落とす", () => {
  // A8 のヘッダーは常に stats47 名を出すので、名前一致だけで通すと必ず誤判定する
  const r = verifySite({
    actualSiteId: null,
    expectedSiteId: null,
    expectedSiteName: "doboku-note",
    visibleText: "サイト名 統計で見る都道府県様 / doboku-note",
    forbiddenText: FORBIDDEN,
  });
  assert.equal(r.ok, false, "弱い判定のときほど厳しく落とす");
});

test("verifySite: 設定漏れ（期待サイト未指定）は通さない", () => {
  const r = verifySite({ actualSiteId: DOBOKU_AFB, expectedSiteId: null });
  assert.equal(r.ok, false);
  assert.match(r.reason, /設定/);
});

test("assertSiteOrThrow: 不一致は例外。戻り値で握り潰せない", () => {
  // 「警告して続行」できる設計だったから事故が起きた。例外であることを固定する。
  assert.throws(
    () => assertSiteOrThrow({ actualSiteId: STATS47_AFB, expectedSiteId: DOBOKU_AFB }),
    (e) => e instanceof SiteAttributionError && /不一致/.test(e.message),
  );
  const ok = assertSiteOrThrow({ actualSiteId: DOBOKU_AFB, expectedSiteId: DOBOKU_AFB });
  assert.equal(ok.ok, true);
});

test("extractSiteId: afb の実機書式から SID を抜く", () => {
  const text = "現在選択中のサイト情報【SID】984453 未提携 掲載中";
  assert.equal(extractSiteId(text, "【SID】\\s*(\\d+)"), "984453");
  assert.equal(extractSiteId("SID の表示なし", "【SID】\\s*(\\d+)"), null);
  assert.equal(extractSiteId(null, "【SID】\\s*(\\d+)"), null);
});

test("extractSiteId: A8 のメディアID 書式", () => {
  assert.equal(extractSiteId("メディアID a25050375786 サイト名 統計で見る都道府県様", "(a\\d{11})"), "a25050375786");
});
