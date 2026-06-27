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
export const PE_CONSULTING_CAREER_AD = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+NTCZ6+4SXU+NUES1",
  imageSrc:
    "https://www23.a8.net/svt/bgt?aid=260605733040&wid=001&eno=01&mid=s00000022413004005000&mc=1",
  pixelSrc: "https://www18.a8.net/0.gif?a8mat=4B5OO5+NTCZ6+4SXU+NUES1",
  alt: "ハイクラス DX・コンサル転職",
  width: 300,
  height: 250,
} as const;

/**
 * サイドバー転職枠の creative を期間で出し分ける（ビルド時に評価＝SSG）。
 * - 2026-08-31（JST）まで: ビルドジョブ（無料面談 ¥50,000 の増額キャンペーン中、GKS の 2 倍報酬）。
 * - 2026-09-01（JST）以降: GKS に自動復帰（ビルドジョブの増額終了想定）。
 * 注: SSG のためビルド時刻で固定される。9/1 以降の最初の本番再ビルドで自動的に GKS へ戻る。
 *     キャンペーン期間中は GKS の唯一のピクセル源（このサイドバー枠）が止まるため、GKS の
 *     「表示回数」は計測されなくなる（クリック・成果は href 経由で従来どおり計測される）。
 * 人間向け真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
 */
export function resolveCareerSidebarAd(): {
  creative: SidebarAdCreative;
  trackLabel: string;
} {
  // 2026-09-01 00:00 JST = 2026-08-31 15:00 UTC（月は 0 始まりのため 8 月 = 7）
  const campaignEndUtcMs = Date.UTC(2026, 7, 31, 15, 0, 0);
  if (Date.now() < campaignEndUtcMs) {
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
export function resolveCareerArticleEndCard(): CareerArticleEndCard {
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
 * カテゴリ hub の `resolveCategoryCareerAd`（非該当=null＝枠なし）とは別物で、**docs は全カテゴリで枠を出す**
 * 方針（2026-06-06 全 docs 常設）を維持しつつ、総監だけ creative を資格別セグメントする:
 * - pe-comprehensive-management（総監＝シニア技術者・管理職層）→ ハイクラス DX/コンサル転職。
 *   施工管理系（ビルドジョブ/GKS）は総監層にミスマッチなため。カテゴリ hub と同じセグメント判断。
 * - それ以外（civil / pe-construction / concrete / pe-first-stage 等）→ `resolveCareerSidebarAd()`
 *   （〜8/31 ビルドジョブ ¥50,000 ／ 9/1 以降 GKS）。
 */
export function resolveDocsCareerSidebarAd(
  category: string,
): { creative: SidebarAdCreative; trackLabel: string } {
  if (category === "pe-comprehensive-management") {
    return { creative: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar" };
  }
  return resolveCareerSidebarAd();
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
export function resolveCategoryCareerAd(
  category: string,
): { creative: SidebarAdCreative; trackLabel: string } | null {
  if (category === "pe-comprehensive-management") {
    return { creative: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar" };
  }
  if (
    category === "civil-construction-1" ||
    category === "civil-construction-2" ||
    category === "pe-construction"
  ) {
    // pe-construction（建設部門）も BuildJob/GKS の建設・施工管理セグメントに適合（2026-06-26）。
    // docs サイドバー/モバイル記事末は既に BuildJob 被覆済みで、カテゴリ hub だけ枠が無かった穴を埋める。
    return resolveCareerSidebarAd();
  }
  return null;
}
