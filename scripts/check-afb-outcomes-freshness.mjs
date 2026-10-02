#!/usr/bin/env node
// afb 成果（公式 API・fetch-metrics.yml 週次 --commit）の取得停止を検知する。
// 金額・ドリフトの妥当性はここでは判定しない（別 channel の担当）。
//
// 判定:
//   data/afb/outcomes/YYYY-MM-DD.json の最新（台帳 afb.outcomes）
//     → 無い／observedAt が読めない／10 日超前 は FAIL
//   ディレクトリ自体が読めない（存在するがアクセス不可）は exit 2（本番異常と検査不成立を分ける）
//
// 使い方:
//   node scripts/check-afb-outcomes-freshness.mjs
//   node scripts/check-afb-outcomes-freshness.mjs --json
//   npm run check-afb-outcomes-freshness
//
// exit: 0=OK, 1=FAIL, 2=検査不成立（ディレクトリ読み取り不能）

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { datasetDir, latestFile } from './lib/datasets.mjs';

const TAG = '[check-afb-outcomes-freshness]';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AFF_DIR = join(ROOT, datasetDir('afb.outcomes'));
const LABEL = 'afb の成果の最新';
const JSON_OUT = process.argv.includes('--json');

/**
 * 純関数。afb の成果の最新ファイルの中身から判定を返す（テスト対象）。
 * @param {{latest: object|null}} input
 * @param {number} nowUtcMs
 * @param {{maxAgeDays?: number}} opts
 */
export function assessAfbOutcomesFreshness({ latest }, nowUtcMs, { maxAgeDays = 10 } = {}) {
  const inspected = { file: LABEL, observedAt: null, siteId: null, rowsExamined: null };

  if (!latest) {
    return { status: 'FAIL', reasons: [`${LABEL}が無い（fetch-afb-outcomes.mjs --commit が止まっている）`], inspected };
  }

  inspected.siteId = latest.siteId ?? null;
  const observedAt = latest.observedAt;
  const observedMs = typeof observedAt === 'string' ? Date.parse(observedAt) : NaN;
  inspected.observedAt = typeof observedAt === 'string' ? observedAt : null;
  const occ = latest.basis?.occurrence;
  const rec = latest.basis?.recognition;
  const rowsExamined =
    (Number.isFinite(occ?.rows) ? occ.rows : 0) + (Number.isFinite(rec?.rows) ? rec.rows : 0);
  inspected.rowsExamined = Number.isFinite(occ?.rows) || Number.isFinite(rec?.rows) ? rowsExamined : null;

  const reasons = [];
  let status = 'OK';

  if (!Number.isFinite(observedMs)) {
    reasons.push(`${LABEL}の observedAt が読めない`);
    status = 'FAIL';
  } else {
    const ageDays = (nowUtcMs - observedMs) / 86_400_000;
    if (ageDays > maxAgeDays) {
      reasons.push(`${LABEL}が ${Math.floor(ageDays)} 日前（上限 ${maxAgeDays} 日）`);
      status = 'FAIL';
    }
  }

  return { status, reasons, inspected };
}

function loadLatest() {
  const rel = latestFile(ROOT, 'afb.outcomes');
  return rel ? JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) : null;
}

const isMain = process.argv[1] && process.argv[1].split('\\').join('/').endsWith('check-afb-outcomes-freshness.mjs');

if (isMain) {
  let latest;
  try {
    // ディレクトリ自体が壊れている（存在するが読み取れない等）は「afb が無い」とは別に扱う＝検査不成立。
    if (existsSync(AFF_DIR)) statSync(AFF_DIR);
    latest = loadLatest();
  } catch (error) {
    console.error(`${TAG} ✗ 検査不成立: ${relativeDir()} を読めない（${error.message}）`);
    process.exit(2);
  }

  const r = assessAfbOutcomesFreshness({ latest }, Date.now());

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ check: 'afb-outcomes-freshness', ...r }, null, 2) + '\n');
    process.exit(r.status === 'FAIL' ? 1 : 0);
  }

  console.log(
    `${TAG} 対象 1 件（${LABEL}）／実検査 1 件／observedAt=${r.inspected.observedAt ?? '-'} siteId=${r.inspected.siteId ?? '-'} rowsExamined=${r.inspected.rowsExamined ?? '-'}`,
  );

  if (r.status === 'FAIL') {
    console.error(`${TAG} ✗ FAIL: ${r.reasons.join(' / ')}`);
    process.exit(1);
  }
  console.log(`${TAG} ✓ OK`);
  process.exit(0);
}

function relativeDir() {
  return AFF_DIR.split('\\').join('/').slice(ROOT.split('\\').join('/').length + 1);
}
