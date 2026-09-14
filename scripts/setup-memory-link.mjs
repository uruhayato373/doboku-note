#!/usr/bin/env node
// setup-memory-link — Claude Code の auto-memory（~/.claude/projects/<key>/memory）をリポジトリの .claude/memory へ
// junction（Windows）/ symlink（macOS）で向け、Windows と Mac で同じ memory を読ませる。
//
//   node scripts/setup-memory-link.mjs [--dry-run] [--migrate] [--target <dir>] [--cwd <dir>] [--home <dir>] [--settings <json>]
//
// <key> は Claude Code の規則＝cwd の絶対パスの英数字以外を `-` に置換（`C:\Users\x\doboku-note` → `C--Users-x-doboku-note`、
// Mac の `~` 直下なら `-Users-<name>-doboku-note`）。worktree で実行した場合も target は**メイン作業ツリー**の .claude/memory
// （`git rev-parse --git-common-dir` の親）＝ memory は 1 本に集約する。
//
// 既存の memory が実ディレクトリのときは消さない: --migrate なら target へ内容を移してからリンク（target に無い／新しい
// ファイルだけ複製）、無指定なら memory.bak-<時刻> へ退避してリンクする。target が無ければ --migrate 以外は中止。
// --settings <json> は dotfiles の host 別 settings.local.json を <cwd>/.claude/settings.local.json へ symlink（不可なら copy）。
// exit 0 = リンク済み / 1 = 中止（target 不在・引数不正）

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, realpathSync, renameSync, rmdirSync, rmSync, statSync, symlinkSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Claude Code のプロジェクトキー（~/.claude/projects/<key>） */
export function claudeProjectKey(cwd) {
  return resolve(cwd).replace(/[^A-Za-z0-9]/g, '-');
}

/** worktree でもメイン作業ツリーの .claude/memory を返す */
export function defaultMemoryTarget(cwd) {
  let common;
  try {
    common = execFileSync('git', ['-C', cwd, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
  } catch {
    return join(resolve(cwd), '.claude', 'memory');
  }
  const commonAbs = resolve(cwd, common);
  return join(dirname(commonAbs), '.claude', 'memory');
}

function parseArgs(argv) {
  const a = { dryRun: false, migrate: false, cwd: process.cwd(), home: homedir(), target: null, settings: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--dry-run') a.dryRun = true;
    else if (x === '--migrate') a.migrate = true;
    else if (x === '--cwd') a.cwd = argv[++i];
    else if (x === '--home') a.home = argv[++i];
    else if (x === '--target') a.target = argv[++i];
    else if (x === '--settings') a.settings = argv[++i];
    else throw new Error(`unknown option: ${x}`);
  }
  if (!a.target) a.target = defaultMemoryTarget(a.cwd);
  a.target = resolve(a.target);
  return a;
}

const isLink = (p) => {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};
const sameDir = (a, b) => {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
};

/** existing（実ディレクトリ）の中身を target へ複製（target に無い／新しいものだけ）。戻り値は複製数 */
function mergeInto(existing, target) {
  let copied = 0;
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(existing)) {
    const src = join(existing, name);
    const dst = join(target, name);
    const st = statSync(src);
    if (st.isDirectory()) {
      copied += mergeInto(src, dst);
      continue;
    }
    if (!existsSync(dst) || statSync(dst).mtimeMs < st.mtimeMs) {
      copyFileSync(src, dst);
      copied++;
    }
  }
  return copied;
}

function linkDir(target, linkPath, dryRun) {
  if (dryRun) return `link ${linkPath} -> ${target}`;
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
  return `linked ${linkPath} -> ${target}`;
}

export function setupMemoryLink(a) {
  const log = [];
  const key = claudeProjectKey(a.cwd);
  const linkPath = join(a.home, '.claude', 'projects', key, 'memory');
  log.push(`key=${key}`);
  log.push(`target=${a.target}`);

  if (isLink(linkPath)) {
    if (sameDir(linkPath, a.target)) {
      log.push(`already linked: ${linkPath}`);
      return { ok: true, log, changed: false };
    }
    log.push(`relink（現在の先: ${readlinkSync(linkPath)}）`);
    if (!a.dryRun) unlinkSync(linkPath);
  } else if (existsSync(linkPath)) {
    const entries = readdirSync(linkPath);
    if (entries.length === 0) {
      log.push(`空の実ディレクトリを削除: ${linkPath}`);
      if (!a.dryRun) rmdirSync(linkPath);
    } else if (a.migrate) {
      if (!existsSync(a.target)) {
        log.push(`migrate: ${linkPath}（${entries.length} 件）→ ${a.target} へ移動`);
        if (!a.dryRun) {
          mkdirSync(dirname(a.target), { recursive: true });
          renameSync(linkPath, a.target);
        }
      } else {
        const n = a.dryRun ? '(dry-run)' : mergeInto(linkPath, a.target);
        const bak = `${linkPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        log.push(`migrate: target 既存。無い／新しい ${n} 件を複製し、元を ${basename(bak)} へ退避`);
        if (!a.dryRun) renameSync(linkPath, bak);
      }
    } else {
      const bak = `${linkPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      log.push(`実ディレクトリ（${entries.length} 件）を ${basename(bak)} へ退避（消さない。中身を移すなら --migrate）`);
      if (!a.dryRun) renameSync(linkPath, bak);
    }
  }

  if (!existsSync(a.target)) {
    if (a.dryRun && a.migrate) log.push('(dry-run) target は migrate で作られる');
    else {
      log.push(`✗ target が無い: ${a.target}（repo を pull するか --migrate で既存 memory を移す）`);
      return { ok: false, log, changed: false };
    }
  }
  log.push(linkDir(a.target, linkPath, a.dryRun));
  return { ok: true, log, changed: true, linkPath };
}

export function setupSettingsLink(a) {
  const log = [];
  const src = resolve(a.settings);
  const dst = join(resolve(a.cwd), '.claude', 'settings.local.json');
  if (!existsSync(src)) return { ok: false, log: [`✗ settings が無い: ${src}`] };
  if (isLink(dst) && sameDir(dst, src)) return { ok: true, log: [`settings already linked: ${dst}`] };
  if (a.dryRun) return { ok: true, log: [`link ${dst} -> ${src}`] };
  mkdirSync(dirname(dst), { recursive: true });
  if (existsSync(dst) || isLink(dst)) rmSync(dst, { force: true });
  try {
    symlinkSync(src, dst, 'file');
    log.push(`settings linked: ${dst} -> ${src}`);
  } catch (e) {
    copyFileSync(src, dst);
    log.push(`settings copied（symlink 不可: ${e.code}。Windows は開発者モードか管理者権限で symlink 可）: ${dst}`);
  }
  return { ok: true, log };
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const r = setupMemoryLink(a);
  for (const l of r.log) console.log(`[setup-memory-link] ${l}`);
  let ok = r.ok;
  if (a.settings) {
    const s = setupSettingsLink(a);
    for (const l of s.log) console.log(`[setup-memory-link] ${l}`);
    ok = ok && s.ok;
  }
  return ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exit(main());
