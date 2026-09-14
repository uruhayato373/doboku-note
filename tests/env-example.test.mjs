// .env.example が「このリポジトリが読む環境変数の一覧」として網羅されているかを検査する。
// 新しい process.env.X を足したのに .env.example に無い → 別 PC で「なぜ動かない」が再発する（名前が発見不能）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['scripts', '.claude/scripts', '.claude/skills', 'tools/admin-app/src'];
const EXT = new Set(['.mjs', '.cjs', '.js', '.ts', '.tsx', '.mts']);
// 実行環境が与える変数（このリポジトリの設定ではない）
const PLATFORM = new Set(['CI', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'TEMP', 'TMPDIR', 'PATH', 'NODE_ENV', 'GITHUB_ACTIONS', 'GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY', 'GITHUB_REPOSITORY', 'GITHUB_TOKEN', 'GITHUB_REF', 'GITHUB_SHA', 'RUNNER_TEMP', 'RUNNER_OS']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === 'worktrees') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(p.slice(p.lastIndexOf('.')))) out.push(p);
  }
  return out;
}

export function envNamesInCode(root = REPO) {
  const names = new Set();
  for (const r of SCAN_ROOTS) {
    const abs = join(root, r);
    try {
      statSync(abs);
    } catch {
      continue;
    }
    for (const f of walk(abs)) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]+)|\[['"]([A-Z][A-Z0-9_]+)['"]\])/g)) names.add(m[1] || m[2]);
    }
  }
  return names;
}

export function envNamesInExample(root = REPO) {
  const text = readFileSync(join(root, '.env.example'), 'utf8');
  return new Set([...text.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
}

test('.env.example: コードが読む process.env.X をすべて列挙し、値は書かない', () => {
  const inCode = envNamesInCode();
  const inExample = envNamesInExample();
  assert.ok(inCode.size >= 40, `process.env の走査が少なすぎる（${inCode.size} 件。検査不成立の疑い）`);
  const missing = [...inCode].filter((n) => !PLATFORM.has(n) && !inExample.has(n)).sort();
  assert.deepEqual(missing, [], `.env.example に無い変数: ${missing.join(', ')}（名前だけ 1 行足す）`);
  const text = readFileSync(join(REPO, '.env.example'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const value = m[2].replace(/\s*#.*$/, '').trim();
    assert.equal(value, '', `${m[1]} に値が書かれている（.env.example は名前だけ）`);
  }
});
