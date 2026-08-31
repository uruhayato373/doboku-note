#!/usr/bin/env node
/**
 * check-dispatch-log.mjs — dispatch-log.json の整合検査（DN-0093 順4）
 * ---------------------------------------------------------------------------
 * 検査:
 *   1. パース可能・entries 配列（不能は exit 2＝検査不成立。§9: 検査ゼロを PASS と呼ばない）
 *   2. 日付キーは at 必須・YYYY-MM-DD 形式。date キーを持つエントリは FAIL
 *      （_schema=date / 実データ=at / 読み手=e.date の三つ巴不一致が 2026-08-26 まで実在し、
 *        weekly-review の集計が常に 0 件だった再発防止）
 *   3. at > LEGACY_CUTOFF のエントリは id（DN-####）必須。以前の11件は legacy として許容し件数を出す
 *   4. outcome は done|swept|blocked|fail
 * exit: 0 PASS / 1 違反 / 2 検査不成立
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_PATH = '.claude/state/dispatch/dispatch-log.json';
export const LEGACY_CUTOFF = '2026-08-18';
const OUTCOMES = new Set(['done', 'swept', 'blocked', 'fail']);
const ID_RE = /^DN-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 純関数（テストから直接呼ぶ）。@returns {{violations:string[], legacy:number, checked:number}} */
export function validateDispatchLog(json, { legacyCutoff = LEGACY_CUTOFF } = {}) {
  if (!json || !Array.isArray(json.entries)) return null; // 検査不成立
  const violations = [];
  let legacy = 0;
  json.entries.forEach((e, i) => {
    const tag = `entries[${i}]${e.task ? ` "${String(e.task).slice(0, 30)}"` : ''}`;
    if ('date' in e) violations.push(`${tag}: date キーは禁止（at を使う）`);
    if (!DATE_RE.test(e.at ?? '')) violations.push(`${tag}: at が YYYY-MM-DD でない (${e.at})`);
    if (e.outcome && !OUTCOMES.has(e.outcome)) violations.push(`${tag}: outcome 語彙外 (${e.outcome})`);
    if ((e.at ?? '') <= legacyCutoff && !e.id) { legacy += 1; return; }
    if (!ID_RE.test(e.id ?? '')) violations.push(`${tag}: id (DN-####) が必須 (at=${e.at})`);
  });
  return { violations, legacy, checked: json.entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let json;
  try { json = JSON.parse(readFileSync(join(ROOT, LOG_PATH), 'utf8')); }
  catch (e) { console.error(`[check-dispatch-log] 検査不成立: ${LOG_PATH} を読めない: ${e.message}`); process.exit(2); }
  const r = validateDispatchLog(json);
  if (!r) { console.error('[check-dispatch-log] 検査不成立: entries 配列が無い'); process.exit(2); }
  console.log(`[check-dispatch-log] ${r.checked} 件を実検査（legacy id無し ${r.legacy} 件を許容）`);
  if (r.violations.length) { r.violations.forEach((v) => console.error('  FAIL ' + v)); process.exit(1); }
  console.log('[check-dispatch-log] ✓ id 必須・at キー・outcome 語彙はすべて健全');
}
