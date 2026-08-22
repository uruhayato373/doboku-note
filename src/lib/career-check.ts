/**
 * career-check.ts — 「土木施工管理キャリア整理ツール」の純ロジック。
 *
 * 何をしないか（先に書く）:
 *   - 転職の可否・想定年収・採用可能性を**判定しない**。
 *   - 氏名・会社名・連絡先・正確な年収・自由記述を**受け取らない**（型に存在しない）。
 *   - サーバーへ送らない。UI 側も保存しない。
 *
 * 何をするか: 読者が「資格 × 工種 × 工事規模 × 立場」を自分で棚卸しできるように、
 *   整理すべき論点・次に読む記事・面談で聞く質問・経歴の書き出し項目を返す。
 *
 * 分岐を UI へ散らさないため、入力 → 結果は本ファイルの純関数に閉じる。
 * 悩みの語彙は `career-pathways.ts`（悩み分類の SSOT）を再利用する。
 *
 * 方針の真実源: .claude/knowledge/reference/affiliate-operations.md「読者が自分で棚卸しするツール」
 */
import { CAREER_HUB_SLUG, CAREER_NEEDS, type CareerNeed } from "@/config/career-pathways";

/**
 * 読者が選ぶ悩み。`urgent` だけは need ではなく**安全側の分岐**で、
 * 転職の話に進まず公的窓口を先に案内する。
 */
export type Concern =
  | "urgent"
  | "quit-or-stay"
  | "pay"
  | "workstyle"
  | "location"
  | "market-value"
  | "application";

export type Qualification = "none" | "civil-2" | "civil-1" | "kanri" | "pe";
export type ExperienceBand = "lt3" | "3to7" | "7to15" | "gte15";
export type WorkType = "road" | "river" | "zosei" | "water" | "bridge" | "other";
export type Role = "tantou" | "shunin" | "kanri" | "daikan" | "hacchusha";
/** 「わからない」を必ず用意する（覚えていない読者を弾かない）。 */
export type ScaleBand = "unknown" | "lt50m" | "50to450m" | "gte450m";
export type ChangeWant = "pay" | "holiday" | "location" | "role" | "offsite";

export interface CareerCheckInput {
  readonly concern: Concern;
  readonly qualification: Qualification;
  readonly experience: ExperienceBand;
  readonly workType: WorkType;
  readonly role: Role;
  readonly scale: ScaleBand;
  readonly changeWant: ChangeWant;
}

interface CareerCheckRead {
  readonly href: string;
  readonly title: string;
  readonly reason: string;
  /** 外部（公的窓口）か。UI で別扱いにする。 */
  readonly external?: boolean;
}

export interface CareerCheckResult {
  /** 緊急性のある悩み。転職 CTA を出さず、公的窓口を先に出す。 */
  readonly urgent: boolean;
  readonly need: CareerNeed | null;
  readonly headline: string;
  /** まず整理すべき論点。 */
  readonly points: readonly string[];
  /** 次に読むページ。 */
  readonly reads: readonly CareerCheckRead[];
  /** 面談・求人票で確認する質問（3〜5 件）。 */
  readonly questions: readonly string[];
  /** 工事経歴の棚卸し項目。 */
  readonly inventory: readonly string[];
  /** 結果の後に転職サービス CTA を出してよいか。 */
  readonly showAffiliate: boolean;
}

export const QUALIFICATION_LABEL: Readonly<Record<Qualification, string>> = {
  none: "資格なし・取得予定",
  "civil-2": "2級土木施工管理技士",
  "civil-1": "1級土木施工管理技士",
  kanri: "監理技術者資格者証あり",
  pe: "技術士",
};

export const EXPERIENCE_LABEL: Readonly<Record<ExperienceBand, string>> = {
  lt3: "3年未満",
  "3to7": "3〜7年",
  "7to15": "7〜15年",
  gte15: "15年以上",
};

export const WORK_TYPE_LABEL: Readonly<Record<WorkType, string>> = {
  road: "道路",
  river: "河川・砂防",
  zosei: "造成・土工",
  water: "上下水道",
  bridge: "橋梁",
  other: "その他",
};

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  tantou: "担当技術者",
  shunin: "主任技術者",
  kanri: "監理技術者",
  daikan: "現場代理人",
  hacchusha: "発注者側（監督員など）",
};

export const SCALE_LABEL: Readonly<Record<ScaleBand, string>> = {
  unknown: "わからない",
  lt50m: "5,000万円未満",
  "50to450m": "5,000万〜4,500万円超の帯",
  gte450m: "4,500万円以上",
};

export const CHANGE_WANT_LABEL: Readonly<Record<ChangeWant, string>> = {
  pay: "年収",
  holiday: "休日・残業",
  location: "勤務地・転勤",
  role: "任される役割",
  offsite: "現場常駐以外の職種",
};

/** 悩み → `career-pathways.ts` の need。`urgent` は need を持たない。 */
function concernToNeed(concern: Concern): CareerNeed | null {
  if (concern === "urgent") return null;
  return concern;
}

/** 「変えたいこと」から次に読むべき柱を補う。 */
const CHANGE_WANT_NEED: Readonly<Record<ChangeWant, CareerNeed>> = {
  pay: "pay",
  holiday: "workstyle",
  location: "location",
  role: "career-path",
  offsite: "career-path",
};

const HUB_READ: CareerCheckRead = {
  href: `/docs/${CAREER_HUB_SLUG}`,
  title: "施工管理の転職（悩み別の入口）",
  reason: "6 つの悩みから読むページを選び直せます。",
};

const URGENT_READS: readonly CareerCheckRead[] = [
  {
    href: "https://kokoro.mhlw.go.jp/",
    title: "こころの耳（厚生労働省）",
    reason: "働く人向けの電話・SNS・メール相談。匿名・無料で使えます。",
    external: true,
  },
  {
    href: "https://www.check-roudou.mhlw.go.jp/soudan/",
    title: "労働条件相談ほっとライン・総合労働相談コーナー",
    reason: "労働時間や賃金未払いなど、労働条件そのものの相談窓口です。",
    external: true,
  },
  HUB_READ,
];

/** 立場ごとに、面談で必ず確認しておきたいこと。 */
const ROLE_QUESTION: Readonly<Record<Role, string>> = {
  tantou: "入社後どの立場で配置される予定か（担当のままか、主任技術者を任せる想定か）",
  shunin: "主任技術者として配置される工事の規模と件数",
  kanri: "監理技術者としての専任配置がどの程度あるか、監理技術者手当の有無",
  daikan: "現場代理人としての権限範囲と、常駐義務の扱い",
  hacchusha: "発注者側の経験をどの職種で評価しているか（施工／発注者支援／積算のどれか）",
};

const CHANGE_WANT_QUESTION: Readonly<Record<ChangeWant, string>> = {
  pay: "提示年収の内訳（基本給・固定残業・資格手当・賞与実績）",
  holiday: "年間休日数だけでなく、土曜出勤の頻度と代休の取得実態",
  location: "配属エリアの決まり方と、転勤・出張の頻度",
  role: "入社後1〜3年で任せる役割と、その評価のされ方",
  offsite: "現場常駐以外の職種（積算・品質・発注者支援など）への異動実績",
};

const CONCERN_POINTS: Readonly<Record<Concern, readonly string[]>> = {
  urgent: [
    "いま起きている健康被害や違法状態は、転職では止まりません。先に相談先を確保してください。",
    "転職活動には数か月かかります。消耗した状態で条件を選ぶと、同じ環境を引き当てやすくなります。",
    "退職・休職・異動・労基署への相談は、転職と並行して選べる別の選択肢です。",
  ],
  "quit-or-stay": [
    "辞めたい理由を「仕事内容への不満」と「職場環境への不満」に分ける。",
    "環境要因なら会社や部署を変えれば解ける可能性がある。仕事内容そのものなら職種変更も視野に入る。",
    "資格取得が目前なら、取ってから動くほうが評価は上がりやすい。",
  ],
  pay: [
    "いまの年収を、基本給・手当・賞与に分解して把握する。",
    "資格手当は会社差が大きい。額そのものより、資格が広げる役割で見る。",
    "年収は工事規模と立場に連動しやすい。担当してきた工事の帯を確認する。",
  ],
  workstyle: [
    "残業と休日の状況が、特定の現場・時期に偏っているかを見る。",
    "会社の受注分野（公共／民間、元請／下請）で働き方は大きく変わる。",
    "現場常駐そのものが合わないなら、常駐以外の職種も候補に入る。",
  ],
  location: [
    "地元で働き続けたいのか、エリアを問わないのかを先に決める。",
    "建設特化のサービスは都市部に求人が厚くなりやすい。地域密着の求人サイトを併用する。",
    "転勤の有無は求人票に書かれないことがある。面談で必ず聞く。",
  ],
  "market-value": [
    "資格だけでなく、工種・工事規模・立場の4つで棚卸しする。",
    "元請か下請か、発注者が公共か民間かでも評価は変わる。",
    "市場価値の把握は、転職しない場合でも現職の交渉材料になる。",
  ],
  application: [
    "工事経歴は「何をしたか」ではなく「どんな判断をして、どうなったか」で書く。",
    "工程・品質・安全・原価・環境のどれで判断したかを、工事ごとに1つ思い出す。",
    "退職理由は、不満ではなく「次に何をしたいか」に言い換える。",
  ],
};

/** 経験年数と資格から、棚卸しで特に効く項目を足す。 */
function inventoryFor(input: CareerCheckInput): string[] {
  const base = [
    "工事名・発注者・工事場所・工期",
    `工種（${WORK_TYPE_LABEL[input.workType]}）と主な施工量`,
    `立場（${ROLE_LABEL[input.role]}）と現場の体制・人数`,
    "元請か下請か、発注者が公共か民間か",
    "工程・品質・安全・原価・環境のうち、自分が判断したこと",
    "数字で説明できる結果（工期短縮・不具合ゼロ・原価低減など）",
  ];
  if (input.scale === "unknown") {
    base.push("請負金額の帯（契約書・工事カルテ・社内資料で確認できます）");
  } else {
    base.push(`請負金額の帯（${SCALE_LABEL[input.scale]}）`);
  }
  if (input.qualification === "kanri" || input.role === "kanri") {
    base.push("監理技術者として専任配置された工事と、その期間");
  }
  if (input.experience === "lt3") {
    base.push("担当した工程の一部でも、自分で段取りした範囲を具体的に");
  }
  return base;
}

/** 入力から結果を組み立てる。**どの組合せでも必ず結果を返す**（例外を投げない）。 */
export function evaluateCareerCheck(input: CareerCheckInput): CareerCheckResult {
  const urgent = input.concern === "urgent";
  const need = concernToNeed(input.concern);

  if (urgent) {
    return {
      urgent: true,
      need: null,
      headline: "転職より先に、安全と相談先を確保してください",
      points: CONCERN_POINTS.urgent,
      reads: URGENT_READS,
      questions: [],
      inventory: [],
      showAffiliate: false,
    };
  }

  const reads: CareerCheckRead[] = [];
  const seen = new Set<string>();
  const push = (r: CareerCheckRead) => {
    if (seen.has(r.href)) return;
    seen.add(r.href);
    reads.push(r);
  };
  if (need) {
    const def = CAREER_NEEDS[need];
    push({ href: `/docs/${def.pillarSlug}`, title: def.nextStepTitle, reason: def.nextStepReason });
  }
  const wantNeed = CHANGE_WANT_NEED[input.changeWant];
  const wantDef = CAREER_NEEDS[wantNeed];
  push({ href: `/docs/${wantDef.pillarSlug}`, title: wantDef.nextStepTitle, reason: wantDef.nextStepReason });
  push(HUB_READ);

  const questions = [
    CHANGE_WANT_QUESTION[input.changeWant],
    ROLE_QUESTION[input.role],
    `${WORK_TYPE_LABEL[input.workType]}の工事を実際にどれくらい持っているか（直近の実績で）`,
    "現場の掛け持ち件数と、夜勤・休日出勤の実態",
  ];
  if (input.qualification !== "none") {
    questions.push(`${QUALIFICATION_LABEL[input.qualification]}をどう評価するか（手当・役割・配置）`);
  }

  return {
    urgent: false,
    need,
    headline: "整理すべき論点と、次に読むページ",
    points: CONCERN_POINTS[input.concern],
    reads,
    questions: questions.slice(0, 5),
    inventory: inventoryFor(input),
    showAffiliate: true,
  };
}

/**
 * GA4 へ送る値。**列挙値だけ**を送る（自由入力・会社名・金額は型にも存在しない）。
 * `route` は結果の分岐を 1 語で表す（urgent か need キー）。
 */
export function trackingPayload(input: CareerCheckInput, result: CareerCheckResult) {
  return {
    need: result.need ?? "urgent",
    qualification: input.qualification,
    experience: input.experience,
    route: result.urgent ? "urgent" : (result.need ?? "unclassified"),
  } as const;
}
