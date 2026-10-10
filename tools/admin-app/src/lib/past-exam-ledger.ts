import { LEDGER_EXAMS, readLedger, summarizeLedger } from '../../../../scripts/lib/past-exam-ledger.mjs';
import { qualificationShortLabel } from '../../../../scripts/lib/qualification-names.mjs';
import registry from '../../../../config/qualification-registry.json';

export type LedgerArticle = { article: string; total: number; done: number; noSource: number; answerOfficial: number; pagesKnown: number };
export type LedgerExamSummary = {
  qualification: string;
  label: string;
  present: boolean;
  total: number;
  transcription: Record<string, number>;
  answer: Record<string, number>;
  sourceMissing: { question: number; answer: number };
  articles: LedgerArticle[];
};

/** 過去問の問題台帳（data/pastexams/questions）を資格ごとに数える。正答の不一致は check-past-exam-ledger が見る（演習データを読む） */
export function pastExamLedgerSummary(): LedgerExamSummary[] {
  return Object.keys(LEDGER_EXAMS).map((qualification) => {
    const ledger = readLedger(qualification);
    const s = summarizeLedger(ledger);
    return { qualification, label: qualificationShortLabel(registry, qualification), present: Boolean(ledger), ...s };
  });
}
