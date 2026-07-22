/**
 * Brain 商品定義 (Single Source of Truth)
 *
 * Brain（brain-market.com）で販売する Claude Code キット商品の状態・URL・価格を一元管理する。
 * check-brain-wiring.mjs と brain-publish（scripts/brain-publish.mjs）から参照される。
 * coconala-services.ts と同じ流儀（文章側 doc に価格を書かない・status で導線を制御）。
 *
 * 出品フロー:
 * 1. 本エントリ（title/price/status:'draft'）＋ .claude/config/brain-listings.json（本文/画像/有料ライン）を用意
 * 2. 配布物 ZIP を .claude/config/brain/dist/ に置き（トークン付ファイル名）、
 *    `gh workflow run r2-brain-dist.yml` で R2 へ（main に載っている必要あり）
 * 3. `node scripts/brain-publish.mjs --service <id>` で下書き作成（既定）
 *    → `--commit` で 価格・有料ライン設定＋公開申請（審査は原則24h・結果はメール）
 *    → 申請成功時に status:'submitted' + articleId + submittedAt を本ファイルへ自動書き戻し
 * 4. 審査結果メール確認後、通過なら status:'listed'（手動 flip）・却下なら 'rejected'（修正→再申請）
 *
 * 商品の実体（スキル本体）は別 private リポジトリ:
 *   claude-code-civil-essay-kit / pe-policy-bank-kit（配布 ZIP は git archive で生成）
 */

export type BrainStatus = 'draft' | 'submitted' | 'listed' | 'rejected' | 'paused';

export interface BrainProduct {
  readonly id: string;
  /** submitted=公開申請済（審査待ち）。listed になったら外部導線（/links 等）に載せてよい */
  readonly status: BrainStatus;
  /** Brain の記事 id（URL の /a/{articleId}）。申請時に自動書き戻し */
  readonly articleId: string;
  /** 公開後の販売ページ URL（https://brain-market.com/a/{articleId}）。listed で必須 */
  readonly productUrl: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  /** 表示用の価格文字列 */
  readonly price: string;
  /** 機械照合用の価格（Brain 販売設定と一致させる。100円〜100,000円） */
  readonly priceYen: number;
  readonly examScope: readonly string[];
  /** 配布 ZIP のファイル名（.claude/config/brain/dist/ 直下・トークン付）。
   *  配布 URL = https://storage.doboku-note.com/brain/dist/{distFile}（有料エリアに記載） */
  readonly distFile: string;
  readonly submittedAt?: string;
  readonly listedAt?: string;
}

const PRODUCTS_RAW = {
  // 商品①: 1級・2級土木 施工経験記述 設計キット（2026-07-22 公開申請 → 2026-07-22 審査通過・販売中）
  'brain-civil-essay-kit': {
    id: 'brain-civil-essay-kit',
    status: 'submitted',
    articleId: 'b5EDO3UjMgoTZsNWa0JXY',
    productUrl: 'https://brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY',
    title: 'Claude Codeで作る 1級・2級土木「施工経験記述」設計キット｜設問整理・答案案・字数検査まで',
    shortTitle: '経験記述 設計キット（Brain）',
    description:
      '1級・2級土木施工管理技士 第2次検定「施工経験記述」を、購入者自身の工事経験から Claude Code で設計・検証するキット。スキル＋Generator/Reviewer エージェント＋入力/答案/レビューテンプレート＋字数・必須項目・プレースホルダ検査スクリプト＋架空サンプル＋START-HERE PDF。本人が経験していない工事は創作しない（UNKNOWN で停止）。',
    price: '¥7,980（β・DLキット一式）',
    priceYen: 7980,
    examScope: ['civil-1', 'civil-2'],
    distFile: 'claude-code-civil-essay-kit-beta-8K93ERd_D6fR.zip',
    submittedAt: '2026-07-22',
    listedAt: '2026-07-22',
  },
  // 商品②: 技術士総監 出題テーマ分析・国家施策バンク 設計キット（2026-07-22 公開申請 → 2026-07-22 審査通過・販売中）
  'brain-sokan-policy-bank': {
    id: 'brain-sokan-policy-bank',
    status: 'submitted',
    articleId: 'b1IDO3UjMgoTZsNWa0JXY',
    productUrl: 'https://brain-market.com/a/b1IDO3UjMgoTZsNWa0JXY',
    title: 'Claude Codeで作る 技術士総監「出題テーマ分析・国家施策バンク」設計キット｜設問3の施策を根拠つきで備蓄',
    shortTitle: '総監 施策バンク キット（Brain）',
    description:
      '技術士総合技術監理部門（総監）記述式・設問3向けに、出そうな国家課題を8軸採点で幅広く備蓄し、5管理トレードオフ込みの施策部品（約600字）まで落とす Claude Code 分析キット。スキル＋エージェント5体＋テンプレート5種＋検査スクリプト3種（後知恵カットオフ検出含む）＋架空サンプル＋R8ケーススタディ（正直版）＋バックテスト検証記録。予言・的中保証はしない。',
    price: '¥9,800（β・DLキット一式）',
    priceYen: 9800,
    examScope: ['pe-comprehensive-management'],
    distFile: 'pe-policy-bank-kit-beta-vfsiHyhN_1g2.zip',
    submittedAt: '2026-07-22',
    listedAt: '2026-07-22',
  },
} as const satisfies Record<string, BrainProduct>;

export const BRAIN_PRODUCTS: readonly BrainProduct[] = Object.values(PRODUCTS_RAW);

/** listed のみ（外部導線用。審査待ち submitted は含めない） */
export function listedBrainProducts(): BrainProduct[] {
  return BRAIN_PRODUCTS.filter((p) => p.status === 'listed');
}
