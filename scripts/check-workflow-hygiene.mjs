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
import { fileURLToPath } from 'node:url';
import { createLinter } from 'actionlint';

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

async function main() {
  const files = listWorkflowFiles();
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
    const content = readFileSync(path, 'utf8');

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
  }

  const result = { check: 'workflow-hygiene', filesScanned: files.length, jobsScanned: jobCount, usesScanned: usesCount, violations };

  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(violations.length ? 1 : 0);
  }

  console.log(`${TAG} workflow ${files.length} 本 / job ${jobCount} 件 / uses 参照 ${usesCount} 件を実検査`);
  if (violations.length === 0) {
    console.log(`${TAG} ✓ actionlint / permissions / timeout-minutes / SHA固定 いずれも違反なし`);
    process.exit(0);
  }
  for (const v of violations) {
    console.error(`${TAG} ✗ [${v.kind}] ${v.file}${v.line ? ':' + v.line : ''} — ${v.message}`);
  }
  console.error(`${TAG} FAIL: ${violations.length} 件`);
  process.exit(1);
}

main();
