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

test('サイトの資格色（globals.css の --exam-*）と note 表紙の色（note-cover-tokens.json の base）は、文書にした差を除いて同じ', () => {
  const css = readFileSync('src/styles/globals.css', 'utf8');
  // ライト（最初の定義）だけを比べる。ダークの上書きは後ろに出る
  const site = {};
  for (const m of css.matchAll(/--exam-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) site[m[1]] ??= m[2].toLowerCase();
  const tokens = readJson('.claude/knowledge/design-system/note-cover-tokens.json').exams;
  // サイトの変数名 → 表紙のキー（総監と一次は同じ --exam-pe を使う）
  const pairs = { 'civil-1': 'civil-1', 'civil-2': 'civil-2', pe: 'pe-comprehensive', 'pe-construction': 'pe-construction', concrete: 'concrete-engineer', 'concrete-chief': 'concrete-chief', 'concrete-diagnosis': 'concrete-diagnosis', rccm: 'rccm', surveyor: 'surveyor', pavement: 'pavement' };
  // 意図した差（.claude/knowledge/reference/brand-image-system.md の表に理由を書いたものだけ）
  const documented = new Set(['concrete', 'concrete-chief']);
  assert.ok(Object.keys(site).length >= 8, '--exam-* を読めていない');
  for (const [cssKey, tokenKey] of Object.entries(pairs)) {
    assert.ok(site[cssKey] && tokens[tokenKey], `${cssKey} / ${tokenKey} が見つからない`);
    if (documented.has(cssKey)) continue;
    assert.equal(site[cssKey], tokens[tokenKey].base.toLowerCase(), `${cssKey}: サイト ${site[cssKey]} と表紙 ${tokens[tokenKey].base} が違う（意図した差なら brand-image-system.md に理由を書いて documented に足す）`);
  }
});

test('ツールのページは自分の題・説明をツール一覧（src/lib/tools.ts）から引き、同じ文字列を書き写さない', () => {
  const src = readFileSync('src/lib/tools.ts', 'utf8');
  const tools = [...src.matchAll(/href: "([^"]+)",\s*title: "([^"]+)"/g)].map((m) => ({ href: m[1], title: m[2] }));
  assert.ok(tools.length >= 10, `ツール一覧を読めていない（${tools.length}）`);
  for (const { href, title } of tools) {
    const page = readFileSync(`src/app${href}/page.tsx`, 'utf8');
    assert.ok(!page.includes(`"${title}"`) && !page.includes(`'${title}'`), `${href}: 題「${title}」を書き写している（toolByHref で引く）`);
  }
});

// ---- SNS・表紙のスクリプトが持つ資格キーの表（値を変えると公開記録の ID が動くので、表は残し正本との一致だけを縛る） ----
const objectLiteral = (file, name) => {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf(`${name} = {`);
  assert.ok(start >= 0, `${file}: ${name} が見つからない`);
  const body = src.slice(start, src.indexOf('};', start));
  return Object.fromEntries([...body.matchAll(/['"]?([a-z0-9+-]+)['"]?\s*:\s*['"]([a-z0-9-]+)['"]/g)].map((m) => [m[1], m[2]]));
};

test('SNS・動画・図解の資格キーの表は、資格の registry と表紙の色の定義（note-cover-tokens の qualification）に食い違わない', async () => {
  const { isQualificationRef } = await import('../scripts/lib/qualification-names.mjs');
  const registry = readJson(datasetPath('config.qualification-registry'));
  const tokens = readJson('.claude/knowledge/design-system/note-cover-tokens.json').exams;
  const tables = {
    'X の EXAM_ALIAS': objectLiteral('scripts/lib/registry-x-state.mjs', 'EXAM_ALIAS'),
    'Instagram の EXAM_OF_DIR': objectLiteral('scripts/lib/registry-ig-state.mjs', 'EXAM_OF_DIR'),
    '図解パックの FIGURE_PACK_CATEGORIES': objectLiteral('.claude/scripts/sns/lib/figure-pack-labels.mjs', 'FIGURE_PACK_CATEGORIES'),
  };
  for (const [name, table] of Object.entries(tables)) {
    assert.ok(Object.keys(table).length >= 4, `${name} を読めていない`);
    for (const [key, qualification] of Object.entries(table)) {
      assert.ok(isQualificationRef(registry, qualification), `${name}: ${key} → ${qualification} は registry に無い`);
      if (tokens[key]?.qualification) assert.equal(qualification, tokens[key].qualification, `${name}: ${key} が表紙の色の定義（${tokens[key].qualification}）と違う`);
    }
  }
  // 動画パックは向きが逆（資格 id → 色のキー）
  const palette = objectLiteral('scripts/lib/longform-render.mjs', 'EXAM_TO_PALETTE');
  for (const [qualification, key] of Object.entries(palette)) {
    assert.ok(isQualificationRef(registry, qualification), `EXAM_TO_PALETTE: ${qualification} は registry に無い`);
    assert.equal(tokens[key]?.qualification, qualification, `EXAM_TO_PALETTE: ${qualification} → ${key} が表紙の色の定義と違う`);
  }
});

test('マガジン表紙の資格ラベル（generate-magazine-covers の category）は registry の名前か、理由を書いた書き分け', async () => {
  const { qualificationLabel, qualificationShortLabel, qualificationBadgeLabel } = await import('../scripts/lib/qualification-names.mjs');
  const registry = readJson(datasetPath('config.qualification-registry'));
  const tokens = readJson('.claude/knowledge/design-system/note-cover-tokens.json').exams;
  // 意図した書き分け: 建設部門の二次試験の教材だと分かるように「第二次」を付ける
  const VARIANTS = { 'pe-construction': ['技術士（建設部門・第二次）'] };
  const src = readFileSync('scripts/generate-magazine-covers.mjs', 'utf8');
  const entries = [...src.matchAll(/magazineDir: '([^']+)'[\s\S]*?category: '([^']+)'/g)].map((m) => ({ dir: m[1], category: m[2] }));
  assert.ok(entries.length >= 50, `表紙の定義を読めていない（${entries.length}）`);
  for (const { dir, category } of entries) {
    // 置き場のフォルダのうち一番深い資格のフォルダで決める（1級・2級土木/1級土木/… は 1級土木）
    const segments = dir.split('/').reverse();
    const key = segments.map((seg) => Object.keys(tokens).find((k) => tokens[k].dir === seg)).find(Boolean);
    assert.ok(key && tokens[key].qualification, `${dir}: 資格を引けない`);
    const q = tokens[key].qualification;
    const allowed = new Set([qualificationLabel(registry, q), qualificationShortLabel(registry, q), qualificationBadgeLabel(registry, q), ...(VARIANTS[q] ?? [])]);
    assert.ok(allowed.has(category), `${dir}: 「${category}」は ${q} の名前（${[...allowed].join('・')}）と違う`);
  }
});
