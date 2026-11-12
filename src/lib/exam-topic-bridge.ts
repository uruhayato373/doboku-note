import bridgeJson from '@/config/exam-topic-bridge.json';
import questionsJson from '@/config/civil-1-exam-questions.json';
import textbookIndexJson from '@/config/civil-exam-textbook-index.json';
import { getPublicDocPath } from '@/lib/content-routes';

/**
 * exam-topic-bridge.ts — 実務記事の記事末に「この論点が出る 1級土木の過去問」を 1 問だけ出す（2026-11 の SEO 計画 §5）。
 *
 * なぜ要るか: 実務記事の読者は業務の悩みで検索して来ており、汎用の資格カード（QualificationBridge・EXP-012）は
 *   表示 1,372 回でクリック 5 回だった。読んだ論点そのものが試験に出ることを、実物の問題 1 問で示す。
 * 選び方: config/exam-topic-bridge.json の語（先の語ほど優先）を問題文に含む 1級 第1次検定の問題を、新しい年度から選ぶ。
 *   表・図・数式・特殊記号を含む問題は記事末のカードで崩れるので除く。対応する教科書の章は civil-exam-textbook-index.json。
 * 計測: 解答の開閉は既存の answer_reveal（<summary> が「解答・解説」・直前の H2 が cta_placement）、リンクは internal_nav_click（label=exam-topic）。
 */

type Option = { num: number; text: string };
type Question = { id: string; no: number; part: string; body: string; options: Option[]; correct: number; optionExplanations?: { num: number; text: string; correct: boolean }[] };
type Year = { year: string; questions: Question[] };
type TextbookRef = { slug: string; title: string; score: number };

const PAGES = (bridgeJson as { pages: Record<string, string[]> }).pages;
const YEARS = (questionsJson as { years: Year[] }).years;
const Q2T = (textbookIndexJson as { questionToTextbooks: Record<string, Record<string, TextbookRef[]>> }).questionToTextbooks;

export interface ExamTopicQuestion {
  /** 年度の表示（令和8年度 第1次検定 No.32） */
  readonly label: string;
  readonly body: string;
  readonly options: readonly Option[];
  readonly correct: number;
  /** 正しい選択肢の解説（タグを除いた文） */
  readonly explanation: string;
  /** 年度の過去問ページの該当の問題 */
  readonly examHref: string;
  /** 対応する教科書の章（無ければ null） */
  readonly textbook: { readonly href: string; readonly title: string } | null;
}

const UNRENDERABLE = /[$<|]|!\[|&#x/;
const yearRank = (y: string) => (y.startsWith('r') ? 100 : 0) + Number(y.slice(1));
const yearLabel = (y: string) => (y.startsWith('r') ? `令和${Number(y.slice(1)) === 1 ? '元' : Number(y.slice(1))}年度` : `平成${Number(y.slice(1))}年度`);

let flat: (Question & { year: string })[] | null = null;
function allQuestions() {
  flat ??= YEARS.flatMap((y) => y.questions.map((q) => ({ ...q, year: y.year })))
    .filter((q) => !UNRENDERABLE.test(q.body + q.options.map((o) => o.text).join('')));
  return flat;
}

/** 論点の語が登録された記事なら 1 問を返す。未登録・該当なしは null */
export function resolveExamTopicQuestion(slug: string): ExamTopicQuestion | null {
  const terms = PAGES[slug];
  if (!terms?.length) return null;
  const rank = (q: Question) => terms.findIndex((t) => q.body.includes(t));
  const q = allQuestions()
    .filter((x) => rank(x) >= 0)
    .sort((a, b) => rank(a) - rank(b) || yearRank(b.year) - yearRank(a.year))[0];
  if (!q) return null;
  const examSlug = `primary-${q.year}-${q.part.toLowerCase()}`;
  const tb = Q2T[examSlug]?.[`問題-${q.no}`]?.[0];
  const explanation = (q.optionExplanations?.find((e) => e.num === q.correct)?.text ?? '').replace(/<[^>]+>/g, '').trim();
  return {
    label: `${yearLabel(q.year)} 第1次検定 No.${q.no}`,
    body: q.body,
    options: q.options,
    correct: q.correct,
    explanation,
    examHref: `${getPublicDocPath(`civil-construction-1-${examSlug}`)}#問題-no${q.no}`,
    textbook: tb ? { href: getPublicDocPath(`civil-construction-1-${tb.slug}`), title: tb.title } : null,
  };
}

/** 検査用: 登録された記事の slug */
export function examTopicBridgeSlugs(): string[] {
  return Object.keys(PAGES);
}
