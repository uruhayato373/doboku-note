#!/usr/bin/env node
// check-memory — エージェントの記憶（Claude Code auto-memory）が 1 本のまま健全かを検査する。
//
// 記憶の正本はリポジトリの .claude/memory だけ。各 PC の ~/.claude/projects/<key>/memory は
// scripts/setup-memory-link.mjs が張るリンク（macOS symlink / Windows junction）で、ここを指す。
// 2026-10-02、Mac だけ実ディレクトリのまま別リポジトリ（doboku-note-memory）へ SessionStart/End フックで
// 自動同期され続け、.claude/memory と 188 件 vs 143 件に分裂していた（同名 2 件は中身が別物）。
// 文書（information-architecture.md）は 09-14 から 1 本化済みと書いていたので、誰も気づかなかった。
//
//   node scripts/check-memory.mjs            # リポジトリ側（CI）: frontmatter・名前重複・索引の網羅と上限
//   node scripts/check-memory.mjs --local    # ＋この PC: リンクが .claude/memory を指すか・別同期フックが無いか・未コミット
//   node scripts/check-memory.mjs --session  # SessionStart 用（--local と同じ検査・問題があるときだけ出力）。
//     リンクが無い（または空の）ときだけ自動で張る。worktree のセッションは cwd が違うのでキーも別になり、
//     放っておくと Claude Code が新しい実ディレクトリを作って記憶が再び分裂する。中身のある実ディレクトリは触らない
// exit 0 = 問題なし / 1 = 違反あり / 2 = 検査不成立（記憶 0 件・ディレクトリ無し）

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createOutput, isCliEntry, runAsCli } from './lib/cli-run.mjs';
import { claudeProjectKey, defaultMemoryTarget, setupMemoryLink } from './setup-memory-link.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

/** Claude Code が毎セッション読み込む MEMORY.md の上限（先頭 200 行・25KB。超えた分は読まれない） */
export const INDEX_MAX_LINES = 200;
export const INDEX_MAX_BYTES = 25_000;
export const MEMORY_TYPES = Object.freeze(['user', 'feedback', 'project', 'reference']);

/** リポジトリ側の検査（純関数寄り・テストから使う）。files = { 名前: 中身 }、index = MEMORY.md の中身 */
export function auditMemoryFiles(files, index) {
  const problems = [];
  const names = new Map();
  for (const [file, src] of Object.entries(files)) {
    let data;
    try {
      data = matter(src).data;
    } catch (e) {
      problems.push(`${file}: frontmatter が YAML として読めない（${e.message.split('\n')[0]}）`);
      continue;
    }
    const type = data?.metadata?.type ?? data?.type;
    if (!data?.name) problems.push(`${file}: name が無い`);
    if (!data?.description) problems.push(`${file}: description が無い`);
    if (!MEMORY_TYPES.includes(type)) problems.push(`${file}: type が ${MEMORY_TYPES.join('/')} のどれでもない（${type ?? '無し'}）`);
    if (data?.name) names.set(data.name, [...(names.get(data.name) ?? []), file]);
  }
  for (const [name, list] of names) if (list.length > 1) problems.push(`name "${name}" が重複: ${list.join(', ')}`);

  const linked = new Set([...index.matchAll(/\]\(\.?\/?([^)\s]+\.md)\)/g)].map((m) => m[1]));
  for (const f of linked) if (!(f in files)) problems.push(`MEMORY.md のリンク先が無い: ${f}`);
  const unindexed = Object.keys(files).filter((f) => !linked.has(f));
  if (unindexed.length) problems.push(`MEMORY.md に載っていない記憶 ${unindexed.length} 件: ${unindexed.slice(0, 5).join(', ')}${unindexed.length > 5 ? ' …' : ''}`);
  const lines = index.split('\n').length;
  const bytes = Buffer.byteLength(index, 'utf8');
  if (lines > INDEX_MAX_LINES) problems.push(`MEMORY.md が ${lines} 行（上限 ${INDEX_MAX_LINES}。超えた分は読み込まれない）`);
  if (bytes > INDEX_MAX_BYTES) problems.push(`MEMORY.md が ${bytes} バイト（上限 ${INDEX_MAX_BYTES}。超えた分は読み込まれない）`);
  return { problems, count: Object.keys(files).length, lines, bytes };
}

/** この PC の検査: ~/.claude/projects/<key>/memory が target を指すリンクか */
export function auditLink({ cwd, home, target }) {
  const problems = [];
  const memDir = join(home, '.claude', 'projects', claudeProjectKey(cwd), 'memory');
  let st = null;
  try { st = lstatSync(memDir); } catch { /* 無い */ }
  if (!st) problems.push(`${memDir} が無い → node scripts/setup-memory-link.mjs`);
  else if (!st.isSymbolicLink()) problems.push(`${memDir} がリンクでなく実ディレクトリ（記憶が分裂する）→ 中身を .claude/memory へ統合してから node scripts/setup-memory-link.mjs`);
  else {
    let real = null;
    try { real = realpathSync(memDir); } catch { /* 壊れたリンク */ }
    if (!real) problems.push(`${memDir} のリンク先が存在しない → node scripts/setup-memory-link.mjs`);
    else if (real !== realpathSync(target)) problems.push(`${memDir} が別の場所を指している: ${real}（正: ${target}）`);
  }
  return { problems, memDir };
}

/** この PC の検査: 記憶を別経路で同期するフック（旧 sync-memory.sh 等）が残っていないか */
export function auditGlobalHooks(settingsSrc) {
  let settings;
  try { settings = JSON.parse(settingsSrc); } catch { return []; }
  const commands = Object.values(settings?.hooks ?? {}).flat().flatMap((h) => h?.hooks ?? []).map((h) => String(h?.command ?? ''));
  return commands.filter((c) => /sync-memory|\.claude\/projects\/[^ ]*\b(pull|push)\b/.test(c))
    .map((c) => `~/.claude/settings.json に記憶の別同期フックが残っている: ${c}（記憶は .claude/memory を git で同期する）`);
}

function isMissingOrEmpty(dir) {
  try {
    const st = lstatSync(dir);
    return !st.isSymbolicLink() && st.isDirectory() && readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

export async function run({ argv = [], quiet = false, root = ROOT, home = homedir() } = {}) {
  const out = createOutput({ quiet });
  const session = argv.includes('--session');
  const local = session || argv.includes('--local');
  const target = local ? defaultMemoryTarget(root) : join(root, '.claude', 'memory');
  if (!existsSync(target)) {
    out.error(`[check-memory] ✗ 検査不成立: ${target} が無い`);
    return out.result(2);
  }
  const files = {};
  for (const f of readdirSync(target)) if (f.endsWith('.md') && f !== 'MEMORY.md') files[f] = readFileSync(join(target, f), 'utf8');
  const indexPath = join(target, 'MEMORY.md');
  const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  if (!Object.keys(files).length) {
    out.error('[check-memory] ✗ 検査不成立: 記憶ファイルが 0 件');
    return out.result(2);
  }
  const repo = auditMemoryFiles(files, index);
  const problems = [...repo.problems];
  if (!index) problems.push('MEMORY.md が無い');

  let uncommitted = 0;
  if (local) {
    let link = auditLink({ cwd: root, home, target });
    if (session && link.problems.length && isMissingOrEmpty(link.memDir)) {
      const r = setupMemoryLink({ cwd: root, home, target, dryRun: false, migrate: false });
      out.log(`[check-memory] 記憶のリンクを自動で張った: ${link.memDir} → ${target}${r.ok ? '' : '（失敗）'}`);
      link = auditLink({ cwd: root, home, target });
    }
    problems.push(...link.problems);
    const settingsPath = join(home, '.claude', 'settings.json');
    if (existsSync(settingsPath)) problems.push(...auditGlobalHooks(readFileSync(settingsPath, 'utf8')));
    try {
      uncommitted = execFileSync('git', ['-C', target, 'status', '--porcelain', '--', '.'], { encoding: 'utf8' }).split('\n').filter(Boolean).length;
    } catch { /* git が無い環境は数えない */ }
    if (existsSync(join(target, '.git'))) problems.push(`${target} の中に .git がある（別リポジトリ化している）`);
  }

  const summary = `[check-memory] 記憶 ${repo.count} 件を実検査 / 索引 ${repo.lines} 行・${repo.bytes} バイト${local ? ' / この PC のリンク・フックも検査' : ''}`;
  if (session && !problems.length && !uncommitted) return out.result(0);
  out.log(summary);
  if (uncommitted) out.log(`  ! .claude/memory に未コミットの変更 ${uncommitted} 件（作業のコミットに含めて push しないと他の PC に届かない）`);
  if (problems.length) {
    for (const p of problems) out.error(`  ✗ ${p}`);
    return out.result(1);
  }
  out.log('[check-memory] ✓ 記憶は 1 本で、索引と frontmatter は健全');
  return out.result(0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
