/**
 * quiz-restage.mjs — 演習データ（public/quiz）の元記事を stage した commit で、演習データを作り直して stage する。
 *
 * なぜ: pe-first-stage の演習データの generatedAt は元記事の dateModified の最大値（scripts/build-quiz-data.mjs）。
 * pre-commit の backfill-mdx-dates が commit の瞬間に dateModified を今日へ進めるので、commit 前に
 * refresh-indexes を回しても演習データが 1 日古いまま入り、develop の CI（generated-indexes）が赤くなる
 * （2026-10-06・DN-0548）。フック本体は変えず（全ワークツリー・Mac で入れ直しが要る）、backfill の後に
 * 毎回呼ばれる scripts/pre-commit-mdx.mjs に相乗りする。
 */
import { execFileSync, spawnSync } from 'node:child_process';

/** 元記事の日付に依存する演習データ（元記事のディレクトリ → 生成物）。civil-1 は JSON 由来で日付が固定なので対象外 */
export const QUIZ_FROM_MDX = [
  { srcDir: 'content/site/pe-first-stage/', out: 'public/quiz/pe-first-stage.json' },
];

/** staged のパスから、作り直しが要る演習データを返す */
export function planQuizRestage(stagedFiles) {
  return QUIZ_FROM_MDX.filter((q) => stagedFiles.some((f) => f.startsWith(q.srcDir) && f.endsWith('.mdx')));
}

/**
 * 元記事が staged なら build-quiz-data を回し、変わった演習データを stage する。
 * @returns {{ ok: boolean, restaged: string[] }} ok=false は演習データを作れなかった（commit を止める）
 */
export function restageQuiz(stagedFiles) {
  const plan = planQuizRestage(stagedFiles);
  if (plan.length === 0) return { ok: true, restaged: [] };
  const r = spawnSync(process.execPath, ['scripts/build-quiz-data.mjs'], { encoding: 'utf8' });
  if (r.status !== 0) {
    process.stdout.write(`${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-15).join('\n') + '\n');
    console.log('[quiz-restage] build-quiz-data が失敗した。演習データを作れないので commit を止める');
    return { ok: false, restaged: [] };
  }
  const restaged = [];
  for (const q of plan) {
    if (spawnSync('git', ['diff', '--quiet', '--', q.out]).status !== 0) {
      execFileSync('git', ['add', '--', q.out]);
      restaged.push(q.out);
    }
  }
  console.log(`[quiz-restage] 元記事 staged → 演習データを作り直した / 変わって stage した: ${restaged.length} 件${restaged.length ? `（${restaged.join(', ')}）` : ''}`);
  return { ok: true, restaged };
}
