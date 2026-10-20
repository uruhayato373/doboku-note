#!/usr/bin/env node
/**
 * check-video-publication.mjs — 公開実体の照合が「実際に行われているか」を見るオフラインゲート。
 *
 * 分業:
 *   - `verify-video-publication`（CI/Mac・要 creds）が外部実体を実査して記録を書く
 *   - 本スクリプト（どこでも実行可・ネットワーク不要）は**その記録の有無・鮮度・網羅**を見る
 *
 * なぜ 2 本に分けるか: 会社 PC からは外部 API を叩けない（CI 供給が正）。実査を quality:audit の
 * ゲートにすると常に検査不成立になるため、ゲート側は「実査が回っているか」を見る。
 * これで **「照合していないのに published のまま」** という最も危険な状態が赤くなる。
 *
 * 検査:
 *   V01 published 相当の派生物があるのに記録が無い（＝一度も照合していない）
 *   V02 記録はあるが対象を網羅していない（新しく公開したのに未照合）
 *   V03 記録が古い（既定 14 日）。--freshness のときだけ＝壁時計で結果が変わるので ci でなく ops（日次）が見る
 *   V04 記録に孤児（台帳の現役・同じvideoIdの停止済みのどちらにも属さない）
 *   V05 実査がドリフトを報告している（gone / not_public / cta_utm_missing / related_missing 等）。--freshness のときだけ＝
 *       YouTube 側の状態（削除・非公開）で決まり PR の差分では直せないので ci でなく ops（日次）が見る（DN-0791・2026-10-13 に
 *       1 本の削除で develop の CI が 42 回赤くなった）
 *
 * Usage:
 *   node scripts/check-video-publication.mjs [--freshness] [--max-age-days N] [--json]
 *   --freshness: ops の日次で、壁時計と外部状態に依存する V03・V05 も見る
 *
 * exit: 0 合格（対象0件も明示して 0）/ 1 違反あり
 *   「対象0件」と「異常0件」を必ず区別して出力する（CLAUDE.md §9）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig } from './lib/video-content-check.mjs';
import { loadVideoState } from './lib/registry-video-state.mjs';
import { datasetPath, freshnessDays } from './lib/datasets.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const FRESHNESS = argv.includes('--freshness');
const maxAgeIdx = argv.indexOf('--max-age-days');
// 既定は台帳 state.video-publication-verify の freshness.failDays（--max-age-days で一時的に変えられる）
const MAX_AGE_DAYS = maxAgeIdx >= 0 ? Number(argv[maxAgeIdx + 1]) : freshnessDays('state.video-publication-verify', 'failDays');

const config = loadConfig(ROOT);
const RECORD_PATH = join(ROOT, datasetPath('state.video-publication-verify'));
const LIVE_STATUSES = ['published', 'measured', 'refresh_due'];

const issues = [];
const add = (code, message) => issues.push({ code, message });

/** 台帳の published 相当派生物（照合されるべき対象）を列挙 */
const stoppedTargets = new Map();
function liveTargets() {
  let state;
  try {
    state = loadVideoState(ROOT);
  } catch (e) {
    add('V00', `台帳（content/registry）を読めない: ${e.message}`);
    return [];
  }
  const out = [];
  for (const [packId, entry] of Object.entries(state.packs ?? {})) {
    for (const [key, raw] of Object.entries(entry.derivatives ?? {})) {
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((d, i) => {
        const id = `${packId}/${Array.isArray(raw) ? `${key}[${i}]` : key}`;
        if (d.status === 'stopped' && d.videoId) stoppedTargets.set(id, d.videoId);
        if (!LIVE_STATUSES.includes(d.status)) return;
        out.push(id);
      });
    }
  }
  return out;
}

const targets = liveTargets();
let record = null;
if (existsSync(RECORD_PATH)) {
  try {
    record = JSON.parse(readFileSync(RECORD_PATH, 'utf8'));
  } catch (e) {
    add('V00', `照合記録が壊れている: ${e.message}`);
  }
}

let ageDays = null;
if (record?.verifiedAt) {
  ageDays = Math.floor((Date.now() - new Date(record.verifiedAt).getTime()) / 86_400_000);
}

// 過去の実査記録は書き換えない。同じ外部IDで明示停止されたものだけを現役の検査から外す。
const retiredRecords = new Set(Object.entries(record?.entries ?? {})
  .filter(([id, entry]) => entry.videoId && stoppedTargets.get(id) === entry.videoId).map(([id]) => id));

if (targets.length === 0) {
  // 公開前は正常。ただし「対象0件」であることを必ず言う（緑と混同させない）。
  if (!JSON_OUT) {
    console.log('check-video-publication: 公開済みの派生物 0 件（対象0件・まだ公開していない）');
    console.log(record ? `  最終照合: ${record.verifiedAt}（checked=${record.checked}）` : '  照合記録: まだ無い（対象が無いので正常）');
  }
} else {
  if (!record) {
    add('V01', `公開済みの派生物が ${targets.length} 件あるのに照合記録が無い（npm run verify-video-publication を CI で回す）`);
  } else {
    const covered = new Set(Object.keys(record.entries ?? {}));
    for (const t of targets) {
      if (!covered.has(t)) add('V02', `${t}: 公開済みだが照合記録に無い（照合後に公開した／実査が失敗している）`);
    }
    for (const id of covered) {
      if (!targets.includes(id) && !retiredRecords.has(id)) add('V04', `${id}: 照合記録の孤児（state から消えたのに記録に残る）`);
    }
    if (FRESHNESS && ageDays !== null && ageDays > MAX_AGE_DAYS) {
      add('V03', `照合が ${ageDays} 日前（上限 ${MAX_AGE_DAYS} 日）。実査が止まっている可能性`);
    }
    // 外部状態のドリフトは ops だけ（ci では件数だけ出して落とさない）
    const drift = (record.findings ?? []).filter((f) => !retiredRecords.has(f.id));
    if (FRESHNESS) for (const f of drift) add('V05', `${f.id}: [${f.code}] ${f.message}`);
    else if (drift.length && !JSON_OUT) console.log(`check-video-publication: 実査のドリフト ${drift.length} 件は ops（--freshness・日次）が見る`);
  }
}

const result = {
  targets: targets.length,
  recorded: record ? Object.keys(record.entries ?? {}).filter((id) => targets.includes(id)).length : 0,
  retiredRecorded: retiredRecords.size,
  verifiedAt: record?.verifiedAt ?? null,
  ageDays,
  issues,
};

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
} else if (targets.length > 0) {
  console.log(
    `check-video-publication: 公開済み ${targets.length} 件 / 照合済み ${result.recorded} 件 / 停止済みの過去記録 ${result.retiredRecorded} 件` +
      (ageDays === null ? '（未照合）' : `（${ageDays} 日前）`),
  );
  for (const i of issues) console.log(`  [FAIL] ${i.code} ${i.message}`);
}
if (!JSON_OUT) console.log(`結果: ${issues.length === 0 ? 'PASS' : 'FAIL'}（違反 ${issues.length} 件）`);

process.exit(issues.length > 0 ? 1 : 0);
