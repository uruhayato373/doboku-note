#!/usr/bin/env node
// handoff（docs/handoffs/*.md）と週次レビュー（docs/reviews/weekly/*.md）を「削除する」コミットで、
// 前送りタスクの台帳への抽出を取りこぼしていないかを機械検知してコミットを止める。
//
// 背景（2026-07-14 事故）: handoff は「完了報告」と「前送りタスク（🔴🟡・残タスク・次アクション等）」が
// 同居する文書。完了マーク＋PR merged の裏取りだけで「完了」と判定し、前送り節を backlog へ抽出せずに
// 退避すると、タスクごと埋没する（BuildJob note展開の消失事故）。かつ廃止済みの _archive/ を復活させる
// 規律違反も起きた。information-architecture.md「handoff のライフサイクル」= 抽出 → git rm 削除（archive 廃止・
// 2026-07-11）。本ガードはその規律の「無意識の素通り」だけを塞ぐ（判定の質は /doc-declutter＝doc-curator が担う）。
//
// 背景（2026-09-14・DN-0230）: 週次レビューの「来週への申し送り」は `/weekly-plan` までしか届かず、
// `.claude/todo/weekly.md` を書く `/plan-weekly` はそれを読まない。旧週レビューは毎週削除されるので、
// 台帳に居場所の無い申し送り（W37 で 5 件を実測）は削除と同時に消える。
//
// 検査ルール（staged のみ・index ベース）:
//   ルール1（archive 禁止）: docs/handoffs/_archive/ 配下へのファイル追加(A) を検出したら reject。
//     _archive は 2026-07-11 廃止。extract → git rm が正。
//   ルール2（handoff の抽出ゲート）: docs/handoffs/ 直下の *.md 削除(D) を検出したら、削除される HEAD 版本文を
//     前送りマーカーでスキャンし、ヒットあり かつ 同一コミットに .claude/todo/backlog.md が staged
//     されていなければ reject（前送りマーカーの行番号を提示）。
//     ※ _archive/ 配下の削除は「廃止ディレクトリの掃除」なので対象外（抽出は本体が直下にあった時点で済む前提）。
//     backlog staged は「抽出の証明」ではなく「抽出を思い出させる強制注意」。
//   ルール3（週次レビューの抽出ゲート）: docs/reviews/weekly/*.md の削除(D) を検出したら、削除される HEAD 版の
//     「来週／次週への申し送り」節の各項目に台帳上の居場所があるかを見る。居場所＝行内の DN-ID が backlog に在る／
//     dispatch-log に完了記録がある、EXP-ID が experiments.json に在る、Issue 参照（#123）がある、
//     振り分け先が「定常」、または本文が削除後も残る週次ファイル（＝最新レビュー＋計画）に同じ文面で残っている。
//     1 項目でも居場所が無ければ reject（行番号と本文を提示）。
//   ルール4（振り分けの必須化）: docs/reviews/weekly/YYYY-Www-review.md（ROUTING_REQUIRED_FROM 以降）の
//     追加・変更を検出したら、申し送りの各項目に「→ 振り分け: DN-#### / 定常 / #Issue / EXP-###」があり、
//     DN-ID が backlog（または完了記録）に、EXP-ID が experiments.json に実在するかを見る。
//
// 判定部品は scripts/lib/handoff-extraction.mjs に集約（本ファイルは git I/O と出力だけ）。
// backlog・dispatch-log・experiments.json・残る週次ファイルはすべて index（staged 後の状態）から読む。
//
// 緊急回避: 環境変数 SKIP_HANDOFF_EXTRACT=1、または `git commit --no-verify`。
//
// 使い方:
//   node scripts/check-handoff-extraction.mjs --staged   # pre-commit 用（既定挙動）
//   npm run check-handoff-extraction
// 違反が 1 件でもあれば exit 1。
//
// 真実源: .claude/knowledge/reference/information-architecture.md「handoff のライフサイクル」、
// 週次レビューの振り分け規約は .claude/skills/management/weekly-review/SKILL.md「Phase 4」。

import { execFileSync } from 'node:child_process';
import { parseBacklog } from './lib/backlog-lib.mjs';
import {
  HANDOFF_DIRECT_RE,
  WEEKLY_FILE_RE,
  WEEKLY_REVIEW_RE,
  ROUTING_REQUIRED_FROM,
  findForwardMarkers,
  checkWeeklyDeletion,
  checkWeeklyRouting,
  routingRequired,
  normalizeForMatch,
  idsFromCards,
  completedIdsFromDispatchLog,
  experimentIdsFrom,
} from './lib/handoff-extraction.mjs';

const ARCHIVE_PREFIX = 'docs/handoffs/_archive/';
const BACKLOG = '.claude/todo/backlog.md';
const DISPATCH_LOG = '.claude/state/dispatch/dispatch-log.json';
const EXPERIMENTS = '.claude/state/experiments.json';
const MAX_BUFFER = 256 * 1024 * 1024;

if (process.env.SKIP_HANDOFF_EXTRACT === '1') {
  console.log('[check-handoff-extraction] スキップ（SKIP_HANDOFF_EXTRACT=1）');
  process.exit(0);
}

const git = (args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8', maxBuffer: MAX_BUFFER });
const lines = (out) => out.split('\n').map((l) => l.trim()).filter(Boolean);

// staged の name-status（リネームは A+D に分解＝check-doc-coupling と同方針）。
function stagedNameStatus() {
  return lines(git(['diff', '--cached', '--no-renames', '--name-status', '--diff-filter=ADM'])).map((l) => {
    const [status, ...rest] = l.split('\t');
    return { status: status[0], path: rest.join('\t') };
  });
}

function gitShow(spec) {
  try {
    return execFileSync('git', ['show', spec], { encoding: 'utf8', maxBuffer: MAX_BUFFER, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}
const showHead = (path) => gitShow(`HEAD:${path}`);
const showIndex = (path) => gitShow(`:${path}`);

function readIndexJson(path) {
  const raw = showIndex(path);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 週次の居場所判定に使う台帳（index 版）。週次ファイルに触れたコミットでだけ読む。
function weeklyContext(deletedPaths) {
  const backlogText = showIndex(BACKLOG);
  const remaining = lines(git(['ls-files', '--', 'docs/reviews/weekly/'])).filter(
    (p) => WEEKLY_FILE_RE.test(p) && !deletedPaths.has(p)
  );
  return {
    backlogFound: backlogText != null,
    backlogIds: idsFromCards(parseBacklog(backlogText ?? '')),
    completedIds: completedIdsFromDispatchLog(readIndexJson(DISPATCH_LOG)),
    experimentIds: experimentIdsFrom(readIndexJson(EXPERIMENTS)),
    carriedTexts: remaining.map((p) => normalizeForMatch(showIndex(p) ?? '')),
    carriedFiles: remaining,
  };
}

const staged = stagedNameStatus();
const allStagedPaths = new Set(lines(git(['diff', '--cached', '--name-only'])));
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
// backlog は「変更(M)」で staged されるのが通常なので、全ステータスの staged パスで見る。
const backlogStaged = allStagedPaths.has(BACKLOG);
for (const { status, path } of staged) {
  if (status !== 'D' || !HANDOFF_DIRECT_RE.test(path)) continue; // _archive/ 配下・非md は対象外
  const content = showHead(path);
  if (!content) continue;
  const hits = findForwardMarkers(content);
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

// --- ルール3・4: 週次レビュー（DN-0230） ---
const deletedWeekly = staged.filter((s) => s.status === 'D' && WEEKLY_FILE_RE.test(s.path)).map((s) => s.path);
const changedReviews = staged
  .filter((s) => s.status !== 'D')
  .map((s) => s.path)
  .filter((p) => {
    const m = p.match(WEEKLY_REVIEW_RE);
    return m && routingRequired(m[1]);
  });

if (deletedWeekly.length > 0 || changedReviews.length > 0) {
  const ctx = weeklyContext(new Set(deletedWeekly));
  if (!ctx.backlogFound) {
    // 台帳が読めないまま「居場所なし」や「問題なし」を出すのは検査不成立（CLAUDE.md §9）。黙って通さず止める。
    problems.push(`[weekly-ledger-unreadable] index に ${BACKLOG} が無く、申し送りの居場所を判定できない（検査不成立）`);
  } else {
    for (const path of deletedWeekly) {
      const content = showHead(path);
      if (content == null) continue;
      const r = checkWeeklyDeletion(content, ctx);
      const homes = Object.entries(r.homes).map(([k, v]) => `${k} ${v}`).join(' / ') || 'なし';
      console.log(`[check-handoff-extraction] 削除 ${path}: 申し送り ${r.items} 項目・居場所あり ${r.items - r.missing.length}（${homes}）`);
      if (r.missing.length === 0) continue;
      const list = r.missing.map((m) => `    L${m.line} ${m.text.slice(0, 90)}`).join('\n');
      problems.push(
        `[weekly-extract-before-delete] ${path}\n` +
          `  申し送り ${r.missing.length} 項目に台帳上の居場所が無い（backlog の DN-ID・完了記録・EXP-ID・Issue・「振り分け: 定常」・\n` +
          `  残る週次ファイル ${ctx.carriedFiles.join(', ') || '（なし）'} への同文転記、のどれも無い）:\n` +
          `${list}\n` +
          `  削除する前に ${BACKLOG} へ起票して行に DN-ID を書くか、最新レビューの申し送りへ同じ文面で転記するか、\n` +
          `  反復作業なら「→ 振り分け: 定常」を付けてください。正当に不要なら SKIP_HANDOFF_EXTRACT=1 で回避可。`
      );
    }
    for (const path of changedReviews) {
      const r = checkWeeklyRouting(showIndex(path) ?? '', ctx);
      console.log(`[check-handoff-extraction] 確定 ${path}: 申し送り ${r.items} 項目・振り分け不備 ${r.problems.length}`);
      if (r.problems.length === 0) continue;
      const list = r.problems.map((p) => `    L${p.line} ${p.text.slice(0, 70)}\n      → ${p.reason}`).join('\n');
      problems.push(
        `[weekly-routing-required] ${path}\n` +
          `  ${ROUTING_REQUIRED_FROM} 以降の週次レビューは、申し送りの各項目に振り分け先を書く（weekly-review SKILL Phase 4）:\n` +
          `${list}\n` +
          `  書式: 「→ 振り分け: DN-0301」（backlog 起票・既存カード）／「→ 振り分け: 定常」（weekly.md 定常運用）／\n` +
          `  「→ 振り分け: #485」（Issue）／「→ 振り分け: EXP-007」（実験）。`
      );
    }
  }
}

if (problems.length > 0) {
  console.error('[check-handoff-extraction] handoff・週次レビュー処分の規律違反:');
  for (const p of problems) console.error('\n' + p);
  console.error(`\n合計 ${problems.length} 件。抽出→削除の順序を守るか、SKIP_HANDOFF_EXTRACT=1 で回避してください。`);
  process.exit(1);
}

console.log('[check-handoff-extraction] ✓ handoff・週次レビューの削除/確定に抽出もれなし');
process.exit(0);
