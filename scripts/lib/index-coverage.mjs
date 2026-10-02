/**
 * index-coverage.mjs — インデックス率（全体・資格別）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 全体は index-coverage.yml（週次 CI）が書く data/gsc/index-coverage.json の indexed_ratio。
 * 資格別はその回の URL 検査バッチ（data/gsc/url-inspection/）を /exam/<資格id>/ 配下で数え、
 * verdict PASS の割合を出す（資格の URL 規則は事業計測 fetch-business-metrics と同じ）。
 * 読み手: 管理画面 トップ（KPI ツリーのサイトの段）・検索 ＞ インデックス。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetDir, datasetPath } from './datasets.mjs';
import { resolveMovedPath } from './repository-paths.mjs';

const HISTORY = datasetPath('gsc.index-coverage-history');
const BATCH_DIR = datasetDir('gsc.url-inspection');
/** 履歴に書いたバッチ名 → いまの位置（移す前の名前 inspection-batch-<時刻>.json も読める） */
const batchFileOf = (name) => (name.startsWith('inspection-') ? resolveMovedPath(`data/metrics/url-inspection/${name}`) : `${BATCH_DIR}/${name}`); // path-literal-ok: 移す前の名前を読み替える

/** 検査の履歴（古い順）。無ければ空。 */
export function indexHistory(root) {
  const p = join(root, HISTORY);
  if (!existsSync(p)) return [];
  return [...(JSON.parse(readFileSync(p, 'utf8')).entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

/** 1 回の検査から資格別の登録率と件数（純関数）。rows は URL 検査の結果行。 */
export function qualificationRatios(rows, qualificationIds) {
  const out = {};
  for (const id of qualificationIds) {
    const mine = rows.filter((r) => String(r.url).includes(`/exam/${id}/`));
    const indexed = mine.filter((r) => r.index?.verdict === 'PASS').length;
    out[id] = { inspected: mine.length, indexed, ratio: mine.length ? indexed / mine.length : null };
  }
  return out;
}

/** 検査 1 回分（履歴の 1 行）を全体と資格別に展開する。バッチが無ければ資格別は null。 */
export function expandEntry(root, entry, qualificationIds) {
  const batchPath = entry.batch_file && !entry.batch_file.includes(',') ? join(root, batchFileOf(entry.batch_file)) : '';
  let byQualification = Object.fromEntries(qualificationIds.map((id) => [id, { inspected: 0, indexed: 0, ratio: null }]));
  if (batchPath && existsSync(batchPath)) {
    const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
    byQualification = qualificationRatios(Array.isArray(batch) ? batch : batch.results ?? [], qualificationIds);
  }
  return { date: entry.date, all: { inspected: entry.inspected, indexed: entry.indexed, ratio: entry.indexed_ratio }, byQualification };
}

/** 期間の末日以前で最新の検査を展開する。無ければ null。 */
export function latestIndexAsOf(root, endDate, qualificationIds) {
  const entry = indexHistory(root).filter((e) => e.date <= endDate).at(-1);
  return entry ? expandEntry(root, entry, qualificationIds) : null;
}
