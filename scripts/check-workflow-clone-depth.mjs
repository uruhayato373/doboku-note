#!/usr/bin/env node
/**
 * check-workflow-clone-depth.mjs — workflow の full clone（`fetch-depth: 0`）を禁じるゲート。
 *
 * 止めたい事故（2026-08-21 実発生）:
 *   `GSC auto review` が `System.IO.IOException: No space left on device` でランナーごと落ちた。
 *   **全ステップが conclusion=null**（1 本も走らずに死んだ）になり、ランナーが自分のログすら
 *   書けなかったため `gh run view --log-failed` は「log not found」しか返さず、
 *   通常のログ追跡では原因に到達できなかった（annotations API でだけ理由が読めた）。
 *
 *   原因は `fetch-depth: 0`。このリポジトリは **remote 11 GB** あり、
 *   ubuntu-latest の空き（約 14 GB）を実行中の一時ファイルと合わせて超える。
 *   容量の縁で動いていたため、成功と失敗が交互に出る「たまに落ちる」形になっていた。
 *
 * 検査: `.github/workflows/*.yml` に `fetch-depth: 0` を書かない。
 *   本当に全履歴が要る workflow は ALLOWLIST に **理由を添えて** 登録する。
 *
 * なぜ「履歴コマンドを使っていたら許す」にしないか:
 *   workflow が呼ぶ npm script の中で履歴を使うことがあり（build の sitemap git-dates 等）、
 *   静的解析では判定しきれない。実際 cloudflare-deploy.yml は既定 depth のまま
 *   git-dates を含む build を通しているので、**まず shallow で試すのが正しい既定**。
 *
 * Usage:
 *   node scripts/check-workflow-clone-depth.mjs
 *   node scripts/check-workflow-clone-depth.mjs --json
 *
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（走査が壊れている）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = join(ROOT, '.github/workflows');

/**
 * full clone を許す workflow。**理由を必ず書く**。
 * 空のまま維持できるのが望ましい（11 GB のリポジトリで full clone は常に縁に立つ）。
 * @type {Record<string, string>}
 */
export const ALLOWLIST = {};

/** 1 ファイルを判定する（純関数・テストから使う）。 */
export function auditCloneDepth(name, source, allowlist = ALLOWLIST) {
  const full = /^\s*fetch-depth:\s*0\s*$/m.test(source);
  const allowed = Object.hasOwn(allowlist, name);
  return { name, fullClone: full, allowed, reason: allowlist[name] ?? null, ok: !full || allowed };
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const say = jsonOut ? console.error : console.log;

  let files;
  try {
    files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    console.error(`✗ 検査不成立: ${WORKFLOW_DIR} を読めない`);
    process.exit(2);
  }
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）。
  if (files.length === 0) {
    console.error('✗ 検査不成立: workflow が 1 本も取れない（走査の破損を疑う）');
    process.exit(2);
  }

  const rows = files.map((f) => auditCloneDepth(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')));
  const full = rows.filter((r) => r.fullClone);
  const bad = rows.filter((r) => !r.ok);

  say(
    `[check-workflow-clone-depth] workflow ${files.length} 本を実検査 / ` +
      `fetch-depth: 0 は ${full.length} 本（うち allowlist ${full.length - bad.length} 本）`,
  );
  for (const r of full) say(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.reason ? `  — ${r.reason}` : ''}`);

  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({ files: files.length, fullClone: full.length, violations: bad }, null, 2)}\n`);
  }

  if (bad.length === 0) {
    say('[check-workflow-clone-depth] ✓ 許可のない full clone は無い');
    process.exit(0);
  }

  console.error(`\n[check-workflow-clone-depth] ✗ ${bad.length} 本が許可なく full clone している`);
  for (const r of bad) console.error(`  ${r.name}`);
  console.error(
    '\nこのリポジトリは remote 11 GB あり、ubuntu-latest の空き（約 14 GB）を実行中の一時ファイルと' +
      '\n合わせて超える。full clone はランナーごと落ちる（2026-08-21 に GSC auto review で実発生）。' +
      '\n修正: fetch-depth: 0 を消して既定（1）にする。本当に全履歴が要るなら' +
      '\nscripts/check-workflow-clone-depth.mjs の ALLOWLIST へ理由を添えて登録する。',
  );
  process.exit(1);
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('check-workflow-clone-depth.mjs')) main();
