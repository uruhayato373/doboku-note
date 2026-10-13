// tests/seo-build-summary.test.mjs
//
// DN-0676: check-seo-build の warn が CI ログにしか残らず誰も読んでいなかった。
// 日ごとの履歴（台帳 analysis.seo-build-summary）へ足す処理・型・週次レビューの下書きの節（件数と前週比）を固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { entryFromRun, recordEntry, latestAndWeekAgo, renderSeoBuildSection, MAX_HISTORY } from '../scripts/lib/seo-build-summary.mjs';
import { resolveDataset } from '../scripts/lib/datasets.mjs';
import { schemaOf } from '../scripts/lib/dataset-validate.mjs';

const run = (over = {}) => ({
  generatedAt: '2026-10-12T09:00:00.000Z',
  sitemapUrls: 1658,
  checked: 1658,
  errors: 0,
  warnings: 1390,
  errorsByCode: {},
  warningsByCode: { ssr_thin_body: 1, jsonld_recommended_missing: 1389 },
  ...over,
});
const entry = (date, over) => entryFromRun(run(over), date);

test('同じ日付は置き換え、件数が同じなら書かない（時刻だけ違うコミットを作らない）', () => {
  const first = recordEntry([], entry('2026-10-12'));
  assert.equal(first.changed, true);
  const again = recordEntry(first.history, entryFromRun(run({ generatedAt: '2026-10-12T20:00:00.000Z' }), '2026-10-12'));
  assert.equal(again.changed, false);
  const fewer = recordEntry(first.history, entry('2026-10-12', { warnings: 1389, warningsByCode: { jsonld_recommended_missing: 1389 } }));
  assert.equal(fewer.changed, true);
  assert.equal(fewer.history.length, 1);
  assert.equal(fewer.history[0].warnings, 1389);
});

test('履歴は日付の昇順で、上限を超えたら古い日から落とす', () => {
  let history = [];
  history = recordEntry(history, entry('2026-10-10')).history;
  history = recordEntry(history, entry('2026-10-08', { checked: 1600 })).history;
  assert.deepEqual(history.map((h) => h.date), ['2026-10-08', '2026-10-10']);
  const capped = recordEntry(history, entry('2026-10-11', { checked: 1601 }), 2).history;
  assert.deepEqual(capped.map((h) => h.date), ['2026-10-10', '2026-10-11']);
  assert.ok(MAX_HISTORY >= 365);
});

test('前週 = 最新の 7 日前以前で最も新しい行。7 日に満たなければ null', () => {
  const h = [entry('2026-10-01'), entry('2026-10-04'), entry('2026-10-10'), entry('2026-10-11')];
  assert.equal(latestAndWeekAgo(h).previous.date, '2026-10-04');
  assert.equal(latestAndWeekAgo([entry('2026-10-10'), entry('2026-10-11')]).previous, null);
  assert.equal(latestAndWeekAgo([]), null);
});

test('週次の節に warn・error の件数と前週比、型別の前週比が出る', () => {
  const history = [
    entry('2026-10-05', { warnings: 1380, warningsByCode: { ssr_thin_body: 1, jsonld_recommended_missing: 1379 } }),
    entry('2026-10-12'),
  ];
  const text = renderSeoBuildSection(history, '2026-10-12').join('\n');
  assert.match(text, /最新の記録: 2026-10-12/);
  assert.match(text, /error 0（前週比 ±0）\/ warn 1390（前週比 \+10）/);
  assert.match(text, /\| jsonld_recommended_missing \| warn \| 1389 \| \+10 \|/);
  assert.match(text, /\| ssr_thin_body \| warn \| 1 \| ±0 \|/);
  assert.match(text, /前週の記録: 2026-10-05/);
});

test('履歴が無いときは「未取得」と書き、0 件と読ませない／古いときは日数を警告する', () => {
  assert.match(renderSeoBuildSection(null, '2026-10-12').join('\n'), /未取得/);
  assert.match(renderSeoBuildSection([], '2026-10-12').join('\n'), /未取得/);
  assert.match(renderSeoBuildSection([entry('2026-10-01')], '2026-10-12').join('\n'), /11 日前/);
  assert.match(renderSeoBuildSection([entry('2026-10-12')], '2026-10-12').join('\n'), /履歴が 7 日に満たない/);
});

test('台帳に宣言され、型が履歴の不変条件（昇順・型別の合計）を見る', () => {
  const ds = resolveDataset('analysis.seo-build-summary');
  assert.ok(ds, '台帳に analysis.seo-build-summary が無い');
  assert.equal(ds.path, 'data/analysis/seo-build-summary.json');
  const schema = schemaOf(ds);
  assert.ok(schema, '型が結ばれていない');
  const ok = { schemaVersion: 1, history: [entry('2026-10-11'), entry('2026-10-12')] };
  assert.equal(schema.safeParse(ok).success, true);
  assert.equal(schema.safeParse({ ...ok, history: [entry('2026-10-12'), entry('2026-10-11')] }).success, false, '降順');
  assert.equal(schema.safeParse({ ...ok, history: [entry('2026-10-12', { warnings: 5 })] }).success, false, '型別の合計と合わない');
  assert.equal(schema.safeParse({ ...ok, history: [entry('2026-10-12'), entry('2026-10-12')] }).success, false, '日付の重複');
});

test('週次レビューの下書きがこの節を出し、CI が結果を渡して書き戻す', () => {
  const draft = readFileSync(join(REPO_ROOT, 'scripts/build-weekly-review-draft.mjs'), 'utf8');
  assert.match(draft, /renderSeoBuildSection\(/);
  assert.match(draft, /analysis\.seo-build-summary/);
  const ci = readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /check-seo-build:ci -- --summary-out/);
  assert.match(ci, /record-seo-build-summary\.mjs/);
  assert.match(ci, /ci-data\.mjs add --datasets analysis\.seo-build-summary/);
});
