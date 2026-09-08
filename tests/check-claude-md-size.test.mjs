/**
 * scripts/check-claude-md-size.mjs のテスト。fixture を一時ディレクトリに作り --root 相当で関数を直接呼ぶ
 * （本物の CLAUDE.md / .claude/rules には触れない）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { checkClaudeMd, ruleHasPaths, MAX_LINES } from '../scripts/check-claude-md-size.mjs';

const fixtures = [];
test.after(() => { for (const f of fixtures) rmSync(f, { recursive: true, force: true }); });

function write(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const NEXT_BLOCK = '<!-- BEGIN:nextjs-agent-rules -->\n\n# This is NOT the Next.js you know\n\n<!-- END:nextjs-agent-rules -->\n';
const principles = Array.from({ length: 12 }, (_, i) => `### ${i + 1}. 原則 ${i + 1}\n\n- x\n`).join('\n');
const GOOD = `# T\n\n## 12 原則\n\n${principles}\n${NEXT_BLOCK}`;

function fixture({ claude = GOOD, rules = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'claude-md-size-'));
  fixtures.push(root);
  write(root, 'CLAUDE.md', claude);
  for (const [name, body] of Object.entries(rules)) write(root, `.claude/rules/${name}`, body);
  return root;
}

test('健全な fixture は違反 0 で、行数・rules 件数を数える', () => {
  const r = checkClaudeMd(fixture({ rules: { 'a.md': '---\npaths:\n  - "src/**"\n---\n\n# A\n' } }));
  assert.equal(r.violations.length, 0, r.violations.join('\n'));
  assert.equal(r.stats.principles, 12);
  assert.equal(r.stats.rules, 1);
});

test('CLAUDE.md が無ければ null（検査不成立）', () => {
  const root = mkdtempSync(join(tmpdir(), 'claude-md-size-'));
  fixtures.push(root);
  assert.equal(checkClaudeMd(root), null);
});

test(`${MAX_LINES} 行を超えると FAIL`, () => {
  const padding = Array.from({ length: MAX_LINES }, () => '- filler').join('\n') + '\n';
  const r = checkClaudeMd(fixture({ claude: GOOD.replace('## 12 原則', padding + '## 12 原則') }));
  assert.ok(r.violations.some((v) => v.includes('行')), r.violations.join('\n'));
});

test('原則見出しが 12 本揃っていない（改番・増減）と FAIL', () => {
  const r = checkClaudeMd(fixture({ claude: GOOD.replace('### 12. 原則 12', '### 13. 原則 13') }));
  assert.ok(r.violations.some((v) => v.includes('12 原則')), r.violations.join('\n'));
});

test('nextjs ブロックの後に本文があると FAIL、無くても FAIL', () => {
  const after = checkClaudeMd(fixture({ claude: GOOD + '\n## 追記\n' }));
  assert.ok(after.violations.some((v) => v.includes('末尾')));
  const missing = checkClaudeMd(fixture({ claude: GOOD.replace(NEXT_BLOCK, '') }));
  assert.ok(missing.violations.some((v) => v.includes('nextjs-agent-rules')));
});

test('paths: の無い rule は FAIL（常時読み込みになる）', () => {
  const r = checkClaudeMd(fixture({ rules: { 'no-paths.md': '# 常時\n', 'empty/list.md': '---\npaths: []\n---\n' } }));
  assert.equal(r.stats.rulesWithoutPaths, 2);
  assert.ok(r.violations.some((v) => v.includes('.claude/rules/no-paths.md')));
  assert.ok(r.violations.some((v) => v.includes('.claude/rules/empty/list.md')));
});

test('ruleHasPaths: ブロック形式・インライン形式・CRLF・BOM を受け付ける', () => {
  assert.equal(ruleHasPaths('---\npaths:\n  - "a/**"\n---\n'), true);
  assert.equal(ruleHasPaths('---\r\npaths: ["a/**"]\r\n---\r\n'), true);
  assert.equal(ruleHasPaths('﻿---\npaths:\n  - a\n---\n'), true);
  assert.equal(ruleHasPaths('---\ntitle: x\n---\n'), false);
  assert.equal(ruleHasPaths('---\npaths:\n---\n'), false);
});
