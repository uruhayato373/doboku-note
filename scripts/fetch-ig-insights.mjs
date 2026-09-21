#!/usr/bin/env node
// fetch-ig-insights.mjs — Instagram Graph API から投稿インサイト・アカウント日次リーチを取得し、
// .claude/state/metrics/instagram/ig-insights-<today>.json へ書く CI 週次コレクタ。
//
// 背景（方針）: IG の計測は verify-ig-status.mjs（Playwright でライブ画面を読む reconciler）に
//   依存しており、UI 変更・ボット対策・ログインセッション切れで壊れやすい。CI から素朴に叩ける
//   Graph API 経路をここへ置き、投稿一覧・インサイト・アカウント指標を fetch する。
//   HTTP I/O は scripts/lib/ig-graph.mjs（薄いクライアント）に閉じ込め、突合ロジックは
//   scripts/lib/ig-reconcile-core.mjs（verify-ig-status.mjs と共有）を再利用する。
//
// 認証（CI 供給が正・ローカル creds 不要の恒久ルール。measurement-incidents.md 参照）:
//   環境変数 IG_GRAPH_ACCESS_TOKEN（必須）/ IG_BUSINESS_ACCOUNT_ID（無ければ
//   .claude/config/ig-account.json の graph.businessAccountId）/ IG_GRAPH_API_VERSION（既定 v23.0）。
//   トークンの取得・交換は scripts/ig-graph-token.mjs（Mac ローカル補助・CI では使わない）。
//
// 使い方:
//   node scripts/fetch-ig-insights.mjs                          # 既定（30日窓・過去90日以内のメディアに insights）
//   node scripts/fetch-ig-insights.mjs --days=14 --max-media=100
//   node scripts/fetch-ig-insights.mjs --reconcile              # ローカル SoT との突合 snapshot も書く
//   node scripts/fetch-ig-insights.mjs --dry-run                # 取得はするが書かない（件数だけ表示）
//   node scripts/fetch-ig-insights.mjs --json                   # 取得物を JSON で stdout 出力
//
// exit code: 0 = 正常（ドリフトがあっても 0）/ 1 = 認証・ネットワーク・レート（何も書かない）/
//   2 = 検査不成立（mediaListed === 0 または daysReturned === 0・何も書かない）。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/jst-date.mjs';
import { addDays } from './lib/business-direction.mjs';
import { createIgGraphClient, mediaToLive } from './lib/ig-graph.mjs';
import { normHead, localPacks, reconcile, driftCount, buildSnapshot } from './lib/ig-reconcile-core.mjs';

const TAG = '[fetch-ig-insights]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ─── 引数 ────────────────────────────────────────────────────
function parseArgs(argv) {
  const num = (flag, def) => {
    const raw = (argv.find((a) => a.startsWith(`${flag}=`)) || '').split('=')[1];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : def;
  };
  return {
    days: num('--days', 30),
    insightsSinceDays: num('--insights-since-days', 90),
    maxMedia: num('--max-media', 200),
    reconcile: argv.includes('--reconcile'),
    dryRun: argv.includes('--dry-run'),
    json: argv.includes('--json'),
  };
}

// ─── 設定 ────────────────────────────────────────────────────
function readIgAccountConfig(root) {
  const p = join(root, '.claude/config/ig-account.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

// HTTP/認証エラーを「何を試みていたか」付きで短く整形する（token 値は含めない）。
function authOrNetworkMessage(step, e) {
  const code = e && e.code ? `${e.code}: ` : '';
  return `${step} 失敗（認証・ネットワーク）: ${code}${String(e && e.message || e).slice(0, 200)}`;
}

/**
 * 本体。CLI からも tests/fetch-ig-insights.test.mjs からも呼べるよう client を注入できるようにする。
 * @param {{client: object, root: string, now?: Date, argv?: string[]}} args
 * @returns {Promise<{exitCode:number, message:string, counts?:object, output?:object, driftInfo?:object, written?:string[]}>}
 */
export async function run({ client, root, now = new Date(), argv = [] }) {
  const opts = parseArgs(argv);
  const today = todayJst(now.getTime());

  let debug;
  let account;
  try {
    debug = await client.debugToken();
    account = await client.accountFields();
  } catch (e) {
    return { exitCode: 1, message: authOrNetworkMessage('debugToken/accountFields', e) };
  }

  let mediaResult;
  try {
    mediaResult = await client.listMedia({ max: opts.maxMedia });
  } catch (e) {
    return { exitCode: 1, message: authOrNetworkMessage('listMedia', e) };
  }
  const rows = mediaResult.rows || [];
  const truncated = Boolean(mediaResult.truncated);

  // insights-since-days より新しいメディアだけを対象にする（古いメディアの insights は API 制限や無駄打ちを避ける）。
  const sinceInsightsMs = Date.parse(`${addDays(today, -opts.insightsSinceDays)}T00:00:00Z`);
  const isTargeted = (row) => {
    const t = Date.parse(row.timestamp || '');
    return Number.isFinite(t) && t >= sinceInsightsMs;
  };

  const mediaOut = [];
  let insightsTargeted = 0;
  let insightsFetched = 0;
  let insightsFailed = 0;
  for (const row of rows) {
    const targeted = isTargeted(row);
    let insights = null;
    let insightsError = null;
    if (targeted) {
      insightsTargeted += 1;
      try {
        const r = await client.mediaInsights(row);
        if (r && r.insights) {
          insights = r.insights;
          insightsFetched += 1;
        } else {
          insightsError = (r && r.insightsError) || 'unknown';
          insightsFailed += 1;
        }
      } catch (e) {
        insightsError = String((e && e.message) || e).slice(0, 120);
        insightsFailed += 1;
      }
    }
    mediaOut.push({
      id: row.id,
      shortcode: row.shortcode || null,
      permalink: row.permalink || null,
      timestamp: row.timestamp || null,
      mediaType: row.media_type || null,
      productType: row.media_product_type || null,
      captionHead: normHead(row.caption),
      insights,
      insightsError,
    });
  }

  const since = addDays(today, -opts.days);
  const until = addDays(today, -1);
  let daily;
  try {
    daily = await client.accountInsights({ since, until });
  } catch (e) {
    return { exitCode: 1, message: authOrNetworkMessage('accountInsights', e) };
  }

  const counts = {
    mediaListed: rows.length,
    mediaTruncated: truncated,
    insightsTargeted,
    insightsFetched,
    insightsFailed,
    daysReturned: daily.length,
  };

  if (counts.mediaListed === 0 || counts.daysReturned === 0) {
    return {
      exitCode: 2,
      message: `検査不成立: mediaListed=${counts.mediaListed} daysReturned=${counts.daysReturned}（取得 0 件・成果物を書きません）`,
      counts,
    };
  }

  const output = {
    schemaVersion: 1,
    fetchedAt: now.toISOString(),
    apiVersion: process.env.IG_GRAPH_API_VERSION || 'v23.0',
    account: {
      id: account.id ?? null,
      username: account.username ?? null,
      followersCount: account.followers_count ?? null,
      mediaCount: account.media_count ?? null,
    },
    window: { since, until },
    daily,
    media: mediaOut,
    token: {
      type: debug.type ?? null,
      expiresAt: debug.expiresAt ?? 0,
      dataAccessExpiresAt: debug.dataAccessExpiresAt ?? 0,
      scopes: debug.scopes ?? [],
    },
    counts,
  };

  const written = [];
  if (!opts.dryRun) {
    const metricsDir = join(root, '.claude/state/metrics/instagram');
    mkdirSync(metricsDir, { recursive: true });
    const outPath = join(metricsDir, `ig-insights-${today}.json`);
    writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    written.push(outPath);
  }

  let driftInfo = null;
  if (opts.reconcile) {
    const accountConfig = readIgAccountConfig(root);
    const liveData = {
      ...mediaToLive(rows),
      scheduled: { unavailable: 'Graph API はプランナー予約を返さない。status.json の scheduled_at を使う' },
    };
    const packs = localPacks();
    const cats = reconcile(packs, liveData);
    const drift = driftCount(cats);
    driftInfo = { drift, packs: packs.length };
    if (!opts.dryRun) {
      const snapshot = buildSnapshot({ account: accountConfig.handle || null, cats, liveData, source: 'graph-api', now });
      const snapDir = join(root, '.claude/state/ig-reconcile');
      mkdirSync(snapDir, { recursive: true });
      const snapPath = join(snapDir, 'snapshot.json');
      writeFileSync(snapPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      written.push(snapPath);
    }
  }

  const truncatedNote = counts.mediaTruncated ? '（打ち切りあり）' : '（打ち切りなし）';
  const driftNote = driftInfo ? ` / パック ${driftInfo.packs} 件 / ドリフト ${driftInfo.drift} 件` : '';
  const message = `${TAG} メディア ${counts.mediaListed} 件${truncatedNote} / insights ${counts.insightsFetched}/${counts.insightsTargeted} / 日次 ${counts.daysReturned} 日${driftNote}`;

  return { exitCode: 0, message, counts, output, driftInfo, written };
}

// ─── CLI エントリ ────────────────────────────────────────────
const isMain = process.argv[1] && process.argv[1].endsWith('fetch-ig-insights.mjs');

if (isMain) {
  const argv = process.argv.slice(2);
  const token = process.env.IG_GRAPH_ACCESS_TOKEN;
  if (!token) {
    console.error(`${TAG} 環境変数 IG_GRAPH_ACCESS_TOKEN が未設定です`);
    process.exit(1);
  }
  const accountConfig = readIgAccountConfig(ROOT);
  const igUserId = process.env.IG_BUSINESS_ACCOUNT_ID || accountConfig?.graph?.businessAccountId;
  if (!igUserId) {
    console.error(`${TAG} IG_BUSINESS_ACCOUNT_ID が未設定で、.claude/config/ig-account.json の graph.businessAccountId も未設定です`);
    process.exit(1);
  }
  const apiVersion = process.env.IG_GRAPH_API_VERSION || 'v23.0';
  const client = createIgGraphClient({ token, igUserId, apiVersion });

  let result;
  try {
    result = await run({ client, root: ROOT, now: new Date(), argv });
  } catch (e) {
    console.error(`${TAG} 想定外のエラー:`, String((e && e.message) || e).slice(0, 300));
    process.exit(1);
  }

  if (result.exitCode === 1) {
    console.error(`${TAG} ${result.message}`);
    process.exit(1);
  }
  if (result.exitCode === 2) {
    console.error(`${TAG} ${result.message}`);
    process.exit(2);
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify(result.output, null, 2));
  } else {
    console.log(result.message);
    if (result.written && result.written.length) {
      console.log(`${TAG} 書き込み: ${result.written.join(', ')}`);
    } else {
      console.log(`${TAG} --dry-run: 何も書きませんでした`);
    }
  }
  process.exit(0);
}
