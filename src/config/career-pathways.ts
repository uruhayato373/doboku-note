/**
 * career-pathways.ts — キャリア（転職）記事の「悩み分類」の単一 SSOT。
 *
 * なぜ要るか: 転職 CTA の文言が全ページ共通の「無料相談」になっており、読者が解決したい悩みと
 *   サービスの成果点が噛み合っていなかった。2026-07-16〜08-12 の実測は affiliate 7,370 表示 /
 *   19 クリック（0.26%）で、**記事末は 975 表示 0 クリック**。悩み別に出し分けるための対応表を
 *   1 箇所へ集約し、MDX 本文へ同じコピーを大量に直書きしない。
 *
 * 2 つの分類の関係（混同しないこと）:
 *   - **need（本ファイル・8 値）** = 読者の悩み。CTA 文言と診断ツールの分岐に使う。
 *   - **pillar（`.claude/config/career-funnel.json`・5 値）** = 記事の所属。レポートの集計に使う。
 *   need → pillar は関数（`CAREER_NEEDS[need].pillarSlug`）で、両者がずれないことは
 *   `tests/career-pathways.test.mjs` が機械で固定する。
 *
 * 未分類 slug は **null を返す**。既定の汎用 affiliate へ落とさない（文脈の合わない広告を出さない）。
 *
 * 方針の真実源: .claude/knowledge/reference/affiliate-operations.md「悩み別に CTA 文言を出し分ける」
 */

/** 読者の悩み。診断ツール（Phase 05）の分岐もこの語彙を使う。 */
export type CareerNeed =
  | "quit-or-stay"
  | "pay"
  | "workstyle"
  | "location"
  | "market-value"
  | "career-path"
  | "application"
  | "service-choice";

const careerArticlePath = (slug: string) => {
  const civil2 = 'civil-construction-2-guide-';
  if (slug.startsWith(civil2)) return `/exam/civil-construction-2/guide/${slug.slice(civil2.length)}`;
  return `/exam/civil-construction-1/guide/${slug.replace(/^civil-construction-1-guide-/, '')}`;
};

/** キャリア hub。全 need の戻り先。 */
export const CAREER_HUB_SLUG = "civil-construction-1-guide-career";

/**
 * サービスの成果点。**同じ「相談」コピーを使い回さない**ための区別。
 * - consultation: 面談・相談が成果点（ビルドジョブ / GKSキャリア）
 * - registration: 会員登録が成果点（建設JOBs）
 */
export type ServiceOutcome = "consultation" | "registration";

interface NeedDefinition {
  /** 人間向けラベル（GA4 へは need キーのほうを送る）。 */
  readonly label: string;
  /** この need の読者を送る柱。 */
  readonly pillarSlug: string;
  /** 記事末の内部次行動に出す見出しと理由。 */
  readonly nextStepTitle: string;
  readonly nextStepReason: string;
  /** affiliate ボタンの文言。サービスの成果点で言い回しを変える。 */
  readonly affiliateCta: Readonly<Record<ServiceOutcome, string>>;
}

/*
 * 禁止する短絡表現（「今すぐ登録」「必ず年収」等）は
 * `.claude/config/career-funnel.json` の `forbiddenCtaPhrases` に置き、
 * `tests/career-pathways.test.mjs` が下記の CTA 文言を機械で検査する。
 * ここへ配列を export すると「テストしか使わない export」になるため置かない。
 */

export const CAREER_NEEDS: Readonly<Record<CareerNeed, NeedDefinition>> = {
  "quit-or-stay": {
    label: "辞めるか残るか",
    pillarSlug: "civil-construction-1-guide-quit-or-stay",
    nextStepTitle: "施工管理を辞めたいと思ったら",
    nextStepReason: "「仕事内容が嫌」なのか「いまの職場が嫌」なのかを切り分ける判断軸。",
    affiliateCta: {
      consultation: "いまの条件で動けるか無料で相談する",
      registration: "無料登録して条件の違う求人を見る",
    },
  },
  pay: {
    label: "年収・手当",
    pillarSlug: "civil-construction-1-guide-market-value",
    nextStepTitle: "1級土木の市場価値",
    nextStepReason: "資格・工種・役割が待遇にどう反映されるかを確かめてから交渉する。",
    affiliateCta: {
      consultation: "年収相場と提示条件を無料で聞く",
      registration: "無料登録して年収帯の求人を見る",
    },
  },
  workstyle: {
    label: "働き方・休日",
    pillarSlug: "civil-construction-1-guide-quit-or-stay",
    nextStepTitle: "施工管理を辞めたいと思ったら",
    nextStepReason: "休日・残業・出張が会社を変えれば解けるかを先に切り分ける。",
    affiliateCta: {
      consultation: "休日・現場数・出張の条件を無料で聞く",
      registration: "無料登録して勤務条件から求人を見る",
    },
  },
  location: {
    label: "勤務地・転勤",
    pillarSlug: "civil-construction-1-guide-career-path",
    nextStepTitle: "1級土木施工管理技士のキャリアパス",
    nextStepReason: "地元で働き続けられる進路が現場常駐以外にもあるかを比較する。",
    affiliateCta: {
      consultation: "希望地域と転勤条件を無料で相談する",
      registration: "無料登録して地域から求人を探す",
    },
  },
  "market-value": {
    label: "市場価値",
    pillarSlug: "civil-construction-1-guide-market-value",
    nextStepTitle: "1級土木の市場価値",
    nextStepReason: "資格だけでなく工種・工事規模・立場で評価がどう変わるかを整理する。",
    affiliateCta: {
      consultation: "経験の棚卸しから狙える条件を無料で聞く",
      registration: "無料登録して自分の経験で通る求人を見る",
    },
  },
  "career-path": {
    label: "転職先の選択肢",
    pillarSlug: "civil-construction-1-guide-career-path",
    nextStepTitle: "1級土木施工管理技士のキャリアパス",
    nextStepReason: "発注者支援・公務員・建設コンサルを含めて進路を並べて比べる。",
    affiliateCta: {
      consultation: "別職種を含む選択肢を無料で相談する",
      registration: "無料登録して職種別に求人を見る",
    },
  },
  application: {
    label: "応募の実務",
    pillarSlug: "civil-construction-1-guide-resume",
    nextStepTitle: "施工管理の職務経歴書の書き方",
    nextStepReason: "工事経歴・工種・立場をどう書けば伝わるかを記入例で確認する。",
    affiliateCta: {
      consultation: "工事経歴の伝え方を無料で相談する",
      registration: "無料登録して応募先の条件を確かめる",
    },
  },
  "service-choice": {
    label: "サービス選び",
    pillarSlug: "civil-construction-1-guide-career-agent-comparison",
    nextStepTitle: "転職エージェントを軸で比較する",
    nextStepReason: "タイプ別の向き不向きと、公表されている情報だけを並べた比較。",
    affiliateCta: {
      consultation: "登録後の流れを無料で確かめる",
      registration: "無料登録して求人の中身を確かめる",
    },
  },
};

/**
 * slug → need の対応。**配列順の first-match-wins**（部分一致）。
 * career-funnel.json の pillarRules と同じ考え方だが、粒度が細かい（8 値）。
 */
const NEED_RULES: ReadonlyArray<{ readonly need: CareerNeed; readonly patterns: readonly string[] }> = [
  { need: "service-choice", patterns: ["agent", "buildjob-review"] },
  { need: "application", patterns: ["resume", "interview", "-timing"] },
  { need: "workstyle", patterns: ["white-company", "job-reality", "women"] },
  { need: "quit-or-stay", patterns: ["quit"] },
  { need: "pay", patterns: ["salary", "allowance", "career-cases"] },
  { need: "market-value", patterns: ["market-value", "grade-comparison"] },
  {
    need: "career-path",
    patterns: [
      "career-path",
      "consultant",
      "hatchu-shien",
      "public-servant",
      "dx-jobs",
      "company-types",
      "career-change",
      "haken-seishain",
      "young-career",
      "age-career",
      "future",
      "guide-career",
    ],
  },
];

/** slug の悩みを解決する。当たらなければ null（既定 CTA へ落とさない）。 */
export function resolveCareerNeed(slug: string | undefined): CareerNeed | null {
  if (!slug) return null;
  for (const rule of NEED_RULES) {
    if (rule.patterns.some((p) => slug.includes(p))) return rule.need;
  }
  return null;
}

/** 記事末に置く内部次行動（hub と、その記事の need に対応する柱）。 */
export interface CareerNextStep {
  readonly href: string;
  readonly title: string;
  readonly reason: string;
}

/**
 * career 記事の記事末に出す内部導線を返す。
 * 自分自身は候補から外す（柱の記事が自分へ戻るリンクを出さない）。
 */
export function resolveCareerNextSteps(slug: string | undefined): readonly CareerNextStep[] {
  const steps: CareerNextStep[] = [];
  const need = resolveCareerNeed(slug);
  if (need) {
    const def = CAREER_NEEDS[need];
    if (def.pillarSlug !== slug) {
      steps.push({ href: careerArticlePath(def.pillarSlug), title: def.nextStepTitle, reason: def.nextStepReason });
    }
  }
  if (slug !== CAREER_HUB_SLUG) {
    steps.push({
      href: careerArticlePath(CAREER_HUB_SLUG),
      title: "施工管理の転職（悩み別の入口）",
      reason: "6 つの悩みから、いま読むべき 1 ページを選び直せます。",
    });
  }
  return steps;
}

/**
 * キャリア hub の「いまの状態から選ぶ」入口。
 *
 * MDX の表ではなくコンポーネントで描くのは、選択を `career_need_select` として計測するため
 * （表のリンクには data-cta を付けられない）。並び順がそのまま画面の並び順になる。
 * 6 行目だけは need ではなく読者層（2 級・若手）で分岐する入口で、need は career-path を割り当てる。
 */
export interface CareerHubEntry {
  readonly need: CareerNeed;
  /** 読者が自分を見つけるための「いまの状態」。 */
  readonly state: string;
  /** その状態で最初に必要になること。 */
  readonly first: string;
  readonly href: string;
  readonly label: string;
}

export const CAREER_HUB_ENTRIES: readonly CareerHubEntry[] = [
  {
    need: "quit-or-stay",
    state: "辞めたい気持ちが消えない",
    first: "辞めたい理由の切り分け",
    href: "/exam/civil-construction-1/guide/quit-or-stay",
    label: "辞めたいと思ったら",
  },
  {
    need: "pay",
    state: "いまの年収が妥当か分からない",
    first: "経験と資格の棚卸し",
    href: "/exam/civil-construction-1/guide/market-value",
    label: "1級の市場価値",
  },
  {
    need: "career-path",
    state: "施工管理を続けるか迷う",
    first: "現場以外の進路の比較",
    href: "/exam/civil-construction-1/guide/career-path",
    label: "資格のキャリアパス",
  },
  {
    need: "application",
    state: "応募の書き方が分からない",
    first: "工事経歴の言語化",
    href: "/exam/civil-construction-1/guide/resume",
    label: "職務経歴書の書き方",
  },
  {
    need: "service-choice",
    state: "どのサービスを使うか迷う",
    first: "タイプ別の使い分け",
    href: "/exam/civil-construction-1/guide/career-agent-comparison",
    label: "エージェントを軸で比較",
  },
  {
    need: "career-path",
    state: "2級・若手・未経験である",
    first: "経験段階に応じた戦略",
    href: "/exam/civil-construction-2/guide/career",
    label: "2級のキャリア・メリット",
  },
];
