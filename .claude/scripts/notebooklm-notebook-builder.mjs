#!/usr/bin/env node
/**
 * NotebookLM Notebook Builder — 汎用 notebook/source 操作 CLI
 *
 * `notebooklm` CLI を cmd.exe /c 経由で spawn し、JSON 出力をパースして高レベル操作を提供。
 * 既存 `notebooklm-cross-query.mjs` の runNotebooklm パターンと共通の認証期限・proxy 設定を踏襲。
 *
 * Subcommands:
 *   find-or-create <name>                              既存 notebook を探す、無ければ作成。stdout に notebook ID
 *   list-sources --notebook <name-or-id> [--json]      指定 notebook の source 一覧
 *   add-source --notebook <name-or-id> --file <path> --title <title> [--wait-timeout 180]
 *                                                       source 投入 + 完了待ち
 *   delete-source --notebook <name-or-id> --title <title>
 *                                                       title 一致の source を削除
 *   bulk-add --notebook <name-or-id> --manifest <file.json> [--skip-existing]
 *                                                       manifest [{ file, title }, ...] を順次投入
 *
 * 終了コード:
 *   0  成功
 *   1  引数エラー / 入力ファイル不在
 *   2  認証期限切れ（`notebooklm login` で再認証要）
 *   3  CLI エラー（503 等）
 *   4  source 処理失敗 / timeout
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

const NOTEBOOKLM_BIN = (() => {
  if (process.platform === 'win32') {
    const bat = join(homedir(), 'bin', 'notebooklm.bat');
    if (existsSync(bat)) return { path: bat, useShell: true };
  }
  const bash = join(homedir(), 'bin', 'notebooklm');
  if (existsSync(bash)) return { path: bash, useShell: false };
  const venvExe = join(homedir(), '.notebooklm-venv', 'Scripts', 'notebooklm.exe');
  if (existsSync(venvExe)) return { path: venvExe, useShell: false };
  return { path: 'notebooklm', useShell: false };
})();

function runNotebooklm(args) {
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    NO_PROXY: process.env.NO_PROXY || 'localhost,127.0.0.1,::1,.local',
  };
  let cmd, cmdArgs;
  if (NOTEBOOKLM_BIN.useShell && NOTEBOOKLM_BIN.path.endsWith('.bat')) {
    cmd = 'cmd.exe';
    cmdArgs = ['/c', NOTEBOOKLM_BIN.path, ...args];
  } else {
    cmd = NOTEBOOKLM_BIN.path;
    cmdArgs = args;
  }
  const result = spawnSync(cmd, cmdArgs, { env, encoding: 'utf8', shell: false });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`Error: '${NOTEBOOKLM_BIN.path}' not found.`);
      process.exit(1);
    }
    throw result.error;
  }
  return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status ?? 0 };
}

function detectAuthExpired(text) {
  return /Authentication expired|Run 'notebooklm login'/i.test(text);
}

function exitOnAuthError(stdout, stderr) {
  if (detectAuthExpired(`${stdout}\n${stderr}`)) {
    console.error('Error: NotebookLM authentication expired. Run `notebooklm login` first.');
    process.exit(2);
  }
}

function parseJsonOrExit(stdout, stderr, contextLabel) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (e) {
    console.error(`Failed to parse JSON from "${contextLabel}":\nstdout: ${stdout}\nstderr: ${stderr}`);
    process.exit(3);
  }
  if (parsed && parsed.error === true) {
    console.error(`notebooklm error in "${contextLabel}": ${parsed.code || ''} ${parsed.message || ''}`);
    process.exit(3);
  }
  return parsed;
}

// ── high-level operations ────────────────────────────────────────────────

function listNotebooks() {
  const { stdout, stderr, code } = runNotebooklm(['list', '--json']);
  exitOnAuthError(stdout, stderr);
  // notebooklm CLI は exit 0 で stdout に structured error JSON を返すケースあり
  // 一方、exit 1 でも stdout に正常な JSON を返すケース（一部の Python 内部例外時）あり
  // → 先に JSON を parse 試行、構造化 error なら exit、それ以外は code 無視で進む
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    console.error(`notebooklm list failed (exit ${code}):\nstdout: ${stdout.slice(0, 200)}\nstderr: ${stderr.slice(0, 200)}`);
    process.exit(3);
  }
  if (parsed && parsed.error === true) {
    console.error(`notebooklm list error: ${parsed.code || ''} ${parsed.message || ''}`);
    process.exit(3);
  }
  return Array.isArray(parsed) ? parsed : parsed.notebooks || [];
}

function resolveNotebookId(nameOrId) {
  // 部分 ID マッチ（notebooklm の規約に従う）または name 完全一致
  const notebooks = listNotebooks();
  const byId = notebooks.find((nb) => nb.id === nameOrId || (nb.id && nb.id.startsWith(nameOrId)));
  if (byId) return { id: byId.id, title: byId.title || byId.name, found: true };
  const byName = notebooks.find((nb) => nb.title === nameOrId || nb.name === nameOrId);
  if (byName) return { id: byName.id, title: byName.title || byName.name, found: true };
  return { id: null, title: null, found: false };
}

function findOrCreateNotebook(name) {
  const existing = resolveNotebookId(name);
  if (existing.found) {
    console.error(`[builder] reuse notebook "${name}" (id: ${existing.id})`);
    return existing.id;
  }
  console.error(`[builder] create new notebook "${name}"`);
  const { stdout, stderr, code } = runNotebooklm(['create', name, '--json']);
  exitOnAuthError(stdout, stderr);
  if (code !== 0) {
    console.error(`notebooklm create failed (exit ${code}):\n${stderr}`);
    process.exit(3);
  }
  const parsed = parseJsonOrExit(stdout, stderr, 'create');
  const id = parsed.id || parsed.notebook?.id;
  if (!id) {
    console.error(`Could not extract notebook id from create output: ${stdout}`);
    process.exit(3);
  }
  return id;
}

function listSources(notebookId) {
  const { stdout, stderr, code } = runNotebooklm(['source', 'list', '-n', notebookId, '--json']);
  exitOnAuthError(stdout, stderr);
  if (code !== 0) {
    console.error(`source list failed (exit ${code}):\n${stderr}`);
    process.exit(3);
  }
  const parsed = parseJsonOrExit(stdout, stderr, 'source list');
  return Array.isArray(parsed) ? parsed : parsed.sources || [];
}

function addSource(notebookId, filePath, title, waitTimeout = 180) {
  if (!existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }
  console.error(`[builder] add source from ${filePath}`);
  const addArgs = ['source', 'add', filePath, '-n', notebookId, '--title', title, '--json'];
  const { stdout, stderr, code } = runNotebooklm(addArgs);
  exitOnAuthError(stdout, stderr);
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    console.error(`source add failed (exit ${code}):\n${stderr}`);
    process.exit(3);
  }
  if (parsed.error === true) {
    console.error(`source add error: ${parsed.code || ''} ${parsed.message || ''}`);
    process.exit(3);
  }
  const sourceId = parsed.id || parsed.source?.id;
  if (!sourceId) {
    console.error(`Could not extract source id from output: ${stdout}`);
    process.exit(3);
  }

  // wait for ready — CLI exit code が不安定なので list-sources で status を直接確認
  console.error(`[builder] wait for source ${sourceId.slice(0, 8)} to be ready`);
  const pollDeadline = Date.now() + waitTimeout * 1000;
  let lastStatus = '';
  while (Date.now() < pollDeadline) {
    const sources = listSources(notebookId);
    const target = sources.find((s) => s.id === sourceId || (s.id && s.id.startsWith(sourceId.slice(0, 8))));
    lastStatus = target?.status || 'missing';
    if (lastStatus === 'ready') break;
    if (lastStatus === 'failed' || lastStatus === 'error') {
      console.error(`source ${sourceId} failed: status=${lastStatus}`);
      process.exit(4);
    }
    // poll interval 4s（同期 sleep）
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000);
  }
  if (lastStatus !== 'ready') {
    console.error(`source ${sourceId} not ready after ${waitTimeout}s (status: ${lastStatus})`);
    process.exit(4);
  }

  // title が filename になっている可能性があるため明示 rename
  // （CLI の --title は text source 向けで、file upload では filename がデフォルトに）
  const sources = listSources(notebookId);
  const target = sources.find((s) => s.id === sourceId);
  if (target && target.title !== title) {
    console.error(`[builder] rename source ${sourceId.slice(0, 8)} "${target.title}" → "${title}"`);
    const renameResult = runNotebooklm(['source', 'rename', sourceId, title, '-n', notebookId]);
    exitOnAuthError(renameResult.stdout, renameResult.stderr);
    if (renameResult.code !== 0 && !renameResult.stdout) {
      console.error(`source rename warning (exit ${renameResult.code}): ${renameResult.stderr}`);
    }
  }

  return sourceId;
}

function deleteSourceByTitle(notebookId, title) {
  // 標準コマンド source delete-by-title を使用
  console.error(`[builder] delete source by title "${title}"`);
  const { stdout, stderr, code } = runNotebooklm(['source', 'delete-by-title', title, '-n', notebookId]);
  exitOnAuthError(stdout, stderr);
  if (code !== 0) {
    // 存在しない場合の挙動を許容（idempotent）
    console.error(`[builder] delete may have failed or source missing (exit ${code}): ${stderr.trim()}`);
    return false;
  }
  return true;
}

// ── CLI dispatch ─────────────────────────────────────────────────────────

function usage() {
  console.log('Usage:');
  console.log('  notebook-builder.mjs find-or-create <name>');
  console.log('  notebook-builder.mjs list-sources --notebook <name-or-id>');
  console.log('  notebook-builder.mjs add-source --notebook <name-or-id> --file <path> --title <title> [--wait-timeout 180]');
  console.log('  notebook-builder.mjs delete-source --notebook <name-or-id> --title <title>');
  console.log('  notebook-builder.mjs bulk-add --notebook <name> --manifest <file.json> [--skip-existing]');
}

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      f[key] = val;
    }
  }
  return f;
}

function main() {
  const argv = process.argv.slice(2);
  const sub = argv[0];
  const rest = argv.slice(1);
  if (!sub || sub === '-h' || sub === '--help') {
    usage();
    process.exit(0);
  }
  const flags = parseFlags(rest);

  switch (sub) {
    case 'find-or-create': {
      const name = rest.find((a) => !a.startsWith('--'));
      if (!name) {
        console.error('Error: <name> required');
        process.exit(1);
      }
      const id = findOrCreateNotebook(name);
      console.log(id);
      break;
    }
    case 'list-sources': {
      const target = flags.notebook;
      if (!target) {
        console.error('Error: --notebook required');
        process.exit(1);
      }
      const r = resolveNotebookId(target);
      if (!r.found) {
        console.error(`Error: notebook "${target}" not found`);
        process.exit(1);
      }
      const sources = listSources(r.id);
      console.log(JSON.stringify({ notebook_id: r.id, notebook_title: r.title, count: sources.length, sources }, null, 2));
      break;
    }
    case 'add-source': {
      const { notebook, file, title } = flags;
      if (!notebook || !file || !title) {
        console.error('Error: --notebook, --file, --title required');
        process.exit(1);
      }
      const r = resolveNotebookId(notebook);
      const notebookId = r.found ? r.id : findOrCreateNotebook(notebook);
      const sourceId = addSource(notebookId, file, title, Number(flags['wait-timeout'] || 180));
      console.log(sourceId);
      break;
    }
    case 'delete-source': {
      const { notebook, title } = flags;
      if (!notebook || !title) {
        console.error('Error: --notebook, --title required');
        process.exit(1);
      }
      const r = resolveNotebookId(notebook);
      if (!r.found) {
        console.error(`Error: notebook "${notebook}" not found`);
        process.exit(1);
      }
      deleteSourceByTitle(r.id, title);
      break;
    }
    case 'bulk-add': {
      const { notebook, manifest } = flags;
      const skipExisting = flags['skip-existing'] === true;
      if (!notebook || !manifest) {
        console.error('Error: --notebook, --manifest required');
        process.exit(1);
      }
      if (!existsSync(manifest)) {
        console.error(`Error: manifest file not found: ${manifest}`);
        process.exit(1);
      }
      const items = JSON.parse(readFileSync(manifest, 'utf8'));
      if (!Array.isArray(items)) {
        console.error('Error: manifest must be a JSON array of { file, title }');
        process.exit(1);
      }

      const notebookId = findOrCreateNotebook(notebook);
      const existing = listSources(notebookId);
      const existingTitles = new Set(existing.map((s) => s.title));

      let added = 0, skipped = 0, failed = 0;
      const results = [];
      for (const item of items) {
        if (!item.file || !item.title) {
          console.error(`Skipping invalid manifest entry: ${JSON.stringify(item)}`);
          failed++;
          continue;
        }
        if (skipExisting && existingTitles.has(item.title)) {
          console.error(`[builder] skip "${item.title}" (already exists)`);
          skipped++;
          results.push({ title: item.title, status: 'skipped' });
          continue;
        }
        try {
          const sid = addSource(notebookId, item.file, item.title);
          added++;
          results.push({ title: item.title, status: 'ready', source_id: sid });
          // rate limit 防御として 2 秒 sleep
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
        } catch (e) {
          failed++;
          results.push({ title: item.title, status: 'failed', error: String(e) });
        }
      }

      console.log(JSON.stringify({
        notebook_id: notebookId,
        notebook_name: notebook,
        added,
        skipped,
        failed,
        results,
      }, null, 2));

      if (failed > 0) process.exit(4);
      break;
    }
    default:
      console.error(`Unknown subcommand: ${sub}`);
      usage();
      process.exit(1);
  }
}

main();
