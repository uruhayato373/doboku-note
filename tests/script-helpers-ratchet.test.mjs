/**
 * スクリプトが共通部品で書けるものを各自で書き直すのを増やさない（ラチェット）。
 *
 * - リポジトリのルート: `scripts/lib/repository-paths.mjs` の `REPO_ROOT` を import する。各ファイルで
 *   `join(dirname(fileURLToPath(import.meta.url)), '..')`・`process.cwd()` から計算しない（2026-10-04 に 460 ファイルが
 *   それぞれ計算していた。cwd から決めるものは npm run 以外から実行すると別の場所を読んだ）。
 *   テストが一時ディレクトリを cwd にして走らせるなど cwd が設計どおりの行は、行末に `// root-ok: 理由`。
 * - 再帰の走査: `scripts/lib/fs-walk.mjs` の `listFiles`（同じ walk 関数が 140 ファイル超にあった）。
 * - 引数の読み方: `scripts/lib/cli-args.mjs` の `parseCliArgs`（手書きの parseArgs が 70 超あった）。
 *
 * 基準値より増えたら落ちる。減らしたときは基準値を下げる（上げない）。共通部品を呼ぶだけの薄い関数
 * （本文で listFiles( / parseCliArgs( を呼ぶもの）は数えない。readJson は tests/read-json-ratchet.test.mjs。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

/** 今の数（scripts・.claude・tools・lib・tests のコード）。減らしたら下げる */
const BASELINE = { root: 43, walk: 151, parseArgs: 74 };

const OWN = new Set(['scripts/lib/repository-paths.mjs', 'scripts/lib/fs-walk.mjs', 'scripts/lib/cli-args.mjs', 'tests/script-helpers-ratchet.test.mjs']);

/** ルートを自分で計算する定義（行単位。root-ok の行は数えない） */
export const DEFINES_ROOT = /^[ \t]*(?:export\s+)?(?:const|let|var)\s+(?:ROOT|REPO_ROOT|REPO|PROJECT_ROOT|repoRoot|root|ownRoot)\s*=[^\n]*(?:import\.meta\.(?:url|dirname)|__dirname|process\.cwd\(\))/;
/** walk で始まる関数の定義（本文でディレクトリを読むものだけ数える） */
export const DEFINES_WALK = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s*walk\w*\s*\(|const\s+walk\w*\s*=\s*(?:async\s*)?(?:\(|function|[\w$]+\s*=>))/;
/** parseArgs の定義 */
export const DEFINES_PARSE_ARGS = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s+parseArgs\s*\(|const\s+parseArgs\s*=)/;

/** 定義の行から本文の終わり（同じ字下げの `}` か `};`）までを返す */
function bodyFrom(lines, i) {
  const indent = lines[i].match(/^[ \t]*/)[0];
  const end = lines.findIndex((l, j) => j > i && (l === `${indent}}` || l === `${indent}};` || l.startsWith(`${indent}}`) && /^[ \t]*\};?\s*$/.test(l)));
  return lines.slice(i, end < 0 ? i + 1 : end + 1).join('\n');
}

export function findDefinitions(text) {
  const lines = text.split('\n');
  const hits = { root: [], walk: [], parseArgs: [] };
  lines.forEach((l, i) => {
    if (DEFINES_ROOT.test(l) && !/\/\/\s*root-ok:/.test(l)) hits.root.push(i + 1);
    // walk という名前でもディレクトリを読まないもの（構文木をたどる visitor など）は数えない
    if (DEFINES_WALK.test(l) && /\b(?:readdirSync|readdir|opendirSync|opendir)\(/.test(bodyFrom(lines, i)) && !/\blistFiles\(/.test(bodyFrom(lines, i))) hits.walk.push(i + 1);
    if (DEFINES_PARSE_ARGS.test(l) && !/\bparseCliArgs\(/.test(bodyFrom(lines, i))) hits.parseArgs.push(i + 1);
  });
  return hits;
}

function scan() {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'scripts', '.claude', 'tools', 'lib', 'tests'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    .filter((f) => /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f) && !f.includes('node_modules') && !OWN.has(f));
  assert.ok(files.length > 500, `走査したコード ${files.length} ファイル（検査不成立）`);
  const found = { root: [], walk: [], parseArgs: [] };
  for (const f of files) {
    const hits = findDefinitions(readFileSync(join(ROOT, f), 'utf8'));
    for (const k of Object.keys(found)) for (const line of hits[k]) found[k].push(`${f}:${line}`);
  }
  return found;
}

const HINT = {
  root: "scripts/lib/repository-paths.mjs の REPO_ROOT を import する（cwd が設計どおりの行は // root-ok: 理由）",
  walk: 'scripts/lib/fs-walk.mjs の listFiles を使う',
  parseArgs: 'scripts/lib/cli-args.mjs の parseCliArgs を使う',
};

test('各自の定義は基準値より増えない', () => {
  const found = scan();
  for (const k of Object.keys(BASELINE)) {
    assert.ok(found[k].length <= BASELINE[k], `${k} の定義が ${found[k].length} 件（基準 ${BASELINE[k]}）。${HINT[k]}:\n${found[k].join('\n')}`);
  }
});

test('基準値は今の数のまま（減らしたら BASELINE を下げる＝ラチェットを締める）', () => {
  const found = scan();
  assert.deepEqual(Object.fromEntries(Object.keys(BASELINE).map((k) => [k, found[k].length])), BASELINE);
});

test('検出の型: 計算は数え、import・root-ok・共通部品を呼ぶだけの関数は数えない', () => {
  const count = (text) => Object.fromEntries(Object.entries(findDefinitions(text)).map(([k, v]) => [k, v.length]));
  assert.deepEqual(count("const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');"), { root: 1, walk: 0, parseArgs: 0 });
  assert.deepEqual(count('const root = process.cwd();'), { root: 1, walk: 0, parseArgs: 0 });
  assert.deepEqual(count('const PROJECT_ROOT = path.resolve(__dirname, "../..");'), { root: 1, walk: 0, parseArgs: 0 });
  assert.deepEqual(count('const ROOT = process.cwd(); // root-ok: テストが一時 cwd で走らせる'), { root: 0, walk: 0, parseArgs: 0 });
  assert.deepEqual(count("import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';"), { root: 0, walk: 0, parseArgs: 0 });
  assert.deepEqual(count('function walk(dir) {\n  for (const e of readdirSync(dir)) out.push(e);\n}'), { root: 0, walk: 1, parseArgs: 0 });
  assert.deepEqual(count('const walkMdx = (dir) => {\n  return readdirSync(dir);\n};'), { root: 0, walk: 1, parseArgs: 0 });
  assert.deepEqual(count('function walk(node) {\n  for (const c of node.children) walk(c);\n}'), { root: 0, walk: 0, parseArgs: 0 });
  assert.deepEqual(count("function walkMdx(dir) {\n  return listFiles(dir, { ext: '.mdx' });\n}"), { root: 0, walk: 0, parseArgs: 0 });
  assert.deepEqual(count('function parseArgs() {\n  const args = process.argv.slice(2);\n}'), { root: 0, walk: 0, parseArgs: 1 });
  assert.deepEqual(count("export function parseArgs(argv) {\n  return parseCliArgs({ json: { type: 'boolean' } }, argv);\n}"), { root: 0, walk: 0, parseArgs: 0 });
  assert.deepEqual(count("const { values } = parseArgs({ options: {} });"), { root: 0, walk: 0, parseArgs: 0 });
});
