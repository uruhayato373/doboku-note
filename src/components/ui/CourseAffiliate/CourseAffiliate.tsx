import {
  AFFILIATE_LINK_REL,
  AffiliateCta,
  AffiliatePrBadge,
  TrackingPixel,
} from "@/components/ui/AffiliateParts";

/**
 * プリセット案件の creative（href / imageSrc / 計測ピクセル完全 URL）を集約。
 * MDX 本文では mat / 画像 / 生ピクセルを直書きせず `program="..."` を指定する
 * （mat 変更時の MDX 全置換を回避＝1 箇所変更で反映）。配信ドメインが creative ごとに
 * 異なる（独学=www18 / SAT=www19）ため pixelSrc は完全 URL を持つ（trackingPixel の www19 固定とは別経路）。
 */
const COURSE_PRESETS = {
  "dokugaku-keiken": {
    href: "https://px.a8.net/svt/ejp?a8mat=4B3VR8+FAQ04A+4ASS+6M4J5",
    imageSrc:
      "https://www20.a8.net/svt/bgt?aid=260521604925&wid=002&eno=01&mid=s00000020062001111000&mc=1",
    pixelSrc: "https://www18.a8.net/0.gif?a8mat=4B3VR8+FAQ04A+4ASS+6M4J5",
  },
  "sat-gijutsusi": {
    href: "https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y23MI+5TRO+BWGDT&a8ejpredirect=https%3A%2F%2Fwww.sat-co.info%2Fec%2Fgijutsusi",
    imageSrc: "https://www.sat-co.info/ec//images/new_item/gijutsusi/img-products.png",
    pixelSrc: "https://www19.a8.net/0.gif?a8mat=4B3RUZ+6Y23MI+5TRO+BWGDT",
  },
} as const;

interface CourseAffiliateProps {
  readonly provider: string;
  readonly course: string;
  readonly description?: string;
  /** プリセット案件キー（任意）。指定すると href/imageSrc/ピクセルを SSOT から解決し MDX に mat を直書きしない。 */
  readonly program?: keyof typeof COURSE_PRESETS;
  /** アフィリエイトリンク URL（`program` 指定時は省略可） */
  readonly href?: string;
  /** バナー画像 URL（`program` 指定時は省略可） */
  readonly imageSrc?: string;
  /** A8 mat 値（www19 配信の計測ピクセルを内部生成）。`program` と併用しない。 */
  readonly trackingPixel?: string;
  /** `program` 指定時に計測ピクセル（preset の完全 URL）を描画するか（1 ページ 1 ピクセル制御）。 */
  readonly withPixel?: boolean;
  readonly cta?: string;
}

/**
 * CourseAffiliate — 資格講座のアフィリエイトリンクを統一カードで表示する。
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored" / target="_blank" は自動付与。
 * 計測ピクセル: `program` 指定時は preset の完全 URL（任意ドメイン）を `withPixel` で描画。
 * `trackingPixel`（mat 値）指定時は従来どおり www19 で内部生成（後方互換）。
 *
 * 配置原則: 記事末・hub末のCTA。ファーストビュー禁止（メイン導線と矛盾するため）。
 */
export default function CourseAffiliate({
  provider,
  course,
  description,
  program,
  href,
  imageSrc,
  trackingPixel,
  withPixel = false,
  cta = "詳細を見る",
}: CourseAffiliateProps) {
  const preset = program ? COURSE_PRESETS[program] : undefined;
  const resolvedHref = href ?? preset?.href;
  const resolvedImage = imageSrc ?? preset?.imageSrc;
  const pixelUrl =
    preset && withPixel
      ? preset.pixelSrc
      : trackingPixel
        ? `https://www19.a8.net/0.gif?a8mat=${trackingPixel}`
        : undefined;
  return (
    <div className="not-prose my-6">
      <a
        href={resolvedHref}
        rel={AFFILIATE_LINK_REL}
        target="_blank"
        data-cta="affiliate"
        data-cta-label={provider}
        className="group relative flex flex-col sm:flex-row items-stretch gap-4 rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
        style={{ textDecoration: "none" }}
      >
        <AffiliatePrBadge className="absolute right-3 top-3" />

        <div className="flex shrink-0 items-center justify-center sm:w-40 w-full">
          <img
            src={resolvedImage}
            alt={`${provider} ${course}`}
            loading="lazy"
            className="max-h-32 sm:max-h-28 w-auto object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center pr-10 sm:pr-12">
          <div className="text-[11px] font-bold tracking-wider text-brand-deep dark:text-brand uppercase">
            {provider}
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-ink-strong dark:text-gray-100 group-hover:underline">
            {course}
          </div>
          {description && (
            <div className="mt-1.5 text-sm leading-6 text-ink-body dark:text-gray-400">
              {description}
            </div>
          )}
          <AffiliateCta>{cta}</AffiliateCta>
        </div>
      </a>

      <TrackingPixel src={pixelUrl} />
    </div>
  );
}
