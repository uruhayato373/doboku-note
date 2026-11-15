/** 外部リンクの応答を、切れたリンクと取得制限・一時障害に分ける（通信なし）。 */
import { fetchFailDominant } from './inconclusive-gate.mjs';

export function classifyExternalLink(result) {
  if (result.status === 404 || result.status === 410 || result.error === 'ENOTFOUND' || result.error === 'ENODATA') return 'broken';
  if (result.error || result.status === 403 || result.status === 429 || !result.ok) return 'inconclusive';
  return 'ok';
}

export function summarizeExternalLinks(results, target = results.length) {
  const summary = { target, checked: 0, broken: 0, inconclusive: 0, ok: 0 };
  for (const result of results) summary[classifyExternalLink(result)]++;
  summary.checked = summary.ok + summary.broken;
  summary.exitCode = summary.broken ? 1 : target === 0 || results.length < target || fetchFailDominant(summary.inconclusive, target) ? 2 : 0;
  return summary;
}
