/**
 * キャリア悩み分類（career-pathways.ts）と、それを使う CTA / 計測配線を固定する。
 *
 * 守りたい事故:
 *   - 未分類 slug が汎用 affiliate へ落ちる（文脈の合わない広告が出る）
 *   - need（8 値）と pillar（5 値）の 2 つの分類が無言でずれる
 *   - 面談型と登録型のサービスで同じ「相談」コピーを使い回す
 *   - 禁止する短絡表現（「今すぐ登録」「必ず年収」等）が CTA に混ざる
 *   - career_need_select の配線が片方だけ入る（送っているのに取得していない／その逆）
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './lib/load-ts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const pathways = await loadTsModule('src/config/career-pathways.ts');
const { CAREER_NEEDS, CAREER_HUB_ENTRIES, CAREER_HUB_SLUG, resolveCareerNeed, resolveCareerNextSteps } = pathways;
// 禁止表現は TS からではなく機械可読 config を真実源にする（テストだけが読む export を作らない）。
const FORBIDDEN_CTA_PHRASES = JSON.parse(read('.claude/config/career-funnel.json')).forbiddenCtaPhrases;

const NEEDS = Object.keys(CAREER_NEEDS);

test('need は 8 値そろっており、定義が欠けていない', () => {
  assert.equal(NEEDS.length, 8, `need が ${NEEDS.length} 個（8 のはず）`);
  for (const [need, def] of Object.entries(CAREER_NEEDS)) {
    assert.ok(def.pillarSlug, `${need} に pillarSlug が無い`);
    assert.ok(def.nextStepTitle && def.nextStepReason, `${need} に次行動の文言が無い`);
    assert.ok(def.affiliateCta.consultation, `${need} に面談型 CTA が無い`);
    assert.ok(def.affiliateCta.registration, `${need} に登録型 CTA が無い`);
  }
});

test('面談型と登録型で CTA を使い回さない', () => {
  for (const [need, def] of Object.entries(CAREER_NEEDS)) {
    assert.notEqual(
      def.affiliateCta.consultation,
      def.affiliateCta.registration,
      `${need} が面談型と登録型で同じコピーを使っている`,
    );
  }
});

test('禁止する短絡表現の一覧が config に実在する（検査ゼロを PASS と呼ばない）', () => {
  assert.ok(Array.isArray(FORBIDDEN_CTA_PHRASES) && FORBIDDEN_CTA_PHRASES.length >= 8,
    `禁止表現が ${FORBIDDEN_CTA_PHRASES?.length} 件しか無い（config の破損を疑う）`);
});

test('CTA に禁止する短絡表現が入っていない', () => {
  const all = Object.values(CAREER_NEEDS).flatMap((d) => [
    d.affiliateCta.consultation,
    d.affiliateCta.registration,
    d.nextStepTitle,
    d.nextStepReason,
  ]);
  assert.ok(all.length >= 32, `検査対象が ${all.length} 件しかない（8 need × 4 のはず）`);
  for (const copy of all) {
    for (const ng of FORBIDDEN_CTA_PHRASES) {
      assert.ok(!copy.includes(ng), `禁止表現「${ng}」が CTA に含まれる: ${copy}`);
    }
  }
});

test('未分類 slug は null（既定 affiliate へ落とさない）', () => {
  assert.equal(resolveCareerNeed('civil-construction-1-guide-strategy'), null);
  assert.equal(resolveCareerNeed('pe-comprehensive-management-r08-primary'), null);
  assert.equal(resolveCareerNeed(undefined), null);
});

test('代表 slug が意図した need に落ちる', () => {
  assert.equal(resolveCareerNeed('civil-construction-1-guide-quit-or-stay'), 'quit-or-stay');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-allowance'), 'pay');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-white-company'), 'workstyle');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-market-value'), 'market-value');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-hatchu-shien'), 'career-path');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-resume'), 'application');
  assert.equal(resolveCareerNeed('civil-construction-1-guide-career-agents'), 'service-choice');
});

test('need → pillar が career-funnel.json の柱分類と矛盾しない', () => {
  // 2 つの分類（need 8 値 / pillar 5 値）を別ファイルに持つ以上、ずれを機械で止める。
  const cfg = JSON.parse(read('.claude/config/career-funnel.json'));
  const classify = (slug) => {
    for (const rule of cfg.pillarRules) {
      if (rule.slugPatterns.some((p) => slug.includes(p))) return rule.pillar;
    }
    return 'unclassified';
  };
  const index = JSON.parse(read('src/config/doc-meta-index.json'));
  const careerSlugs = Object.entries(index.docs)
    .filter(([, m]) => (m.tags ?? []).includes('career'))
    .map(([s]) => s);
  assert.ok(careerSlugs.length >= 30, `career 記事が ${careerSlugs.length} 本しか取れていない`);

  let checked = 0;
  for (const slug of careerSlugs) {
    const need = resolveCareerNeed(slug);
    assert.ok(need, `${slug} の need が解決できない（career 記事は全て need を持つ）`);
    checked += 1;
    // need が指す柱は、その柱自身の pillar 分類と一致していなければならない。
    const pillarOfTarget = classify(CAREER_NEEDS[need].pillarSlug);
    assert.notEqual(pillarOfTarget, 'unclassified', `${need} の柱 ${CAREER_NEEDS[need].pillarSlug} が未分類`);
  }
  assert.equal(checked, careerSlugs.length);
});

test('記事末の内部次行動は自分自身を指さない', () => {
  for (const slug of [CAREER_HUB_SLUG, 'civil-construction-1-guide-quit-or-stay', 'civil-construction-1-guide-resume']) {
    const steps = resolveCareerNextSteps(slug);
    assert.ok(steps.length > 0, `${slug} の次行動が 0 件`);
    for (const s of steps) {
      assert.notEqual(s.href, `/docs/${slug}`, `${slug} が自分自身へ戻るリンクを出している`);
    }
  }
});

test('hub の入口はすべて実在の記事を指す', () => {
  const index = JSON.parse(read('src/config/doc-meta-index.json'));
  assert.ok(CAREER_HUB_ENTRIES.length >= 5, `hub の入口が ${CAREER_HUB_ENTRIES.length} 件しかない`);
  for (const e of CAREER_HUB_ENTRIES) {
    const slug = e.href.replace('/docs/', '');
    assert.ok(index.docs[slug], `hub の入口 ${slug} が実在しない`);
    assert.ok(CAREER_NEEDS[e.need], `hub の入口が未知の need ${e.need} を持つ`);
  }
});

test('career_need_select は送信側と取得側の両方に配線されている', () => {
  // 片方だけ入れると「送っているのに集計されない／集計しようとして 0 件」になる。
  const provider = read('src/components/providers/AnalyticsProvider.tsx');
  assert.ok(provider.includes('"career-need": "career_need_select"'), 'AnalyticsProvider が career_need_select を送っていない');

  const fetcher = read('.claude/scripts/fetch-ga4-cta-clicks.mjs');
  assert.ok(fetcher.includes('"career_need_select"'), 'fetch-ga4-cta-clicks が career_need_select を取得していない');

  const picker = read('src/components/ui/CareerNeedPicker/CareerNeedPicker.tsx');
  assert.ok(picker.includes('data-cta="career-need"'), 'CareerNeedPicker が data-cta を出していない');
  assert.ok(picker.includes('data-cta-placement="career-hub"'), 'CareerNeedPicker が placement を出していない');
});

test('MDX コンポーネントは本体・loader 登録・使用の 3 点がそろう', () => {
  // 登録漏れは本番 build でだけ落ちる（dev では気づけない）。
  const loader = read('src/lib/component-loader/index.ts');
  assert.ok(loader.includes('CareerNeedPicker:'), 'component-loader に CareerNeedPicker が無い');
  const hub = read('content/site/civil-construction-1/guide-career/article.mdx');
  assert.ok(hub.includes('<CareerNeedPicker />'), 'hub が CareerNeedPicker を使っていない');
});

test('キャリア記事の記事末 affiliate が内部次行動へ置き換わっている', () => {
  const footer = read('src/components/ui/ArticleFooter/ArticleFooter.tsx');
  assert.ok(footer.includes('const isCareer = isCareerDoc(meta)'), 'ArticleFooter が career を判定していない');
  assert.ok(
    /!isCareer && category && endBannerCategories\.has\(category\)/.test(footer),
    '記事末バナーが career 記事を除外していない',
  );
  assert.ok(footer.includes('<CareerNextStepNav'), 'career 記事の記事末に内部次行動が無い');
});
