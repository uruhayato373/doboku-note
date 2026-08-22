#!/usr/bin/env node
/**
 * backlog-sweep-pick.mjs
 * ---------------------------------------------------------------------------
 * /backlog-sweep の「次に何をやるか」を**コードで決める**（CLAUDE.md §5）。
 * ルーティング・環境判定をモデルに委ねないための選定器。read-only。
 *
 *   node scripts/backlog-sweep-pick.mjs                 # 人が読む形
 *   node scripts/backlog-sweep-pick.mjs --json          # sweep が読む形
 *   node scripts/backlog-sweep-pick.mjs --limit 3       # 実行候補の件数（既定 2）
 *   node scripts/backlog-sweep-pick.mjs --classify 0    # 分類待ちを出さない
 *
 * 選定規則:
 *   - **`[種類:不具合]` が第1キー、tier 🔴 → 🟡 → 🟢 が第2キー**（2026-08-18〜）。
 *     tier がもはや不具合の緊急度を表していない（不具合 26 件中 5 件が 🟢＝時期未定に沈む）
 *     ため、壊れているものを先に出す。種類未付与は不具合として扱わない
 *   - **🟣 判断待ちは自動選定しない**（ユーザー判断が要る）
 *   - `[実行:sweep]` / `[実行:機械]` だけを実行候補にする。
 *     `[実行:ユーザー|windows|別環境|対話]` は除外して理由別に数える
 *   - `[実行:]` 未付与は「分類待ち」として別枠で返す（sweep がタグ付け→次周から対象）。
 *     `[種類:]` 欠けも同じキューに載る（`missing` で何が欠けているかを返す）
 *
 * 検査ゼロを PASS と呼ばない（§9）: カード総数・選定可能数・除外内訳を必ず出す。
 * 「選べるタスクが 0 件」と「backlog が空」は別物として表示する。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog, findOrphanHeadings, pickTasks } from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = join(ROOT, '.claude/todo/backlog.md');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const numArg = (flag, dflt) => {
  const i = argv.indexOf(flag);
  if (i < 0) return dflt;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) ? v : dflt;
};
const limit = numArg('--limit', 2);
const classifyLimit = numArg('--classify', 2);

if (!existsSync(BACKLOG)) {
  console.error(`✗ 検査不成立: ${BACKLOG} が無い`);
  process.exit(2);
}

const text = readFileSync(BACKLOG, 'utf8');
const cards = parseBacklog(text);
const orphans = findOrphanHeadings(text);

// 走査対象が取れていないなら故障として落とす（0 件を緑にしない）
if (!cards.length) {
  console.error('✗ 検査不成立: backlog からカードを 1 件も抽出できなかった（パース契約の破損を疑う）');
  process.exit(2);
}

const r = pickTasks(cards, { limit, classifyLimit });

// 4 バケットが総数を分割していないなら、どこかのカードが数え漏れ／二重計上されている。
// 「実行可能 N 件」を信じて回す運用なので、合計が合わない状態を緑にしない（§9）。
if (!r.partitionOk) {
  console.error(
    `✗ 検査不成立: バケットが総数を分割していない` +
      `（実行可能 ${r.runnableTotal} + 分類待ち ${r.unclassifiedTotal} + 除外 ${r.excludedTotal} + 判断待ち ${r.holdTotal} ≠ ${cards.length}）`,
  );
  process.exit(2);
}

const tierCount = cards.reduce((a, c) => ((a[c.tier] = (a[c.tier] ?? 0) + 1), a), {});
const payload = {
  scanned: { cards: cards.length, tier: tierCount, orphanHeadings: orphans.length },
  runnableTotal: r.runnableTotal,
  unclassifiedTotal: r.unclassifiedTotal,
  excludedTotal: r.excludedTotal,
  excludedBy: r.excludedBy,
  holdTotal: r.holdTotal,
  order: r.order,
  kindCount: r.kindCount,
  kindMissingTotal: r.kindMissingTotal,
  needsTagTotal: r.needsTagTotal,
  run: r.run.map((c) => ({ line: c.line, tier: c.tier, kind: c.kind, title: c.title, category: c.category, executor: c.executor, verify: c.verify, codex: c.codex })),
  classify: r.classify.map((c) => ({ line: c.line, tier: c.tier, kind: c.kind, title: c.title, category: c.category, missing: c.missing })),
  defects: r.defects.map((c) => ({ line: c.line, tier: c.tier, title: c.title, executor: c.executor })),
  sunkDefects: r.sunkDefects.map((c) => ({ line: c.line, tier: c.tier, title: c.title })),
  orphans,
};

if (JSON_OUT) {
  writeSync(1, JSON.stringify(payload, null, 2) + '\n');
  process.exit(0);
}

const t = payload.scanned.tier;
console.log(`[backlog-sweep-pick] カード ${cards.length} 件を走査（🔴${t.high ?? 0} 🟡${t.mid ?? 0} 🟢${t.low ?? 0} 🟣${t.hold ?? 0}）`);
console.log(`  実行可能 ${r.runnableTotal} / 分類待ち ${r.unclassifiedTotal} / 除外 ${r.excludedTotal}${r.excludedTotal ? '（' + Object.entries(r.excludedBy).map(([k, v]) => `${k}:${v}`).join(' ') + '）' : ''} / 判断待ち ${r.holdTotal}`);
console.log(`  内訳の恒等式: ${r.runnableTotal} + ${r.unclassifiedTotal} + ${r.excludedTotal} + ${r.holdTotal} = ${cards.length} ✓`);

if (r.kindMissingTotal) {
  console.log(`  種類 未付与 ${r.kindMissingTotal} 件（内訳: ${Object.entries(r.kindCount).map(([k, v]) => `${k}:${v}`).join(' ')}）`);
}
if (r.sunkDefects.length) {
  console.log(`\n⚠ 不具合 ${r.defects.length} 件のうち ${r.sunkDefects.length} 件が 🟢/🟣 にある（tier が緊急度を表していない）`);
  for (const c of r.sunkDefects) console.log(`  L${c.line} [${c.tier}] ${c.title}`);
}

if (r.run.length) {
  console.log(`\n▼ 実行候補 ${r.run.length} 件（順序: 不具合 → tier）`);
  for (const c of r.run) console.log(`  L${c.line} [${c.tier}]${c.kind ? `[${c.kind}]` : ''} ${c.title}${c.verify ? `  → 検証: ${c.verify}` : ''}`);
} else if (r.runnableTotal === 0 && r.unclassifiedTotal > 0) {
  console.log(`\n▼ 実行候補なし — ただし backlog は空ではない。`);
  console.log(`  ${r.unclassifiedTotal} 件が [実行:] 未付与＝**分類していないから選べない**（タスクが無いのではない）`);
}

if (r.classify.length) {
  console.log(`\n▼ 分類待ち ${r.classify.length} / ${r.needsTagTotal} 件（欠けている token を付ける）`);
  for (const c of r.classify) console.log(`  L${c.line} [${c.tier}] ${c.title}  → 欠: ${c.missing.join('・')}`);
}

if (orphans.length) {
  console.log(`\n⚠ tier セクション外の ### が ${orphans.length} 件（パーサーが捨てる＝admin にも sweep にも見えない）`);
  for (const o of orphans.slice(0, 5)) console.log(`  L${o.line} ${o.title}`);
}

if (!r.run.length && !r.classify.length) {
  console.log('\n✓ 選定対象なし（実行可能・分類待ちとも 0 件）');
}
