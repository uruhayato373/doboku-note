#!/usr/bin/env node
/**
 * check-disk-hygiene.mjs — ローカルディスク肥大の surfacer（読み取り専用・削除しない）
 * ---------------------------------------------------------------------------
 * 背景（2026-09-10）: Mac の空きが 7.5GB まで落ちるまで誰も気づかなかった。gitignore 済み・
 *   ホーム配下・worktree のビルド成果物は CI にも pre-commit にも映らないので、
 *   **ローカルで見る仕組み**が要る。掃除の実体は launchd（日次 `disk-hygiene.mjs --fix`）で、
 *   ここはその状態と残っている滞留物を出すだけ。掃除が止まっていること自体も検知する。
 *
 * 判定:
 *   FAIL … 空き < failBytes ／ worktree の置き場違反 ／ 日次掃除が停止・未導入 ／
 *          会話ログの保持期間が未設定・方針超過
 *   WARN … 空き < warnBytes ／ 除去できる worktree がある ／ 閾値超の再生成物
 *
 * 使い方:
 *   npm run check-disk-hygiene                 # 表 + 検査件数 + exit 0/1/2
 *   node scripts/check-disk-hygiene.mjs --quick        # 1 秒未満・警告行のみ・常に exit 0（SessionStart）
 *   node scripts/check-disk-hygiene.mjs --quick --stop # 今すぐ効く 2 件だけ（Stop フック・毎ターン鳴る）
 *   node scripts/check-disk-hygiene.mjs --json
 *
 * 検査件数を必ず出す（CLAUDE.md §9）。macOS 専用項目が検査できない環境では
 * 「検査不成立」と明示して exit 2 にする（緑にしない）。
 * ---------------------------------------------------------------------------
 */
import { collect, loadConfig } from './disk-hygiene.mjs';
import { bytesHuman, formatTable, summarize } from './lib/disk-hygiene.mjs';

const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick');
const STOP = argv.includes('--stop');
const JSON_OUT = argv.includes('--json');

let config;
try {
  config = loadConfig();
} catch (e) {
  console.error(`[check-disk-hygiene] ✗ 設定を読めない（.claude/config/disk-hygiene.json）: ${e.message}`);
  console.error('[check-disk-hygiene] 検査不成立（検査 0 件）。緑にしない。');
  process.exit(2);
}

const items = collect({ quick: QUICK, config });
const summary = summarize(items, { mode: QUICK ? 'quick' : 'full' });

if (JSON_OUT) {
  console.log(JSON.stringify({ items, summary }, null, 2));
  process.exit(summary.exitCode);
}

if (QUICK) {
  // check-git-sync と同じ流儀: 言うことが無ければ黙る。1 行に「何が」と「推奨コマンド」を出す。
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const say = (msg) => console.log(`[disk-hygiene] ⚠ ${msg}`);

  const free = byId['free-space'];
  if (free && free.status === 'fail') {
    say(`空きが ${bytesHuman(free.bytes)} しかない。 推奨: npm run disk-hygiene:fix`);
  } else if (!STOP && free && free.status === 'warn') {
    say(`空きが ${bytesHuman(free.bytes)}。 推奨: npm run check-disk-hygiene`);
  }

  const wt = byId.worktrees;
  if (wt && wt.actions.length > 0) {
    const list = wt.actions.map((a) => a.path.split('/').pop()).join(', ');
    say(`マージ済みで残っている worktree ${wt.actions.length} 本（${list}）。 推奨: git worktree remove <path>`);
  }

  if (!STOP) {
    const place = byId['worktree-placement'];
    if (place && place.status === 'fail') say(`worktree の置き場違反。 ${place.detail}`);
    const auto = byId.automation;
    if (auto && auto.status === 'fail') say(auto.detail);
    const settings = byId['claude-settings'];
    if (settings && settings.status === 'fail') say(`${settings.detail}`);
  }
  process.exit(0);
}

console.log(formatTable(items, summary));
if (summary.unsupported > 0) {
  console.log(
    `[check-disk-hygiene] 検査不成立: macOS 専用 ${summary.unsupported} 項目が未検査（Mac で実行する）。緑にしない。`,
  );
}
if (summary.fail > 0) {
  console.log('[check-disk-hygiene] ✗ FAIL あり。上の詳細に推奨コマンドがある。');
} else if (summary.exitCode === 0) {
  console.log('[check-disk-hygiene] ✓ 問題なし。掃除は launchd が日次で回している。');
}
process.exit(summary.exitCode);
