/**
 * disk-hygiene.mjs — ローカルディスク肥大の判定ロジック（純関数のみ・I/O なし）
 * ---------------------------------------------------------------------------
 * 背景（2026-09-10）: Mac の空きが 7.5GB（228GB 中 96%）まで落ちた。8/30 に 21GB 回収した
 *   直後から 10 日で 50GB 以上が再び埋まっている。実測した生成元は
 *     worktree（node_modules+.next+out で 1 本 4〜5GB）／Claude Workflow の子エージェント
 *     transcript（OCR 1 セッションで 3.1GB）／.next+out（3GB）／経路D の原寸画像複製
 *     （1〜2GB/冊）／Playwright の Chromium ディスクキャッシュ／npm キャッシュ（9.4GB）／
 *     Codex 自動更新の残骸（10 日で 4.6GB）。
 *   Claude Code と Codex の両方で開発しているので、どちらのフックにも依存しない形
 *   （launchd の日次実行）で掃除し、検査は両ツールのフックから読ませる。
 *
 * 設計:
 *   - ここには **判断だけ**を置く（fs/spawn を呼ばない）。probe と削除は scripts/disk-hygiene.mjs、
 *     読み取り専用の表示は scripts/check-disk-hygiene.mjs。テストはこのファイルを直接叩く。
 *   - 削除してよいのは「再生成できるもの」だけ。履歴（Codex セッション・Claude の .jsonl）は
 *     容量を報告するだけで消さない。
 *   - **迷ったら残す**。ガードの材料が取れなかった（lsof が失敗した等）ときは keep 側へ倒す。
 * ---------------------------------------------------------------------------
 */

/** バイト数を人が読める形にする（表とログの両方で使う）。 */
export function bytesHuman(n) {
  if (!Number.isFinite(n) || n < 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** linked worktree の `.git` は**ファイル**なので、名前で判定する（isDirectory では判別できない）。 */
export function hasGitEntry(names) {
  return Array.isArray(names) && names.includes('.git');
}

/**
 * `git worktree list --porcelain` を構造化する。先頭エントリが main worktree。
 * porcelain は空行区切りで、各ブロックが `worktree <path>` から始まる。
 */
export function parseWorktreeList(porcelain) {
  const out = [];
  let cur = null;
  for (const raw of String(porcelain || '').split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('worktree ')) {
      if (cur) out.push(cur);
      cur = {
        path: line.slice('worktree '.length),
        head: null,
        branch: null,
        bare: false,
        detached: false,
        locked: false,
        prunable: false,
      };
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('HEAD ')) cur.head = line.slice('HEAD '.length);
    else if (line.startsWith('branch ')) cur.branch = line.slice('branch '.length);
    else if (line === 'bare') cur.bare = true;
    else if (line === 'detached') cur.detached = true;
    else if (line === 'locked') cur.locked = true;
    else if (line.startsWith('locked ')) cur.locked = line.slice('locked '.length) || true;
    else if (line === 'prunable') cur.prunable = true;
    else if (line.startsWith('prunable ')) cur.prunable = line.slice('prunable '.length) || true;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * worktree 1 本を「消してよいか」で分類する。
 *
 * remove になるのは **5 つのガードすべて**を満たすときだけ:
 *   merged（base ref の祖先）／作業ツリーが clean／lock されていない／24h 以上動いていない／
 *   その配下を cwd にしているプロセスが無い。
 * inUse が 'unknown'（lsof が失敗した・Windows）なら消さない。
 *
 * @param {{ path: string, branch: string|null }} wt
 * @param {{ isMain: boolean, merged: boolean, dirtyPaths: string[], locked: any,
 *           prunable: any, recentlyActive: boolean, inUse: boolean|'unknown' }} facts
 * @returns {{ decision: string, reason: string }}
 */
export function classifyWorktree(wt, facts) {
  const {
    isMain = false,
    merged = false,
    dirtyPaths = [],
    locked = false,
    prunable = false,
    recentlyActive = false,
    inUse = 'unknown',
  } = facts || {};

  if (isMain) return { decision: 'keep-main', reason: 'main worktree' };
  if (prunable) {
    return {
      decision: 'prunable',
      reason: typeof prunable === 'string' ? `git が prunable と報告: ${prunable}` : 'git が prunable と報告',
    };
  }
  if (locked) {
    return {
      decision: 'keep-locked',
      reason: typeof locked === 'string' ? `lock されている: ${locked}` : 'lock されている（長期保持の意思表示）',
    };
  }
  if (!merged) return { decision: 'keep-unmerged', reason: 'base ref にマージされていない' };
  if (dirtyPaths.length > 0) {
    const head = dirtyPaths.slice(0, 3).join(', ');
    const more = dirtyPaths.length > 3 ? ` ほか ${dirtyPaths.length - 3} 件` : '';
    return { decision: 'keep-dirty', reason: `未コミットの変更あり: ${head}${more}` };
  }
  if (recentlyActive) return { decision: 'keep-active', reason: '24 時間以内に動いている' };
  if (inUse === true) return { decision: 'keep-in-use', reason: 'この配下を cwd にしているプロセスがある' };
  if (inUse !== false) return { decision: 'keep-unknown', reason: '使用中か判定できなかった（迷ったら残す）' };
  return { decision: 'remove', reason: 'マージ済み・clean・未使用' };
}

/**
 * worktree の置き場が規約どおりか。`.tmp/` 配下は prune-tmp の射程なので **違反**。
 * allowedRoots はリポジトリ相対（`.claude/worktrees`）と `~` 始まり（`~/.codex/worktrees`）を受ける。
 */
export function worktreePlacement(path, { repoRoot, home, allowedRoots = [] } = {}) {
  const p = String(path || '');
  const norm = (s) => s.replace(/\/+$/, '');
  const expand = (root) => {
    if (root.startsWith('~/')) return norm(`${home}/${root.slice(2)}`);
    if (root.startsWith('/')) return norm(root);
    return norm(`${repoRoot}/${root}`);
  };
  if (norm(p) === norm(repoRoot)) return { ok: true, reason: 'main worktree' };
  for (const root of allowedRoots) {
    const base = expand(root);
    if (p === base || p.startsWith(`${base}/`)) return { ok: true, reason: `許可された置き場 ${root}` };
  }
  const inTmp = p === `${norm(repoRoot)}/.tmp` || p.startsWith(`${norm(repoRoot)}/.tmp/`);
  return {
    ok: false,
    reason: inTmp
      ? '.tmp/ 配下（prune-tmp が 3 日で中身を消す置き場）'
      : `許可された置き場の外（許可: ${allowedRoots.join(' / ')}）`,
  };
}

/**
 * `.next` / `out` を消してよいか。ビルド中・配信中は触らない。
 * newestMtimeMs が取れない（BUILD_ID が無い等）ときは判断材料が無いので残す。
 */
export function planArtifactRemoval({
  kind,
  path,
  newestMtimeMs,
  now = Date.now(),
  maxAgeDays = 7,
  buildOrServeRunning = false,
} = {}) {
  if (buildOrServeRunning) return { action: 'keep', reason: 'build / dev server が動いている' };
  if (!Number.isFinite(newestMtimeMs)) {
    return { action: 'keep', reason: `${kind || 'artifact'} の更新時刻が読めない（判断材料なし）` };
  }
  const ageDays = (now - newestMtimeMs) / 86_400_000;
  if (ageDays < maxAgeDays) {
    return { action: 'keep', reason: `${ageDays.toFixed(1)} 日前のビルド（${maxAgeDays} 日以内）` };
  }
  return { action: 'delete', reason: `${ageDays.toFixed(0)} 日前のビルド成果物（再生成可）`, path };
}

/**
 * 「古いディレクトリを選ぶ」共通ロジック。Sparkle・Workflow transcript・_npx・profile cache で使う。
 * inUse に入っている path は理由付きで keep する。
 */
export function selectStaleDirs(entries, { now = Date.now(), maxAgeDays = 14, inUse = new Set() } = {}) {
  const remove = [];
  const keep = [];
  for (const e of entries || []) {
    if (inUse.has(e.path)) {
      keep.push({ ...e, reason: '使用中' });
      continue;
    }
    if (!Number.isFinite(e.newestMtimeMs)) {
      keep.push({ ...e, reason: '更新時刻が読めない' });
      continue;
    }
    const ageDays = (now - e.newestMtimeMs) / 86_400_000;
    if (ageDays >= maxAgeDays) remove.push({ ...e, ageDays });
    else keep.push({ ...e, reason: `${ageDays.toFixed(1)} 日（${maxAgeDays} 日以内）` });
  }
  return { remove, keep };
}

/** 稼働中プロセスのコマンドラインから、参照中の `_npx/<id>` を拾う。 */
export function referencedNpxIds(commandLines, npxDir) {
  const ids = new Set();
  const needle = `${String(npxDir || '').replace(/\/+$/, '')}/`;
  for (const line of commandLines || []) {
    let from = 0;
    for (;;) {
      const at = String(line).indexOf(needle, from);
      if (at < 0) break;
      const rest = String(line).slice(at + needle.length);
      const id = rest.split(/[/\s]/)[0];
      if (id) ids.add(id);
      from = at + needle.length;
    }
  }
  return ids;
}

/** 空き容量の三値判定。 */
export function evaluateFreeSpace({ freeBytes, warnBytes, failBytes } = {}) {
  if (!Number.isFinite(freeBytes)) return 'unknown';
  if (freeBytes < failBytes) return 'fail';
  if (freeBytes < warnBytes) return 'warn';
  return 'ok';
}

/** `~/.claude/settings.json` から cleanupPeriodDays を読む。未設定・壊れた JSON は null。 */
export function parseCleanupPeriodDays(jsonText) {
  try {
    const v = JSON.parse(String(jsonText)).cleanupPeriodDays;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** 会話ログの保持期間が方針どおりか。未設定は「既定 30 日で溜まり続ける」なので違反。 */
export function evaluateClaudeSettings({ days, maxDays = 7 } = {}) {
  if (days === null || days === undefined) {
    return { ok: false, reason: `cleanupPeriodDays が未設定（既定 30 日）。推奨: ${maxDays}` };
  }
  if (days > maxDays) return { ok: false, reason: `cleanupPeriodDays=${days} が方針の ${maxDays} 日超` };
  return { ok: true, reason: `cleanupPeriodDays=${days}` };
}

/**
 * 日次自動掃除が生きているか（stamp ファイルの鮮度）。
 * 「掃除が止まっていること」自体を検知できないと、静かに溜まって同じ事故になる。
 */
export function automationFreshness({ stampMtimeMs = null, now = Date.now(), maxAgeDays = 3 } = {}) {
  if (!Number.isFinite(stampMtimeMs)) {
    return { status: 'missing', reason: '日次掃除の記録が無い。推奨: npm run disk-hygiene:install' };
  }
  const ageDays = (now - stampMtimeMs) / 86_400_000;
  if (ageDays > maxAgeDays) {
    return {
      status: 'stale',
      reason: `日次掃除が ${ageDays.toFixed(0)} 日止まっている。推奨: npm run disk-hygiene:install -- --status`,
    };
  }
  return { status: 'ok', reason: `最終実行 ${ageDays.toFixed(1)} 日前` };
}

/** `/Users/x/doboku-note` → `-Users-x-doboku-note`（~/.claude/projects/ のキー）。 */
export function claudeProjectKey(repoRoot) {
  return String(repoRoot || '').replace(/[/\\:]/g, '-');
}

/** darwin 専用項目は他 OS では unsupported（クラッシュさせず「検査していない」と言う）。 */
export function itemsForPlatform(items, platform) {
  return (items || []).map((item) => {
    const platforms = item.platform;
    if (Array.isArray(platforms) && !platforms.includes(platform)) {
      return { ...item, status: 'unsupported', detail: `${platforms.join('/')} 専用（現在 ${platform}）` };
    }
    return item;
  });
}

/**
 * 集計と exit code。CLAUDE.md §9「検査ゼロを PASS と呼ばない」に従い、
 * 実検査 0 件と（full モードで）未検査項目があるケースは exit 2＝検査不成立にする。
 */
export function summarize(items, { mode = 'full' } = {}) {
  const list = items || [];
  const examined = list.filter((i) => i.status !== 'unsupported' && i.status !== 'skipped').length;
  const fail = list.filter((i) => i.status === 'fail').length;
  const warn = list.filter((i) => i.status === 'warn').length;
  const unsupported = list.filter((i) => i.status === 'unsupported').length;
  let exitCode = fail > 0 ? 1 : 0;
  if (mode === 'quick') exitCode = 0;
  else if (examined === 0 || unsupported > 0) exitCode = 2;
  return { total: list.length, examined, fail, warn, unsupported, exitCode };
}

/** 表示用の表。列は 状態 / 項目 / 容量 / 詳細。 */
export function formatTable(items, summary) {
  const mark = { ok: '✓', warn: '⚠', fail: '✗', unsupported: '-', skipped: '-' };
  const lines = (items || []).map((i) => {
    const size = Number.isFinite(i.bytes) ? bytesHuman(i.bytes) : '';
    return `  ${mark[i.status] || '?'} ${String(i.id).padEnd(28)} ${size.padStart(9)}  ${i.detail || ''}`;
  });
  lines.push(
    `[check-disk-hygiene] 検査対象 ${summary.total} 項目 / 実検査 ${summary.examined}` +
      `（FAIL ${summary.fail} / WARN ${summary.warn}` +
      (summary.unsupported ? ` / 未検査 ${summary.unsupported}＝検査不成立` : '') +
      '）',
  );
  return lines.join('\n');
}
