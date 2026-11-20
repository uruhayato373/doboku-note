#!/usr/bin/env node
/**
 * check-gsc-ui-run.mjs — GSC 画面取得の 1 回分（data/gsc/ui/<run>/）の品質ゲート（旧 gsc-csv-auditor の判定を移した・DN-1242）
 * ---------------------------------------------------------------------------
 * 追跡 SSOT（ui-urls / ui-history / marker）の整合は check-google-ui-ssot が持つ。こちらは raw の run を見る。
 * raw（CSV・manifest・normalized）は gitignore なので、取得した Mac にしか無い。run が 1 つも無いときは検査不成立（exit 2）で、
 * 「SSOT だけで判定する」場合は check-google-ui-ssot の結果を読む（quality-audit は run が無い端末では skip する）。
 *
 * 検査項目（FAIL / WARN）:
 *   1 manifest       status=error → FAIL。unit が downloaded でも row-not-found（その理由が 0 件）でもない → FAIL。全 unit 失敗 → FAIL
 *   2 行数           manifest の csvRows と normalized の exportedRows・rows.length が違う → FAIL
 *   3 sha256         manifest の sha256 と raw CSV の実測が違う・rawFile が無い → FAIL
 *   4 切捨て         uiTotal > exportedRows の差が「1,000 件上限」で説明できない → FAIL（取得失敗）。上限なのに truncated=false → FAIL。上限どおりは INFO
 *   5 rejects        rejects 比率 > 5% → WARN（CSV 破損・列ズレの疑い）。URL 0 件なのに rejects → FAIL（別シートを掴んだ）
 *   6 重複           duplicateCount>1 の URL 数 → INFO
 *   7 前回差分       直前 run の同 issue×scope から exportedRows が 50% 超減 → WARN
 *   8 schema         schemaVersion・rows[].url / comparisonKey / raw の欠落 → FAIL
 *
 * 使い方:
 *   node scripts/checks/check-gsc-ui-run.mjs [--run <runId>] [--root <repo>] [--json]
 * exit: 0=OK / 1=FAIL / 2=検査不成立（run が無い・実検査 0 ユニット）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { datasetDir } from '../lib/datasets.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { createFindings, exitCodeOf, listRunIds, readJsonOrNull, renderLines, sha256Of } from '../lib/run-audit.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

const TAG = '[check-gsc-ui-run]';
export const GSC_EXPORT_CAP = 1000;
export const REJECT_RATIO_WARN = 0.05;
export const DROP_RATIO_WARN = 0.5;

const unitKey = (u) => `${u.issueKey}--${u.scope}`;

/** 1 つの run を検査する。root はリポジトリ（テストでは fixture のルート）。 */
export function auditGscRun({ root, runId = null }) {
  const f = createFindings();
  const base = join(root, datasetDir('gsc.ui-raw'));
  const runs = listRunIds(base);
  const id = runId ?? runs.at(-1) ?? null;
  const result = { check: 'gsc-ui-run', runId: id, runsFound: runs.length, units: 0, downloaded: 0, zero: 0, failed: 0, checked: 0, truncatedUnits: [], duplicateUrls: 0 };
  if (!id) {
    f.add('info', `${base} に run が無い（raw は gitignore・取得した Mac にだけある）。SSOT の整合は check-google-ui-ssot を読む`);
    return { ...result, ...pack(f) };
  }
  const dir = join(base, id);
  const manifest = readJsonOrNull(join(dir, 'manifest.json'));
  if (!manifest) {
    f.add('fail', `${id}: manifest.json が読めない`);
    return { ...result, ...pack(f) };
  }
  if (manifest.status === 'error') f.add('fail', `${id}: manifest.status=error（${String(manifest.error ?? '').slice(0, 120)}）`);
  else if (manifest.status && manifest.status !== 'ok') f.add('warn', `${id}: manifest.status=${manifest.status}`);

  const prevId = runs.filter((r) => r < id).at(-1) ?? null;
  const units = Array.isArray(manifest.units) ? manifest.units : [];
  result.units = units.length;
  if (units.length === 0) f.add('fail', `${id}: manifest に unit が 0 件`);

  for (const u of units) {
    const key = unitKey(u);
    if (u.status === 'row-not-found') { result.zero += 1; continue; }
    if (u.status !== 'downloaded') {
      result.failed += 1;
      f.add('fail', `${key}: 取得に失敗（status=${u.status}${u.error ? `: ${String(u.error).slice(0, 80)}` : ''}）`);
      continue;
    }
    result.downloaded += 1;
    result.checked += 1;

    // 3 sha256
    const rawPath = join(dir, u.rawFile ?? '');
    if (!u.rawFile || !existsSync(rawPath)) f.add('fail', `${key}: rawFile が実在しない（${u.rawFile ?? 'null'}）`);
    else if (!u.sha256) f.add('fail', `${key}: manifest に sha256 が無い`);
    else if (sha256Of(readFileSync(rawPath)) !== u.sha256) f.add('fail', `${key}: sha256 が不一致（改竄または再取得）`);

    const doc = readJsonOrNull(join(dir, 'normalized', `${key}.json`));
    if (!doc) { f.add('fail', `${key}: normalized/${key}.json が無い（正規化もれ）`); continue; }

    // 8 schema
    if (typeof doc.schemaVersion !== 'number' || !Array.isArray(doc.rows)) { f.add('fail', `${key}: schemaVersion / rows が欠落`); continue; }
    const incomplete = doc.rows.filter((r) => !r?.url || !r?.comparisonKey || !r?.raw).length;
    if (incomplete > 0) f.add('fail', `${key}: url / comparisonKey / raw が欠けた行が ${incomplete} 件`);

    // 2 行数
    if (typeof u.csvRows === 'number' && (doc.exportedRows !== u.csvRows || doc.rows.length !== u.csvRows)) {
      f.add('fail', `${key}: csvRows ${u.csvRows} と exportedRows ${doc.exportedRows}・rows ${doc.rows.length} が不一致`);
    }

    // 4 切捨て: 画面総数との差が上限で説明できるか
    const total = typeof u.uiTotal === 'number' ? u.uiTotal : doc.uiTotal;
    const exported = doc.exportedRows ?? doc.rows.length;
    if (typeof total === 'number' && total > exported) {
      if (exported >= GSC_EXPORT_CAP) {
        result.truncatedUnits.push(key);
        f.add('info', `${key}: ${GSC_EXPORT_CAP} 件上限の正常サンプル（画面 ${total} / CSV ${exported}）`);
        if (u.truncated !== true && doc.truncated !== true) f.add('fail', `${key}: 上限に当たっているのに truncated が false`);
      } else {
        f.add('fail', `${key}: 画面 ${total} 件に対し CSV ${exported} 件。上限（${GSC_EXPORT_CAP}）では説明できない＝取得失敗`);
      }
    }

    // 5 rejects
    const rejects = Array.isArray(doc.rejects) ? doc.rejects.length : (doc.rejectCount ?? readJsonOrNull(join(dir, 'normalized', `${key}.rejects.json`))?.length ?? 0);
    if (doc.rows.length === 0 && rejects > 0) f.add('fail', `${key}: URL 0 件で reject ${rejects} 件＝別シートを掴んだ疑い`);
    else if (rejects > 0 && rejects / (rejects + doc.rows.length) > REJECT_RATIO_WARN) {
      f.add('warn', `${key}: reject 比率 ${(100 * rejects / (rejects + doc.rows.length)).toFixed(1)}%（${rejects} 件）。CSV 破損・列ズレの疑い`);
    }

    // 6 重複
    result.duplicateUrls += doc.rows.filter((r) => (r.duplicateCount ?? 1) > 1).length;

    // 7 前回差分
    if (prevId) {
      const prev = readJsonOrNull(join(base, prevId, 'normalized', `${key}.json`));
      const pe = prev?.exportedRows;
      if (typeof pe === 'number' && pe > 0 && exported < pe * (1 - DROP_RATIO_WARN)) {
        f.add('warn', `${key}: 前回 run（${prevId}）の ${pe} 件から ${exported} 件へ急減（${Math.round(100 * (1 - exported / pe))}% 減）`);
      }
    }
  }
  if (units.length > 0 && result.downloaded === 0) f.add('fail', `${id}: 全 unit の取得に失敗（downloaded 0 / ${units.length}）`);
  if (result.duplicateUrls > 0) f.add('info', `重複 URL（duplicateCount>1）${result.duplicateUrls} 件（GSC が同一 URL を複数例示）`);
  return { ...result, ...pack(f) };
}

function pack(f) {
  return { fail: f.fail, warn: f.warn, info: f.info };
}

const isMain = isCliEntry(import.meta.url);
if (isMain) {
  const args = parseCliArgs({ run: { type: 'string' }, root: { type: 'string' }, json: { type: 'boolean' } });
  const r = auditGscRun({ root: args.root ?? REPO_ROOT, runId: args.run });
  const code = exitCodeOf(r);
  if (args.json) console.log(JSON.stringify({ ...r, exit: code }, null, 2));
  else {
    for (const l of renderLines(TAG, r)) console.log(l);
    console.log(`${TAG} run=${r.runId ?? 'なし'} unit ${r.units}（downloaded ${r.downloaded} / 0 件 ${r.zero} / 失敗 ${r.failed}）実検査 ${r.checked} / FAIL ${r.fail.length} / WARN ${r.warn.length}`);
    if (code === 2) console.error(`${TAG} 検査不成立: 実検査 0 ユニット（run が無い）`);
  }
  process.exit(code);
}
