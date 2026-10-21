/**
 * スクリプトが共通部品で書けるものを各自で書き直すのを増やさない（ラチェット）。
 *
 * - リポジトリのルート: `scripts/lib/repository-paths.mjs` の `REPO_ROOT` を import する。各ファイルで
 *   `join(dirname(fileURLToPath(import.meta.url)), '..')`・`process.cwd()` から計算しない（2026-10-04 に 460 ファイルが
 *   それぞれ計算していた。cwd から決めるものは npm run 以外から実行すると別の場所を読んだ）。
 *   テストが一時ディレクトリを cwd にして走らせるなど cwd が設計どおりの行は、行末に `// root-ok: 理由`。
 * - 再帰の走査: `scripts/lib/fs-walk.mjs` の `listFiles`（同じ walk 関数が 140 ファイル超にあった）。
 * - 正規表現のエスケープ: `scripts/lib/regexp-escape.mjs` の `escapeRegExp`（scripts/ に書き写しが 16 か所超あり、逃がす記号がまちまちで
 *   path-literals.mjs は「.」だけ逃がして CodeQL の Incomplete string escaping に指摘された。DN-0588）。
 *   `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` の形の自前エスケープを書かない。
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
import { CODE_RATCHET_BASELINE, findDefinitions, scanScriptHelpers, tightenCounts } from '../scripts/lib/code-ratchets.mjs';

/** 基準値は .claude/config/code-ratchet-baseline.json（増えたら赤・減ったら pre-commit の tighten-ratchets が下げる・DN-0802） */
const BASELINE = JSON.parse(readFileSync(join(ROOT, CODE_RATCHET_BASELINE), 'utf8')).scriptHelpers;

const HINT = {
  root: "scripts/lib/repository-paths.mjs の REPO_ROOT を import する（cwd が設計どおりの行は // root-ok: 理由）",
  walk: 'scripts/lib/fs-walk.mjs の listFiles を使う',
  parseArgs: 'scripts/lib/cli-args.mjs の parseCliArgs を使う',
  curlJson: 'scripts/lib/note-api.mjs の curlJson（{ json, error }）を import し、戻りの形だけ薄く包む',
  mdxWalk: 'scripts/lib/mdx-files.mjs の listSiteMdx（img/ と隠しディレクトリを飛ばす・articleOnly）を使う',
  escapeRegExp: 'scripts/lib/regexp-escape.mjs の escapeRegExp を import する（全記号を逃がす）',
  siteSlug: 'src/lib/site-slug.mjs の siteSlugFromRel・siteSlugFromParts を使う',
  headingId: 'src/lib/heading-id.mjs の generateHeadingId を使う',
};

test('各自の定義は基準値より増えない', () => {
  const found = scanScriptHelpers();
  for (const k of Object.keys(BASELINE)) {
    assert.ok(found[k].length <= BASELINE[k], `${k} の定義が ${found[k].length} 件（基準 ${BASELINE[k]}）。${HINT[k]}:\n${found[k].join('\n')}`);
  }
});

test('減っても赤にしない: 基準値を下げるのは pre-commit の tighten-ratchets（DN-0802）', () => {
  const now = Object.fromEntries(Object.entries(scanScriptHelpers()).map(([k, v]) => [k, v.length]));
  const { next } = tightenCounts(BASELINE, now);
  for (const k of Object.keys(BASELINE)) assert.ok(next[k] <= BASELINE[k], `${k} の基準値を上げない`);
});

test('検出の型: 計算は数え、import・root-ok・共通部品を呼ぶだけの関数は数えない', () => {
  const count = (text) => Object.fromEntries(Object.entries(findDefinitions(text)).map(([k, v]) => [k, v.length]));
  const z = { root: 0, walk: 0, parseArgs: 0, curlJson: 0, mdxWalk: 0, escapeRegExp: 0, siteSlug: 0, headingId: 0 };
  assert.deepEqual(count("const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');"), { ...z, root: 1 });
  assert.deepEqual(count('const root = process.cwd();'), { ...z, root: 1 });
  assert.deepEqual(count('const PROJECT_ROOT = path.resolve(__dirname, "../..");'), { ...z, root: 1 });
  assert.deepEqual(count('const ROOT = process.cwd(); // root-ok: テストが一時 cwd で走らせる'), z);
  assert.deepEqual(count("import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';"), z);
  assert.deepEqual(count('function walk(dir) {\n  for (const e of readdirSync(dir)) out.push(e);\n}'), { ...z, walk: 1 });
  // walkMdx はディレクトリを読む walk でもあり MDX の列挙でもある（2 つのラチェットが別々に数える）
  assert.deepEqual(count('const walkMdx = (dir) => {\n  return readdirSync(dir);\n};'), { ...z, walk: 1, mdxWalk: 1 });
  assert.deepEqual(count('function walk(node) {\n  for (const c of node.children) walk(c);\n}'), z);
  assert.deepEqual(count("function walkMdx(dir) {\n  return listFiles(dir, { ext: '.mdx' });\n}"), z);
  assert.deepEqual(count('function parseArgs() {\n  const args = process.argv.slice(2);\n}'), { ...z, parseArgs: 1 });
  assert.deepEqual(count("export function parseArgs(argv) {\n  return parseCliArgs({ json: { type: 'boolean' } }, argv);\n}"), z);
  assert.deepEqual(count("const { values } = parseArgs({ options: {} });"), z);
  // curlJson: 本文で curl を起動する定義だけ数え、lib/note-api.mjs の curlJson を包む const は数えない
  assert.deepEqual(count("function curlJson(url) {\n  const r = spawnSync('curl', ['-sS', url], { encoding: 'utf-8' });\n  return JSON.parse(r.stdout);\n}"), { ...z, curlJson: 1 });
  assert.deepEqual(count("const curlJson = (url) => apiCurlJson(url).json;"), z);
  // MDX の列挙: ディレクトリを読む collectMdx は数え、listSiteMdx を呼ぶだけなら数えない
  assert.deepEqual(count("function collectMdx(dir) {\n  for (const e of readdirSync(dir, { withFileTypes: true })) out.push(e.name);\n}"), { ...z, mdxWalk: 1 });
  assert.deepEqual(count("function collectMdx() {\n  return listSiteMdx({ articleOnly: true });\n}"), z);
  // 正規表現のエスケープ: 自前の replace は const の定義もインラインも数え、共通部品の呼び出しは数えない
  assert.deepEqual(count("const escRe = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');"), { ...z, escapeRegExp: 1 });
  assert.deepEqual(count('const re = new RegExp(name.replace(/[.+?^${}()|[\\]\\\\]/g, "\\\\$&"));'), { ...z, escapeRegExp: 1 });
  assert.deepEqual(count("const re = new RegExp(escapeRegExp(name));"), z);
  assert.deepEqual(count("const s = text.replace(/\\s+/g, ' ');"), z);
});

test('slug と見出し ID の自前の規則を数える（DN-0797）', () => {
  const count = (text) => findDefinitions(text);
  assert.equal(count("const base = segs.pop().replace(/\\.mdx$/, '');\nconst slug = (base === 'article' ? segs : [...segs, base]).join('-');").siteSlug.length, 1);
  assert.equal(count("return withoutExt.split('/').filter((s) => s && s !== 'article').join('-');").siteSlug.length, 1);
  assert.equal(count("if (t.kind !== 'article' || !t.noteId) continue;").siteSlug.length, 0, 'note の記事の種類の判定は数えない');
  assert.equal(count('export function generateHeadingId(text) {').headingId.length, 1);
  assert.equal(count("export * from '../../../src/lib/heading-id.mjs';").headingId.length, 0);
});

test('サイト側（src/）も slug と見出し ID を共有の部品から使う', () => {
  for (const f of ['src/lib/toc.ts', 'src/lib/local-post-reader.ts']) {
    const hits = findDefinitions(readFileSync(join(ROOT, f), 'utf8'));
    assert.deepEqual([...hits.siteSlug, ...hits.headingId], [], f);
  }
});
