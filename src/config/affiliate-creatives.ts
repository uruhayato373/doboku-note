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
 * creative 情報の人間向け真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
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
 * 施工管理/建設セグメントのサイドバー転職枠を slug ハッシュで A/B 振り分ける（2026-06-29〜）。
 * - arm B（約50%）: 建設JOBs（登録 ¥4,500・低摩擦）。trackLabel=KensetsuJobs-sidebar。
 * - arm A（約50%）: 既定 `resolveCareerSidebarAd()`（〜8/31 ビルドジョブ ¥50,000 ／ 9/1 GKS）。
 * EPC（報酬 × 成約率）で勝者を決めるための恒久 A/B。総監（PE_CONSULTING）は対象外。
 * 注: 各 arm は自前の pixelSrc を持つ＝ページごとに 1 ピクセル（1 ページ 1 ピクセル維持）。
 */
function resolveCareerSidebarAbArm(slug: string | undefined): {
  creative: SidebarAdCreative;
  trackLabel: string;
} {
  if (isKensetsuJobsArm(slug)) {
    return { creative: KENSETSU_JOBS_CAREER_AD, trackLabel: "KensetsuJobs-sidebar" };
  }
  return resolveCareerSidebarAd();
}

/**
 * サイドバー転職枠の creative を期間で出し分ける（ビルド時に評価＝SSG）。
 * - 2026-08-31（JST）まで: ビルドジョブ（無料面談 ¥50,000 の増額キャンペーン中、GKS の 2 倍報酬）。
 * - 2026-09-01（JST）以降: GKS に自動復帰（ビルドジョブの増額終了想定）。
 * 注: SSG のためビルド時刻で固定される。9/1 以降の最初の本番再ビルドで自動的に GKS へ戻る。
 *     キャンペーン期間中は GKS の唯一のピクセル源（このサイドバー枠）が止まるため、GKS の
 *     「表示回数」は計測されなくなる（クリック・成果は href 経由で従来どおり計測される）。
 * 人間向け真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
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
 * 文言は docs/project/04_運営/02_アフィリエイト提携状況.md の保管庫の公称値に基づく
 * （未確認の数値は記載しない）。
 */
export function resolveCareerArticleEndCard(slug?: string): CareerArticleEndCard {
  // A/B arm B（建設JOBs・登録 ¥4,500）。サイドバーと同じ slug ハッシュで一致させ、同一ページは
  // PC サイドバーと記事末カードが必ず同じ案件になる（href のみ＝ピクセルはサイドバー arm B が源）。
  if (isKensetsuJobsArm(slug)) {
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
    return {
      service: "ビルドジョブ",
      category: "建設業界特化 転職エージェント",
      description:
        "資格取得後のキャリアも視野に。建設・施工管理に特化した求人を、専任アドバイザーの無料キャリア面談で相談できます。",
      href: BUILDJOB_CAREER_AD.href,
      points: [
        "建設業界に特化した求人紹介",
        "専任アドバイザーによる無料キャリア面談",
        "登録・相談はすべて無料",
      ],
      cta: "無料でキャリア相談する",
    };
  }
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
 * に限定し、未確認のブランド名・数値は記載しない（真実源: docs/project/04_運営/02_アフィリエイト提携状況.md）。
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
 * - civil-1 / civil-2 / pe-construction（施工管理・建設業界）→ `resolveCareerSidebarAd()`（期間で BuildJob ↔ GKS）。
 *   pe-construction（建設部門）も BuildJob 適合のため 2026-06-26 にカテゴリ枠を追加（docs は被覆済みだった）。
 * - pe-comprehensive-management（総監＝シニア技術者・管理職層）→ ハイクラス DX/コンサル転職
 *   （`PE_CONSULTING_CAREER_AD`）。GKS の「20代未経験/施工管理」ミスマッチを解消（2026-06-16 差替）。
 *   GA4 流入 2 位の高トラフィックページの収益導線ゼロも解消。
 * - それ以外（concrete 系 / pe-first-stage）→ null（カテゴリ hub に転職枠なし）。
 *
 * 真実源: docs/project/04_運営/02_アフィリエイト提携状況.md。
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
    category === "pe-construction"
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
};

/**
 * career 記事の本文中間テキスト CTA を解決する（2026-07・ビルドジョブ増額キャンペーン限定）。
 * 300×250 バナーが置けない本文フローに、テキストリンクで露出する（テキストは一般にバナーより CTR 高）。
 * - arm B（建設JOBs slug ハッシュ）: **null**。建設JOBs のテキスト mat が無く、arm B に別ブランドの
 *   テキストを混ぜると恒久 A/B の EPC 比較が汚れるため、面を出さず related fallback に委ねる。
 * - arm A かつ campaign 中: ビルドジョブ テキストリンク（NTRMQ）。label=BuildJob-midtext。
 * - 2026-09-01 以降: null（GKS のテキスト mat 未提供＝面ごと自動消滅）。
 * href のみ（1 ページ 1 ピクセル維持）。表示側で PR 開示を必ず付ける。
 */
export function resolveCareerTextLink(slug?: string): CareerTextLink | null {
  if (isKensetsuJobsArm(slug)) return null;
  if (isCampaignActive()) {
    return {
      href: BUILDJOB_TEXT_AD.href,
      text: BUILDJOB_TEXT_AD.text,
      trackLabel: "BuildJob-midtext",
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
