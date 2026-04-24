// .claude/scripts/lib/git-dates.mjs
//
// git log から各ファイルの初回 commit 日（created）と直近 commit 日（dateModified）を
// まとめて取得する共通ユーティリティ。
//
// 使い方:
//   import { loadGitDates } from './lib/git-dates.mjs';
//   const dates = loadGitDates();          // Map<relPath, { created, dateModified }>
//   const entry = dates.get('path/to/file.mdx');
//
// 設計:
// - `git log --all --name-only --format=__COMMIT__:%ai` を ONE SHOT で実行し解析
// - 773 ファイル × 2 回 git log の per-file 呼出（~1 分）を 1 回のプロセス呼出（~数秒）に短縮
// - `--follow` による rename 追跡は犠牲。現状のリポジトリでは MDX のリネームは稀なので許容
//
// 出力の形式: YYYY-MM-DD（JSON-LD / sitemap lastmod 共通）

import { execSync } from 'node:child_process';

/**
 * リポジトリ全体の git log を一度解析し、ファイル → 日付マップを返す。
 *
 * @returns {Map<string, { created: string, dateModified: string }>}
 */
export function loadGitDates() {
  const out = execSync('git log --all --name-only --format=__COMMIT__:%ai', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024, // 64MB（38k 行 × 数百 byte 程度を想定）
  });

  const dates = new Map();
  let currentDate = null;

  for (const line of out.split('\n')) {
    if (line.startsWith('__COMMIT__:')) {
      // "__COMMIT__:2026-04-24 15:22:19 +0900" → "2026-04-24"
      currentDate = line.slice('__COMMIT__:'.length).split(' ')[0];
      continue;
    }
    if (!line || !currentDate) continue;

    const existing = dates.get(line);
    if (!existing) {
      // 初登場 = 最新 commit（git log は新しい順）
      dates.set(line, { created: currentDate, dateModified: currentDate });
    } else {
      // 再登場 = 古い commit → created を更新
      existing.created = currentDate;
    }
  }

  return dates;
}

/**
 * 正規化したパス（forward slash）で dates マップを参照する。
 * Windows で `path.relative` が `\` を含むパスを返すため、`/` に変換して比較する。
 *
 * @param {Map<string, {created:string, dateModified:string}>} dates
 * @param {string} path - 相対パス（Windows の `\` でも OK）
 * @returns {{ created: string, dateModified: string } | null}
 */
export function lookupGitDates(dates, path) {
  const normalized = path.replace(/\\/g, '/');
  return dates.get(normalized) || null;
}
