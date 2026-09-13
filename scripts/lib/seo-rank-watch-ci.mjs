import matter from 'gray-matter';
import { hash } from './seo-rank-watch.mjs';

/** Apply a small, reviewable edit to the selected article; paths never come from the model. */
export function applyReplacements(original, replacements) {
  if (!Array.isArray(replacements) || replacements.length < 1 || replacements.length > 3) throw Error('1–3 replacements required');
  let text = original.replace(/\r\n/g, '\n');
  for (const patch of replacements) {
    if (!patch || Object.keys(patch).some(k => !['old', 'new'].includes(k)) || typeof patch.old !== 'string' || typeof patch.new !== 'string' || !patch.old.trim() || patch.old === patch.new || patch.old.length + patch.new.length > 8000) throw Error('Invalid or oversized replacement');
    if (patch.old.includes('\r') || patch.new.includes('\r') || text.split(patch.old).length !== 2) throw Error('Replacement must match exactly once');
    if (/<(?:script|iframe|style|meta|link)\b|(?:^|\n)\s*(?:import|export)\s|javascript:/i.test(patch.new)) throw Error('Executable content is outside automatic SEO edits');
    text = text.replace(patch.old, () => patch.new);
  }
  const before = matter(original), after = matter(text);
  const editable = new Set(['title', 'seoTitle', 'description', 'dateModified', 'faq', 'faqs']);
  for (const key of new Set([...Object.keys(before.data), ...Object.keys(after.data)])) {
    if (!editable.has(key) && JSON.stringify(before.data[key]) !== JSON.stringify(after.data[key])) throw Error(`Protected frontmatter: ${key}`);
  }
  for (const key of ['title', 'seoTitle', 'description']) if (typeof after.data[key] !== 'string' || !after.data[key].trim()) throw Error(`Missing ${key}`);
  const headings = body => body.split(/\r?\n/).filter(line => /^#{1,2} /.test(line));
  if (JSON.stringify(headings(before.content)) !== JSON.stringify(headings(after.content))) throw Error('Large page structure changes require review');
  if (after.content.length < before.content.length * 0.8 || after.content.length > before.content.length + 5000) throw Error('Large article rewrite requires review');
  if (hash(text) === hash(original.replace(/\r\n/g, '\n'))) throw Error('No article change');
  return text;
}

export function validateAgentResult(context, result) {
  if (!result || Array.isArray(result) || Object.keys(result).length !== 3 || Object.keys(result).some(k => !['reason', 'policyReview', 'improvement'].includes(k))) throw Error('Exactly reason, policyReview and improvement are required');
  if (typeof result.reason !== 'string' || result.reason.trim().length < 10 || result.reason.length > 3000) throw Error('Concrete decision reason required');
  if (context.policyReviewDue && (typeof result.policyReview !== 'string' || result.policyReview.trim().length < 40)) throw Error('Due policy review was not performed');
  if (!context.policyReviewDue && result.policyReview != null) throw Error('Policy review is not due');
  if (result.improvement != null) {
    if (!context.selected || result.improvement.watchId !== context.selected.id) throw Error('Only the selected keyword may be improved');
    if (Object.keys(result.improvement).some(k => !['watchId', 'action', 'replacements'].includes(k))) throw Error('Unknown improvement fields');
    const action = result.improvement.action;
    if (!action || Object.keys(action).some(k => !['method', 'needs', 'gap', 'done', 'serp'].includes(k))) throw Error('Unknown action fields');
  }
  return result;
}

export function waitingReason(view) {
  if (view.policyReviewDue) return '方針レビューの期限到来。検索意図・資格別の計測と既存方針を確認する。';
  if (!view.capacity) return `既存実験の同時実行上限のため改善を待機。${view.activeExperiments.map(e => `${e.id}（再確認 ${e.nextReviewDate ?? '未設定'}）`).join('、')}。枠空け目的の終了は行わない。`;
  if (view.selected) return `${view.selected.keyword}を候補に選定。検索意図と不足を確認し、適切な小さな変更がある場合だけ改善する。`;
  return '今回の資格別検索意図・順位・表示数・観察状態を確認し、改善条件を満たす候補がないため計測と記録を継続する。';
}
