#!/usr/bin/env node
// check-asset-reentry.mjs — R2 へ退避済みのファイルが `git add -f` 等で再追跡されるのを検知する
// pre-commit 専用の軽量ゲート（DN-0156）。
//
// なぜ既存の2ゲートでは足りないか（2026-08-29 の逆行テストで実測）:
//   `check-git-binary-policy --staged` は denyRule/sizeLimit 等の「置き場の正しさ」を見るだけで、
//   「この特定ファイルは既に退避済みか」は知らない。退避済み ogp.png を `git add -f` しても
//   サイズ・拡張子・magic bytes が正常な PNG である限り違反として拾われない。
//   `check-asset-storage` は「Git 追跡中のファイルは正常（追跡すべきものが追跡されている）」を
//   前提にした整合チェックであり、kindle-dist のように意図的に Git 併存させる group があるため、
//   追跡そのものを異常とは判定できない。
//   結果、退避済みファイルの意図しない再追跡は .gitignore だけが頼りになっていた
//   （`git add -f` は .gitignore を無視する）。
//
// 検査ロジック:
//   1. staged blob 一覧を取得（--diff-filter=ACMR）
//   2. asset-storage.json の各 group（kindle-dist を除く）の pathRegex に staged パスがマッチするか確認
//   3. マッチしたパスが manifest.json の entries に存在する（＝過去に退避された実績がある）か確認
//   4. 存在すれば FAIL（退避済みファイルの再追跡）
//
// 除外リスト（COEXIST_WITH_GIT）の由来: かつて kindle-dist が「バックアップ目的で R2 に複製しつつ、
// Git 追跡も意図的に維持する」設計（DN-0151(3)決着）だった。R2 側スキーマには「Git 併存を許すか」を表す
// 専用フィールドが無いのでハードコードで対応していた。2026-09-05 に kindle-dist は Drive vault へ移り
// （drive-vault.json は coexistWithGit を持つ）、現在は空。
//
// 使い方:
//   node scripts/check-asset-reentry.mjs --staged   # pre-commit 用（staged diff のみ）
//   node scripts/check-asset-reentry.mjs --all      # CI 用（HEAD 全体を走査・--no-verify や
//                                                    # マージでの取りこぼしを検知する防御層）
//
// exit 0 = 再追跡なし / exit 1 = 再追跡を検知 or 検査不成立
//
// 設定: .claude/config/asset-storage.json
// 台帳: .claude/state/assets/manifest.json
// 起票カード: .claude/todo/backlog.md の DN-0156

import { execFileSync } from 'node:child_process';
import { loadConfig, loadManifest } from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

/** Git 追跡を意図的に維持する group（DN-0151(3)決着）。退避済み＝再追跡異常の対象から除く。 */
// 2026-09-05: kindle-dist は Drive vault（drive-vault.json・coexistWithGit）へ移り asset-storage.json から消えたので空。
// 機構は残す（R2 側に Git 併存 group が再び現れたときのため）。
const COEXIST_WITH_GIT = [];

// core.quotepath=false は必須。日本語ディレクトリが 8 進エスケープされると
// pathRegex 判定も manifest キー照合も静かに外れる（memory: note-lint-quotepath-bypass）。
const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024,
  });

/** staged で追加・変更されたパス一覧（削除は対象外＝--diff-filter=ACMR）。 */
function stagedPaths() {
  return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
}

/** HEAD が追跡する全パス一覧（CI 用・--no-verify やマージでの取りこぼしを検知する）。 */
function headPaths() {
  return git(['ls-files']).split('\n').filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  const STAGED = argv.includes('--staged');
  const ALL = argv.includes('--all');

  // モード必須。無引数で「何もしないまま exit 0」にすると「検査していないのに緑」になるので、
  // 明示的に FAIL にする（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
  if (!STAGED && !ALL) {
    console.error('[check-asset-reentry] FAIL: --staged（pre-commit 用）または --all（CI 用）のどちらかが必須');
    process.exit(1);
  }

  let cfg;
  let manifest;
  try {
    cfg = loadConfig();
    manifest = loadManifest();
  } catch (e) {
    console.error('[check-asset-reentry] FAIL: ' + e.message);
    process.exit(1);
  }

  const groups = (cfg.groups || []).filter((g) => !COEXIST_WITH_GIT.includes(g.id));
  const mode = STAGED ? '--staged' : '--all';
  const paths = STAGED ? stagedPaths() : headPaths();

  // 「検査対象0件」（staged/HEAD が空）と「検査したが該当0件」を区別して出力する。
  if (paths.length === 0) {
    console.log('[check-asset-reentry ' + mode + '] 対象 0 件（検査対象なし）');
    console.log('[check-asset-reentry] ✓ 退避済みファイルの再追跡なし');
    return;
  }

  if (groups.length === 0) {
    console.error('[check-asset-reentry] FAIL: asset-storage.json に検査対象の group が無い（kindle-dist を除いて 0 件）。検査不成立。');
    process.exit(1);
  }

  const violations = [];
  let groupMatched = 0;
  for (const p of paths) {
    const hitGroup = groups.find((g) => new RegExp(g.match.pathRegex).test(p));
    if (!hitGroup) continue;
    groupMatched++;
    if (manifest.entries?.[p]) {
      violations.push({ path: p, group: hitGroup.id });
    }
  }

  console.log('[check-asset-reentry ' + mode + '] 対象 ' + paths.length + ' 件中 group 一致 ' + groupMatched + ' 件を実検査');

  if (!violations.length) {
    console.log('[check-asset-reentry] ✓ 退避済みファイルの再追跡なし');
    return;
  }

  console.error('[check-asset-reentry] FAIL: R2 へ退避済みのファイルが再追跡されようとしている（' + violations.length + ' 件）');
  for (const v of violations) {
    console.error('  [' + v.group + '] ' + v.path);
  }
  console.error('  対処: このファイルは既に R2 へ退避されています。再追跡が意図的でなければ');
  console.error('        `git restore --staged <path>` で取り消してください。');
  console.error('        意図的に git 管理へ戻す場合は manifest.json から該当エントリを削除し、');
  console.error('        asset-storage.json の group 定義を見直してください。');
  process.exit(1);
}

// import 時に CLI を走らせない（将来テストを純関数化する余地を残す）。
if (process.argv[1] && process.argv[1].endsWith('check-asset-reentry.mjs')) main();
