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
 * 新サービス追加時の配線チェックリスト（capability ドリフト防止・2026-07-16 / 07-18 拡充）:
 *   本エントリ追加だけでは依存する実行系に配線されない。新サービスを足したら:
 *   1. 投入本文: .claude/config/coconala-listings.json に category/genreFacets/provisionFormat/
 *      catchphrase(15-30字)/body(≤1000)/purchaseNote(≤500) を追加
 *   2. 商品画像: scripts/coconala-thumb.mjs の THUMB_COPY に追加 → npm run coconala-thumb で
 *      thumb-<id から coconala- を除いた key>.png を生成
 *   3. コンテンツPDF商品(C系)なら: scripts/build-coconala-content-pdf.mjs の PRODUCTS に源記事を追加
 *      → npm run coconala-content-pdf（funnel 除去＋note URL 0件検証）
 *   4. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表＋docs/reference/sales-tracking.md
 *   5. ドキュメント: docs/reference/coconala-operations.md のサービス表＋ココナラ展開キット.md §2
 *   6. check-coconala-wiring.mjs が pre-commit で catalog↔listings↔商品画像↔state↔sales の
 *      整合/カバレッジを機械検知する（listings/画像の漏れ・serviceUrl 空・priceYen 不一致で落ちる）
 *   7. 変更後は /doc-sync を1回回して prose 陳腐化を点検（CLAUDE.md §8）
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
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）を令和6年度からの新形式（2テーマ必答）に対応して添削。2テーマ分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋採点者視点のコメント＋書き直し1回を含む。ゼロからの答案作成は「答案作成」サービスで承ります（経験していない工事の答案作成＝捏造はお受けしません）。',
    price: '¥6,000（2テーマセット・書き直し1回込み）',
    priceYen: 6000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 3,
    listedAt: '2026-07-18',
  },

  // S3: 答案作成（ヒアリング→文章化）。競合実測（2026-07-18）: daiko 実売中央値¥10,000・トップ4社が質問起点
  //   （ちゃんさと¥32,000×132／梅村¥12,000×129／フリーランスK¥10,000×58）。Red Line #2 再定義（捏造禁止）で出品可。
  //   ¥8,000（控えめ・実売帯下端で初速重視）→評価20件で¥12,000〜16,000。作成は添削より重いので週2枠。
  'coconala-sakusei': {
    id: 'coconala-sakusei',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317796',
    title: '土木施工管理の経験記述をヒアリングで作成します',
    shortTitle: '経験記述 答案作成（ヒアリング→文章化）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、質問シート（ヒアリング）へのご回答をもとに新形式2テーマの答案の形にまとめます。「経験はあるのに文章にできない」方向け。あなたが実際に経験した工事のみ対象（経験していない工事の答案作成＝捏造はお受けしません）。事実・数値は全てご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥8,000（2テーマ・書き直し1回込み）',
    priceYen: 8000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 2,
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
      '1級土木施工管理技士 第2次検定 施工経験記述の完成答案集 PDF 5本（品質管理・安全管理・工程管理・施工計画・環境対策）。各テーマ 完成答案3例＋NG→合格答案＋採点者視点チェックポイント。自分の工事に置き換える雛形として使えます。購入後トークルームで PDF をお送りします。',
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
      '2級土木施工管理技士 第2次検定 施工経験記述の完成答案集 PDF 3本（品質管理・安全管理・工程管理）。各テーマ 完成答案＋NG→合格答案＋採点者視点チェックポイント。自分の工事に置き換える雛形として使えます。購入後トークルームで PDF をお送りします。',
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
      '2級土木施工管理技士 第2次検定 施工経験記述の過去問模範答案集 PDF 5本（令和3〜7年度・年度別）。各年度の出題テーマに沿った想定工事の模範答案＋置換ガイド。過去問を年度単位で研究したい方向け。購入後トークルームで PDF をお送りします。',
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

  // C8: 1級 二次 予想模擬試験（問題冊子＋解答解説）。唯一の未対抗セグメント「模擬試験」への参入。
  //   源=C6 学科記述論点＋C1 出題分析から build-once 生成（新規事実ゼロ・出題保証しない）。
  //   Red Line #10 例外運用（模試=静的1回分／会員フロー=毎月更新の予想ドリップで差別化）。
  'coconala-1kyu-moshi-pdf': {
    id: 'coconala-1kyu-moshi-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317886',
    title: '1級土木二次の予想模擬試験を送ります',
    shortTitle: '1級 二次 予想模擬試験 PDF',
    description:
      '1級土木施工管理技士 第2次検定の予想模擬試験 PDF（問題冊子＋解答解説冊子）。本番形式1回分＝施工経験記述2テーマ（新形式）＋学科記述の予想問題。令和3〜7年度の出題傾向から論点を予想した自主教材で、自己採点ガイドつき。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥2,500（問題＋解答解説 PDF）',
    priceYen: 2500,
    examScope: ['civil-1'],
    weeklyCapacity: 20,
    listedAt: '2026-07-18',
  },

  // C9: 2級 二次 予想模擬試験（問題冊子＋解答解説）。C8 の2級版。
  'coconala-2kyu-moshi-pdf': {
    id: 'coconala-2kyu-moshi-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317889',
    title: '2級土木二次の予想模擬試験を送ります',
    shortTitle: '2級 二次 予想模擬試験 PDF',
    description:
      '2級土木施工管理技士 第2次検定の予想模擬試験 PDF（問題冊子＋解答解説冊子）。本番形式1回分＝施工経験記述2テーマ（新形式）＋学科記述の予想問題。令和3〜7年度の出題傾向から論点を予想した自主教材で、自己採点ガイドつき。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥2,000（問題＋解答解説 PDF）',
    priceYen: 2000,
    examScope: ['civil-2'],
    weeklyCapacity: 20,
    listedAt: '2026-07-18',
  },
  // 制作物（DLキット）テスト出品。Claude Code + Node.js を要する自作ツール版＝客層が限定される
  // ため status:'draft'（防御的非表示）で配線のみ用意。公開前ゲート: (1) 納品ZIPは外部URL(note/
  // サイト)を除去した coconala 版に差し替える（安全弁#2 外部誘導）、(2) /coconala-publish --commit。
  'coconala-civil-keiken-kit': {
    id: 'coconala-civil-keiken-kit',
    status: 'draft',
    serviceUrl: '',
    title: '施工経験記述を自作するAI設計キットを渡します',
    shortTitle: '経験記述 AI設計キット（DL）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述を、あなた自身の工事経験からAI（Claude Code）で設計・検証するためのキット（テンプレート＋検査スクリプト＋手順）。完成答案の代筆ではなく、設問分解・不足情報の停止・字数検査・独立レビューを自分で回すための作業環境です。パソコンでのファイル操作とClaude Codeの利用が前提。購入後トークルームでキット一式をお送りします。合格を保証するものではありません。',
    price: '¥3,000（DLキット一式）',
    priceYen: 3000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 20,
  },
  // 総監 出題テーマ分析 PDF（テスト出品）。有料note「設問3国家施策バンク」本文は転載せず、
  // 出題傾向の読み方＋R8地方創生の正直な検証に限定（非カニバリ）。PDF は外部URL0件で生成済
  // （.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf）。status:'draft'。
  // 公開前ゲート: /coconala-publish --commit。総監はココナラ客層が薄い前提の test。
  'coconala-sokan-bunseki-pdf': {
    id: 'coconala-sokan-bunseki-pdf',
    status: 'draft',
    serviceUrl: '',
    title: '技術士総監 記述式の出題テーマ分析を送ります',
    shortTitle: '総監 出題テーマ分析 PDF',
    description:
      '技術士総合技術監理部門（総監）記述式（必須科目I-2）の出題傾向分析 PDF。令和6〜8年度の実績（カーボン／少子高齢化／地方創生）から「社会課題×5管理のトレードオフ」系統の読み方、設問3の解答様式（課題×施策2組・各約600字・5管理2つ以上の明記）、出そうなテーマの見極め方、R8地方創生の正直な検証（本命は外し・候補群で当てた）を収録。購入後トークルームで PDF をお送りします。出題を保証するものではありません。',
    price: '¥2,500（PDF）',
    priceYen: 2500,
    examScope: ['pe-comprehensive-management'],
    weeklyCapacity: 20,
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
