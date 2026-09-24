import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDecisions, renderCard, insertCard, nextExperimentId, newExperiment, closeExperiment, buildWatch, pendingItems } from '../scripts/lib/growth-triage.mjs';
import { parseBacklog, CANONICAL_CATEGORIES } from '../scripts/lib/backlog-lib.mjs';
import { validateCards, validateStagedLines } from '../scripts/check-backlog-schema.mjs';
import { readWatchConfig, validateConfig } from '../scripts/lib/seo-rank-watch.mjs';

const seo = { id: 'OPP-aaaaaaaaaa', category: 'seo', type: 'seo-high-impr-low-ctr', title: '「過去問 解答」は平均 4 位なのに CTR 0%', key: { page: '/exam/civil-construction-1/secondary/r07', query: '過去問 解答' }, expectedWeeklyGain: { value: 3.2, unit: 'searchClicks' }, contentPath: 'content/site/civil-construction-1/secondary-r07.mdx', suggest: ['watchword', 'backlog'],
  watchwordDraft: { keyword: '1級土木 二次 解答 令和7年', targetPath: '/exam/civil-construction-1/secondary/r07', contentPath: 'content/site/civil-construction-1/secondary-r07/article.mdx', qualification: 'civil-construction-1', intent: 'exam-task', evidence: { kind: 'gsc', source: '.claude/state/metrics/growth/pack-2026-W38.json' } } };
const rev = { id: 'OPP-bbbbbbbbbb', category: 'revenue', type: 'revenue-placement-ctr', title: '配置 sidebar の CTR 0%', key: { placement: 'sidebar' }, expectedWeeklyGain: { value: 7.2, unit: 'ctaClicks' }, suggest: ['experiment', 'backlog'], watchwordDraft: null };
const exp = { id: 'OPP-cccccccccc', category: 'experiment', type: 'experiment-due', title: 'EXP-007: 期限超過', key: { experiment: 'EXP-007', reasons: 'MEASURE_DUE' }, suggest: ['verdict', 'defer'], watchwordDraft: null };
const ctx = { items: [seo, rev, exp], backlogIds: new Set(['DN-0185']), experimentIds: new Set(['EXP-007']) };
const backlogCard = { action: 'backlog', tier: 'mid', category: '収益化', kind: '改善', title: 'サイドバー CTA の見直し', doing: 'sidebar の CTA を本文中へ移す案を 1 ページで試す', done: 'sidebar の CTR が中央値の半分以上になる' };

test('validateDecisions accepts a complete, well-formed batch', () => {
  const decisions = [
    { id: rev.id, ...backlogCard },
    { id: exp.id, action: 'verdict', result: 'no-effect', learnings: '送客比較が取得欠落で不能。投稿本数は現状維持を既定にする' },
    { id: seo.id, action: 'bundle', into: rev.id },
    { id: null, ...backlogCard, title: '申し送り: index coverage の切り分け' },
  ];
  assert.deepEqual(validateDecisions(decisions, ctx), []);
});

test('validateDecisions rejects unknown ids, duplicates, vocabulary and missing fields', () => {
  const errs = validateDecisions([
    { id: 'OPP-zzzzzzzzzz', action: 'reject', reason: '理由が十分に長い説明' },
    { id: rev.id, ...backlogCard, category: '計測' },
    { id: rev.id, action: 'reject', reason: '短い' },
    { id: exp.id, action: 'verdict', result: 'maybe', learnings: 'x' },
    { id: seo.id, action: 'bundle', into: 'DN-9999' },
    { id: null, action: 'reject', reason: '申し送りを却下はできない' },
  ], ctx).join('\n');
  for (const re of [/ダイジェストに無い/, /category/, /2 回処分/, /reason/, /result/, /learnings/, /into/, /id の無い判断は backlog/]) assert.match(errs, re);
});

test('watchword decisions need a draft; the merged watch passes the rank-watch validator', () => {
  assert.match(validateDecisions([{ id: rev.id, action: 'watchword', watch: {} }], ctx).join(), /下書きが無い/);
  const watch = buildWatch(seo, {
    id: 'civil1-r07-answers-2', priority: 2, examEvent: 'second',
    audience: '1級土木の第二次検定の受験者で、年度別の解答例を探している人', need: '令和7年の設問ごとの解答の方向性と書き方を知りたい',
    rationale: '表示が多いのにクリックが少なく、解答例の検索意図に記事の冒頭が応えていない', nextStep: { label: '経験記述の書き方を確認する', path: '/exam/civil-construction-1/secondary/experience-writing-examples' },
  });
  const config = readWatchConfig(process.cwd());
  config.watchwords.push(watch);
  assert.doesNotThrow(() => validateConfig(config));
  assert.equal(watch.mode, 'improve');
  assert.equal(watch.evidence.source, seo.watchwordDraft.evidence.source);
});

test('rendered cards land in the right tier and satisfy the real backlog schema', () => {
  const original = readFileSync('.claude/todo/backlog.md', 'utf8');
  const card = renderCard({ dnId: 'DN-9990', d: { ...backlogCard, verify: 'check-backlog-schema' }, item: rev, digestFile: '.claude/state/metrics/growth/digest-2026-W38.json', today: '2026-09-26' });
  assert.match(card, /OPP-bbbbbbbbbb/);
  const next = insertCard(original, 'mid', card);
  const cards = parseBacklog(next);
  const mine = cards.find((c) => c.id === 'DN-9990');
  assert.equal(mine.tier, 'mid');
  assert.equal(mine.category, '収益化');
  assert.equal(mine.kind, '改善');
  const npmScripts = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts));
  const violations = validateCards(cards, [], { rawHeadingCount: (next.match(/^### /gm) ?? []).length, npmScripts, allowedCategories: new Set(CANONICAL_CATEGORIES) })
    .filter((v) => v.msg.includes('DN-9990') || v.rule === 'parser');
  assert.deepEqual(violations, []);
  const staged = validateStagedLines(card.split('\n'), [], cards);
  assert.deepEqual(staged.filter((v) => String(v.msg ?? '').includes('DN-9990')), []);
  assert.equal(parseBacklog(original).length + 1, cards.length, '他のカードを壊さない');
});

test('experiments: next id, proposal shape and verdict close', () => {
  const ledger = [{ id: 'EXP-011' }, { id: 'EXP-002' }];
  assert.equal(nextExperimentId(ledger), 'EXP-012');
  const e = newExperiment({ expId: 'EXP-012', d: { title: 'サイドバー CTA の文言', hypothesis: '文言を具体化すると CTR が上がる', targetMetric: 'ga4.event:note_cta_click', targetDelta: '+30%', measure: { specVersion: 1 } }, item: rev, digestFile: 'd.json', nowIso: '2026-09-26T01:00:00.000Z' });
  assert.equal(e.status, 'proposed');
  assert.equal(e.baseline.opportunity.id, rev.id);
  assert.deepEqual(e.measure, { specVersion: 1 });
  const x = { id: 'EXP-007', status: 'measuring', history: [] };
  closeExperiment(x, { result: 'partial', learnings: 'l' }, '2026-09-26T01:00:00.000Z');
  assert.deepEqual([x.status, x.result, x.history.at(-1).action], ['done', 'partial', 'closed']);
});

test('pendingItems counts only decisions made for this digest week', () => {
  const digest = { week: '2026-W38', surfaced: [seo, rev] };
  assert.deepEqual(pendingItems(digest, { entries: [{ id: seo.id, week: '2026-W37' }] }).map((i) => i.id), [seo.id, rev.id]);
  assert.deepEqual(pendingItems(digest, { entries: [{ id: seo.id, week: '2026-W38' }] }).map((i) => i.id), [rev.id]);
});

import { checkTriage, handoverWithoutIds } from '../scripts/check-growth-triage.mjs';

test('check-growth-triage requires full disposition, the digest marker and IDs on every handover line', () => {
  const digest = { week: '2026-W38', generatedAt: '2026-09-25T21:10:00Z', surfaced: [seo, rev] };
  const now = Date.parse('2026-09-28T02:17:00Z');
  const good = '# 週次レビュー\n<!-- growth-digest:2026-W38 -->\n## 来週への申し送り\n- DN-0301 サイドバー CTA\n- EXP-012 を 10/10 に計測\n## 運用ルール\n- 本文';
  const ok = checkTriage({ digest, log: { entries: [{ id: seo.id, week: '2026-W38' }, { id: rev.id, week: '2026-W38' }] }, review: good, reviewName: 'r.md', now });
  assert.deepEqual(ok.violations, []);
  assert.equal(ok.handoverBullets, 2);
  const bad = checkTriage({ digest, log: { entries: [{ id: seo.id, week: '2026-W38' }] }, review: '## 来週への申し送り\n- index coverage を最優先\n', reviewName: 'r.md', now });
  assert.equal(bad.violations.length, 3);
  assert.match(bad.violations.join('\n'), /未処分: OPP-bbbbbbbbbb[\s\S]*埋め込まれていない[\s\S]*ID が無い/);
  assert.match(checkTriage({ digest: { ...digest, generatedAt: '2026-09-01T00:00:00Z' }, log: {}, review: '', reviewName: 'r', now }).invalid, /日前/);
  assert.deepEqual(handoverWithoutIds('no section'), { found: false, bullets: 0, missing: [] });
});
