#!/usr/bin/env node
/**
 * backlog-edit.mjs — .claude/todo/backlog.md のカードを安全に削除する最小 CLI。
 *
 * 背景: 今日の不具合カード消化で「実体照合の結果カードを消す」を 4 回やり、毎回
 *   CRLF 保持・カード境界（次の `###`/`##` まで）を手書きした one-off スクリプトで
 *   処理した。境界判定は scripts/lib/backlog-lib.mjs の parseBacklog が既に
 *   startLine/endLine として計算済みなので、それを再利用する（再実装しない）。
 *
 * 本文の書き換え（縮約・追記）はスコープ外——それは文章判断なので Edit ツールが正しい。
 * 機械化するのは「安全に消す」だけ。
 *
 * Usage:
 *   node scripts/backlog-edit.mjs --show DN-0100              # カード本文を表示
 *   node scripts/backlog-edit.mjs --delete DN-0129            # dry-run（削除される範囲を表示）
 *   node scripts/backlog-edit.mjs --delete DN-0129 --commit   # 実削除 → check-backlog-schema を自動実行
 *   node scripts/backlog-edit.mjs --next-id                   # 次に使える DN-#### を1件出力（RESEED/新規起票用）
 * exit: 0 成功 / 1 ID が見つからない・重複・書き込み失敗 / 2 引数不正
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseBacklog } from './lib/backlog-lib.mjs';

const NAME = 'backlog-edit';
const BACKLOG = '.claude/todo/backlog.md';

/** 改行コードを検出する（backlog.md は CRLF 前提だが、テストは LF でも通せるようにする）。 */
export function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * id のカードを 1 件だけ探す。0 件・2 件以上はどちらもエラーとして返す
 * （重複 ID は backlog-health S10 の管轄。ここでは安全側に倒して何もしない）。
 * @returns {{ card: object }|{ error: string }}
 */
export function findCard(text, id) {
  const matches = parseBacklog(text).filter((c) => c.id === id);
  if (matches.length === 0) return { error: `${id} は backlog に存在しない` };
  if (matches.length > 1) return { error: `${id} が ${matches.length} 件ヒットした（重複 ID）` };
  return { card: matches[0] };
}

/**
 * id のカードをテキストから削除する。存在確認は findCard に委ねる。
 * @returns {{ ok: true, text: string, removed: number, card: object }|{ ok: false, error: string }}
 */
export function deleteCard(text, id) {
  const found = findCard(text, id);
  if (found.error) return { ok: false, error: found.error };
  const { card } = found;
  const eol = detectEol(text);
  const lines = text.split(eol);
  const removed = card.endLine - card.startLine + 1;
  lines.splice(card.startLine - 1, removed);
  return { ok: true, text: lines.join(eol), removed, card };
}

/**
 * これまでに使われたことのある最大の DN-#### を返す（呼び出し側は +1 して次の空き番として使う）。
 *
 * 完了カードは backlog.md からセクションごと削除されるため、**現在の backlog.md だけを見ると
 * 欠番へ別タスクが着地して ID が再利用される**（2026-08-20 に DN-0096/DN-0097 で実発生・
 * check-backlog-health.mjs の S10 が検知対象にしているのと同じ事故）。ID は全て backlog.md の
 * `### [DN-####]` 見出しとして生まれる（monthly/weekly/annual は既存 ID を参照するだけで
 * 新規に採番しない）ので、**backlog.md の全履歴**（現存カード + 過去に存在して削除された
 * カードの両方）を見れば十分。旧パス `docs/todo/backlog.md`（2026-08-18 移設前）も含める。
 *
 * @param {string} text 現在の backlog.md（生テキスト）
 * @param {string|null} gitLogText `git log -p -- backlog.md [旧パス]` の生テキスト。
 *   取得できない環境（degraded）では null を渡す＝現在のテキストだけで判定する。
 * @returns {{ next: string, max: number, degraded: boolean }}
 */
export function nextId(text, gitLogText) {
  const ids = new Set();
  for (const m of text.matchAll(/DN-(\d{4})/g)) ids.add(Number(m[1]));
  if (gitLogText != null) {
    for (const m of gitLogText.matchAll(/DN-(\d{4})/g)) ids.add(Number(m[1]));
  }
  const max = ids.size ? Math.max(...ids) : 0;
  return { next: `DN-${String(max + 1).padStart(4, '0')}`, max, degraded: gitLogText == null };
}

// ── CLI ──────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && process.argv[1].endsWith('backlog-edit.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const SHOW = arg('--show');
  const DELETE = arg('--delete');
  const NEXT_ID = argv.includes('--next-id');
  const COMMIT = argv.includes('--commit');

  if (!SHOW && !DELETE && !NEXT_ID) {
    console.error(`使い方: node scripts/${NAME}.mjs --show <ID> | --delete <ID> [--commit] | --next-id`);
    process.exit(2);
  }

  const raw = readFileSync(BACKLOG, 'utf8');

  if (NEXT_ID) {
    let gitLogText = null;
    try {
      gitLogText = execFileSync(
        'git',
        ['log', '-p', '--format=%H', '--', BACKLOG, 'docs/todo/backlog.md'],
        { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 20_000 },
      );
    } catch {
      // git が無い／遅い環境では現在の backlog.md だけで判定する（黙って劣化させない・§9）
    }
    const r = nextId(raw, gitLogText);
    if (r.degraded) console.error(`[${NAME}] 警告: git 履歴を読めず現在の backlog.md だけで判定した（削除済み ID との衝突リスクが残る）`);
    console.log(r.next);
    process.exit(0);
  }

  if (SHOW) {
    const found = findCard(raw, SHOW);
    if (found.error) { console.error(`FAIL: ${found.error}`); process.exit(1); }
    const c = found.card;
    console.log(`L${c.startLine}-${c.endLine}  ${c.title}`);
    console.log(`tier=${c.tier} kind=${c.kind ?? '—'} executor=${c.executor ?? '—'}`);
    console.log('---');
    console.log(c.body);
    process.exit(0);
  }

  const result = deleteCard(raw, DELETE);
  if (!result.ok) { console.error(`FAIL: ${result.error}`); process.exit(1); }
  const { card, removed } = result;
  console.log(`${COMMIT ? '[delete]' : '[dry-run]'} ${card.id}  L${card.startLine}-${card.endLine}（${removed} 行）`);
  console.log(`  ${card.title}`);

  if (!COMMIT) {
    console.log('\n--commit を付けると実削除する。');
    process.exit(0);
  }

  writeFileSync(BACKLOG, result.text, 'utf8');
  console.log(`  → ${removed} 行削除して書き戻した`);

  try {
    execFileSync('node', ['scripts/check-backlog-schema.mjs'], { stdio: 'inherit' });
  } catch {
    console.error(`\n[${NAME}] check-backlog-schema が失敗した。上の削除で構造を壊していないか確認すること。`);
    process.exit(1);
  }
}
