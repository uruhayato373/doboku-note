/**
 * アフィリエイト creative の単一ソース（複数サーフェスで再利用する分のみ）。
 *
 * docs ページ（src/app/docs/[...slug]/page.tsx）に加え、カテゴリ hub
 * （src/app/category/[slug]/page.tsx）・トップ（src/app/page.tsx）でも同じ creative を
 * 使うため、計測ピクセル URL（a8mat）の二重管理＝drift を避けて 1 箇所に集約する。
 *
 * 1 ページ 1 ピクセルの原則: 同一ページで同じ a8mat のピクセルを 2 回発火させない。
 * カテゴリ/トップは現状アフィリ枠ゼロなので、各ページに 1 creative = 1 pixel で追加する。
 *
 * creative 情報の人間向け真実源: .claude/knowledge/reference/affiliate-operations.md
 */

/** サイドバー転職バナーの共通 creative 型（GKS / ビルドジョブ で出し分けるため）。 */
export type SidebarAdCreative = {
  readonly href: string;
  readonly imageSrc: string;
  readonly pixelSrc: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
};

/** GKSキャリア（施工管理 転職支援・A8.net）。300×250 banner + 計測ピクセル。無料面談 ¥25,000/件。 */
export const CIVIL_CAREER_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B3VR8+F0LMU2+4R40+TSBE9",
  imageSrc:
    "https://www29.a8.net/svt/bgt?aid=260521604908&wid=002&eno=01&mid=s00000022176005003000&mc=1",
  pixelSrc: "https://www15.a8.net/0.gif?a8mat=4B3VR8+F0LMU2+4R40+TSBE9",
  alt: "施工管理 転職支援サービス",
  width: 300,
  height: 250,
} as const;

/**
 * ビルドジョブ（建設業界特化 転職エージェント・A8.net）。300×250 banner + 計測ピクセル。
 * 2026-08-31 まで「新規無料キャリア面談」の成果報酬が ¥50,000/件（GKS の ¥25,000 の 2 倍）の
 * 期間限定増額キャンペーン中。GKS と同カテゴリ（無料面談で成果）のためカニバる ＝ 並置せず、
 * サイドバー転職枠を期間限定で本案件へ単独切替する（resolveCareerSidebarAd）。
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
 * ハイクラス DX・コンサル転職（A8.net）。技術士（総監）= シニア技術者・管理職層向け。300×250 + pixel。
 * GKS（20代未経験/施工管理）が総監層にミスマッチなため、pe カテゴリ hub のサイドバー転職枠に充てる
 * （2026-06-16）。資格別セグメント: civil=施工管理系（BuildJob/GKS）/ pe=ハイクラス DX/コンサル。
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
 * 建設JOBs（リアルエステートWORKS・施工管理/建設業界特化の転職サイト・A8.net）。300×250 + pixel。
 * 成果点は「会員登録」¥4,500/件。ビルドジョブの面談 ¥50,000 より低単価だが、登録は低摩擦で
 * 成約率が高い見込み。EPC（報酬 × 成約率）でビルドジョブを上回るかは不明なため、施工管理/建設
 * セグメントのサイドバー枠で **slug ハッシュ 50/50 の A/B** にかける（resolveCareerSidebarAbArm）。
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
 * ビルドジョブ 本文テキストリンク（NTRMQ）。300×250 バナーが置けない狭い面（記事中間）に
 * テキストで露出するための creative。文言は A8 発行の公式テキスト（景表法整合・¥表記なし）。
 * href のみ（計測ピクセルなし）。note 用テキストリンク（NTJWY）とは別 mat（サイト用）。
 */
const BUILDJOB_TEXT_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NTRMQ",
  text: "ビルドジョブ｜建設業界特化の転職エージェントの無料キャリア面談",
} as const;

/**
 * ビルドジョブ 120×60 小バナー（NU729）。カテゴリ hub の「キャリア・転職」セクションなど、
 * 300×250 では大きすぎる面に置く小型バナー。href のみ（ピクセルなし）。
 * ※ 100×60（NUES1）も affiliate-mats.json に登録済み（別サイズが要るとき用の予備）。
 */
const BUILDJOB_BANNER_120 = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NU729",
  imageSrc:
    "https://www24.a8.net/svt/bgt?aid=260605733026&wid=002&eno=01&mid=s00000024757004004000&mc=1",
  alt: "建設業界特化 転職エージェント ビルドジョブ",
  width: 120,
  height: 60,
} as const;

/** FNV-1a 32bit ハッシュ。slug 単位で決定論的に A/B を振り分ける（同じページは常に同じ arm＝SSG 安定）。 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A/B 振り分け: slug ハッシュ偶奇で 50/50。true = 建設JOBs(arm B)。slug 不明は arm A（既定）に倒す。 */
function isKensetsuJobsArm(slug: string | undefined): boolean {
  return slug ? fnv1a(slug) % 2 === 1 : false;
}

/**
 * キャンペーン終了（2026-09-01）後に slug ハッシュ 50/50 A/B を再開するか（2026-08-04 決定・既定 false）。
 *
 * false = civil セグメントの記事面は **建設JOBs 100%**。理由:
 * 1. 9/1 に BuildJob（¥50,000 キャンペーン）が終わると arm A の中身は GKS になり、
 *    **A8 公開 EPC が GKS 457 円 < 建設JOBs 709 円と逆転する**。50/50 のまま自動復帰すると
 *    露出の半分を低い側へ流し続ける（backlog P5-a）。
 * 2. affiliate-operations.md §6.5 の分母規律（確定成果 3 件で判定可）に照らすと、
 *    必要クリック数は 建設JOBs 約 19（CVR≒15.8%）に対し GKS 約 164（CVR≒1.8%）。
 *    現在の流量（年初〜7月で全案件合計 137 クリック）では GKS 側の分母は現実的に貯まらず、
 *    50/50 を続けても「判定不能」が延々と続くだけで学習が進まない。
 * 3. 建設JOBs へ寄せれば単一 arm に分母が集中し、実測 EPC を最短で得られる。
 *
 * true にすると `isKensetsuJobsArm` の 50/50 ハッシュ A/B に戻る（arm A = GKS）。
 * 型を `boolean` で明示しているのは、リテラル narrowing で分岐が dead code 扱いにならないようにするため。
 * 真実源: .claude/knowledge/reference/affiliate-operations.md §6.5 裁定ログ 2026-08-04。
 */
const POST_CAMPAIGN_AB_ENABLED: boolean = false;

/**
 * 高意図キャリア slug（キャリア/転職/年収/働き方 intent のガイド記事）の一覧。
 *
 * **2026-07-28 以降、arm 判定には使っていない**（キャンペーン中は全ページ BuildJob 固定に
 * 変更したため。理由は `isKensetsuJobsArmEffective` のコメント）。
 * 「どの記事が転職高意図として作られたか」の一覧としては生きており、docs（08/09）が
 * 件数の真実源として参照するため export したまま残す。9 月以降の arm 再設計で
 * 「意図別に案件を出し分ける」なら再びここが起点になる。
 * 学習 intent（過去問・textbook・keyword）と総監（PE_CONSULTING）は含めない。
 * 真実源: docs/project/04_運営/09_BuildJob収益最大化スプリント.md（P0）。
 */
export const HIGH_INTENT_CAREER_SLUGS: ReadonlySet<string> = new Set([
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
]);

/**
 * 実効 arm 判定: キャンペーン期間中（〜2026-08-31）は civil セグメントの **全ページ** を
 * arm A（ビルドジョブ）に固定する。9/1 以降は従来の slug ハッシュ 50/50 A/B へ自動復帰。
 * サイドバー・記事末カード・本文中間テキストの全サーフェスがこの 1 関数を共有するため、
 * 同一ページ内で案件が食い違わない（ピクセルも常にサイドバー 1 発火＝1 ページ 1 ピクセル維持）。
 *
 * なぜ高意図 slug 限定をやめたか（2026-07-28）:
 * 当初は `HIGH_INTENT_CAREER_SLUGS`（36 件）だけを固定していたが、GA4 実測で
 * **その 36 件は流入上位 100 ページに 1 つも入っていなかった**（セッション実質 0）。
 * 実際の流入は学習系ページに集中しており（civil-construction-1-guide-strategy 641 /
 * secondary-experience-writing-guide 359 等）、そこは 50/50 A/B のままで、
 * 高流入ページの約半分が低 EPC 側に落ちていた（建設JOBs 側に 1,567 セッション）。
 * A8 公開 EPC は BuildJob 942 円 / 建設JOBs 709 円で、単価差が最大の 8 月に
 * 半分を低い側へ流す合理性が無いため、キャンペーン中は全体を寄せる。
 *
 * 9/1 以降（2026-08-04 決定・backlog P5-a の前倒し）: 50/50 A/B へは戻さず **建設JOBs 100%**。
 * GKS（EPC 457 円）< 建設JOBs（709 円）と逆転するうえ、GKS 側は分母規律を満たすクリックが
 * 現実的に貯まらないため（根拠は `POST_CAMPAIGN_AB_ENABLED`）。A/B を再開したくなったら
 * そのフラグを true にするだけで従来のハッシュ振り分けに戻る。
 */
function isKensetsuJobsArmEffective(slug: string | undefined): boolean {
  if (isCampaignActive()) return false;
  if (!POST_CAMPAIGN_AB_ENABLED) return true;
  return isKensetsuJobsArm(slug);
}

/**
 * 施工管理/建設セグメントのサイドバー転職枠を slug ハッシュで A/B 振り分ける（2026-06-29〜）。
 * - arm B（約50%）: 建設JOBs（登録 ¥4,500・低摩擦）。trackLabel=KensetsuJobs-sidebar。
 * - arm A（約50%）: 既定 `resolveCareerSidebarAd()`（〜8/31 ビルドジョブ ¥50,000 ／ 9/1 GKS）。
 * EPC（報酬 × 成約率）で勝者を決めるための恒久 A/B。総監（PE_CONSULTING）は対象外。
 * 注: 各 arm は自前の pixelSrc を持つ＝ページごとに 1 ピクセル（1 ページ 1 ピクセル維持）。
 * 例外: キャンペーン期間中の高意図キャリア slug は arm B を使わずビルドジョブ固定
 * （isKensetsuJobsArmEffective・〜2026-08-31 の短期収益施策）。
 */
function resolveCareerSidebarAbArm(slug: string | undefined): {
  creative: SidebarAdCreative;
  trackLabel: string;
} {
  if (isKensetsuJobsArmEffective(slug)) {
    return { creative: KENSETSU_JOBS_CAREER_AD, trackLabel: "KensetsuJobs-sidebar" };
  }
  return resolveCareerSidebarAd();
}

/**
 * サイドバー転職枠の creative を期間で出し分ける（ビルド時に評価＝SSG）。
 * - 2026-08-31（JST）まで: ビルドジョブ（無料面談 ¥50,000 の増額キャンペーン中、GKS の 2 倍報酬）。
 * - 2026-09-01（JST）以降: GKS。
 * 注: SSG のためビルド時刻で固定される。9/1 以降の最初の本番再ビルドで切り替わる。
 *     キャンペーン期間中は GKS の唯一のピクセル源（このサイドバー枠）が止まるため、GKS の
 *     「表示回数」は計測されなくなる（クリック・成果は href 経由で従来どおり計測される）。
 *
 * **9/1 以降、この関数の GKS 分岐に到達するのはカテゴリ hub（`resolveCategoryCareerAds`）だけ**。
 * 記事面（docs サイドバー・記事末カード）は `isKensetsuJobsArmEffective` が true を返して
 * 建設JOBs 100% になるため。GKS は hub の補完枠として残り、ピクセル源もそこへ戻る。
 * 人間向け真実源: .claude/knowledge/reference/affiliate-operations.md
 */
/**
 * ビルドジョブ増額キャンペーン期間中か（ビルド時=SSG 評価）。
 * 2026-09-01 00:00 JST = 2026-08-31 15:00 UTC（月は 0 始まりのため 8 月 = 7）以降 false。
 * 9/1 以降の最初の本番再ビルドで、ビルドジョブ依存の面（サイドバー/テキスト/小バナー）が
 * 自動的に GKS 復帰 or 非表示になる。全アフィリ resolver が共有する単一の期間境界。
 */
function isCampaignActive(): boolean {
  return Date.now() < Date.UTC(2026, 7, 31, 15, 0, 0);
}

function resolveCareerSidebarAd(): {
  creative: SidebarAdCreative;
  trackLabel: string;
} {
  if (isCampaignActive()) {
    return { creative: BUILDJOB_CAREER_AD, trackLabel: "BuildJob-sidebar" };
  }
  return { creative: CIVIL_CAREER_AD, trackLabel: "GKS-sidebar" };
}

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
 * ビルドジョブ カードの記事テーマ別 CTA。slug の部分一致で数パターンに出し分ける
 * （過度に細分化しない・先勝ち）。マッチしない slug と slug 不明（inline preset 経由）は
 * 既定 CTA「資格・経験で狙える求人を無料で聞く」に倒す。
 * 方針: 「無料相談」の一般訴求ではなく「何がわかるか（求人/年収相場/働き方の選択肢）」を前面に出す。
 * 真実源: docs/project/04_運営/09_BuildJob収益最大化スプリント.md（P0 カードコピー改善）。
 */
const BUILDJOB_CTA_BY_THEME: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly cta: string;
}> = [
  { pattern: /quit/, cta: "辞める前に、外で評価される条件を確認する" },
  { pattern: /salary|allowance|market-value/, cta: "今の年収で損していないか確認する" },
  { pattern: /resume|interview/, cta: "職務経歴書・面接対策を無料で相談する" },
  {
    pattern: /hatchu-shien|consultant|public-servant/,
    cta: "発注者支援・別職種の選択肢を相談する",
  },
  { pattern: /white-company|job-reality|timing/, cta: "残業・休日条件のよい求人を相談する" },
  {
    pattern: /women|young|haken-seishain|age-career/,
    cta: "年齢・経歴に合う求人を無料で聞く",
  },
];

/**
 * ビルドジョブの記事末/inline カードコピーを解決する。
 * - description に安心コピー（「今すぐ転職すると決めていなくても〜確認できる」）を常時内蔵し、
 *   転職エージェントへの心理的ハードル（応募を急かされそう・断りづらい）を先回りで解消する。
 * - CTA は記事テーマ別に出し分け（BUILDJOB_CTA_BY_THEME）。
 * - 数値訴求（年収アップ額等の広告主公称値）は本文/カードとも使わない（景表法・LP 更新リスク回避。
 *   使う場合は「サービス公表値」明記が必須＝docs/project/04_運営/09 §戦略判断4）。
 * - service 名は既存 GA4 ラベル（data-cta-label="ビルドジョブ"）との継続性のため変えない。
 */
function resolveBuildJobCopy(slug?: string): CareerArticleEndCard {
  const themed = slug
    ? BUILDJOB_CTA_BY_THEME.find(({ pattern }) => pattern.test(slug))
    : undefined;
  return {
    service: "ビルドジョブ",
    category: "建設業界特化 転職エージェント",
    description:
      "今すぐ転職すると決めていなくても、資格・経験で狙える求人や年収相場を無料キャリア面談で確認できます。",
    href: BUILDJOB_CAREER_AD.href,
    points: [
      "建設業界に特化した求人紹介",
      "書類作成・面接対策・条件交渉までサポート",
      "登録・相談はすべて無料",
    ],
    cta: themed?.cta ?? "資格・経験で狙える求人を無料で聞く",
  };
}

/**
 * civil（1級/2級）記事末・モバイル限定の転職ネイティブカードを解決する。
 *
 * 背景: サイドバー転職枠（`resolveCareerSidebarAd`）は PC（≥993px）のみ表示のため、
 * モバイル読者には転職導線が一切「見えない／クリックできない」。記事末（FAQ 直後）に
 * visible なネイティブカードを新設してモバイルのクリック面を確保する。
 *
 * ピクセル: このカードは **href のみ（計測ピクセルなし）**。インプレッション計測は
 * サイドバー側の 1 発火を唯一の源として維持する（1 ページ 1 ピクセル原則）。
 *
 * creative は `resolveCareerSidebarAd()` と同じ期間境界で出し分ける
 * （〜2026-08-31 ビルドジョブ ¥50,000 ／ 9-01 以降 GKS に自動復帰）。
 * 文言は .claude/knowledge/reference/affiliate-operations.md「6. 配置ポリシー」に従う
 * （広告主の公称値は PR バッジ付きカード内の points に限定し、未確認の数値は記載しない）。
 * 公称値の実体は各 creative 定義の points / CAREER_PRESETS が真実源。
 */
export function resolveCareerArticleEndCard(slug?: string): CareerArticleEndCard {
  // A/B arm B（建設JOBs・登録 ¥4,500）。サイドバーと同じ実効 arm 判定で一致させ、同一ページは
  // PC サイドバーと記事末カードが必ず同じ案件になる（href のみ＝ピクセルはサイドバー arm B が源）。
  // キャンペーン中の高意図キャリア slug は arm B を使わずビルドジョブ固定（isKensetsuJobsArmEffective）。
  if (isKensetsuJobsArmEffective(slug)) {
    return {
      service: "建設JOBs",
      category: "施工管理・建設業界の転職サイト",
      description:
        "資格取得後のキャリアも視野に。施工管理・建設業界に特化した転職サイトに無料登録して、自分に合う求人を探せます。",
      href: KENSETSU_JOBS_CAREER_AD.href,
      points: [
        "施工管理・建設業界に特化した求人サイト",
        "登録は無料・スマホで完結",
        "気になる求人を自分のペースで探せる",
      ],
      cta: "無料で登録して求人を見る",
    };
  }
  if (resolveCareerSidebarAd().trackLabel === "BuildJob-sidebar") {
    return resolveBuildJobCopy(slug);
  }
  // GKS カード。9/1 以降は上の建設JOBs 分岐が全 slug で先に返るため、`POST_CAMPAIGN_AB_ENABLED`
  // を true に戻して arm A を復活させたときだけ到達する（A/B 再開時の受け皿として残す）。
  return {
    service: "GKSキャリア",
    category: "施工管理 転職エージェント",
    description:
      "施工管理のキャリアアップを考えるなら。20代・未経験/若手に強く、資格取得支援も受けられます。",
    href: CIVIL_CAREER_AD.href,
    points: [
      "20代・未経験/若手の施工管理に強い",
      "登録無料・資格取得支援あり",
      "提携3,000社以上の求人ネットワーク",
    ],
    cta: "無料で求人を見る",
  };
}

/**
 * docs ページ（記事）のサイドバー転職枠 creative をカテゴリで解決（2026-06-20）。
 * カテゴリ hub の `resolveCategoryCareerAds`（両方表示・非該当=[]＝枠なし）とは別物で、**docs は全カテゴリで枠を出す**
 * 方針（2026-06-06 全 docs 常設）を維持しつつ、総監だけ creative を資格別セグメントする:
 * - pe-comprehensive-management（総監＝シニア技術者・管理職層）→ ハイクラス DX/コンサル転職。
 *   施工管理系（ビルドジョブ/GKS）は総監層にミスマッチなため。カテゴリ hub と同じセグメント判断。
 * - それ以外（civil / pe-construction / concrete / pe-first-stage 等）→ `resolveCareerSidebarAd()`
 *   （〜8/31 ビルドジョブ ¥50,000 ／ 9/1 以降 GKS）。
 */
export function resolveDocsCareerSidebarAd(
  category: string,
  slug?: string,
): { creative: SidebarAdCreative; trackLabel: string } {
  if (category === "pe-comprehensive-management") {
    return { creative: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar" };
  }
  // 施工管理/建設は slug ハッシュで建設JOBs(arm B) ↔ ビルドジョブ/GKS(arm A) の A/B。
  return resolveCareerSidebarAbArm(slug);
}

/**
 * 総監 docs 記事末（モバイル限定）ネイティブカード用の PE_CONSULTING（ハイクラス DX/コンサル）creative。
 * href のみ（計測ピクセルなし）＝総監 docs サイドバー側の PE_CONSULTING 1 発火を唯一の源として維持
 * （1 ページ 1 ピクセル）。文言は creative の公称ターゲティング（シニア技術者・管理職・DX/コンサル・無料相談）
 * に限定し、未確認のブランド名・数値は記載しない（真実源: .claude/knowledge/reference/affiliate-operations.md）。
 */
export function resolvePeConsultingArticleEndCard(): CareerArticleEndCard {
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
 * カテゴリ hub の右サイドバー転職枠 creative を「カテゴリ別」に解決する（2026-06-16〜）。
 * 受験者層に creative をセグメントする（戻り値 null = 転職枠なし＝単一カラム）。
 * page.tsx の careerSidebar 判定（ゲート）も兼ねる。
 *
 * - civil-1 / civil-2 / pe-construction / concrete 系 / pe-first-stage（施工管理・建設業界エンジニア）
 *   → `[建設JOBs, resolveCareerSidebarAd()]`（期間で BuildJob ↔ GKS）。concrete（コンクリート主任/診断士）と
 *   pe-first-stage（技術士一次＝建設部門志望が主）も建設業界読者ゆえ 2026-07-06 に枠を追加（露出最大化）。
 * - pe-comprehensive-management（総監＝シニア技術者・管理職層）→ ハイクラス DX/コンサル転職
 *   （`PE_CONSULTING_CAREER_AD`）。GKS の「20代未経験/施工管理」ミスマッチを解消（2026-06-16 差替）。
 *   GA4 流入 2 位の高トラフィックページの収益導線ゼロも解消。
 * - それ以外 → null（カテゴリ hub に転職枠なし）。
 *
 * 真実源: .claude/knowledge/reference/affiliate-operations.md。
 */
export function resolveCategoryCareerAds(
  category: string,
): Array<{ creative: SidebarAdCreative; trackLabel: string }> {
  if (category === "pe-comprehensive-management") {
    return [{ creative: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar" }];
  }
  if (
    category === "civil-construction-1" ||
    category === "civil-construction-2" ||
    category === "pe-construction" ||
    category === "concrete-chief-engineer" ||
    category === "concrete-diagnostician" ||
    category === "pe-first-stage"
  ) {
    // カテゴリ hub は低意図のブラウジング文脈。建設JOBs（登録 ¥4,500）とビルドジョブ（面談 ¥50,000）は
    // 行動が異なる**補完案件**（代替でない＝A8 は別プログラムで別々に成果課金）ため、A/B で 1 つに
    // 絞らず**両方**出して読者に選ばせる（harvest・2026-06-29）。記事ページ（読書意図）は別途 slug
    // ハッシュ A/B（resolveDocsCareerSidebarAd / resolveCareerArticleEndCard）を維持＝直交。
    // 各 creative は自前 pixelSrc を持つ＝別プログラムの 1 ピクセルずつ（同一 mat 二重発火ではない）。
    return [
      { creative: KENSETSU_JOBS_CAREER_AD, trackLabel: "KensetsuJobs-sidebar" },
      resolveCareerSidebarAd(), // ビルドジョブ（〜8/31）/ GKS（9-01〜）
    ];
  }
  return [];
}

/** 本文中間テキスト CTA の型（career 記事用・href のみ・ピクセルなし）。 */
export type CareerTextLink = {
  readonly href: string;
  readonly text: string;
  readonly trackLabel: string;
  /** リンク直前に置く安心コピー（編集文言・A8 creative 本文ではない）。 */
  readonly lead: string;
};

/**
 * career 記事の本文中間テキスト CTA を解決する（2026-07・ビルドジョブ増額キャンペーン限定）。
 *
 * **2026-07-28 以降、描画側からは未使用**。本文中間は 1 行テキストリンクではなく
 * ネイティブカード（`resolveCareerArticleEndCard` → `MidArticleCta mode="career"`）に格上げした。
 * mat NTRMQ 自体は A8 で発行済みの実体で `affiliate-mats.json` が `definedIn` で参照するため
 * 関数ごと残す（テキストリンク面を再開するときの入口）。
 *
 * 300×250 バナーが置けない本文フローに、テキストリンクで露出する（テキストは一般にバナーより CTR 高）。
 * - arm B（建設JOBs slug ハッシュ・高意図 slug の campaign 中固定を除く）: **null**。建設JOBs の
 *   テキスト mat が無く、arm B に別ブランドのテキストを混ぜると恒久 A/B の EPC 比較が汚れるため、
 *   面を出さず related fallback に委ねる。
 * - arm A かつ campaign 中: ビルドジョブ テキストリンク（NTRMQ）。label=BuildJob-midtext。
 *   リンク文言は A8 発行の公式テキストのまま変えず、直前の安心コピー（lead・編集文言）で
 *   「今すぐ転職しなくても相場確認だけできる」ハードル解消を補う。
 * - 2026-09-01 以降: null（GKS のテキスト mat 未提供＝面ごと自動消滅）。
 * href のみ（1 ページ 1 ピクセル維持）。表示側で PR 開示を必ず付ける。
 */
export function resolveCareerTextLink(slug?: string): CareerTextLink | null {
  if (isKensetsuJobsArmEffective(slug)) return null;
  if (isCampaignActive()) {
    return {
      href: BUILDJOB_TEXT_AD.href,
      text: BUILDJOB_TEXT_AD.text,
      trackLabel: "BuildJob-midtext",
      lead: "今すぐ転職すると決めていなくても、求人相場と自分の評価だけ確認できます。",
    };
  }
  return null;
}

/** hub キャリアセクション用の小バナー creative 型（href のみ・ピクセルなし）。 */
export type SmallBannerCreative = {
  readonly href: string;
  readonly imageSrc: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly trackLabel: string;
};

/**
 * カテゴリ hub の「キャリア・転職」セクションに置く小バナー（120×60）を解決する。
 * campaign 中のみ返す（9/1 以降 null＝GKS 小バナー mat 未提供）。href のみ（hub は既に
 * 建設JOBs＋BuildJob の 2 ピクセルを発火中のため、この小バナーはピクセルを持たない）。
 */
export function resolveCareerSmallBanner(): SmallBannerCreative | null {
  if (!isCampaignActive()) return null;
  return {
    href: BUILDJOB_BANNER_120.href,
    imageSrc: BUILDJOB_BANNER_120.imageSrc,
    alt: BUILDJOB_BANNER_120.alt,
    width: BUILDJOB_BANNER_120.width,
    height: BUILDJOB_BANNER_120.height,
    trackLabel: "BuildJob-hubcareer",
  };
}
