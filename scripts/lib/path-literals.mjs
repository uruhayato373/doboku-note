/**
 * path-literals.mjs — コードと設定ファイルが config/・data/ のパスを直書きしていないか、台帳の id を正しく引いているかの検出。
 * 判定は scripts/check-datasets.mjs が使う（ここは見つけるだけで、ファイルを読まない）。
 *
 * 置き場を移したとき、直書きは旧パスのまま残り、読めずに黙って空を返す（2026-10-02 に管理画面のアフィリエイト画面と
 * UTM 生成で実際に起きた）。コードは台帳（scripts/lib/datasets.mjs）から datasetPath・datasetDir・latestFile で引く。
 */
import { AREAS, DATASETS, areaOf } from './datasets.mjs';

/**
 * config/・data/ のパスを直書きしてよいファイル。台帳そのものと、追記だけの台帳に残る旧パスを読み替える対応表と、この検出。
 */
export const PATH_LITERAL_ALLOW = ['scripts/lib/datasets.mjs', 'scripts/lib/repository-paths.mjs', 'scripts/lib/path-literals.mjs'];

/** 直書きを止める置き場（strict。.claude/state/ はラチェットで別に数える＝findStatePathLiterals） */
const AREA_DIRS = Object.values(AREAS).filter((a) => a.strict).map((a) => a.dir).join('|');
/**
 * 直書きの形。(1) `'data/note/sales.json'`・`${ROOT}/config/…`・`/^data\/…/`、
 * (2) 分割形 `join(ROOT, 'config', 'x.json')`・`join(HERE, '..', 'config', …)`。
 * `src/config/…`・`public/data/…`・URL の `/data/…`、分割形の `'src', 'config'`・コマンド引数の `['config', '--get']`・
 * `gtag('config', '${id}')` は置き場の config/・data/ ではないので拾わない。
 */
const PATH_LITERAL = new RegExp(
  `(?:(?<![\\w.\\-/\\\\])|(?<=\\}\\/))(?:${AREA_DIRS})\\\\?\\/[A-Za-z0-9_{$-]` +
    `|(?<![\\w-]['"\`]\\s*,\\s*|\\[\\s*)['"\`](?:${AREA_DIRS})['"\`]\\s*,\\s*(?:['"][A-Za-z0-9_]|\`[A-Za-z0-9_$])`,
  'g',
);
const IS_COMMENT = /^\s*(\/\/|\*|\/\*)/;
const ALLOWED = /path-literal-ok:\s*\S/;
const AREA_ARG = new RegExp(`^['"\`](?:${AREA_DIRS})['"\`]$`);
const STRING_ARG = /^(['"`]).*\1$/s;

/** 呼び出し `name(` の直後から、対応する `)` までの引数を、文字列・括弧を考慮して分ける（行をまたいでよい） */
function callArgs(source, open) {
  const args = [];
  let depth = 0;
  let quote = null;
  let start = open;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) {
        args.push({ text: source.slice(start, i).trim(), at: start });
        return args;
      }
      depth--;
    } else if (c === ',' && depth === 0) {
      args.push({ text: source.slice(start, i).trim(), at: start });
      start = i + 1;
    }
  }
  return args;
}

/**
 * 1 ファイルの本文から直書きを返す。
 * - 行頭がコメント（// ・ * ・ /*）の行と、行末の ` // ` 以降は読まない（説明文にパスを書くのはよい）
 * - 移す前の旧パスを読み替えるなど、あえて書く行は行末に `// path-literal-ok: 理由` を付ける
 * - basenames（台帳のファイル名 → id）を渡すと、ファイル名だけの直書き（`readConfig('exam-stats.json')`・
 *   `join(OUT_DIR, 'coverage-latest.md')`）も拾う
 * @param {string} source
 * @param {{ basenames?: Map<string, string> }} [opts]
 * @returns {{ line: number, text: string }[]}
 */
export function findPathLiterals(source, { basenames } = {}) {
  // CRLF（Windows の autocrlf 作業ツリー）だと `.*$` が \r で止まり、行末コメントを外せず偽の違反になる
  source = source.replace(/\r\n/g, '\n');
  const lines = source.split('\n');
  const skip = (line) => IS_COMMENT.test(line) || ALLOWED.test(line);
  const hits = new Map();
  const hit = (lineNo, text) => {
    if (!hits.has(lineNo)) hits.set(lineNo, { line: lineNo, text });
  };
  lines.forEach((line, i) => {
    if (skip(line)) return;
    const code = line.replace(/\s\/\/\s.*$/, '');
    for (const m of code.matchAll(PATH_LITERAL)) hit(i + 1, code.slice(m.index, m.index + 60).trim());
    if (basenames) {
      for (const m of code.matchAll(/['"`]([A-Za-z0-9_.-]+\.(?:json|jsonl|csv|txt|md|png))['"`]/g)) {
        const id = basenames.get(m[1]);
        if (id) hit(i + 1, `${m[1]}（台帳 ${id}）— ${code.trim().slice(0, 60)}`);
      }
    }
  });
  // join/resolve/repoPath の引数に置き場の名前がある（次の引数が変数でも拾う。前の引数が '..' 以外の文字列なら別の置き場）
  const lineOf = (at) => source.slice(0, at).split('\n').length;
  for (const m of source.matchAll(/\b(?:join|resolve|repoPath)\s*\(/g)) {
    const args = callArgs(source, m.index + m[0].length);
    args.forEach((a, k) => {
      if (!AREA_ARG.test(a.text)) return;
      const prev = args[k - 1]?.text;
      if (prev && STRING_ARG.test(prev) && !/^(['"`])\.\.?\1$/.test(prev)) return;
      const lineNo = lineOf(a.at + (a.text.length ? source.slice(a.at).indexOf(a.text) : 0));
      if (skip(lines[lineNo - 1] ?? '')) return;
      hit(lineNo, (lines[lineNo - 1] ?? '').trim().slice(0, 60));
    });
  }
  return [...hits.values()].sort((a, b) => a.line - b.line);
}

/**
 * ファイル名だけで台帳の 1 データセットを指せる名前（→ id）。可変部分の無いパスのうち、台帳の中で名前が一意で、
 * config/・data/ の外に同じ名前の追跡ファイルが無いもの（`status.json`・`index.json` のような汎用名は除く）。
 * @param {string[]} trackedFiles git ls-files の結果
 */
export function basenameIndex(trackedFiles) {
  const outside = new Set(trackedFiles.filter((f) => !new RegExp(`^(?:${AREA_DIRS})/`).test(f)).map((f) => f.split('/').pop()));
  const fixed = DATASETS.filter((x) => !x.path.includes('{') && AREAS[areaOf(x)]?.strict);
  const count = new Map();
  for (const x of fixed) {
    const b = x.path.split('/').pop();
    count.set(b, (count.get(b) ?? 0) + 1);
  }
  return new Map(fixed.map((x) => [x.path.split('/').pop(), x.id]).filter(([b]) => count.get(b) === 1 && !outside.has(b)));
}

/**
 * 台帳の id を引く呼び出し（第 1 文字列引数が id。root を取る関数は root の次）。パス（datasetPath 系）・読み（readDataset・readDatasetIf・readLatest）・
 * 書き（writeDataset・appendDataset）・鮮度（freshnessOf・freshnessDays）のどれも、id の綴り違いを実行時でなく検査で止める。
 * listReports・latestReport は GA4・GSC のレポートの種類なので含めない
 */
const ID_CALL = /\b(datasetPath|datasetDir|datasetFiles|latestFile|datasetById|resolveDataset|readDataset|readDatasetIf|readLatest|writeDataset|appendDataset|freshnessOf|freshnessDays)\(\s*(?:[A-Za-z_$][\w$.]*\s*,\s*)?(['"])([a-z0-9]+(?:\.[a-z0-9-]+)+)\2/g;
/** ワークフローの `node scripts/ci-data.mjs put|latest|path <id>`・`npm run ci-data -- …` */
const CI_DATA_ID = /ci-data(?:\.mjs)?(?:\s+--)?\s+(?:put|latest|path)\s+([a-z0-9]+\.[a-z0-9-]+)/g;
const CI_DATA_DATASETS = /--datasets\s+([a-z0-9.,-]+)/g;

/**
 * 台帳の id を指す箇所（コードの datasetPath('id') 系と、YAML の ci-data の id）を返す。
 * @returns {{ id: string, line: number, via: string }[]}
 */
export function findDatasetIds(source) {
  const out = [];
  const lines = source.split('\n');
  const lineOf = (at) => source.slice(0, at).split('\n').length;
  // 使い方の説明（コメント行）に書いた例は数えない
  const inComment = (lineNo) => /^\s*(\/\/|\*|\/\*|#)/.test(lines[lineNo - 1] ?? '');
  const push = (id, at, via) => {
    const line = lineOf(at);
    if (!inComment(line)) out.push({ id, line, via });
  };
  for (const m of source.matchAll(ID_CALL)) push(m[3], m.index, m[1]);
  for (const m of source.matchAll(CI_DATA_ID)) push(m[1], m.index, m[0].includes('latest') ? 'ci-data latest' : 'ci-data');
  for (const m of source.matchAll(CI_DATA_DATASETS)) {
    for (const id of m[1].split(',').filter(Boolean)) push(id, m.index, 'ci-data --datasets');
  }
  return out;
}

/**
 * ワークフローと package.json に書かれた config/・data/ のパス（台帳に当たるかは呼び出し側が見る）。
 * `${{ … }}`・`$VAR` を含むものは組み立て途中なので除く。
 * @returns {{ path: string, line: number }[]}
 */
export function findConfigPaths(source) {
  const out = [];
  source.split('\n').forEach((line, i) => {
    if (/^\s*#/.test(line)) return;
    for (const m of line.matchAll(new RegExp(`(?<![\\w.\\-/])(?:${AREA_DIRS})/[A-Za-z0-9_./*{}$-]+`, 'g'))) {
      const p = m[0].replace(/[.,]+$/, '');
      if (/[{}$]/.test(p)) continue;
      out.push({ path: p, line: i + 1 });
    }
  });
  return out;
}

/** .claude/state/ のパスの直書き（`'.claude/state/…'`・`join(ROOT, '.claude', 'state', …)`）。コメント行と行末の `// ` 以降・path-literal-ok の行は数えない */
const STATE_LITERAL = new RegExp(`${AREAS.state.dir.replace(/[.]/g, '\\.')}/|['"\`]\\.claude['"\`]\\s*,\\s*['"\`]state['"\`]`);
/**
 * .claude/state/ のパスを直書きしている行。check-datasets が基準線（.claude/config/state-path-literal-baseline.json）と比べ、
 * 基準線に無いファイルで増えたら止め、直したファイルは基準線から外させる（一度に直さず段階的に減らす）
 * @returns {{ line: number, text: string }[]}
 */
export function findStatePathLiterals(source) {
  const out = [];
  source.replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
    if (IS_COMMENT.test(line) || ALLOWED.test(line)) return;
    const code = line.replace(/\s\/\/\s.*$/, '');
    if (STATE_LITERAL.test(code)) out.push({ line: i + 1, text: code.trim().slice(0, 60) });
  });
  return out;
}
