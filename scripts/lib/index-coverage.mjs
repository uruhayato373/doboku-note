/**
 * index-coverage.mjs — インデックス率（全体・資格別）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 全体も資格別も、index-coverage.yml（週次 CI）が書く data/gsc/index-coverage.json の 1 行に入っている
 * （全体＝indexed_ratio・資格別＝by_qualification）。資格別は append-coverage-history がその回の URL 検査バッチ
 * （data/gsc/url-inspection/）を /exam/<資格id>/ 配下で数え、verdict PASS の割合を書く
 * （資格の URL 規則は事業計測 fetch-business-metrics と同じ）。バッチは新しい 2 回分しか残さないので、
 * ここはバッチを開かず履歴だけを読む。
 * 読み手: 管理画面 トップ（KPI ツリーのサイトの段）・検索 ＞ インデックス。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';

const HISTORY = datasetPath('gsc.index-coverage-history');

/** 検査の履歴（古い順）。無ければ空。 */
export function indexHistory(root) {
  const p = join(root, HISTORY);
  if (!existsSync(p)) return [];
  return [...(JSON.parse(readFileSync(p, 'utf8')).entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

/** URL 検査の結果行に出てくる資格 id（URL に /exam/<id>/ を含むもの）。名前順。 */
export function qualificationIdsIn(rows) {
  const ids = new Set();
  for (const r of rows) for (const m of String(r.url).matchAll(/\/exam\/([A-Za-z0-9_-]+)(?=\/)/g)) ids.add(m[1]);
  return [...ids].sort();
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

/** 検査 1 回分（履歴の 1 行）を全体と資格別に展開する。資格別の記録が無い資格・行（資格の URL が無かった回など）は 0 件・率 null。 */
export function expandEntry(entry, qualificationIds) {
  const stored = entry.by_qualification ?? {};
  return {
    date: entry.date,
    all: { inspected: entry.inspected, indexed: entry.indexed, ratio: entry.indexed_ratio },
    byQualification: Object.fromEntries(qualificationIds.map((id) => [id, stored[id] ?? { inspected: 0, indexed: 0, ratio: null }])),
  };
}

/** 期間の末日以前で最新の検査を展開する。無ければ null。 */
export function latestIndexAsOf(root, endDate, qualificationIds) {
  const entry = indexHistory(root).filter((e) => e.date <= endDate).at(-1);
  return entry ? expandEntry(entry, qualificationIds) : null;
}
