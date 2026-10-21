/**
 * code-ratchets — スクリプトの共通部品の写し（ルートの計算・walk・parseArgs・MDX の列挙・slug・見出し ID ほか）と
 * readJson の写しを数える（DN-0802 で tests/script-helpers-ratchet.test.mjs・tests/read-json-ratchet.test.mjs から移した）。
 * 基準値は .claude/config/code-ratchet-baseline.json。増えたら各テストが赤、減ったら pre-commit の
 * scripts/tighten-ratchets.mjs が基準値を下げて同じ commit に入れる（直した人に基準値の書き換えを背負わせない）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from './repository-paths.mjs';

export const CODE_RATCHET_BASELINE = '.claude/config/code-ratchet-baseline.json';

const OWN = new Set(['scripts/lib/repository-paths.mjs', 'scripts/lib/fs-walk.mjs', 'scripts/lib/cli-args.mjs', 'scripts/lib/note-api.mjs', 'scripts/lib/mdx-files.mjs', 'scripts/lib/regexp-escape.mjs', 'tests/script-helpers-ratchet.test.mjs', 'scripts/lib/code-ratchets.mjs']);

/** ルートを自分で計算する定義（行単位。root-ok の行は数えない） */
export const DEFINES_ROOT = /^[ \t]*(?:export\s+)?(?:const|let|var)\s+(?:ROOT|REPO_ROOT|REPO|PROJECT_ROOT|repoRoot|root|ownRoot)\s*=[^\n]*(?:import\.meta\.(?:url|dirname)|__dirname|process\.cwd\(\))/;
/** walk で始まる関数の定義（本文でディレクトリを読むものだけ数える） */
export const DEFINES_WALK = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s*walk\w*\s*\(|const\s+walk\w*\s*=\s*(?:async\s*)?(?:\(|function|[\w$]+\s*=>))/;
/** parseArgs の定義 */
export const DEFINES_PARSE_ARGS = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s+parseArgs\s*\(|const\s+parseArgs\s*=)/;
/** note API を curl で取る curlJson の定義（本文で curl を起動するものだけ数える。lib/note-api.mjs の curlJson を包むだけの const は数えない） */
export const DEFINES_CURL_JSON = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s+curlJson\s*\(|const\s+curlJson\s*=)/;
/** MDX を列挙する関数の定義（collectMdx・findMdx・listArticles …。本文でディレクトリを読むものだけ数える） */
export const DEFINES_MDX_WALK = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s*(?:collectMdx\w*|findMdx\w*|listMdx\w*|walkMdx\w*|scanMdx\w*|allMdx\w*|gatherMdx\w*|readAllMdx\w*|collectArticles?|listArticles?|findArticles?)\s*\(|const\s+(?:collectMdx\w*|findMdx\w*|listMdx\w*|walkMdx\w*|scanMdx\w*|allMdx\w*|collectArticles?|listArticles?|findArticles?)\s*=)/;

/** 記事のパスから slug を作る自前の規則（article.mdx ならディレクトリ名・DN-0797。src/lib/site-slug.mjs を使う） */
export const DEFINES_SITE_SLUG = /\b(?:s|base|baseName|name|fileName)\s*(?:===|!==)\s*['"]article['"]|parts\.at\(-1\)\s*===\s*['"]article['"]|\\\/article\\\.mdx\$\/,\s*''\)[^\n]*\.replace\(\/\\\/\/g,\s*'-'\)/;
/** 見出し ID の自前の定義（DN-0797。src/lib/heading-id.mjs を使う） */
export const DEFINES_HEADING_ID = /^[ \t]*(?:export\s+)?function\s+generateHeadingId\s*\(/;

/** 正規表現の特殊文字を `\\$&` で逃がす自前のエスケープ（行単位。インラインの .replace も、const の定義も同じ形なので 1 件） */
export const DEFINES_ESCAPE_REGEXP = /\.replace\(\s*\/\[[^\n]*?\]\/g,\s*(['"])\\\\\$&\1\s*\)/;

/** 定義の行から本文の終わり（同じ字下げの `}` か `};`）までを返す */
function bodyFrom(lines, i) {
  const indent = lines[i].match(/^[ \t]*/)[0];
  const end = lines.findIndex((l, j) => j > i && (l === `${indent}}` || l === `${indent}};` || l.startsWith(`${indent}}`) && /^[ \t]*\};?\s*$/.test(l)));
  return lines.slice(i, end < 0 ? i + 1 : end + 1).join('\n');
}

export function findDefinitions(text) {
  const lines = text.split('\n');
  const hits = { root: [], walk: [], parseArgs: [], curlJson: [], mdxWalk: [], escapeRegExp: [], siteSlug: [], headingId: [] };
  lines.forEach((l, i) => {
    if (DEFINES_ROOT.test(l) && !/\/\/\s*root-ok:/.test(l)) hits.root.push(i + 1);
    // walk という名前でもディレクトリを読まないもの（構文木をたどる visitor など）は数えない
    if (DEFINES_WALK.test(l) && /\b(?:readdirSync|readdir|opendirSync|opendir)\(/.test(bodyFrom(lines, i)) && !/\blistFiles\(/.test(bodyFrom(lines, i))) hits.walk.push(i + 1);
    if (DEFINES_ESCAPE_REGEXP.test(l)) hits.escapeRegExp.push(i + 1);
    if (DEFINES_SITE_SLUG.test(l)) hits.siteSlug.push(i + 1);
    if (DEFINES_HEADING_ID.test(l)) hits.headingId.push(i + 1);
    if (DEFINES_PARSE_ARGS.test(l) && !/\bparseCliArgs\(/.test(bodyFrom(lines, i))) hits.parseArgs.push(i + 1);
    if (DEFINES_CURL_JSON.test(l) && /\b(?:spawnSync|execFileSync|execSync|spawn)\(/.test(bodyFrom(lines, i))) hits.curlJson.push(i + 1);
    if (DEFINES_MDX_WALK.test(l) && /\b(?:readdirSync|readdir|opendirSync|opendir)\(/.test(bodyFrom(lines, i)) && !/\b(?:listFiles|listSiteMdx)\(/.test(bodyFrom(lines, i))) hits.mdxWalk.push(i + 1);
  });
  return hits;
}

/** 共通部品の自前の定義を数える（tests/script-helpers-ratchet.test.mjs と scripts/tighten-ratchets.mjs が使う） */
export function scanScriptHelpers(root = ROOT) {
  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--', 'scripts', '.claude', 'tools', 'lib', 'tests'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    // .claude/shared-policy/ は obsidian の正本から複数のリポへ配る写し（手編集しない・policy:sync で上書き）。
    // このリポの共通部品を import できない自己完結のコードなので数えない
    .filter((f) => /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f) && !f.includes('node_modules') && !OWN.has(f) && !f.startsWith('.claude/shared-policy/'));
  if (files.length <= 500) throw new Error(`走査したコード ${files.length} ファイル（検査不成立）`);
  const found = { root: [], walk: [], parseArgs: [], curlJson: [], mdxWalk: [], escapeRegExp: [], siteSlug: [], headingId: [] };
  for (const f of files) {
    const hits = findDefinitions(readFileSync(join(root, f), 'utf8'));
    for (const k of Object.keys(found)) for (const line of hits[k]) found[k].push(`${f}:${line}`);
  }
  return found;
}


/** `const readJson =`・`function readJson(` の定義（再公開 `export { readJson }` と import は数えない） */
export const DEFINES_READ_JSON = /^[ \t]*(?:export\s+)?(?:(?:const|let|var)\s+readJson\s*=|(?:async\s+)?function\s+readJson\s*\()/m;


/** readJson を自前で定義するファイル（scripts・.claude・tools の本番コード。共通の実装 json-io.mjs は数えない） */
export function readJsonDefiners(root = ROOT) {
  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--', 'scripts', '.claude', 'tools'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    .filter((f) => /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f) && !f.includes('node_modules') && f !== 'scripts/lib/json-io.mjs');
  if (files.length <= 500) throw new Error(`走査したコード ${files.length} ファイル（検査不成立）`);
  return files.filter((f) => DEFINES_READ_JSON.test(readFileSync(join(root, f), 'utf8')));
}

/**
 * 基準値を今の数まで下げる（上げない）。数が基準値を超えた項目は触らない（赤のまま）。
 * @param {Record<string, number>} baseline
 * @param {Record<string, number>} now
 * @returns {{ next: Record<string, number>, lowered: string[] }}
 */
export function tightenCounts(baseline, now) {
  const next = { ...baseline };
  const lowered = [];
  for (const [k, base] of Object.entries(baseline)) {
    const n = now[k];
    if (typeof n === 'number' && n < base) {
      next[k] = n;
      lowered.push(`${k} ${base} → ${n}`);
    }
  }
  return { next, lowered };
}
