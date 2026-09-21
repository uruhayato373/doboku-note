#!/usr/bin/env node
// Cloudflare zone analytics 日次取得（cloudflare-metrics.yml）と
// zone 設定監査（cloudflare-config-audit.yml）の停止を検査する。
// ドリフト自体（設定が意図と食い違っているか）はここでは判定しない（別 channel の担当）。
//
// 判定:
//   zone snapshot: .claude/state/metrics/cloudflare/cf-zone-YYYY-MM-DD.json の最新
//     → 無い／3 日超前／counts.daysReturned が 0 以下 は FAIL
//   config latest: .claude/state/cloudflare/zone-config-latest.json
//     → 無い／fetchedAt が 10 日超前 は FAIL
//   両方無い場合も「未取得」として FAIL（検査ゼロを PASS と呼ばない）
//
// 使い方:
//   node scripts/check-cloudflare-metrics-freshness.mjs
//   node scripts/check-cloudflare-metrics-freshness.mjs --json
//   npm run check-cloudflare-metrics-freshness
//
// exit: 0=OK/WARN, 1=FAIL

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[check-cloudflare-metrics-freshness]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZONE_DIR = join(ROOT, '.claude/state/metrics/cloudflare');
const ZONE_FILE_RE = /^cf-zone-(\d{4}-\d{2}-\d{2})\.json$/;
const CONFIG_LATEST = join(ROOT, '.claude/state/cloudflare/zone-config-latest.json');
const JSON_OUT = process.argv.includes('--json');

/**
 * 純関数。zone snapshot と config latest から判定を返す（テスト対象）。
 * @param {{zoneSnapshot: object|null, configLatest: object|null}} input
 * @param {number} nowUtcMs
 * @param {{zoneMaxAgeDays?:number, configMaxAgeDays?:number}} opts
 */
export function assessCloudflareFreshness({ zoneSnapshot, configLatest }, nowUtcMs, { zoneMaxAgeDays = 3, configMaxAgeDays = 10 } = {}) {
  const reasons = [];
  let status = 'OK';

  const inspected = {
    zone: { file: zoneSnapshot?.__file ?? null, fetchedAt: null, daysReturned: null },
    config: { fetchedAt: null },
  };

  if (!zoneSnapshot && !configLatest) {
    return {
      status: 'FAIL',
      reasons: ['zone snapshot も config latest も無い（未取得）'],
      inspected,
    };
  }

  // zone snapshot
  if (!zoneSnapshot) {
    reasons.push('zone snapshot が無い（cloudflare-metrics.yml が止まっている）');
    status = 'FAIL';
  } else {
    const fetchedAt = zoneSnapshot.fetchedAt;
    const fetchedMs = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
    const daysReturned = Number(zoneSnapshot?.counts?.daysReturned);
    inspected.zone.fetchedAt = typeof fetchedAt === 'string' ? fetchedAt : null;
    inspected.zone.daysReturned = Number.isFinite(daysReturned) ? daysReturned : null;

    if (!Number.isFinite(fetchedMs)) {
      reasons.push('zone snapshot の fetchedAt が読めない');
      status = 'FAIL';
    } else {
      const ageDays = (nowUtcMs - fetchedMs) / 86_400_000;
      if (ageDays > zoneMaxAgeDays) {
        reasons.push(`zone snapshot が ${Math.floor(ageDays)} 日前（上限 ${zoneMaxAgeDays} 日）`);
        status = 'FAIL';
      }
    }
    if (!Number.isFinite(daysReturned) || daysReturned <= 0) {
      reasons.push('zone snapshot の counts.daysReturned が 0 以下');
      status = 'FAIL';
    }
  }

  // config latest
  if (!configLatest) {
    reasons.push('zone-config-latest.json が無い（cloudflare-config-audit.yml が止まっている）');
    status = 'FAIL';
  } else {
    const fetchedAt = configLatest.fetchedAt;
    const fetchedMs = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
    inspected.config.fetchedAt = typeof fetchedAt === 'string' ? fetchedAt : null;
    if (!Number.isFinite(fetchedMs)) {
      reasons.push('config latest の fetchedAt が読めない');
      status = 'FAIL';
    } else {
      const ageDays = (nowUtcMs - fetchedMs) / 86_400_000;
      if (ageDays > configMaxAgeDays) {
        reasons.push(`config latest が ${Math.floor(ageDays)} 日前（上限 ${configMaxAgeDays} 日）`);
        status = 'FAIL';
      }
    }
  }

  return { status, reasons, inspected };
}

/** ZONE_DIR 内の最新 snapshot をファイル名ソートで読む。無ければ null。 */
function loadLatestZone(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => ZONE_FILE_RE.test(f)).sort();
  if (files.length === 0) return null;
  const file = files[files.length - 1];
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  return { ...data, __file: file };
}

function loadConfigLatest(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-cloudflare-metrics-freshness.mjs');

if (isMain) {
  const zoneSnapshot = loadLatestZone(ZONE_DIR);
  const configLatest = loadConfigLatest(CONFIG_LATEST);
  const r = assessCloudflareFreshness({ zoneSnapshot, configLatest }, Date.now());

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ check: 'cloudflare-metrics-freshness', ...r }, null, 2) + '\n');
    process.exit(r.status === 'FAIL' ? 1 : 0);
  }

  console.log(`${TAG} 対象 2 件（zone snapshot・config latest）／実検査 2 件／zone.file=${r.inspected.zone.file ?? '-'} zone.fetchedAt=${r.inspected.zone.fetchedAt ?? '-'} zone.daysReturned=${r.inspected.zone.daysReturned ?? '-'} config.fetchedAt=${r.inspected.config.fetchedAt ?? '-'}`);

  if (r.status === 'FAIL') {
    console.error(`${TAG} ✗ FAIL: ${r.reasons.join(' / ')}`);
    process.exit(1);
  }
  if (r.status === 'WARN') {
    console.log(`${TAG} ⚠ WARN: ${r.reasons.join(' / ')}`);
    process.exit(0);
  }
  console.log(`${TAG} ✓ OK`);
  process.exit(0);
}
