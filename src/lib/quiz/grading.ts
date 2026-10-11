import type { QuizQuestion } from "./types";

/** 公式正答の番号の一覧（複数正答の問題は全部・正答の無い問題は空） */
function correctAnswers(q: Pick<QuizQuestion, "correct" | "correctAll">): number[] {
  if (q.correctAll && q.correctAll.length > 0) return q.correctAll;
  return q.correct == null ? [] : [q.correct];
}

/** 選んだ番号が正解か（複数正答の問題はどれを選んでも正解） */
export function isCorrectChoice(q: Pick<QuizQuestion, "correct" | "correctAll">, num: number): boolean {
  return correctAnswers(q).includes(num);
}

/** 判定に出す正答の書き方（「3」・「3・4」） */
export function correctLabel(q: Pick<QuizQuestion, "correct" | "correctAll">): string {
  return correctAnswers(q).join("・");
}
