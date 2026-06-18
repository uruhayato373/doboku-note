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
export const BUILDJOB_CAREER_AD = {
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

/** SAT 通信講座（スクール系・A8.net）。記事末テキストリンク カード用 creative。 */
export const SCHOOL_SAT = {
  provider: "SAT",
  course: "すべての人に最高の教材を【eラーニング・現場系国家資格】",
  description:
    "一次からの学び直しや、体系的なフル講座で対策したいときに。e ラーニングで現場系国家資格を効率よく対策。",
  href: "https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y22UQ+5TRO+5YJRM",
  pixelUrl: "https://www12.a8.net/0.gif?a8mat=4B3RUZ+6Y22UQ+5TRO+5YJRM",
} as const;

export type CategoryAffiliate =
  | {
      readonly kind: "career";
      readonly props: {
        service: string;
        category: string;
        description?: string;
        href: string;
        imageSrc?: string;
        trackingPixelUrl?: string;
        points?: readonly string[];
      };
    }
  | {
      readonly kind: "school";
      readonly props: {
        provider: string;
        course: string;
        description?: string;
        href: string;
        pixelUrl?: string;
      };
    };

/**
 * カテゴリ hub の右サイドバー転職枠 creative を「カテゴリ別」に解決する（2026-06-16〜）。
 * 受験者層に creative をセグメントする（戻り値 null = 転職枠なし＝単一カラム）。
 * page.tsx の careerSidebar 判定（ゲート）も兼ねる。
 *
 * - civil-1 / civil-2（施工管理・現場/若手層）→ `resolveCareerSidebarAd()`（期間で BuildJob ↔ GKS）。
 * - pe-comprehensive-management（総監＝シニア技術者・管理職層）→ ハイクラス DX/コンサル転職
 *   （`PE_CONSULTING_CAREER_AD`）。GKS の「20代未経験/施工管理」ミスマッチを解消（2026-06-16 差替）。
 *   GA4 流入 2 位の高トラフィックページの収益導線ゼロも解消。
 * - それ以外（concrete 系 / pe-construction / pe-first-stage）→ null（docs でもアフィリ無し）。
 *
 * 真実源: docs/project/04_運営/02_アフィリエイト提携状況.md。
 */
export function resolveCategoryCareerAd(
  category: string,
): { creative: SidebarAdCreative; trackLabel: string } | null {
  if (category === "pe-comprehensive-management") {
    return { creative: PE_CONSULTING_CAREER_AD, trackLabel: "DXConsulting-sidebar" };
  }
  if (category === "civil-construction-1" || category === "civil-construction-2") {
    return resolveCareerSidebarAd();
  }
  return null;
}

/** トップ（複数資格横断）に出すアフィリエイト。汎用の SAT 講座。 */
export const HOME_AFFILIATE: CategoryAffiliate = {
  kind: "school",
  props: { ...SCHOOL_SAT },
};
