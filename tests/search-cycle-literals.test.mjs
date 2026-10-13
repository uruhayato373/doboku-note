/**
 * search-cycle-literals.test.mjs — 検索改善のサイクルが使う値を、正本以外に書き写していないか（直書きのラチェット）
 * ---------------------------------------------------------------------------
 * 正本: 順位の帯・計測の型・週の起票数＝config/search-strategy.json（search-opportunities.mjs の bandLabels・inTop・inStriking）、
 *       旧 URL の判定＝scripts/lib/legacy-routes.mjs の isLegacyPath / LEGACY_PREFIX、
 *       本番デプロイのワークフロー＝scripts/lib/production-deploys.mjs の DEPLOY_WORKFLOW / DEPLOY_BRANCH。
 * 2026-10-13: 「1 桁」の判定が `<= 10`、改善候補が `>= 10.5` と別々に書かれ、10.0〜10.5 位の検索語がどちらにも数えられていなかった
 * （資格名クラスターで 2 語）。画面・CLI・週次の下書きにも「11〜30位」「上位 3 件」が書き写されていた。
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const rel = (abs) => relative(ROOT, abs).split(sep).join('/');
/** コメントを除いたコード（説明文に数字が出るのは構わない） */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/** 検索改善のサイクルを扱うコード（帯・計測の型・週の起票数を設定から引くべき場所） */
const SEARCH_FILES = [
  'scripts/lib/search-opportunities.mjs',
  'scripts/lib/search-improvement.mjs',
  'scripts/search-improvement.mjs',
  'scripts/report-search-opportunities.mjs',
  'scripts/check-search-improvements.mjs',
  'scripts/build-weekly-review-draft.mjs',
  'tools/admin-app/src/app/metrics/search-strategy/page.tsx',
  'tools/admin-app/src/lib/kpi-tree.ts',
  'tools/admin-app/src/app/page.tsx',
];

test('順位の帯・計測の型・週の起票数を、検索改善のコードに数字で書き写さない', () => {
  const { striking, cycle } = readDataset(ROOT, 'config.search-strategy');
  const from = Math.ceil(striking.minPosition);
  const banned = [
    [String(striking.minPosition), '帯の境目（striking.minPosition）'],
    [`${from}〜${striking.maxPosition}`, '改善候補の帯の表示名（bandLabels）'],
    ['1桁', '上位の帯の表示名（bandLabels）'],
    [`<= ${from - 1}`, '上位の帯の判定（inTop）'],
  ];
  const measureKeys = Object.keys(cycle.measure).filter((k) => typeof cycle.measure[k] === 'number');
  const hits = [];
  for (const f of SEARCH_FILES) {
    const c = code(read(f));
    for (const [lit, what] of banned) if (c.includes(lit)) hits.push(`${f}: 「${lit}」— ${what}を使う`);
    for (const k of measureKeys) if (new RegExp(`\\b${k}:\\s*\\d`).test(c)) hits.push(`${f}: ${k} を数字で書いている — config の cycle.measure を使う`);
    if (/上位\s*\d+\s*件/.test(c)) hits.push(`${f}: 「上位 N 件」— config の cycle.filePerWeek を使う`);
  }
  assert.deepEqual(hits, []);
});

test('旧 URL（/docs/）の判定は legacy-routes.mjs の isLegacyPath だけ', () => {
  const files = listFiles(join(ROOT, 'scripts'), { ext: ['.mjs', '.ts'] }).map(rel).filter((f) => !f.endsWith('/legacy-routes.mjs'));
  const hits = files.filter((f) => /startsWith\(\s*['"`]\/docs\//.test(code(read(f))));
  assert.deepEqual(hits, [], 'startsWith("/docs/") でなく isLegacyPath(path) を使う');
});

test('本番デプロイのワークフローは production-deploys.mjs の DEPLOY_WORKFLOW だけ', () => {
  const files = listFiles(join(ROOT, 'scripts'), { ext: ['.mjs', '.ts'] }).map(rel).filter((f) => !f.endsWith('/production-deploys.mjs'));
  const hits = files.filter((f) => /workflows\/cloudflare-deploy\.yml/.test(code(read(f))));
  assert.deepEqual(hits, [], 'API のパス・ワークフローのパスは DEPLOY_WORKFLOW / DEPLOY_WORKFLOW_PATH から作る');
});
