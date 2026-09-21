#!/usr/bin/env node
/**
 * fetch-cloudflare-analytics.mjs — Cloudflare GraphQL Analytics API からゾーン単位の日次実績を取得する
 * ---------------------------------------------------------------------------
 * 背景: Cloudflare Pages 配信の doboku-note.com は Cloudflare 側にしかトラフィック実測が無い
 *   （GA4 は JS 計測でボット/クローラーを含まない）。異常検知（スパイク・国外比率）には
 *   ゾーン単位の httpRequests1dGroups が要る。鮮度は check-cloudflare-metrics-freshness.mjs が見る。
 * 方針: 本体（httpRequests1dGroups）はスキーマ不一致に自己修復する（unknown field を剪定して
 *   1 回だけ再試行）。topPaths・firewall は「あれば嬉しい」probe 層とし、失敗しても本体の成功を
 *   道連れにしない（unavailable: <理由> を記録して続行）。botScore バケット別集計は plan 依存で
 *   取得手段が無いため固定で unavailable。
 * usage:
 *   node scripts/fetch-cloudflare-analytics.mjs
 *   node scripts/fetch-cloudflare-analytics.mjs --dry-run --json
 *   npm run fetch-cloudflare-analytics
 * exit code: 0=取得・書き込み成功／1=認証・ネットワーク失敗／2=daysReturned 0（検査不成立・成果物は書かない）
 * ---------------------------------------------------------------------------
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst, nowJstIso } from './lib/jst-date.mjs';
import { addDays, readJson } from './lib/business-direction.mjs';
import { buildZoneQuery, pruneQueryFields, summarizeDays, spikeFlag, DEFAULT_SUM_FIELDS } from './lib/cloudflare-analytics.mjs';

const TAG = '[fetch-cloudflare-analytics]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = '.claude/state/metrics/cloudflare';

/** GraphQL エラーメッセージ（トークンを含み得ない Cloudflare 側の文言）を 200 字へ切る。 */
const truncateMessage = (message) => String(message ?? '').slice(0, 200);

async function postGraphQL(fetchImpl, graphqlUrl, token, query) {
  const res = await fetchImpl(graphqlUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`http-error:${res.status}:${truncateMessage(text)}`);
  }
  return res.json();
}

async function getJson(fetchImpl, url, token) {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/** httpRequestsAdaptiveGroups で前日の clientRequestPath 上位 50（sum requests）を probe する。 */
async function fetchTopPaths(fetchImpl, { graphql, token, zoneTag, date }) {
  const query = `query {
  viewer {
    zones(filter: { zoneTag: "${zoneTag}" }) {
      httpRequestsAdaptiveGroups(
        limit: 50
        filter: { date: "${date}" }
        orderBy: [sum_edgeResponseBytes_DESC]
      ) {
        sum { requests }
        dimensions { clientRequestPath }
      }
    }
  }
}`;
  const json = await postGraphQL(fetchImpl, graphql, token, query);
  if (json.errors?.length) throw new Error(truncateMessage(json.errors.map((e) => e.message).join('; ')));
  const groups = json.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
  const rows = groups
    .map((g) => ({ path: g.dimensions?.clientRequestPath ?? null, requests: g.sum?.requests ?? 0 }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 50);
  return { date, rows };
}

/** firewallEventsAdaptiveGroups で前日の action / source 別件数を probe する（Bot Fight Mode の信号）。 */
async function fetchFirewallEvents(fetchImpl, { graphql, token, zoneTag, date }) {
  const query = `query {
  viewer {
    zones(filter: { zoneTag: "${zoneTag}" }) {
      firewallEventsAdaptiveGroups(
        limit: 200
        filter: { datetime_geq: "${date}T00:00:00Z", datetime_leq: "${date}T23:59:59Z" }
      ) {
        count
        dimensions { action source }
      }
    }
  }
}`;
  const json = await postGraphQL(fetchImpl, graphql, token, query);
  if (json.errors?.length) throw new Error(truncateMessage(json.errors.map((e) => e.message).join('; ')));
  const groups = json.data?.viewer?.zones?.[0]?.firewallEventsAdaptiveGroups ?? [];
  const byAction = {};
  const bySource = {};
  for (const g of groups) {
    const action = g.dimensions?.action ?? 'unknown';
    const source = g.dimensions?.source ?? 'unknown';
    const count = g.count ?? 0;
    byAction[action] = (byAction[action] ?? 0) + count;
    bySource[source] = (bySource[source] ?? 0) + count;
  }
  return { byAction, bySource };
}

/**
 * 本体・probe をまとめて実行する（テスト対象）。fetch は fetchImpl として注入する。
 * @param {{fetchImpl:Function, root?:string, now?:() => number, argv?:string[]}} opts
 */
export async function run({ fetchImpl = globalThis.fetch, root = ROOT, now = () => Date.now(), argv = [] } = {}) {
  const config = readJson(root, '.claude/config/cloudflare.json');
  const token = process.env.CLOUDFLARE_ANALYTICS_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return { exitCode: 1, reason: 'auth-unavailable', message: 'CLOUDFLARE_ANALYTICS_API_TOKEN / CLOUDFLARE_API_TOKEN が無い' };

  const dryRun = argv.includes('--dry-run');
  const jsonOut = argv.includes('--json');
  const today = todayJst(now());
  const since = addDays(today, -7);
  const until = addDays(today, -1);
  const yesterday = until;

  let zone;
  try {
    const { ok, status, body } = await getJson(fetchImpl, `${config.rest}/zones?name=${encodeURIComponent(config.zoneName)}`, token);
    if (!ok || !body?.success) return { exitCode: 1, reason: 'zone-lookup-failed', message: truncateMessage(body?.errors?.[0]?.message ?? `http-${status}`) };
    zone = body.result?.[0];
    if (!zone?.id) return { exitCode: 1, reason: 'zone-not-found', message: `zone ${config.zoneName} が見つからない` };
  } catch (e) {
    return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
  }

  let fields = DEFAULT_SUM_FIELDS;
  let fieldsUnavailable = [];
  let json;
  try {
    json = await postGraphQL(fetchImpl, config.graphql, token, buildZoneQuery({ zoneTag: zone.id, since, until, fields }));
    if (json.errors?.length) {
      const pruned = pruneQueryFields(fields, json.errors);
      if (pruned.dropped.length === 0) return { exitCode: 1, reason: 'graphql-error', message: truncateMessage(json.errors.map((e) => e.message).join('; ')) };
      fields = pruned.fields;
      fieldsUnavailable = pruned.dropped;
      json = await postGraphQL(fetchImpl, config.graphql, token, buildZoneQuery({ zoneTag: zone.id, since, until, fields }));
      if (json.errors?.length) return { exitCode: 1, reason: 'graphql-error-after-retry', message: truncateMessage(json.errors.map((e) => e.message).join('; ')) };
    }
  } catch (e) {
    return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
  }

  const groups = json.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
  const daily = summarizeDays(groups);
  const daysReturned = daily.length;
  const countriesSeen = new Set(daily.flatMap((d) => d.topOther.map((c) => c.country).concat(d.jp.requests > 0 ? ['JP'] : []))).size;

  if (daysReturned === 0) {
    return { exitCode: 2, reason: 'no-data', message: 'httpRequests1dGroups が 0 日分（検査不成立）' };
  }

  let topPaths;
  try {
    topPaths = await fetchTopPaths(fetchImpl, { graphql: config.graphql, token, zoneTag: zone.id, date: yesterday });
  } catch (e) {
    topPaths = { unavailable: truncateMessage(e.message).slice(0, 120) };
  }

  let firewallEvents;
  try {
    firewallEvents = await fetchFirewallEvents(fetchImpl, { graphql: config.graphql, token, zoneTag: zone.id, date: yesterday });
  } catch (e) {
    firewallEvents = { unavailable: truncateMessage(e.message).slice(0, 120) };
  }

  const anomaly = spikeFlag(daily);
  const snapshot = {
    schemaVersion: 1,
    fetchedAt: nowJstIso(now()),
    zone: { name: config.zoneName, plan: zone.plan?.name ?? null },
    window: { since, until },
    daily,
    topPaths,
    botSignals: { firewallEvents, botScoreBuckets: { unavailable: 'plan' } },
    fieldsUnavailable,
    counts: { daysReturned, countriesSeen },
    anomaly,
  };

  if (!dryRun) {
    const dir = join(root, OUT_DIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `cf-zone-${today}.json`), JSON.stringify(snapshot, null, 2) + '\n');
  }

  return { exitCode: 0, snapshot, jsonOut };
}

const isMain = process.argv[1] && process.argv[1].endsWith('fetch-cloudflare-analytics.mjs');

if (isMain) {
  run({ argv: process.argv.slice(2) }).then((r) => {
    if (r.exitCode !== 0) {
      console.error(`${TAG} ✗ ${r.reason}: ${r.message}`);
      process.exit(r.exitCode);
    }
    const { snapshot, jsonOut } = r;
    if (jsonOut) {
      process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
    }
    if (snapshot.anomaly.flagged) {
      console.log(`::warning::${TAG} anomaly detected: ${snapshot.anomaly.reason}（yesterdayJp=${snapshot.anomaly.yesterdayJp} median6Jp=${snapshot.anomaly.median6Jp}）`);
    }
    console.log(`${TAG} 日次 ${snapshot.counts.daysReturned}/7 日 / 国 ${snapshot.counts.countriesSeen} / topPaths ${snapshot.topPaths?.unavailable ? '無' : '有'} / firewall ${snapshot.botSignals.firewallEvents?.unavailable ? '無' : '有'} / 欠落フィールド ${snapshot.fieldsUnavailable.length}`);
    process.exit(0);
  }).catch((e) => {
    console.error(`${TAG} ✗ unexpected-error: ${truncateMessage(e.message)}`);
    process.exit(1);
  });
}
