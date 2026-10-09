#!/usr/bin/env node
// agent-hook — Claude Code と Codex の hook 入口（純 Node・shell 非依存）。
//
//   node scripts/hooks/agent-hook.mjs <name>
//     check-doc-sync           PreToolUse(Bash)   `git commit` のとき台帳/決定文書/新ツールの同期を促す＋check-policy-anchors --staged
//     check-cd-scope           PreToolUse(Bash)   括弧の外の cd で worktree・プロジェクトの下の階層へ移るなら exit 2（Claude Code だけ）
//     check-mojibake           PostToolUse(Write|Edit)  .mdx に U+FFFD があれば exit 2（stderr がモデルへ返る）
//     check-stray-files        Stop               リポジトリ直下の一時ファイルを警告
//     check-disk-hygiene       Stop               check-disk-hygiene.mjs --quick --stop を stderr へ
//     check-capture            Stop               最後の報告に未確認・未対応があるのに DN-#### が無ければ 1 セッション 1 回だけ止めて起票を促す
//     decision-doc-checkpoint  PreCompact/SessionEnd  決定/ポリシー文書の未コミット変更を列挙
//
// 入力は stdin の JSON（tool_input.command / tool_input.file_path）。env（CLAUDE_TOOL_INPUT / TOOL_INPUT_FILE_PATH）は
// フォールバック。リポジトリルートはこのファイルの位置から決める（cwd や git に依存しない＝worktree でも正しい）。
// 判定は scripts/lib/agent-hooks.mjs（純粋）。advisory は常に exit 0、ブロックするのは check-mojibake・check-cd-scope（exit 2）と
// check-capture（stdout の decision:block・1 セッション 1 回）だけ。
//
// 呼び手: .claude/settings.json（正典）と .codex/hooks.json（sync-codex-compat が生成）。両方とも相対パスで呼ぶ。

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import {
  STRAY_GLOBS,
  captureMarkers,
  captureReason,
  cdScopeMessage,
  cdScopeViolation,
  classifyStaged,
  decisionDocsChanged,
  docSyncMessages,
  finalAssistantText,
  hasReplacementChar,
  isGitCommitCommand,
  isMdxPath,
  needsCapture,
  parseHookInput,
  parseNameStatus,
  shellAssignments,
  strayAtRoot,
  topLevelCdTargets,
} from '../lib/agent-hooks.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]$/, '');

function readStdin() {
  if (process.stdin.isTTY) return '';
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// フックは全セッションのイベントごとに走る。status/diff が index を書き直すと、並行する merge・commit と
// index.lock を取り合い、Windows では「could not write index / stash failed」や lock の残骸になる（2026-09-28）。
// 読み取り専用なので optional lock（index の自動書き直し）を切る。
const GIT_ENV = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: GIT_ENV });
  } catch {
    return '';
  }
}

const err = (lines) => {
  for (const l of lines) process.stderr.write(l + '\n');
};

const HANDLERS = {
  'check-doc-sync'({ command }) {
    if (!isGitCommitCommand(command)) return 0;
    const staged = parseNameStatus(git(['diff', '--cached', '--name-status']));
    if (!staged.length) return 0;
    const handoffDir = join(ROOT, 'docs', 'handoffs');
    const activeHandoffs = existsSync(handoffDir) ? readdirSync(handoffDir).filter((f) => f.endsWith('.md')).length : 0;
    const lines = docSyncMessages(classifyStaged(staged), activeHandoffs);
    if (lines.length) process.stdout.write('\n' + lines.join('\n') + '\n\n');
    // ポリシークラスタ（決定が複数文書に散在）の横展開もれを決定的に提示する
    spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-policy-anchors.mjs'), '--staged'], { cwd: ROOT, stdio: ['ignore', 'inherit', 'ignore'] });
    return 0;
  },

  'check-cd-scope'({ command, cwd }) {
    // 作業ディレクトリが Bash の呼び出しをまたいで残るのは Claude Code。CLAUDE_PROJECT_DIR が無い呼び手（Codex）では止めない
    const projectDir = process.env.CLAUDE_PROJECT_DIR;
    if (!projectDir) return 0;
    const vars = shellAssignments(command);
    for (const target of topLevelCdTargets(command)) {
      const reason = cdScopeViolation(target, { cwd: cwd || process.cwd(), projectDir, home: process.env.HOME || '', vars });
      if (reason) {
        err([cdScopeMessage(target, reason, projectDir)]);
        return 2;
      }
    }
    return 0;
  },

  'check-mojibake'({ filePath }) {
    if (!isMdxPath(filePath)) return 0;
    const abs = resolve(ROOT, filePath);
    if (!existsSync(abs)) return 0;
    if (hasReplacementChar(readFileSync(abs, 'utf8'))) {
      err([`BLOCK: MDXファイルに文字化け(U+FFFD)を検出: ${filePath}`]);
      return 2;
    }
    return 0;
  },

  'check-stray-files'() {
    const listed = git(['ls-files', '--others', '--exclude-standard', '--', ...STRAY_GLOBS]) + '\n' + git(['ls-files', '--others', '--ignored', '--exclude-standard', '--', ...STRAY_GLOBS]);
    const stray = strayAtRoot(listed.split(/\r?\n/));
    if (!stray.length) return 0;
    err(['', '⚠️  リポジトリ直下に一時ファイルが残っています:', ...stray.map((s) => `    ${s}`), '', '    → 次回から .tmp/ 配下に出してください（詳細: .tmp/README.md）', '    → 不要なら: rm <ファイル名>  または  rm .tmp/*', '']);
    return 0;
  },

  'check-disk-hygiene'() {
    // 毎ターン鳴るので --stop で「いま効く 2 件」（空き逼迫・マージ済み worktree）に絞る。掃除の実体は日次（launchd / schtasks）
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'check-disk-hygiene.mjs'), '--quick', '--stop'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (r.stdout) process.stderr.write(r.stdout);
    return 0;
  },

  'check-capture'({ json }) {
    // block で続けた後の Stop（stop_hook_active）では止めない。止めるのは 1 セッション 1 回（印は OS の一時ディレクトリ）
    if (!json || json.stop_hook_active) return 0;
    const session = String(json.session_id || json.transcript_path || '').replace(/[^A-Za-z0-9_-]/g, '').slice(-64);
    if (!session) return 0;
    const flag = join(tmpdir(), `doboku-capture-${session}.flag`);
    if (existsSync(flag)) return 0;
    let text = typeof json.last_assistant_message === 'string' ? json.last_assistant_message : '';
    if (!text && json.transcript_path && existsSync(json.transcript_path)) text = finalAssistantText(readFileSync(json.transcript_path, 'utf8'));
    if (!needsCapture(text)) return 0;
    writeFileSync(flag, new Date().toISOString());
    process.stdout.write(JSON.stringify({ decision: 'block', reason: captureReason(captureMarkers(text)) }));
    return 0;
  },

  'decision-doc-checkpoint'() {
    const changed = decisionDocsChanged(git(['status', '--porcelain']));
    if (!changed.length) return 0;
    process.stdout.write(
      ['', '【締め切りチェック｜決定/ポリシー文書の横展開】', '  次のファイルに未コミット変更があります。同じ決定を載せる並行SoT（ADR / skill / checklist / 戦略SoT）が', '  一貫しているか、締める前に /doc-sync または `npm run check-policy-anchors` で横断確認してください。', ...changed.map((p) => `    ${p}`), ''].join('\n') + '\n',
    );
    return 0;
  },
};

export const HOOK_NAMES = Object.keys(HANDLERS);

function main() {
  const name = process.argv[2];
  if (!name || !HANDLERS[name]) {
    process.stderr.write(`usage: node scripts/hooks/agent-hook.mjs <${HOOK_NAMES.join('|')}>\n`);
    return name ? 1 : 0;
  }
  const input = parseHookInput(readStdin(), process.env);
  try {
    return HANDLERS[name](input);
  } catch (e) {
    // hook の内部エラーで正規の操作を止めない（安全側）
    process.stderr.write(`[agent-hook ${name}] ${e.message}\n`);
    return 0;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exit(main());
