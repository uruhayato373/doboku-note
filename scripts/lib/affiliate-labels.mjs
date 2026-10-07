/**
 * affiliate-labels.mjs — GA4 のアフィリエイトのラベル（data-cta-label）→ 案件 id の対応。唯一の実装。
 *
 * 対応の正本は data/affiliate/catalog.json の各案件の ctaLabels。以前は report-buildjob-affiliate.mjs に
 * 写し（PROGRAM_BY_LABEL）を直書きしていて、ラベルを足すたびに 2 か所を直す必要があった（2026-10-07 に集約）。
 * ラベルは面ごとの trackLabel（BuildJob-endbanner 等）と、本文カードの service 名（ビルドジョブ等）の 2 系統。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';

/** catalog の値（programs）からラベル → 案件 id の Map を作る。同じラベルが 2 案件にあれば投げる（型も止める） */
export function labelProgramMap(catalog) {
  const map = new Map();
  for (const [id, p] of Object.entries(catalog?.programs ?? {})) {
    for (const label of p.ctaLabels ?? []) {
      if (map.has(label) && map.get(label) !== id) throw new Error(`ラベル ${label} が ${map.get(label)} と ${id} の両方にある`);
      map.set(label, id);
    }
  }
  return map;
}

/** リポジトリの catalog を読んでラベル → 案件 id の Map を返す */
export function readLabelProgramMap(root) {
  return labelProgramMap(JSON.parse(readFileSync(join(root, datasetPath('affiliate.catalog')), 'utf8')));
}
