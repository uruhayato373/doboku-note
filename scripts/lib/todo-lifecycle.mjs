/**
 * todo-lifecycle.mjs — task → claim → release → complete の純関数群。
 *
 * 背景: docs/reviews/critical/todo-ui-agent-implementation-operations_批判的レビュー.md
 * 「処方箋3（claimの共通コマンド化）」「処方箋4（完了を1コマンドで閉じる）」の最小実装（最小実装順3）。
 * WIP排他（[進行中]トークンを選定器が除外する）は既に backlog-lib.mjs pickTasks() で実装済み
 * （最小実装順1）。本ファイルはその `[進行中]` トークンを**安全に付け外しする側**を担う。
 *
 * 設計方針:
 *   - `[進行中]` の真偽値は backlog.md のタグ行そのもの（既存 SSOT）に書く。二重管理しない
 *   - owner・開始時刻など「真偽値では表現できない付帯情報」だけを `.claude/state/todo-claims.json`
 *     という薄い補助ストアへ書く（dispatch-log.json と同種の位置づけ）
 *   - complete の commit 判定は「機械的に検証できる項目」だけを自動チェックし、
 *     人間/Agent の判断が要る項目（plan受入条件・ユーザー承認・残件抽出）は
 *     呼び出し側が `--confirm-conditions` で明示するまで進めない
 *     （批判的レビュー「どこか1つでも失敗したらカードとplanを保持し、完了扱いにしない」を守る）
 */
import { readFileSync } from 'node:fs';
import { parseBacklog } from './backlog-lib.mjs';
import { findCard, detectEol } from '../backlog-edit.mjs';

export const CLAIMS_PATH = '.claude/state/todo-claims.json';

/** claims.json の空スキーマ。 */
export function emptyClaimsStore() {
  return { _schema: { id: 'DN-####', owner: 'claude-code|codex|user', startedAt: 'ISO8601', branch: 'string' }, claims: [] };
}

export function readClaimsStore(raw) {
  if (raw == null) return emptyClaimsStore();
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d.claims)) return emptyClaimsStore();
    return d;
  } catch {
    return emptyClaimsStore();
  }
}

/**
 * タグ行内の `[進行中]` トークンを追加する。
 * @returns {{ok:true, text:string, card:object}|{ok:false, error:string}}
 */
export function addWipToken(text, id) {
  const found = findCard(text, id);
  if (found.error) return { ok: false, error: found.error };
  const { card } = found;
  if (card.wip) return { ok: false, error: `${id} は既に [進行中]（二重claim拒否）` };
  if (!card.hasTagLine) return { ok: false, error: `${id} にタグ行が無い（先に検証:等を含む正規のタグ行を追加すること）` };
  const eol = detectEol(text);
  const lines = text.split(eol);
  const tagLineIdx = findTagLineIndex(lines, card);
  if (tagLineIdx === -1) return { ok: false, error: `${id} のタグ行が見つからない（パース不整合）` };
  lines[tagLineIdx] = lines[tagLineIdx].replace(/\s*$/, '') + ' [進行中]';
  return { ok: true, text: lines.join(eol), card };
}

/**
 * タグ行内の `[進行中]` トークンを除去する。
 * @returns {{ok:true, text:string, card:object}|{ok:false, error:string}}
 */
export function removeWipToken(text, id) {
  const found = findCard(text, id);
  if (found.error) return { ok: false, error: found.error };
  const { card } = found;
  if (!card.wip) return { ok: false, error: `${id} は [進行中] ではない（release対象外）` };
  const eol = detectEol(text);
  const lines = text.split(eol);
  const tagLineIdx = findTagLineIndex(lines, card);
  if (tagLineIdx === -1) return { ok: false, error: `${id} のタグ行が見つからない（パース不整合）` };
  lines[tagLineIdx] = lines[tagLineIdx].replace(/\s*\[進行中\]\s*/, ' ').replace(/\s+$/, '');
  return { ok: true, text: lines.join(eol), card };
}

/** card.startLine から本文開始までの範囲で「タグ: 」行の実際の行 index（0-based）を探す。 */
function findTagLineIndex(lines, card) {
  // startLine はカード見出し行（1-based）。その直後〜endLineの間で最初の「タグ: 」行を探す。
  for (let i = card.startLine; i < card.endLine; i++) {
    if (/^タグ:\s*/.test(lines[i])) return i;
  }
  return -1;
}

/**
 * claim: backlogへ[進行中]を付け、claims.jsonへowner/開始時刻を記録する。
 * @returns {{ok:true, text:string, claimsStore:object}|{ok:false, error:string}}
 */
export function claimTask(text, claimsRaw, id, owner, opts = {}) {
  const store = readClaimsStore(claimsRaw);
  if (store.claims.some((c) => c.id === id)) {
    return { ok: false, error: `${id} は既に claims.json に記録済み（二重claim拒否・owner=${store.claims.find((c) => c.id === id).owner}）` };
  }
  const added = addWipToken(text, id);
  if (!added.ok) return added;
  const startedAt = opts.now || new Date().toISOString();
  store.claims.push({ id, owner, startedAt, branch: opts.branch || null });
  return { ok: true, text: added.text, claimsStore: store };
}

/**
 * release: backlogから[進行中]を外し、claims.jsonから記録を消す。
 * @returns {{ok:true, text:string, claimsStore:object}|{ok:false, error:string}}
 */
export function releaseTask(text, claimsRaw, id, opts = {}) {
  const store = readClaimsStore(claimsRaw);
  const removed = removeWipToken(text, id);
  if (!removed.ok) return removed;
  store.claims = store.claims.filter((c) => c.id !== id);
  return { ok: true, text: removed.text, claimsStore: store, reason: opts.reason || null };
}

/**
 * complete の dry-run チェック。機械検証できる項目だけを判定し、
 * 人間判断が要る項目は `requiresConfirmation: true` で明示する。
 * @returns {{ok:boolean, id:string, checks:Array<{label:string,pass:boolean|null,detail:string}>}}
 */
export function checkCompleteReadiness(text, claimsRaw, id) {
  const found = findCard(text, id);
  const checks = [];
  if (found.error) {
    return { ok: false, id, checks: [{ label: 'card-exists', pass: false, detail: found.error }] };
  }
  const { card } = found;
  const store = readClaimsStore(claimsRaw);
  const claim = store.claims.find((c) => c.id === id);
  checks.push({
    label: 'claimed',
    pass: Boolean(claim),
    detail: claim ? `owner=${claim.owner} startedAt=${claim.startedAt}` : `${id} はclaimされていない（todo:claim未実行）`,
  });
  checks.push({
    label: 'wip-flag',
    pass: card.wip,
    detail: card.wip ? '[進行中] あり' : '[進行中] が無い（claim状態と不整合の疑い）',
  });
  // 機械検証できない3項目（処方箋4の条件1-3）は常に requiresConfirmation として明示する。
  checks.push({
    label: 'plan-acceptance-and-verification',
    pass: null,
    detail: '要人間/Agent確認: planの受入条件と指定検証コマンドが成功しているか（--confirm-conditionsで明示）',
  });
  checks.push({
    label: 'external-approval',
    pass: null,
    detail: '要人間/Agent確認: 外部操作を含む場合はユーザー承認とライブ実体確認があるか（--confirm-conditionsで明示）',
  });
  checks.push({
    label: 'residual-extracted',
    pass: null,
    detail: '要人間/Agent確認: 残件は別のDN-####へ抽出済みか（--confirm-conditionsで明示）',
  });
  const hardFails = checks.filter((c) => c.pass === false);
  return { ok: hardFails.length === 0, id, checks, card };
}
