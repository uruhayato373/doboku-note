/**
 * 転職アフィリエイトの素材（バナー・本文カードの文言・悩み別 CTA）と、ココナラの A8 リンク。
 *
 * どのページのどの面にどの案件を出すかはここに書かない。正本は config/affiliate-placements.json（案件 × 面 × 対象 × 期間）で、
 * src/lib/affiliate-placement.ts が解決し、案件 id で PROGRAM_ASSETS を引く（2026-10-07 に日付・カテゴリ・slug の分岐を
 * ここからルールへ移した。それ以前の増額キャンペーン・slug ハッシュの A/B・GKS の素材は git 履歴。建設JOBs は同日 2級へ絞って戻した）。
 *
 * 1 ページ 1 ピクセル: 同一ページで同じ a8mat のピクセルを 2 回発火させない。発火源の面は config/cta-placements.json の
 * pixelPriority で決まる（解決は affiliate-placement.ts の pixelFor）。
 * mat は config/affiliate-mats.json の許可リストにあること（check-affiliate-mats）。
 * 人間向けの方針: .claude/knowledge/reference/affiliate-operations.md「6. 配置ポリシー」
 */

import {
  CAREER_NEEDS,
  resolveCareerNeed,
  type CareerNeed,
  type ServiceOutcome,
} from "@/config/career-pathways";

/** 300×250 の転職バナーの素材型。 */
export type SidebarAdCreative = {
  readonly href: string;
  readonly imageSrc: string;
  readonly pixelSrc: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
};

/**
 * ビルドジョブ（建設業界特化 転職エージェント・A8.net）。300×250 banner + 計測ピクセル。
 * 2026-09-08 検証の通常条件は面談 ¥13,534（60 歳未満・申込後 30 日以内の無料面談完了）。
 */
const BUILDJOB_CAREER_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH",
  imageSrc:
    "https://www21.a8.net/svt/bgt?aid=260605733026&wid=002&eno=01&mid=s00000024757004003000&mc=1",
  pixelSrc: "https://www15.a8.net/0.gif?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH",
  alt: "建設業界特化 転職エージェント ビルドジョブ",
  width: 300,
  height: 250,
} as const;

/**
 * 建設JOBs（リアルエステートWORKS・施工管理/建設業界特化の転職サイト・A8.net）。300×250 + pixel。
 * 成果条件は新規登録 ¥4,500（20〜30代・建設業界の経験・WEB 登録後 30 日以内の電話本人確認。2026-09-08 A8 実機）。
 * 全年齢の記事に出す前提は 2026-09-08 に撤回し、2026-10-07 に 2級土木の学習ページへ絞って戻した（EXP-017）。
 * 素材は 2026-09-08 までの配置と同じ（A8 の doboku-note・websiteId=002）。
 */
const KENSETSU_JOBS_CAREER_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B41ZD+GGZS2I+4XWQ+BXB8X",
  imageSrc:
    "https://www27.a8.net/svt/bgt?aid=260529673996&wid=002&eno=01&mid=s00000023057002003000&mc=1",
  pixelSrc: "https://www10.a8.net/0.gif?a8mat=4B41ZD+GGZS2I+4XWQ+BXB8X",
  alt: "建設JOBs 施工管理・建設業界の転職サイト",
  width: 300,
  height: 250,
} as const;

/**
 * ハイクラス DX・コンサル転職（A8.net）。技術士（総監）= シニア技術者・管理職層向け。300×250 + pixel。
 * 施工管理系の案件が総監層に合わないため、総監のページはこの案件だけにする（2026-06-16）。
 */
const PE_CONSULTING_CAREER_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+NTCZ6+4SXU+NUES1",
  imageSrc:
    "https://www23.a8.net/svt/bgt?aid=260605733040&wid=001&eno=01&mid=s00000022413004005000&mc=1",
  pixelSrc: "https://www18.a8.net/0.gif?a8mat=4B5OO5+NTCZ6+4SXU+NUES1",
  alt: "ハイクラス DX・コンサル転職",
  width: 300,
  height: 250,
} as const;


/**
 * ココナラ（A8.net・プログラム s00000012624009）。自社のココナラ出品ページへの商品リンク。
 * 「アフィリは転職一本」の例外（2026-09-24 ユーザー決定）: 送客先は自社出品なので note とカニバらない。
 * 成果は「ココナラを初めて使う人の会員登録 ¥100」。当サイトの出品（学習指導・資格）の購入は成果対象外。
 * 特典を付けた誘導は否認条件なので、コピーで登録特典を謳わない。
 *
 * A8 の商品リンクは全サービスで同じ mat を使い、a8ejpredirect に飛び先 URL を encodeURIComponent して
 * 載せる形（2026-09-24 A8 実機・doboku-note websiteId=002 で listed 20 件の生成結果と照合済み）。
 * A8 は生成リンクの改変を禁じているので、この形を変えない（tests/coconala-affiliate-href.test.mjs が固定）。
 * 計測ピクセルは 1 ページ 1 発（同じ mat を 2 回発火させない）。
 */
const COCONALA_A8_LINK_BASE = "https://px.a8.net/svt/ejp?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A";
export const COCONALA_A8_PIXEL = "https://www15.a8.net/0.gif?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A";

/** ココナラのサービス / 出品者 / カテゴリ URL を A8 経由の商品リンクに変換する。 */
export function coconalaAffiliateHref(serviceUrl: string): string {
  return `${COCONALA_A8_LINK_BASE}&a8ejpredirect=${encodeURIComponent(serviceUrl)}`;
}

/**
 * 高意図キャリア slug（キャリア/転職/年収/働き方 intent のガイド記事）の台帳。
 *
 * 配置の判定には使っていない（2026-07-28 から。配置は config/affiliate-placements.json）。
 * 「どの記事が転職高意図として作られたか」の一覧として check-career-separation が読む（career タグとの突合）。
 * 学習 intent（過去問・textbook・keyword）と総監は含めない。
 */
export const HIGH_INTENT_CAREER_SLUGS: ReadonlySet<string> = new Set([
  // キャリア hub（2026-08-21 新設）。悩み分岐の入口＝最も高意図。
  "civil-construction-1-guide-career",
  "civil-construction-1-guide-quit-or-stay",
  "civil-construction-1-guide-resume",
  "civil-construction-1-guide-interview",
  "civil-construction-1-guide-hatchu-shien",
  "civil-construction-1-guide-quit-honne",
  "civil-construction-1-guide-future",
  "civil-construction-1-guide-salary-by-role",
  "civil-construction-1-guide-age-career",
  "civil-construction-1-guide-public-servant",
  "civil-construction-1-guide-consultant",
  "civil-construction-1-guide-allowance",
  "civil-construction-1-guide-timing",
  "civil-construction-1-guide-white-company",
  "civil-construction-1-guide-company-types",
  "civil-construction-1-guide-women",
  "civil-construction-1-guide-dx-jobs",
  "civil-construction-1-guide-career-agents",
  "civil-construction-1-guide-career-cases",
  "civil-construction-1-guide-career-path",
  "civil-construction-1-guide-career-salary",
  "civil-construction-1-guide-salary-up",
  "civil-construction-1-guide-market-value",
  "civil-construction-1-guide-grade-comparison",
  "civil-construction-2-guide-quit-or-stay",
  "civil-construction-2-guide-young-career",
  "civil-construction-2-guide-haken-seishain",
  "civil-construction-2-guide-resume",
  "civil-construction-2-guide-career-change",
  "civil-construction-2-guide-career",
  "civil-construction-2-guide-salary",
  "civil-construction-2-guide-job-reality",
  "pe-construction-guide-career",
  // BuildJob 収益最大化スプリント P1 で新設した指名/比較/顕在層記事（2026-07-14）。
  // 指名検索（ビルドジョブ 評判）・比較検索・辞める前顕在層＝いずれも高意図で BuildJob 固定が妥当。
  "civil-construction-1-guide-buildjob-review",
  "civil-construction-1-guide-career-agent-comparison",
  "civil-construction-1-guide-career-consultation-before-quit",
  // civil-2 版の指名/比較（2026-07-14）。2級は未経験/若手寄りだが、実務経験ありの 2級保有者は
  // BuildJob 適合＝指名/比較検索の高意図面ゆえ campaign 中は BuildJob 固定（本文は経験段階で正直に出し分け）。
  "civil-construction-2-guide-buildjob-review",
  "civil-construction-2-guide-career-agent-comparison",
  // 土木公務員 SEO 第1期（2026-08-17 新設）。`guide-public-servant`（転職の是非）とは別記事で、
  // こちらは「発注者側で 1 級を取る意味」＝資格取得の判断面。career タグを持つので
  // check-career-separation が未収録を WARN していた（2026-08-25 収録）。
  // **これは台帳登録であって配置ではない**: アフィリ面は配置ルール（config/affiliate-placements.json）が
  // category で決めており、このセットは 2026-07-28 以降 arm 判定に使っていない（上のコメント）。
  "civil-construction-1-public-servant-merit",
  // 2026-09-22 に一度ここへ入れたが、同日中に取り消した。根拠にした「career クラスタの
  // 実クリックを出している・平均 7.8 位」が GSC の実データで裏付けられなかったため
  // （page-query スナップショット 5 本を遡って imp=1 / clk=0、唯一のクエリは
  // 「公務員 土木職 資格」＝資格選びの学習意図）。記事自体も「目的別に資格を比較する」
  // 内容で転職意図ではない。career タグを外して学習系へ戻した。
  // 2026-09-22 第2波の新設（公務員土木クラスタ＋RCCM キャリア価値）。
  // rccm-guide-career-value は本文アフィリを置かない設計だが、career タグを持つ以上
  // check-career-separation の WARN を避けるためここに収録する（サイドバーは資格別 creative）。
  "civil-construction-1-guide-quit-public-engineer",
  "civil-construction-1-guide-public-engineer-salary-table",
  "civil-construction-1-guide-public-engineer-exam-study",
  // 2026-09-30 DN-0446（公務員の土木職か民間かの比較・本文に CareerAffiliate の転職カード）。
  "civil-construction-1-guide-public-servant-or-private",
  "rccm-guide-career-value",
  // 2026-10-01 DN-0490（副業・独立の線引き）。本文アフィリは置かない設計だが、career タグを持つので
  // check-career-separation の WARN を避けるため台帳だけ収録する（rccm-guide-career-value と同じ扱い）。
  "pe-construction-fukugyou-dokuritsu",
]);

/** 記事末ネイティブカード（CareerAffiliate）の props 型。グラフィックバナーではなく訴求文言主体。 */
export type CareerArticleEndCard = {
  readonly service: string;
  readonly category: string;
  readonly description: string;
  readonly href: string;
  readonly points: readonly string[];
  readonly cta: string;
};

/**
 * 悩み（CareerNeed）× サービスの成果点 から CTA 文言を解決する。
 *
 * 2026-08-21 に、slug の正規表現をこのファイルへ直書きしていた `BUILDJOB_CTA_BY_THEME` を
 * `career-pathways.ts` の need 解決へ寄せた。**同じ slug 分類が 2 箇所にある状態を作らない**ため。
 * あわせて、面談が成果点のサービス（ビルドジョブ / GKS）と会員登録が成果点のサービス（建設JOBs）で
 * 別キーで管理する。登録型でも担当者との相談・求人紹介があるため、その流れを明記する。
 *
 * need が解決できない slug（キャリア文脈でない学習記事など）は need 非依存の既定文言に倒す。
 * 方針: 「無料相談」の一般訴求ではなく「何がわかるか」を前面に出す。
 */
function resolveNeedCta(
  slug: string | undefined,
  outcome: ServiceOutcome,
  fallback: string,
  needOverride?: CareerNeed | null,
): string {
  // 記事以外の面（診断ツール等）は slug を持たないため、need を直接受け取れるようにする。
  const need = needOverride ?? resolveCareerNeed(slug);
  return need ? CAREER_NEEDS[need].affiliateCta[outcome] : fallback;
}

/**
 * ビルドジョブの記事末/inline カードコピーを解決する。
 * - description に安心コピー（「今すぐ転職すると決めていなくても〜確認できる」）を常時内蔵し、
 *   転職エージェントへの心理的ハードル（応募を急かされそう・断りづらい）を先回りで解消する。
 * - CTA は読者の悩み（career-pathways.ts の need）で出し分ける。
 * - 数値訴求（年収アップ額等の広告主公称値）は本文/カードとも使わない（景表法・LP 更新リスク回避。
 *   使う場合は「サービス公表値」明記が必須＝docs/operations/09 §戦略判断4）。
 * - service 名は既存 GA4 ラベル（data-cta-label="ビルドジョブ"）との継続性のため変えない。
 */
function resolveBuildJobCopy(slug?: string, need?: CareerNeed | null): CareerArticleEndCard {
  return {
    service: "ビルドジョブ",
    category: "建設業界特化 転職エージェント",
    description:
      "土木・建設の経験と希望条件を無料で相談できます。登録後は担当者との面談へ進み、紹介された求人を見て応募するか判断できます。",
    href: BUILDJOB_CAREER_AD.href,
    points: [
      "建設業界に特化した求人紹介",
      "書類作成・面接対策・条件交渉までサポート",
      "登録・相談はすべて無料",
    ],
    cta: resolveNeedCta(slug, "consultation", "資格・経験で狙える求人を無料で聞く", need),
  };
}

/**
 * 建設JOBs の本文カードの文言。成果点は会員登録（ServiceOutcome は registration）なので、登録後の流れ（電話の本人確認・
 * カウンセリング・求人紹介）を書き、対象（20〜30代・建設業界の経験者）をカードの見出しに出す（対象外の読者が登録して否認されないように）。
 */
function resolveKensetsuJobsCopy(slug?: string, need?: CareerNeed | null): CareerArticleEndCard {
  return {
    service: "建設JOBs",
    category: "施工管理・建設業界の転職支援（20〜30代の経験者向け）",
    description:
      "建設業界で働いた経験がある 20〜30 代の方向けの転職サービスです。登録後は電話での本人確認と担当者とのカウンセリングを経て、求人紹介へ進みます。",
    href: KENSETSU_JOBS_CAREER_AD.href,
    points: [
      "施工管理・建設業界に特化した転職支援",
      "登録・相談は無料",
      "希望条件の確認・書類作成・面接をサポート",
    ],
    cta: resolveNeedCta(slug, "registration", "経験と希望条件を無料で相談する", need),
  };
}

/**
 * 総監の本文カード（ハイクラス DX・コンサル）の文言。文言は creative の公称ターゲティング（シニア技術者・管理職・DX/コンサル・
 * 無料相談）に限定し、未確認のブランド名・数値は記載しない（真実源: .claude/knowledge/reference/affiliate-operations.md）。
 */
function resolvePeConsultingArticleEndCard(): CareerArticleEndCard {
  return {
    service: "ハイクラス DX・コンサル転職",
    category: "技術系管理職・コンサル",
    description:
      "資格取得後のキャリアの選択肢として。技術士・シニア技術者層に向けた DX・コンサル・技術系マネジメントのハイクラス求人を、無料で相談できます。",
    href: PE_CONSULTING_CAREER_AD.href,
    points: [
      "シニア技術者・管理職層向けのハイクラス求人",
      "DX・コンサル・技術系マネジメント領域",
      "登録・相談はすべて無料",
    ],
    cta: "無料でキャリア相談する",
  };
}

/**
 * 案件 id → 素材（バナー・計測ラベル・本文カード）。どの面・どのページに出すかは config/affiliate-placements.json の
 * ルールが決め（src/lib/affiliate-placement.ts が解決する）、ここは「出すと決まった案件の見た目」だけを持つ。
 * trackLabel はバナーの GA4 ラベル（記事末では -sidebar を -endbanner に置き換える＝既存の集計との連続性）。
 * 本文カードの GA4 ラベルは service 名（CareerAffiliate の data-cta-label）。どちらも catalog の ctaLabels にある。
 */
export type ProgramAsset = {
  readonly banner: SidebarAdCreative;
  readonly trackLabel: string;
  readonly card: (slug?: string, need?: CareerNeed | null) => CareerArticleEndCard;
};
export const PROGRAM_ASSETS: Readonly<Record<string, ProgramAsset>> = {
  buildjob: { banner: BUILDJOB_CAREER_AD, trackLabel: "BuildJob-sidebar", card: (slug, need) => resolveBuildJobCopy(slug, need) },
  "dx-consulting": { banner: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar", card: () => resolvePeConsultingArticleEndCard() },
  "kensetsu-jobs": { banner: KENSETSU_JOBS_CAREER_AD, trackLabel: "KensetsuJobs-sidebar", card: (slug, need) => resolveKensetsuJobsCopy(slug, need) },
};

/** 既存の許可済みリンクに対応する案件だけを意匠実験へ渡す。 */
export function programAssetForHref(href: string | undefined): { program: string; asset: ProgramAsset } | null {
  const match = Object.entries(PROGRAM_ASSETS).find(([, asset]) => asset.banner.href === href);
  return match ? { program: match[0], asset: match[1] } : null;
}
