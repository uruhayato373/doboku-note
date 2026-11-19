import { resolveExam } from './exam-palette.mjs';
const keys = { cem: 'pe-comprehensive', 'civil-1': 'civil-1', 'pe-construction': 'pe-construction', 'pe-first-stage': 'pe-first-stage' };
export const FIGURE_PACK_CATEGORIES = { cem: 'pe-comprehensive-management', 'civil-1': 'civil-construction-1', 'pe-construction': 'pe-construction', 'pe-first-stage': 'pe-first-stage' };
export function figurePackLabels(examDir) {
  if (!keys[examDir]) throw new Error(`図解パックの未対応資格: ${examDir}`);
  const exam = resolveExam(keys[examDir]);
  return {
    exam: examDir === 'cem' ? `技術士 ${exam.short}` : ['pe-construction', 'pe-first-stage'].includes(examDir) ? `技術士 ${exam.short}` : exam.short,
    badge: examDir === 'cem' ? '択一 頻出テーマ' : examDir === 'pe-construction' ? '記述の考え方' : examDir === 'pe-first-stage' ? '計算の考え方' : '試験の要点',
    destination: examDir === 'cem' ? `${exam.short}キーワード集へアクセス` : `${exam.short}の学習ページへアクセス`,
  };
}
