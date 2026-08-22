#!/usr/bin/env node
// handoff（docs/handoffs/*.md）を「削除する」または「_archive へ退避する」コミットで、
// 残タスクの backlog 抽出を取りこぼしていないかを機械検知してコミットを止める。
//
// 背景（2026-07-14 事故）: handoff は「完了報告」と「前送りタスク（🔴🟡・残タスク・次アクション等）」が
// 同居する文書。完了マーク＋PR merged の裏取りだけで「完了」と判定し、前送り節を backlog へ抽出せずに
// 退避すると、タスクごと埋没する（BuildJob note展開の消失事故）。かつ廃止済みの _archive/ を復活させる
// 規律違反も起きた。information-architecture.md「handoff のライフサイクル」= 抽出 → git rm 削除（archive 廃止・
// 2026-07-11）。本ガードはその規律の「無意識の素通り」だけを塞ぐ（判定の質は /doc-declutter＝doc-curator が担う）。
//
// 検査ルール（staged のみ・index ベース）:
//   ルール1（archive 禁止）: docs/handoffs/_archive/ 配下へのファイル追加(A) を検出したら reject。
//     _archive は 2026-07-11 廃止。extract → git rm が正。
//   ルール2（抽出ゲート）: docs/handoffs/ 直下の *.md 削除(D) を検出したら、削除される HEAD 版本文を
//     前送りマーカーでスキャンし、ヒットあり かつ 同一コミットに .claude/todo/backlog.md が staged
//     されていなければ reject（前送りマーカーの行番号を提示）。
//     ※ _archive/ 配下の削除は「廃止ディレクトリの掃除」なので対象外（抽出は本体が直下にあった時点で済む前提）。
//
// backlog staged は「抽出の証明」ではなく「抽出を思い出させる強制注意」。判定の質は /doc-declutter が担う。
//
// 緊急回避: 環境変数 SKIP_HANDOFF_EXTRACT=1、または `git commit --no-verify`。
//
// 使い方:
//   node scripts/check-handoff-extraction.mjs --staged   # pre-commit 用（既定挙動）
//   npm run check-handoff-extraction
// 違反が 1 件でもあれば exit 1。
//
// 真実源: .claude/knowledge/reference/information-architecture.md「handoff のライフサイクル」。

import { execFileSync } from 'node:child_process';

const HANDOFF_DIR = 'docs/handoffs/';
const ARCHIVE_PREFIX = 'docs/handoffs/_archive/';
const BACKLOG = '.claude/todo/backlog.md';

// 前送り（未完了・保留・手動フォロー）を示すマーカー。ヒット＝「backlog へ抽出すべき作業」の疑い。
// 過検出（＝抽出を促す方向）に倒す設計。誤ブロックは SKIP_HANDOFF_EXTRACT=1 で回避可能。
const FORWARD_MARKERS = [
  '🔴', '🟡', '残タスク', '残り', '次アクション', '次セッション',
  '未実施', '未着手', '未検証', '保留', '別PC', '要確認', '後続メモ',
];

if (process.env.SKIP_HANDOFF_EXTRACT === '1') {
  console.log('[check-handoff-extraction] スキップ（SKIP_HANDOFF_EXTRACT=1）');
  process.exit(0);
}

// staged の name-status（リネームは A+D に分解＝check-doc-coupling と同方針）。
function stagedNameStatus() {
  const out = execFileSync(
    'git',
    ['diff', '--cached', '--no-renames', '--name-status', '--diff-filter=AD'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [status, ...rest] = l.split('\t');
      return { status: status[0], path: rest.join('\t') };
    });
}

function showHead(path) {
  try {
    return execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
  } catch {
    return null;
  }
}

// backlog は「変更(M)」で staged されるのが通常なので、AD だけでなく全ステータスで検出する。
function stagedAllPaths() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return new Set(out.split('\n').map((l) => l.trim()).filter(Boolean));
}

const staged = stagedNameStatus();
const allStagedPaths = stagedAllPaths();
const problems = [];

// --- ルール1: _archive への追加を禁止 ---
for (const { status, path } of staged) {
  if (status === 'A' && path.startsWith(ARCHIVE_PREFIX)) {
    problems.push(
      `[archive-banned] ${path}\n` +
        `  docs/handoffs/_archive/ は 2026-07-11 に廃止（77本削除・ユーザー決定）。\n` +
        `  handoff の正しい処分は「残タスクを backlog へ抽出 → 本体を git rm 削除（記録は git 履歴）」。\n` +
        `  真実源: .claude/knowledge/reference/information-architecture.md「handoff のライフサイクル」`
    );
  }
}

// --- ルール2: 直下 handoff の削除は残タスク抽出とセットか ---
const backlogStaged = allStagedPaths.has(BACKLOG);
// docs/handoffs/ 直下（サブディレクトリ= _archive 等を除く）の *.md のみ対象。
const directHandoffRe = /^docs\/handoffs\/[^/]+\.md$/;

for (const { status, path } of staged) {
  if (status !== 'D') continue;
  if (!directHandoffRe.test(path)) continue; // _archive/ 配下・非md は対象外

  const content = showHead(path);
  if (!content) continue;
  const lines = content.split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of FORWARD_MARKERS) {
      if (line.includes(m)) {
        hits.push({ line: i + 1, marker: m, text: line.trim().slice(0, 70) });
        break;
      }
    }
  });

  if (hits.length > 0 && !backlogStaged) {
    const sample = hits
      .slice(0, 8)
      .map((h) => `    L${h.line} [${h.marker}] ${h.text}`)
      .join('\n');
    const more = hits.length > 8 ? `\n    …他 ${hits.length - 8} 件` : '';
    problems.push(
      `[extract-before-delete] ${path}\n` +
        `  この handoff に前送りマーカー ${hits.length} 件（未完了・保留・手動フォローの疑い）:\n` +
        `${sample}${more}\n` +
        `  削除する前に、生きたタスクを ${BACKLOG} へ抽出し、同一コミットに backlog を staged してください。\n` +
        `  判定は /doc-declutter（doc-curator が外部実体を検証）に委ねるのが正道。\n` +
        `  正当に抽出不要なら SKIP_HANDOFF_EXTRACT=1 で回避可。`
    );
  }
}

if (problems.length > 0) {
  console.error('[check-handoff-extraction] handoff 処分の規律違反:');
  for (const p of problems) console.error('\n' + p);
  console.error(
    `\n合計 ${problems.length} 件。抽出→削除の順序を守るか、SKIP_HANDOFF_EXTRACT=1 で回避してください。`
  );
  process.exit(1);
}

console.log('[check-handoff-extraction] ✓ handoff の削除/退避に抽出もれなし');
process.exit(0);
