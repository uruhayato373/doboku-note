#!/usr/bin/env node
// X 投稿済みの生存確認（DN-0276）。
//
// content/sns/x/{draft,published}/*/status.json の status:"posted" を集め、
// posted_url を持つものだけを oEmbed（ログイン不要）で照合する。
// 404 は削除・凍結・非公開の疑い、posted_url が無い投稿済みは「照合の手がかりが無い」件数として
// 別に出す（検査ゼロを PASS と呼ばない＝CLAUDE.md §9）。本文にサイトへのリンクが無い投稿は
// 意図的な linkless 施策もあるため warn 情報として出すのみ（gate しない）。
//
// Usage:
//   node scripts/check-x-posted-live.mjs                             # 人間向けサマリー
//   node scripts/check-x-posted-live.mjs --json                      # JSON のみ標準出力
//   node scripts/check-x-posted-live.mjs --report <path>              # 出力先（既定 .tmp/x-posted-live/latest.json）
//
// Exit code:
//   0 = 404（gone）0件・取得失敗率 20% 以下
//   1 = 404 検出、または取得失敗率 20% 超（判定材料不足）
//   2 = 投稿済みエントリを1件も検査できない（入力不備）
import { writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectPostedTweets, hasSiteLink, fetchOembed } from './lib/x-posted-live.mjs';

// レート制限回避の同期 sleep（note-live-check.mjs と同じ形。Unix の sleep バイナリに依存しない）。
const sleepSync = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

const JSON_ONLY = process.argv.includes('--json');
const OUT_PATH =
  process.argv.find((_, i, a) => a[i - 1] === '--report') || '.tmp/x-posted-live/latest.json';

function main() {
  const tweets = collectPostedTweets();
  if (tweets.length === 0) {
    console.error('[check-x-posted-live] 投稿済みエントリを1件も検査できません（status.json が無いか status:"posted" が0件）');
    process.exitCode = 2;
    return;
  }

  const withUrl = tweets.filter((t) => t.posted_url);
  const withoutUrl = tweets.filter((t) => !t.posted_url);
  const noSiteLink = tweets.filter((t) => !hasSiteLink(t.text));

  const results = [];
  for (const t of withUrl) {
    const r = fetchOembed(t.posted_url);
    results.push({ ref: t.ref, url: t.posted_url, ...r });
    sleepSync(400); // レート制限回避（連続 curl の間隔）
  }

  const gone = results.filter((r) => r.status === 'gone');
  const unknown = results.filter((r) => r.status === 'unknown');
  const live = results.filter((r) => r.status === 'live');
  const fetchFailRate = results.length ? unknown.length / results.length : 1;

  const report = {
    checked_at: new Date().toISOString(),
    posted_total: tweets.length,
    with_url: withUrl.length,
    without_url: withoutUrl.length,
    without_url_refs: withoutUrl.map((t) => t.ref),
    checked: results.length,
    live: live.length,
    gone: gone.length,
    gone_refs: gone.map((r) => ({ ref: r.ref, url: r.url })),
    fetch_failed: unknown.length,
    fetch_failed_refs: unknown.map((r) => ({ ref: r.ref, url: r.url, http_code: r.httpCode, error: r.error })),
    no_site_link: noSiteLink.length,
    no_site_link_refs: noSiteLink.map((t) => t.ref),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(`${OUT_PATH}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  // 失敗時も直前の正常な結果を残したいので rename で置き換える（fetchFailRate > 0.2 のときは書かない）
  if (fetchFailRate <= 0.2) {
    renameSync(`${OUT_PATH}.tmp`, OUT_PATH);
  }

  if (JSON_ONLY) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `[check-x-posted-live] 投稿済み ${report.posted_total} 件 / posted_url あり ${report.with_url} 件（照合対象）` +
        ` / posted_url なし ${report.without_url} 件（照合の手がかり無し）`,
    );
    console.log(
      `  照合結果: live ${report.live} / gone(404) ${report.gone} / 取得失敗 ${report.fetch_failed}` +
        (report.checked ? `（取得失敗率 ${(fetchFailRate * 100).toFixed(0)}%）` : ''),
    );
    if (report.gone > 0) {
      console.warn(`  ⚠ gone: ${report.gone_refs.map((r) => `${r.ref} (${r.url})`).join(', ')}`);
    }
    if (report.fetch_failed > 0) {
      console.warn(`  ⚠ 取得失敗: ${report.fetch_failed_refs.map((r) => `${r.ref}[${r.http_code ?? r.error}]`).join(', ')}`);
    }
    console.log(`  本文にサイトリンク無し: ${report.no_site_link} 件（意図的な linkless 施策を含む・要目視確認）`);
  }

  if (fetchFailRate > 0.2) {
    console.error('[check-x-posted-live] 取得失敗率20%超 — 判定材料不足（検査不成立）');
    process.exitCode = 1;
  } else if (report.gone > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main();
