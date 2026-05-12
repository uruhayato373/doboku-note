#!/usr/bin/env node
/**
 * notebooklm-cross-query.mjs — 旧 `nlm cross query` 互換ラッパー
 *
 * 実体の NotebookLM CLI は `notebooklm`（Python 製、`~/bin/notebooklm` 経由）で v0.3.4。
 * cross query サブコマンドが存在しないため、本スクリプトが以下を代行する:
 *
 *   1. `notebooklm list --json` で全ノートブック取得
 *   2. --notebooks "A,B,..." を名前マッチング → ID 解決
 *   3. 各ノートブックに対して `notebooklm ask -n <id> --json "QUESTION"` を逐次実行
 *   4. 統一フォーマットで集約出力
 *
 * 旧スキル（notebooklm-research / visual-research / improve-article / quality-cycle）の
 * `nlm cross query --notebooks "A,B" "Q"` 呼び出しを、本スクリプトに差し替えて使用する。
 *
 * Usage:
 *   node .claude/scripts/notebooklm-cross-query.mjs \
 *     --notebooks "総監標準テキスト,記述式問題の模範解答例" \
 *     "「割引率」の定義・背景・試験での問われ方をまとめてください。"
 *
 *   オプション:
 *     --json            集約結果を JSON で返す（既定はテキスト整形）
 *     --notebook-id     名前ではなく ID 直接指定（部分一致対応）
 *
 * 終了コード:
 *   0: 全 notebook で ask 成功
 *   1: 引数エラー / notebooklm CLI 未検出
 *   2: 認証期限切れ
 *   3: 1 つ以上の notebook で ask 失敗
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ~/bin/notebooklm.bat（または notebooklm bash）ラッパー経由を優先。
// 理由: bat 内で activate.bat を呼んで venv の PATH・VIRTUAL_ENV を整え、corporate proxy（HTTPS_PROXY）
// が正しく Python の SSL コンテキストに渡る。venv exe 直叩きでは 503 になる（2026-05-11 検証済）。
const NOTEBOOKLM_BIN = (() => {
  if (process.platform === 'win32') {
    const batPath = join(homedir(), 'bin', 'notebooklm.bat');
    if (existsSync(batPath)) return { path: batPath, useShell: true };
  }
  const bashPath = join(homedir(), 'bin', 'notebooklm');
  if (existsSync(bashPath)) return { path: bashPath, useShell: false };

  // 最終 fallback: venv exe 直叩き（proxy 設定が必要な環境では 503 になる可能性）
  const venvExe = join(homedir(), '.notebooklm-venv', 'Scripts', 'notebooklm.exe');
  if (existsSync(venvExe)) return { path: venvExe, useShell: false };

  return { path: 'notebooklm', useShell: false };
})();

function parseArgs(argv) {
  const args = { notebooks: null, question: null, json: false };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--notebooks') args.notebooks = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: notebooklm-cross-query.mjs --notebooks "A,B,..." "QUESTION" [--json]');
      process.exit(0);
    } else if (a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    } else {
      positional.push(a);
    }
  }
  if (!args.notebooks) {
    console.error('Error: --notebooks "A,B,..." is required');
    process.exit(1);
  }
  if (positional.length !== 1) {
    console.error('Error: exactly one QUESTION positional argument required');
    process.exit(1);
  }
  args.question = positional[0];
  return args;
}

function runNotebooklm(args, opts = {}) {
  // 法人プロキシ / 文字化け回避（~/bin/notebooklm.bat ラッパーと同じ環境）
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    NO_PROXY: process.env.NO_PROXY || 'localhost,127.0.0.1,::1,.local',
  };

  // shell: true で .bat を呼ぶと cmd.exe の引数解析が全角括弧等で破綻するため
  // cmd.exe /c に明示的に渡して spawnSync 側の args 配列管理に統一する
  let cmd, cmdArgs;
  if (NOTEBOOKLM_BIN.useShell && NOTEBOOKLM_BIN.path.endsWith('.bat')) {
    cmd = 'cmd.exe';
    cmdArgs = ['/c', NOTEBOOKLM_BIN.path, ...args];
  } else {
    cmd = NOTEBOOKLM_BIN.path;
    cmdArgs = args;
  }

  const result = spawnSync(cmd, cmdArgs, {
    env,
    encoding: 'utf8',
    shell: false,
    ...opts,
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`Error: '${NOTEBOOKLM_BIN.path}' not found. Install notebooklm CLI or symlink to ~/bin/notebooklm.`);
      process.exit(1);
    }
    throw result.error;
  }
  return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status ?? 0 };
}

function detectAuthExpired(stderr) {
  return /Authentication expired|Run 'notebooklm login'/i.test(stderr);
}

function fetchNotebooks() {
  const { stdout, stderr, code } = runNotebooklm(['list', '--json']);
  const combined = `${stderr}\n${stdout}`;
  if (detectAuthExpired(combined)) {
    console.error('Error: NotebookLM authentication expired. Run `notebooklm login` in your terminal first.');
    process.exit(2);
  }
  // notebooklm v0.3.4 は exit 0 + stdout に { error: true, code, message } 形式の JSON を返すケースあり
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (e) {
    console.error(`notebooklm list failed (exit ${code}):\nstderr: ${stderr}\nstdout: ${stdout}`);
    process.exit(3);
  }
  if (parsed && parsed.error === true) {
    console.error(`notebooklm list returned error: ${parsed.code || ''} ${parsed.message || ''}`);
    process.exit(3);
  }
  if (code !== 0) {
    console.error(`notebooklm list failed (exit ${code}):\n${stderr}`);
    process.exit(3);
  }
  // notebooklm v0.3.4 は { notebooks: [...] } 形式。直接配列を返すバージョンにも対応
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.notebooks)) return parsed.notebooks;
  console.error(`Unexpected notebooklm list output shape:\n${JSON.stringify(parsed).slice(0, 300)}`);
  process.exit(3);
}

function resolveNotebooks(requested, available) {
  const resolved = [];
  for (const name of requested) {
    const exact = available.find((nb) => nb.title === name || nb.name === name || nb.id === name);
    if (exact) {
      resolved.push({ requested: name, id: exact.id, title: exact.title || exact.name || name });
      continue;
    }
    const partial = available.find(
      (nb) =>
        (nb.title && nb.title.includes(name)) ||
        (nb.name && nb.name.includes(name)) ||
        (nb.id && nb.id.startsWith(name)),
    );
    if (partial) {
      resolved.push({ requested: name, id: partial.id, title: partial.title || partial.name || name });
      continue;
    }
    console.error(`Error: notebook "${name}" not found. Available titles:`);
    available.forEach((nb) => console.error(`  - ${nb.title || nb.name || '(no title)'} [${nb.id}]`));
    process.exit(1);
  }
  return resolved;
}

function askNotebook(notebookId, question) {
  const { stdout, stderr, code } = runNotebooklm(['ask', '-n', notebookId, '--json', question]);
  if (code !== 0) {
    if (detectAuthExpired(stderr)) {
      console.error('Error: NotebookLM authentication expired during ask. Run `notebooklm login` first.');
      process.exit(2);
    }
    return { ok: false, error: stderr.trim() || `exit ${code}`, stdout };
  }
  try {
    const parsed = JSON.parse(stdout);
    return { ok: true, response: parsed };
  } catch {
    return { ok: true, response: { answer: stdout.trim(), references: [] } };
  }
}

function formatTextOutput(aggregated, question) {
  const lines = [];
  lines.push(`# notebooklm-cross-query`);
  lines.push(`Question: ${question}`);
  lines.push(`Notebooks queried: ${aggregated.length}`);
  lines.push('');
  for (const item of aggregated) {
    lines.push(`=== Notebook: ${item.title} (id: ${item.id}) ===`);
    if (item.error) {
      lines.push(`ERROR: ${item.error}`);
    } else {
      lines.push(item.response.answer || '(no answer)');
      const refs = item.response.references || item.response.citations || [];
      if (refs.length > 0) {
        // citation_number で deduplicate（同じ source の重複出力を抑制）
        const seen = new Set();
        const unique = [];
        for (const r of refs) {
          const key = r.cited_text || r.title || JSON.stringify(r);
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(r);
        }
        lines.push('');
        lines.push('References:');
        unique.forEach((r, i) => {
          const text = r.cited_text || r.title || r.source_title || r.text || '(no text)';
          const sourceId = r.source_id ? ` source=${r.source_id.slice(0, 8)}` : '';
          lines.push(`  [${i + 1}] ${text}${sourceId}`);
        });
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const requested = args.notebooks.split(',').map((s) => s.trim()).filter(Boolean);
  if (requested.length === 0) {
    console.error('Error: --notebooks must contain at least one notebook name');
    process.exit(1);
  }

  const available = fetchNotebooks();
  const resolved = resolveNotebooks(requested, available);

  const aggregated = [];
  let anyFailure = false;
  for (const nb of resolved) {
    const result = askNotebook(nb.id, args.question);
    if (!result.ok) {
      anyFailure = true;
      aggregated.push({ ...nb, error: result.error });
    } else {
      aggregated.push({ ...nb, response: result.response });
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ question: args.question, results: aggregated }, null, 2));
  } else {
    console.log(formatTextOutput(aggregated, args.question));
  }
  process.exit(anyFailure ? 3 : 0);
}

main();
