/**
 * check-information-architecture.mjs — 置き場のモデル（docs/content/config/data/.claude/実装）への逆戻りを機械で止める。
 *
 * 背景: 2026-08-18 に docs/ と content/ を分離した（docs=人が読む恒久判断 /
 *   content=顧客へ届ける制作物と入力 / .claude=エージェント運用 / src・tools・scripts=実装）。
 *   2026-10-02 に事業の正本（config/）と記録（data/）を .claude/ から分離した。ファイルを移した旧パスは
 *   scripts/lib/repository-paths.mjs の MOVED_PATHS・RESTRUCTURED_PATHS が正本で、ここが検査のたびに
 *   禁止ルート（forbiddenRoots）と旧パス走査（stalePathLiterals）へ取り込む（3 か所に同じ旧パスを書かない）。
 *   この分離は**規約だけでは戻る**。実際に移行中も「docs に article.md が生える」
 *   「content に TODO 台帳が生える」形の逆戻りが起きうる配置だった。
 *
 * 検査（設定は .claude/config/information-architecture.json）:
 *   error  廃止した置き場（docs/project・docs/note・.claude/content・.local/r2/posts 等）にファイルがある
 *   error  docs/ に制作物（article.md / slide-data.json / .mdx / 動画 等）が入っている
 *   error  content/ に flow（backlog.md・plans/・todo/ 等）が入っている
 *   error  旧ルートと新ルートに同じ相対パスがある（二重 SSOT）
 *
 * Usage:
 *   node scripts/check-information-architecture.mjs           全量
 *   node scripts/check-information-architecture.mjs --staged  staged 差分のみ（pre-commit 用）
 *   node scripts/check-information-architecture.mjs --json    機械可読
 *
 * exit: 0 合格 / 1 違反 / 2 検査不成立（設定が読めない・対象 0 件）
 * 緊急回避: SKIP_INFORMATION_ARCHITECTURE=1
 *
 * 真実源: .claude/knowledge/reference/information-architecture.md
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeSync } from 'node:fs';
import { extname, basename, join, sep } from 'node:path';
import { REPO_ROOT as ROOT, MOVED_PATHS, RESTRUCTURED_PATHS } from './lib/repository-paths.mjs';

const CONFIG = join(ROOT, '.claude/config/information-architecture.json');
const toPosix = (v) => v.split(sep).join('/');

/** 拡張子で終わるパスはファイル、それ以外はディレクトリとみなす（旧パスの置き場はこの形で揃っている） */
const isFilePath = (p) => /\.[A-Za-z0-9]+$/.test(p.split('/').pop());

/**
 * repository-paths.mjs に旧パスとして載っている文字列（正規表現で書いた移動は文字列にできないので対象外）。
 * ファイルを移すときは RESTRUCTURED_PATHS に 1 行足せば、禁止ルートにも旧パス走査にも入る。
 */
export function movedFromPaths() {
  return [...new Set([...MOVED_PATHS, ...RESTRUCTURED_PATHS].map(([from]) => from).filter((f) => typeof f === 'string'))];
}

/**
 * 設定 JSON に repository-paths.mjs の旧パスを足した検査用の設定にする。
 * JSON には repository-paths に載らない旧パス（docs 側の廃止・移動表の無い旧パス）だけを書く。
 * 走査の旧パスはディレクトリを末尾 / 付きで持つ（残したファイルの前方一致を拾わない）。
 */
export function withMovedPaths(raw) {
  const cfg = structuredClone(raw);
  const moved = movedFromPaths();
  // 親のディレクトリがもう載っている旧パスは足さない（同じ場所を二重に報告しない。検出する集合は変わらない）
  const merge = (own, extra, covers) => {
    const all = [...new Set([...own, ...extra])];
    return all.filter((e) => !all.some((d) => d !== e && covers(d, e)));
  };
  cfg.forbiddenRoots.paths = merge(raw.forbiddenRoots.paths, moved, (d, e) => e.startsWith(`${d}/`));
  if (cfg.stalePathLiterals) {
    cfg.stalePathLiterals.paths = merge(raw.stalePathLiterals.paths, moved.map((p) => (isFilePath(p) ? p : `${p}/`)), (d, e) => e.startsWith(d));
  }
  return cfg;
}

/** 検査用の設定（JSON＋repository-paths の旧パス）を読む */
export function loadConfig(path = CONFIG) {
  return withMovedPaths(JSON.parse(readFileSync(path, 'utf8')));
}

/** 検査対象のファイル一覧。全量は追跡下、--staged は追加/変更ぶんだけ。 */
export function listTargets({ staged = false } = {}) {
  const args = staged
    ? ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['-c', 'core.quotepath=false', 'ls-files', '-z'];
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\0').filter(Boolean).map(toPosix);
}

/**
 * 1 ファイルを判定して違反配列を返す（純関数・テストから使う）。
 * @param {string} file リポジトリ相対パス（posix）
 * @param {object} cfg  information-architecture.json
 */
export function auditPath(file, cfg) {
  const out = [];
  if ((cfg.allowlist?.entries ?? []).some((e) => e.path === file)) return out;

  for (const root of cfg.forbiddenRoots.paths) {
    if (file === root || file.startsWith(`${root}/`)) {
      out.push({ rule: 'forbidden-root', file, msg: `廃止した置き場: ${root}/` });
    }
  }

  const d = cfg.docsIsNotContent;
  if (file.startsWith('docs/') && !(d.allowDirs ?? []).some((a) => file.startsWith(`${a}/`))) {
    if (d.denyBasenames.includes(basename(file))) {
      out.push({ rule: 'content-in-docs', file, msg: `制作物のファイル名（${basename(file)}）が docs/ にある。content/ へ移す` });
    } else if (d.denyExtensions.includes(extname(file))) {
      out.push({ rule: 'content-in-docs', file, msg: `制作物の拡張子（${extname(file)}）が docs/ にある。content/ へ移す` });
    }
  }

  const c = cfg.contentIsNotFlow;
  if (file.startsWith('content/')) {
    if (c.denyBasenames.includes(basename(file))) {
      out.push({ rule: 'flow-in-content', file, msg: `台帳・計画のファイル名（${basename(file)}）が content/ にある。.claude/ か docs/ へ移す` });
    }
    for (const p of c.denyPatterns ?? []) {
      if (new RegExp(p).test(file)) {
        out.push({ rule: 'flow-in-content', file, msg: `flow のディレクトリ（${p}）が content/ にある` });
      }
    }
  }
  return out;
}

/**
 * ソース中に残った旧パスの文字列を検出する。
 *
 * **正規表現リテラルの中はスラッシュがエスケープされる**（`/^docs\\/note\\//`）ので、
 * 移行時の素の文字列置換（`docs/note` を探す）では素通りする。2026-08-18 の移行で実際に
 * 18 ファイル 27 箇所が残り、`check-x-igutm --staged` は 1 件も拾わないまま
 * pre-commit で**常に緑**だった。「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）の典型例。
 *
 * @param {string} file リポジトリ相対パス
 * @param {string} source ファイル本文
 * @param {object} cfg information-architecture.json の stalePathLiterals
 */
export function auditStalePathLiterals(file, source, cfg) {
  if (!cfg) return [];
  if ((cfg.allowFiles ?? []).includes(file)) return [];
  if (!(cfg.scanGlobs ?? []).some((g) => file.startsWith(g))) return [];

  const out = [];
  for (const p of cfg.paths) {
    // 素の形とエスケープ形の両方を探す（後者が今回の穴）
    for (const form of [p, p.split('/').join('\\/')]) {
      let i = source.indexOf(form);
      while (i >= 0) {
        out.push({
          rule: 'stale-path-literal',
          file,
          msg: `旧パス "${form}" が残っている（${source.slice(i, i + form.length) === p ? '素の文字列' : '正規表現エスケープ形'}・行 ${source.slice(0, i).split('\n').length}）`,
        });
        i = source.indexOf(form, i + form.length);
      }
    }
  }
  return out;
}

/** 旧ルート ↔ 新ルートの二重 SSOT。両方に同じ相対パスがあれば違反。 */
export function auditDualSsot(pairs, exists = (p) => existsSync(join(ROOT, p))) {
  const out = [];
  for (const { legacy, target } of pairs) {
    if (!exists(legacy)) continue;
    out.push({ rule: 'dual-ssot', file: legacy, msg: `旧ルートが復活している（新ルート: ${target}）` });
  }
  return out;
}

function main() {
  if (process.env.SKIP_INFORMATION_ARCHITECTURE === '1') {
    console.log('[check-information-architecture] SKIP_INFORMATION_ARCHITECTURE=1 のためスキップ');
    process.exit(0);
  }
  const staged = process.argv.includes('--staged');
  const jsonOut = process.argv.includes('--json');

  if (!existsSync(CONFIG)) {
    console.error(`✗ 検査不成立: 設定が無い（${CONFIG}）`);
    process.exit(2);
  }
  let cfg;
  try { cfg = loadConfig(); } catch (e) {
    console.error(`✗ 検査不成立: 設定が壊れている: ${e.message}`);
    process.exit(2);
  }

  const files = listTargets({ staged });
  // 検査ゼロを PASS と呼ばない（§9）。全量で 0 件なら走査が壊れている
  if (!staged && files.length === 0) {
    console.error('✗ 検査不成立: 追跡ファイルが 1 件も取れない');
    process.exit(2);
  }

  const violations = files.flatMap((f) => auditPath(f, cfg));
  violations.push(...auditDualSsot(cfg.dualSsot?.pairs ?? []));

  // ソース中に残った旧パス（正規表現エスケープ形を含む）
  const stale = cfg.stalePathLiterals;
  let scanned = 0;
  if (stale) {
    for (const f of files) {
      if (!(stale.scanGlobs ?? []).some((g) => f.startsWith(g))) continue;
      if (!/\.(mjs|cjs|js|ts|tsx|yml|yaml)$/.test(f)) continue;
      scanned += 1;
      let src;
      try { src = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
      violations.push(...auditStalePathLiterals(f, src, stale));
    }
    // 検査ゼロを PASS と呼ばない: 走査対象が消えていたら止める
    if (!staged && scanned === 0) {
      console.error('✗ 検査不成立: 旧パス走査の対象が 0 件（scanGlobs の設定ミスを疑う）');
      process.exit(2);
    }
  }

  const scope = staged ? `staged ${files.length} 件` : `追跡 ${files.length} 件`;
  // --json のときは stdout を JSON だけにする（人間向けサマリは stderr へ）
  (jsonOut ? console.error : console.log)(
    `[check-information-architecture] ${scope}を実検査 / 違反 ${violations.length}` +
      ` / 禁止ルート ${cfg.forbiddenRoots.paths.length} 種・旧パス走査 ${scanned} ファイル・allowlist ${(cfg.allowlist?.entries ?? []).length} 件`,
  );

  if (jsonOut) {
    writeSync(1, JSON.stringify({ files: files.length, violations }, null, 2) + '\n');
    process.exit(violations.length ? 1 : 0);
  }
  if (violations.length === 0) {
    console.log('[check-information-architecture] ✓ 置き場のモデルへの逆戻りなし');
    process.exit(0);
  }
  for (const v of violations.slice(0, 40)) console.error(`  [${v.rule}] ${v.file}\n      ${v.msg}`);
  if (violations.length > 40) console.error(`  … 他 ${violations.length - 40} 件`);
  console.error('\n置き場の判断フローは .claude/knowledge/reference/information-architecture.md。');
  console.error('正当な例外は .claude/config/information-architecture.json の allowlist へ理由付きで登録する。');
  process.exit(1);
}

// scripts/check-sales-freshness.mjs と同じ isMain ガード（import 時は実行しない）
if (process.argv[1] && toPosix(process.argv[1]).endsWith('check-information-architecture.mjs')) main();
