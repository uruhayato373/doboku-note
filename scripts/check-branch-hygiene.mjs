#!/usr/bin/env node
/**
 * check-branch-hygiene.mjs — 溜まったブランチ・止まった worktree の surfacer（読み取り専用・削除しない・DN-0638）
 * ---------------------------------------------------------------------------
 * 背景（2026-10-10）: ローカルブランチ 41・リモート 26・worktree 10 まで溜まっていた。大半は squash でマージ済みで
 * `git branch --merged` に出ず、1 本は 10/04 から未コミットのまま止まっていた。tree の比較と PR の記録で 1 本ずつ手で判定していた。
 *
 * 出すもの（判定の根拠は scripts/lib/branch-hygiene.mjs の先頭）:
 *   1. 中身が base（既定 origin/develop）に入り済みのブランチ（ローカル・リモート。squash 含む）
 *   2. 未マージで N 日以上動いていないブランチ
 *   3. 未コミットの変更を持ったまま N 日以上動いていない worktree
 *
 * 使い方:
 *   npm run check-branch-hygiene                # 表 + 検査件数。見つかっても exit 0（報告だけ）
 *   node scripts/check-branch-hygiene.mjs --days 21 --base origin/develop --json --no-gh
 *   --no-gh   PR のマージ記録（gh）を引かない。tree 比較だけで判定する
 *
 * exit: 0 検査成立（見つかっても 0）/ 2 検査不成立（base ref が無い・git が古い）。
 * 読み手: 運営者が週次レビューの前に回す（quality-audit の branch-hygiene・ci:false）。片づけは人が git branch -d / git worktree remove で行う。
 * ---------------------------------------------------------------------------
 */
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { createOutput, isCliEntry, runAsCli } from './lib/cli-run.mjs';
import { analyze, fetchMergedPrTips } from './lib/branch-hygiene.mjs';

const VIA = { ancestor: '祖先', tree: 'squash（tree 一致）', pr: 'マージ済み PR' };

export async function run({ argv = [], quiet = false, repo = REPO_ROOT } = {}) {
  const out = createOutput({ quiet });
  const args = parseCliArgs({ days: { type: 'string' }, base: { type: 'string' }, json: { type: 'boolean' }, 'no-gh': { type: 'boolean' } }, argv);
  const days = args.days == null ? 14 : Number(args.days);
  if (!Number.isFinite(days) || days <= 0) { out.error('[check-branch-hygiene] 検査不成立: --days は正の数'); return out.result(2); }

  const pr = args.noGh ? { tips: new Set(), error: '--no-gh' } : fetchMergedPrTips(repo);
  const r = analyze(repo, { base: args.base ?? undefined, days, mergedPrTips: pr.tips });
  if (r.inconclusive) { out.error(`[check-branch-hygiene] 検査不成立: ${r.inconclusive}。緑にしない。`); return out.result(2); }
  if (args.json) { out.log(JSON.stringify({ ...r, prRecords: pr.tips.size, prError: pr.error }, null, 2)); return out.result(0); }

  out.log(`[check-branch-hygiene] base=${r.base} / ローカル ${r.counts.local} 本・リモート ${r.counts.remote} 本・worktree ${r.counts.worktrees} 本（未コミット検査 ${r.counts.worktreesChecked} 本）を検査 / PR の記録 ${pr.tips.size} 件${pr.error ? `（引けず: ${pr.error}。tree 比較だけで判定）` : ''}`);

  out.log(`\n1. 中身が ${r.base} に入り済みのブランチ: ${r.merged.length} 本`);
  for (const b of r.merged) out.log(`   ${b.kind === 'remote' ? 'リモート' : 'ローカル'} ${b.name}（${VIA[b.via]}・最終 ${b.ageDays} 日前${b.worktree ? `・worktree ${b.worktree} で使用中` : ''}）`);
  if (r.merged.length) out.log('   片づけ: git branch -d <name>（squash は -D）/ git push origin --delete <name> / 使用中は先に git worktree remove');

  out.log(`\n2. 未マージで ${days} 日以上動いていないブランチ: ${r.stale.length} 本`);
  for (const b of r.stale) out.log(`   ${b.kind === 'remote' ? 'リモート' : 'ローカル'} ${b.name}（最終 ${b.ageDays} 日前${b.worktree ? `・worktree ${b.worktree} で使用中` : ''}）`);

  out.log(`\n3. 未コミットの変更のまま ${days} 日以上動いていない worktree: ${r.idleWorktrees.length} 本`);
  for (const w of r.idleWorktrees) out.log(`   ${w.path}（${w.branch ?? 'detached'}・変更 ${w.dirtyFiles} ファイル・最終 ${w.ageDays} 日前）`);

  out.log('\n[check-branch-hygiene] 報告のみ。何も削除していない。');
  return out.result(0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
