/**
 * ココナラ 出品サービス定義 (Single Source of Truth)
 *
 * 各サービスの出品状態・serviceUrl・価格・受付枠を一元管理する。
 * links/page.tsx（/links の単発サービス導線）と check-coconala-wiring.mjs から参照される。
 *
 * 出品フロー (2026-07-18〜 自動化):
 * 1. 本エントリ（title/price/status:'draft'）＋ .claude/config/coconala-listings.json（本文/カテゴリ）を用意
 * 2. `/coconala-publish`（node scripts/coconala-publish.mjs --service <id> --commit）で出品
 *    → 公開成功時に status:'listed' + serviceUrl + listedAt を本ファイルへ自動書き戻し
 * 3. commit → デプロイ後、/links に「単発サービス」カードが自動表示される
 * （手動出品する場合は 1 の後に UI で出品し、serviceUrl/status を手で埋めてもよい）
 * title は ココナラ側バリデーションで 25字未満・末尾「ます」必須。
 *
 * 出品前は status: 'draft' にしておけば防御的に非表示（listed が 0 件なら
 * セクションごと出ない）。満枠時は 'full'、季節オフは 'paused' へ flip する。
 *
 * 戦略・出品文面の真実源: docs/note/1級・2級土木/ココナラ展開キット.md
 * 運用・スキーマの真実源: docs/reference/coconala-operations.md
 */

export type CoconalaStatus = 'draft' | 'listed' | 'paused' | 'full';

/** サービスが対象とする試験。site の資格 vertical に対応（categories.json の exam key と同義） */
export type CoconalaExamScope =
  | 'civil-1'
  | 'civil-2'
  | 'pe-construction'
  | 'pe-comprehensive-management';

export interface CoconalaService {
  readonly id: string;
  /** listed のみサイト導線が発火する。full/paused は出品中だが導線を伏せる */
  readonly status: CoconalaStatus;
  /**
   * ココナラのサービス URL。出品後に埋める。
   * serviceUrl は照合キー（check-coconala-wiring が listed の非空を強制）のため不変。
   */
  readonly serviceUrl: string;
  readonly title: string;
  /** カード用の短縮タイトル */
  readonly shortTitle: string;
  readonly description: string;
  /** 表示用の価格文字列（例: '¥8,000（2テーマセット）'） */
  readonly price: string;
  /** 機械照合用の価格。orders-log.json / sales-log.json の実績と突合する */
  readonly priceYen: number;
  readonly examScope: readonly CoconalaExamScope[];
  /** 週あたりの受付枠（Red Line #1: 定員なし恒久添削の禁止を機械的に表明する） */
  readonly weeklyCapacity: number;
  /** 出品日（ISO 日付）。listed 化と同時に埋める */
  readonly listedAt?: string;
}

/**
 * 命名規約 (id):
 * - coconala-{サービス種別}: ココナラ出品サービス。sales-log.json の productId は
 *   `coconala:{id}` 形式（例: coconala:coconala-tensaku-set）で接頭辞によりチャネルを判別する。
 *
 * 新サービス追加時の配線チェックリスト（capability ドリフト防止・2026-07-16）:
 *   本エントリ追加だけでは依存する実行系に配線されない。新サービスを足したら:
 *   1. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表「ココナラ」節に追加
 *      ＋ docs/reference/sales-tracking.md の命名表に追加
 *   2. 運用スキーマ: docs/reference/coconala-operations.md のサービス表を更新
 *   3. 出品文面: docs/note/1級・2級土木/ココナラ展開キット.md §出品文面に追加
 *   4. check-coconala-wiring.mjs が pre-commit で catalog↔state↔sales の整合を機械検知する
 *      （listed なのに serviceUrl 空・未知の serviceId・priceYen 不一致で落ちる）
 *   5. 変更後は /doc-sync を1回回して prose 陳腐化を点検（CLAUDE.md §8）
 */
const SERVICES_RAW = {
  // S1: レビュー獲得フロント。1テーマ分の診断のみ（書き換え文は提供しない＝S2 との線引き）。
  //   実測（2026-07-16）: 診断セグメントの競合は1件（道路プロ ¥1,000×1件）のみ＝ほぼ空白。
  //   価格競争が存在しないため ¥1,500 据え置き。
  'coconala-shindan': {
    id: 'coconala-shindan',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317349',
    title: '土木施工管理の経験記述を採点者目線で診断します',
    shortTitle: '経験記述 合格診断',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）の下書き1テーマ分を、元自治体土木（発注者側）の目で診断。合格可能性の A/B/C 判定＋減点ポイント ワースト3＋字数チェックを返却する。診断のみで書き換え文は提供しない（書き換え案は添削サービスの担当）。',
    price: '¥1,500（1テーマ診断）',
    priceYen: 1500,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 5,
    listedAt: '2026-07-18',
  },

  // S2: 主力。実測（2026-07-16・coconala-research）: 添削の中央値 ¥6,500、実売の第2集団は
  //   ¥5,000〜7,000 に密集（あつぼ¥5,000×31件 / 梅村¥7,000×28件 / Jaques¥6,500×25件）。
  //   首位のちゃんさと技師は ¥12,000×297件・¥24,000×133件でレビュー寡占。
  //   → レビュー0の新規参入で ¥8,000（第2集団の上端）は割高と判断し ¥6,000 で開始、
  //     評価20件で ¥9,800（ちゃんさとの下・第2集団の上）へ引き上げる。
  // 価格改定時は priceYen と price の両方＋ココナラ展開キット.md §2 の価格表を同時更新する。
  'coconala-tensaku-set': {
    id: 'coconala-tensaku-set',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317375',
    title: '土木施工管理の経験記述を発注者目線で添削します',
    shortTitle: '経験記述 添削（2テーマセット）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）を令和6年度からの新形式（2テーマ必答）に対応して添削。2テーマ分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋採点者視点のコメント＋書き直し1回を含む。代筆（ゼロからの作成代行）は受験の公正のため行わない。',
    price: '¥6,000（2テーマセット・書き直し1回込み）',
    priceYen: 6000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 3,
    listedAt: '2026-07-18',
  },

  // C1: 単発コンテンツ（出題分析 PDF）。競合実測（2026-07-18）: 出題分析¥2,500×134件が売れている。
  //   note ¥980 の r8-bunseki を funnel 除去した PDF 納品（provision_format=3）。添削/診断とは別セグメント（急ぎ・自習単発）。
  'coconala-bunseki-pdf': {
    id: 'coconala-bunseki-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317573',
    title: '1級土木二次 出題分析と直前重点を送ります',
    shortTitle: '二次 出題分析＋直前重点 PDF',
    description:
      '1級土木施工管理技士 第2次検定の出題分析＋直前2週間ロードマップ PDF（令和3〜7年度の実績分析・約6,000字/6ページ）。経験記述テーマの出題履歴・学科記述の出る順トップ論点・日割りの直前計画を収録。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 1本）',
    priceYen: 2500,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C2: 単発コンテンツ（完成答案集 PDF 5本）。競合実測: 解答例送付¥3,500×179件。
  //   完成答案集（品質/安全/工程/施工計画/環境）を funnel 除去して PDF 5本で納品。
  'coconala-kanseitoan-pdf': {
    id: 'coconala-kanseitoan-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317580',
    title: '1級土木の経験記述 完成答案集を送ります',
    shortTitle: '経験記述 完成答案集 PDF（5管理）',
    description:
      '1級土木施工管理技士 第2次検定 施工経験記述の完成答案集 PDF 5本（品質管理・安全管理・工程管理・施工計画・環境対策）。各テーマ 完成答案3例＋NG→合格答案＋採点者視点チェックポイント。自分の工事に置き換える雛形として使えます。購入後トークルームで PDF をお送りします。代筆は行いません。',
    price: '¥3,500（PDF 5本・5管理）',
    priceYen: 3500,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C3: 2級 完成答案集 PDF（3テーマ）。1級 C2 の 2級版。
  'coconala-2kyu-kanseitoan-pdf': {
    id: 'coconala-2kyu-kanseitoan-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317722',
    title: '2級土木の経験記述 完成答案集を送ります',
    shortTitle: '2級 経験記述 完成答案集 PDF',
    description:
      '2級土木施工管理技士 第2次検定 施工経験記述の完成答案集 PDF 3本（品質管理・安全管理・工程管理）。各テーマ 完成答案＋NG→合格答案＋採点者視点チェックポイント。自分の工事に置き換える雛形として使えます。購入後トークルームで PDF をお送りします。代筆は行いません。',
    price: '¥3,000（PDF 3本・3管理）',
    priceYen: 3000,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C4: 1級 過去問模範答案集 PDF（R03-R07・年度別）。C2 のテーマ別に対する年度別。
  'coconala-1kyu-kakomon-pdf': {
    id: 'coconala-1kyu-kakomon-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317726',
    title: '1級土木 経験記述の過去問模範答案を送ります',
    shortTitle: '1級 経験記述 過去問模範答案 PDF',
    description:
      '1級土木施工管理技士 第2次検定 施工経験記述の過去問模範答案集 PDF 5本（令和3〜7年度・年度別）。各年度の出題テーマに沿った想定工事の模範答案＋設問の書き分け＋置換ガイド。過去問を年度単位で研究したい方向け。購入後トークルームで PDF をお送りします。',
    price: '¥3,000（PDF 5本・R03-R07）',
    priceYen: 3000,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C5: 2級 過去問模範答案集 PDF（R03-R07・年度別）。
  'coconala-2kyu-kakomon-pdf': {
    id: 'coconala-2kyu-kakomon-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317729',
    title: '2級土木 経験記述の過去問模範答案を送ります',
    shortTitle: '2級 経験記述 過去問模範答案 PDF',
    description:
      '2級土木施工管理技士 第2次検定 施工経験記述の過去問模範答案集 PDF 5本（令和3〜7年度・年度別）。各年度の出題テーマに沿った想定工事の模範答案＋置換ガイド。過去問を年度単位で研究したい方向け。購入後トークルームで PDF をお送りします。代筆は行いません。',
    price: '¥3,000（PDF 5本・R03-R07）',
    priceYen: 3000,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C6: 1級 二次学科記述 テーマ別出る順 PDF（5論点）。経験記述以外＝学科記述の対策。
  'coconala-1kyu-gakka-pdf': {
    id: 'coconala-1kyu-gakka-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317734',
    title: '1級土木二次 学科記述の攻略PDFを送ります',
    shortTitle: '1級 二次学科記述 攻略 PDF',
    description:
      '1級土木施工管理技士 第2次検定 学科記述（問題2〜11）のテーマ別 出る順攻略 PDF 5本（コンクリート工・品質管理・土工・安全管理法規・施工計画環境）。令和3〜7年度の出題頻度分析＋頻出論点の書き方の型＋直前チェック語句。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 5本・5論点）',
    priceYen: 2500,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C7: 2級 二次学科記述 テーマ別出る順 PDF（5論点）。
  'coconala-2kyu-gakka-pdf': {
    id: 'coconala-2kyu-gakka-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317736',
    title: '2級土木二次 学科記述の攻略PDFを送ります',
    shortTitle: '2級 二次学科記述 攻略 PDF',
    description:
      '2級土木施工管理技士 第2次検定 学科記述のテーマ別 出る順攻略 PDF 5本（コンクリート工・品質管理・土工・安全管理法規・施工計画環境）。令和3〜7年度の出題頻度分析＋頻出論点の書き方の型＋直前チェック語句。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 5本・5論点）',
    priceYen: 2500,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },
} as const satisfies Record<string, CoconalaService>;

export type CoconalaServiceId = keyof typeof SERVICES_RAW;

export const COCONALA_SERVICES: Readonly<Record<CoconalaServiceId, CoconalaService>> = SERVICES_RAW;

/**
 * 出品中（listed）のサービスのみ。サイト導線はこれを使う＝draft/full/paused は自動的に非表示。
 * COCONALA_SERVICES（widen 済み）を経由する＝note-magazines.ts と同じ流儀。
 * SERVICES_RAW を直接 filter すると `as const` のリテラル型で status 比較が型エラーになる。
 */
export function listedCoconalaServices(): CoconalaService[] {
  return Object.values(COCONALA_SERVICES).filter((s) => s.status === 'listed');
}

export function getCoconalaService(id: CoconalaServiceId): CoconalaService {
  return COCONALA_SERVICES[id];
}
