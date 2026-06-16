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
 * カテゴリ hub に転職アフィリの「枠を出すか」を返すゲート（2026-06-16〜）。
 *
 * 注: カテゴリ hub の 2 カラム化以降、`src/app/category/[slug]/page.tsx` は本戻り値の
 * `kind === 'career'` のみを参照し（careerSidebar 判定）、実 creative は `resolveCareerSidebarAd()`
 * が描画する（期間で BuildJob ↔ GKS を出し分け）。下記 `props` は後方互換のため残置＝**現状未使用**。
 *
 * - civil-1 / civil-2 → 転職枠あり（受験者＝資格でキャリアアップ層と一致）。
 * - pe-comprehensive-management → 転職枠あり（2026-06-16 新設）。GA4 流入 2 位の高トラフィックページの
 *   収益導線ゼロを解消。**素性注意**: 総監（技術士）= シニア建設技術者層。GKS は「20代未経験/若手・
 *   施工管理特化」がターゲットでミスマッチ。〜2026-08-31 はビルドジョブ（建設業界特化・広め）で適合するが、
 *   9/1 の GKS 自動復帰後はシニア向け creative への差し替えを要検討（または pe のみ BuildJob 固定）。
 *   真実源: docs/project/04_運営/02_アフィリエイト提携状況.md。
 * - それ以外（concrete 系 / pe-construction / pe-first-stage）→ なし（docs でもアフィリ無し）。
 */
export function resolveCategoryAffiliate(category: string): CategoryAffiliate | null {
  if (
    category === "civil-construction-1" ||
    category === "civil-construction-2" ||
    category === "pe-comprehensive-management"
  ) {
    return {
      kind: "career",
      props: {
        service: "GKSキャリア",
        category: "施工管理 転職エージェント",
        href: CIVIL_CAREER_AD.href,
        imageSrc: CIVIL_CAREER_AD.imageSrc,
        trackingPixelUrl: CIVIL_CAREER_AD.pixelSrc,
        points: ["施工管理に特化した求人", "在職中でも無料で相談 OK"],
      },
    };
  }
  return null;
}

/** トップ（複数資格横断）に出すアフィリエイト。汎用の SAT 講座。 */
export const HOME_AFFILIATE: CategoryAffiliate = {
  kind: "school",
  props: { ...SCHOOL_SAT },
};
