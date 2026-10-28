/**
 * 過去問演習の「全◯問・◯〜◯年度」の表示を、配信データから数えた要約（src/config/quiz-summary.json）から作る。
 * 要約は scripts/build-quiz-data.mjs（npm run refresh-indexes）が書く。件数・年度を画面に手で書かない
 * （2026-10-27 に 1級土木の「全1,098問・平成26〜令和7年度」が、年度を足した後の 1,642 問・17 年度分に追いついていなかった）。
 */
import summary from '@/config/quiz-summary.json';

type QuizExam = keyof typeof summary.exams;

/** 問題数（例: 1,642） */
export const quizQuestionCount = (exam: QuizExam): string => summary.exams[exam].questions.toLocaleString('ja-JP');

/** 収録した年度の数（例: 17） */
export const quizYearCount = (exam: QuizExam): number => summary.exams[exam].years;

/** 最も古い年度〜新しい年度（例: 平成18〜令和7年度）。途中に欠けた年度があっても範囲として出す */
export const quizYearRange = (exam: QuizExam): string => {
  const { firstYearLabel, lastYearLabel } = summary.exams[exam];
  return `${firstYearLabel.replace(/年度$/, '')}〜${lastYearLabel}`;
};
