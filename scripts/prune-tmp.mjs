#!/usr/bin/env node
/**
 * SessionStart フック: .tmp/ 配下の古いスクラッチ生成物を自動削除する。
 *
 * 動機（2026-06-11）: .tmp/ は視覚検証・図クロップ・動画/TTS 生成等の一時出力置き場
 * （gitignore 済）。手動削除任せだったため過去セッション残骸が 8.1GB 蓄積した。
 * セッション開始時点では当該セッションのファイルはまだ無いので、一定日数より古い
 * ファイル＝放置確定のものだけを安全に削除し、.tmp/ を有界に保つ。
 *
 * 2026-09-10 追加: **git worktree を丸ごと飛ばす**。Codex が `.tmp/<name>` に worktree を
 * 作っていた（実測 2 本）。worktree のチェックアウトは mtime がコミット時刻のままなので、
 * 3 日ルールで中身を削られ作業が壊れる。linked worktree の `.git` は**ファイル**なので
 * `isDirectory()` ではなく名前で判定する。置き場違反として警告も出す
 * （置き場ルールは CLAUDE.md §10・disk-hygiene.md）。
 *
 * 仕様:
 * - mtime が TMP_PRUNE_DAYS（既定 3 日）より古いファイルを削除。
 * - `.git` を持つディレクトリ（= git worktree / clone）は中に入らない。
 * - 空になったサブディレクトリも除去。
 * - 追跡対象の .gitkeep / README.md（トップレベル）は常に保護。
 * - 何が起きても session を止めない（常に exit 0、削除時のみ要約を出力）。
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from './lib/repository-paths.mjs';
import { hasGitEntry } from './lib/disk-hygiene.mjs';

const KEEP_TOP = new Set(['.gitkeep', 'README.md']);

/**
 * .tmp/ を掃除する。副作用は削除のみで、判定結果は戻り値で返す（呼び出し側が表示を決める）。
 *
 * @param {{ root?: string, days?: number, now?: number }} options
 * @returns {{ count: number, bytes: number, skippedWorktrees: string[] }}
 */
export function pruneTmp({ root = join(REPO_ROOT, '.tmp'), days = 3, now = Date.now() } = {}) {
  const cutoff = now - days * 86_400_000;
  let bytes = 0;
  let count = 0;
  const skippedWorktrees = [];

  function walk(dir, top) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (top && KEEP_TOP.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        let names;
        try {
          names = readdirSync(p);
        } catch {
          continue;
        }
        // git worktree / clone は丸ごと保護する（コミット時刻の mtime を放置と誤判定しない）。
        if (hasGitEntry(names)) {
          skippedWorktrees.push(p);
          continue;
        }
        walk(p, false);
        try {
          if (readdirSync(p).length === 0) rmSync(p, { recursive: true, force: true });
        } catch {
          /* noop */
        }
      } else {
        try {
          const st = statSync(p);
          if (st.mtimeMs < cutoff) {
            bytes += st.size;
            count += 1;
            rmSync(p, { force: true });
          }
        } catch {
          /* noop */
        }
      }
    }
  }

  walk(root, true);
  return { count, bytes, skippedWorktrees };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const days = Number(process.env.TMP_PRUNE_DAYS || '3');
  const { count, bytes, skippedWorktrees } = pruneTmp({ days });
  if (count > 0) {
    const mb = (bytes / 1024 / 1024).toFixed(0);
    console.log(`[tmp-prune] ${days} 日より古い .tmp スクラッチを ${count} 件削除（${mb} MB 解放）`);
  }
  if (skippedWorktrees.length > 0) {
    const list = skippedWorktrees.map((p) => relative(REPO_ROOT, p)).join(', ');
    console.log(
      `[tmp-prune] ⚠ .tmp 配下に git worktree ${skippedWorktrees.length} 件（掃除対象外・置き場違反）: ${list}。` +
        ' 推奨: git worktree move <path> ~/.codex/worktrees/<name>',
    );
  }
}
