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
 * 戦略・出品文面の真実源: content/note/1級・2級土木/ココナラ展開キット.md
 * 運用・スキーマの真実源: .claude/knowledge/reference/coconala-operations.md
 */

export type CoconalaStatus = 'draft' | 'listed' | 'paused' | 'full';

/** サービスが対象とする試験。site の資格 vertical に対応（categories.json の exam key と同義） */
export type CoconalaExamScope =
  | 'civil-1'
  | 'civil-2'
  | 'pe-construction'
  | 'pe-comprehensive-management'
  | 'rccm'
  | 'concrete-chief-engineer';

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
  /**
   * 価格改定の履歴。旧定価と、その価格が有効だった最終日（ISO 日付）。
   * orders-log の過去受注は「受注日時点の定価」と突合する（check-coconala-wiring）。無ければ現行 priceYen と突合。
   */
  readonly priceHistory?: readonly { readonly priceYen: number; readonly until: string }[];
  /**
   * PDF 商品の価格ルール（note より安く売らない）の基準。note で同じ中身を買う方法を note-magazines.ts の id で書く。
   * 'a + b' は合計、'a | b' は安い方、先頭 'each:' は購入者ごとにどれか1つを送る商品で高い方を基準にする。
   * check-coconala-wiring が「基準 × 1.1 をココナラの価格刻みで切り上げた額」以上であることを検査する。
   */
  readonly notePriceBasis?: string;
  /** note に同じ中身の商品が無い PDF の理由（notePriceBasis の代わり） */
  readonly notePriceExempt?: string;
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
 *   1b. PDF 商品（id が -pdf）なら notePriceBasis（note で同じ中身を買う方法）か notePriceExempt（対象外の理由）を書く。
 *       価格は note 基準 × 1.1 を価格刻みで切り上げた額以上（check-coconala-wiring 検査10・coconala-operations.md §2.6）
 *   2. 商品画像: scripts/coconala-thumb.mjs の THUMB_COPY に追加 → npm run coconala-thumb で
 *      thumb-<id から coconala- を除いた key>.png を生成
 *   3. コンテンツPDF商品(C系)なら: scripts/build-coconala-content-pdf.mjs の PRODUCTS に源記事を追加
 *      → npm run coconala-content-pdf（funnel 除去＋note URL 0件検証）
 *   4. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表＋.claude/knowledge/reference/sales-tracking.md
 *   5. ドキュメント: .claude/knowledge/reference/coconala-operations.md のサービス表＋ココナラ展開キット.md §2
 *   6. check-coconala-wiring.mjs が pre-commit で catalog↔listings↔商品画像↔state↔sales の
 *      整合/カバレッジを機械検知する（listings/画像の漏れ・serviceUrl 空・受注額と定価の不一致・PDF 価格ルール違反で落ちる）。
 *      出品・編集後は npm run check-coconala-live で公開ページ（価格・本文）との一致も確かめる
 *   7. 変更後は /doc-sync を1回回して prose 陳腐化を点検（CLAUDE.md §8）
 */
const SERVICES_RAW = {
  // 経験記述 S 系（診断/添削/作成）共通の受付運用（2026-09-25 ユーザー決定）:
  //   受付は8商品（S2/S2上位/S3/S3上位×1級2級）を合わせて1日2名まで。この上限は個々の
  //   weeklyCapacity（本フィールドは商品単位の定員宣言＝Red Line #1 の機械的表明）では
  //   表現できない横断制約のため、運営者が orders-log を見ながら手動で運用する
  //   （各商品の weeklyCapacity は目安として合計が週14件程度に収まるよう抑えてある）。
  //   1級は二次検定 10/4 の直前のため、1級対象サービスは「10/2 受付分まで」（購入前メッセージ・
  //   トークルームで案内。カタログには書かない＝期日は運用側の判断で動くため）。
  //   決定ログの全文: content/note/1級・2級土木/ココナラ展開キット.md §2。
  // S1: レビュー獲得フロント。1テーマ分の診断のみ（書き換え文は提供しない＝S2 との線引き）。
  //   実測（2026-07-16）: 診断セグメントの競合は1件（道路プロ ¥1,000×1件）のみ＝ほぼ空白。
  //   価格競争が存在しないため ¥1,500 据え置き。
  // 2026-09-25 アーカイブ（ユーザー決定）: ココナラの通常サービス出品上限（20件）に達し、級別の新商品を出す枠を空けるため。
  //   受注0件・30日閲覧17回、市場でも土木の診断は販売実績1件（market-research 9/23）で需要が薄い。
  'coconala-shindan': {
    id: 'coconala-shindan',
    status: 'paused',
    serviceUrl: 'https://coconala.com/services/4317349',
    // 2026-08-12: 「採点者目線」→「発注者目線」。運営者は発注者（審査する側）であって
    // 試験の採点者ではない（author-authority-banner.md の 2026-08-11 訂正と整合）。
    // ブログのサービスカードは本タイトルをそのまま描画するため、記事本文の
    // 「発注者＝審査する側」と真下で矛盾していた。
    title: '土木経験記述を技術士の元発注者が診断します',
    shortTitle: '経験記述 合格診断',
    description:
      '1級・2級土木施工管理技士 第2次検定の施工経験記述（問題1）の下書き1テーマ分を、元自治体土木（発注者側）の目で診断。合格可能性の A/B/C 判定＋減点ポイント ワースト3＋字数チェックを返却する。診断のみで書き換え文は提供しない（書き換え案は添削サービスの担当）。',
    price: '¥1,500（1テーマ診断）',
    priceYen: 1500,
    examScope: ['civil-1', 'civil-2'],
    weeklyCapacity: 5,
    pauseReason: 'retired',
    listedAt: '2026-07-18',
  },

  // S2: 主力。実測（2026-07-16・coconala-research）: 添削の中央値 ¥6,500、実売の第2集団は
  //   ¥5,000〜7,000 に密集（あつぼ¥5,000×31件 / 梅村¥7,000×28件 / Jaques¥6,500×25件）。
  //   首位のちゃんさと技師は ¥12,000×297件・¥24,000×133件でレビュー寡占。
  //   → レビュー0の新規参入で ¥8,000（第2集団の上端）は割高と判断し ¥6,000 で開始、
  //     評価20件で ¥9,800（ちゃんさとの下・第2集団の上）へ引き上げる。
  // 価格改定時は priceYen と price の両方＋ココナラ展開キット.md §2 の価格表を同時更新する。
  // 2026-09-25 ユーザー決定（級別化）: 1級と2級で出題実績が違う（1級はR6=安全管理×施工計画・
  //   R7=品質管理×環境対策で読めない→5管理全部が完成形、2級はR6=品質×工程・R7=安全×工程で
  //   設問2が2年連続工程管理→3管理で全出題をカバー）ため、本サービスは1級専用に改題。
  //   2級版は新設の coconala-2kyu-tensaku（¥5,000）。速さを売りに24時間以内で返却（既存4日から短縮）。
  //   価格・週次枠は据え置き。id・serviceUrl は不変（過去受注 orders-log との突合キーのため）。
  'coconala-tensaku-set': {
    id: 'coconala-tensaku-set',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317375',
    title: '1級土木経験記述を24時間で添削します',
    shortTitle: '1級 経験記述 添削（2テーマ・24時間）',
    description:
      '1級土木施工管理技士 第2次検定の施工経験記述（問題1）を、受け取りから24時間以内に添削してお返しします。令和6年度からの新形式は5管理（品質管理・安全管理・工程管理・施工計画・環境対策）のうち2テーマが当日指定され、テーマはご自身で選べません。2テーマ分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋読み手視点のコメント＋書き直し1回を含みます。ゼロからの答案作成は「経験記述を作成します」サービスで承ります（経験していない工事の答案作成＝捏造はお受けしません）。',
    price: '¥6,000（1級・2テーマセット・24時間以内・書き直し1回込み）',
    priceYen: 6000,
    examScope: ['civil-1'],
    weeklyCapacity: 2,
    listedAt: '2026-07-18',
  },
  // S2上位: 5管理（品質・安全・工程・施工計画・環境対策）分の添削。2026-09-24 ユーザー決定で新設（4テーマ→
  //   2026-09-25 に「4テーマ」を廃止し1級の5管理フルセットへ作り替え・id/serviceUrl は不変）。
  //   ちゃんさとは質問4つ分（4テーマ相当）の添削 ¥24,000 を155件売っている（docs/marketing/07b）。
  //   自社は2テーマ ¥6,000 の2.5倍＝¥15,000（作成の5管理版 ¥20,000 と対の刻み）・週1名・受け取りから48時間。
  'coconala-tensaku-4theme': {
    id: 'coconala-tensaku-4theme',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4418735',
    title: '1級土木経験記述5管理を添削します',
    shortTitle: '1級 経験記述 添削（5管理フル）',
    description:
      '1級土木施工管理技士 第2次検定の施工経験記述（問題1）を、5管理（品質管理・安全管理・工程管理・施工計画・環境対策）すべて添削。当日どの2テーマが指定されても自分の工事で書けるよう、5管理分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋読み手視点のコメント＋書き直し1回（まとめて）を、受け取りから48時間以内にお返しします。経験していない工事の答案作成（捏造）はお受けしません。',
    price: '¥15,000（1級・5管理フルセット・書き直し1回込み）',
    priceYen: 15000,
    examScope: ['civil-1'],
    weeklyCapacity: 1,
    listedAt: '2026-09-25',
  },

  // S3: 答案作成（ヒアリング→文章化）。競合実測（2026-07-18）: daiko 実売中央値¥10,000・トップ4社が質問起点
  //   （ちゃんさと¥32,000×132／梅村¥12,000×129／フリーランスK¥10,000×58）。Red Line #2 再定義（捏造禁止）で出品可。
  //   ¥8,000（控えめ・実売帯下端で初速重視）→評価20件で¥12,000〜16,000。作成は添削より重いので週2枠。
  // 2026-09-25 ユーザー決定（級別化）: 1級専用に改題（理由は S2 の同日コメント参照）。2級版は新設の
  //   coconala-2kyu-sakusei（¥7,000）。「構成」の呼び方は誤解回避のため題名で「作成」と明示するが、
  //   2026-08-12 の運営取り下げ（学校の課題代行と判断）を避けるため本文の対象限定・捏造禁止の記述は残す。
  //   速さを売りに受け取りから48時間以内で返却（既存4日から短縮）。価格・週次枠は据え置き。
  'coconala-sakusei': {
    id: 'coconala-sakusei',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317796',
    title: '1級土木経験記述を作成します',
    shortTitle: '1級 経験記述 作成（2テーマ）',
    description:
      '1級土木施工管理技士 第2次検定の施工経験記述（問題1）を、ヒアリングへのご回答をもとに新形式2テーマ分の記述ドラフトに構成し、受け取りから48時間以内にお返しします。学校の課題やレポート等の代行ではなく、国家資格の第2次検定で問われる本人の実務経験が対象です（経験していない工事の記述＝捏造はお受けしません）。事実・数値はすべてご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥8,000（1級・2テーマ・書き直し1回込み）',
    priceYen: 8000,
    examScope: ['civil-1'],
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
  // 【2026-08-12 運営が取り下げ】ココナラ運営スタッフのメッセージ（サイト内 DM 10075959・08-12 16:12）:
  //   取り下げ理由「学校の課題（宿題、レポート、論文、作文等）を代行すると判断されるサービス」。
  //   ココナラ側は「下書き中」へ戻され、公開ページ /services/4350199 は 404。再出品は内容修正が前提。
  //   ※ 2テーマ版（coconala-sakusei・¥8,000）へは 2026-08-18 に**先回りで同基準を適用済み**（方針判断は決着）:
  //     再出品で通った 4テーマ版の言い回し「学校の課題の代行ではなく、国家資格の第2次検定で問われる
  //     本人の実務経験が対象」を description へ追加し、「答案の形にまとめます」→「記述ドラフトに構成します」、
  //     shortTitle の「答案作成」→「記述ドラフト構成」へ。**ライブ側の反映は別途必要**（/coconala-publish）。
  //   検出経路: npm run coconala-analytics が「listed なのに分析ページ 404」で surface（08-17）。
  //   check-coconala-wiring は serviceUrl の"形式"しか見ておらず実在を検査していなかった。
  //   2026-09-25 ユーザー決定（級別化＋4テーマ廃止）: 1級は5管理（品質・安全・工程・施工計画・環境対策）が
  //   全出題を読めない以上の完成形のため「4テーマ」を「5管理フル」へ作り替え、1級専用に改題。
  //   2級版は新設の coconala-2kyu-sakusei-3theme（¥10,500）。¥16,000→¥20,000（5/4倍・¥15,000超の
  //   1,000円刻み）。受け取りから72時間以内に短縮（既存7日から）。id・serviceUrl は不変。
  'coconala-sakusei-4theme': {
    id: 'coconala-sakusei-4theme',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4350199',
    title: '1級土木経験記述5管理を作成します',
    shortTitle: '1級 経験記述 作成（5管理フル）',
    description:
      '1級土木施工管理技士 第2次検定の施工経験記述（問題1）を、ヒアリングへのご回答をもとに5管理（品質管理・安全管理・工程管理・施工計画・環境対策）すべての記述ドラフトに構成する上位版。当日どの2テーマが指定されても対応できるよう備え、受け取りから72時間以内にお返しします。学校の課題の代行ではなく、国家資格の第2次検定で問われる本人の実務経験が対象です（経験していない工事の記述＝捏造はお受けしません）。事実・数値はすべてご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥20,000（1級・5管理フルセット・書き直し1回込み）',
    priceYen: 20000,
    priceHistory: [{ priceYen: 16000, until: '2026-09-25' }],
    examScope: ['civil-1'],
    weeklyCapacity: 1,
    listedAt: '2026-08-17',
  },

  // ---- 2級（2026-09-25 新設・級別化）----
  // 2級は出題実績が「品質・安全・工程」の3管理に収まる（R3=安全/品質選択・R4=品質/工程選択・
  // R5=安全/工程選択・R6=品質+工程・R7=安全+工程＝設問2は2年連続工程管理）。5管理は不要なので
  // 3管理フルで全出題をカバーする設計（1級の5管理とは価格・スコープが非対称）。
  'coconala-2kyu-tensaku': {
    id: 'coconala-2kyu-tensaku',
    status: 'draft',
    serviceUrl: '',
    title: '2級土木経験記述を24時間で添削します',
    shortTitle: '2級 経験記述 添削（2テーマ・24時間）',
    description:
      '2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、受け取りから24時間以内に添削してお返しします。令和6年度からの新形式は3管理（品質管理・安全管理・工程管理）のうち2テーマが当日指定され、テーマはご自身で選べません（近年は工程管理が連続で出題）。2テーマ分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋読み手視点のコメント＋書き直し1回を含みます。ゼロからの答案作成は「経験記述を作成します」サービスで承ります（経験していない工事の答案作成＝捏造はお受けしません）。',
    price: '¥5,000（2級・2テーマセット・24時間以内・書き直し1回込み）',
    priceYen: 5000,
    examScope: ['civil-2'],
    weeklyCapacity: 2,
  },
  'coconala-2kyu-tensaku-3theme': {
    id: 'coconala-2kyu-tensaku-3theme',
    status: 'draft',
    serviceUrl: '',
    title: '2級土木経験記述3管理を添削します',
    shortTitle: '2級 経験記述 添削（3管理フル）',
    description:
      '2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、3管理（品質管理・安全管理・工程管理）すべて添削。当日どの2テーマが指定されても自分の工事で書けるよう、3管理分の赤入れ（NG→OK 書き換え案）＋6観点のチェックリスト判定表＋読み手視点のコメント＋書き直し1回（まとめて）を、受け取りから48時間以内にお返しします。経験していない工事の答案作成（捏造）はお受けしません。',
    price: '¥7,500（2級・3管理フルセット・書き直し1回込み）',
    priceYen: 7500,
    examScope: ['civil-2'],
    weeklyCapacity: 1,
  },
  'coconala-2kyu-sakusei': {
    id: 'coconala-2kyu-sakusei',
    status: 'draft',
    serviceUrl: '',
    title: '2級土木経験記述を作成します',
    shortTitle: '2級 経験記述 作成（2テーマ）',
    description:
      '2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、ヒアリングへのご回答をもとに2テーマ分の記述ドラフトに構成し、受け取りから48時間以内にお返しします。学校の課題やレポート等の代行ではなく、国家資格の第2次検定で問われる本人の実務経験が対象です（経験していない工事の記述＝捏造はお受けしません）。事実・数値はすべてご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥7,000（2級・2テーマ・書き直し1回込み）',
    priceYen: 7000,
    examScope: ['civil-2'],
    weeklyCapacity: 2,
  },
  'coconala-2kyu-sakusei-3theme': {
    id: 'coconala-2kyu-sakusei-3theme',
    status: 'draft',
    serviceUrl: '',
    title: '2級土木経験記述3管理を作成します',
    shortTitle: '2級 経験記述 作成（3管理フル）',
    description:
      '2級土木施工管理技士 第2次検定の施工経験記述（問題1）を、ヒアリングへのご回答をもとに3管理（品質管理・安全管理・工程管理）すべての記述ドラフトに構成する上位版。当日どの2テーマが指定されても対応できるよう備え、受け取りから72時間以内にお返しします。学校の課題の代行ではなく、国家資格の第2次検定で問われる本人の実務経験が対象です（経験していない工事の記述＝捏造はお受けしません）。事実・数値はすべてご回答から構成し、納品は本人の事実確認を前提とした「ドラフト」＋書き直し1回。合格を保証するものではありません。',
    price: '¥10,500（2級・3管理フルセット・書き直し1回込み）',
    priceYen: 10500,
    examScope: ['civil-2'],
    weeklyCapacity: 1,
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
    price: '¥5,500（PDF 10冊・テーマ別＋年度別）',
    priceYen: 5500,
    priceHistory: [{ priceYen: 5000, until: '2026-09-22' }],
    notePriceBasis: 'civil-1-experience-essay + civil-1-pastexam-essay',
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
    price: '¥5,000（PDF 8冊・テーマ別＋年度別）',
    priceYen: 5000,
    priceHistory: [{ priceYen: 4000, until: '2026-09-22' }],
    notePriceBasis: 'civil-2-experience-essay + civil-2-pastexam-essay',
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

  // C8: 1級 二次 予想模擬試験3回（問題冊子＋解答解説）。
  //   源=C6 学科記述論点＋C1 出題分析から build-once 生成（新規事実ゼロ・出題保証しない）。
  //   Red Line #10 例外運用（模試=公開時点で固定した静的3回分／会員フロー=更新型予想ドリップで差別化）。
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
    title: 'R8対応 1級土木二次の予想模試3回分を送ります',
    shortTitle: '1級 二次 予想模試3回 PDF',
    description:
      '1級土木施工管理技士 第2次検定の予想模擬試験3回分・PDF 6冊（各回の問題冊子＋解答解説）。施工経験記述は毎回2テーマ、学科記述は必須・選択構造で通し演習できます。令和3〜7年度の出題傾向から作成した自主教材で、自己採点・復習計画つき。購入後トークルームでお送りします（本試験の出題を保証するものではありません）。',
    price: '¥3,500（予想模試3回・PDF 6冊＋特典 直前暗記ノート）',
    priceYen: 3500,
    priceHistory: [{ priceYen: 2500, until: '2026-09-22' }],
    notePriceBasis: 'civil-1-chokuzen-pack | civil-1-r8-mock3-pdf + civil-1-anki-note',
    examScope: ['civil-1'],
    weeklyCapacity: 20,
    listedAt: '2026-07-18',
  },

  // C9: 2級 二次 予想模擬試験3回（問題冊子＋解答解説）。C8 の2級版。
  'coconala-2kyu-moshi-pdf': {
    id: 'coconala-2kyu-moshi-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4317889',
    title: 'R8対応 2級土木二次の予想模試3回分を送ります',
    shortTitle: '2級 二次 予想模試3回 PDF',
    description:
      '2級土木施工管理技士 第2次検定の予想模擬試験3回分・PDF 6冊（各回の問題冊子＋解答解説）。施工経験記述は毎回2テーマ、学科記述は必須4問＋選択2問で通し演習できます。令和3〜7年度の出題傾向から作成した自主教材で、自己採点・復習計画つき。購入後トークルームでお送りします（本試験の出題を保証するものではありません）。',
    price: '¥3,000（予想模試3回・PDF 6冊＋特典 直前暗記ノート）',
    priceYen: 3000,
    priceHistory: [{ priceYen: 2000, until: '2026-09-22' }],
    notePriceBasis: 'civil-2-chokuzen-pack | civil-2-r8-mock3-pdf + civil-2-anki-note',
    examScope: ['civil-2'],
    weeklyCapacity: 20,
    listedAt: '2026-07-18',
  },
  // C10: 1級 二次 教材フルパック（C1+C2+C4+C6+C8 全部入り・PDF 22冊）。2026-08-05 新設。
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
    title: 'R8対応 1級土木二次の教材フルパックを送ります',
    shortTitle: '1級 二次 教材フルパック PDF',
    description:
      '1級土木施工管理技士 第2次検定の対策PDFを全部入りでまとめたフルパック（計22冊）。出題分析＋直前重点（1冊）・経験記述 模範答案（テーマ別5冊＋年度別5冊）・学科記述 攻略（5冊・5論点）・予想模擬試験3回分（問題冊子＋解答解説の6冊）を一括でお送りします。出題分析と学科記述攻略はこのパックのみの収録。分析→インプット→演習→模試まで一気通貫。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥12,000（PDF 22冊・全部入り＋特典 直前暗記ノート）',
    priceYen: 12000,
    priceHistory: [{ priceYen: 10000, until: '2026-09-22' }],
    notePriceBasis: 'civil-1-niji-marugoto-pack | civil-1-chokuzen-pack + civil-1-experience-essay + civil-1-pastexam-essay + civil-1-gakka-kijutsu',
    examScope: ['civil-1'],
    weeklyCapacity: 20,
    listedAt: '2026-08-05',
  },

  // C11: 2級 二次 教材フルパック（C3+C5+C7+C9 全部入り・PDF 19冊）。C10 の2級版。
  //   価格 ¥7,000（1級 ¥10,000 の 0.7＝級差を保つ・500円刻み適合）。
  'coconala-2kyu-full-pdf': {
    id: 'coconala-2kyu-full-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4341191',
    title: 'R8対応 2級土木二次の教材フルパックを送ります',
    shortTitle: '2級 二次 教材フルパック PDF',
    description:
      '2級土木施工管理技士 第2次検定の対策PDFを全部入りでまとめたフルパック（計19冊）。経験記述 模範答案（テーマ別3冊＋年度別5冊）・学科記述 攻略（5冊・5論点）・予想模擬試験3回分（問題冊子＋解答解説の6冊）を一括でお送りします。学科記述攻略はこのパックのみの収録。インプット→演習→模試まで一気通貫。購入後トークルームで PDF をお送りします（本試験の出題を保証するものではありません）。',
    price: '¥10,000（PDF 19冊・全部入り＋特典 直前暗記ノート）',
    priceYen: 10000,
    priceHistory: [{ priceYen: 7000, until: '2026-09-22' }],
    notePriceBasis: 'civil-2-niji-marugoto-pack | civil-2-chokuzen-pack + civil-2-experience-essay + civil-2-pastexam-essay + civil-2-gakka-kijutsu',
    examScope: ['civil-2'],
    weeklyCapacity: 20,
    listedAt: '2026-08-05',
  },

  // C12: 1級 二次 プレミアム（教材フルパック22冊 ＋ 経験記述 添削2テーマ）。2026-08-05 新設。
  //   なぜ作るか: 純教材の価格天井は実測で ¥10,000（一級建築士製図ノート ¥10,000×31件が最上位。
  //   PDF556頁の学科資料でも ¥6,500）。物量では上へ行けない（本パックは145ページ）。**労働を足して
  //   初めて別の帯に入る**。競合ちゃんさとは 添削2問¥12,000／作成代行2問¥16,000 で**教材が付かない**
  //   純労働なので、同帯で「添削＋145ページの教材」は労働では追随できない差別化になる。
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
      '1級土木施工管理技士 第2次検定の対策PDF 22冊（出題分析・経験記述模範答案10冊・学科記述攻略5冊・予想模擬試験3回分6冊／計145ページ）に、施工経験記述の添削（新形式2テーマ・赤入れ＋書き直し1回）を組み合わせたセット。教材で書き方を掴み、実際に書いた答案を元自治体土木（発注者＝提出書類を審査する側）の目で赤入れします。購入後トークルームでPDFをお送りし、答案はヒアリングシートご記入後に添削します。経験していない工事の答案作成（捏造）はお受けしません。合格を保証するものではありません。',
    price: '¥17,000（PDF22冊＋添削2テーマ・書き直し1回）',
    priceYen: 17000,
    priceHistory: [{ priceYen: 15000, until: '2026-09-22' }],
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
    notePriceExempt: '出題テーマ分析は note に同じ中身の商品が無い（note の施策バンク本文は転載しない設計）',
    examScope: ['pe-comprehensive-management'],
    weeklyCapacity: 20,
    listedAt: '2026-07-22',
  },

  // ---- RCCM（2026-09-15 新設・CBT 試験期間 9/1〜10/31 の直前期向け）----
  // 競合実測（.claude/state/coconala/market-research.json）: 経験論文添削 ¥6,500〜13,000、
  // 択一予想 ¥2,500（★4.9・48件）。運営者の座は「発注者としてコンサル業務を発注・検査した技術士（建設・総監）」。
  // RCCM 合格・コンサル在籍は名乗らない。出品は /coconala-publish --commit（status:'draft' → 'listed' と serviceUrl を同時に埋める）。
  'coconala-rccm-mondai3-tensaku': {
    id: 'coconala-rccm-mondai3-tensaku',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4403575',
    title: 'RCCM問題III 管理技術力の論文を添削します',
    shortTitle: 'RCCM 問題III 添削',
    description:
      'RCCM資格試験 試験B 問題III（管理技術力・1,200〜1,600字）の下書き1テーマ分を、発注者としてコンサルタントの成果品を検査・評定してきた技術士（建設部門・総合技術監理部門）が添削。①現状と課題／②対策のあり方の構成、指定語の「」使用（4語以上）、管理技術者としての視点逸脱、字数超過を指摘し、書き換え案を返却する。1往復の再確認付き。合格を保証するものではない。',
    price: '¥6,000（1テーマ・再確認1回）',
    priceYen: 6000,
    examScope: ['rccm'],
    weeklyCapacity: 2,
    listedAt: '2026-09-16',
  },
  'coconala-rccm-mondai1-shindan': {
    id: 'coconala-rccm-mondai1-shindan',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4403577',
    title: 'RCCM業務経験論文の減点箇所を診断します',
    shortTitle: 'RCCM 問題I 診断',
    description:
      'RCCM資格試験 試験A 問題I（業務経験論文・2,400字以内）の下書きを、業務実績証明書との整合、技術上の問題点と業務上の問題点の立て方、結論の具体性の観点で診断。合格可能性の A/B/C 判定と減点ポイント ワースト3、字数チェックを返却する。診断のみで書き換え文は提供しない。経験していない業務の創作はお受けしない。',
    price: '¥2,000（1本診断）',
    priceYen: 2000,
    examScope: ['rccm'],
    weeklyCapacity: 3,
    listedAt: '2026-09-16',
  },
  'coconala-rccm-mondai3-pdf': {
    id: 'coconala-rccm-mondai3-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4403588',
    title: 'RCCM問題III 模範論文6本のPDFを送ります',
    shortTitle: 'RCCM 問題III 模範論文 PDF',
    description:
      'RCCM資格試験 2026年度 問題III（管理技術力）の公開6テーマ全部の模範論文（各1,200〜1,600字・①現状と課題／②対策のあり方）と、指定語の使用チェック表・部門別の置換ポイントをまとめた印刷用PDF。購入後トークルームでお送りする。出題や合格を保証するものではない。',
    price: '¥4,000（PDF）',
    priceYen: 4000,
    priceHistory: [{ priceYen: 3000, until: '2026-09-22' }],
    notePriceBasis: 'rccm-mondai3-magazine',
    examScope: ['rccm'],
    weeklyCapacity: 20,
    listedAt: '2026-09-16',
  },
  // R2（2026-09-23・09 §D7）: 択一は 303geos（¥2,500×49）だけが埋める白地。源は note の予想50問＋直前暗記ノート
  // （note 定価の合計 ¥2,460 を下回らない）。build-coconala-content-pdf.mjs --product R2 で PDF 2冊。
  'coconala-rccm-takuitsu-pdf': {
    id: 'coconala-rccm-takuitsu-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4415185',
    title: 'RCCM択一 予想50問と一問一答を送ります',
    shortTitle: 'RCCM 択一 PDF',
    description:
      'RCCM資格試験の択一（試験A 問題II・試験B 問題IV-1）対策PDF2冊。オリジナル予想50問（全選択肢の正誤理由・計算は途中式付き）と、登録規程から土木基礎までの一問一答159問。過去問題は非公開のため、公開の一次出典から作成した自作問題で、実際の試験問題の再現ではない。購入後トークルームでお送りする。出題や合格を保証するものではない。',
    price: '¥3,000（PDF2冊）',
    priceYen: 3000,
    priceHistory: [{ priceYen: 2500, until: '2026-09-22' }],
    notePriceBasis: 'rccm-takuitsu-yosou-50 + rccm-anki-note',
    examScope: ['rccm'],
    weeklyCapacity: 20,
    listedAt: '2026-09-23',
  },

  // R3（2026-09-23）: 問題I の PDF。診断（人の作業）はあったが PDF が無かった。303geos が 9月に同型を新設。
  // 源は note のテンプレ（¥1,980）＋部門別記入例（各¥1,980）。購入者の受験部門の1本を送る＝note 定価の合計 ¥3,960 を下回らない。
  'coconala-rccm-mondai1-pdf': {
    id: 'coconala-rccm-mondai1-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4415242',
    title: 'RCCM業務経験論文のテンプレと記入例を送ります',
    shortTitle: 'RCCM 問題I テンプレ＋記入例 PDF',
    description:
      'RCCM資格試験 試験A 問題I（業務経験論文・2,400字以内）のテンプレートと、受験部門の記入例2本のPDF。上水道・下水道・土質及び基礎・道路・河川砂防及び海岸海洋・鋼構造及びコンクリートの6部門から1部門を選ぶ。記入例は架空の業務に基づく練習用で、そのまま使う原稿ではない。出題や合格を保証するものではない。',
    price: '¥4,500（テンプレ＋1部門の記入例2本）',
    priceYen: 4500,
    priceHistory: [{ priceYen: 4000, until: '2026-09-22' }],
    notePriceBasis: 'each: rccm-mondai1-template + rccm-mondai1-water | rccm-mondai1-template + rccm-mondai1-sewer | rccm-mondai1-template + rccm-mondai1-geotechnical | rccm-mondai1-template + rccm-mondai1-road | rccm-mondai1-template + rccm-mondai1-river-coast | rccm-mondai1-template + rccm-mondai1-steel-concrete',
    examScope: ['rccm'],
    weeklyCapacity: 20,
    listedAt: '2026-09-23',
  },

  // ---- 技術士 口頭試験（2026-09-23・09 §D7）----
  // 土木二次の需要が消える11〜1月に立つ季節商品。出品31件・レビュー108件と小さい市場。運営者は技術士
  // （建設部門・総合技術監理部門）。ビデオ面接は日時調整の負担が大きいので出さず、PDF とテキスト完結型に限る。
  'coconala-pe-oral-pdf': {
    id: 'coconala-pe-oral-pdf',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4415186',
    title: '技術士口頭試験の想定問答PDFを送ります',
    shortTitle: '技術士 口頭試験 想定問答 PDF',
    description:
      '技術士第二次試験の口頭試験に向けた想定問答と準備ロードマップのPDF。総合技術監理部門版（想定25問・立場別の回答例）と建設部門版（改訂コンピテンシー対応の想定問答バンク）から、受験部門に合う1冊をお送りする。回答例は架空の業務に基づく例示で、実際の試問の再現ではない。合格を保証するものではない。',
    price: '¥3,500（PDF1冊）',
    priceYen: 3500,
    priceHistory: [{ priceYen: 3000, until: '2026-09-22' }],
    notePriceBasis: 'each: tankan-oral-complete | pe-construction-oral-guide',
    examScope: ['pe-comprehensive-management', 'pe-construction'],
    weeklyCapacity: 20,
    listedAt: '2026-09-23',
  },
  'coconala-pe-oral-qa': {
    id: 'coconala-pe-oral-qa',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/4415190',
    title: '技術士口頭試験の想定質問を経歴から作ります',
    shortTitle: '技術士 口頭試験 想定質問作成',
    description:
      '受験申込書の「業務内容の詳細」（720字以内）と業務経歴をもとに、口頭試験で聞かれやすい想定質問20問と、ご本人の事実から組み立てた回答の骨子を返すテキスト完結のサービス。ビデオ面接ではない。経験していない業務の創作はせず、事実が足りない箇所は確認事項として返す。建設部門・総合技術監理部門に対応。合格を保証するものではない。',
    price: '¥5,000（想定質問20問＋回答骨子）',
    priceYen: 5000,
    examScope: ['pe-comprehensive-management', 'pe-construction'],
    weeklyCapacity: 2,
    listedAt: '2026-09-23',
  },

  // ---- コンクリート主任技士（2026-09-23・試験出品）----
  // 本試験 2026-11-29。ココナラの出品は1件・レビュー0で、空白か需要不在かを判別できない（09 §D7）。
  // PDF は1件ごとの作業がほぼ無いので小さく試し、試験後に販売実績で継続を判断する（backlog DN-0265）。
  // 運営者はコンクリート主任技士を保有（src/config/author.ts）。KDP の g-02 は Select OFF で PDF 販売と衝突しない。
  'coconala-cce-essay-pdf': {
    id: 'coconala-cce-essay-pdf',
    status: 'draft',
    serviceUrl: '',
    title: 'コンクリート主任技士の小論文模範答案を送ります',
    shortTitle: 'コンクリート主任技士 小論文 PDF',
    description:
      'コンクリート主任技士試験の小論文対策PDF5冊。答案の型と時間配分をまとめた解法ガイドと、品質管理・耐久性・環境配慮・施工トラブルの4テーマの模範答案（想定問題・答案の方針・チェックポイント・自分の案件への置換ガイド付き）。模範答案は架空の案件に基づく例示。出題や合格を保証するものではない。',
    price: '¥3,000（PDF5冊）',
    priceYen: 3000,
    notePriceBasis: 'cce-essay-magazine',
    examScope: ['concrete-chief-engineer'],
    weeklyCapacity: 20,
  },
  'coconala-cce-takuitsu-pdf': {
    id: 'coconala-cce-takuitsu-pdf',
    status: 'draft',
    serviceUrl: '',
    title: 'コンクリート主任技士 択一直前パックを送ります',
    shortTitle: 'コンクリート主任技士 択一直前パック PDF',
    description:
      'コンクリート主任技士試験の四肢択一対策PDF3冊。8分野のオリジナル予想50問（全選択肢解説）、配合計算の実戦演習12問（途中式付き）、数値と定義の一問一答157問。予想は出題を保証するものではなく、実際の試験問題の再現ではない。',
    price: '¥3,500（PDF3冊）',
    priceYen: 3500,
    notePriceBasis: 'cce-takuitsu-chokuzen-pack | cce-r8-mc-50 + cce-mix-calculation-practice + cce-anki-note',
    examScope: ['concrete-chief-engineer'],
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

