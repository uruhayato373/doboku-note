// 過去問演習エンジンの共通スキーマ（正規化レイヤーの出力型）。
// 資格別の生 JSON（src/config/*-exam-questions.json）はフィールド名が微妙に異なる
// （correct vs correctNum, body vs question, optionExplanations vs explanations）。
// scripts/build-quiz-data.mjs がここで定義する共通形へ寄せて public/quiz/{exam}.json を出力し、
// クライアントは常にこの形だけを扱う。総監・2級土木を後から足しても型は不変。

export type QuizOption = { num: number; text: string; html?: string };

export type QuizExplanation = {
  num: number;
  text: string;
  html?: string;
  /** 旧civil-1スキーマ。記述自体の正誤を表す。 */
  correct?: boolean;
  isAnswer?: boolean;
  statementCorrect?: boolean | null;
};

export type QuizQuestion = {
  id: string; // 例: "h26-a-01"
  year: string; // 例: "h26" / "r07"
  yearLabel: string; // 例: "平成26年度" / "令和7年度"
  part: string; // 例: "A" / "B"
  subject?: string; // 例: "basic" / "aptitude" / "construction"
  subjectLabel?: string; // 例: "基礎科目"
  body: string; // 設問文
  bodyHtml?: string; // 数式・表・図を含むビルド時生成済みHTML（信頼済みローカルMDX由来）
  options: QuizOption[];
  correct: number | null; // 正答の選択肢番号。公式正答が未掲載の問題は null
  explanations: QuizExplanation[]; // 全選択肢の正誤解説
  examPoint?: { summary: string; items: string[] } | null;
  socialEligible?: boolean;
  socialExclusionReasons?: string[];
  articlePath?: string; // 詳細な元記事へのサイト内パス
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
  subjects?: Array<{ subject: string; subjectLabel: string; count: number }>;
  questions: QuizQuestion[];
};
