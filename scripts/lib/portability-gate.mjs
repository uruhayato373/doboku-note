/**
 * portability-gate.mjs — macOS（BSD）と Linux（GNU）でふるまいが違うコマンドの書き方を見つける決定的ゲート（DN-0560）。
 *
 * CI は Linux だけなので、Mac でだけ落ちる書き方は CI では見つからない。2026-10-07 に
 * tests/sync-index-after-commit.test.mjs の拡張子なしの sed -i が BSD sed で落ち、Mac で回す npm run test と
 * quality:audit:ci の unit-tests が赤くなっていた（#891 で -i.bak に直した）。
 *
 * 行ごとに見る。コメントだけの行（// # * で始まる）は見ない。意図して使う行（Linux でしか動かない処理など）は
 * 行末に `portable-ok: 理由` を書く。
 * フラグは「コマンド名の直後に並ぶフラグ」だけを見る（`xargs rm -rf` の -r は rm のもの）。
 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listFiles, skipHiddenAndNodeModules } from './fs-walk.mjs';

/** 検査する範囲（リポジトリ相対）。ディレクトリは下の拡張子のファイル、ファイルはそのまま */
const TARGET_DIRS = ['tests', 'scripts', '.claude/scripts'];
const TARGET_FILES = ['package.json', '.claude/settings.json'];
const EXTS = ['.mjs', '.cjs', '.js', '.ts', '.sh', '.py'];

// コマンド名の直後のフラグの並び（値を取らないものだけ）
const FLAGS = String.raw`(?:\s+-[a-zA-Z0-9]+)*`;
const cmd = (name, flag) => new RegExp(String.raw`(?<![\w.-])${name}${FLAGS}\s+${flag}`);
// execFileSync('sed', ['-i', …]) のように配列で渡す形
const argv = (name, flag) => new RegExp(String.raw`['"\`]${name}['"\`]\s*,\s*\[\s*(?:['"\`]-[a-zA-Z]+['"\`]\s*,\s*)*['"\`]${flag}['"\`]`);

const RULES = [
  {
    id: 'sed-i',
    // -i の直後が空白・引用符・区切り・行末（拡張子なし）。-i.bak は通す。-i'' は BSD で次の引数を拡張子に取る
    patterns: [cmd('sed', String.raw`-[a-zA-Z]*i(?=[\s'"\`,\]]|$)`), argv('sed', String.raw`-[a-zA-Z]*i`)],
    hint: 'BSD sed は -i の後ろに拡張子が要る。-i.bak で書いて .bak を消すか、node で書き換える',
  },
  {
    id: 'grep-P',
    // git grep -P は git 自身の grep なので対象外
    patterns: [new RegExp(String.raw`(?<!git\s)(?<![\w.-])grep${FLAGS}\s+(?:-[a-zA-Z]*P|--perl-regexp)`), argv('grep', String.raw`-[a-zA-Z]*P`)],
    hint: 'BSD grep に -P は無い。-E で書くか node の正規表現で処理する',
  },
  {
    id: 'date-d',
    patterns: [cmd('date', String.raw`(?:-[a-zA-Z]*d\b|--date\b)`), argv('date', String.raw`(?:-[a-zA-Z]*d|--date)`)],
    hint: 'BSD date に -d（日付の指定）は無い。日付の計算は node（scripts/lib/jst-date.mjs）で行う',
  },
  {
    id: 'readlink-f',
    patterns: [cmd('readlink', String.raw`-[a-zA-Z]*f\b`), argv('readlink', String.raw`-[a-zA-Z]*f`)],
    hint: '古い macOS の readlink に -f は無い。node の realpathSync を使う',
  },
  {
    id: 'stat-c',
    patterns: [cmd('stat', String.raw`(?:-[a-zA-Z]*c\b|--format\b|--printf\b)`), argv('stat', String.raw`(?:-[a-zA-Z]*c|--format|--printf)`)],
    hint: 'BSD stat の書式は -f。node の statSync を使う',
  },
  {
    id: 'xargs-r',
    patterns: [cmd('xargs', String.raw`(?:-[a-zA-Z0-9]*r\b|--no-run-if-empty\b)`), argv('xargs', String.raw`(?:-[a-zA-Z0-9]*r|--no-run-if-empty)`)],
    hint: 'xargs の -r は GNU の拡張。入力が空のときの扱いを呼び手で決める',
  },
];

const ALLOW = /portable-ok/;
const COMMENT_ONLY = /^\s*(?:\/\/|\/\*|\*|#(?!!))/;

/**
 * @param {string} text
 * @returns {{ line: number, rule: string, hint: string, text: string }[]}
 */
export function scanText(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (ALLOW.test(line) || COMMENT_ONLY.test(line)) return;
    for (const r of RULES) {
      if (r.patterns.some((re) => re.test(line))) hits.push({ line: i + 1, rule: r.id, hint: r.hint, text: line.trim() });
    }
  });
  return hits;
}

/**
 * @param {string} root リポジトリのルート
 * @returns {{ files: number, hits: { file: string, line: number, rule: string, hint: string, text: string }[] }}
 */
export function findNonPortable(root) {
  const paths = [
    ...TARGET_DIRS.flatMap((d) => listFiles(join(root, d), { ext: EXTS, skipDir: skipHiddenAndNodeModules, allowMissing: true })),
    ...TARGET_FILES.map((f) => join(root, f)),
  ];
  const hits = [];
  let files = 0;
  for (const abs of paths) {
    let text;
    try { text = readFileSync(abs, 'utf8'); } catch { continue; }
    files++;
    const file = relative(root, abs).split('\\').join('/');
    for (const h of scanText(text)) hits.push({ file, ...h });
  }
  return { files, hits };
}
