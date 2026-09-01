#!/usr/bin/env node
/**
 * check-workflow-hygiene.mjs — GitHub Actions workflow の静的ハードニングゲート（DN-0109 Phase 2）。
 *
 * 背景: `.github/workflows/*.yml` は 24 本あるが、走っているかどうか（check-workflow-health）と
 * 落ちたら鳴るか（automation-failure）しか機械が見ていなかった。以下は静的に決まるのに
 * 誰も検査していなかった:
 *
 *   1. actionlint 違反（構文・式の安全でない参照など）
 *   2. permissions の未宣言（既定は組織設定次第で write を含みうる）
 *   3. timeout-minutes の未宣言（暴走 job が runner を専有し続ける）
 *   4. 3rd party action がタグ（@v5 等）のまま＝ tag は force-push で差し替え可能
 *      （サプライチェーン攻撃で CI が汚染される。commit SHA 固定が対策）
 *
 * actionlint は Go 実装だが npm パッケージ（WASM ビルド・`actionlint`）で完結する
 * （バイナリの別途インストール不要・CI/ローカル共通）。
 *
 * Usage:
 *   node scripts/check-workflow-hygiene.mjs
 *   node scripts/check-workflow-hygiene.mjs --json
 *
 * exit: 0 健全 / 1 違反あり / 2 検査不成立（走査対象 0 件・actionlint 読み込み失敗）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLinter } from 'actionlint';
import { load } from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = join(ROOT, '.github/workflows');
const JSON_OUT = process.argv.includes('--json');
const TAG = '[check-workflow-hygiene]';

/**
 * SHA 固定を免除する action。frontier: 自組織アクション・ローカル action・docker action は
 * タグ運用でも供給元がリポジトリ自身または既に別統制下にあるため対象外。
 * 新しい 3rd party action を追加したら、SHA 固定した上でここには入れない。
 */
const PIN_EXEMPT = new Set([]);

function listWorkflowFiles() {
  return readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
}

/** action 参照が commit SHA（40桁 hex）で固定されているかを判定する。 */
function isPinned(ref) {
  const at = ref.lastIndexOf('@');
  if (at === -1) return true; // ローカル action (./path) 等
  const version = ref.slice(at + 1);
  return /^[0-9a-f]{40}$/.test(version);
}

/**
 * workflow の全 job / 全 step から `run:` の中身だけを集める。
 * コメント行やプロンプト本文を判定材料にしないための前処理。
 */
function collectRunScripts(content) {
  let doc;
  try { doc = load(content); } catch { return []; }
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.run === 'string') out.push(step.run);
    }
  }
  return out;
}

/**
 * 6. 行継続の潰れ。`cmd \` + 改行 で書くつもりの引数列が、YAML 上でリテラル `\n`（バックスラッシュ
 *    + 文字 n）1 行に潰れている形を検出する。bash は未クォートの `\n` を `n` 1 文字に解釈するので
 *    argv に余分な `n` が混ざる。report-automation-failure.mjs の indexOf ベースのパーサが偶然無視
 *    して動いていたため 3 箇所（uptime-ping / weekly-review-guard ×2）が 2026-09-01 まで気づかれなかった。
 *    判定は run: の中身だけ（printf '%s\n' --x のように `\n` の直後がクォートなら該当しない）。
 */
export function findCollapsedContinuations(runScript) {
  const hits = [];
  const re = /\\n[ \t]+--[A-Za-z]/g;
  const lines = String(runScript ?? '').split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 80) });
    re.lastIndex = 0;
  });
  return hits;
}

async function main() {
  const files = listWorkflowFiles();
  let hookCommitScanned = 0;
  if (files.length === 0) {
    console.error(`${TAG} FAIL: workflow ファイルが 0 件（走査不成立）`);
    process.exit(2);
  }

  let linter;
  try {
    linter = await createLinter();
  } catch (e) {
    console.error(`${TAG} FAIL: actionlint の読み込みに失敗 — ${e.message}`);
    process.exit(2);
  }

  const violations = [];
  let jobCount = 0;
  let usesCount = 0;

  for (const file of files) {
    const path = join(WORKFLOW_DIR, file);
    // job ブロックの判定は `\n` 固定の regex を使う。autocrlf の作業ツリー（Windows）では
    // 行末に `\r` が残って **25 本すべてが不一致**になり、timeout-minutes を宣言済みの
    // workflow まで違反として報告していた（2026-08-31 実測。Linux CI では再現しない）。
    // 読み込みの一箇所で LF に揃える。
    const content = readFileSync(path, 'utf8').split('\r\n').join('\n');

    // 1. actionlint
    for (const r of linter(content, file)) {
      violations.push({ file, kind: 'actionlint', line: r.line, message: r.message });
    }

    // 2. permissions（top-level か、全 job に個別宣言があれば可）
    const hasTopPermissions = /^permissions:/m.test(content);
    const jobBlocks = content.split(/^jobs:/m)[1] || '';
    const jobNames = Array.from(jobBlocks.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)).map((m) => m[1]);
    jobCount += jobNames.length;
    if (!hasTopPermissions) {
      // job 単位の permissions が全 job にあるかを緩く確認（無ければ違反）
      const perJobOk =
        jobNames.length > 0 && jobNames.every((name) => new RegExp(`^  ${name}:\\n(?:.*\\n)*?    permissions:`, 'm').test(jobBlocks));
      if (!perJobOk) violations.push({ file, kind: 'permissions', line: 0, message: 'permissions が top-level にも全 job にも無い' });
    }

    // 3. timeout-minutes（top-level は無効な key なので job 単位のみ有効。全 job にあるかを見る）
    const perJobTimeout =
      jobNames.length > 0 && jobNames.every((name) => new RegExp(`^  ${name}:\\n(?:.*\\n)*?    timeout-minutes:`, 'm').test(jobBlocks));
    if (jobNames.length > 0 && !perJobTimeout) {
      violations.push({ file, kind: 'timeout-minutes', line: 0, message: '一部 job に timeout-minutes が無い（暴走時に runner を専有し続ける）' });
    }

    // 4. SHA pinning
    for (const m of content.matchAll(/^\s*uses:\s*(\S+)/gm)) {
      const ref = m[1];
      usesCount++;
      if (ref.startsWith('./') || ref.startsWith('docker://')) continue; // ローカル/docker action は対象外
      if (PIN_EXEMPT.has(ref)) continue;
      if (!isPinned(ref)) {
        violations.push({ file, kind: 'sha-pin', line: 0, message: `${ref} がタグ参照のまま（commit SHA 固定が必要）` });
      }
    }

    // 5. commit する workflow は doc-meta-index を用意しているか。
    //    npm ci（--ignore-scripts なし）は prepare で pre-commit フックを入れる。そのフックの
    //    check-x-campaign-plan 等が git 追跡外の src/config/doc-meta-index.json を直接読むので、
    //    生成ステップが無いと **commit の瞬間に ENOENT で落ちる**。本来の処理が終わっていても
    //    記録が残らず、ワークフロー全体が赤になる。
    //    e2e.yml（2026-08-22〜）と psi-audit.yml（〜2026-08-30）が実際にこれで死んでいた。
    //    同じ穴が 7 本に残っていたので静的に止める。
    // 判定は**実際の run: の中身**だけで行う。生テキストを regex すると、コメントや
    // プロンプト本文の「npm ci を実行しない」という記述まで拾って誤検知する
    // （gsc-auto-review.yml と link-audit.yml で実際に踏んだ）。
    const runScripts = collectRunScripts(content);
    const installsHooks =
      runScripts.some((r) => /npm (ci|install)/.test(r) && !/--ignore-scripts/.test(r));
    const commits = runScripts.some((r) => /git commit/.test(r));
    if (installsHooks && commits && !/build-doc-meta-index/.test(content)) {
      hookCommitScanned++;
      violations.push({
        file, kind: 'doc-meta-index', line: 0,
        message: 'npm ci で pre-commit フックが入り git commit もするのに、'
          + 'doc-meta-index の生成ステップが無い（commit 時に ENOENT で落ちる）。'
          + '`- run: node .claude/scripts/build-doc-meta-index.mjs --ci` を npm ci の直後へ',
      });
    } else if (installsHooks && commits) {
      hookCommitScanned++;
    }

    // 6. 行継続の潰れ（findCollapsedContinuations 参照）
    for (const script of runScripts) {
      for (const h of findCollapsedContinuations(script)) {
        violations.push({
          file, kind: 'collapsed-continuation', line: 0,
          message: `run: 内でリテラル \\n に潰れた行継続がある（bash では引数 "n" になる）: ${h.text}`
            + ' → `\\` + 改行 + インデント で書き直す（ci.yml の report-automation-failure 呼び出しが見本）',
        });
      }
    }
  }

  const result = { check: 'workflow-hygiene', filesScanned: files.length, jobsScanned: jobCount, usesScanned: usesCount, hookCommitScanned, violations };

  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(violations.length ? 1 : 0);
  }

  console.log(`${TAG} workflow ${files.length} 本 / job ${jobCount} 件 / uses 参照 ${usesCount} 件を実検査`
    + `（うち フック有効で commit する ${hookCommitScanned} 本の doc-meta-index も確認）`);
  if (violations.length === 0) {
    console.log(`${TAG} ✓ actionlint / permissions / timeout-minutes / SHA固定 / doc-meta-index / 行継続 いずれも違反なし`);
    process.exit(0);
  }
  for (const v of violations) {
    console.error(`${TAG} ✗ [${v.kind}] ${v.file}${v.line ? ':' + v.line : ''} — ${v.message}`);
  }
  console.error(`${TAG} FAIL: ${violations.length} 件`);
  process.exit(1);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) main();
