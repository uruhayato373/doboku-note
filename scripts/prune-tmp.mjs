#!/usr/bin/env node
/**
 * SessionStart フック: .tmp/ 配下の古いスクラッチ生成物を自動削除する。
 *
 * 動機（2026-06-11）: .tmp/ は視覚検証・図クロップ・動画/TTS 生成等の一時出力置き場
 * （gitignore 済）。手動削除任せだったため過去セッション残骸が 8.1GB 蓄積した。
 * セッション開始時点では当該セッションのファイルはまだ無いので、一定日数より古い
 * ファイル＝放置確定のものだけを安全に削除し、.tmp/ を有界に保つ。
 *
 * 仕様:
 * - mtime が TMP_PRUNE_DAYS（既定 3 日）より古いファイルを削除。
 * - 空になったサブディレクトリも除去。
 * - 追跡対象の .gitkeep / README.md（トップレベル）は常に保護。
 * - 何が起きても session を止めない（常に exit 0、削除時のみ要約を出力）。
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TMP = '.tmp';
const KEEP_TOP = new Set(['.gitkeep', 'README.md']);
const days = Number(process.env.TMP_PRUNE_DAYS || '3');
const cutoff = Date.now() - days * 86_400_000;

let bytes = 0;
let count = 0;

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

walk(TMP, true);

if (count > 0) {
  const mb = (bytes / 1024 / 1024).toFixed(0);
  console.log(`[tmp-prune] ${days} 日より古い .tmp スクラッチを ${count} 件削除（${mb} MB 解放）`);
}
