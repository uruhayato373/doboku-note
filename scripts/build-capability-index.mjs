#!/usr/bin/env node
// build-capability-index — スキル・エージェントの一覧を frontmatter から生成して、文書の生成区間に書く。
//
//   npm run build-capability-index            # 生成区間を書き換える
//   npm run build-capability-index -- --check # 書かずに、今の文書と一致するかだけ見る（exit 1 = ずれ）
//
// 書く先: .claude/knowledge/reference/skills-guide.md（スキルの一覧）と agents-registry.md（エージェントの一覧・
// スキルの本文に出るエージェント）の `<!-- generated:…:start -->` 〜 `<!-- generated:…:end -->` の間だけ。
// スキル・エージェントを足す・消す・description を変えたら回す（check-doc-coupling が pre-commit と CI で一致を見る）。
// exit: 0 一致・書いた / 1 ずれ（--check） / 2 検査不成立（原本が読めない・マーカーが無い）
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildIndex, replaceRegion } from './lib/capability-index.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const SKILLS_DIR = '.claude/skills';
const AGENTS_DIR = '.claude/agents';
export const TARGETS = [
  { file: '.claude/knowledge/reference/skills-guide.md', regions: ['skills'] },
  { file: '.claude/knowledge/reference/agents-registry.md', regions: ['skill-agent-map', 'agents'] },
];
const norm = (s) => s.replace(/\r\n/g, '\n');

/** 原本を読んで、各文書の「今の中身」と「生成後の中身」を返す。書き込みはしない */
export function planIndex(root = ROOT) {
  const skillFiles = readdirSync(join(root, SKILLS_DIR), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => ({ path: `${SKILLS_DIR}/${d.name}/SKILL.md`, content: readFileSync(join(root, SKILLS_DIR, d.name, 'SKILL.md'), 'utf8') }));
  const agentFiles = readdirSync(join(root, AGENTS_DIR)).filter((f) => f.endsWith('.md'))
    .map((f) => ({ path: `${AGENTS_DIR}/${f}`, content: readFileSync(join(root, AGENTS_DIR, f), 'utf8') }));
  const index = buildIndex({ skillFiles, agentFiles });
  const problems = index.invalid.map((p) => `frontmatter が読めない・name が無い: ${p}`);
  if (index.skills.length === 0 || index.agents.length === 0) problems.push(`原本が 0 件（スキル ${index.skills.length}・エージェント ${index.agents.length}）`);
  const docs = [];
  for (const target of TARGETS) {
    const current = readFileSync(join(root, target.file), 'utf8');
    let next = current;
    for (const id of target.regions) {
      const replaced = replaceRegion(next, id, index.regions[id]);
      if (replaced == null) { problems.push(`${target.file} に生成区間 ${id} のマーカーが無い`); continue; }
      next = replaced;
    }
    docs.push({ file: target.file, current, next, stale: norm(current) !== norm(next) });
  }
  return { skills: index.skills.length, agents: index.agents.length, problems, docs };
}

function main() {
  const check = process.argv.includes('--check');
  const plan = planIndex();
  const stale = plan.docs.filter((d) => d.stale);
  console.log(`[build-capability-index] スキル ${plan.skills} 本 / エージェント ${plan.agents} 体を読んだ・文書 ${plan.docs.length} 本のうち、ずれ ${stale.length} 本`);
  if (plan.problems.length) {
    for (const p of plan.problems) console.error(`  ✗ 検査不成立: ${p}`);
    process.exitCode = 2;
    return;
  }
  if (check) {
    for (const d of stale) console.error(`  ✗ ${d.file} が frontmatter とずれている。npm run build-capability-index を回して commit に含める`);
    process.exitCode = stale.length ? 1 : 0;
    return;
  }
  for (const d of stale) { writeFileSync(join(ROOT, d.file), d.next); console.log(`  書いた: ${d.file}`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
