import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSitemapsDue, parseRobotsSitemaps } from "../scripts/lib/gsc-sitemaps.mjs";

const now = new Date("2026-10-02T00:00:00Z");
const MAIN = "https://doboku-note.com/sitemap.xml";
const LEGACY = "https://doboku-note.com/sitemap-legacy.xml";
const healthy = {
  fetchedAt: "2026-09-25T21:00:00Z",
  robotsSitemaps: [MAIN, LEGACY],
  submit: [{ path: MAIN, status: "ok" }, { path: LEGACY, status: "ok" }],
  sitemaps: [
    { path: MAIN, lastDownloaded: "2026-09-30T10:00:00Z", errors: 0, warnings: 0 },
    // 旧 URL の sitemap はリダイレクトの警告が出るのが正常（Google の移転手順どおり）
    { path: LEGACY, lastDownloaded: "2026-09-29T10:00:00Z", errors: 0, warnings: 1312 },
  ],
};

test("robots.txt の Sitemap 行を大文字小文字を問わず重複なしで拾う", () => {
  const text = "User-agent: *\nAllow: /\n\nSitemap: https://a/sitemap.xml\nsitemap: https://a/sitemap-legacy.xml\r\nSitemap: https://a/sitemap.xml\n";
  assert.deepEqual(parseRobotsSitemaps(text), ["https://a/sitemap.xml", "https://a/sitemap-legacy.xml"]);
  assert.deepEqual(parseRobotsSitemaps(""), []);
});

test("正常な記録は OK（旧 URL sitemap の警告は数えない）", () => {
  assert.deepEqual(evaluateSitemapsDue({ latest: healthy, now }), { due: false, reasons: [], info: [] });
});

test("記録が無い・古いは DUE（検査ゼロを OK と呼ばない）", () => {
  assert.equal(evaluateSitemapsDue({ latest: null, now }).due, true);
  const stale = evaluateSitemapsDue({ latest: { ...healthy, fetchedAt: "2026-09-10T00:00:00Z" }, now });
  assert.equal(stale.due, true);
  assert.match(stale.reasons[0], /記録が 22 日前/);
});

test("未登録・送信の権限不足・エラー・長期未読み込みを全部理由に出す", () => {
  const r = evaluateSitemapsDue({
    latest: {
      ...healthy,
      submit: [{ path: MAIN, status: "ok" }, { path: LEGACY, status: "permission-denied" }],
      sitemaps: [{ path: MAIN, lastDownloaded: "2026-09-01T00:00:00Z", errors: 2, warnings: 0 }],
    },
    now,
  });
  assert.equal(r.due, true);
  assert.ok(r.reasons.some((x) => x.startsWith("GSC に未登録: " + LEGACY)));
  assert.ok(r.reasons.some((x) => x.includes("permission-denied") && x.includes("フル")));
  assert.ok(r.reasons.some((x) => x.includes("エラー 2 件")));
  assert.ok(r.reasons.some((x) => x.includes("最終読み込みが 31 日前")));
});


test("退役した登録のエラー・未読込は情報だけにし、現役の判定を保つ", () => {
  const latest = { ...healthy, robotsSitemaps: [MAIN], sitemaps: [healthy.sitemaps[0], { path: LEGACY, errors: 1, lastDownloaded: null }] };
  const result = evaluateSitemapsDue({ latest, now });
  assert.equal(result.due, false);
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.info, [`退役した登録が GSC に残っている（GSC の画面で削除する）: ${LEGACY}`]);
  assert.equal(evaluateSitemapsDue({ latest: { ...latest, robotsSitemaps: [MAIN, LEGACY] }, now }).due, true);
  assert.equal(evaluateSitemapsDue({ latest: { ...latest, sitemaps: [{ ...healthy.sitemaps[0], errors: 1 }, latest.sitemaps[1]] }, now }).due, true);
});
