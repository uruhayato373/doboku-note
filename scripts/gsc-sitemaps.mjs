#!/usr/bin/env node
/**
 * gsc-sitemaps.mjs — Search Console に sitemap を API で送信し、Google の読み込み状況を記録する
 * ---------------------------------------------------------------------------
 * ログイン（ブラウザのセッション）を使わず、サービスアカウントで Search Console API を叩くだけなので
 * クラウド CI（fetch-metrics.yml・週次）で動く。ブラウザ操作が要る登録リクエストは Mac の launchd
 * （scripts/gsc-local-routine.mjs）の担当。
 *
 * 送る sitemap の真実源は本番 robots.txt の `Sitemap:` 行（sitemap.xml と、期限内なら sitemap-legacy.xml）。
 * 送信（sitemaps.submit）にはサービスアカウントに Search Console の「フル」権限と webmasters scope が要る。
 * 権限が無いと permission-denied として記録し、週次の check-gsc-sitemaps が DUE に出す。
 *
 * CLI:
 *   node scripts/gsc-sitemaps.mjs            # 状況の取得だけ（sitemaps.list）
 *   node scripts/gsc-sitemaps.mjs --submit   # robots.txt の sitemap を送信してから取得
 * 出力: .claude/state/metrics/gsc/sitemaps-latest.json
 * exit: 0 = 取得できた・送信も成功 / 1 = 取得はできたが送信に失敗あり / 2 = 検査不成立（鍵・robots.txt・list が失敗）
 * ---------------------------------------------------------------------------
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { google } from "googleapis";
import { SITEMAPS_STATE, parseRobotsSitemaps } from "./lib/gsc-sitemaps.mjs";

const SITE_URL = "sc-domain:doboku-note.com";
const ROBOTS_URL = "https://doboku-note.com/robots.txt";
const SUBMIT = process.argv.includes("--submit");
const TAG = "[gsc-sitemaps]";

function fail(msg) {
  console.error(`${TAG} ✗ 検査不成立: ${msg}`);
  process.exit(2);
}

function httpStatus(e) {
  const n = Number(e?.code ?? e?.response?.status);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath || !existsSync(keyPath)) fail(`鍵ファイルが無い（GOOGLE_SERVICE_ACCOUNT_KEY_PATH=${keyPath || "(unset)"}）`);
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(readFileSync(keyPath, "utf-8")),
    // 送信は読み取り専用 scope では通らない（list は両方で通る）。
    scopes: [SUBMIT ? "https://www.googleapis.com/auth/webmasters" : "https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const sc = google.searchconsole({ version: "v1", auth });

  let robotsSitemaps;
  try {
    const res = await fetch(ROBOTS_URL, { headers: { "User-Agent": "doboku-note-gsc-sitemaps/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    robotsSitemaps = parseRobotsSitemaps(await res.text());
  } catch (e) {
    fail(`robots.txt を取得できない（${e.message}）`);
  }
  if (robotsSitemaps.length === 0) fail("robots.txt に Sitemap 行が 0 件");

  const submit = [];
  if (SUBMIT) {
    for (const path of robotsSitemaps) {
      try {
        await sc.sitemaps.submit({ siteUrl: SITE_URL, feedpath: path });
        submit.push({ path, status: "ok" });
      } catch (e) {
        const code = httpStatus(e);
        submit.push({ path, status: code === 403 ? "permission-denied" : "error", code, message: String(e?.message ?? e).slice(0, 200) });
      }
    }
  }

  let sitemaps;
  try {
    const res = await sc.sitemaps.list({ siteUrl: SITE_URL });
    sitemaps = (res.data.sitemap ?? []).map((s) => ({
      path: s.path,
      type: s.type ?? null,
      isSitemapsIndex: Boolean(s.isSitemapsIndex),
      isPending: Boolean(s.isPending),
      lastSubmitted: s.lastSubmitted ?? null,
      lastDownloaded: s.lastDownloaded ?? null,
      warnings: Number(s.warnings ?? 0),
      errors: Number(s.errors ?? 0),
      contents: (s.contents ?? []).map((c) => ({ type: c.type, submitted: Number(c.submitted ?? 0) })),
    }));
  } catch (e) {
    fail(`sitemaps.list が失敗（HTTP ${httpStatus(e) ?? "?"}: ${String(e?.message ?? e).slice(0, 200)}）`);
  }

  const record = { schemaVersion: 1, fetchedAt: new Date().toISOString(), property: SITE_URL, robotsSitemaps, submit, sitemaps };
  mkdirSync(dirname(SITEMAPS_STATE), { recursive: true });
  writeFileSync(SITEMAPS_STATE, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`${TAG} robots.txt の sitemap ${robotsSitemaps.length} 件 / GSC 登録 ${sitemaps.length} 件を取得`);
  for (const s of sitemaps) {
    const urls = s.contents.reduce((n, c) => n + c.submitted, 0);
    console.log(`  ${s.path}  最終読込 ${s.lastDownloaded ?? "未"} / URL ${urls} / エラー ${s.errors} / 警告 ${s.warnings}${s.isPending ? " / 処理中" : ""}`);
  }
  const failed = submit.filter((s) => s.status !== "ok");
  if (SUBMIT) console.log(`${TAG} 送信 ${submit.length} 件（失敗 ${failed.length} 件）${failed.map((s) => `\n  ✗ ${s.status}: ${s.path}`).join("")}`);
  console.log(`${TAG} 記録: ${SITEMAPS_STATE}`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => fail(e?.message ?? String(e)));
