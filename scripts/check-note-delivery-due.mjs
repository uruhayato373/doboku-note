#!/usr/bin/env node
/**
 * check-note-delivery-due.mjs
 * ---------------------------------------------------------------------------
 * 「購入者が商品を受け取れない状態」を**放置していないか**を見張る surfacer。
 *
 * なぜ要るか（2026-08-11 の事故）:
 *   建設部門 必須科目I の 7 本が、本文で「印刷用PDF付き」と約束しているのに
 *   ライブに添付が無いまま販売されていた。購入者 yobo 様からコメントで指摘されて
 *   初めて発覚し、運営者は「16日まで待ってほしい」と謝罪する事態になった。
 *   欠落自体は backlog に**記録されていた**が、誰も実行しないまま4日が過ぎた。
 *
 *   根本原因は「見つける仕組みが無かった」ではなく **「見つけた後に忘れる仕組みしか
 *   無かった」**。check-note-attachments --live は有料エリアの添付が未ログイン HTML に
 *   出ないため CI に載せられず（それ自体は正しい判断）、結果として**誰かが手で叩かない限り
 *   永久に沈黙する**状態だった。
 *
 * 何を見るか:
 *   A. 鮮度   — .claude/state/note-attachments-missing.json の measuredAt が STALE_DAYS より古い
 *              ＝ live 実査を回していない（「静か」ではなく「見ていない」）
 *   B. 未解消 — 前回の実査で見つかった欠落が残ったまま（missing[] が空でない）
 *   C. 取得失敗 — 実査は回したが fetchFail が多い＝検査不成立
 *
 * オフラインで動く（committed state だけを読む）ので週次レビュー（クラウド）から呼べる。
 * 実際の再実査は `npm run check-note-attachments:live`（ローカル・要ログイン）。
 *
 * 使い方:
 *   node scripts/check-note-delivery-due.mjs           # 人向け
 *   node scripts/check-note-delivery-due.mjs --json    # 週次レビュー surfacer 用
 * exit: 0=問題なし / 1=要対応
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = join(ROOT, '.claude/state/note-attachments-missing.json');
const STALE_DAYS = 14;      // 有料記事の追加・PDF差替えの頻度から、2週間を上限とする
const asJson = process.argv.includes('--json');
const TAG = '[check-note-delivery-due]';

const out = { due: false, reasons: [], actions: [], scanned: {}, measuredAt: null, ageDays: null };

if (!existsSync(STATE)) {
  out.due = true;
  out.reasons.push('live 実査の記録が無い（一度も全量実査していない可能性）');
  out.actions.push('npm run check-note-attachments:live（ローカル・要ログイン・約15分）');
} else {
  const s = JSON.parse(readFileSync(STATE, 'utf8'));
  const age = (Date.now() - Date.parse(s.measuredAt)) / 86_400_000;
  out.measuredAt = s.measuredAt;
  out.ageDays = Number(age.toFixed(1));
  out.scanned = { inspected: s.inspected ?? null, target: s.target ?? null, satisfied: s.satisfied ?? null, fetchFail: s.fetchFail ?? null };

  // A. 鮮度
  if (age > STALE_DAYS) {
    out.due = true;
    out.reasons.push(`live 実査が ${Math.floor(age)} 日前（上限 ${STALE_DAYS} 日）＝現状は未確認`);
    out.actions.push('npm run check-note-attachments:live');
  }
  // B. 未解消の欠落。**約束していて未添付**（購入者が受け取れない）と、
  //    **本文が触れていない未添付**（会員特典など方針判断）は重大度が違うので分けて出す。
  //    混ぜると緊急分が埋没し、実際 2026-08-03 の「不足192件」は4日放置された。
  const promised = s.missingPromised || (s.missing || []).filter((m) => m.promises);
  const silent = s.missingSilent || (s.missing || []).filter((m) => m.promises === false);
  out.scanned.missingPromised = promised.length;
  out.scanned.missingSilent = silent.length;
  if (promised.length) {
    out.due = true;
    out.reasons.push(`**購入者が受け取れない記事が ${promised.length} 本**（本文でPDFを約束しているのにライブに添付が無い・緊急）`);
    for (const m of promised.slice(0, 10)) out.actions.push(`添付: ${m.noteId} ${m.title ?? ''}`);
    if (promised.length > 10) out.actions.push(`…ほか ${promised.length - 10} 本`);
  }
  if (silent.length) {
    // 方針判断なので due にはしない（毎週赤くしても行動が変わらないため）。事実だけ残す。
    out.reasons.push(`（参考）本文が触れていない未添付 ${silent.length} 本 — 会員特典は「閲覧のみ」で添付しない方針あり。方針の真実源は noteコンテンツ計画 §7`);
  }
  // 旧スキーマ（missingPromised が無い古い state）では分離できない＝安全側に倒す
  if (!s.missingPromised && (s.missing || []).length && !(s.missing || []).some((m) => 'promises' in m)) {
    out.due = true;
    out.reasons.push(`前回実査が旧スキーマで重大度を分離できない（不足 ${(s.missing || []).length} 本）→ 再実査すること`);
    out.actions.push('npm run check-note-attachments:live');
  }
  // C. 検査不成立（取得失敗が支配的）
  if ((s.fetchFail ?? 0) > 0 && s.target && s.fetchFail / s.target > 0.1) {
    out.due = true;
    out.reasons.push(`前回実査は取得失敗 ${s.fetchFail}/${s.target} 件＝検査不成立の疑い`);
    out.actions.push('npm run check-note-attachments:live を再実行');
  }
  // 検査ゼロを PASS と呼ばない
  if ((s.inspected ?? 0) === 0) {
    out.due = true;
    out.reasons.push('前回実査の実検査数が 0（対象抽出が壊れている疑い）');
  }
}

// D. --allow-attachment-loss で意図的に捨てた添付が、再添付されないまま残っていないか。
//    実査（--live）は手動なので、次に回すまで最大14日気づけない。捨てた瞬間の記録で埋める。
const LOSS = join(ROOT, '.claude/state/note-attachment-loss.json');
if (existsSync(LOSS)) {
  try {
    const l = JSON.parse(readFileSync(LOSS, 'utf8'));
    const pend = l.pending || [];
    out.scanned.attachmentLossPending = pend.length;
    if (pend.length) {
      out.due = true;
      out.reasons.push(`**本文更新で添付が失われたまま再添付していない記事が ${pend.length} 本**` +
        `（意図的な破棄・復元失敗・日次上限到達のいずれか。live は無傷でもエディタ側は添付削除済み）`);
      for (const x of pend.slice(0, 10)) {
        out.actions.push(`再添付: ${x.noteId}（${x.at?.slice(0, 10)}／${x.reason ?? '理由不明'}）`);
      }
    }
  } catch (e) { out.reasons.push(`添付消失ログが読めない: ${e.message}`); out.due = true; }
} else { out.scanned.attachmentLossPending = 0; }

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(out.due ? 1 : 0); }

console.log(`${TAG} 実査 ${out.measuredAt ?? '(記録なし)'}（${out.ageDays ?? '?'} 日前）` +
  ` 検査 ${out.scanned.inspected ?? '?'}/${out.scanned.target ?? '?'} 件・充足 ${out.scanned.satisfied ?? '?'}`);
if (!out.due) { console.log(`${TAG} OK`); process.exit(0); }
for (const r of out.reasons) console.error(`  ▼ ${r}`);
for (const a of out.actions) console.error(`     → ${a}`);
process.exit(1);
