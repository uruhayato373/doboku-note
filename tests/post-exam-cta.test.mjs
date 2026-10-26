// 技術士一次・コンクリート主任技士の CTA が、本試験日（config/exam-calendar.json）で切り替わることを固定する。
//   - 試験の前日・当日までは直前向けの商品、翌日からは来年にも使える商品（合格発表後も同じ）
//   - ココナラ添削の「受付の締め」は試験日の 4 日前。締めの日が過ぎたら文言を出さない
// 実 resolvePlacement を esbuild でトランスパイルして呼ぶ（cce-placement.test.mjs と同じ方式）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

async function loadPlacement() {
  const ts = readFileSync(join(ROOT, 'src/lib/magazine-placement.ts'), 'utf8');
  const js = buildSync({
    stdin: { contents: ts, loader: 'ts', resolveDir: join(ROOT, 'src/lib') },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  return import('data:text/javascript,' + encodeURIComponent(js));
}

const calendar = JSON.parse(readFileSync(join(ROOT, 'config/exam-calendar.json'), 'utf8'));
const cceExam = calendar.exams['concrete-chief-engineer'].events.exam.date;
const cceResult = calendar.exams['concrete-chief-engineer'].events.result.date;
const pe1Exam = calendar.exams['pe-first-stage'].events.exam.date;

const jst = (date, clock) => Date.parse(`${date}T${clock}+09:00`);
const shiftDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

function topIdAt(resolvePlacement, slug, group, nowMs) {
  const orig = Date.now;
  Date.now = () => nowMs;
  try {
    return resolvePlacement(slug, group).top?.magazineId;
  } finally {
    Date.now = orig;
  }
}

// [前日, 当日の終わり直前, 翌日の始め, 合格発表の日]
const cceTimes = [jst(shiftDays(cceExam, -1), '12:00:00'), jst(cceExam, '23:59:00'), jst(shiftDays(cceExam, 1), '00:00:00'), jst(cceResult, '12:00:00')];
const pe1Times = [jst(shiftDays(pe1Exam, -1), '12:00:00'), jst(pe1Exam, '23:59:00'), jst(shiftDays(pe1Exam, 1), '00:00:00'), jst(shiftDays(pe1Exam, 90), '12:00:00')];

test('主任技士 概要・傾向: 試験日まで択一 直前パック、翌日から小論文 令和形式（合格発表後も同じ）', async () => {
  const { resolvePlacement } = await loadPlacement();
  const expected = ['cce-takuitsu-chokuzen-pack', 'cce-takuitsu-chokuzen-pack', 'cce-essay-reiwa-pack', 'cce-essay-reiwa-pack'];
  for (const slug of ['concrete-chief-engineer-guide-overview', 'concrete-chief-engineer-guide-trends']) {
    assert.deepEqual(cceTimes.map((t) => topIdAt(resolvePlacement, slug, 'guide', t)), expected, slug);
  }
});

test('主任技士 分野別の過去問・テキスト: 試験日まで予想50問・暗記ノート、翌日から配合計算12問', async () => {
  const { resolvePlacement } = await loadPlacement();
  const primary = cceTimes.map((t) => topIdAt(resolvePlacement, 'concrete-chief-engineer-primary-durability', 'primary', t));
  assert.deepEqual(primary, ['cce-r8-mc-50', 'cce-r8-mc-50', 'cce-mix-calculation-practice', 'cce-mix-calculation-practice']);
  const textbook = cceTimes.map((t) => topIdAt(resolvePlacement, 'concrete-chief-engineer-textbook-materials', 'textbook', t));
  assert.deepEqual(textbook, ['cce-anki-note', 'cce-anki-note', 'cce-mix-calculation-practice', 'cce-mix-calculation-practice']);
});

test('主任技士 配合設計・小論文ガイドは試験日で変わらない', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const t of cceTimes) {
    assert.equal(topIdAt(resolvePlacement, 'concrete-chief-engineer-primary-mix-design', 'primary', t), 'cce-mix-calculation-practice');
    assert.equal(topIdAt(resolvePlacement, 'concrete-chief-engineer-guide-essay', 'guide', t), 'cce-essay-mokuji');
  }
});

test('技術士一次 概要・学習計画・解答速報: 試験日まで直前パック、翌日から過去問 PDF', async () => {
  const { resolvePlacement } = await loadPlacement();
  const expected = ['pe1-chokuzen-pack', 'pe1-chokuzen-pack', 'pe1-takuitsu-pdf', 'pe1-takuitsu-pdf'];
  for (const name of ['guide-overview', 'guide-study-plan', 'guide-r08-answers']) {
    assert.deepEqual(pe1Times.map((t) => topIdAt(resolvePlacement, `pe-first-stage-${name}`, 'guide', t)), expected, name);
  }
});

test('/links の技術士一次カード: 試験日まで直前パック、翌日から過去問 PDF（どちらも短い名前を持つ）', async () => {
  const { pe1LeadMagazineId } = await loadPlacement();
  assert.deepEqual(pe1Times.map((t) => pe1LeadMagazineId(t)), ['pe1-chokuzen-pack', 'pe1-chokuzen-pack', 'pe1-takuitsu-pdf', 'pe1-takuitsu-pdf']);
  const page = readFileSync(join(ROOT, 'src/app/links/page.tsx'), 'utf8');
  assert.match(page, /getMagazine\(pe1LeadMagazineId\(\)\)/);
  assert.doesNotMatch(page, /getMagazine\("pe1-chokuzen-pack"\)/);
  const products = JSON.parse(readFileSync(join(ROOT, 'config/products.json'), 'utf8')).products;
  for (const id of ['pe1-chokuzen-pack', 'pe1-takuitsu-pdf']) {
    assert.ok(products.find((p) => p.id === id)?.catalog?.shortTitle, `${id} の shortTitle`);
  }
});

test('技術士一次 合格後ページは試験の前後どちらも二次（建設部門）の入口、過去問は過去問 PDF のまま', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const t of pe1Times) {
    assert.equal(topIdAt(resolvePlacement, 'pe-first-stage-guide-after-pass', 'guide', t), 'pe-construction-required-magazine');
    assert.equal(topIdAt(resolvePlacement, 'pe-first-stage-r07-basic', 'primary', t), 'pe1-takuitsu-pdf');
  }
});

test('解答速報の末尾の本文カードは二次の入口（試験の前後で変わらない固定）', () => {
  const body = readFileSync(join(ROOT, 'content/site/pe-first-stage/guide-r08-answers/article.mdx'), 'utf8');
  assert.match(body, /<MagazineCard id="pe-construction-required-magazine" utmContent="guide-r08-answers" \/>/);
  assert.doesNotMatch(body, /pe1-chokuzen-pack/);
});

test('isAfterExamDay: 試験日の終わり（JST）を過ぎた瞬間から true', async () => {
  const dates = await loadTsModule('src/lib/exam-dates.ts');
  assert.equal(dates.isAfterExamDay('pe-first-stage', 'exam', jst(pe1Exam, '23:59:59')), false);
  assert.equal(dates.isAfterExamDay('pe-first-stage', 'exam', jst(shiftDays(pe1Exam, 1), '00:00:00')), true);
});

test('添削の受付の締め: 試験日の 4 日前（11/29 なら 11/25 水）まで。過ぎたら出さない', async () => {
  const dates = await loadTsModule('src/lib/exam-dates.ts');
  const close = shiftDays(cceExam, -4);
  const [, cm, cd] = close.split('-').map(Number);
  const [, em, ed] = cceExam.split('-').map(Number);
  const weekday = '日月火水木金土'[new Date(`${close}T00:00:00Z`).getUTCDay()];
  const catchText = (now) => dates.withTensakuDeadline('concrete-chief-engineer', 'exam', '本文。', now);
  const withDeadline = `本文。${cm}/${cd}（${weekday}）までの受付なら、${em}/${ed}の本試験に間に合います。`;
  assert.equal(catchText(jst(shiftDays(close, -10), '12:00:00')), withDeadline);
  assert.equal(catchText(jst(close, '23:59:00')), withDeadline);
  assert.equal(catchText(jst(shiftDays(close, 1), '00:00:00')), '本文。');
  assert.equal(catchText(jst(cceExam, '12:00:00')), '本文。');
  assert.equal(catchText(jst(shiftDays(cceExam, 1), '00:00:00')), '本文。');
  assert.equal(catchText(jst(cceResult, '12:00:00')), '本文。');
  // 2026 年度の本試験 11/29 なら 11/25（水）
  if (cceExam === '2026-11-29') assert.match(withDeadline, /11\/25（水）/);
});

test('offsite-cta: 主任技士の添削の文言に、締めの日の前だけ最終受付日が入る', () => {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  const catchAt = (nowMs) => execFileSync(process.execPath, [cli, '-e', `
    Date.now = () => ${nowMs};
    import('./src/lib/offsite-cta.ts').then((m) => {
      const out = ['concrete-chief-engineer', 'concrete-chief-engineer-guide-essay', 'concrete-chief-engineer-guide-trends']
        .map((slug) => m.resolveOffsiteCta(slug).map((i) => i.catch));
      process.stdout.write(JSON.stringify(out));
    });
  `], { cwd: ROOT, encoding: 'utf8' });
  const before = JSON.parse(catchAt(jst(shiftDays(cceExam, -10), '12:00:00')));
  const after = JSON.parse(catchAt(jst(shiftDays(cceExam, 1), '00:00:00')));
  for (const items of before) {
    assert.equal(items.length, 1);
    assert.match(items[0], /までの受付なら、\d+\/\d+の本試験に間に合います。$/);
  }
  for (const items of after) {
    assert.equal(items.length, 1);
    assert.doesNotMatch(items[0], /受付/);
  }
});
