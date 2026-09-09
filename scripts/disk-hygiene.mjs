#!/usr/bin/env node
/**
 * disk-hygiene.mjs — ローカルディスクの再生成可能な滞留物を集めて、ガード付きで消す。
 * ---------------------------------------------------------------------------
 * 背景と方針は scripts/lib/disk-hygiene.mjs の冒頭と
 * .claude/knowledge/reference/disk-hygiene.md を見る。ここは probe（実測）と削除だけを持つ。
 *
 * 使い方:
 *   node scripts/disk-hygiene.mjs --dry-run   # 何を消すかとガード理由を出す（削除しない）
 *   node scripts/disk-hygiene.mjs --fix       # 実際に消す（launchd が日次で叩く）
 *   node scripts/disk-hygiene.mjs --json      # collect() の結果を JSON で
 *
 * 契約:
 *   - 引数なし / --dry-run は**副作用ゼロ**。削除は --fix のときだけ。
 *   - 消すのは再生成できるものだけ。reportOnly の履歴は容量を測るだけ。
 *   - --fix が全項目を例外なく終えたときだけ stamp を書く（検査側が「掃除が止まった」を見る）。
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, statfsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from './lib/repository-paths.mjs';
import { pruneTmp } from './prune-tmp.mjs';
import {
  automationFreshness,
  bytesHuman,
  classifyWorktree,
  claudeProjectKey,
  evaluateClaudeSettings,
  evaluateFreeSpace,
  itemsForPlatform,
  parseCleanupPeriodDays,
  parseWorktreeList,
  planArtifactRemoval,
  referencedNpxIds,
  selectStaleDirs,
  worktreePlacement,
} from './lib/disk-hygiene.mjs';

const HOME = homedir();
const CONFIG_PATH = join(REPO_ROOT, '.claude', 'config', 'disk-hygiene.json');

export function loadConfig(path = CONFIG_PATH) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const expandHome = (p) => (String(p).startsWith('~/') ? join(HOME, String(p).slice(2)) : String(p));

// --- 実測ヘルパ（失敗は例外にせず null / 空を返す。掃除で作業を止めない）-------------

function run(cmd, args, { cwd = REPO_ROOT, timeout = 15_000 } = {}) {
  try {
    const r = spawnSync(cmd, args, { cwd, timeout, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    if (r.error || r.status !== 0) return { ok: false, stdout: r.stdout || '', stderr: r.stderr || '' };
    return { ok: true, stdout: r.stdout || '', stderr: r.stderr || '' };
  } catch {
    return { ok: false, stdout: '', stderr: '' };
  }
}

/** ディレクトリの実容量。du が使えないときは null（測れないものを 0 と言わない）。 */
function dirBytes(path) {
  if (!existsSync(path)) return null;
  const r = run('du', ['-sk', path], { cwd: HOME, timeout: 120_000 });
  if (!r.ok) return null;
  const kb = Number(String(r.stdout).trim().split(/\s+/)[0]);
  return Number.isFinite(kb) ? kb * 1024 : null;
}

function mtimeOf(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

/** サブツリーの最新 mtime（浅く再帰・上限付き）。 */
function newestMtime(path, depth = 3) {
  let newest = mtimeOf(path);
  if (depth <= 0) return newest;
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch {
    return newest;
  }
  for (const e of entries.slice(0, 500)) {
    const p = join(path, e.name);
    const m = e.isDirectory() ? newestMtime(p, depth - 1) : mtimeOf(p);
    if (Number.isFinite(m) && (!Number.isFinite(newest) || m > newest)) newest = m;
  }
  return newest;
}

function listDirs(root) {
  if (!existsSync(root)) return [];
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(root, e.name));
  } catch {
    return [];
  }
}

/** 稼働中プロセスの pid とコマンドライン（darwin/linux のみ。失敗は null＝判定不能＝残す）。 */
function processLines(platform) {
  if (platform === 'win32') return null;
  const r = run('ps', ['-axo', 'pid=,command='], { cwd: HOME, timeout: 15_000 });
  if (!r.ok) return null;
  return r.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.trim().match(/^(\d+)\s+(.*)$/);
      return m ? { pid: m[1], command: m[2] } : null;
    })
    .filter(Boolean);
}

/**
 * 「どのプロセスがどこを cwd にしているか」を 1 回だけ引く。
 * lsof は Drive マウントがあると遅いので `-a -d cwd` に絞り、失敗したら null（＝判定不能＝残す）。
 * 2026-09-10: プロセス名だけで判定すると、別リポジトリの `next dev` や常駐 MCP を
 * 「このリポジトリが稼働中」と誤読して掃除が永久に走らなくなる。cwd で結び付ける。
 */
function cwdTable(platform, psRows) {
  if (platform === 'win32') return null;
  const r = run('lsof', ['-a', '-d', 'cwd', '-Fpn'], { cwd: HOME, timeout: 10_000 });
  if (!r.ok && !r.stdout) return null;
  // lsof の `c` はコマンド名が切り詰められる（node も claude も "node"）ので、
  // 判定に使えるのは pid だけ。フルコマンドは ps 側と pid で突き合わせる。
  const byPid = new Map((psRows || []).map((row) => [row.pid, row.command]));
  const rows = [];
  let pid = '';
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('p')) pid = line.slice(1);
    else if (line.startsWith('n')) rows.push({ pid, command: byPid.get(pid) || '', cwd: line.slice(1) });
  }
  return rows;
}

/** その path 配下を cwd にしているプロセスがあるか。table が無ければ 'unknown'（＝残す）。 */
function cwdInUse(table, path, { commandPattern = null } = {}) {
  if (!table) return 'unknown';
  return table.some(
    (row) =>
      (row.cwd === path || row.cwd.startsWith(`${path}/`)) &&
      (!commandPattern || commandPattern.test(row.command)),
  );
}

// --- collect ---------------------------------------------------------------

/**
 * 全項目を実測して items[] にする。副作用なし。
 * quick=true では du と lsof を使わず 1 秒未満で終える（フックから叩くため）。
 */
export function collect({ quick = false, config = loadConfig(), platform = process.platform, now = Date.now() } = {}) {
  const t = config.thresholds;
  const items = [];
  const psLines = quick ? null : processLines(platform);
  const psText = (psLines || []).map((r) => r.command).join('\n');
  const cwds = quick ? null : cwdTable(platform, psLines);

  // --- 空き容量 -----------------------------------------------------------
  let freeBytes = null;
  try {
    const s = statfsSync(REPO_ROOT);
    freeBytes = s.bavail * s.bsize;
  } catch {
    const r = run('df', ['-k', REPO_ROOT], { timeout: 10_000 });
    const kb = Number(String(r.stdout).split('\n')[1]?.trim().split(/\s+/)[3]);
    freeBytes = Number.isFinite(kb) ? kb * 1024 : null;
  }
  const free = evaluateFreeSpace({ freeBytes, warnBytes: t.freeWarnBytes, failBytes: t.freeFailBytes });
  items.push({
    id: 'free-space',
    status: free === 'ok' ? 'ok' : free === 'unknown' ? 'fail' : free,
    bytes: freeBytes,
    detail:
      free === 'unknown'
        ? '空き容量を測れなかった'
        : `空き ${bytesHuman(freeBytes)}（warn < ${bytesHuman(t.freeWarnBytes)} / fail < ${bytesHuman(t.freeFailBytes)}）`,
    actions: [],
  });

  // --- worktree（除去候補と置き場違反）------------------------------------
  const wtList = parseWorktreeList(run('git', ['worktree', 'list', '--porcelain']).stdout);
  const gitCommonDir = run('git', ['rev-parse', '--git-common-dir']).stdout.trim();
  // マージ済み判定は「base ref ごとに worktree の数だけ merge-base を spawn」すると遅い
  // （実測 16 回で 0.8 秒）。base ref 1 本につき 1 回 branch --merged を引いて集合にする。
  const mergedBranches = new Set();
  for (const ref of config.baseRefs) {
    const r = run('git', ['branch', '--merged', ref, '--format=%(refname)']);
    if (r.ok) for (const line of r.stdout.split('\n')) if (line.trim()) mergedBranches.add(line.trim());
  }
  const removable = [];
  const placementViolations = [];
  const wtNotes = [];
  for (const [idx, wt] of wtList.entries()) {
    const isMain = idx === 0;
    const place = worktreePlacement(wt.path, {
      repoRoot: REPO_ROOT,
      home: HOME,
      allowedRoots: config.allowedWorktreeRoots,
    });
    if (!isMain && !place.ok) placementViolations.push({ path: wt.path, reason: place.reason });

    if (isMain) continue;
    // ブランチ付きは集合引き（spawn ゼロ）。detached だけ merge-base に落とす。
    const merged = wt.branch
      ? mergedBranches.has(wt.branch)
      : config.baseRefs.some((ref) => run('git', ['merge-base', '--is-ancestor', wt.head || 'HEAD', ref]).ok);
    // git status は worktree 1 本あたり約 1 秒かかる（node_modules 込みの実測）。
    // quick はフックから毎回叩かれるので測らず、「候補」に留めて full 検査へ送る。
    const dirty =
      !quick && existsSync(wt.path)
        ? run('git', ['-C', wt.path, 'status', '--porcelain'], { cwd: wt.path }).stdout.split('\n').filter(Boolean)
        : [];
    const wtName = wt.path.split('/').pop();
    const adminDir = gitCommonDir ? join(gitCommonDir, 'worktrees', wtName) : null;
    const adminMtime = adminDir
      ? Math.max(mtimeOf(join(adminDir, 'HEAD')) || 0, mtimeOf(join(adminDir, 'index')) || 0)
      : 0;
    const recentlyActive = adminMtime > 0 && now - adminMtime < t.worktreeIdleHours * 3_600_000;
    const inUse = quick ? 'unknown' : cwdInUse(cwds, wt.path);
    const verdict = classifyWorktree(wt, {
      isMain,
      merged,
      dirtyPaths: dirty,
      locked: wt.locked,
      prunable: wt.prunable,
      recentlyActive,
      inUse,
    });
    // quick では inUse を測れないので、merged && clean && idle までを「候補」として数える。
    const isCandidate =
      verdict.decision === 'remove' || verdict.decision === 'prunable' ||
      (quick && verdict.decision === 'keep-unknown');
    if (isCandidate) removable.push({ path: wt.path, branch: wt.branch, decision: verdict.decision, reason: verdict.reason });
    wtNotes.push(`${relative(REPO_ROOT, wt.path) || wt.path}: ${verdict.decision}（${verdict.reason}）`);
  }
  items.push({
    id: 'worktrees',
    status: removable.length > 0 ? 'warn' : 'ok',
    bytes: quick ? null : removable.reduce((s, r) => s + (dirBytes(r.path) || 0), 0) || null,
    detail:
      removable.length > 0
        ? `除去できる worktree ${removable.length} 本 / 全 ${wtList.length - 1} 本（${wtNotes.join(' / ')}）`
        : `除去候補なし（全 ${Math.max(wtList.length - 1, 0)} 本）`,
    actions: removable.map((r) => ({ kind: 'worktree-remove', path: r.path, decision: r.decision, reason: r.reason })),
  });
  items.push({
    id: 'worktree-placement',
    status: placementViolations.length > 0 ? 'fail' : 'ok',
    bytes: null,
    detail:
      placementViolations.length > 0
        ? placementViolations
            .map((v) => `${relative(REPO_ROOT, v.path) || v.path}（${v.reason}）→ git worktree move <path> ~/.codex/worktrees/<name>`)
            .join(' / ')
        : `置き場違反なし（許可: ${config.allowedWorktreeRoots.join(' / ')}）`,
    actions: [],
  });

  // --- 会話ログの保持期間（リポジトリ外の設定なので検査だけ）---------------
  const settingsPath = expandHome(config.claudeSettingsPath);
  let days = null;
  try {
    days = parseCleanupPeriodDays(readFileSync(settingsPath, 'utf-8'));
  } catch {
    days = null;
  }
  const settings = evaluateClaudeSettings({ days, maxDays: t.claudeCleanupMaxDays });
  items.push({
    id: 'claude-settings',
    status: settings.ok ? 'ok' : 'fail',
    bytes: null,
    detail: `${settings.reason}（${settingsPath}）`,
    actions: [],
  });

  // --- 日次掃除が生きているか --------------------------------------------
  const stampPath = expandHome(config.stampPath);
  const fresh = automationFreshness({ stampMtimeMs: mtimeOf(stampPath), now, maxAgeDays: t.automationMaxAgeDays });
  items.push({
    id: 'automation',
    status: fresh.status === 'ok' ? 'ok' : 'fail',
    bytes: null,
    detail: fresh.reason,
    actions: [],
  });

  // quick は SessionStart / Stop フックから毎回叩かれるので、ここで打ち切る。
  // 以降の項目は du / npm spawn / サブツリー walk を伴い、フックに載せる速度では終わらない。
  // 「速いから省いた」ことが分かるよう、打ち切った項目は skipped として数に残す。
  if (quick) {
    for (const id of [
      'build-artifacts',
      'tmp-scratch',
      'playwright-cache',
      'sparkle-updates',
      'npm-cache',
      'npx-cache',
      'claude-workflow-transcripts',
    ]) {
      items.push({ id, status: 'skipped', bytes: null, detail: 'quick では未検査（npm run check-disk-hygiene で見る）', actions: [] });
    }
    return itemsForPlatform(items, platform);
  }

  // --- ビルド成果物（main と各 worktree の .next / out）--------------------
  // 稼働判定は「ビルド/配信のフルコマンド」×「その worktree を cwd にしている」の二条件。
  // プロセス名だけだと別リポジトリの next dev を、cwd だけだとエージェント自身の node を拾う。
  const BUILD_CMD = /next (build|dev|start)|static-server|npm run serve/;
  const artifactActions = [];
  let artifactBytes = 0;
  let anyBuildRunning = false;
  for (const wt of wtList) {
    const wtBuildRunning = cwdInUse(cwds, wt.path, { commandPattern: BUILD_CMD }) === true;
    if (wtBuildRunning) anyBuildRunning = true;
    for (const kind of ['.next', 'out']) {
      const p = join(wt.path, kind);
      if (!existsSync(p)) continue;
      const stampFile = kind === '.next' ? join(p, 'BUILD_ID') : join(p, 'index.html');
      const plan = planArtifactRemoval({
        kind,
        path: p,
        newestMtimeMs: mtimeOf(stampFile) ?? mtimeOf(p),
        now,
        maxAgeDays: t.buildArtifactMaxAgeDays,
        buildOrServeRunning: wtBuildRunning,
      });
      if (plan.action === 'delete') {
        const b = quick ? null : dirBytes(p);
        artifactBytes += b || 0;
        artifactActions.push({ kind: 'rm', path: p, reason: plan.reason, bytes: b });
      }
    }
  }
  items.push({
    id: 'build-artifacts',
    status: artifactActions.length > 0 ? 'warn' : 'ok',
    bytes: artifactBytes || null,
    detail: artifactActions.length
      ? `${t.buildArtifactMaxAgeDays} 日超の .next / out ${artifactActions.length} 件（再生成可）`
      : anyBuildRunning
        ? 'build / dev server 稼働中の worktree があるため一部対象外'
        : `古いビルド成果物なし（${t.buildArtifactMaxAgeDays} 日超が対象）`,
    actions: artifactActions,
  });

  // --- .tmp スクラッチ ----------------------------------------------------
  const tmpRoot = join(REPO_ROOT, '.tmp');
  items.push({
    id: 'tmp-scratch',
    status: 'ok',
    bytes: quick ? null : dirBytes(tmpRoot),
    detail: `${t.tmpPruneDays} 日超のスクラッチを掃除（worktree は除外）`,
    actions: [{ kind: 'prune-tmp', path: tmpRoot, days: t.tmpPruneDays }],
  });

  // --- Playwright の Chromium ディスクキャッシュ（ログインは別ディレクトリ）-
  const pwRoot = expandHome(config.playwrightCacheRoot);
  const pwActions = [];
  let pwBytes = 0;
  for (const profile of listDirs(pwRoot)) {
    if (psText.includes(`--user-data-dir=${profile}`)) continue;
    for (const sub of config.playwrightCacheSubdirs) {
      const p = join(profile, sub);
      if (!existsSync(p)) continue;
      const b = quick ? null : dirBytes(p);
      pwBytes += b || 0;
      pwActions.push({ kind: 'rm', path: p, reason: 'Chromium のディスクキャッシュ（ログインは Application Support 側）', bytes: b });
    }
  }
  const pwOver = !quick && pwBytes > t.playwrightCacheMaxBytes;
  items.push({
    id: 'playwright-cache',
    platform: ['darwin'],
    status: pwOver ? 'warn' : 'ok',
    bytes: pwBytes || null,
    detail: pwActions.length
      ? `${pwActions.length} 件・${bytesHuman(pwBytes)}（閾値 ${bytesHuman(t.playwrightCacheMaxBytes)}）`
      : 'キャッシュなし（または全プロファイル使用中）',
    actions: pwOver ? pwActions : [],
  });

  // --- Codex 自動更新の残骸（10 日で 4.6GB 溜まった実測）-------------------
  const sparkleRoot = expandHome(config.sparkleRoot);
  const sparkleEntries = listDirs(sparkleRoot).map((p) => ({ path: p, newestMtimeMs: mtimeOf(p) }));
  // Autoupdate ヘルパは常駐しているので、名前で見ると永久に掃除できない。
  // 実際にコマンドラインへ現れているサブディレクトリだけを使用中として除く。
  const sparkleInUse = new Set(sparkleEntries.filter((e) => psText.includes(e.path)).map((e) => e.path));
  const sparkle = selectStaleDirs(sparkleEntries, {
    now,
    maxAgeDays: t.sparkleMaxAgeDays,
    inUse: sparkleInUse,
  });
  const sparkleBytes = quick ? null : sparkle.remove.reduce((s, e) => s + (dirBytes(e.path) || 0), 0);
  items.push({
    id: 'sparkle-updates',
    platform: ['darwin'],
    status: sparkle.remove.length > 0 ? 'warn' : 'ok',
    bytes: sparkleBytes || null,
    detail: sparkle.remove.length
      ? `Codex 自動更新の残骸 ${sparkle.remove.length} 件（アプリの自動更新は設定不可・日次で有界にする）`
      : `残骸なし（使用中 ${sparkleInUse.size} 件は除外）`,
    actions: sparkle.remove.map((e) => ({ kind: 'rm', path: e.path, reason: 'Codex 自動更新のダウンロード残骸' })),
  });

  // --- npm キャッシュ ------------------------------------------------------
  const npmCacheRoot = run('npm', ['config', 'get', 'cache'], { timeout: 20_000 }).stdout.trim() || join(HOME, '.npm');
  const cacacheDir = join(npmCacheRoot, '_cacache');
  const cacacheBytes = quick ? null : dirBytes(cacacheDir);
  // `npm exec`（常駐 MCP）は永久に居るので除く。キャッシュ掃除と競合するのは install/ci だけ。
  const npmBusy = /npm (install|ci)\b/.test(psText);
  const npmOver = Number.isFinite(cacacheBytes) && cacacheBytes > t.npmCacheMaxBytes && !npmBusy;
  items.push({
    id: 'npm-cache',
    status: npmOver ? 'warn' : 'ok',
    bytes: cacacheBytes,
    detail: npmBusy
      ? 'npm 実行中のため対象外'
      : Number.isFinite(cacacheBytes)
        ? `_cacache ${bytesHuman(cacacheBytes)}（閾値 ${bytesHuman(t.npmCacheMaxBytes)}）`
        : '測れなかった',
    actions: npmOver ? [{ kind: 'npm-cache-clean', path: cacacheDir, reason: '閾値超（再ダウンロードで戻る）' }] : [],
  });

  const npxDir = join(npmCacheRoot, '_npx');
  const npxInUse = referencedNpxIds(psLines || [], npxDir);
  const npxEntries = listDirs(npxDir).map((p) => ({ path: p, newestMtimeMs: newestMtime(p, 1) }));
  const npxStale = selectStaleDirs(npxEntries, {
    now,
    maxAgeDays: t.npxMaxAgeDays,
    inUse: new Set([...npxInUse].map((id) => join(npxDir, id))),
  });
  const npxBytes = quick ? null : npxStale.remove.reduce((s, e) => s + (dirBytes(e.path) || 0), 0);
  items.push({
    id: 'npx-cache',
    status: npxStale.remove.length > 0 ? 'warn' : 'ok',
    bytes: npxBytes || null,
    detail: npxStale.remove.length
      ? `${t.npxMaxAgeDays} 日超の _npx ${npxStale.remove.length} 件（稼働中 ${npxInUse.size} 件は除外）`
      : `古い _npx なし（稼働中 ${npxInUse.size} 件）`,
    actions: npxStale.remove.map((e) => ({ kind: 'rm', path: e.path, reason: `${t.npxMaxAgeDays} 日超・未参照` })),
  });

  // --- Claude Workflow の子エージェント transcript（OCR で 1 セッション 3.1GB）
  const projectsRoot = expandHome(config.claudeProjectsRoot);
  const key = claudeProjectKey(REPO_ROOT);
  const wfEntries = [];
  for (const proj of listDirs(projectsRoot)) {
    if (!proj.endsWith(key)) continue;
    for (const session of listDirs(proj)) {
      const wfRoot = join(session, 'subagents', 'workflows');
      for (const runDir of listDirs(wfRoot)) wfEntries.push({ path: runDir, newestMtimeMs: newestMtime(runDir, 2) });
    }
  }
  const wfStale = selectStaleDirs(wfEntries, { now, maxAgeDays: t.workflowTranscriptMaxAgeDays });
  const wfBytes = quick ? null : wfStale.remove.reduce((s, e) => s + (dirBytes(e.path) || 0), 0);
  items.push({
    id: 'claude-workflow-transcripts',
    status: wfStale.remove.length > 0 ? 'warn' : 'ok',
    bytes: wfBytes || null,
    detail: wfStale.remove.length
      ? `${t.workflowTranscriptMaxAgeDays} 日超の Workflow 記録 ${wfStale.remove.length} 件（読んだ画像が丸ごと残る）`
      : `古い Workflow 記録なし（全 ${wfEntries.length} 件）`,
    actions: wfStale.remove.map((e) => ({ kind: 'rm', path: e.path, reason: `${t.workflowTranscriptMaxAgeDays} 日超の Workflow 記録` })),
  });

  // --- 履歴（報告のみ・消さない）-----------------------------------------
  if (!quick) {
    for (const entry of config.reportOnly) {
      const p = expandHome(entry.path);
      if (!existsSync(p)) continue;
      items.push({
        id: `history:${entry.path.replace(/^~\//, '')}`,
        status: 'ok',
        bytes: statSync(p).isDirectory() ? dirBytes(p) : statSync(p).size,
        detail: `報告のみ（自動削除しない）: ${entry.note}`,
        actions: [],
      });
    }
  }

  return itemsForPlatform(items, platform);
}

// --- fix -------------------------------------------------------------------

/**
 * items の actions を実行する。dryRun ならログだけ。
 * 1 件の失敗で全体を止めない（次回に持ち越す）。ok=false のときは stamp を書かない。
 */
export function applyFixes(items, { dryRun = true, log = console.log } = {}) {
  let removed = 0;
  let bytes = 0;
  let failures = 0;
  for (const item of items || []) {
    if (item.status === 'unsupported') continue;
    for (const action of item.actions || []) {
      const label = `[disk-hygiene] ${item.id} ${action.kind} ${action.path}${action.bytes ? ` (${bytesHuman(action.bytes)})` : ''}`;
      if (dryRun) {
        log(`${label} — dry-run（理由: ${action.reason || ''}）`);
        continue;
      }
      try {
        if (action.kind === 'rm') {
          rmSync(action.path, { recursive: true, force: true });
        } else if (action.kind === 'worktree-remove') {
          // --force は使わない（untracked が残っていれば git が拒否する＝最後の砦）。
          const r =
            action.decision === 'prunable'
              ? run('git', ['worktree', 'prune'])
              : run('git', ['worktree', 'remove', action.path]);
          if (!r.ok) {
            failures += 1;
            log(`${label} — 見送り: git が拒否（${(r.stderr || '').trim().split('\n')[0]}）`);
            continue;
          }
          log(`${label} — 削除。ブランチは残っている（不要なら git branch -d ${action.branch || ''}）`);
          removed += 1;
          bytes += action.bytes || 0;
          continue;
        } else if (action.kind === 'prune-tmp') {
          const res = pruneTmp({ root: action.path, days: action.days });
          log(`${label} — ${res.count} 件削除（${bytesHuman(res.bytes)}）`);
          removed += res.count;
          bytes += res.bytes;
          continue;
        } else if (action.kind === 'npm-cache-clean') {
          const r = run('npm', ['cache', 'clean', '--force'], { timeout: 300_000 });
          if (!r.ok) {
            failures += 1;
            log(`${label} — 見送り: npm cache clean 失敗`);
            continue;
          }
        }
        log(`${label} — 削除`);
        removed += 1;
        bytes += action.bytes || 0;
      } catch (e) {
        failures += 1;
        log(`${label} — 見送り: ${e.message}`);
      }
    }
  }
  return { removed, bytes, failures, ok: failures === 0 };
}

// --- CLI -------------------------------------------------------------------

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const fix = argv.includes('--fix');
  const jsonOut = argv.includes('--json');
  const config = loadConfig();
  const items = collect({ quick: false, config });

  if (jsonOut) {
    console.log(JSON.stringify({ items }, null, 2));
    process.exit(0);
  }

  const res = applyFixes(items, { dryRun: !fix });
  const mode = fix ? '削除' : 'dry-run';
  console.log(
    `[disk-hygiene] ${mode}: ${res.removed} 件 / ${bytesHuman(res.bytes)}` +
      (res.failures ? ` / 見送り ${res.failures} 件` : ''),
  );

  if (fix && res.ok) {
    // 「掃除が止まっていること」を検査側が検知できるよう、完走したときだけ更新する。
    const stampPath = expandHome(config.stampPath);
    try {
      mkdirSync(dirname(stampPath), { recursive: true });
      writeFileSync(stampPath, `${new Date().toISOString()} removed=${res.removed} bytes=${res.bytes}\n`);
    } catch (e) {
      console.log(`[disk-hygiene] ⚠ stamp を書けなかった: ${e.message}`);
    }
  }
  process.exit(fix && !res.ok ? 1 : 0);
}
