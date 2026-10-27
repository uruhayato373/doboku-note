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

test('ExamKey → ココナラの examScope は、資格 id → ExamKey の正本から作った値が従来の対応表と同じ（選ばれる商品の範囲で確かめる）', async () => {
  const { pickCoconalaFor } = await loadTsModule('src/lib/exam-key-bridge.ts');
  const expected = {
    tankan: 'pe-comprehensive-management', 'pe-construction': 'pe-construction', 'pe-first-stage': 'pe-first-stage',
    'civil-1': 'civil-1', 'civil-2': 'civil-2', concrete: 'concrete-engineer', 'concrete-chief': 'concrete-chief-engineer',
    'concrete-diagnosis': 'concrete-diagnostician', rccm: 'rccm', 'pe-general': null,
  };
  const products = readJson(datasetPath('config.products')).products.filter((p) => p.channel === 'coconala' && p.catalog?.status === 'listed');
  let picked = 0;
  for (const [key, scope] of Object.entries(expected)) {
    const service = pickCoconalaFor(key);
    const available = scope && products.some((p) => p.catalog.examScope?.includes(scope));
    if (!available) { assert.equal(service, null, `${key}: 対象の出品が無いのに選ばれた`); continue; }
    assert.ok(service?.examScope.includes(scope), `${key}: ${scope} の出品が選ばれない`);
    picked += 1;
  }
  assert.ok(picked >= 1, `出品を選べた資格が無い（${picked}）。対応表か出品の読み方が壊れている`);
});

test('1級・2級土木の判定は registry の groups.civil-construction-1-2 のメンバーと同じ', async () => {
  const { isCivilConstructionCategory } = await loadTsModule('src/lib/qualification-names.ts');
  const registry = readJson(datasetPath('config.qualification-registry'));
  const members = registry.groups['civil-construction-1-2'].members;
  assert.deepEqual(members, ['civil-construction-1', 'civil-construction-2']);
  for (const id of members) assert.equal(isCivilConstructionCategory(id), true, id);
  for (const id of ['pe-construction', 'civil-practice', '', null, undefined]) assert.equal(isCivilConstructionCategory(id), false, String(id));
});

test('キャリア記事の軽い URL 変換（careerArticlePath）は、サイトの正本 getPublicDocPath と同じパスを返す', async () => {
  const { careerArticlePath, CAREER_HUB_SLUG, CAREER_NEEDS } = await loadTsModule('src/config/career-pathways.ts');
  const { getPublicDocPath } = await loadTsModule('src/lib/content-routes.ts');
  const slugs = new Set([CAREER_HUB_SLUG]);
  const collect = (v) => {
    if (typeof v === 'string' && /^civil-construction-[12]-guide-/.test(v)) slugs.add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(CAREER_NEEDS);
  assert.ok(slugs.size >= 5, `キャリア記事の slug を拾えていない（${slugs.size}）`);
  for (const slug of slugs) assert.equal(careerArticlePath(slug), getPublicDocPath(slug), slug);
});
