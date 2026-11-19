#!/usr/bin/env node
/**
 * check-main-workflow-paths.mjs — main の workflow の定義が develop を checkout して呼ぶパス・npm script が、いまのツリーに実在するか（DN-1250）。
 *
 * 定期実行の workflow は定義が main・checkout が develop のものがある。develop でスクリプトを移動・改名・削除すると、
 * main へ deploy するまで main の定義が無いパスを呼んで落ちる。check-command-guidance は同じツリーの中の実在しか見ない。
 * 赤になったら: 旧パスに転送（新パスを呼ぶだけのファイル）を残すか、先に workflow の変更だけを main へ deploy する。
 *
 * Usage:
 *   node scripts/check-main-workflow-paths.mjs            # origin/main の定義と、いまの作業ツリーを照合
 *   node scripts/check-main-workflow-paths.mjs --ref <r>  # 定義を読む ref を変える（既定 origin/main）
 * exit: 0 合格 / 1 無いパス・npm script がある / 2 検査不成立（ref が取れない・対象の workflow が 0 本）
 *
 * npm run check-main-workflow-paths — main の定義が develop の checkout で呼ぶパスの実在（CI ゲート。CI は audit の前に origin/main を fetch する）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { parseCliArgs } from './lib/cli-args.mjs';
import { auditMainWorkflows } from './lib/main-workflow-paths.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const NAME = 'check-main-workflow-paths';
const { ref } = parseCliArgs({ ref: { type: 'string', default: 'origin/main' } });
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

let names;
try {
  names = git('ls-tree', '-r', '--name-only', '-z', ref, '--', '.github/workflows').split('\0').filter((f) => /\.ya?ml$/.test(f));
} catch {
  console.error(`[${NAME}] 検査不成立: ${ref} が読めない（git fetch --depth=1 origin main をしてから回す）`);
  process.exit(2);
}
const workflows = names.map((name) => ({ name, doc: yaml.load(git('show', `${ref}:${name}`)) }));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const r = auditMainWorkflows(workflows, (p) => existsSync(join(ROOT, p)), pkg.scripts ?? {});

console.log(`[${NAME}] ${ref} の workflow ${workflows.length} 本のうち develop を checkout する ${r.inScope.length} 本を実検査 / 呼ぶファイル ${r.files} 件・npm script ${r.npm} 件 / 無いもの ${r.missing.length} 件`);
if (r.inScope.length === 0 || r.files + r.npm === 0) {
  console.error(`[${NAME}] 検査不成立: 対象の workflow か、呼ぶパスが 0 件（抜き出しが壊れている）`);
  process.exit(2);
}
if (r.missing.length > 0) {
  for (const m of r.missing) console.error(`  ✗ ${m.workflow}: ${m.kind === 'npm' ? `npm run ${m.target}` : m.target} がいまのツリーに無い`);
  console.error(`[${NAME}] main の定義は deploy まで変わらない。旧パスに転送を残すか、workflow の変更を先に main へ deploy する`);
  process.exit(1);
}
console.log(`[${NAME}] ✓ main の定義が呼ぶパスは、いまのツリーにすべてある`);
