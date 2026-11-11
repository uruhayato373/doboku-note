// スキル・エージェントの一覧の生成（DN-1131）。手書きの台帳をやめたので、frontmatter の読み方・生成区間の置き換え・
// 実際の文書が原本と一致していることを固定する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentKind, buildIndex, markers, parseEntry, replaceRegion, skillAgentMap } from '../scripts/lib/capability-index.mjs';
import { planIndex } from '../scripts/build-capability-index.mjs';
import { touchesCapabilityIndex } from '../scripts/check-doc-coupling.mjs';

const skill = (name, category, body = '') => ({ path: `.claude/skills/${name}/SKILL.md`, content: `---\nname: ${name}\ncategory: ${category}\ndescription: >\n  ${name} の説明。\n  Use when user asks to [x|y].\ndomain: ops\n---\n${body}\n` });
const agent = (name, extra = '') => ({ path: `.claude/agents/${name}.md`, content: `---\nname: ${name}\ndescription: ${name} の役割。\nmodel: sonnet\n${extra}domain: site\n---\n本文\n` });

test('parseEntry: 折り返しの description を 1 行にし、BOM つき・CRLF でも読む。name が無ければ null', () => {
  const e = parseEntry(skill('deploy', 'dev').content);
  assert.equal(e.name, 'deploy');
  assert.equal(e.category, 'dev');
  assert.equal(e.description, 'deploy の説明。 Use when user asks to [x|y].');
  assert.equal(parseEntry('﻿' + agent('a-qa').content.replace(/\n/g, '\r\n')).name, 'a-qa');
  assert.equal(parseEntry('---\ndescription: x\n---\n'), null);
  assert.equal(parseEntry('frontmatter なし'), null);
});

test('agentKind: tools に変更系が無ければ監査のみ。tools を書いていなければ編集可', () => {
  assert.equal(agentKind('Read, Glob, Grep, Bash, WebSearch, WebFetch'), '監査のみ');
  assert.equal(agentKind('Read, Edit'), '編集可');
  assert.equal(agentKind(null), '編集可');
});

test('skillAgentMap: 本文に出るエージェントだけを拾い、名前の一部が重なる別名は拾わない', () => {
  const skills = [{ name: 's1', body: '`guide-qa` を起動する。guide-qa-old は使わない' }, { name: 's2', body: 'エージェントなし' }];
  const map = skillAgentMap(skills, ['guide-qa', 'qa', 'guide']);
  assert.deepEqual([...map], [['s1', ['guide-qa']]]);
});

test('buildIndex: カテゴリごとの表・エージェントの種別と呼び出すスキル・読めないファイルの報告', () => {
  const r = buildIndex({
    skillFiles: [skill('improve-article', 'quality', 'guide-qa を回す'), skill('deploy', 'dev'), { path: '.claude/skills/broken/SKILL.md', content: 'no frontmatter' }],
    agentFiles: [agent('guide-qa', 'tools: Read, Glob, Grep\n'), agent('guide-rewriter')],
  });
  assert.deepEqual(r.invalid, ['.claude/skills/broken/SKILL.md']);
  assert.match(r.regions.skills, /^スキル 2 本/);
  assert.ok(r.regions.skills.indexOf('### 品質管理（quality）') < r.regions.skills.indexOf('### 開発（dev）'), 'カテゴリは決めた順に並ぶ');
  // 説明の中の | は表を壊さないよう逃がす
  assert.match(r.regions.skills, /\| `\/deploy` \| ops \| deploy の説明。 Use when user asks to \[x\\\|y\]\. \|/);
  assert.match(r.regions.agents, /\| `guide-qa` \| 監査のみ \| sonnet \| site \| guide-qa の役割。 \| `\/improve-article` \|/);
  assert.match(r.regions.agents, /\| `guide-rewriter` \| 編集可 \| sonnet \| site \| guide-rewriter の役割。 \| — \|/);
  assert.match(r.regions['skill-agent-map'], /\| `\/improve-article` \| `guide-qa` \|/);
});

test('表のセル: バックスラッシュと | の両方を逃がす（\\ を逃がさないと、説明の \\| が表の区切りに戻る）', () => {
  const file = { path: '.claude/agents/x.md', content: '---\nname: x\ndescription: \'a\\|b と c|d と e\\f\'\nmodel: sonnet\ndomain: ops\n---\n' };
  const r = buildIndex({ skillFiles: [skill('deploy', 'dev')], agentFiles: [file] });
  assert.ok(r.regions.agents.includes('a\\\\\\|b と c\\|d と e\\\\f'), r.regions.agents);
});

test('replaceRegion: マーカーの間だけを置き換え、文書の改行コードに合わせる。マーカーが無ければ null', () => {
  const doc = `前\r\n${markers.start('skills')}\r\n古い\r\n${markers.end('skills')}\r\n後\r\n`;
  const out = replaceRegion(doc, 'skills', '新しい\n2 行目');
  assert.equal(out, `前\r\n${markers.start('skills')}\r\n新しい\r\n2 行目\r\n${markers.end('skills')}\r\n後\r\n`);
  assert.equal(replaceRegion(out, 'skills', '新しい\n2 行目'), out, '同じ中身なら変わらない');
  assert.equal(replaceRegion('マーカーなし', 'skills', 'x'), null);
});

test('touchesCapabilityIndex: スキル・エージェント・生成先の文書を stage したときだけ検査の対象', () => {
  assert.equal(touchesCapabilityIndex(['.claude/skills/deploy/SKILL.md']), true);
  assert.equal(touchesCapabilityIndex(['.claude/agents/guide-qa.md']), true);
  assert.equal(touchesCapabilityIndex(['.claude/knowledge/reference/skills-guide.md']), true);
  assert.equal(touchesCapabilityIndex(['.claude/skills/deploy/references/x.md', 'scripts/x.mjs', 'content/site/a/b/article.mdx']), false);
  assert.equal(touchesCapabilityIndex([]), false);
});

test('実際の一覧が frontmatter と一致している（ずれたら npm run build-capability-index）', () => {
  const plan = planIndex();
  assert.deepEqual(plan.problems, []);
  assert.ok(plan.skills >= 50 && plan.agents >= 50, `原本が少なすぎる: スキル ${plan.skills}・エージェント ${plan.agents}`);
  assert.deepEqual(plan.docs.filter((d) => d.stale).map((d) => d.file), []);
});
