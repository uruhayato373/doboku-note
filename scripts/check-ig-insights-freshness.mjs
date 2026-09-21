#!/usr/bin/env node
// Instagram Graph API 週次取得（fetch-ig-insights.yml）が止まっていないか、
// 長期アクセストークンの失効が近づいていないかを検査する。
//
// 背景: IG の分析値は Graph API の長期トークン（既定 60 日）が失効すると無音で 0 件化する。
// 取得ワークフローが CI で止まっても quality-audit に検査が無ければ誰も気づけない
// （measurement-incidents.md「検出器そのものが無い領域が最も危険」と同型）。
// 判定軸は fetchedAt（取得を実行した日）と、トークンの有効期限の**早い方**。
// expiresAt / dataAccessExpiresAt は Graph API のレスポンスをそのまま unix 秒で保存する
// 前提（0 または欠落＝無期限、失効なしのトークン種別がある）。
//
// 「検査ゼロを PASS と呼ばない」: snapshot が 1 件も無ければ FAIL（検査不成立ではなく取得停止）。
// mediaListed が 0 件のときは「投稿が本当に無い」と「API が空応答を返した」を外から区別できないため FAIL 側に倒す。
//
// 使い方:
//   node scripts/check-ig-insights-freshness.mjs
//   node scripts/check-ig-insights-freshness.mjs --json
//   npm run check-ig-insights-freshness
//
// exit: 0=OK/WARN, 1=FAIL

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[check-ig-insights-freshness]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, '.claude/state/metrics/instagram');
const FILE_RE = /^ig-insights-(\d{4}-\d{2}-\d{2})\.json$/;
const JSON_OUT = process.argv.includes('--json');

/**
 * 純関数。snapshot（無ければ null）と現在時刻から判定を返す（テスト対象）。
 * snapshot 形: { fetchedAt: ISO文字列, counts: { mediaListed: number },
 *                token: { type: string, expiresAt: number(unix秒|0), dataAccessExpiresAt: number(unix秒|0) } }
 * @param {object|null} snapshotOrNull
 * @param {number} nowUtcMs
 * @param {{maxAgeDays?:number, failDays?:number, warnDays?:number}} opts
 */
export function assessIgInsights(snapshotOrNull, nowUtcMs, { maxAgeDays = 10, failDays = 7, warnDays = 14 } = {}) {
  const inspected = { file: snapshotOrNull?.__file ?? null, fetchedAt: null, mediaListed: null };
  if (!snapshotOrNull) {
    return { status: 'FAIL', reasons: ['snapshot が無い（fetch-ig-insights.yml が止まっている）'], expiresInDays: null, inspected };
  }

  const fetchedAt = snapshotOrNull.fetchedAt;
  const fetchedMs = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  const mediaListed = Number(snapshotOrNull?.counts?.mediaListed);
  inspected.fetchedAt = typeof fetchedAt === 'string' ? fetchedAt : null;
  inspected.mediaListed = Number.isFinite(mediaListed) ? mediaListed : null;

  const reasons = [];
  let status = 'OK';

  if (!Number.isFinite(fetchedMs)) {
    reasons.push('fetchedAt が読めない');
    status = 'FAIL';
  } else {
    const ageDays = (nowUtcMs - fetchedMs) / 86_400_000;
    if (ageDays > maxAgeDays) {
      reasons.push(`fetchedAt が ${Math.floor(ageDays)} 日前（上限 ${maxAgeDays} 日）`);
      status = 'FAIL';
    }
  }

  if (!Number.isFinite(mediaListed) || mediaListed === 0) {
    reasons.push('counts.mediaListed が 0（API 空応答の疑い）');
    status = 'FAIL';
  }

  // 期限 = expiresAt / dataAccessExpiresAt の非ゼロの最小。両方 0 or 欠落なら無期限＝null。
  const candidates = [snapshotOrNull?.token?.expiresAt, snapshotOrNull?.token?.dataAccessExpiresAt]
    .map(Number)
    .filter((v) => Number.isFinite(v) && v > 0);
  let expiresInDays = null;
  if (candidates.length > 0) {
    const minExpiresSec = Math.min(...candidates);
    expiresInDays = Math.floor((minExpiresSec * 1000 - nowUtcMs) / 86_400_000);
    if (expiresInDays < failDays) {
      reasons.push(`トークン失効まで ${expiresInDays} 日（下限 ${failDays} 日）`);
      status = 'FAIL';
    } else if (expiresInDays < warnDays && status === 'OK') {
      reasons.push(`トークン失効まで ${expiresInDays} 日（警告 ${warnDays} 日）`);
      status = 'WARN';
    }
  }

  return { status, reasons, expiresInDays, inspected };
}

/** DIR 内の最新 snapshot をファイル名ソートで読む。無ければ null。 */
function loadLatest(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => FILE_RE.test(f)).sort();
  if (files.length === 0) return null;
  const file = files[files.length - 1];
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  return { ...data, __file: file };
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-ig-insights-freshness.mjs');

if (isMain) {
  const snapshot = loadLatest(DIR);
  const r = assessIgInsights(snapshot, Date.now());

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ check: 'ig-insights-freshness', ...r }, null, 2) + '\n');
    process.exit(r.status === 'FAIL' ? 1 : 0);
  }

  console.log(`${TAG} 対象 1 件（最新 snapshot）／実検査 1 件／file=${r.inspected.file ?? '-'} fetchedAt=${r.inspected.fetchedAt ?? '-'} mediaListed=${r.inspected.mediaListed ?? '-'} expiresInDays=${r.expiresInDays ?? '無期限'}`);

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
