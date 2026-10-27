// 台帳とコードのあいだの配線（ID 参照）を、実データで縛る。参照先が無いと本番のビルドや計測で初めて分かるものを、ここで先に止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './lib/load-ts.mjs';
import { datasetPath } from '../scripts/lib/datasets.mjs';
import { AFFILIATE_EXPERIMENT_ID } from '../src/lib/affiliate-experiment.mjs';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const NOW = Date.now();
const isOpen = (r) => !r.period?.until || Date.parse(r.period.until) > NOW;

test('開いている配置ルールの案件は、広告素材（PROGRAM_ASSETS）を持つ（無いと affiliate-placement.ts が描画時に throw する）', async () => {
  const { PROGRAM_ASSETS } = await loadTsModule('src/config/affiliate-creatives.ts');
  const { rules } = readJson(datasetPath('config.affiliate-placements'));
  const open = rules.filter(isOpen);
  assert.ok(open.length > 0, '開いているルールを 1 件も読めていない');
  const missing = [...new Set(open.map((r) => r.program))].filter((p) => !PROGRAM_ASSETS[p]);
  assert.deepEqual(missing, [], `広告素材の無い案件: ${missing.join(', ')}`);
});

test('コードが配信している転職アフィリの意匠実験は、実験台帳にあって running', () => {
  const experiments = readJson(datasetPath('business.experiments'));
  const list = Array.isArray(experiments) ? experiments : experiments.experiments;
  const e = list.find((x) => x.id === AFFILIATE_EXPERIMENT_ID);
  assert.ok(e, `${AFFILIATE_EXPERIMENT_ID} が実験台帳に無い`);
  assert.equal(e.status, 'running', `${AFFILIATE_EXPERIMENT_ID} は ${e.status}。閉じたなら配信のコードも止める`);
});
