/**
 * note 有料マガジン定義 (Single Source of Truth)
 *
 * 各マガジンの公開状態・noteUrl・カバー画像・価格を一元管理する。
 * page.tsx と magazine-placement.ts から参照される。
 *
 * 運営者作業フロー (新マガジン公開時):
 * 1. note 上で記事/マガジンを公開し URL を取得
 * 2. 該当エントリの `noteUrl` を埋め `published: true` に変更
 * 3. commit → デプロイ後、対応する slug ページに CTA が自動表示される
 *
 * note 公開前は published: false にしておけば防御的に非表示。
 */

export interface NoteMagazine {
  readonly id: string;
  readonly published: boolean;
  readonly noteUrl: string;
  /**
   * サイト CTA の着地先 URL（省略時は noteUrl）。
   * 有料マガジンへ直接送る代わりに、無料の索引/案内記事など摩擦の低い front-door へ
   * 着地させたいときに設定する。noteUrl はマガジン SoT（verify-note-magazines が /m/ で照合）
   * のため不変で、着地先だけをこの field で分離する。
   */
  readonly landingUrl?: string;
  readonly title: string;
  readonly description: string;
  /** CTA タイル用の短縮タイトル (省略時は title を使用) */
  readonly shortTitle?: string;
  /** サイドバー/インライン CTA 用の短縮説明 (省略時は description を使用) */
  readonly shortDescription?: string;
  readonly price?: string;
  readonly badge: string;
  /**
   * ヒーロー CTA（MagazineHeroCta）の商品別出し分け。焼き込みバナーを作らずに
   * 「商品ごとに刺さる CTA」を出すための 3 点セット（全て任意・省略時フォールバック）。
   * - ctaCatch: バナー見出しのキャッチコピー（読者の課題を突く 1 文）。省略時 shortTitle ?? title
   * - ctaButton: ボタン文言（動詞で終える）。省略時「note で詳しく見る」
   * - ctaPose: マスコットのポーズ。省略時 pointing
   *   pointing=論点提示・good-sign=完成/合格訴求・smile=伴走/入門
   *
   * ctaPose の許可値の真実源は `.claude/config/character-poses.json` の `siteCta: true`
   * （型に literal が要るためここに union を書くが、増やすときは manifest → webp 生成 → 本 union の順）。
   * 三者の整合（manifest ⇔ public/images/character/avatar-{pose}.webp ⇔ 本 union）は
   * `npm run check-character-avatars` が gate する＝union だけ広げると本番でアバターが 404 になるため。
   */
  readonly ctaCatch?: string;
  readonly ctaButton?: string;
  readonly ctaPose?: 'pointing' | 'good-sign' | 'smile';
}
// 注: 画像（imageUrl / sidebarImageUrl）は 2026-07 に廃止。CTA タイルは資格別ブランド背景
//     （exam-brand.ts の cta-bg イラスト）＋ HTML 文字でデータ駆動する（マガジン追加時の画像生成が不要）。

/**
 * 命名規約 (id):
 * - tankan-reading-guide: 5管理 精読ガイド (既公開、価格非表示)
 * - essay-{persona}-magazine: 模範論文 ペルソナ別 5年分マガジン (公開準備中)
 *
 * 新マガジン追加時の配線チェックリスト（capability ドリフト再発防止・2026-07-01 / 画像廃止 2026-07-06）:
 *   本エントリ追加だけでは依存する実行系に配線されない。新マガジンを足したら:
 *   1. サイト表示用の画像は不要（CTA タイルは exam-brand.ts の資格別 cta-bg 背景＋ HTML 文字で
 *      データ駆動）。examKeyOf が id 接頭辞から資格を推定できることだけ確認（新接頭辞なら
 *      exam-brand.ts に追記）。※note 公開時のマガジンヘッダー _cover.png は別工程で
 *      generate-magazine-covers.mjs が生成（note-magazine-cover.mjs がアップロード）。
 *   2. 売上記録: .claude/agents/sales-recorder.md の productId マッピング表に追加
 *   3. keiken 系（施工経験記述）なら: scripts/keiken-charcount.mjs の探索フィルタに dir 判別語を追加
 *      （check-magazine-wiring.mjs が pre-commit で漏れを機械検知する）
 *   4. Generator/Evaluator の対応型: .claude/agents/civil-keiken-essay-writer.md 等の型リスト＋agents-registry.md
 *   5. 変更後は /doc-sync を1回回して prose 陳腐化を点検（CLAUDE.md §8）
 */
const MAGAZINES_RAW = {
  'tankan-reading-guide': {
    id: 'tankan-reading-guide',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m607bf095b02a',
    title: 'doboku-note 連動｜5管理 テキスト精読ガイド',
    description:
      'サイトの 650+ キーワード解説と連動した試験対策教材。5管理ごとに頻出論点と引っかけパターンを体系化し、各論点から本サイトの詳細解説に直リンク。全約7万字。',
    shortTitle: '5管理 精読ガイド',
    shortDescription:
      '5管理ごとの頻出論点と引っかけパターンを体系化。約7万字、doboku-note 解説への直リンク付き。',
    badge: 'note 限定 教材',
    ctaCatch: 'キーワードの丸暗記で止まっていませんか？',
    ctaButton: '精読ガイドを見てみる',
    ctaPose: 'pointing',
  },

  'essay-river-consultant-magazine': {
    id: 'essay-river-consultant-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32132ecb3033',
    title: '総監記述式 模範論文｜建設コンサル河川・砂防 R3-R7＋R8予想（6テーマ）',
    description:
      'R03〜R07 過去問（治水計画の調査計画版/河川管理施設の点検・補修更新設計版の A案/B案 2 バージョン）＋ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。中堅建設コンサル河川・砂防部門 部長（調査設計者）視点、5管理トレードオフが主軸。テーマ横断の「R8予想問題集」も別途展開。',
    shortTitle: '模範論文｜河川コンサル',
    shortDescription:
      'R03〜R07＋R8予想6記事 = 計11記事。河川・砂防部門 部長（調査設計者）視点で 3,000 字フル論文。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
    ctaCatch: '河川コンサルの立場で、3,000字フル論文を読む',
    ctaButton: '模範論文を見てみる',
    ctaPose: 'pointing',
  },

  'essay-general-contractor-magazine': {
    id: 'essay-general-contractor-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32aaa137f22e',
    title: '総監記述式 模範論文｜ゼネコン R3-R7＋R8予想（6テーマ）',
    description:
      'R03〜R07 過去問（新設・改良施工版/維持・更新・補修施工版の A案/B案 2 バージョン）＋ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。中堅〜大手ゼネコン土木部門（施工者）視点、安全 × 経済性 × 人的資源 のトレードオフが主軸。テーマ横断の「R8予想問題集」も別途展開。',
    shortTitle: '模範論文｜ゼネコン',
    shortDescription:
      'R03〜R07＋R8予想6記事 = 計11記事。ゼネコン土木部門（施工者）視点、安全 × 経済性 × 人的資源 が主軸。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
    ctaCatch: 'ゼネコン施工者の立場で、3,000字フル論文を読む',
    ctaButton: '模範論文を見てみる',
    ctaPose: 'pointing',
  },

  'essay-road-municipality-magazine': {
    id: 'essay-road-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m52186ffd12ca',
    title: '総監記述式 模範論文｜自治体 道路担当 R3-R7＋R8予想（全6テーマ）',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の過去問 5 年分（橋梁長寿命化〔維持管理〕版とバイパス整備・道路建設〔新設〕版の A 案／B 案 2 バージョン併記）＋ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）＋ R8予想問題集デモ1本の合計12記事。地方自治体の道路担当（発注者）の立場で「経済性 × 安全 × 社会環境」を主軸に、各記事に設問全文を再掲して論文構成を解説。テーマ横断の「R8予想問題集」も別途展開。',
    shortTitle: '模範論文｜自治体 道路担当 R3-R7',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）＋ R8予想6記事＋デモ1本 = 計12記事。試験対策決定版。',
    price: '¥2,480（12本セット、単品比65%OFF）',
    badge: 'note 限定',
    ctaCatch: '自治体 道路担当の立場で、3,000字フル論文を読む',
    ctaButton: '模範論文を見てみる',
    ctaPose: 'pointing',
  },

  'essay-procurement-municipality-magazine': {
    id: 'essay-procurement-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m55b930cbfcf9',
    title: '総監記述式 模範論文｜自治体 契約・調達担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（入札・契約制度運用版/工事検査・契約変更管理版の A案／B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。市区町村の契約検査課/技術管理課（発注者）視点、「コスト最適化 × 入札の公正性 × 担い手確保」の調達固有のトレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体 契約・調達担当',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R8予想6記事 = 計11記事。調達・契約視点の決定版。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },

  'essay-standards-municipality-magazine': {
    id: 'essay-standards-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf9f281e2cb32',
    title: '総監記述式 模範論文｜自治体 技術基準担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（設計基準・標準仕様の策定改定版/BIM・CIM・電子納品・技術情報DB版の A案／B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。都道府県の技術管理課（発注者）視点、「技術標準の統一 × 現場個別性 × 技術伝承」の基準担当固有のトレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体 技術基準担当',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R8予想6記事 = 計11記事。情報管理・標準化視点の決定版。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },

  'essay-river-municipality-magazine': {
    id: 'essay-river-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32a8a5b3b473',
    title: '総監記述式 模範論文｜自治体 河川担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（各 A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。河川砂防・海岸海洋分野合格者視点、堤防維持管理 × 河川改修。5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体河川担当',
    shortDescription:
      'R03〜R07 + R8予想6記事 = 計11記事。維持管理版/河川改修版の A案/B案＋印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-urban-municipality-magazine': {
    id: 'essay-urban-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf8c77e995511',
    title: '総監記述式 模範論文｜自治体 都市計画担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（各 A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。都市及び地方計画分野合格者視点、立地適正化計画（制度運用）× 市街地再開発（事業整備）。5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体都市計画担当',
    shortDescription:
      'R03〜R07 + R8予想6記事 = 計11記事。立地適正化計画版/再開発事業版の A案/B案＋印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },

  'essay-sewage-municipality-magazine': {
    id: 'essay-sewage-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf1cbc32d53aa',
    title: '総監記述式 模範論文｜自治体 下水道担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体下水道担当',
    description:
      'R03〜R07 過去問（老朽管路更新版/浸水対策雨水幹線整備版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。下水道担当（発注者）視点、5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-sabo-municipality-magazine': {
    id: 'essay-sabo-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m7cd44bf57187',
    title: '総監記述式 模範論文｜自治体 砂防担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体砂防担当',
    description:
      'R03〜R07 過去問（砂防施設維持管理版/砂防堰堤新設・急傾斜地対策版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。砂防担当（発注者）視点、土砂災害リスク管理・流域管理・5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-port-municipality-magazine': {
    id: 'essay-port-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf762f616c065',
    title: '総監記述式 模範論文｜自治体 港湾担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体港湾担当',
    description:
      'R03〜R07 過去問（港湾施設維持管理版/岸壁改良・水深増深版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。港湾担当（発注者）視点、物流機能維持・CNポート・5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-park-municipality-magazine': {
    id: 'essay-park-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m6d1810e50b0a',
    title: '総監記述式 模範論文｜自治体 公園緑地担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体公園緑地担当',
    description:
      'R03〜R07 過去問（公園施設維持管理・老朽遊具更新版/防災公園新設・グリーンインフラ整備版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。公園緑地担当（発注者）視点、5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-water-municipality-magazine': {
    id: 'essay-water-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf4c6792b4f9c',
    title: '総監記述式 模範論文｜自治体 上水道担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体上水道担当',
    description:
      'R03〜R07 過去問（老朽管路更新版/浄水場改修・高度浄水処理導入版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。上水道担当（発注者）視点、5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-road-consultant-magazine': {
    id: 'essay-road-consultant-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m09440aa379cf',
    title: '総監記述式 模範論文｜道路・橋梁設計コンサルタント R3-R7 + R8予想セット',
    shortTitle: '模範論文｜道路橋梁コンサル',
    description:
      'R03〜R07 過去問（橋梁点検補修設計版/道路改良設計版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。道路・橋梁設計コンサルタント（受注者・調査設計者）視点、5管理トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  'essay-urban-consultant-magazine': {
    id: 'essay-urban-consultant-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf0f98993407f',
    title: '総監記述式 模範論文｜都市計画コンサルタント R3-R7 + R8予想セット',
    shortTitle: '模範論文｜都市計画コンサル',
    description:
      'R03〜R07 過去問（立地適正化計画策定支援版/市街地整備・再開発計画版の A案/B案 2 バージョン）+ R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）の計 11 記事。建設コンサル都市計画部門（受注者・調査設計者）視点、5管理トレードオフが主軸。各記事に印刷用PDF付き。',
    price: '¥2,480（11本セット、単品比63%OFF）',
    badge: 'note 限定',
  },
  // 注: essay-nexco-magazine / essay-power-civil-magazine は 2026-06-09 不採用。
  //     著者ペルソナ＝元自治体土木（発注者）の真実の経験座から外れる異業種（電力＝民間ダム/発電、
  //     NEXCO＝高速道路会社）で、一人称模範論文の真実性とドメイン精度を担保できないため。
  //     いずれも未公開（published:false・URL空）でサンクコストなし。

  // ----- Series 1/3/4/5 新規マガジン (2026-05-17 完成、M1 は 2026-05-18 撤回) -----
  // 注: whitepaper-r7-strategy は 2026-05-25 に「¥2,480 magazine → 完全無料リード磁石」へ
  //     戦略転換。SoT エントリも削除し、note 上で単独無料記事として公開する。
  //     後続商品 (M3/M4/M9/M5-8) への送客は記事本文末尾 CTA + 各章末ミニ CTA で行う。
  //     詳細: docs/handoffs/2026-05-25-whitepaper-r7-free-lead-magnet.md
  'r8-essay-forecast': {
    id: 'r8-essay-forecast',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m6854c7437d4d',
    title: '令和8年度 総監記述式 R8予想問題集 2026最終予想｜出る6テーマ × 専門分野を問わない解答骨子',
    description:
      'R8 で出題が予想される6テーマ（AI社会・気候変動適応・経済安全保障・災害復旧・資源循環・老朽化インフラ）を、出題予想根拠＋専門分野を問わない三層構造の解答骨子＋3ペルソナ別アレンジ早見表で攻略。各テーマに自治体道路担当の3,000字級フル模範論文を実演サンプルとして収録。さらに各テーマは全14ペルソナ別のフル模範論文を単品でも展開（受注者4＋自治体10／自分の専門分野・立場で選べる）。立場が違っても分野不問の骨子から自分の答案を組める。試験直前の最終予想・総仕上げに。',
    shortTitle: 'R8 予想問題集',
    shortDescription:
      'R8の出る6テーマを分野不問の三層骨子＋3ペルソナ早見表で攻略。道路担当フル論文を実演収録。試験直前の最終予想。',
    price: '¥3,480（6テーマセット・各¥780、単品比26%OFF）',
    badge: 'note 限定',
    ctaCatch: 'R8で何が出るか、6テーマに絞り込みました',
    ctaButton: '最終予想を見てみる',
    ctaPose: 'pointing',
  },

  // 注: essay-template-3d「解答テンプレ 3D マトリクス」(¥2,980) は 2026-06-01 に企画中止。
  //     SoT エントリと magazine-placement.ts の配線を削除した（whitepaper-r7-strategy と同様の退役）。
  //     原稿（content/note/技術士総監/解答テンプレ3D/）も 2026-06-01 削除（記述式対策は他コンテンツで網羅のため）。

  // 原稿配置: content/note/技術士総監/magazines/総監記述式-設問3国家施策バンク/（序章 + 11 テーマ）
  // 設問(3)専用の国家施策オプション集。2026-06-01 全12記事+マガジン公開。
  'setsumon3-policy-bank': {
    id: 'setsumon3-policy-bank',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m91516dfc27ac',
    title: '総監記述式 設問(3)国家施策バンク｜将来課題11テーマ × 国家施策オプション集',
    description:
      '【R8本試験で実証】令和8年度 総監本試験（記述式I-2「地方創生」）では、6月1日公開時点で収録済みの「地方創生・東京一極集中」6案が設問(3)にそのまま使える内容でした。設問(3)専用。2050年前後の将来課題11テーマ（人口減少・地方創生・担い手不足・GX・気候変動適応・循環経済・インフラ老朽化・Society5.0・食料安保・経済安保・物流危機）ごとに、国家スケールの施策を5〜8案ずつ（①課題と施策／②有効性と実現性／③重大な障害と克服策・トレードオフ明示）約600字＝答案用紙1枚相当で収録（計68案）。どのテーマが出ても引き出せる施策の弾薬庫。',
    shortTitle: '設問3 国家施策バンク',
    shortDescription:
      'R8本試験「地方創生」を6/1公開で事前収録。将来課題11テーマ × 国家施策68案（各約600字）。設問(3)専用の引き出し集。',
    price: '¥2,980',
    badge: 'note 限定',
    ctaCatch: 'R8本試験の設問(3)、このバンクが7週間前に収録していました',
    ctaButton: '施策バンクを見てみる',
    ctaPose: 'pointing',
  },

  // ----- 総監 5管理クロストレードオフ (2026-06-01 全記事公開) -----
  // 原稿配置: content/note/技術士総監/magazines/総監記述式-5管理クロストレードオフ/
  // 序章（無料）+ 有料5記事（安全/経済性/情報/人的資源/社会環境）
  'tradeoff-5kanri': {
    id: 'tradeoff-5kanri',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m921fbe060575',
    title: '技術士 総監｜記述式 5管理クロス・トレードオフ全網羅（20セル）',
    description:
      '5管理それぞれを主役に「その管理 × 他4管理」のトレードオフを 20 セル全網羅。起こりうる衝突パターンを複数列挙し、各パターンに ALARP・RBM・LCC・群マネ等の総監フレームと答案ひな型を配置。どんなお題が来ても引き出せる解決策の型を身につける。序章（無料）+ 有料5記事セット。',
    shortTitle: '5管理クロストレードオフ',
    shortDescription:
      '20セル全網羅・総監フレーム辞書・答案ひな型付き。序章無料＋有料5記事。',
    price: '¥1,980（6本セット、49%OFF）',
    badge: 'note 限定',
  },

  // ----- 総監記述式 完全パック（上段・全記事パック 2026年版）-----
  // 型 + 設問3 + R8 + 模範論文14ペルソナ + 精読 の全部入り（全18マガジン相当）。
  // 2026-06-15 に9ペルソナ63記事＋精読6記事を収録し note 上で122記事に拡張
  //（note-magazine-add + note-edit-magazine、API実体検証済）。
  // 価格は 2026-06-20 に ¥9,800 へ改定（旧 ¥14,800）。単品合計¥44,640相当（約78%OFF）。
  // 決定: 総監マガジン構成_決定2026.md §3-2 ＋ 2026-06-15 追補。
  'essay-complete-pack': {
    id: 'essay-complete-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m171222175fac',
    title: '総監記述式 完全パック｜型×設問3×予想×全14ペルソナ模範論文＋精読 全部入り',
    description:
      '技術士総監 記述式（必須科目Ⅰ）対策の全部入り。クロストレードオフ（5管理対立の型）＋設問3国家施策バンク（弾薬）＋R8予想問題集（演習）＋模範論文 全14ペルソナ（受注者4＋自治体10・フル実演）＋5管理テキスト精読ガイドを1パックに収録。収録の設問(3)国家施策バンクは、R8本試験テーマ「地方創生」を6/1公開で事前収録した実績があります。自分の専門分野が必ず入る網羅保証。単品合計¥44,640相当。',
    shortTitle: '記述式 完全パック',
    shortDescription:
      '型×設問3×予想×全14ペルソナ模範論文＋精読の全部入り。記述式対策の決定版バンドル。',
    price: '¥9,800',
    badge: 'note 限定',
    ctaCatch: '記述式の対策、これ1つで全部そろいます',
    ctaButton: '完全パックを見てみる',
    ctaPose: 'good-sign',
  },

  // ----- 記述式コアパック（下段・2026-06-15 新設・有料¥5,480で note 作成済） -----
  // 2段ラダーの下段。型+設問3+R8（ペルソナ非依存）の24記事を収録（¥5,480＝単品合計¥7,940の31%OFF）。
  // 2026-06-15 に有料(単体)¥5,480で新規作成（/magazines/new・カテゴリ=キャリア）→ コア24記事を
  // note-magazine-add で収録・API実体検証済（¥5480・24件）。
  // 構成元: 型 m921fbe060575／設問3 m91516dfc27ac／R8 m6854c7437d4d。精読は除外（択一/論点で別軸）。
  // 決定記録: content/note/技術士総監/総監マガジン構成_決定2026.md §3-1 ＋ 2026-06-15 追補。
  'essay-core-pack': {
    id: 'essay-core-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m6e7de5e4ea3d',
    title: '総監記述式 コアパック｜型 × 設問3 × R8予想（ペルソナ非依存3本）',
    description:
      '記述式の答案を完成させる最小セット。クロストレードオフ（5管理対立の型）＋設問(3)国家施策バンク（弾薬）＋R8予想問題集（演習）の3本を収録。収録の設問(3)バンクは、R8本試験テーマ「地方創生」を6/1公開で事前収録した実績があります。どの分野・立場でも効く横断教材で、自分のペルソナ別模範論文は単品で1つ足すだけ。単品合計¥7,940相当。',
    shortTitle: '記述式 コアパック',
    shortDescription:
      '型×設問3×R8の横断3本セット。記述式エンジンを安く・全員に。ペルソナは別途1本追加。',
    price: '¥5,480（3本セット、31%OFF）',
    badge: 'note 限定',
    ctaCatch: '型・弾薬・演習。記述式のエンジンを最短で',
    ctaButton: 'コアパックを見てみる',
    ctaPose: 'pointing',
  },

  // ----- 2級土木 施工経験記述ライン (2026-05-29) -----
  // 原稿配置: content/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-完成答案集/
  // 2026-06-03 note 公開。
  'civil-2-experience-essay': {
    id: 'civil-2-experience-essay',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m1881a9578027',
    title: '2級土木 施工経験記述｜工種×テーマ別 完成答案集（安全・品質・工程）',
    description:
      '2級土木施工管理技士 第2次検定 問題1（施工経験記述）の完成答案集。安全・品質・工程の3テーマ別に、複数工種のフル完成答案＋自分の現場への置換ガイド＋減点回避の添削例＋採点者視点を収録。令和6年度の新形式（2テーマ必答）と令和5年度以前の3項目形式の両方に対応。',
    shortTitle: '2級土木 施工経験記述 完成答案集',
    shortDescription:
      '安全・品質・工程の3テーマ別 完成答案＋置換ガイド＋採点者視点。R6新形式対応。',
    price: '¥1,980（3本セット）',
    badge: 'note 限定',
    ctaCatch: '経験記述は「完成答案」を見るのが最短です',
    ctaButton: '完成答案集を見てみる',
    ctaPose: 'pointing',
  },

  // ----- 1級土木 施工経験記述ライン (2026-05-29) -----
  // 原稿配置: content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-完成答案集/
  // 2026-06-02 note 公開。
  'civil-1-experience-essay': {
    id: 'civil-1-experience-essay',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m150c9db08902',
    title: '1級土木 施工経験記述｜工種×テーマ別 完成答案集（5管理）',
    description:
      '1級土木施工管理技士 第2次検定 問題1（施工経験記述）の完成答案集。品質・安全・工程・施工計画・環境対策の5管理別に、複数工種のフル完成答案（監理技術者レベル）＋自分の現場への置換ガイド＋減点回避の添削例＋採点者視点を収録。令和6年度の新形式（2テーマ必答）に対応。',
    shortTitle: '1級土木 施工経験記述 完成答案集',
    shortDescription:
      '5管理別 完成答案（監理技術者レベル）＋置換ガイド＋採点者視点。R6新形式対応。',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
    ctaCatch: '経験記述は「完成答案」を見るのが最短です',
    ctaButton: '完成答案集を見てみる',
    ctaPose: 'pointing',
  },

  // 原稿配置: content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集/
  // 過去問の年度別模範答案集（テーマ別の civil-1-experience-essay と対）。2026-06-02 note 公開。
  'civil-1-pastexam-essay': {
    id: 'civil-1-pastexam-essay',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m3a578194a0a9',
    title: '1級土木 施工経験記述｜過去問 模範答案集（R03-R07 年度別）',
    description:
      '1級土木施工管理技士 第2次検定 問題1（施工経験記述）の過去問模範答案集。令和3〜7年度の実際の試験問題を年度別に再掲し、その年の出題管理項目に対し各年度3工事（想定工事①②③）のフル模範答案（監理技術者レベル）＋置換ガイド＋採点者視点を収録。自分の工事に近い例を選べる。令和6年度以降の2テーマ必答にも対応。',
    shortTitle: '1級土木 施工経験記述 過去問模範答案集',
    shortDescription:
      'R03-R07 年度別×各年3工事 フル模範答案（実問題文再掲・監理技術者レベル）。R6新形式対応。',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
    ctaCatch: '過去5年、実際に出た問題で答案を仕上げる',
    ctaButton: '過去問の答案を見てみる',
    ctaPose: 'pointing',
  },

  // 原稿配置: content/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-過去問模範答案集/
  // 2級 過去問の年度別模範答案集。2026-06-02 note 公開（R03-R07 各記事 published）。
  'civil-2-pastexam-essay': {
    id: 'civil-2-pastexam-essay',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/md3aa0f9a37d7',
    title: '2級土木 施工経験記述｜過去問 模範答案集（R03-R07 年度別）',
    description:
      '2級土木施工管理技士 第2次検定 問題1（施工経験記述）の過去問模範答案集。令和3〜7年度の実際の試験問題を年度別に再掲し、その年の出題管理項目に対し各年度3工事（想定工事①②③）のフル模範答案（主任技術者レベル）＋置換ガイド＋採点者視点を収録。自分の工事に近い例を選べる。選択制（R03-R05）と2テーマ必答（R06-R07）の両方に対応。',
    shortTitle: '2級土木 施工経験記述 過去問模範答案集',
    shortDescription:
      'R03-R07 年度別×各年3工事 フル模範答案（実問題文再掲・主任技術者レベル）。選択制/R6新形式対応。',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
    ctaCatch: '過去5年、実際に出た問題で答案を仕上げる',
    ctaButton: '過去問の答案を見てみる',
    ctaPose: 'pointing',
  },

  // ----- 2級土木 想定工事バンク（工事軸・5管理フル・買い切りアンカー）(2026-07-01) -----
  // 原稿配置: content/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/
  // 1級 完全攻略パックの2級移植。中小規模60工事へ拡張、工事軸5管理(3主 品質/安全/工程 ＋ 2備え 施工計画/環境)。
  // 設計: content/note/1級・2級土木/2級土木/2級版-想定工事バンク展開設計.md
  // 60工事フル生成済(keiken-charcount --strict=0 / note-lint OK / 答案重複0)＋無料索引記事00 添付。
  // 2026-07-02: 36記事+索引を公開。2026-08-20: 24記事を追加し、60工事+索引=61件をAPI確認。価格¥5,480は据え置き。
  // 価格は 60工事フルの ¥5,480（設計 §6 の ¥5,480〜6,980 レンジ下限）。
  'civil-2-koji-bank': {
    id: 'civil-2-koji-bank',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m8554e87ca6ec',
    title: '2級土木 施工経験記述｜想定工事バンク（工種×5管理フル）',
    description:
      '2級土木施工管理技士 第2次検定 問題1（施工経験記述）の想定工事バンク。主要8工種と追加ラインナップの60工事を収録し、自分が経験した工事に近い工種を選べば、その1工事で品質・安全・工程の3管理をまとめて準備できる工事起点の完成答案集。各工事で現行形式（令和6年度〜・各250字）と令和5年度以前の3項目形式の両方に対応したフル答案＋自分の現場への置換ガイド＋減点NG→合格答案の添削例＋採点者視点＋2テーマ必答の組合せ早見表を収録。必出の3管理に加え、制度改定に備えた保険として施工計画・環境対策も同じ工事で用意（この2つは現状の経験記述では未出題）。無料の工事起点索引で自分の現場に近い工事を探せる。現場代理人・主任技術者レベルの独自表現で、改変前提のテンプレート（合格を保証するものではありません）。',
    shortTitle: '2級土木 施工経験記述 想定工事バンク',
    shortDescription:
      '工種を選んで5管理を書き分ける工事起点の完成答案集。想定工事60件・必出3管理＋保険2管理・R6新形式対応。',
    price: '¥5,480（60工事フル）',
    badge: 'note 限定',
    ctaCatch: '自分の工種を選ぶだけで、3管理がそろう',
    ctaButton: '想定工事バンクを見てみる',
    ctaPose: 'good-sign',
  },

  // 旧 civil-{1,2}-yosou-essay（未出形式を断定する予想問題集）は 2026-06-02 に退役。
  // 2026-09-01、直前期の「静的な本番演習」だけを買い切り例外として再設計した。
  // 月例更新・添削・追加予想は引き続きメンバーシップ固有価値。下記2商品は公開時点で内容を固定し、
  // 施工経験記述の改変前提例＋学科記述を含む印刷用模試3回・PDF6冊として販売する。
  'civil-1-r8-mock3-pdf': {
    id: 'civil-1-r8-mock3-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nc2a33b52a2f7',
    title: '1級土木 令和8年度 第2次検定｜予想模試3回（施工経験記述＋学科記述・PDF6冊）',
    description:
      '1級土木施工管理技士 令和8年度 第2次検定の買い切り直前演習。施工経験記述は工程管理を軸に3組合せ・12区画の改変前提記述例を収録し、印刷用PDFは本番形式3回分を問題冊子と解答解説に分けた全6冊・66ページ。必須・選択問題、独自配点、自己採点、誤答別の復習計画まで一体化した自主教材。出題を保証するものではありません。',
    shortTitle: '1級土木 R8二次 予想模試3回',
    shortDescription: '施工経験記述3組合せ＋学科記述。本番形式3回・PDF6冊、自己採点と復習計画つき。',
    price: '¥2,480（予想模試3回・PDF6冊）',
    badge: 'R8 直前 PDF教材',
    ctaCatch: '2時間45分、選択から見直しまで通して試す',
    ctaButton: '予想模試3回を見てみる',
    ctaPose: 'pointing',
  },
  'civil-2-r8-mock3-pdf': {
    id: 'civil-2-r8-mock3-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n50aefe3ad7da',
    title: '2級土木 令和8年度 第2次検定｜予想模試3回（施工経験記述＋学科記述・PDF6冊）',
    description:
      '2級土木施工管理技士 令和8年度 第2次検定の買い切り直前演習。施工経験記述は品質・安全・工程の3組合せ・12区画の改変前提記述例を収録し、印刷用PDFは本番形式3回分を問題冊子と解答解説に分けた全6冊・51ページ。必須4問＋選択2問、独自配点、自己採点、復習計画まで一体化した自主教材。出題を保証するものではありません。',
    shortTitle: '2級土木 R8二次 予想模試3回',
    shortDescription: '施工経験記述3組合せ＋学科記述。本番形式3回・PDF6冊、必須4問＋選択2問を通し演習。',
    price: '¥1,980（予想模試3回・PDF6冊）',
    badge: 'R8 直前 PDF教材',
    ctaCatch: '120分、必須4問＋選択2問を解き切る',
    ctaButton: '予想模試3回を見てみる',
    ctaPose: 'pointing',
  },

  // 原稿配置: content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全/
  // 予想問題集を転換。5管理の2テーマ全10組合せ × 想定工事①②③ で現行形式(R06+)を全網羅。
  // 全10記事生成済(keiken-charcount --strict=0 / note-lint OK / 答案重複0)。published: true（noteUrl・カバー・sidebar 生成済）。
  'civil-1-combo-essay': {
    id: 'civil-1-combo-essay',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m74cfd7c695d6',
    title: '1級土木 施工経験記述｜2テーマ組合せ大全（5管理 全10組合せ）',
    description:
      '1級土木施工管理技士 第2次検定 問題1（施工経験記述）の2テーマ組合せ大全。令和6年度以降の現行形式（5管理から2テーマが選ばれ、同一工事で設問1・設問2に書き分ける・同一内容不可）に対し、C(5,2)=10通りの全組合せを網羅。各組合せに別現場・別工種の想定工事①②③のフル模範答案（監理技術者レベル）を収録し、どの2テーマが出ても自分の経験工事に当てはめて書ける。投機的な予想ではなく現行形式の全網羅。',
    shortTitle: '1級土木 施工経験記述 2テーマ組合せ大全',
    shortDescription:
      '5管理の2テーマ全10組合せ × 想定工事①②③ フル模範答案。現行形式（R06+）を全網羅。',
    price: '¥3,480（10本セット、約65%OFF）',
    badge: 'note 限定',
    ctaCatch: '2テーマ、どの組合せが出ても書ける',
    ctaButton: '全10組合せを見てみる',
    ctaPose: 'pointing',
  },

  // ----- 1級土木 経験記述 完全攻略パック（旗艦・買い切り）(2026-06-30 scaffold) -----
  // 既存3買い切り（完成答案集・過去問模範答案集・2テーマ組合せ大全）を「想定工事 索引」で束ね、
  // 薄い工種（コンクリート工・トンネル等の空セル10）を補充した上位SKU。会員には入れない（非重複・§2.3）。
  // 受験料アンカー: 1級フル¥24,000（一次¥12,000＋二次¥12,000）に対し¥9,800は二次の約8割。
  // 設計: content/note/1級・2級土木/1級土木/1級土木-想定工事バンク設計.md
  // マガジン枠は note 公開済。2026-08-20 に150工事+索引=151件の収録をAPI確認済み。
  // 空/部分パックを広告しないよう published は収録完了まで false 据え置き（公開ゲート）。収録完了後に true 化。
  // 2級は別SKU(¥4,980前後)。
  'civil-1-keiken-complete-pack': {
    id: 'civil-1-keiken-complete-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m8290970a7f05',
    // サイト CTA は有料マガジンへ直行させず、無料の「想定工事150 索引」に着地させる
    // （工事起点で選ぶ front-door → そこから pack/単品へ）。noteUrl はマガジン SoT で不変。
    landingUrl: 'https://note.com/dobokunote/n/n9cf7e60661fa',
    title: '1級土木 施工経験記述｜完全攻略パック（想定工事×5管理 全網羅）',
    description:
      '1級土木施工管理技士 第2次検定 問題1（施工経験記述）の完全攻略パック。自分の現場に近い「想定工事」を選び、その工事で品質・工程・安全・施工計画・環境対策の5管理をどう書くかを一望できる工事起点の索引を背骨に、想定工事150件の完成答案、過去問模範答案集（R03-R07）、2テーマ組合せ大全の全模範答案（監理技術者レベル）を1パックに統合。主要9工種から維持更新・災害復旧・専門領域まで網羅し、令和6年度以降の2テーマ必答に対応。各答案に自分の現場への置換ガイドと採点者視点の減点ポイントを収録。※本書は改変前提のテンプレートで、合格を保証するものではありません。',
    shortTitle: '1級土木 施工経験記述 完全攻略パック',
    shortDescription:
      '想定工事150件から選んで5管理を書き分ける工事起点の索引＋関連答案を統合。維持更新・災害復旧・専門領域、R6新形式まで対応。',
    price: '¥9,800（完全攻略パック）',
    badge: 'note 限定',
    // landingUrl（無料の想定工事150 索引）へ着地するため、ボタン文言も「索引を見る」に合わせる。
    ctaCatch: '自分の現場に近い工事を選んで、5管理を書き分ける',
    ctaButton: '想定工事150の索引を見てみる',
    ctaPose: 'good-sign',
  },

  // ===== 二次 学科記述（問題2〜11）買い切りライン (2026-07-03 設計登録) =====
  // 既存 civil 買い切りは全て問題1（施工経験記述）。二次配点の約4割を占める学科記述（問題2〜11）と
  // 低価格エントリー帯が完全空白だったため新設（noteコンテンツ計画.md §9）。
  // Red Line 整合: サイト secondary-* 無料は「年度別・R03-R07・全問解説」。本ラインは
  //   「テーマ縦断・R03-R07 5年・出題頻度データ・出る順・暗記特化」の加工付加価値。
  //   ただし site の secondary-*-past-problems（テーマ別・傾向表つき・published:true）と論点が重なる。
  //   2026-07-03 オーナー判断＝カニバリは一旦考慮せず作って計測（Red Line #4 を当ラインでは適用保留）。
  //   予想（フロー）ではなく過去問の後ろ向き分析（ストック）のため会員フローと非競合（Red Line #10）。
  //   完成答案と同様に買い切り○＋会員ライブラリ内包○の二重配置（§2.2 踏襲）。
  // 制作は別セッション。公開時: 原稿制作 → note マガジン作成 → cover/sidebar 生成 →
  //   noteUrl 埋め + published: true。SKU は wire-ahead（published:false / noteUrl:''）。
  // 投入時期: P1→8月中旬 / P3a→8月下旬 / P5→9月上旬 / P2・P3b→10月上旬（§5.4）。

  // P1: 1級 二次学科記述 テーマ別 出る順（5本セット・単品¥580）
  //   実データ(R03-R07)の出題分布から当初「7本」→「5本」に最適化(2026-07-03)。
  //   品質管理は独立出題が薄い(年0.2問)ため横断集約、安全と法規は同じ労安則群のため統合。
  'civil-1-gakka-kijutsu': {
    id: 'civil-1-gakka-kijutsu',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mcfe1059b3335',
    title: '1級土木 二次学科記述｜テーマ別 出る順 完全攻略（問題2〜11）',
    description:
      '1級土木施工管理技士 第2次検定の学科記述（問題2〜11）を、年度別ではなくテーマ別に横断再編した完全攻略集。土工／コンクリート工／安全管理・法規／施工計画・環境／品質管理の5本立てで、令和3〜7年度の5年分の出題を分野ごとに束ね、出題頻度マトリクス（何が何年に出たか）と出る順ランキング、設問パターン別の解答の型、頻出語句の穴埋めリストを収録。過去問の客観的な頻度分析に基づく後ろ向きの整理で、経験記述（問題1）で埋まっていた対策の穴を学科記述側から埋める。※改変・自作の学習前提。合格を保証するものではありません。',
    shortTitle: '1級土木 二次学科記述 テーマ別出る順',
    shortDescription:
      '問題2〜11をテーマ別に横断再編。5年分の出題頻度＋出る順＋解答の型＋頻出語句。5本セット。',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
    ctaCatch: '問題2〜11、5年分の「出る順」で詰める',
    ctaButton: '出る順を見てみる',
    ctaPose: 'pointing',
  },

  // P2: 2級 二次学科記述 テーマ別 出る順（P1 の2級移植・5本セット）
  'civil-2-gakka-kijutsu': {
    id: 'civil-2-gakka-kijutsu',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m9a09a8982734',
    title: '2級土木 二次学科記述｜テーマ別 出る順 完全攻略（問題2〜9）',
    description:
      '2級土木施工管理技士 第2次検定の学科記述（問題2〜9）を、年度別ではなくテーマ別に横断再編した完全攻略集。土工／コンクリート工／安全管理・法規／施工計画・環境／品質管理の5本立てで、令和3〜7年度の出題を分野ごとに束ね、出題頻度と出る順、設問パターン別の解答の型、頻出語句の穴埋めリストを収録。過去問の客観的な頻度分析に基づく後ろ向きの整理。※改変・自作の学習前提。合格を保証するものではありません。',
    shortTitle: '2級土木 二次学科記述 テーマ別出る順',
    shortDescription:
      '問題2〜9をテーマ別に横断再編。出題頻度＋出る順＋解答の型＋頻出語句。5本セット。',
    price: '¥1,980（5本セット）',
    badge: 'note 限定',
    ctaCatch: '問題2〜9、5年分の「出る順」で詰める',
    ctaButton: '出る順を見てみる',
    ctaPose: 'pointing',
  },

  // P3a: 1級 学科記述 直前暗記ノート（P1副産物・赤シート対応PDF添付・エントリー層）
  'civil-1-anki-note': {
    id: 'civil-1-anki-note',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/na84b001e827e',
    title: '1級土木 二次学科記述｜直前暗記ノート（穴埋め頻出語句 一問一答）',
    description:
      '1級土木施工管理技士 第2次検定の学科記述（問題2〜11）で問われる穴埋め頻出語句を、分野別に一問一答へ整理した直前暗記ノート。令和3〜7年度の出題語句から頻出のものを抽出し、150〜250問の一問一答＋赤シート対応の印刷用PDF（A5・現場ポケット携行）を添付。試験直前の総仕上げ・スキマ時間の詰め込みに特化した最小構成のエントリー商品。※合格を保証するものではありません。',
    shortTitle: '1級土木 学科記述 直前暗記ノート',
    shortDescription:
      '穴埋め頻出語句の一問一答150〜250問＋赤シート対応PDF。直前・スキマ詰め込み用。',
    price: '¥980',
    badge: 'note 限定',
    ctaCatch: '試験前日、赤シートで詰め込む一問一答',
    ctaButton: '暗記ノートを見てみる',
    ctaPose: 'pointing',
  },
  // 一次 出る順 合格ノート（12年頻度分析・§10.3）。施工管理法の出る順＋捨て問戦略の書き下ろし。
  'civil-1-ichiji-ronten': {
    id: 'civil-1-ichiji-ronten',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nec34238ca6d6',
    title: '1級土木 第1次検定｜出る順 合格ノート（過去12年の頻度分析で施工管理法を攻める）',
    description:
      '1級土木施工管理技士 第1次検定の平成26〜令和7年度 全1162問を機械集計し、施工管理法（安全・品質・施工計画・工程・環境）の必須分野と得点源の法規を「出る順」に整理した書き下ろしノート。各論点の12年中の出題年数・件数を明示し、どこに時間を集中しどこを薄くするかの学習配分＋専門土木の捨て問戦略まで示す。',
    shortTitle: '1級土木 一次 出る順 合格ノート',
    shortDescription:
      '過去12年1162問の頻度分析で施工管理法の出る順＋捨て問戦略を整理。',
    price: '¥1,480',
    badge: 'note 限定',
  },
  // R8 二次 出題分析・直前重点（ココナラ実測に基づく入口商品。§10.2）。単発記事・後ろ向き実績分析。
  'civil-1-r8-bunseki': {
    id: 'civil-1-r8-bunseki',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nd68f3f6b5f9e',
    title: '1級土木 二次｜出題分析と直前の重点（過去5年の実績から攻め所を絞る）',
    description:
      '1級土木施工管理技士 第2次検定の令和3〜7年度を後ろ向きに分析し、経験記述テーマの出題履歴と学科記述の出る順トップ論点を横断で整理。直前2週間で「どのテーマを・どの順で・何日かけて」回すかを日割りロードマップに落とした、直前期の優先順位づけ記事。',
    shortTitle: '1級土木 二次 出題分析・直前重点',
    shortDescription:
      '過去5年の出題実績から出る順トップ論点と直前2週間ロードマップを整理。',
    price: '¥980',
    badge: 'note 限定',
  },

  // P3b: 2級 学科記述 直前暗記ノート（どぼくじら¥500×500部超の低価格エントリー枠に対抗）
  'civil-2-anki-note': {
    id: 'civil-2-anki-note',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n793523a059e5',
    title: '2級土木 二次学科記述｜直前暗記ノート（穴埋め頻出語句 一問一答）',
    description:
      '2級土木施工管理技士 第2次検定の学科記述（問題2〜9）で問われる穴埋め頻出語句を、分野別に一問一答へ整理した直前暗記ノート。令和3〜7年度の出題語句から頻出のものを抽出し、一問一答＋赤シート対応の印刷用PDF（A5・現場ポケット携行）を添付。試験直前の総仕上げに特化した最小構成・低価格のエントリー商品。※合格を保証するものではありません。',
    shortTitle: '2級土木 学科記述 直前暗記ノート',
    shortDescription:
      '穴埋め頻出語句の一問一答＋赤シート対応PDF。直前・スキマ詰め込み用の低価格エントリー。',
    price: '¥580',
    badge: 'note 限定',
    ctaCatch: '試験前日、赤シートで詰め込む一問一答',
    ctaButton: '暗記ノートを見てみる',
    ctaPose: 'pointing',
  },

  // DN-0014: 1級土木 テキスト精読ガイド（総監 tankan-reading-guide の横展開・既存ガイド再包装）
  // 全2巻完成（2026-08-26）。①施工管理・法規編（施工計画・工程管理・品質管理・安全管理・環境保全・法規）
  // ②土木一般・共通工学編（土工・建設機械・コンクリート工・基礎工・測量・解体工事）。
  // 価格・単品/バンドルの別・公開タイミングはユーザー判断待ち（現状は無料の2記事として公開準備）。
  'civil-1-reading-guide': {
    id: 'civil-1-reading-guide',
    published: false,
    noteUrl: '',
    title: '1級土木 テキスト精読ガイド（全2巻・出題頻度・優先度つき）',
    description:
      '1級土木施工管理技士 第1次検定の全12分野（施工計画・工程管理・品質管理・安全管理・環境保全・法規・土工・建設機械・コンクリート工・基礎工・測量・解体工事）を、出題頻度・優先度つきで整理した精読ガイド全2巻。各テーマから doboku-note の詳細解説記事へ直リンク。',
    shortTitle: '1級土木 精読ガイド（全2巻）',
    shortDescription: '第1次検定の全12分野を出題頻度・優先度で整理。詳細解説への直リンクつき。',
    badge: 'note 限定',
    ctaCatch: '何から手をつけるべきか、出題頻度で分かる',
    ctaButton: '精読ガイドを見てみる',
    ctaPose: 'pointing',
  },

  // DN-0014②: 2級土木 テキスト精読ガイド（1級版 civil-1-reading-guide の横展開・既存ガイド再包装）
  // 全1巻（2026-08-26）。2級は環境保全・建設機械・測量・解体工事の分野別詳細ガイドが未整備のため、
  // category-curriculum.json の civil-construction-2 が持つ3ブロック（土木一般/施工管理法/法規）
  // 8分野に絞って1本で構成（1級のような2巻分割はしない）。
  // 価格・単品/バンドルの別・公開タイミングはユーザー判断待ち（現状は無料の1記事として公開準備）。
  'civil-2-reading-guide': {
    id: 'civil-2-reading-guide',
    published: false,
    noteUrl: '',
    title: '2級土木 テキスト精読ガイド（全1巻・出題頻度・優先度つき）',
    description:
      '2級土木施工管理技士 第1次検定の土木一般・施工管理法・法規の8分野（土工・コンクリート工・基礎工・施工計画・工程管理・品質管理・安全管理・法規）を、出題頻度・優先度つきで整理した精読ガイド。各テーマから doboku-note の詳細解説記事へ直リンク。',
    shortTitle: '2級土木 精読ガイド',
    shortDescription: '第1次検定の8分野を出題頻度・優先度で整理。詳細解説への直リンクつき。',
    badge: 'note 限定',
    ctaCatch: '何から手をつけるべきか、出題頻度で分かる',
    ctaButton: '精読ガイドを見てみる',
    ctaPose: 'pointing',
  },

  // P5: 1級 二次まるごとパック（新最上位アンカー・経験記述完全攻略¥9,800＋P1＋P3aを束ね）
  // 単品合計 ¥13,260（¥9,800＋¥2,480＋¥980）→ ¥11,800。既存¥9,800は残置（Red Line #8）。
  // 商品ページに「伴走・添削が欲しい方は会員へ」の分岐を明記（会員より魅力的に見えすぎ回避）。
  // P1/P3a 完成後に束ねるだけ（索引記事1本のみ新規）。
  'civil-1-niji-marugoto-pack': {
    id: 'civil-1-niji-marugoto-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/md29a34906314',
    // サイト CTA は有料マガジンへ直行させず、無料の「まるごとパック 総合案内」に着地させる
    // （3つの柱の全体像を見せてから購入へ）。noteUrl はマガジン SoT で不変。
    landingUrl: 'https://note.com/dobokunote/n/n824a4ea20acf',
    title: '1級土木 二次検定まるごとパック（経験記述＋学科記述＋直前暗記）',
    description:
      '1級土木施工管理技士 第2次検定を、経験記述（問題1）と学科記述（問題2〜11）の両面からまるごと対策する最上位パック。施工経験記述 完全攻略パック（想定工事×5管理の全模範答案）と、二次学科記述 テーマ別出る順（5年分の頻度分析＋解答の型）、直前暗記ノート（穴埋め頻出語句 一問一答）を1つに統合。単品合計より割安に束ねた買い切りアンカー。個別添削や月例予想での伴走が欲しい方は、メンバーシップ「土木セコカン合格ラボ」が別途あります。※改変前提のテンプレートで、合格を保証するものではありません。',
    shortTitle: '1級土木 二次検定まるごとパック',
    shortDescription:
      '経験記述 完全攻略＋学科記述 出る順＋直前暗記ノートを統合した最上位買い切りパック。',
    price: '¥11,800（二次まるごと）',
    badge: 'note 限定',
    // landingUrl（無料の総合案内）へ着地するため、ボタン文言も「案内を見る」に合わせる。
    ctaCatch: '経験記述も学科記述も、二次はこれ1つで',
    ctaButton: 'まるごとパックの案内を見てみる',
    ctaPose: 'good-sign',
  },

  // ----- 1級・2級土木 メンバーシップ「土木セコカン合格ラボ」(2026-06-23 配線) -----
  // 原稿配置: content/note/1級・2級土木/メンバーシップ/（予想問題マガジン・学科記述予想・添削事例）
  // 会員の固有価値＝フロー（予想問題）＋個別（経験記述添削）。完成答案ライブラリ（104本）は
  // 2026-07-01 転換で会員特典マガジンに内包（入会の引き金）しつつ買い切りでも購入可能なまま残置
  // ＝二重配置。フロー（予想・添削）だけは買い切りに出さない一線を守る
  // （noteコンテンツ計画.md §1.4 / §2.3 / Red Line #10）。
  // note 上は 1 メンバーシップ・2 プラン（通年¥1,480 / 添削つき¥4,980）＝単一 URL。
  // 添削つきは 2026-08-06 に ¥2,980 から改定（note は会費変更不可のためプランを作り直した）。
  // 2026-07-30 公開反映: note でメンバーシップ公開済み。noteUrl は加入ページ（/membership/join）、
  // published: true。加入導線には /membership でなく実遷移先の /membership/join を使う。
  // CTA は 1級・2級土木の 経験記述系・二次系・guide・カテゴリ入口で発火（magazine-placement.ts）。
  // 会員特典マガジン（¥0・会員限定記事のみを収める器）。単体で売る商品ではなく、
  // 「土木セコカン合格ラボ」の両プランに紐づけて週次お題を自動配信するための受け皿。
  // 2026-08-06 新設。note 側に実在する（mbe07bd5cecda）のにここへ未配線で、
  // note-live-audit.yml の SoT 突合が exit 2 で落ち続けていた（2026-08-17 配線）。
  'civil-membership-odai-lab': {
    id: 'civil-membership-odai-lab',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mbe07bd5cecda',
    title: '経験記述 週次お題ラボ｜1級・2級土木（会員専用）',
    description:
      '土木セコカン合格ラボの会員特典マガジン。1級・2級土木施工管理技士の施工経験記述について、毎週1テーマの「お題」を会員限定で配信します。模範答案を読むのではなく、自分が経験した工事でお題に答える演習形式で、5管理（安全・品質・工程・施工計画・環境）を一巡します。各回は設問・出題予想の根拠・採点者の着眼点・やりがちなNG・級別の答案形式差で構成。添削つきプランではこのお題への答案を毎週1本、NG→OK赤入れ＋採点者視点で返します。会員限定のため単体購入はできません。',
    shortTitle: '経験記述 週次お題ラボ（会員専用）',
    shortDescription:
      '毎週1テーマの経験記述お題を会員限定で配信。自分の工事で書く演習形式で5管理を一巡する。',
    price: '会員特典（単体購入不可）',
    badge: 'メンバーシップ特典',
  },

  'civil-membership-lab': {
    id: 'civil-membership-lab',
    published: true,
    noteUrl: 'https://note.com/dobokunote/membership/join',
    title: '土木セコカン合格ラボ｜月例予想＋経験記述添削メンバーシップ',
    description:
      '1級・2級土木施工管理技士の合格伴走メンバーシップ。施工経験記述の完成答案ライブラリが読み放題で、自分の現場に近い工種の書き方をいつでも確認できます。さらに月例の予想問題（学科記述・経験記述のテーマ予想）で手を動かし、受験シーズンは施工経験記述をマンツーマン添削（NG→OK赤入れ＋採点者視点）で合格水準まで引き上げます。通年プラン（ライブラリ読み放題＋月例予想配信）と添削つきプラン（受験シーズン・定員制）の2プラン。最短ルートで一発合格を目指す人向けの伴走ラボです。印刷用PDFの配布は買い切りマガジンの特典です。※本会員は合格を保証するものではありません。',
    shortTitle: '土木セコカン合格ラボ（会員）',
    shortDescription:
      '完成答案ライブラリ読み放題＋月例の予想問題＋経験記述マンツーマン添削で合格まで伴走。通年／添削つきの2プラン。',
    price: '月額 ¥1,480〜（2プラン）',
    badge: 'メンバーシップ',
    ctaCatch: '独学のまま迷っていませんか？合格まで伴走します',
    ctaButton: '合格ラボを見てみる',
    ctaPose: 'smile',
  },

  // 原稿配置: content/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集/
  // コンクリート診断士 記述式（問題A・問題B）模範答案集。劣化機構別フル答案 8 本。
  // 2026-07-31 公開。8記事とも有料境界の検証を通してから投稿し、マガジンへ 8/8 収録済み
  //（note API で実体確認）。published:true により guide-essay / textbook-assessment /
  // textbook-repair の3面で CTA が発火する（magazine-placement.ts 配線済み）。
  'cd-essay-magazine': {
    id: 'cd-essay-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf2a132408b6f',
    title: 'コンクリート診断士 記述式｜問題A・問題B 模範答案集',
    description:
      'コンクリート診断士試験 記述式（問題A・問題B）のフル模範答案集。問題A（資質・論述）2本、問題B（具体構造物の診断・対策提案）5本を塩害・中性化・ASR・凍害・疲労複合の劣化機構別に収録。答案の型と採点視点をまとめた解法ガイド1本付き。想定問題はオリジナル代表例、固有数値は置換前提。',
    shortTitle: 'コンクリート診断士 記述式 模範答案集',
    shortDescription:
      '問題A・問題Bのフル模範答案を劣化機構別に8本。変状把握→劣化機構推定→調査→評価→対策の型を反復。',
    price: '¥2,980（8本セット）',
    badge: 'note 限定 教材',
  },

  // 原稿配置: content/note/コンクリート主任技士/magazines/コンクリート主任技士-小論文-模範答案集/
  // コンクリート主任技士 小論文（記述式）模範答案集。解法ガイド + テーマ別フル模範小論文 4 本。
  // concrete-chief-engineer vertical は公開済 (guide/textbook/primary 計19記事 published:true)。
  // CTA は guide-essay 等の小論文系ページで発火。
  // 2026-08-13: マガジンを note 上に作成し 5 本を収録（API で 0→5 件を実体確認）→ published: true。
  //   単品は 2026-07-23 から各 ¥500 で公開済みだったが、マガジン（セット ¥1,480）が無く
  //   単品 5 本 = ¥2,500 でしか買えない状態だった。同日、ディレクトリを「主任技士」へ改名し、
  //   タイトル・本文・カバーに残っていた旧表記（技師）の誤記もライブ反映で解消済み。
  'cce-essay-magazine': {
    id: 'cce-essay-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m758aba129301',
    title: 'コンクリート主任技士 小論文｜評価される答案の型 + テーマ別 模範答案集',
    description:
      'コンクリート主任技士試験の小論文対策フル模範答案集。択一とは評価軸が異なる小論文（実務経験を技術論述に変換する試験）を、答案の型と4観点で攻略する。解法ガイド1本＋テーマ別フル模範小論文4本（耐久性・品質管理・環境配慮・施工トラブル）。各テーマは想定問題＋答案の方針＋1800字級以上のフル模範小論文（固有数値は置換前提）＋採点者視点＋置換ガイドで構成。実在過去問の逐語再現はしない。',
    shortTitle: 'コンクリート主任技士 小論文 模範答案集',
    shortDescription:
      '解法ガイド＋テーマ別フル模範小論文4本（耐久性・品質管理・環境配慮・施工トラブル）。序論・本論・結論の型と採点4観点で攻略。',
    price: '¥2,480（5本セット）',
    badge: 'note 限定 教材',
  },

  // 既存 cce-essay-magazine の上位版。8実務ペルソナ×4テーマ=32本 ＋ 無料のペルソナ選択ガイド1本＝全33記事。
  // 2026-08-22: セット¥5,980 / 単品¥980 で価格確定。単品¥980 は既存 cce-essay-magazine と同一の単価ライン。
  // 企画・経緯: content/note/1級・2級土木/noteコンテンツ計画.md §8.2
  // （旧実装契約 .claude/plans/DN-0095-civil-concrete-answer-expansion/ は撤収済み・2026-08-27・経緯は git 履歴）
  'cce-essay-persona-pack': {
    id: 'cce-essay-persona-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m4ee0a96dce31',
    title: 'コンクリート主任技士 小論文｜実務立場別 模範答案集（8つの実務立場×4テーマ 全32答案）',
    description:
      'コンクリート主任技士試験の小論文を、受験者の実務立場ごとに書き分けた模範答案集。生コン工場・品質管理／プレキャストコンクリート製品工場／ゼネコン土木施工／ゼネコン建築施工／発注者・監督員／設計・建設コンサルタント／試験・検査機関／維持管理・補修の8立場それぞれについて、同じ4テーマ（品質管理・耐久性・環境配慮・施工トラブル）を立場固有の権限・判断対象・指標で具体化する。小論文は実務経験を技術論述に変換する試験であり、自分の権限では決められないことを書く「越権記述」が減点につながるため、立場ごとに書ける論点と書けない論点を明示した。各記事は想定問題（オリジナル・逐語再現ではない）＋答案の方針＋序論・本論・結論のフル模範小論文（各2,200〜2,500字）＋採点者視点のチェックポイント＋自分の案件への応用（置換ガイド）で構成。無料の「ペルソナ選択ガイド」で、勤務先と主な業務から自分に近い立場を3ステップで選べる。答案は各立場を想定した答案モデルであり、著者自身の実職歴を意味しない。',
    shortTitle: 'コンクリート主任技士 小論文 実務立場別答案集',
    shortDescription:
      '8つの実務立場×4テーマ＝全32答案。製造・施工・発注者・設計・試験・維持管理まで、自分の実務に近い立場で答案が書ける。',
    price: '¥5,980（33記事セット・単品¥980）',
    badge: 'note 限定 教材',
  },

  // 原稿配置: content/note/コンクリート主任技士/配合計算-実戦演習/article.md
  // 小論文ラインに対する択一の入口商品。既存 Kindle g-02 の過去問本文は流用せず、
  // note 専用のオリジナル計算問題12問（途中式・全選択肢解説）で KDP Select と分離する。
  // 公開後は primary/textbook-mix-design の2面から分野一致で送客する。
  'cce-mix-calculation-practice': {
    id: 'cce-mix-calculation-practice',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n5a55ae6dc16b',
    title: 'コンクリート主任技士｜配合計算 実戦演習12問（途中式・全選択肢解説）',
    description:
      'コンクリート主任技士の四肢択一で頻出する配合計算を、note専用のオリジナル問題12問で反復する実戦教材。水セメント比、表面水補正、絶対容積、細骨材率、空気量、混合結合材、配合修正、減水率までを収録し、正答の途中式と3つの誤答原因を全問解説する。',
    shortTitle: '主任技士 配合計算 実戦演習12問',
    shortDescription: '配合計算12問。途中式と全選択肢の誤答原因まで解説。',
    price: '¥1,480',
    badge: 'note 限定 教材',
  },

  // 原稿配置: content/note/コンクリート主任技士/四肢択一-R8予想50問/article.md
  // 分野別8記事の計画を、読者が一度に模試運用できる単品50問へ統合して実装。
  // 8分野を横断し、正答だけでなく全誤答肢の理由と分野別採点表を収録する。
  'cce-r8-mc-50': {
    id: 'cce-r8-mc-50',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nfad294307263',
    title: 'コンクリート主任技士｜令和8年度 四肢択一 予想50問（8分野・全選択肢解説）',
    description:
      'コンクリート主任技士の令和8年度四肢択一対策として、材料・性質・耐久性・配合・製造品質管理・施工・製品・構造設計の8分野を横断するオリジナル予想50問。配合・統計は途中式、全問に4肢の正誤理由、分野別採点表と無料テキストへの復習導線を付ける。出題的中を保証するものではない。',
    shortTitle: '主任技士 R8四肢択一 予想50問',
    shortDescription: '8分野・オリジナル50問。全誤答肢の理由と分野別採点表つき。',
    price: '¥1,980',
    badge: 'R8 予想教材',
  },

  // 原稿配置: content/note/コンクリート技士/配合計算-JIS判断-実戦演習/article.md
  // 2026年度に新設した concrete-engineer vertical の入口商品。無料48問と重複しない
  // 複合計算6問＋品質・JIS判断6問を、途中式／全誤答肢解説つきで収録する。
  'ce-mix-jis-practice': {
    id: 'ce-mix-jis-practice',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n63568f1ae404',
    title: 'コンクリート技士｜配合計算・JIS判断 実戦演習12問（途中式・全選択肢解説）',
    description:
      'コンクリート技士の四肢択一対策として、配合計算6問と品質・JIS判断6問を収録したnote専用オリジナル教材。水結合材比、絶対容積、表面水、吸水、空気量、バッチ換算と、呼び方、試料採取、スランプ、空気量、圧縮強度供試体、塩化物・トレーサビリティーを、途中式または判断手順と全誤答肢の理由まで解説する。',
    shortTitle: 'コンクリート技士 計算・JIS判断12問',
    shortDescription: '複合計算6問＋品質・JIS判断6問。途中式と全誤答肢の理由まで解説。',
    price: '¥1,280',
    badge: 'note 限定 教材',
  },

  // 技術士 建設部門 2次（BK シリーズ）。公開済み（published:true・noteUrl 埋め済み）。
  // CTA は pe-construction-r0X-required ページ等で発火。価格ラダーは各エントリ price 参照。
  'pe-construction-required-magazine': {
    id: 'pe-construction-required-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m0f3bc3933454',
    title: '技術士 建設部門 2次｜必須科目I 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門で全受験者必須の「必須科目I」を、令和3〜7年度の5年分まとめた模範解答集。元・地方自治体の土木職（発注者）視点で、安全・品質・コスト・環境の統合判断や住民対応・行政責任といった採点軸を補う。各年度に設問全文（出典明記）を再掲し、設問構成と論述方針・I-1とI-2の両問それぞれのフル模範解答（各約1,600字・本番で選ぶ側の問題をどちらを選んでも対応可）・採点者が見るポイントを収録。さらに令和8年度の出題傾向・国土交通行政の重点施策・改訂コンピテンシーから導出した予想問題6テーマ（担い手×建設DX／気候変動適応・防災／インフラ老朽化・AM／カーボンニュートラル・GX／国土形成・地域づくり／インフラDX・データ活用）を収録。各テーマは最重要課題の選び方で分岐するA案・B案の2バージョン併記で、自分の専門・経験に近い案を選べる。各記事に印刷用PDF付き（全11記事）。',
    shortTitle: '建設部門2次｜必須I 模範解答集',
    shortDescription:
      'R03〜R07＋R8予想6テーマ（各A/B案2バージョン）の全11記事。必須科目I を発注者視点でフル解答。',
    price: '¥3,480（11記事セット・単品¥780、約59%OFF）',
    badge: 'note 限定',
  },

  'pe-construction-road-magazine': {
    id: 'pe-construction-road-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m9e825cfd8348',
    title: '技術士 建設部門 2次｜道路 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「道路」選択科目の令和3〜7年度を、II-1（全4設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。道路科目の合格者かつ元・地方自治体の土木職（発注者）の視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・国土交通行政の重点施策・改訂コンピテンシーから導出した予想問題＋フル模範解答（II-1、II-2 は計画系／維持管理／防災施工／施工系の4テーマ、III は脱炭素／4車線化／事前防災／xROAD の4テーマ＝計9記事）を収録した試験直前対策付き（全24記事）。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜道路 模範解答集',
    shortDescription:
      'R03〜R07＋R8予想 全24記事（予想は II-2・III を各4テーマ網羅）。道路科目 合格者＋発注者視点でフル解答。',
    price: '¥3,480（24記事セット・単品¥780、約81%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-river-coast-magazine': {
    id: 'pe-construction-river-coast-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mba17c3f8b894',
    title: '技術士 建設部門 2次｜河川・砂防及び海岸・海洋 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「河川、砂防及び海岸・海洋」選択科目の令和3〜7年度を、II-1（全4設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集＋令和8年度予想（過去問 5年分×3区分＝15記事 ＋ R8予想3記事 ＝ 全18記事）。元・地方自治体の土木職（発注者）として河川・砂防・海岸の発注・監督・積算審査に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。',
    shortTitle: '建設部門2次｜河川砂防 模範解答集',
    shortDescription:
      'R03〜R07＋R8予想の II-1/II-2/III 全18記事。河川・砂防・海岸を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-urban-planning-magazine': {
    id: 'pe-construction-urban-planning-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mc8bd949f1f51',
    title: '技術士 建設部門 2次｜都市及び地方計画 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「都市及び地方計画」選択科目の令和3〜7年度を、II-1（全4設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集＋令和8年度予想（過去問 5年分×3区分＝15記事 ＋ R8予想3記事 ＝ 全18記事）。元・地方自治体の土木職（発注者）として立地適正化・市街地再開発・公園緑地等の都市計画・まちづくり関連業務の発注・監督に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜都市計画 模範解答集',
    shortDescription:
      'R03〜R07＋R8予想 の II-1/II-2/III 全18記事。都市計画・まちづくりを発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-geotechnical-magazine': {
    id: 'pe-construction-geotechnical-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/me7ebb48b319e',
    title: '技術士 建設部門 2次｜土質及び基礎 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「土質及び基礎」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として軟弱地盤・基礎工事の発注・監督・地盤調査審査に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（II-1/II-2/IIIの3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜土質基礎 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。土質・基礎を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-steel-concrete-magazine': {
    id: 'pe-construction-steel-concrete-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/md38f1de30c31',
    title: '技術士 建設部門 2次｜鋼構造及びコンクリート 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「鋼構造及びコンクリート」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として橋梁・コンクリート構造物工事の発注・監督・点検に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜鋼コン 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。鋼構造・コンクリートを発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-construction-planning-magazine': {
    id: 'pe-construction-construction-planning-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m1562f66d9654',
    title: '技術士 建設部門 2次｜施工計画・施工設備及び積算 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「施工計画、施工設備及び積算」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として施工計画・積算審査・施工監督に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜施工計画 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。施工計画・積算を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-environment-magazine': {
    id: 'pe-construction-environment-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m76f1e545c541',
    title: '技術士 建設部門 2次｜建設環境 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「建設環境」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として環境影響評価の発注・審査・環境保全対策に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜建設環境 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。建設環境を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-port-airport-magazine': {
    id: 'pe-construction-port-airport-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m55096ddb1af6',
    title: '技術士 建設部門 2次｜港湾及び空港 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「港湾及び空港」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として港湾・海岸関連業務に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜港湾空港 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。港湾・空港を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-power-civil-magazine': {
    id: 'pe-construction-power-civil-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/ma87d182c8113',
    title: '技術士 建設部門 2次｜電力土木 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「電力土木」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分＋R8予想 × 3区分 ＝ 18記事）。元・地方自治体の土木職（発注者）として電力関連土木工事の調整・監督に携わった視点で、ダム・水路・発電所土木の各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。令和8年度の改訂コンピテンシーにも対応。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜電力土木 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。電力土木を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-railway-magazine': {
    id: 'pe-construction-railway-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m535a4a4353c3',
    title: '技術士 建設部門 2次｜鉄道 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「鉄道」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分＋R8予想 × 3区分 ＝ 18記事）。元・地方自治体の土木職（発注者）として道路・鉄道交差部の協議や鉄道関連土木の発注・監督に携わった視点で、軌道・鉄道構造物の各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。令和8年度の改訂コンピテンシーにも対応。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜鉄道 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。鉄道を発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },
  'pe-construction-tunnel-magazine': {
    id: 'pe-construction-tunnel-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m5da4b560d8be',
    title: '技術士 建設部門 2次｜トンネル 選択科目 模範解答集（R03-R07＋R8予想）',
    description:
      '技術士第二次試験 建設部門「トンネル」選択科目の令和3〜7年度を、II-1（全設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）としてトンネル工事の発注・施工監理に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。さらに令和8年度の出題傾向・改訂コンピテンシーから導出した予想問題＋フル模範解答（3記事）を加えた全18記事。各記事に印刷用PDF付き。',
    shortTitle: '建設部門2次｜トンネル 模範解答集',
    shortDescription: 'R03〜R07＋R8予想 全18記事。トンネルを発注者視点でフル解答。',
    price: '¥2,980（18記事セット・単品¥780、約79%OFF）',
    badge: 'note 限定',
  },

  // ----- 科目別 合格パック（必須I＋選択1科目）SKU scaffold（2026-07-02・Fable P1由来・published:false）-----
  // 公開手順（note実機）: パック用マガジン新規作成 → BK-I＋該当科目の全記事を収録 → noteUrl 埋め＋published:true。
  // カバー/サイドバーバナーは公開時に生成。価格は実勢バンドル（BK-I¥3,480＋標準¥2,980=¥6,460／道路¥3,480+¥3,480=¥6,960）。
  // note はマガジン入れ子不可のため、パックは記事を個別再収録する実体マガジンになる可能性あり（要note実機確認）。
  // 2026-07-02 note 実機で作成・LIVE（mebca45bcc745・35記事収録・¥4,980・API実査済）。cover/sidebar 生成済で site published:true 化。
  'pe-construction-road-pack': {
    id: 'pe-construction-road-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mebca45bcc745',
    title: '技術士 建設部門 2次｜道路 まるごと合格パック（必須科目I＋道路選択科目）',
    description:
      '必須科目I 模範解答集（R03-R07＋R8予想・全11記事）と道路選択科目 模範解答集（R03-R07＋R8予想・全24記事）を束ねた合格パック。単品合計¥6,960が¥4,980。元・地方自治体の土木職（発注者）かつ道路科目合格者の視点で、本番で実際に解く「必須I＋道路」の組み合わせをそのまま収録。',
    shortTitle: '建設部門2次｜道路 合格パック',
    shortDescription: '必須I＋道路 全35記事。単品合計¥6,960が¥4,980（約28%OFF）。',
    price: '¥4,980（必須I＋道路 2マガジン・単品合計¥6,960、約28%OFF）',
    badge: 'note 限定 合格パック',
  },
  'pe-construction-tunnel-pack': {
    id: 'pe-construction-tunnel-pack',
    published: false,
    noteUrl: '',
    title: '技術士 建設部門 2次｜トンネル まるごと合格パック（必須科目I＋トンネル選択科目）',
    description:
      '必須科目I 模範解答集（R03-R07＋R8予想・全11記事）とトンネル選択科目 模範解答集（R03-R07＋R8予想・全18記事）を束ねた合格パック。単品合計¥6,460が¥4,980。元・地方自治体の土木職（発注者）視点で、本番で実際に解く「必須I＋トンネル」の組み合わせをそのまま収録。',
    shortTitle: '建設部門2次｜トンネル 合格パック',
    shortDescription: '必須I＋トンネル 全29記事。単品合計¥6,460が¥4,980（約23%OFF）。',
    price: '¥4,980（必須I＋トンネル 2マガジン・単品合計¥6,460、約23%OFF）',
    badge: 'note 限定 合格パック',
  },
  'pe-construction-urban-planning-pack': {
    id: 'pe-construction-urban-planning-pack',
    published: false,
    noteUrl: '',
    title: '技術士 建設部門 2次｜都市計画 まるごと合格パック（必須科目I＋都市計画選択科目）',
    description:
      '必須科目I 模範解答集（R03-R07＋R8予想・全11記事）と都市及び地方計画 選択科目 模範解答集（R03-R07＋R8予想・全18記事）を束ねた合格パック。単品合計¥6,460が¥4,980。元・地方自治体の土木職（発注者）かつ都市計画科目合格者の視点で、本番で実際に解く「必須I＋都市計画」の組み合わせをそのまま収録。',
    shortTitle: '建設部門2次｜都市計画 合格パック',
    shortDescription: '必須I＋都市計画 全29記事。単品合計¥6,460が¥4,980（約23%OFF）。',
    price: '¥4,980（必須I＋都市計画 2マガジン・単品合計¥6,460、約23%OFF）',
    badge: 'note 限定 合格パック',
  },

  // 択一過去問 PDF 販売（従チャネル・Kindle 択一シリーズの note 展開）。
  // 実体は A4 印刷用 PDF を有料エリアに添付した単発記事。公開時: noteUrl 埋め + published: true。
  // 対象本は KDP Select 非加入で提出し、Kindle と note を同時併売する（content/kindle/strategy.md）。
  'civil-2-takuitsu-pdf': {
    id: 'civil-2-takuitsu-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n4963f45bd6f8',
    title: '2級土木 第1次検定｜過去問PDF（令和3〜7年度 前期後期 全630問・全選択肢解説）',
    description:
      '2級土木施工管理技士 第1次検定の令和3〜7年度 前期・後期 全630問を、4つの選択肢すべてに正誤の理由を付けて解説したA4印刷用PDF。組合せ問題は表で整理、計算問題は途中式つき。印刷して直前期に紙で高速反復できる過去問演習教材。',
    price: '¥1,480',
    badge: 'note 限定 PDF教材',
  },
  // 1級版。PDF は生成済み（scripts/kindle-specs/e-02.json → build-takuitsu-pdf）。
  // Kindle A系（A-01〜A-06）が KDP Select 加入 LIVE のため、独占明け（~2026-10-06）に
  // Select を外してから note 公開する（content/kindle/strategy.md）。それまで published: false。
  'civil-1-takuitsu-pdf': {
    id: 'civil-1-takuitsu-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n155093f42183',
    title: '1級土木 第1次検定｜過去問PDF（平成26〜令和7年度 全12年分 全1162問・全選択肢解説）',
    description:
      '1級土木施工管理技士 第1次検定の平成26〜令和7年度 全12年分・問題A/B 全1162問を、4つの選択肢すべてに正誤の理由を付けて解説したA4印刷用PDF。図つき問題は図版込み、計算問題は考え方つき。印刷して直前期に紙で高速反復できる過去問演習教材。',
    price: '¥1,980',
    badge: 'note 限定 PDF教材',
  },
  'pe1-takuitsu-pdf': {
    id: 'pe1-takuitsu-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n466132e6fd74',
    title: '技術士 第一次試験｜過去問PDF 合本（基礎・適性・専門 令和元〜7年度 全560問・全選択肢解説）',
    description:
      '技術士 第一次試験（建設部門）の令和元〜7年度 全7年分・基礎科目210問＋適性科目105問＋専門科目245問＝全560問を収録。公式正答番号のある559問は全選択肢の正誤理由を解説し、残る1問も正答を断定せず5肢の論点を整理。11週間の学習計画・周回記録・3科目の答案記入シートも付いたA4印刷用PDF。',
    price: '¥1,480',
    badge: 'note 限定 PDF教材',
  },
  'tankan-takuitsu-reiwa-pdf': {
    id: 'tankan-takuitsu-reiwa-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/nb5ebacb3e6c0',
    title: '技術士 総合技術監理部門｜択一 過去問PDF 令和（令和元〜7年度 全280問・全選択肢解説）',
    description:
      '総合技術監理部門の択一式（令和元〜7年度 全280問）を、5つの管理を横断しつつ各選択肢に正誤の理由を付けて解説したA4印刷用PDF。直近ガイドラインを踏まえた出題にも対応した過去問演習教材。',
    price: '¥980',
    badge: 'note 限定 PDF教材',
  },
  'tankan-takuitsu-heisei-pdf': {
    id: 'tankan-takuitsu-heisei-pdf',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/na3ad4130a85f',
    title: '技術士 総合技術監理部門｜択一 過去問PDF 平成（平成21〜30年度 全400問・全選択肢解説）',
    description:
      '総合技術監理部門の択一式（平成21〜30年度 全400問）を、5つの管理を横断しつつ各選択肢に正誤の理由を付けて解説したA4印刷用PDF。管理の原則を問う平成期の良問で5管理の基礎を固める過去問演習教材。令和分と合わせて10年超を回せる。',
    price: '¥980',
    badge: 'note 限定 PDF教材',
  },
} as const satisfies Record<string, NoteMagazine>;

export type MagazineId = keyof typeof MAGAZINES_RAW;

export const NOTE_MAGAZINES: Readonly<Record<MagazineId, NoteMagazine>> = MAGAZINES_RAW;

/**
 * 公開済みかつ noteUrl が設定されているマガジンのみ取得。
 * 未登録 ID（MDX 側の dangling 参照）・未公開 (published: false)・noteUrl 空の
 * いずれも防御的に null を返す（未登録 ID で prerender がクラッシュしないように）。
 */
export function getMagazine(id: MagazineId): NoteMagazine | null {
  const mag = NOTE_MAGAZINES[id];
  if (!mag || !mag.published || !mag.noteUrl) return null;
  return mag;
}

/**
 * UTM パラメータ付き note URL を生成。
 *
 * 統一規約:
 * - utm_source = doboku-note
 * - utm_medium = referral
 * - utm_campaign = note-magazine
 * - utm_content = {配置箇所識別子} (例: "keyword-2026-sidebar")
 */
export function buildMagazineUrl(magazine: NoteMagazine, utmContent: string): string {
  const params = new URLSearchParams({
    utm_source: 'doboku-note',
    utm_medium: 'referral',
    utm_campaign: 'note-magazine',
    utm_content: utmContent,
  });
  const base = magazine.landingUrl ?? magazine.noteUrl;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.toString()}`;
}
