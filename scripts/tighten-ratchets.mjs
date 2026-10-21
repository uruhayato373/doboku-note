#!/usr/bin/env node
/**
 * tighten-ratchets.mjs — 減った写し・直書きの数まで、ラチェットの基準値を下げる（上げない・DN-0802）。
 *
 * 対象: .claude/config/code-ratchet-baseline.json（共通部品の写し・readJson の写し）と
 * .claude/config/state-path-literal-baseline.json（.claude/state のパスの直書き）。以前は減ると検査が赤になり、
 * 直した人が基準値の書き換えまで背負っていた（2026-10-20 の #1161）。いまは減っても赤にせず、ここが締める。
 *
 *   npm run tighten-ratchets             # 下げて書く
 *   npm run tighten-ratchets -- --check  # 書かずに、下げられる項目を出す
 *   node scripts/tighten-ratchets.mjs --staged  # pre-commit: コードが staged のときだけ回し、下げた基準値を git add する
 *
 * exit: 0（下げた・下げる項目なし）/ 2 走査できない（検査不成立）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CODE_RATCHET_BASELINE, readJsonDefiners, scanScriptHelpers, tightenCounts } from './lib/code-ratchets.mjs';
import { PATH_LITERAL_ALLOW, findStatePathLiterals, isPathLiteralCodeFile } from './lib/path-literals.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';

const STATE_BASELINE = '.claude/config/state-path-literal-baseline.json';
const git = (args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

/** .claude/state のパスの直書きの数（ファイルごと・0 は入れない） */
function stateLiteralCounts() {
  const counts = {};
  for (const f of git(['ls-files', '-z']).split('\0').filter(isPathLiteralCodeFile)) {
    if (PATH_LITERAL_ALLOW.includes(f)) continue;
    const n = findStatePathLiterals(readFileSync(join(ROOT, f), 'utf8')).length;
    if (n) counts[f] = n;
  }
  return counts;
}

export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit }) => {
    const check = __argv.includes('--check');
    const staged = __argv.includes('--staged');
    if (staged) {
      const files = git(['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
      if (!files.some((f) => /^(scripts|tools|src|tests|\.claude)\/.+\.(mjs|cjs|js|mts|ts|tsx)$/.test(f))) return;
    }
    let lowered = [];
    const written = [];
    try {
      const code = JSON.parse(readFileSync(join(ROOT, CODE_RATCHET_BASELINE), 'utf8'));
      const found = scanScriptHelpers(ROOT);
      const helpers = tightenCounts(code.scriptHelpers, Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length])));
      const rj = tightenCounts({ readJson: code.readJson }, { readJson: readJsonDefiners(ROOT).length });
      lowered.push(...helpers.lowered.map((x) => `共通部品の写し ${x}`), ...rj.lowered.map((x) => `readJson の写し ${x}`));
      if (helpers.lowered.length || rj.lowered.length) {
        if (!check) writeFileSync(join(ROOT, CODE_RATCHET_BASELINE), `${JSON.stringify({ ...code, scriptHelpers: helpers.next, readJson: rj.next.readJson }, null, 2)}\n`);
        written.push(CODE_RATCHET_BASELINE);
      }

      const state = JSON.parse(readFileSync(join(ROOT, STATE_BASELINE), 'utf8'));
      const now = stateLiteralCounts();
      const nextFiles = {};
      const stateLowered = [];
      for (const [f, base] of Object.entries(state.files)) {
        const n = now[f] ?? 0;
        if (n < base) stateLowered.push(`${f} ${base} → ${n}`);
        if (Math.min(n, base) > 0) nextFiles[f] = Math.min(n, base);
      }
      if (stateLowered.length) {
        lowered.push(...stateLowered.map((x) => `.claude/state の直書き ${x}`));
        if (!check) writeFileSync(join(ROOT, STATE_BASELINE), `${JSON.stringify({ ...state, files: nextFiles }, null, 2)}\n`);
        written.push(STATE_BASELINE);
      }
    } catch (e) {
      console.error(`[tighten-ratchets] ✗ 検査不成立: ${e.message}`);
      return __exit(2);
    }
    if (!lowered.length) {
      if (!staged) console.log('[tighten-ratchets] 下げられる基準値は無い');
      return;
    }
    console.log(`[tighten-ratchets] ${check ? '下げられる' : '下げた'}基準値 ${lowered.length} 件:`);
    for (const x of lowered) console.log(`  ▽ ${x}`);
    if (staged && !check) git(['add', '--', ...written]);
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
