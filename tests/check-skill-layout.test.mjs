import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSkillFile, frontmatterValue } from '../scripts/check-skill-layout.mjs';

const fm = (name, category) => `---\nname: ${name}\n${category ? `category: ${category}\n` : ''}description: x\n---\n本文\n`;

test('1 階層・name 一致・category 語彙内なら違反なし', () => {
  assert.deepEqual(checkSkillFile('.claude/skills/deploy/SKILL.md', fm('deploy', 'dev')), []);
});

test('カテゴリのフォルダを挟んだ入れ子は止める（Claude Code が読み込まない）', () => {
  const v = checkSkillFile('.claude/skills/dev/deploy/SKILL.md', fm('deploy', 'dev'));
  assert.equal(v.length, 1);
  assert.match(v[0], /1 階層/);
});

test('name がディレクトリ名と違う・category が無い・語彙外を止める', () => {
  assert.match(checkSkillFile('.claude/skills/deploy/SKILL.md', fm('deploy2', 'dev'))[0], /name/);
  assert.match(checkSkillFile('.claude/skills/deploy/SKILL.md', fm('deploy'))[0], /category が無い/);
  assert.match(checkSkillFile('.claude/skills/deploy/SKILL.md', fm('deploy', 'misc'))[0], /語彙外/);
});

test('frontmatter の値を読む（引用符を外す・無ければ null）', () => {
  assert.equal(frontmatterValue('---\nname: "a-b"\n---\n', 'name'), 'a-b');
  assert.equal(frontmatterValue('本文だけ', 'name'), null);
});
