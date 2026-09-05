export const QUIZ_FUNNEL_EVENTS = [
  "quiz_start",
  "quiz_complete",
  "review_start",
  "premium_view",
  "premium_intent",
  "email_interest",
  "line_interest",
  "note_cta_click",
] as const;

export type QuizFunnelAction = (typeof QUIZ_FUNNEL_EVENTS)[number];
export type QuizFunnelMode = "menu" | "year" | "subject" | "random" | "review";
export type QuizFunnelPlacement = "quiz_menu" | "quiz_result";

export type QuizFunnelContext = {
  exam: string;
  placement: QuizFunnelPlacement;
  mode: QuizFunnelMode;
};

/**
 * GA4へ渡すquizイベントを列挙値だけで組み立てる。
 * 自由入力・メール・LINE ID・購入者IDを受け取る引数を持たせない。
 */
export function buildQuizFunnelEvent(action: QuizFunnelAction, context: QuizFunnelContext) {
  return {
    action,
    category: action.startsWith("premium_") || action.endsWith("_interest")
      ? "quiz_premium"
      : "quiz",
    label: `${context.exam}:${context.placement}:${context.mode}`,
    params: {
      exam: context.exam,
      placement: context.placement,
      mode: context.mode,
      cta_placement: context.placement,
    },
  };
}

/** 初回問題の前にはPremium案内を出さない。 */
export function shouldShowMenuPremium(completionCount: number, wrongCount: number): boolean {
  return completionCount >= 2 || wrongCount >= 3;
}

/** ブラウザ内で関心クリックを1回に抑えるための匿名localStorage key。 */
export function quizInterestStorageKey(
  exam: string,
  action: "premium_intent" | "email_interest" | "line_interest",
): string {
  return `dnq:${exam}:interest:${action}`;
}
