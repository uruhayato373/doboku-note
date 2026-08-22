#!/usr/bin/env node
/**
 * check-backlog-verify.mjs — `[検証:cmd]` を実走して「完了の疑い」を surface する
 * ---------------------------------------------------------------------------
 * 背景（2026-08-18）: backlog のカードは実査すると既に完了していることがある
 *   （2026-08-17 の棚卸しでは 1 日に 6 件がこれだった）。カードは `[検証:cmd]` に
 *   「完了を判定できる npm script」を持っているのに、**誰も自動で流していなかった**。
 *
 * **単純に「緑＝完了の疑い」とすると使い物にならない。** 初版をそう作って実走したところ
 *   19 枚中 17 枚が引っかかった（コマンド 15 本中 13 本が緑）。原因は、`[検証:]` の多くが
 *   完了判定ではなく **surfacer** だったこと:
 *     check-note-republish  … drift 348 本でも exit 0（報告するだけ）
 *     x-schedule-guard      … 「予約してよい」の意味で、タスク完了とは無関係
 *     quality-census        … レポートを生成するだけ
 *   常に緑なので毎回全部が「疑い」になり、本物が埋もれる。
 *
 * そこで **状態の遷移**を見る:
 *   red → green   … 前回は赤かったのに今回緑＝**完了の疑い**（本命シグナル）
 *   green → green … 常時緑＝`[検証:]` の指定が完了判定になっていない疑い（別の問題として出す）
 *   red           … まだ生きている（カードは正しい）
 *   error         … 実行不能。**「完了」ではなく検査不成立**
 *
 * **緑は完了の証明ではない。** 同日に実例が出た: `check-note-attachments` の正規表現が
 *   「印刷用 PDF」（半角スペース入り）を拾えず、案内済み 77 本を誤検出していた。そのカードは
 *   `[検証:check-note-attachments]` を持っていたので、検証を流しても偽陽性が追認されるだけ
 *   だった（カードと検証が同じ誤りを指すと自己整合する）。最終判断は
 *   `/backlog-sweep` 手順 2「実査ファースト」＝一次資料の確認へ渡す。
 *
 * 実行方針: **逐次**（外部 API を叩くコマンドが混ざるため並列にしない）。
 *
 * Usage:
 *   node scripts/check-backlog-verify.mjs
 *   node scripts/check-backlog-verify.mjs --timeout 300
 *   node scripts/check-backlog-verify.mjs --json
 *   node scripts/check-backlog-verify.mjs --no-record   # 状態を記録しない（お試し実行）
 *
 * exit: 0 常に（surfacer であってゲートではない）/ 2 検査不成立（backlog 不読・対象 0）
 * 状態: .claude/state/backlog/verify-status.json（コマンド → 前回の status）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseBacklog, TODO_DIR } from './lib/backlog-lib.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = join(ROOT, TODO_DIR, 'backlog.md');
const STATE = join(ROOT, '.claude/state/backlog/verify-status.json');
const JSON_OUT = process.argv.includes('--json');
const NO_RECORD = process.argv.includes('--no-record');
const tIdx = process.argv.indexOf('--timeout');
const TIMEOUT_MS = (tIdx >= 0 ? Number(process.argv[tIdx + 1]) : 180) * 1000;

function main() {
  if (!existsSync(BACKLOG)) {
    console.error(`✗ 検査不成立: ${TODO_DIR}/backlog.md が無い`);
    process.exit(2);
  }
  const cards = parseBacklog(readFileSync(BACKLOG, 'utf8'));
  if (!cards.length) {
    console.error('✗ 検査不成立: カードを 1 件も抽出できなかった（パース契約の破損を疑う）');
    process.exit(2);
  }
  const targets = cards.filter((c) => c.verify);
  if (!targets.length) {
    console.error('✗ 検査不成立: `[検証:cmd]` を持つカードが 1 枚も無い');
    process.exit(2);
  }

  // 同じコマンドを複数カードが指す（例: check-note-republish が 3 枚）。1 回だけ実走する
  const byCmd = new Map();
  for (const c of targets) {
    if (!byCmd.has(c.verify)) byCmd.set(c.verify, []);
    byCmd.get(c.verify).push(c);
  }

  const prev = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { commands: {} };
  const firstRun = !existsSync(STATE);

  const results = [];
  // 自分自身を [検証:] に指したカードがあると無限再帰でタイムアウトする（2026-08-20 に実発生）。
  // 「検査不成立」として一度だけ報告し、実走はしない。
  const SELF = 'check-backlog-verify';
  const selfOwners = byCmd.get(SELF);
  if (selfOwners) byCmd.delete(SELF);

  for (const [cmd, owners] of byCmd) {
    const r = spawnSync('npm', ['run', cmd, '--silent'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      shell: true, // npm は Windows で shell 経由でないと起動しない
      maxBuffer: 32 * 1024 * 1024,
    });
    const timedOut = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM';
    const status = timedOut || r.error ? 'error' : r.status === 0 ? 'green' : 'red';
    const before = prev.commands?.[cmd]?.status ?? null;
    results.push({
      cmd,
      status,
      before,
      turnedGreen: status === 'green' && before === 'red',
      alwaysGreen: status === 'green' && before === 'green',
      reason: timedOut
        ? `タイムアウト（${TIMEOUT_MS / 1000}s）`
        : r.error
          ? String(r.error.message).slice(0, 60)
          : null,
      cards: owners.map((c) => ({ line: c.line, tier: c.tier, kind: c.kind, title: c.title })),
    });
  }

  if (selfOwners) {
    results.push({
      cmd: SELF,
      status: 'error',
      before: null,
      turnedGreen: false,
      alwaysGreen: false,
      reason: '自己参照（このスクリプト自身を [検証:] に指している）— 実走しない',
      cards: selfOwners.map((c) => ({ line: c.line, tier: c.tier, kind: c.kind, title: c.title })),
    });
  }

  const suspect = results.filter((x) => x.turnedGreen).flatMap((x) => x.cards.map((c) => ({ ...c, cmd: x.cmd })));
  const surfacers = results.filter((x) => x.alwaysGreen);
  const alive = results.filter((x) => x.status === 'red');
  const errs = results.filter((x) => x.status === 'error');

  if (!NO_RECORD) {
    mkdirSync(dirname(STATE), { recursive: true });
    const commands = {};
    for (const x of results) commands[x.cmd] = { status: x.status, at: todayJst() };
    writeFileSync(
      STATE,
      JSON.stringify(
        {
          _doc:
            'check-backlog-verify が前回の status を覚えておくための状態。' +
            'red → green の遷移だけが「完了の疑い」で、常時 green は [検証:] の指定が' +
            '完了判定になっていない疑い（surfacer を指している）。',
          updatedAt: todayJst(),
          commands,
        },
        null,
        2,
      ) + '\n',
    );
  }

  if (JSON_OUT) {
    writeSync(1, JSON.stringify({
      cards: cards.length, withVerify: targets.length, commands: byCmd.size, firstRun,
      suspect, surfacers: surfacers.map((x) => x.cmd), alive: alive.map((x) => x.cmd),
      errors: errs.map((x) => ({ cmd: x.cmd, reason: x.reason })), results,
    }, null, 2) + '\n');
    process.exit(0);
  }

  // 検査ゼロを PASS と呼ばない: 対象数と実走数を必ず出す
  console.log(
    `[check-backlog-verify] カード ${cards.length} 枚 / うち [検証:] 付き ${targets.length} 枚 ` +
      `→ ユニークコマンド ${byCmd.size} 本を実走`,
  );
  console.log(
    `  赤→緑 ${results.filter((x) => x.turnedGreen).length} / 常時緑 ${surfacers.length} ` +
      `/ 赤 ${alive.length} / 実行不能 ${errs.length}`,
  );

  if (firstRun) {
    console.log('\n  初回実行のため遷移は判定できない（今回の status を基準として記録した）。');
    console.log('  次回以降、赤→緑になったカードが「完了の疑い」として出る。');
  }

  if (suspect.length) {
    console.log(`\n■ 完了の疑い ${suspect.length} 枚（検証コマンドが赤→緑へ変わった）`);
    for (const s of suspect) {
      console.log(`  L${String(s.line).padEnd(5)} [${s.tier}/${s.kind ?? '-'}] ${s.title.slice(0, 46)}`);
      console.log(`      {検証:${s.cmd}}`);
    }
    console.log(
      '\n  **緑は完了の証明ではない。** 2026-08-18 に check-note-attachments の正規表現が\n' +
        '  案内済み 77 本を誤検出した実例がある（カードと検証が同じ誤りを指すと自己整合する）。\n' +
        '  /backlog-sweep 手順 2「実査ファースト」で一次資料を確認してから削除すること。',
    );
  }

  if (surfacers.length) {
    console.log(`\n■ 常時緑 ${surfacers.length} 本 — \`[検証:]\` が完了判定になっていない疑い`);
    for (const x of surfacers) {
      console.log(`  ${x.cmd}  → ${x.cards.map((c) => 'L' + c.line).join(' ')}`);
    }
    console.log('  （報告するだけの surfacer を指していると、そのカードは永久に「完了」と判定できない）');
  }

  if (errs.length) {
    console.log(`\n■ 実行不能 ${errs.length} 本（「完了」ではなく検査不成立）`);
    for (const e of errs) console.log(`  ${e.cmd}: ${e.reason ?? '非ゼロ終了'}`);
  }
  process.exit(0);
}

main();
