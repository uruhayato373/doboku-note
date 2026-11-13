#!/usr/bin/env node
/**
 * check-unreachable-cli.mjs — どこからも呼ばれない CLI（scripts/ と .claude/scripts/ の直下の .mjs）を数える（DN-1017）。
 *
 * knip は scripts/** を全部 entry にしているので、使われなくなった CLI を検出できない。ここでは名前の参照を見る:
 * package.json・GitHub Actions・スキル・エージェント・hooks・CLAUDE.md・docs・作業マニュアル・ほかのスクリプト・管理画面の
 * どこにもファイル名が出てこない CLI を「到達しない」とする（テストからの参照は到達に数えない）。
 * 既に到達しない CLI は .claude/config/unreachable-cli-baseline.json に載せ、増えたときだけ止めるラチェット。
 * 罠: 名前を文字列の組み立て（`check-${x}.mjs`）で呼ぶ CLI は到達しないと出る。その場合は baseline に理由つきで載せる。
 *
 * Usage:
 *   node scripts/check-unreachable-cli.mjs                    # 検査（新しく到達しない CLI があれば exit 1）
 *   node scripts/check-unreachable-cli.mjs --list             # 到達しない CLI を全部出す（exit 0）
 *   node scripts/check-unreachable-cli.mjs --update-baseline  # 今の一覧で baseline を書き直す
 * exit: 0 合格 / 1 baseline に無い到達しない CLI がある / 2 検査不成立（候補か参照の走査が 0 件）
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { escapeRegExp } from './lib/regexp-escape.mjs';

const BASELINE = join(ROOT, '.claude/config/unreachable-cli-baseline.json'); // path-literal-ok: このラチェットの baseline
const CLI_DIRS = ['scripts', '.claude/scripts'];
const REF_SOURCES = [
  { dir: 'scripts', match: /\.(?:mjs|cjs|js|sh|ps1)$/ },
  { dir: '.claude/scripts', match: /\.(?:mjs|cjs|js|sh|ps1)$/ },
  { dir: '.claude/skills', match: /\.(?:md|mjs|cjs|js|json|sh)$/ },
  { dir: '.claude/agents', match: /\.md$/ },
  { dir: '.claude/hooks', match: /\.(?:mjs|cjs|js|sh|json)$/ },
  { dir: '.claude/knowledge', match: /\.md$/ },
  { dir: '.claude/rules', match: /\.md$/ },
  { dir: '.claude/config', match: /\.json$/ },
  { dir: '.claude/workflows', match: /\.(?:mjs|js|md)$/ },
  { dir: '.github', match: /\.(?:ya?ml|sh|md)$/ },
  { dir: 'docs', match: /\.md$/ },
  { dir: 'config', match: /\.json$/ },
  { dir: 'tools/admin-app/src', match: /\.(?:ts|tsx|mjs|js)$/ },
];
const REF_FILES = ['package.json', 'CLAUDE.md', 'AGENTS.md', '.claude/settings.json', '.githooks/pre-commit', '.husky/pre-commit'];

const argv = process.argv.slice(2);

const candidates = CLI_DIRS.flatMap((dir) => {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.mjs')).map((e) => `${dir}/${e.name}`);
});

const refFiles = [
  ...REF_FILES.filter((f) => existsSync(join(ROOT, f))),
  ...REF_SOURCES.flatMap(({ dir, match }) => listFiles(join(ROOT, dir), { match: (p) => match.test(p), allowMissing: true }).map((p) => relative(ROOT, p).split('\\').join('/'))),
];
// baseline 自身は参照に数えない（数えると載せた CLI が全部「到達する」になる）
const BASELINE_REL = relative(ROOT, BASELINE).split('\\').join('/');
const texts = refFiles.filter((file) => file !== BASELINE_REL).map((file) => ({ file, text: readFileSync(join(ROOT, file), 'utf8') }));

const unreachable = candidates.filter((cli) => {
  const name = basename(cli);
  const stem = name.replace(/\.mjs$/, '');
  return !texts.some(({ file, text }) => file !== cli && (text.includes(name) || new RegExp(`[/'"\`]${escapeRegExp(stem)}['"\`]`).test(text)));
}).sort();

console.log(`[check-unreachable-cli] CLI の候補 ${candidates.length} 件 / 参照の走査 ${refFiles.length} ファイル / 到達しない ${unreachable.length} 件`);
if (!candidates.length || !refFiles.length) { console.error('検査不成立: 候補か参照の走査が 0 件'); process.exit(2); }

if (argv.includes('--update-baseline')) {
  writeFileSync(BASELINE, `${JSON.stringify({ _doc: 'どこからも呼ばれない CLI の既知の一覧（check-unreachable-cli のラチェット）。消すか呼び出し元を作ったら行を消す。増やすときは呼ばれない理由を確かめてから --update-baseline', unreachable }, null, 2)}\n`);
  console.log(`baseline を書き直した（${unreachable.length} 件）`);
  process.exit(0);
}
if (argv.includes('--list')) { for (const cli of unreachable) console.log(`  ${cli}`); process.exit(0); }

const known = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).unreachable : []);
const added = unreachable.filter((cli) => !known.has(cli));
const gone = [...known].filter((cli) => !unreachable.includes(cli));
if (gone.length) console.log(`  baseline から外せる（今は到達する・消えた）: ${gone.join(', ')}（npm run check-unreachable-cli -- --update-baseline）`);
if (!added.length) { console.log(`✓ baseline（${known.size} 件）を超える到達しない CLI は無い`); process.exit(0); }
console.error(`✗ どこからも呼ばれない CLI が増えた（${added.length} 件）。package.json・workflow・スキルから呼ぶか、消す:`);
for (const cli of added) console.error(`  ${cli}`);
process.exit(1);
