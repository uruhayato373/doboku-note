// merge-scores の本体。資格ごとの merge-scores.mjs（scripts-cem・scripts-civil-textbook）が、
// scores の読み書き・重みつき平均の計算・group を持つかどうかを渡して呼ぶ。
import { readFileSync } from 'node:fs';

/**
 * 採点結果を scores の state に上書きする（I/O は無い）。
 * @param {object} opts
 * @param {(scores:object)=>number} opts.computeWeighted 資格ごとの重みで出す総合点
 * @param {boolean} [opts.withGroup] pages[slug].group を持つか
 * @param {string} [opts.now] scored_at
 */
export function applyScoreResults(scoresState, results, { computeWeighted, withGroup = false, now = new Date().toISOString() }) {
  let merged = 0;
  let skipped = 0;
  for (const r of Array.isArray(results) ? results : [results]) {
    if (!r || !r.slug || !r.scores) {
      skipped++;
      continue;
    }
    const s = r.scores;
    const weak = r.weak_axes && r.weak_axes.length ? r.weak_axes : Object.entries(s).filter(([, v]) => v <= 1).map(([k]) => k);
    scoresState.pages[r.slug] = {
      slug: r.slug,
      ...(withGroup ? { group: r.group || null } : {}),
      scores: s,
      weighted: computeWeighted(s),
      weak_axes: weak,
      qualitative_comment: r.qualitative_comment || '',
      scored_at: now,
    };
    merged++;
  }
  return { merged, skipped };
}

/** CLI の入口: <results.json>（配列か 1 オブジェクト）を読み、scores に書いて件数を出す。 */
export function runMergeScores({ readScores, writeScores, computeWeighted, withGroup, argv = process.argv.slice(2) }) {
  const input = argv[0];
  if (!input) {
    console.error('Usage: node merge-scores.mjs <results.json>');
    process.exit(1);
  }
  const results = JSON.parse(readFileSync(input, 'utf-8'));
  const scoresState = readScores();
  const { merged, skipped } = applyScoreResults(scoresState, results, { computeWeighted, withGroup });
  writeScores(scoresState);
  console.log(`merged=${merged} skipped=${skipped} total_scored=${Object.keys(scoresState.pages).length}`);
}
