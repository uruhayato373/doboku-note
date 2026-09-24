import { calendarDate } from './gsc-date-range.mjs';

export const INTENTS = { 'exam-task': '受験の具体的な課題', 'exam-topic': '試験論点の学習', 'qualification-guide': '資格全体の入口', reference: '一般用語・実務参考' };
export const SELECTION_ORDER = '受験意図 → 学習上の価値 → 試験時期 → 順位・需要の段階 → 直近の資格別改善数 → 順位・表示回数';
const intentOrder = Object.keys(INTENTS);

export function strategyErrors(config) {
  const errors = [], strategy = config.strategy;
  if (strategy?.version !== 2 || typeof strategy.objective !== 'string' || strategy.objective.trim().length < 10 || !Number.isInteger(strategy.reviewEveryDays) || strategy.reviewEveryDays < 7 || !/^\d{4}-\d{2}-\d{2}$/.test(strategy.reviewedAt ?? '') || !Array.isArray(strategy.focusQualifications) || !strategy.focusQualifications.length || new Set(strategy.focusQualifications).size !== strategy.focusQualifications.length) return ['Qualification strategy is required'];
  for (const w of config.watchwords) {
    if (!strategy.focusQualifications.includes(w.qualification) || !Object.hasOwn(INTENTS, w.intent) || !['improve', 'monitor'].includes(w.mode)) errors.push(`${w.id}: qualification, intent and mode are required`);
    if (['audience', 'need', 'rationale'].some((k) => typeof w[k] !== 'string' || w[k].trim().length < 10)) errors.push(`${w.id}: audience, need and rationale are required`);
    if (!w.nextStep?.label?.trim() || !/^\/(exam|tools)\/[\w/-]+$/.test(w.nextStep?.path ?? '') || w.nextStep.path.includes('..')) errors.push(`${w.id}: next learning step is required`);
    if (!['gsc', 'hypothesis'].includes(w.evidence?.kind) || !w.evidence?.source?.trim()) errors.push(`${w.id}: registration evidence is required`);
    if (w.mode === 'improve' && ['reference', 'qualification-guide'].includes(w.intent)) errors.push(`${w.id}: broad/reference queries are monitor-only`);
    if (w.mode === 'improve' && !w.contentPath?.endsWith('.mdx')) errors.push(`${w.id}: application tools are monitor-only in the article improvement loop`);
  }
  for (const id of strategy.focusQualifications) if (!config.watchwords.some((w) => w.qualification === id && w.enabled !== false && w.mode === 'improve')) errors.push(`${id}: at least one reviewed article candidate is required`);
  return errors;
}

export function seasonFor(watch, calendar, now) {
  const exam = calendar?.exams?.[watch.qualification], event = exam?.events?.[watch.examEvent];
  if (!event) return { active: false, label: '対象日程の確認待ち', date: null, daysUntil: null };
  const daysUntil = Math.round((Date.parse(event.date) - Date.parse(calendarDate(now, 'Asia/Tokyo'))) / 86400000);
  return { active: daysUntil >= 0 && daysUntil <= 90, label: daysUntil < 0 ? '次年度日程待ち' : event.label, date: event.date, daysUntil };
}

export function selectionKey(row) {
  return [intentOrder.indexOf(row.intent), row.priority, row.season.active ? 0 : 1, row.tier,
    row.recentQualificationActions, row.tier === 0 ? row.current.rank : -row.current.impressions];
}
export function compareCandidates(a, b) {
  const aa = selectionKey(a), bb = selectionKey(b);
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return a.id.localeCompare(b.id);
}

/** クエリ文字列から受験意図を推定する（discover と成長ダイジェストの watchword 下書きが共用する唯一の実装）。 */
export function inferIntent(keyword) {
  return /解答|論文|経験記述|過去問|文字数|答案|添削/.test(keyword) ? 'exam-task' : /キーワード|計算|択一|記述/.test(keyword) ? 'exam-topic' : 'qualification-guide';
}

/** Hints only. Page/query evidence never authorizes an automatic registration or edit. */
export function discoverCandidates(data, config, redirects = new Map()) {
  const rows = data.rows.flatMap((r) => {
    if (!(r.position > 1 && r.position <= 20 && r.impressions > 0) || !r.keys?.[0]?.startsWith('https://doboku-note.com/')) return [];
    const originalPath = new URL(r.keys[0]).pathname, targetPath = redirects.get(originalPath) ?? originalPath;
    const qualification = config.strategy.focusQualifications.find((id) => targetPath.startsWith(`/exam/${id}/`));
    if (!qualification || config.watchwords.some((w) => w.keyword === r.keys[1] && w.targetPath === targetPath)) return [];
    const intent = inferIntent(r.keys[1]);
    return [{ keyword: r.keys[1], qualification, intentHint: INTENTS[intent], intent, targetPath, sourcePage: r.keys[0],
      rank: r.position, impressions: r.impressions, clicks: r.clicks, measurementRequired: true,
      note: originalPath !== targetPath ? '旧URLでの計測。正規URLの順位として扱わず再計測する。' : '受験意図・記事・学習導線を確認してから登録する。' }];
  }).sort((a, b) => intentOrder.indexOf(a.intent) - intentOrder.indexOf(b.intent) || b.impressions - a.impressions || a.rank - b.rank);
  const seen = new Set();
  return config.strategy.focusQualifications.flatMap((id) => rows.filter((r) => {
    const key = JSON.stringify([r.keyword, r.targetPath]);
    if (r.qualification !== id || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3));
}
