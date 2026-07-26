#!/usr/bin/env node
// 定期ジョブ（scheduled workflow）が実行するファイルを、実行対象外のブランチで変更していないか surface する。
//
// ルール（真実源: .claude/knowledge/reference/measurement-incidents.md
//        「実務上の要注意事実: 定期ジョブの実行ブランチは workflow ごとに違う」）:
//   GitHub Actions の scheduled workflow は checkout の `with.ref` があればそのブランチ、
//   無ければデフォルトブランチ（main）のコードで走る。**push 先と実行ブランチは別物**。
//   そのため `develop` で計測スクリプトを直しても、main 実行のジョブは deploy まで挙動が変わらない。
//
// 背景: 2026-07-27、「CI の次回実行で確認する」と報告したが psi-audit.yml は main で走るため
//   develop の未 push 変更は一度も実行されなかった。さらに再発防止 doc に「計測5ジョブは全て main」と
//   書いたが link-audit / verify-yt-status は ref: develop で develop が走る＝2件誤り。
//   人が表を維持する限り推論で汚染されるため、yml を実読して機械に答えさせる。
//
// 使い方:
//   node scripts/check-scheduled-exec-branch.mjs            # 全 workflow の対応表を出力（棚卸し）
//   node scripts/check-scheduled-exec-branch.mjs --staged   # staged の変更のみ検査（pre-commit 用）
//   node scripts/check-scheduled-exec-branch.mjs --file <p> # 単一ファイルがどのジョブで走るか調べる
//
// WARN（非ブロッキング・exit 0）。ただし scheduled workflow を 1 本も解析できなかった場合のみ
// 検査自体の破損とみなして exit 1（サイレント破損の禁止）。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';

const NAME = 'check-scheduled-exec-branch';
const WF_DIR = '.github/workflows';
const ROOT = process.cwd();
const STAGED = process.argv.includes('--staged');
const FILE_IDX = process.argv.indexOf('--file');
const TARGET_FILE = FILE_IDX >= 0 ? process.argv[FILE_IDX + 1] : null;

// 依存を辿る深さ。実測で計測系の依存は 1〜2 段に収まる。
const IMPORT_DEPTH = 2;

// コードではないが定期ジョブの挙動を変える設定ファイル。エントリと同じ workflow に紐づける。
const CONFIG_OF_ENTRY = {
  '.claude/scripts/fetch-psi-data.mjs': ['.claude/config/psi-urls.txt'],
  '.claude/scripts/lint-mdx-mobile.mjs': ['.claude/config/content-rules.json'],
};

// ── git ──

function sh(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function currentBranch() {
  return sh(['branch', '--show-current']) || '(detached)';
}

// デフォルトブランチをオフラインで取得（gh/ネットワーク不要）。取れなければ main を仮定。
function defaultBranch() {
  const ref = sh(['symbolic-ref', 'refs/remotes/origin/HEAD']);
  if (ref) return ref.replace('refs/remotes/origin/', '');
  return 'main';
}

function stagedFiles() {
  const out = sh(['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM']);
  return out ? out.split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

// ── workflow の解析 ──

// on: schedule を持つか。`on` は YAML 1.1 で true に解釈されうるので両方見る。
function scheduleOf(doc) {
  const on = doc?.on ?? doc?.true ?? doc?.['on'];
  if (!on || typeof on !== 'object') return null;
  const sch = on.schedule;
  if (!Array.isArray(sch) || sch.length === 0) return null;
  return sch.map((s) => s?.cron).filter(Boolean);
}

// checkout ステップの with.ref。複数あれば最初の 1 つ（実運用上 1 ジョブ 1 checkout）。
function checkoutRef(doc) {
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const uses = typeof step?.uses === 'string' ? step.uses : '';
      if (uses.startsWith('actions/checkout')) {
        const ref = step?.with?.ref;
        if (typeof ref === 'string' && ref.trim()) return ref.trim();
      }
    }
  }
  return null;
}

function runCommands(doc) {
  const cmds = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.run === 'string') cmds.push(step.run);
    }
  }
  return cmds;
}

// ── コマンド → ファイル解決 ──

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const npmScripts = pkg.scripts ?? {};
const importAliases = pkg.imports ?? {};

// `npm run X` / `node <path>` / `npx tsx <path>` からスクリプトのパスを取り出す。
// `&&` `;` `|` で連結された複合コマンドを分解し、npm script は再帰的に展開する。
function filesFromCommand(cmd, seen = new Set()) {
  const found = new Set();
  const parts = cmd.split(/&&|\|\||;|\n/);

  for (const raw of parts) {
    const line = raw.trim();
    if (!line) continue;

    const npmRun = line.match(/npm\s+run\s+(?:--silent\s+)?([\w:.-]+)/);
    if (npmRun) {
      const key = npmRun[1];
      if (npmScripts[key] && !seen.has(key)) {
        seen.add(key);
        for (const f of filesFromCommand(npmScripts[key], seen)) found.add(f);
      }
      continue;
    }

    // node / npx tsx / tsx で直接叩くパス
    const direct = line.match(/(?:^|\s)(?:npx\s+)?(?:node|tsx)\s+(?:--\S+\s+)*([^\s'"]+\.(?:mjs|cjs|js|mts|ts))/);
    if (direct) found.add(direct[1].replace(/^\.\//, ''));
  }
  return found;
}

// ── import グラフ（ローカルのみ） ──

function resolveAlias(spec) {
  for (const [pattern, target] of Object.entries(importAliases)) {
    if (!pattern.includes('*')) continue;
    const [pre, post] = pattern.split('*');
    if (spec.startsWith(pre) && spec.endsWith(post || '')) {
      const mid = spec.slice(pre.length, spec.length - (post ? post.length : 0));
      const t = typeof target === 'string' ? target : target?.default;
      if (typeof t === 'string') return t.replace('*', mid).replace(/^\.\//, '');
    }
  }
  return null;
}

function localImports(file) {
  if (!existsSync(file)) return [];
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  const re = /(?:from|import)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1];
    if (spec.startsWith('.')) {
      const abs = resolve(dirname(file), spec);
      out.push(relative(ROOT, abs).split('\\').join('/'));
    } else if (spec.startsWith('#')) {
      const aliased = resolveAlias(spec);
      if (aliased) out.push(aliased);
    }
  }
  return out.filter((p) => existsSync(p));
}

function expandDeps(entries) {
  const all = new Set(entries);
  let frontier = [...entries];
  for (let d = 0; d < IMPORT_DEPTH; d++) {
    const next = [];
    for (const f of frontier) {
      for (const dep of localImports(f)) {
        if (!all.has(dep)) {
          all.add(dep);
          next.push(dep);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  for (const e of entries) {
    for (const cfg of CONFIG_OF_ENTRY[e] ?? []) {
      if (existsSync(cfg)) all.add(cfg);
    }
  }
  return all;
}

// ── 本体 ──

if (!existsSync(WF_DIR)) {
  console.error(`[${NAME}] ERROR ${WF_DIR} が見つかりません（検査が機能していません）`);
  process.exit(1);
}

const DEFAULT_BRANCH = defaultBranch();
const CURRENT = currentBranch();

// file -> [{workflow, cron, branch}]
const owners = new Map();
let scheduledCount = 0;

for (const entry of readdirSync(WF_DIR)) {
  if (!/\.ya?ml$/.test(entry)) continue;
  const path = join(WF_DIR, entry);
  let doc;
  try {
    doc = yaml.load(readFileSync(path, 'utf8'));
  } catch (e) {
    console.log(`[${NAME}] WARN ${entry} をパースできませんでした: ${String(e.message).slice(0, 80)}`);
    continue;
  }

  const crons = scheduleOf(doc);
  if (!crons) continue;
  scheduledCount++;

  const branch = checkoutRef(doc) ?? DEFAULT_BRANCH;
  const entries = new Set();
  for (const cmd of runCommands(doc)) {
    for (const f of filesFromCommand(cmd)) entries.add(f);
  }

  for (const f of expandDeps([...entries])) {
    if (!owners.has(f)) owners.set(f, []);
    owners.get(f).push({ workflow: entry, cron: crons.join(', '), branch });
  }
}

// サイレント破損の禁止: 1 本も解析できないのは検査の故障
if (scheduledCount === 0) {
  console.error(`[${NAME}] ERROR scheduled workflow を 1 本も解析できませんでした（検査の故障）`);
  console.error(`  ${WF_DIR} の構造か js-yaml の解決を確認してください`);
  process.exit(1);
}

// 棚卸しモード（引数なし）
if (!STAGED && !TARGET_FILE) {
  console.log(`[${NAME}] scheduled workflow ${scheduledCount} 本 / 実行対象ファイル ${owners.size} 件（デフォルトブランチ: ${DEFAULT_BRANCH}）`);
  const byWf = new Map();
  for (const [f, list] of owners) {
    for (const o of list) {
      const key = `${o.workflow}\t${o.branch}\t${o.cron}`;
      if (!byWf.has(key)) byWf.set(key, []);
      byWf.get(key).push(f);
    }
  }
  for (const [key, files] of [...byWf].sort()) {
    const [wf, branch, cron] = key.split('\t');
    console.log(`\n  ${wf}  [${branch}]  cron: ${cron}`);
    for (const f of files.sort()) console.log(`    ${f}`);
  }
  process.exit(0);
}

const targets = TARGET_FILE ? [TARGET_FILE.replace(/^\.\//, '')] : stagedFiles();
const warnings = [];

for (const f of targets) {
  const list = owners.get(f);
  if (!list) continue;
  const offBranch = list.filter((o) => o.branch !== CURRENT);
  if (offBranch.length > 0) warnings.push({ file: f, jobs: offBranch });
}

if (warnings.length === 0) {
  const scope = TARGET_FILE ? TARGET_FILE : `staged ${targets.length} 件`;
  console.log(`[${NAME}] ✓ ${scope} に、現ブランチ(${CURRENT})で実行されない定期ジョブのファイルはありません`);
  process.exit(0);
}

console.log(`[${NAME}] WARN 定期ジョブが実行するファイルを、実行対象外のブランチで変更しています`);
for (const w of warnings) {
  console.log(`  ${w.file}`);
  for (const j of w.jobs) {
    console.log(`    → ${j.workflow} (cron ${j.cron}) は ${j.branch} で実行。現在 ${CURRENT}`);
  }
}
console.log(`  ${DEFAULT_BRANCH} へ deploy するまで、これらのジョブの挙動は変わりません`);
console.log(`  ヒント: 「いつから新しいデータが入るか」は実行ブランチと deploy 日を基準に答えること`);
console.log(`  真実源: .claude/knowledge/reference/measurement-incidents.md`);
process.exit(0);
