#!/usr/bin/env node
/**
 * report-env-inventory.mjs — コードベースの `process.env.X` 参照を棚卸しして一覧化する。
 *
 * src / scripts / .claude/scripts / tools を走査し、参照されている環境変数名と
 * 参照ファイル（相対パス）を `.claude/state/quality/env-inventory.json` に出力する。
 * どの env が必須で、どこで読まれているかを把握するための report-only ツール（副作用は JSON 書込のみ）。
 *
 * セキュリティ: `.env*` / credentials 等の実ファイルは**開かない・値を読まない・出力しない**。
 * 変数名と参照箇所（コード上の識別子）だけを収集する。
 *
 * 使い方:
 *   node scripts/report-env-inventory.mjs          # JSON 出力
 *   node scripts/report-env-inventory.mjs --print   # 標準出力に表も出す
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, lstatSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = join(ROOT, '.claude', 'state', 'quality', 'env-inventory.json');
const PRINT = process.argv.includes('--print');

const ROOTS = ['src', 'scripts', '.claude/scripts', 'tools'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'out', '.next', '.claude/worktrees']);
const EXT = /\.(mjs|cjs|js|ts|tsx|mts)$/;
const ENV_RE = /process\.env\.([A-Z0-9_]+)/g;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const rel = relative(ROOT, p).split('\\').join('/');
    if (IGNORE_DIRS.has(rel) || IGNORE_DIRS.has(e)) continue;
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, out);
    else if (EXT.test(e)) out.push(p);
  }
  return out;
}

function main() {
  const vars = new Map(); // name -> Set(relPath)
  for (const r of ROOTS) {
    for (const file of walk(join(ROOT, r))) {
      let src;
      try { src = readFileSync(file, 'utf8'); } catch { continue; }
      const rel = relative(ROOT, file).split('\\').join('/');
      let m;
      ENV_RE.lastIndex = 0;
      while ((m = ENV_RE.exec(src))) {
        const name = m[1];
        if (!vars.has(name)) vars.set(name, new Set());
        vars.get(name).add(rel);
      }
    }
  }

  const inventory = [...vars.entries()]
    .map(([name, files]) => ({ name, refCount: files.size, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const record = {
    generated_at: new Date().toISOString(),
    total: inventory.length,
    note: '値は読まない・出力しない（変数名と参照箇所のみ）。.env/credentials は走査対象外。',
    inventory,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(record, null, 2));

  process.stderr.write(`[env-inventory] ${inventory.length} 個の環境変数参照を ${relative(ROOT, OUT)} に出力\n`);
  if (PRINT) {
    for (const v of inventory) process.stdout.write(`${v.name}  (${v.refCount})  ${v.files.join(', ')}\n`);
  }
}

main();
