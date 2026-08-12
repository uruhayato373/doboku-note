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
 * ★ paused には2つの意味があるので **pauseReason で必ず区別する**:
 *     'retired' = 商品整理で恒久廃止（復帰させない）   … 2026-08-05 統廃合の 5 件
 *     'absence' = 運営者の長期不在で一時休止（復帰する）… 2026-08-06〜08-16 の 12 件
 *   ココナラは購入から48時間以内に出品者が連絡しないと取引が自動キャンセルされ、
 *   PDF 商品も手作業送付なので不在中に例外を作れない（全件休止が既定）。
 *   復帰（8/17）: `npm run coconala-pause -- --resume --absence --commit`
 *     → pauseReason:'absence' のものだけを listed へ戻し、live も reopen して実測検証する。
 *     **--all-listed は使わない**（恒久廃止した 5 件まで復活してしまう）。
 *
 * 戦略・出品文面の真実源: docs/note/1級・2級土木/ココナラ展開キット.md
 * 運用・スキーマの真実源: .claude/knowledge/reference/coconala-operations.md
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
  /**
   * status:'paused' の**理由**。paused は2つの意味に多重化しうるので必ず区別する:
   *   'retired'  = 商品整理で恒久的に棚から下ろした（復帰させない）
   *   'absence'  = 運営者の長期不在による一時休止（復帰させる。resumeOn に復帰予定日）
   * check-coconala-wiring が「paused なのに pauseReason 無し」を落とす。
   * これが無いと一括復帰のときに恒久廃止した商品まで復活する（2026-08-05 に実際に危なかった）。
   */
  readonly pauseReason?: 'retired' | 'absence';
  /** pauseReason:'absence' のときの復帰予定日（ISO 日付・目安） */
  readonly resumeOn?: string;
  /**
   * アーカイブ（非表示）にした日。pauseReason:'retired' のみ。
   * アーカイブ = 検索/カテゴリ/プロフィール一覧から消え、詳細は「受付終了」。URL と評価は残る。
   * **解除導線は実機で見つからず実質片道**（2026-08-05 調査）。恒久廃止にのみ使う。
   */
  readonly archivedAt?: string;
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
 *   4. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表＋.claude/knowledge/reference/sales-tracking.md
 *   5. ドキュメント: .claude/knowledge/reference/coconala-operations.md のサービス表＋ココナラ展開キット.md §2
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
    // 2026-08-12: 「採点者目線」→「発注者目線」。運営者は発注者（審査する側）であって
    // 試験の採点者ではない（author-authority-banner.md の 2026-08-11 訂正と整合）。
    // ブログのサービスカードは本タイトルをそのまま描画するため、記事本文の
    // 「発注者＝審査する側」と真下で矛盾していた。
    title: '土木施工管理の経験記述を発注者目線で診断します',
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

  // S3+: 答案作成の上位版（4テーマ・2026-08-12 出品決定）。ちゃんさとは設問数に線形な2段構え
  //   （作成代行 2問¥16,000×124件／4問¥32,000×132件）で、当方は下段しか無かった。¥16,000＝
  //   2テーマ版のちょうど2倍・ちゃんさとの半額。売りは「倍の分量」ではなく**出題ガチャへの保険**
  //   （本試験は5管理から2テーマが当日指定される。4テーマ備えればどの2つが出ても手持ちで戦える）。
  //   元の起票条件は「評価が付いたら追加」だったが、売れなくても S3 ¥8,000 を安く見せる
  //   **価格アンカー**として機能するため前倒し（ユーザー決定）。作成4テーマは最重量なので週1枠。
  //   運用: ヒアリングシートを2回分（4テーマ）受領し `/keiken-tensaku --mode sakusei` を
  //   2テーマずつ2回実行（コード変更なし・展開キット §4b）。
  'coconala-sakusei-4theme': {
    id: 'coconala-sakusei-4theme',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4350199',
    title: '土木施工管理の経験記述を4テーマ分作成します',
    shortTitle: '経験記述 答案作成 4テーマ（出題保険つき備え）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、質問シート（ヒアリング）へのご回答をもとに4テーマ分の答案にまとめる上位版。本試験は5管理のうち2テーマが当日指定されるため、4テーマ備えることでどの組み合わせが出ても対応できる。あなたが実際に経験した工事のみ対象（経験していない工事の答案作成＝捏造はお受けしません）。事実・数値は全てご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥16,000（4テーマ・書き直し1回込み）',
    priceYen: 16000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 1,
    listedAt: '2026-08-12',
  },

  // C1: 出題分析 PDF。2026-08-05 統廃合で出品停止（paused）＝フルパック（C10）専用コンテンツ化。
  //   C8 予想模試が C1+C6 から生成された派生物のため単品同士の論点重複が大きく、初受注の購入者が
  //   買い分けできず質問（展開キット §2 決定ログ）。単品で残すと混乱が続くためパックに封入。
  'coconala-bunseki-pdf': {
    id: 'coconala-bunseki-pdf',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317573',
    title: '1級土木二次 出題分析と直前重点を送ります',
    shortTitle: '二次 出題分析＋直前重点 PDF',
    description:
      '1級土木施工管理技士 第2次検定の出題分析＋直前2週間ロードマップ PDF（令和3〜7年度の実績分析・約6,000字/6ページ）。経験記述テーマの出題履歴・学科記述の出る順トップ論点・日割りの直前計画を収録。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 1本）',
    priceYen: 2500,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    pauseReason: 'retired',
    archivedAt: '2026-08-05',
    listedAt: '2026-07-18',
  },

  // C2: 経験記述 模範答案セット（テーマ別5冊＋年度別5冊＝C2+C4 統合・2026-08-05 統廃合）。
  //   旧「完成答案集（¥3,500）」と旧C4「過去問模範答案（¥3,000）」はどちらも経験記述の見本答案で
  //   買い分け不能（初受注の混乱シグナル→展開キット §2 決定ログ）。1商品に統合し ¥5,000。
  //   ※ココナラの価格刻み＝¥10,000以下は500円刻み。¥4,980 等の端数は入力できない（publish が拒否）。
  //   納品 = coconala-C2-*.pdf 5冊 + coconala-C4-*.pdf 5冊 の計10冊。
  'coconala-kanseitoan-pdf': {
    id: 'coconala-kanseitoan-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317580',
    title: '1級土木 経験記述の模範答案セットを送ります',
    shortTitle: '1級 経験記述 模範答案セット PDF',
    description:
      '1級土木施工管理技士 第2次検定 施工経験記述の模範答案セット PDF 10冊。テーマ別の完成答案集5冊（品質管理・安全管理・工程管理・施工計画・環境対策＝完成答案3例＋NG→合格＋採点チェック）と、年度別の過去問模範答案5冊（令和3〜7年度＝各年度の出題テーマに沿った模範答案＋置換ガイド）を一括収録。テーマから引くか年度から引くか、両方の索引で自分の工事に置き換えられます。購入後トークルームで PDF をお送りします。',
    price: '¥5,000（PDF 10冊・テーマ別＋年度別）',
    priceYen: 5000,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C3: 2級 経験記述 模範答案セット（テーマ別3冊＋年度別5冊＝C3+C5 統合・2026-08-05 統廃合）。
  //   納品 = coconala-C3-*.pdf 3冊 + coconala-C5-*.pdf 5冊 の計8冊。
  'coconala-2kyu-kanseitoan-pdf': {
    id: 'coconala-2kyu-kanseitoan-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317722',
    title: '2級土木 経験記述の模範答案セットを送ります',
    shortTitle: '2級 経験記述 模範答案セット PDF',
    description:
      '2級土木施工管理技士 第2次検定 施工経験記述の模範答案セット PDF 8冊。テーマ別の完成答案集3冊（品質管理・安全管理・工程管理＝完成答案＋NG→合格＋採点チェック）と、年度別の過去問模範答案5冊（令和3〜7年度＝各年度の出題テーマに沿った模範答案＋置換ガイド）を一括収録。テーマから引くか年度から引くか、両方の索引で自分の工事に置き換えられます。購入後トークルームで PDF をお送りします。',
    price: '¥4,000（PDF 8冊・テーマ別＋年度別）',
    priceYen: 4000,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    listedAt: '2026-07-18',
  },

  // C4: 1級 過去問模範答案集。2026-08-05 統廃合で出品停止（paused）＝C2「模範答案セット」へ統合。
  'coconala-1kyu-kakomon-pdf': {
    id: 'coconala-1kyu-kakomon-pdf',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317726',
    title: '1級土木 経験記述の過去問模範答案を送ります',
    shortTitle: '1級 経験記述 過去問模範答案 PDF',
    description:
      '1級土木施工管理技士 第2次検定 施工経験記述の過去問模範答案集 PDF 5本（令和3〜7年度・年度別）。各年度の出題テーマに沿った想定工事の模範答案＋設問の書き分け＋置換ガイド。過去問を年度単位で研究したい方向け。購入後トークルームで PDF をお送りします。',
    price: '¥3,000（PDF 5本・R03-R07）',
    priceYen: 3000,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    pauseReason: 'retired',
    archivedAt: '2026-08-05',
    listedAt: '2026-07-18',
  },

  // C5: 2級 過去問模範答案集。2026-08-05 統廃合で出品停止（paused）＝C3「模範答案セット」へ統合。
  'coconala-2kyu-kakomon-pdf': {
    id: 'coconala-2kyu-kakomon-pdf',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317729',
    title: '2級土木 経験記述の過去問模範答案を送ります',
    shortTitle: '2級 経験記述 過去問模範答案 PDF',
    description:
      '2級土木施工管理技士 第2次検定 施工経験記述の過去問模範答案集 PDF 5本（令和3〜7年度・年度別）。各年度の出題テーマに沿った想定工事の模範答案＋置換ガイド。過去問を年度単位で研究したい方向け。購入後トークルームで PDF をお送りします。',
    price: '¥3,000（PDF 5本・R03-R07）',
    priceYen: 3000,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    pauseReason: 'retired',
    archivedAt: '2026-08-05',
    listedAt: '2026-07-18',
  },

  // C6: 1級 学科記述攻略。2026-08-05 統廃合で出品停止（paused）＝フルパック（C10）専用コンテンツ化。
  //   C8 模試 第2部（演習版）と同一論点の解説版＝単品併売は買い分け不能。
  'coconala-1kyu-gakka-pdf': {
    id: 'coconala-1kyu-gakka-pdf',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317734',
    title: '1級土木二次 学科記述の攻略PDFを送ります',
    shortTitle: '1級 二次学科記述 攻略 PDF',
    description:
      '1級土木施工管理技士 第2次検定 学科記述（問題2〜11）のテーマ別 出る順攻略 PDF 5本（コンクリート工・品質管理・土工・安全管理法規・施工計画環境）。令和3〜7年度の出題頻度分析＋頻出論点の書き方の型＋直前チェック語句。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 5本・5論点）',
    priceYen: 2500,
    examScope: ['civil-1'],
    weeklyCapacity: 10,
    pauseReason: 'retired',
    archivedAt: '2026-08-05',
    listedAt: '2026-07-18',
  },

  // C7: 2級 学科記述攻略。2026-08-05 統廃合で出品停止（paused）＝フルパック（C11）専用コンテンツ化。
  'coconala-2kyu-gakka-pdf': {
    id: 'coconala-2kyu-gakka-pdf',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317736',
    title: '2級土木二次 学科記述の攻略PDFを送ります',
    shortTitle: '2級 二次学科記述 攻略 PDF',
    description:
      '2級土木施工管理技士 第2次検定 学科記述のテーマ別 出る順攻略 PDF 5本（コンクリート工・品質管理・土工・安全管理法規・施工計画環境）。令和3〜7年度の出題頻度分析＋頻出論点の書き方の型＋直前チェック語句。購入後トークルームで PDF をお送りします。',
    price: '¥2,500（PDF 5本・5論点）',
    priceYen: 2500,
    examScope: ['civil-2'],
    weeklyCapacity: 10,
    pauseReason: 'retired',
    archivedAt: '2026-08-05',
    listedAt: '2026-07-18',
  },

  // C8: 1級 二次 予想模擬試験（問題冊子＋解答解説）。唯一の未対抗セグメント「模擬試験」への参入。
  //   源=C6 学科記述論点＋C1 出題分析から build-once 生成（新規事実ゼロ・出題保証しない）。
  //   Red Line #10 例外運用（模試=静的1回分／会員フロー=毎月更新の予想ドリップで差別化）。
  //   2026-08-05: 不在休止（8/6-8/16）の**例外としてこの1件だけ受付再開**（運営者判断）。
  //   理由=本サービスの購入者へ送った見積り提案（16冊セット ¥7,500・購入期限 8/12）が
  //   コンビニ払いで購入待ちの状態にあり、購入期限が不在期間と丸ごと重なる。決済・取引導線に
  //   元サービスの受付状態が影響する可能性を排除できないため、不在中の新規購入リスクを承知で開ける。
  //   ※ この節のコメントは id/status/serviceUrl の連続性を壊さないようブロック外に置くこと
  //     （カタログ parser は 3 フィールドが隣接している前提の正規表現）。
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
  // C10: 1級 二次 教材フルパック（C1+C2+C4+C6+C8 全部入り・PDF 18冊）。2026-08-05 新設。
  //   根拠: ①初受注の購入者が C8 購入直後に C1 との違いを DM で質問＝C系単品は外から区別が
  //   つかない（買い分け不能）②建築の総合模試 ¥18,000×1,730件・土木「模試/分析」実売中央値
  //   ¥10,000＝まとめ高単価はココナラで実証済み ③レビュー主導市場で 9 単品にレビューが分散する
  //   より旗艦1本に集約。価格 ¥10,000＝土木「模試/分析」セグメントの実売中央値と一致。
  //   note 旗艦「完全攻略パック」（¥9,800・経験記述の深さ＝組合せ大全/想定工事索引）とは軸が直交
  //   （こちらは二次全体の広さ）で、**同等以上に置いて undercut しない**。当初 ¥9,800 案は
  //   ココナラの価格刻み（¥10,000以下=500円刻み）で入力できないため ¥10,000 を採る。
  //   納品は既存 C系 PDF をそのまま送付（新規ビルドなし・労働ゼロ）。
  //   2026-08-05: 不在休止（8/6-8/16）の**例外として受付再開**（C8 と合わせて2件のみ）。
  //   理由=本サービスを元に送った見積り提案（模試2冊を除く16冊セット ¥7,500・購入期限 8/12）が
  //   コンビニ払いで購入待ち。元サービスが受付休止だと決済・取引導線に影響する可能性を排除できず、
  //   購入期限が不在期間と丸ごと重なるため。不在中の新規購入リスクは運営者が承知のうえで受容。
  'coconala-1kyu-full-pdf': {
    id: 'coconala-1kyu-full-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4341188',
    title: '1級土木二次 教材フルパックを送ります',
    shortTitle: '1級 二次 教材フルパック PDF',
    description:
      '1級土木施工管理技士 第2次検定の対策PDFを全部入りでまとめたフルパック（計18冊）。出題分析＋直前重点（1冊）・経験記述 模範答案（テーマ別5冊＋年度別5冊）・学科記述 攻略（5冊・5論点）・予想模擬試験（問題冊子＋解答解説の2冊）を一括でお送りします。出題分析と学科記述攻略はこのパックのみの収録。分析→インプット→演習→模試まで一気通貫。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥10,000（PDF 18冊・全部入り）',
    priceYen: 10000,
    examScope: ['civil-1'],
    weeklyCapacity: 20,
    listedAt: '2026-08-05',
  },

  // C11: 2級 二次 教材フルパック（C3+C5+C7+C9 全部入り・PDF 15冊）。C10 の2級版。
  //   価格 ¥7,000（1級 ¥10,000 の 0.7＝級差を保つ・500円刻み適合）。
  'coconala-2kyu-full-pdf': {
    id: 'coconala-2kyu-full-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4341191',
    title: '2級土木二次 教材フルパックを送ります',
    shortTitle: '2級 二次 教材フルパック PDF',
    description:
      '2級土木施工管理技士 第2次検定の対策PDFを全部入りでまとめたフルパック（計15冊）。経験記述 模範答案（テーマ別3冊＋年度別5冊）・学科記述 攻略（5冊・5論点）・予想模擬試験（問題冊子＋解答解説の2冊）を一括でお送りします。学科記述攻略はこのパックのみの収録。インプット→演習→模試まで一気通貫。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥7,000（PDF 15冊・全部入り）',
    priceYen: 7000,
    examScope: ['civil-2'],
    weeklyCapacity: 20,
    listedAt: '2026-08-05',
  },

  // C12: 1級 二次 プレミアム（教材フルパック18冊 ＋ 経験記述 添削2テーマ）。2026-08-05 新設。
  //   なぜ作るか: 純教材の価格天井は実測で ¥10,000（一級建築士製図ノート ¥10,000×31件が最上位。
  //   PDF556頁の学科資料でも ¥6,500）。物量では上へ行けない（本パックは115ページ）。**労働を足して
  //   初めて別の帯に入る**。競合ちゃんさとは 添削2問¥12,000／作成代行2問¥16,000 で**教材が付かない**
  //   純労働なので、同帯で「添削＋115ページの教材」は労働では追随できない差別化になる。
  //   加えて、ココナラで重みを持つのは**添削体験のレビュー**（ちゃんさとの297件は全て添削）で、
  //   教材のみのパックではその種類のレビューが永久に貯まらない。
  //   価格: 単品合計 ¥10,000＋¥6,000＝¥16,000 → セット ¥15,000（¥10,000 超は 1,000 円刻み）。
  //   リスク管理: **添削は本番顧客への納品が未経験**（S2 はレビュー0）。初回の工数実測が出るまで
  //   weeklyCapacity=1 に絞る（Red Line #1 の定員制）。tensakuMinutes を記録して 2〜3 件で枠を再判断。
  //   教材のみの C10（¥10,000・無制限）は残す＝「自分でやる / 見てもらう」の1軸だけが増える構成。
  'coconala-1kyu-premium': {
    id: 'coconala-1kyu-premium',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4341335',
    title: '1級土木二次 教材一式と経験記述添削をします',
    shortTitle: '1級 二次 プレミアム（教材＋添削）',
    description:
      '1級土木施工管理技士 第2次検定の対策PDF 18冊（出題分析・経験記述模範答案10冊・学科記述攻略5冊・予想模擬試験2冊／計115ページ）に、施工経験記述の添削（新形式2テーマ・赤入れ＋書き直し1回）を組み合わせたセット。教材で書き方を掴み、実際に書いた答案を元自治体土木（発注者＝採点する側）の目で赤入れします。購入後トークルームでPDFをお送りし、答案はヒアリングシートご記入後に添削します。経験していない工事の答案作成（捏造）はお受けしません。合格を保証するものではありません。',
    price: '¥15,000（PDF18冊＋添削2テーマ・書き直し1回）',
    priceYen: 15000,
    examScope: ['civil-1'],
    weeklyCapacity: 1,
    listedAt: '2026-08-05',
  },

  // 制作物（DLキット）テスト出品。Claude Code + Node.js を要する自作ツール版＝客層が限定される
  // ため status:'draft'（防御的非表示）で配線のみ用意。公開前ゲート: (1) 納品ZIPは外部URL(note/
  // サイト)を除去した coconala 版に差し替える（安全弁#2 外部誘導）、(2) /coconala-publish --commit。
  'coconala-civil-keiken-kit': {
    id: 'coconala-civil-keiken-kit',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4322659',
    title: '施工経験記述を自作するAI設計キットを渡します',
    shortTitle: '経験記述 AI設計キット（DL）',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述を、あなた自身の工事経験からAI（Claude Code）で設計・検証するキット。Claude Code用スキル＋作成/レビューを分けるエージェント＋入力・答案テンプレート＋字数・必須項目・プレースホルダ検査スクリプト＋架空サンプル＋手順PDFを同梱。完成答案の代筆ではなく、設問分解・不足情報の停止・独立レビュー・字数検査を自分で回す作業環境です。パソコンでのファイル操作とClaude Codeの利用が前提。購入後トークルームでキット一式をお送りします。合格を保証するものではありません。',
    price: '¥8,000（DLキット一式）',
    priceYen: 8000,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 20,
    listedAt: '2026-07-22',
  },
  // 総監 出題テーマ分析 PDF（テスト出品）。有料note「設問3国家施策バンク」本文は転載せず、
  // 出題傾向の読み方＋R8地方創生の正直な検証に限定（非カニバリ）。PDF は外部URL0件で生成済
  // （.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf）。status:'draft'。
  // 公開前ゲート: /coconala-publish --commit。総監はココナラ客層が薄い前提の test。
  'coconala-sokan-bunseki-pdf': {
    id: 'coconala-sokan-bunseki-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4322661',
    title: '技術士総監 記述式の出題テーマ分析を送ります',
    shortTitle: '総監 出題テーマ分析 PDF',
    description:
      '技術士総合技術監理部門（総監）記述式（必須科目I-2）の出題傾向分析 PDF。令和6〜8年度の実績（カーボン／少子高齢化／地方創生）から「社会課題×5管理のトレードオフ」系統の読み方、設問3の解答様式（課題×施策2組・各約600字・5管理2つ以上の明記）、出そうなテーマの見極め方、R8地方創生の正直な検証（本命は外し・候補群で当てた）を収録。購入後トークルームで PDF をお送りします。出題を保証するものではありません。',
    price: '¥2,500（PDF）',
    priceYen: 2500,
    examScope: ['pe-comprehensive-management'],
    weeklyCapacity: 20,
    listedAt: '2026-07-22',
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
