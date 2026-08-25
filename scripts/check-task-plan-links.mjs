#!/usr/bin/env node
/**
 * task-plan結線ゲート — .claude/plans/ の実装計画が backlog カードと機械的に整合しているかを検査する。
 *
 * 背景: docs/reviews/critical/todo-ui-agent-implementation-operations_批判的レビュー.md「処方箋2」。
 * plan は「複数フェーズ・外部書込み・破壊的操作・収益影響・複数の受入ゲート」のいずれかを含む案件だけが持つ
 * 実装契約で、backlog カードの `[DN-####]` と 1:1 のはずだが、これまで機械検査が無く
 * ①ディレクトリ名が taskId と食い違う（`pe-construction-subject-packs/` が実は DN-0092）
 * ②frontmatter のキーが統一されていない（`created`/`createdAt`、`deleteAfterCompletion`/`deleteOnComplete`、
 *   本来書くべきでない `status`/`owner` が state を二重管理していた）
 * が無自覚に発生していた（2026-08-25 是正）。
 *
 * plan master の正準 frontmatter:
 *   ---
 *   taskId: DN-####
 *   type: implementation-plan
 *   createdAt: YYYY-MM-DD
 *   deleteOnComplete: true
 *   ---
 *
 * 検査対象の「plan unit」:
 *   - ディレクトリ型: `.claude/plans/DN-####-slug/` 配下の `00-master.md`（無ければ `00-*.md` を代用）
 *   - 単一ファイル型: `.claude/plans/DN-####-slug.md`
 *
 * 検査項目:
 *   1. 存在      — backlog カード本文が `../plans/...` で参照するパスが実在するか
 *   2. 相互参照  — plan master の taskId frontmatter と、参照元カードの ID が一致するか
 *   3. 命名規則  — plan unit のディレクトリ/ファイル名が `DN-####` で始まるか（食い違いは即エラー）
 *   4. 1task=1plan — 同一 taskId を持つ plan unit が複数存在しないか
 *   5. ID重複    — 別の plan unit が同じ taskId を名乗っていないか（4と同じデータで判定・観点が違うので分けて報告）
 *   6. 孤児plan  — plan unit の taskId に対応する backlog カードが存在しないか（カード削除後の消し忘れ）
 *
 * 完了済み(deleteOnComplete)判定はしない。削除の可否は 99-finalize-and-delete.md の受入条件で人間/Agentが判断する。
 *
 * Usage:
 *   node scripts/check-task-plan-links.mjs         全量検査
 *   node scripts/check-task-plan-links.mjs --json  機械可読
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog } from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLANS_DIR = join(ROOT, '.claude/plans');
const BACKLOG_PATH = join(ROOT, '.claude/todo/backlog.md');
const JSON_OUT = process.argv.includes('--json');

const DN_ID_RE = /^DN-\d{4}$/;

function readFrontmatter(absPath) {
  const raw = readFileSync(absPath, 'utf8').replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.+?)\s*$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

/** .claude/plans/ 直下を走査し、plan unit の一覧を返す。 */
function discoverPlanUnits() {
  const entries = readdirSync(PLANS_DIR, { withFileTypes: true });
  const units = [];
  for (const e of entries) {
    const abs = join(PLANS_DIR, e.name);
    if (e.isDirectory()) {
      const files = readdirSync(abs).filter((f) => f.endsWith('.md'));
      const masterName = files.includes('00-master.md')
        ? '00-master.md'
        : files.find((f) => /^00-/.test(f));
      units.push({
        kind: 'dir',
        name: e.name,
        dirAbs: abs,
        masterAbs: masterName ? join(abs, masterName) : null,
        masterName,
        files,
      });
    } else if (e.isFile() && e.name.endsWith('.md')) {
      units.push({ kind: 'file', name: e.name.replace(/\.md$/, ''), dirAbs: abs, masterAbs: abs, masterName: e.name, files: [e.name] });
    }
  }
  return units;
}

function main() {
  if (!existsSync(PLANS_DIR)) {
    console.log('[check-task-plan-links] .claude/plans/ が無い（plan 未使用）— skip');
    return;
  }
  const units = discoverPlanUnits();
  const backlogText = readFileSync(BACKLOG_PATH, 'utf8');
  const cards = parseBacklog(backlogText);
  const cardIds = new Set(cards.map((c) => c.id).filter(Boolean));

  const violations = [];
  const taskIdToUnits = new Map();

  for (const u of units) {
    const expectedId = (u.name.match(/^(DN-\d{4})/) || [])[1];
    if (!expectedId) {
      violations.push({ type: 'naming', unit: u.name, detail: `plan unit 名が DN-#### で始まらない（命名規則違反）` });
      continue;
    }
    if (!u.masterAbs || !existsSync(u.masterAbs)) {
      violations.push({ type: 'missing-master', unit: u.name, detail: `master ファイルが見つからない（${u.kind === 'dir' ? '00-master.md 相当が無い' : 'ファイル不在'}）` });
      continue;
    }
    const fm = readFrontmatter(u.masterAbs);
    if (!fm) {
      violations.push({ type: 'no-frontmatter', unit: u.name, detail: `master に frontmatter が無い（taskId/type/createdAt/deleteOnComplete が必要）` });
      continue;
    }
    if (fm.taskId !== expectedId) {
      violations.push({ type: 'id-mismatch', unit: u.name, detail: `ディレクトリ/ファイル名は ${expectedId} だが frontmatter taskId は ${fm.taskId || '(無し)'}` });
    }
    if (fm.type !== 'implementation-plan') {
      violations.push({ type: 'schema', unit: u.name, detail: `type が implementation-plan でない（${fm.type || '(無し)'}）` });
    }
    if (!fm.createdAt) {
      violations.push({ type: 'schema', unit: u.name, detail: 'createdAt が無い' });
    }
    if (fm.deleteOnComplete !== 'true') {
      violations.push({ type: 'schema', unit: u.name, detail: `deleteOnComplete が true でない（${fm.deleteOnComplete || '(無し)'}）` });
    }
    // state を frontmatter に二重管理しない（処方箋2「状態や進捗は書かない」）
    for (const bannedKey of ['status', 'owner']) {
      if (fm[bannedKey] !== undefined) {
        violations.push({ type: 'schema', unit: u.name, detail: `frontmatter に ${bannedKey} を持たせない（state は SSOT から導出する）` });
      }
    }

    const id = fm.taskId || expectedId;
    if (!taskIdToUnits.has(id)) taskIdToUnits.set(id, []);
    taskIdToUnits.get(id).push(u.name);

    if (DN_ID_RE.test(id) && !cardIds.has(id)) {
      violations.push({ type: 'orphan-plan', unit: u.name, detail: `taskId ${id} に対応する backlog カードが無い（カード削除後の消し忘れの疑い）` });
    }
  }

  // 4. 1task=1plan / 5. ID重複（同一データ源・観点別に報告）
  for (const [id, unitNames] of taskIdToUnits) {
    if (unitNames.length > 1) {
      violations.push({ type: 'duplicate-taskid', unit: unitNames.join(', '), detail: `taskId ${id} を複数の plan unit が名乗っている（1 task = 最大1 active plan 違反）` });
    }
  }

  // 1. 存在 + 2. 相互参照: backlog カード本文の `../plans/...` 参照を実在確認
  const PLAN_REF_RE = /\.\.\/plans\/([^)\s`]+\.md)/g;
  for (const card of cards) {
    if (!card.body) continue;
    let m;
    PLAN_REF_RE.lastIndex = 0;
    while ((m = PLAN_REF_RE.exec(card.body))) {
      const relFromPlans = m[1];
      const absTarget = join(PLANS_DIR, relFromPlans);
      if (!existsSync(absTarget)) {
        violations.push({ type: 'broken-ref', unit: card.id, detail: `../plans/${relFromPlans} が実在しない` });
        continue;
      }
      const referencedUnitDir = relFromPlans.split('/')[0].replace(/\.md$/, '');
      const referencedTaskId = (referencedUnitDir.match(/^(DN-\d{4})/) || [])[1];
      if (referencedTaskId && referencedTaskId !== card.id) {
        violations.push({ type: 'mutual-ref-mismatch', unit: card.id, detail: `参照先 plan の taskId(${referencedTaskId}) がカードID(${card.id})と不一致` });
      }
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ unitCount: units.length, cardCount: cards.length, violations }, null, 2));
  } else {
    console.log(`[check-task-plan-links] plan unit ${units.length} 件 / backlog カード ${cards.length} 件を実検査`);
    if (violations.length === 0) {
      console.log('[check-task-plan-links] ✓ task-plan結線に違反なし');
    } else {
      for (const v of violations) console.log(`  [${v.type}] ${v.unit}: ${v.detail}`);
      console.log(`\n[check-task-plan-links] ✗ 違反 ${violations.length} 件`);
    }
  }
  process.exit(violations.length > 0 ? 1 : 0);
}

main();
