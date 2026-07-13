#!/usr/bin/env node
// スキル / エージェント / docs 内の「リポジトリ内ファイルへのパス参照」が実在するかを検証する。
//
// 背景: ドキュメントを移動・リネーム・統廃合すると、それを参照していた
// スキル(.claude/skills/**/*.md)・エージェント(.claude/agents/**/*.md)・他 docs の
// パスが黙って壊れる。2026-06-11 の docs SSOT 再整理で、過去の番号体系変更から
// 蓄積した壊れ参照が 13 件・10 ファイルに残存していたことが判明（note 計画パスの
// 分割だけでなく 00_プロジェクト管理/ 等の旧トップ階層も含む）。
// 人手で追うと必ず漏れるため、壊れた doc 参照を機械検知してコミットを止める。
//
// 検査対象（ソース側）: .claude/skills/**/*.md, .claude/agents/**/*.md, docs/**/*.md, CLAUDE.md
// 検査対象（参照先）  : docs/... .claude/... src/... で始まり拡張子を持つファイルパス
//
// 使い方:
//   node scripts/check-doc-refs.mjs           # 全体を検証（CI / 手動）
//   node scripts/check-doc-refs.mjs --staged  # git staged の対象 .md だけ検証（pre-commit 用）
// broken が 1 件でもあれば exit 1。同名ファイルが他所に在れば移動先候補を提案する。
//
// 例示パスはプレースホルダで書けば自動スキップされる:
//   {slug} / {magazine} / <year> / YYYY-Www / r0X / R0X / d-xx（Kindle 本 ID）/ ... / *（ワイルドカード）
// 廃止台帳・移行履歴など「死んだパスを記録として残す」行は行末に <!-- doc-ref:ignore --> を付ける。

import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');

// 参照先として認める拡張子。本ガードは「ドキュメント SSOT ポインタの破損」に焦点を絞り、
// .md / .mdx の相互参照のみを検証する（誤検知ゼロを最優先）。
// 理由: コード参照(src/*.tsx 等)は build/type-check/lint が、ランタイム生成 state(.claude/state/*.json)は
// 生成タイミング依存で実在しないことが正当なため、ここでは扱わない（別系統）。mdx>md の順で境界バグ回避。
const EXT = 'mdx|md';
// docs/ .claude/ src/ で始まり、区切り文字以外を貪欲に取り、拡張子で終わるパス。
// 拡張子の直後がパス文字でないこと（.ts が .tsx の途中で切れる等を防ぐ）を境界で保証。
const RE_REF = new RegExp(
  String.raw`(?:docs|src|\.claude)\/[^\s\`"'()（）\[\]「」、。,:|*＊]+\.(?:${EXT})(?![A-Za-z0-9])`,
  'g'
);
// 移動先候補が無意味になる汎用ファイル名（提案を抑制）
const GENERIC_BASENAMES = new Set(['SKILL.md', 'README.md', 'article.md', '_schema.md', 'index.md']);

// プレースホルダ（例示パス）を含む参照はスキップ
function isPlaceholder(p) {
  if (/[{}<>｛｝*＊]/.test(p)) return true;
  if (/\.\.\.|…/.test(p)) return true;
  if (/YYYY|Www|<year>|<slug>/.test(p)) return true;
  if (/(?:^|[/_-])(?:r0X|R0X|R0Y|rXX|RXX|NN|XX)(?:[/_.-]|$)/.test(p)) return true;
  // Kindle 本 ID のプレースホルダ（例: docs/kindle/d-xx/front-matter.md）。
  // D 系（技術士一次・科目別）は d-NN の連番、未確定枠は d-xx で書かれる。
  if (/(?:^|[/_-])[a-d]-(?:xx|nn)(?:[/_.-]|$)/i.test(p)) return true;
  return false;
}

// 別チェックアウト（git worktree）は歩かない。実体の重複インデックス化に加え、
// 内部の Chrome ランタイム等の壊れた symlink を statSync が辿って ENOENT で落ちる。
const WALK_IGNORE = new Set(['node_modules', '.git', '.claude/worktrees']);

function walk(dir, out = [], re = /\.md$/) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (WALK_IGNORE.has(p.split('\\').join('/'))) continue;
    // lstat で symlink を辿らない（壊れた symlink でも落ちない）
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, out, re);
    else if (re.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

// ソースファイル集合
let files;
if (STAGED) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  files = staged.filter((f) => existsSync(f) && /\.md$/.test(f) && (
    f.startsWith('.claude/skills/') ||
    f.startsWith('.claude/agents/') ||
    f.startsWith('docs/') ||
    f === 'CLAUDE.md'
  ));
} else {
  files = [
    ...walk('.claude/skills'),
    ...walk('.claude/agents'),
    ...walk('docs'),
    ...(existsSync('CLAUDE.md') ? ['CLAUDE.md'] : []),
  ];
}

// point-in-time 記録（当時のパスを参照する歴史的文書）はソースから除外:
//   docs/handoffs/** = 日付付きセッション引き継ぎ / docs/reviews/** = 週次スナップショット
//   docs/sns/**      = 投稿アーカイブ（/docs/ リンクの実在検証は check-sns-urls.mjs が担当）
const EXCLUDE_SRC = ['docs/handoffs/', 'docs/reviews/', 'docs/sns/'];
files = files.filter((f) => !EXCLUDE_SRC.some((pre) => f.startsWith(pre)));

// 移動先提案用: リポジトリ内 docs/ .claude/ src/ の全ファイルの basename → パス
const indexRoots = ['docs', '.claude', 'src'];
const byBasename = new Map();
for (const root of indexRoots) {
  for (const f of walk(root, [], /.*/)) {
    const b = basename(f);
    if (!byBasename.has(b)) byBasename.set(b, []);
    byBasename.get(b).push(f);
  }
}

const problems = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    // 廃止台帳・移行履歴など「死んだパスを記録として載せる」行は明示マーカーで除外
    if (line.includes('<!-- doc-ref:ignore -->')) return;
    let m;
    RE_REF.lastIndex = 0;
    while ((m = RE_REF.exec(line)) !== null) {
      const ref = m[0];
      if (isPlaceholder(ref)) continue;
      if (existsSync(ref)) continue;
      // ランタイム生成物 / ephemeral / マシン固有 は参照先として実在しなくても正当（壊れではない）:
      //   .claude/state/**   = スキル/エージェントが生成する state・人間向け出力（review-queue.md 等）
      //   .claude/plans/**   = Claude Code の一時プランファイル
      //   .claude/projects/**= memory（各 PC ローカル、リポジトリ管理外）
      if (/^\.claude\/(state|plans|projects)\//.test(ref)) continue;
      // docs/handoffs/** = point-in-time 記録（extract→削除の運用・2026-07-11〜）。
      // 過去 handoff への出典引用は削除済みでも正当（記録は git 履歴）。information-architecture.md「handoff のライフサイクル」と整合。
      if (/^docs\/handoffs\//.test(ref)) continue;
      const base = basename(ref);
      const cand = GENERIC_BASENAMES.has(base) ? [] : (byBasename.get(base) || []);
      const hint = cand.length === 1 ? `→ 移動先候補: ${cand[0]}`
        : cand.length > 1 ? `→ 同名複数: ${cand.slice(0, 4).join(' / ')}${cand.length > 4 ? ' …' : ''}`
        : '→ 同名ファイルなし（削除済み or 名称変更。参照を更新 or 除去）';
      problems.push(`${f}:${i + 1}  ${ref}  ${hint}`);
    }
  });
}

if (problems.length) {
  console.error(`[check-doc-refs] ✗ 実在しないファイル参照 ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n対処: 移動先へ参照を更新するか、削除済みなら参照を除去する。');
  console.error('      例示パスは {slug} / YYYY-Www / r0X 等のプレースホルダで書けばスキップされる。');
  console.error('      ルール: docs/reference/information-architecture.md「SSOT と参照規律」');
  process.exit(1);
}
console.log(`[check-doc-refs] ✓ ${files.length} ファイルのリポジトリ内パス参照は全て実在`);
