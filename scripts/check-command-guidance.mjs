#!/usr/bin/env node
// check-command-guidance.mjs — スクリプトが案内するコマンドが実在するかのゲート。
//
// 守りたい事故: **検査が「これを実行しろ」と案内するのに、そのコマンドが動かない。**
// 2026-08-22 に check-asset-storage が `asset-offload --group sns-archived-media --commit` を
// 案内していたが、その group は gitignore 済みで asset-offload は追跡ファイルしか見ないため
// 「対象 0 件」で exit 1 になっていた。案内どおりに動かした人が詰まる。
//
// もう一つは移設の置き去り。ファイルが scripts/ から .claude/scripts/ へ移っても
// usage コメントが旧パスのまま残り、コピーすると Cannot find module になる。
//
// **例示のパスをこのファイルに書かないこと。** 書くとこの検査が自分自身を落とす
// （実際に一度落とした。既存の git-exec-maxbuffer テストが同じ理由で
// フィクスチャを連結して組んでいるのと同じ話）。
//
// 走査対象は **追跡下のファイルだけ**。新規スクリプトは `git add` するまで対象外なので、
// 自分で試すときは add してから実行すること。
//
// 検査するもの（.mjs のソース内の文字列・コメントを問わず）:
//   1. `npm run <name>` の <name> が package.json の scripts に実在するか
//   2. `node <path>.mjs` の <path> が実在するか
//   3. drive-vault-sync の `--pull` の案内が `--commit`（書く）か `--dry-run`（見るだけ）を同じ行に持つか（DN-0631）
//      --pull は既定で dry-run になったので、--commit の無い案内どおりに叩くと何も取り戻さない
//
// 走査の範囲（2026-10-11・DN-0686 で広げた）:
//   - スクリプト: scripts/ と .claude/scripts/ の .mjs（1・2 とも見る）
//   - 正典・手順書: CLAUDE.md・AGENTS.md・.claude/rules・.claude/skills・.claude/knowledge・.claude/agents・docs/ の .md
//     （1 だけ見る。node パスは例示が混ざる）。docs/handoffs・docs/reviews・.claude/todo は時点の記録なので見ない
//   - ワークフロー: .github/workflows の .yml（1・2 とも見る。actionlint はコマンドの実在を見ない）
//   広げる前は scripts・CLAUDE.md・AGENTS.md・commands.md・rules だけで、skills・knowledge に実在しない
//   `npm run` が 7 件（character-frames・youtube-covers ほか）あっても誰にも掛からなかった。
//
// 引数の妥当性（フラグの組み合わせが実際に通るか）までは見ない。そこは各検査の責任。
//
// 使い方: node scripts/check-command-guidance.mjs [--json]
// exit 0 = 健全 / 1 = 壊れた案内あり・検査不成立

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { AREAS } from './lib/datasets.mjs';

const NPM_RUN_RE = /npm run ([a-z0-9][a-z0-9:-]*)/g;
const NODE_PATH_RE = /node ((?:scripts|\.claude\/scripts)\/[A-Za-z0-9._/-]+\.mjs)/g;

/** 正典・手順書として見るディレクトリ（.md）。時点の記録（handoffs・reviews・todo）は入れない。 */
export const DOC_SCOPES = ['.claude/rules', '.claude/skills', '.claude/knowledge', '.claude/agents', 'docs'];
const DOC_EXCLUDE = [/^docs\/handoffs\//, /^docs\/reviews\//];
export const WORKFLOW_SCOPE = '.github/workflows';

function tracked(paths, pred) {
  return execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', ...paths], {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).split('\0').filter((f) => f && pred(f));
}

/**
 * 1 ファイルの案内を抽出して壊れを返す純関数。
 * checkPaths=false なら node パスは見ない（ドキュメントは例示のパスが混ざる）。
 * 同じ壊れは 1 ファイルにつき 1 回だけ数える。
 */
export function findBrokenInSource(file, src, { pkgScripts, exists, checkPaths, kindNpm = 'npm', kindPath = 'path' }) {
  const broken = [];
  let refNpm = 0;
  let refPath = 0;
  const seen = new Set();
  for (const m of src.matchAll(NPM_RUN_RE)) {
    // `auth:ci-<service>`・`check-<name>` のようなプレースホルダは `<` の手前で切れて末尾が - や : になる。案内として数えない
    if (/[-:]$/.test(m[1])) continue;
    refNpm += 1;
    if (pkgScripts[m[1]] || seen.has('n' + m[1])) continue;
    seen.add('n' + m[1]);
    broken.push({ file, kind: kindNpm, ref: 'npm run ' + m[1] });
  }
  if (checkPaths) {
    for (const m of src.matchAll(NODE_PATH_RE)) {
      refPath += 1;
      if (exists(m[1]) || seen.has('p' + m[1])) continue;
      seen.add('p' + m[1]);
      broken.push({ file, kind: kindPath, ref: 'node ' + m[1] });
    }
  }
  return { broken, refNpm, refPath };
}

function main() {
  const JSON_OUT = process.argv.includes('--json');
  const read = (f) => readFileSync(join(REPO_ROOT, f), 'utf8');
  const exists = (rel) => existsSync(join(REPO_ROOT, rel));
  const pkgScripts = JSON.parse(read('package.json')).scripts || {};

  const files = tracked(['scripts', '.claude/scripts'], (f) => f.endsWith('.mjs'));

  // スクリプト同士の案内だけでなく、**人間とエージェントが読む正典・手順書**も見る。
  // 2026-08-30: CLAUDE.md の頻用コマンド表に `npm run serve` が載っていたのに
  // package.json には存在せず、指示どおり叩くと必ず失敗する状態が放置されていた。
  // 2026-09-08: 頻用コマンド表の全量は commands.md へ、領域別の規約は .claude/rules へ分離。
  // 2026-10-11: skills・knowledge・agents・docs も見る（実在しない npm run が 7 件、誰にも掛かっていなかった）。
  const docFiles = [...new Set([
    'CLAUDE.md', 'AGENTS.md',
    ...tracked(DOC_SCOPES, (f) => f.endsWith('.md') && !DOC_EXCLUDE.some((re) => re.test(f))),
  ])].filter((f) => exists(f));
  const workflowFiles = tracked([WORKFLOW_SCOPE], (f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  const broken = [];
  let refNpm = 0;
  let refPath = 0;
  for (const f of files) {
    const r = findBrokenInSource(f, read(f), { pkgScripts, exists, checkPaths: true });
    broken.push(...r.broken); refNpm += r.refNpm; refPath += r.refPath;
  }

  // 正典・手順書の `npm run X` は、コードブロック内の案内も含めて実在を要求する。
  // node パス案内はドキュメントでは例示（プレースホルダ）が混ざるため npm run だけを見る。
  let refDoc = 0;
  for (const f of docFiles) {
    const r = findBrokenInSource(f, read(f), { pkgScripts, exists, checkPaths: false, kindNpm: 'npm-doc' });
    broken.push(...r.broken); refDoc += r.refNpm;
  }

  // ワークフローの run: は人が読む例示ではなく実行文なので、npm run と node パスの両方を見る。
  let refWorkflow = 0;
  for (const f of workflowFiles) {
    const r = findBrokenInSource(f, read(f), { pkgScripts, exists, checkPaths: true, kindNpm: 'npm-workflow', kindPath: 'path-workflow' });
    broken.push(...r.broken); refWorkflow += r.refNpm + r.refPath;
  }

  // 3. --pull の案内（スクリプト・正典・手順書・README・.gitignore の注記）。backlog・handoff・review は経緯の記録、tests は dry-run を確かめる側なので見ない
  const PULL_FLAG = '--' + 'pull';      // 例示をこのファイルに書くと自分自身を落とす（冒頭の注記）
  const pullLines = execFileSync('git', ['-c', 'core.quotepath=false', 'grep', '-n', '-I', '-e', PULL_FLAG, '--',
    '.', ':!.claude/todo/**', ':!docs/handoffs/**', ':!docs/reviews/**', ':!tests/**', `:!${AREAS.state.dir}/**`, ':!scripts/check-command-guidance.mjs'], {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).split('\n').map((line) => /^([^:]+):(\d+):(.*)$/.exec(line)).filter(Boolean)
    .filter(([, , , text]) => /drive-vault-sync/.test(text) && new RegExp(PULL_FLAG + '\\b').test(text));
  let refPull = 0;
  for (const [, file, lineNo, text] of pullLines) {
    refPull += 1;
    if (/--commit|--dry-run/.test(text)) continue;
    broken.push({ file: file + ':' + lineNo, kind: 'pull', ref: PULL_FLAG + ' に --commit が無い（既定は dry-run で何も取り戻さない）' });
  }

  const result = {
    files: files.length, docFiles: docFiles.length, workflowFiles: workflowFiles.length,
    scopes: { docs: ['CLAUDE.md', 'AGENTS.md', ...DOC_SCOPES], workflows: WORKFLOW_SCOPE },
    refNpm, refPath, refDoc, refWorkflow, refPull, broken,
  };
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
  const inconclusive = files.length < 100 || refNpm + refPath < 100 || docFiles.length < 100 || refDoc < 20
    || workflowFiles.length < 10 || refWorkflow < 20 || refPull < 10;
  if (JSON_OUT) {
    console.log(JSON.stringify({ ...result, inconclusive }, null, 2));
  } else {
    console.log('[check-command-guidance] ' + files.length + ' スクリプト + ' + docFiles.length
      + ' 正典・手順書 + ' + workflowFiles.length + ' ワークフローを実検査 / 案内 ' + (refNpm + refPath + refDoc + refWorkflow)
      + ' 件（npm run ' + refNpm + ' / node パス ' + refPath + ' / doc の npm run ' + refDoc + ' / workflow ' + refWorkflow
      + '）/ drive-vault-sync の取り戻しの案内 ' + refPull + ' 件');
    if (inconclusive) console.error('✗ 走査結果が異常に少ない＝抽出が壊れている疑い（検査不成立）');
    for (const b of broken.slice(0, 25)) console.error('  [壊れ] ' + b.file + ': ' + b.ref);
    if (broken.length > 25) console.error('  ... ほか ' + (broken.length - 25) + ' 件');
    if (broken.length === 0 && !inconclusive) {
      console.log('  ✓ 案内されているコマンドはすべて実在する');
    } else if (broken.length) {
      console.error('\n✗ 存在しないコマンドを案内している箇所が ' + broken.length + ' 件');
      console.error('  案内どおりに実行した人が詰まる。移設したら usage も直すこと。');
    }
  }
  process.exitCode = broken.length || inconclusive ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
