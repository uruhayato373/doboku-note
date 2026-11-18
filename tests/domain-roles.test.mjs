import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRoles, actorProblem, actorLabel, documentSteward, frontmatterField } from '../scripts/lib/domain-roles.mjs';

const known = { skills: new Set(['weekly-review', 'monthly-review']), agents: new Set(['guide-qa', 'guide-fact-checker', 'guide-writer']), scripts: new Set(['validate-mdx']) };

function cfg(over = {}) {
  return {
    actors: { _doc: '', operator: '運営者', parent: '親' },
    domains: [{ id: 'site', roles: { decides: 'parent', review: ['skill:weekly-review'], gaps: [] } }],
    documentStewards: { 'docs/strategy/': { updates: ['skill:monthly-review'], approves: 'operator' } },
    contentStewards: { _doc: '', guide: { label: 'ガイド', create: 'agent:guide-writer', fix: 'agent:guide-writer', review: ['agent:guide-qa'], gates: ['script:validate-mdx'] } },
    agentRoles: { writer: '制作', qa: '採点' },
    agentTargets: { guide: 'ガイド' },
    agentOverlaps: [],
    ...over,
  };
}
const agents = [
  { name: 'guide-writer', role: 'writer', target: 'guide' },
  { name: 'guide-qa', role: 'qa', target: 'guide' },
];

test('整った設定は違反 0 件で、件数を数える', () => {
  const r = validateRoles(cfg(), known, agents, ['docs/strategy/01.md', 'docs/editorial/x.md']);
  assert.deepEqual(r.errors, []);
  assert.equal(r.counts.stewardDocs, 1);
  assert.equal(r.counts.contentTypes, 1);
});

test('担当が実在しない・書き方が違う・決める人が運営者か親でない', () => {
  assert.match(actorProblem('skill:nope', known, cfg()), /実在しない/);
  assert.match(actorProblem('someone', known, cfg()), /書き方/);
  assert.equal(actorProblem('operator', known, cfg()), null);
  const c = cfg({ domains: [{ id: 'site', roles: { decides: 'skill:weekly-review', review: [], gaps: [{ job: 'x', by: 'agent:ghost', reason: 'y' }] } }] });
  const e = validateRoles(c, known, agents, []).errors.join('\n');
  assert.match(e, /運営者.*親/);
  assert.match(e, /判断の場が無い/);
  assert.match(e, /agent:ghost/);
});

test('持ち主が必須の文書で決まらなければ止める', () => {
  const e = validateRoles(cfg({ documentStewards: {} }), known, agents, ['docs/marketing/a.md']).errors;
  assert.ok(e.some((x) => x.includes('docs/marketing/a.md')));
});

test('role・target の欠落と語彙外を止める', () => {
  const e = validateRoles(cfg(), known, [...agents, { name: 'x', role: null, target: 'zzz' }], []).errors.join('\n');
  assert.match(e, /x\.md: frontmatter に role: が無い/);
  assert.match(e, /target: zzz は agentTargets にない/);
});

test('同じ役割と対象が 2 体なら説明を求め、説明があれば通し、重複の無い説明は消させる', () => {
  const two = [...agents, { name: 'guide-fact-checker', role: 'qa', target: 'guide' }];
  assert.ok(validateRoles(cfg(), known, two, []).errors.some((x) => x.includes('qa:guide が 2 体')));
  const ok = cfg({ agentOverlaps: [{ role: 'qa', target: 'guide', reason: '形式と事実' }] });
  assert.deepEqual(validateRoles(ok, known, two, []).errors, []);
  assert.ok(validateRoles(ok, known, agents, []).errors.some((x) => x.includes('重複していない')));
});

test('文書の持ち主は長い一致を採り、表示名を引ける', () => {
  const c = cfg({ documentStewards: { 'docs/strategy/': { updates: ['parent'], approves: 'operator' }, 'docs/strategy/09.md': { updates: ['skill:weekly-review'], approves: 'operator' } } });
  assert.deepEqual(documentSteward(c, 'docs/strategy/09.md').updates, ['skill:weekly-review']);
  assert.deepEqual(documentSteward(c, 'docs/strategy/01.md').updates, ['parent']);
  assert.equal(documentSteward(c, 'docs/other.md'), null);
  assert.equal(actorLabel('operator', c), '運営者');
  assert.equal(actorLabel('skill:weekly-review', c), '/weekly-review');
  assert.equal(actorLabel('script:validate-mdx', c), 'npm run validate-mdx');
});

test('frontmatter の 1 行を読む', () => {
  assert.equal(frontmatterField('---\nname: a\nrole: qa\n---\nbody role: x', 'role'), 'qa');
  assert.equal(frontmatterField('---\nname: a\n---\n', 'target'), null);
});
