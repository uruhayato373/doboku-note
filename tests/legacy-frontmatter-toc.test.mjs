// tests/legacy-frontmatter-toc.test.mjs
//
// DN-0681: toc_min_heading_level・toc_max_heading_level はサイトが目次の深さに使う
// （src/components/docs/DocPage.tsx）。旧 frontmatter として HIGH にも一括削除にもしない。
// id・sidebar_label は未使用なので従来どおり HIGH・削除の対象。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const LINT = join(REPO_ROOT, '.claude/scripts/lint-mdx-mobile.mjs');
const MIGRATE = join(REPO_ROOT, '.claude/scripts/migrate-civil-frontmatter.mjs');

function fixture(frontmatter) {
  const dir = mkdtempSync(join(tmpdir(), 'legacy-fm-'));
  mkdirSync(join(dir, 'a'));
  const file = join(dir, 'a', 'article.mdx');
  writeFileSync(file, `---\ntitle: t\n${frontmatter}---\n\n本文です。\n`);
  return { dir, file };
}

function lint(file) {
  return spawnSync('node', [LINT, file], { encoding: 'utf8', cwd: REPO_ROOT }).stdout;
}

function migrateDryRun(dir) {
  return spawnSync('node', [MIGRATE, '--dry-run', `--base=${dir}`], { encoding: 'utf8', cwd: REPO_ROOT }).stdout;
}

test('toc_min/max_heading_level だけの記事は規則 0-2 を出さず、一括削除の対象にもならない', () => {
  const { dir, file } = fixture('toc_min_heading_level: 2\ntoc_max_heading_level: 2\n');
  try {
    assert.doesNotMatch(lint(file), /\(0-2\)/);
    assert.match(migrateDryRun(dir), /Files scanned: 1/);
    assert.match(migrateDryRun(dir), /Files would-change: 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('id・sidebar_label は従来どおり 0-2 HIGH と削除の対象で、toc_* は残る', () => {
  const { dir, file } = fixture('id: x\nsidebar_label: y\ntoc_max_heading_level: 2\n');
  try {
    const out = lint(file);
    assert.match(out, /\(0-2\).*「id:」/);
    assert.match(out, /\(0-2\).*「sidebar_label:」/);
    assert.doesNotMatch(out, /toc_/);
    const mig = migrateDryRun(dir);
    assert.match(mig, /would remove \[id, sidebar_label\]/);
    assert.match(mig, /Legacy fields would-remove: 2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
