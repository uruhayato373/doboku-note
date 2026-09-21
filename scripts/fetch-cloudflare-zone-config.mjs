#!/usr/bin/env node
/**
 * fetch-cloudflare-zone-config.mjs — Cloudflare ゾーン設定を取得しドリフトを検知する
 * ---------------------------------------------------------------------------
 * 背景: ゾーン設定（キャッシュ/圧縮/WAF/Bot Management）は管理画面から誰でも変更できてしまい、
 *   変更に気づかず別原因を疑い続ける事故が起きる。settings / ruleset phases / bot_management を
 *   取得し正規化した上で、直前スナップショット（baseline）との差分だけを機械的に検知する。
 * 方針: 初回は取得結果をそのまま baseline にする（比較対象が無いため）。2 回目以降は
 *   diffZoneConfig で比較し、差分があれば drift ファイルへ書いて exit 2（人の確認待ち）。
 *   確認後は --accept-baseline で baseline を latest へ合わせる。
 * usage:
 *   node scripts/fetch-cloudflare-zone-config.mjs
 *   node scripts/fetch-cloudflare-zone-config.mjs --accept-baseline   # 人がドリフトを確認した後に実行
 *   npm run fetch-cloudflare-zone-config
 * exit code: 0=ドリフト無し（or baseline 作成 or 解消）／1=API 失敗（何も書かない）／2=ドリフト検知
 * ---------------------------------------------------------------------------
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nowJstIso } from './lib/jst-date.mjs';
import { readJson } from './lib/business-direction.mjs';
import { normalizeZoneConfig, diffZoneConfig, hasDrift } from './lib/cloudflare-zone-config.mjs';

const TAG = '[fetch-cloudflare-zone-config]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = '.claude/state/cloudflare';
const LATEST_FILE = 'zone-config-latest.json';
const BASELINE_FILE = 'zone-config-baseline.json';
const DRIFT_FILE = 'zone-config-drift.json';

const truncateMessage = (message) => String(message ?? '').slice(0, 200);

async function getJson(fetchImpl, url, token) {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/**
 * @param {{fetchImpl:Function, root?:string, now?:() => number, argv?:string[]}} opts
 */
export async function run({ fetchImpl = globalThis.fetch, root = ROOT, now = () => Date.now(), argv = [] } = {}) {
  const config = readJson(root, '.claude/config/cloudflare.json');
  const token = process.env.CLOUDFLARE_ANALYTICS_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return { exitCode: 1, reason: 'auth-unavailable', message: 'CLOUDFLARE_ANALYTICS_API_TOKEN / CLOUDFLARE_API_TOKEN が無い' };

  const stateDir = join(root, STATE_DIR);
  const latestPath = join(stateDir, LATEST_FILE);
  const baselinePath = join(stateDir, BASELINE_FILE);
  const driftPath = join(stateDir, DRIFT_FILE);

  if (argv.includes('--accept-baseline')) {
    if (!existsSync(latestPath)) return { exitCode: 1, reason: 'no-latest', message: 'zone-config-latest.json が無い（先に取得を実行）' };
    const latest = readJson(root, `${STATE_DIR}/${LATEST_FILE}`);
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(latest, null, 2) + '\n');
    if (existsSync(driftPath)) rmSync(driftPath);
    return { exitCode: 0, message: 'baseline を latest へ更新した' };
  }

  let zone;
  try {
    const { ok, status, body } = await getJson(fetchImpl, `${config.rest}/zones?name=${encodeURIComponent(config.zoneName)}`, token);
    if (!ok || !body?.success) return { exitCode: 1, reason: 'zone-lookup-failed', message: truncateMessage(body?.errors?.[0]?.message ?? `http-${status}`) };
    zone = body.result?.[0];
    if (!zone?.id) return { exitCode: 1, reason: 'zone-not-found', message: `zone ${config.zoneName} が見つからない` };
  } catch (e) {
    return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
  }

  let settings;
  try {
    const { ok, status, body } = await getJson(fetchImpl, `${config.rest}/zones/${zone.id}/settings`, token);
    if (!ok || !body?.success) return { exitCode: 1, reason: 'settings-failed', message: truncateMessage(body?.errors?.[0]?.message ?? `http-${status}`) };
    settings = body.result ?? [];
  } catch (e) {
    return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
  }

  const rulesets = {};
  for (const phase of config.rulesetPhases ?? []) {
    try {
      const { ok, status, body } = await getJson(fetchImpl, `${config.rest}/zones/${zone.id}/rulesets/phases/${phase}/entrypoint`, token);
      if (status === 404) { rulesets[phase] = { rules: [] }; continue; }
      if (!ok || !body?.success) return { exitCode: 1, reason: 'ruleset-failed', message: truncateMessage(`${phase}: ${body?.errors?.[0]?.message ?? `http-${status}`}`) };
      rulesets[phase] = { rules: body.result?.rules ?? [] };
    } catch (e) {
      return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
    }
  }

  let botManagement;
  try {
    const { ok, status, body } = await getJson(fetchImpl, `${config.rest}/zones/${zone.id}/bot_management`, token);
    if (status === 403 || status === 404) {
      botManagement = { unavailable: 'plan-or-scope' };
    } else if (!ok || !body?.success) {
      return { exitCode: 1, reason: 'bot-management-failed', message: truncateMessage(body?.errors?.[0]?.message ?? `http-${status}`) };
    } else {
      botManagement = body.result ?? {};
    }
  } catch (e) {
    return { exitCode: 1, reason: 'network-error', message: truncateMessage(e.message) };
  }

  const normalized = normalizeZoneConfig({ settings, rulesets, botManagement, plan: zone.plan ?? null });
  const latest = { fetchedAt: nowJstIso(now()), zone: config.zoneName, config: normalized };

  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  writeFileSync(latestPath, JSON.stringify(latest, null, 2) + '\n');

  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify(latest, null, 2) + '\n');
    return { exitCode: 0, message: 'baseline created', latest };
  }

  const baseline = readJson(root, `${STATE_DIR}/${BASELINE_FILE}`);
  const diff = diffZoneConfig(baseline.config, normalized);
  if (hasDrift(diff)) {
    writeFileSync(driftPath, JSON.stringify({ fetchedAt: latest.fetchedAt, diff }, null, 2) + '\n');
    return { exitCode: 2, reason: 'drift', diff, latest };
  }
  if (existsSync(driftPath)) rmSync(driftPath);
  return { exitCode: 0, message: 'no drift', latest };
}

const isMain = process.argv[1] && process.argv[1].endsWith('fetch-cloudflare-zone-config.mjs');

if (isMain) {
  run({ argv: process.argv.slice(2) }).then((r) => {
    if (r.exitCode === 1) {
      console.error(`${TAG} ✗ ${r.reason}: ${r.message}`);
      process.exit(1);
    }
    if (r.exitCode === 2) {
      console.error(`${TAG} ✗ drift detected`);
      const paths = [...r.diff.added.map((p) => `+ ${p}`), ...r.diff.removed.map((p) => `- ${p}`), ...r.diff.changed.map((c) => `~ ${c.path}`)].slice(0, 30);
      for (const line of paths) console.error(`::error::${TAG} ${line}`);
      process.exit(2);
    }
    console.log(`${TAG} ✓ ${r.message}`);
    process.exit(0);
  }).catch((e) => {
    console.error(`${TAG} ✗ unexpected-error: ${truncateMessage(e.message)}`);
    process.exit(1);
  });
}
