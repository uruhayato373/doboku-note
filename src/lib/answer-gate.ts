/**
 * 解説を正答の選択肢の理由だけに絞る過去問ページの判定（2026-11-26）。
 * 対象の一覧は src/config/answer-gate.json だけが持つ（演習アプリのデータは scripts/build/build-quiz-data.mjs が同じ JSON を読む）。
 */
import answerGate from '@/config/answer-gate.json';
import type { MagazineId } from '@/lib/note-magazines';

const GATED = new Set<string>(answerGate.slugs);

export const ANSWER_GATE_PRODUCT_ID = answerGate.productId as MagazineId;

export function isAnswerGated(slug: string): boolean {
  return GATED.has(slug);
}
