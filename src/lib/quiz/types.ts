// 過去問演習エンジンの共通スキーマ（正規化レイヤーの出力型）。
// 資格別の生 JSON（src/config/*-exam-questions.json）はフィールド名が微妙に異なる
// （correct vs correctNum, body vs question, optionExplanations vs explanations）。
// scripts/build-quiz-data.mjs がここで定義する共通形へ寄せて public/quiz/{exam}.json を出力し、
// クライアントは常にこの形だけを扱う。総監・2級土木を後から足しても型は不変。

export type QuizOption = { num: number; text: string };

export type QuizExplanation = { num: number; text: string; correct: boolean };

export type QuizQuestion = {
  id: string; // 例: "h26-a-01"
  year: string; // 例: "h26" / "r07"
  yearLabel: string; // 例: "平成26年度" / "令和7年度"
  part: string; // 例: "A" / "B"
  body: string; // 設問文
  options: QuizOption[];
  correct: number; // 正答の選択肢番号
  explanations: QuizExplanation[]; // 全選択肢の正誤解説
};

export type QuizYearMeta = {
  year: string;
  yearLabel: string;
  parts: string[];
  count: number;
};

export type QuizDataset = {
  exam: string; // 例: "civil-1"
  examLabel: string; // 例: "1級土木施工管理技士 第一次検定"
  generatedAt: string;
  years: QuizYearMeta[];
  questions: QuizQuestion[];
};
