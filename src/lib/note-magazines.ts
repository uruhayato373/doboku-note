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
  readonly title: string;
  readonly description: string;
  /** sidebar 用の短縮タイトル (省略時は title を使用) */
  readonly shortTitle?: string;
  /** sidebar 用の短縮説明 (省略時は description を使用) */
  readonly shortDescription?: string;
  readonly imageUrl: string;
  /**
   * sidebar 用の 300×250 バナー画像 (IAB レクタングル中)。
   * サイドバーは画像オンリー表示のため、文言・価格はこの画像内に焼き込む。
   * 省略時はサイドバーに画像カードを出さない。
   */
  readonly sidebarImageUrl?: string;
  readonly price?: string;
  readonly badge: string;
}

/**
 * 命名規約 (id):
 * - tankan-reading-guide: 5管理 精読ガイド (既公開、価格非表示)
 * - essay-{persona}-magazine: 模範論文 ペルソナ別 5年分マガジン (公開準備中)
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
    imageUrl: '/images/magazines/tankan-magazine-cover.webp',
    sidebarImageUrl: '/images/magazines/tankan-sidebar.webp',
    badge: 'note 限定 教材',
  },

  'essay-river-consultant-magazine': {
    id: 'essay-river-consultant-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32132ecb3033',
    title: '総監記述式 模範論文｜建設コンサル河川・砂防 5年分セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の5年分。中堅建設コンサル河川・砂防部門 部長の立場で3,000字級フル論文＋5管理トレードオフ構造を解説。',
    shortTitle: '模範論文｜河川コンサル',
    shortDescription:
      'R03〜R07 の 5 年分セット。河川・砂防部門 部長視点で 3,000 字フル論文。',
    imageUrl: '/images/magazines/essay-river-consultant-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-river-consultant-sidebar.webp',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
  },

  'essay-general-contractor-magazine': {
    id: 'essay-general-contractor-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32aaa137f22e',
    title: '総監記述式 模範論文｜ゼネコン 5年分セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の5年分。中堅ゼネコン土木部門の立場で「安全 × 経済性 × 人的資源」のトレードオフ構造を中核に組み立てた模範論文。',
    shortTitle: '模範論文｜ゼネコン',
    shortDescription:
      'R03〜R07 の 5 年分セット。ゼネコン土木部門視点、安全 × 経済性 × 人的資源 が主軸。',
    imageUrl: '/images/magazines/essay-general-contractor-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-general-contractor-sidebar.webp',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
  },

  'essay-road-municipality-magazine': {
    id: 'essay-road-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m52186ffd12ca',
    title: '総監記述式 模範論文｜自治体 道路担当 R3-R7 + R8予想セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の過去問 5 年分 + R08 予想問題集（気候変動適応・資源循環）。過去問 5 年分はいずれも橋梁長寿命化（維持管理）版とバイパス整備・道路建設（新設）版の A 案／B 案 2 バージョン併記、R08 予想は自治体 道路担当フル解答 2 本の合計 6 記事。地方自治体の道路担当（発注者）の立場で「経済性 × 安全 × 社会環境」を主軸に、各記事に設問全文を再掲して組み立てた論文構成を解説。試験 1 ヶ月前（2026-06）に R08 予想章を追加公開予定。',
    shortTitle: '模範論文｜自治体 道路担当 R3-R7+R8予想',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R08 予想 2 本 = 計 6 記事。試験対策決定版。',
    imageUrl: '/images/magazines/essay-road-municipality-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-road-municipality-sidebar.webp',
    price: '¥2,480（6本セット、単品比17%OFF）',
    badge: 'note 限定',
  },

  'essay-procurement-municipality-magazine': {
    id: 'essay-procurement-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 契約・調達担当 R3-R7 + R8予想セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の過去問 5 年分 + R08 予想問題集の計 6 記事。市区町村の契約検査課/技術管理課（発注者）の立場で、入札・契約制度運用版と工事検査・契約変更管理版の A 案／B 案 2 バージョンを併記。「コスト最適化 × 入札の公正性 × 担い手確保」の調達固有のトレードオフを主軸に、各記事に設問全文を再掲して組み立てた 3,000 字級フル論文を収録。',
    shortTitle: '模範論文｜自治体 契約・調達担当',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R08 予想 = 計 6 記事。調達・契約視点の決定版。',
    imageUrl: '/images/magazines/essay-procurement-municipality-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-procurement-municipality-cover.webp',
    price: '¥2,480（6本セット、単品比17%OFF）',
    badge: 'note 限定',
  },

  'essay-standards-municipality-magazine': {
    id: 'essay-standards-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 技術基準担当 R3-R7 + R8予想セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の過去問 5 年分 + R08 予想問題集の計 6 記事。都道府県の技術管理課（発注者）の立場で、設計基準・標準仕様の策定改定版と BIM/CIM・電子納品・技術情報DB版の A 案／B 案 2 バージョンを併記。「技術標準の統一 × 現場個別性 × 技術伝承」の基準担当固有のトレードオフを主軸に、各記事に設問全文を再掲して組み立てた 3,000 字級フル論文を収録。',
    shortTitle: '模範論文｜自治体 技術基準担当',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R08 予想 = 計 6 記事。情報管理・標準化視点の決定版。',
    imageUrl: '/images/magazines/essay-standards-municipality-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-standards-municipality-cover.webp',
    price: '¥2,480（6本セット、単品比17%OFF）',
    badge: 'note 限定',
  },

  'essay-assetmgmt-municipality-magazine': {
    id: 'essay-assetmgmt-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 アセットマネジメント担当 R3-R7 + R8予想セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の過去問 5 年分 + R08 予想問題集の計 6 記事。市区町村の道路維持課/公共施設マネジメント課（発注者）の立場で、道路橋梁長寿命化修繕計画版と公共施設等総合管理計画版の A 案／B 案 2 バージョンを併記。「劣化・事故防止 × LCC最小化・財政制約 × 住民合意」の維持管理固有のトレードオフを主軸に、各記事に設問全文を再掲して組み立てた 3,000 字級フル論文を収録。',
    shortTitle: '模範論文｜自治体 アセットマネジメント担当',
    shortDescription:
      'R03〜R07 過去問（全 A/B 2 案）+ R08 予想 = 計 6 記事。長寿命化・維持管理視点の決定版。',
    imageUrl: '/images/magazines/essay-assetmgmt-municipality-cover.webp',
    sidebarImageUrl: '/images/magazines/essay-assetmgmt-municipality-cover.webp',
    price: '¥2,480（6本セット、単品比17%OFF）',
    badge: 'note 限定',
  },

  'essay-river-municipality-magazine': {
    id: 'essay-river-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m32a8a5b3b473',
    title: '総監記述式 模範論文｜自治体 河川担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（各 A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・資源循環、各 A案/B案）の計 7 記事。河川砂防・海岸海洋分野合格者視点、堤防維持管理 × 河川改修。5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体河川担当',
    shortDescription:
      'R03〜R07 + R8予想2記事 = 計7記事。維持管理版/河川改修版の A案/B案＋印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-river-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },
  'essay-urban-municipality-magazine': {
    id: 'essay-urban-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf8c77e995511',
    title: '総監記述式 模範論文｜自治体 都市計画担当 R3-R7 + R8予想セット',
    description:
      'R03〜R07 過去問（各 A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・資源循環、各 A案/B案）の計 7 記事。都市及び地方計画分野合格者視点、立地適正化計画（制度運用）× 市街地再開発（事業整備）。5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    shortTitle: '模範論文｜自治体都市計画担当',
    shortDescription:
      'R03〜R07 + R8予想2記事 = 計7記事。立地適正化計画版/再開発事業版の A案/B案＋印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-urban-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },

  'essay-sewage-municipality-magazine': {
    id: 'essay-sewage-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf1cbc32d53aa',
    title: '総監記述式 模範論文｜自治体 下水道担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体下水道担当',
    description:
      'R03〜R07 過去問（老朽管路更新版/浸水対策雨水幹線整備版の A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・浸水対策／資源循環・下水汚泥資源化、各 A案/B案）の計 7 記事。下水道担当（発注者）視点、5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-sewage-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },
  'essay-sabo-municipality-magazine': {
    id: 'essay-sabo-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 砂防担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体砂防担当',
    description:
      'R03〜R07 過去問（砂防施設維持管理版/砂防堰堤新設・急傾斜地対策版の A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・砂防施設リスク管理／資源循環・サプライチェーン強靭化、各 A案/B案）の計 7 記事。砂防担当（発注者）視点、土砂災害リスク管理・流域管理・5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-sabo-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },
  'essay-agri-municipality-magazine': {
    id: 'essay-agri-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 農業農村整備担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜農業農村整備担当',
    description: '農業農村整備担当（発注者）視点。農業水利施設保全版とほ場整備版のA案/B案2バージョン。',
    imageUrl: '/images/magazines/essay-agri-municipality-cover.webp',
    badge: 'note 限定',
  },
  'essay-port-municipality-magazine': {
    id: 'essay-port-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 港湾担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体港湾担当',
    description:
      'R03〜R07 過去問（港湾施設維持管理版/岸壁改良・水深増深版の A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・グリーン港湾／資源循環・サプライチェーン強靭化、各 A案/B案）の計 7 記事。港湾担当（発注者）視点、物流機能維持・CNポート・5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-port-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },
  'essay-park-municipality-magazine': {
    id: 'essay-park-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 公園緑地担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体公園緑地担当',
    description: '公園緑地担当（発注者）視点。公園施設維持管理版と防災公園新設版のA案/B案2バージョン。',
    imageUrl: '/images/magazines/essay-park-municipality-cover.webp',
    badge: 'note 限定',
  },
  'essay-water-municipality-magazine': {
    id: 'essay-water-municipality-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/mf4c6792b4f9c',
    title: '総監記述式 模範論文｜自治体 上水道担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体上水道担当',
    description:
      'R03〜R07 過去問（老朽管路更新版/浄水場改修・高度浄水処理導入版の A案/B案 2 バージョン）+ R8予想2記事（気候変動適応・強靭化／資源循環・サプライチェーン強靭化、各 A案/B案）の計 7 記事。上水道担当（発注者）視点、5 管理間トレードオフが主軸。各記事に印刷用PDF付き。',
    imageUrl: '/images/magazines/essay-water-municipality-cover.webp',
    price: '¥2,480（7本セット、単品比29%OFF）',
    badge: 'note 限定',
  },
  'essay-arch-municipality-magazine': {
    id: 'essay-arch-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜自治体 建築・営繕担当 R3-R7 + R8予想セット',
    shortTitle: '模範論文｜自治体建築・営繕担当',
    description: '建築・営繕担当（発注者）視点。公共施設長寿命化版と新庁舎ZEB化版のA案/B案2バージョン。',
    imageUrl: '/images/magazines/essay-arch-municipality-cover.webp',
    badge: 'note 限定',
  },
  'essay-road-consultant-magazine': {
    id: 'essay-road-consultant-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜道路・橋梁設計コンサルタント R3-R7 + R8予想セット',
    shortTitle: '模範論文｜道路橋梁コンサル',
    description: '道路・橋梁設計コンサルタント（受注者）視点。橋梁点検補修設計版と道路改良設計版のA案/B案2バージョン。',
    imageUrl: '/images/magazines/essay-road-consultant-cover.webp',
    badge: 'note 限定',
  },
  'essay-urban-consultant-magazine': {
    id: 'essay-urban-consultant-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜都市計画コンサルタント R3-R7 + R8予想セット',
    shortTitle: '模範論文｜都市計画コンサル',
    description: '都市計画コンサルタント（受注者）視点。立地適正化計画策定版と再開発計画版のA案/B案2バージョン。',
    imageUrl: '/images/magazines/essay-urban-consultant-cover.webp',
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
    title: '令和 8 年度 総監記述式 R8 予想問題集｜6 テーマ × 自治体道路担当フル模範論文',
    description:
      'R8 予想 6 テーマ（AI 社会・気候変動適応・経済安全保障・災害復旧・資源循環・老朽化インフラ）を自治体道路担当ペルソナで論述。各テーマ予想問題本文＋出題予想根拠＋三層構造解答骨子＋3,000 字級フル模範論文の 6 記事構成。',
    shortTitle: 'R8 予想問題集',
    shortDescription:
      'R8 予想 6 テーマのフル模範論文集（各 3,000 字級・道路担当ペルソナ）',
    imageUrl: '/images/magazines/magazine-r8-essay-forecast-cover.webp',
    sidebarImageUrl: '/images/magazines/magazine-r8-essay-forecast-sidebar.webp',
    price: '¥2,480（6本セット、単品比17%OFF）',
    badge: 'note 限定',
  },

  // 注: essay-template-3d「解答テンプレ 3D マトリクス」(¥2,980) は 2026-06-01 に企画中止。
  //     SoT エントリと magazine-placement.ts の配線を削除した（whitepaper-r7-strategy と同様の退役）。
  //     原稿（docs/note/技術士総監/解答テンプレ3D/）も 2026-06-01 削除（記述式対策は他コンテンツで網羅のため）。

  // 原稿配置: docs/note/技術士総監/magazines/総監記述式-設問3国家施策バンク/（序章 + 11 テーマ）
  // 設問(3)専用の国家施策オプション集。2026-06-01 全12記事+マガジン公開。
  'setsumon3-policy-bank': {
    id: 'setsumon3-policy-bank',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m91516dfc27ac',
    title: '総監記述式 設問(3)国家施策バンク｜将来課題11テーマ × 国家施策オプション集',
    description:
      '設問(3)専用。2050年前後の将来課題11テーマ（人口減少・地方創生・担い手不足・GX・気候変動適応・循環経済・インフラ老朽化・Society5.0・食料安保・経済安保・物流危機）ごとに、国家スケールの施策を5〜8案ずつ（①課題と施策／②有効性と実現性／③重大な障害と克服策・トレードオフ明示）約600字＝答案用紙1枚相当で収録（計68案）。どのテーマが出ても引き出せる施策の弾薬庫。',
    shortTitle: '設問3 国家施策バンク',
    shortDescription:
      '将来課題11テーマ × 国家施策68案（各約600字・答案1枚相当）。設問(3)専用の引き出し集。',
    imageUrl: '/images/magazines/magazine-setsumon3-policy-bank-cover.webp',
    price: '¥2,480',
    badge: 'note 限定',
  },

  // ----- 総監 5管理クロストレードオフ (2026-06-01 全記事公開) -----
  // 原稿配置: docs/note/技術士総監/magazines/総監記述式-5管理クロストレードオフ/
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
    imageUrl: '/images/magazines/magazine-tradeoff-5kanri-cover.webp',
    sidebarImageUrl: '/images/magazines/magazine-tradeoff-5kanri-cover.webp',
    price: '¥1,980（5本セット、21%OFF）',
    badge: 'note 限定',
  },

  // ----- 総監記述式 完全パック (2026-06-01 企画、2026-06-03 note 公開) -----
  // 既存5マガジン（クロストレードオフ + 設問3バンク + R8予想 + 模範論文3ペルソナ）のバンドル。
  // 恒常¥7,980 / 試験直前限定¥5,980（試験後に¥7,980へ戻す）。実装前提は noteコンテンツ計画.md M13 参照。
  'essay-complete-pack': {
    id: 'essay-complete-pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m171222175fac',
    title: '総監記述式 完全パック｜型×設問3×予想×模範論文 全部入り',
    description:
      '記述式の答案完成パイプラインを1パックで完結。クロストレードオフ（5管理対立の型）＋設問3国家施策バンク（設問3の弾薬）＋R8予想問題集（予想演習）＋模範論文3ペルソナ（フル実演・全ペルソナ）を収録。単品合計¥14,380相当。',
    shortTitle: '記述式 完全パック',
    shortDescription:
      '型×設問3×予想×模範論文の全部入り。記述式対策の決定版バンドル。',
    imageUrl: '/images/magazines/magazine-essay-complete-pack-cover.webp',
    price: '¥7,980（試験直前限定 ¥5,980）',
    badge: 'note 限定',
  },

  // ----- 2級土木 施工経験記述ライン (2026-05-29) -----
  // 原稿配置: docs/note/2級土木/magazines/2級土木-施工経験記述-完成答案集/
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
    imageUrl: '/images/magazines/civil-2-experience-essay-cover.webp',
    price: '¥1,980（3本セット）',
    badge: 'note 限定',
  },

  // ----- 1級土木 施工経験記述ライン (2026-05-29) -----
  // 原稿配置: docs/note/1級土木/magazines/1級土木-施工経験記述-完成答案集/
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
    imageUrl: '/images/magazines/civil-1-experience-essay-cover.webp',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
  },

  // 原稿配置: docs/note/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集/
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
    imageUrl: '/images/magazines/civil-1-pastexam-essay-cover.webp',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
  },

  // 原稿配置: docs/note/2級土木/magazines/2級土木-施工経験記述-過去問模範答案集/
  // 2級 過去問の年度別模範答案集。published: false。
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
    imageUrl: '/images/magazines/civil-2-pastexam-essay-cover.webp',
    price: '¥2,480（5本セット）',
    badge: 'note 限定',
  },

  // 注: civil-2-yosou-essay（2級 予想問題集）は 2026-06-02 退役。出題実績のない投機
  //     （条件提示型・出来形・日常業務）かつ無料ガイドの「3管理で十分」と矛盾するため。
  //     根拠のある「環境対策」のみ civil-2-experience-essay（完成答案集）へ4テーマ目として昇格。

  // 注: civil-1-yosou-essay（1級 予想問題集）は 2026-06-02 完全退役。
  //     出題実績のない投機（条件提示型・日常業務）のため、現行形式を全網羅する
  //     civil-1-combo-essay（2テーマ組合せ大全）へ転換。原稿・SoT・placement・cover を削除。

  // 原稿配置: docs/note/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全/
  // 予想問題集を転換。5管理の2テーマ全10組合せ × 想定工事①②③ で現行形式(R06+)を全網羅。
  // 全10記事生成済(keiken-charcount --strict=0 / note-lint OK / 答案重複0)。published: false（note公開で noteUrl 取得後 true へ）。カバー未生成。
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
    imageUrl: '/images/magazines/civil-1-combo-essay-cover.webp',
    price: '¥3,480（10本セット、42%OFF）',
    badge: 'note 限定',
  },

  // 原稿配置: docs/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集/
  // コンクリート診断士 記述式（問題A・問題B）模範答案集。劣化機構別フル答案 8 本。published: false。
  // 公開時: noteUrl 埋め + cover 画像作成 + published: true。site 側は診断士 vertical 公開後に CTA 発火。
  'cd-essay-magazine': {
    id: 'cd-essay-magazine',
    published: false,
    noteUrl: '',
    title: 'コンクリート診断士 記述式｜問題A・問題B 模範答案集',
    description:
      'コンクリート診断士試験 記述式（問題A・問題B）のフル模範答案集。問題A（資質・論述）2本、問題B（具体構造物の診断・対策提案）5本を塩害・中性化・ASR・凍害・疲労複合の劣化機構別に収録。答案の型と採点視点をまとめた解法ガイド1本付き。想定問題はオリジナル代表例、固有数値は置換前提。',
    shortTitle: 'コンクリート診断士 記述式 模範答案集',
    shortDescription:
      '問題A・問題Bのフル模範答案を劣化機構別に8本。変状把握→劣化機構推定→調査→評価→対策の型を反復。',
    imageUrl: '/images/magazines/cd-essay-cover.webp',
    price: '¥1,980（8本セット）',
    badge: 'note 限定 教材',
  },

  // ----- 技術士 建設部門 第二次試験 模範解答ライン (2026-06-09 追加) -----
  // 原稿配置: docs/note/技術士建設部門/magazines/BK-I_必須科目I/
  // 全受験者共通の必須科目I（3枚・1,674字）の R03〜R07 フル模範解答集。
  // 公開時: noteUrl 埋め + cover 画像作成 + published: true。CTA はガイドページで発火。
  'pe-construction-required': {
    id: 'pe-construction-required',
    published: false,
    noteUrl: '',
    title: '技術士 建設部門｜必須科目I フル模範解答集 R03〜R07（5年分）',
    description:
      '技術士第二次試験 建設部門 必須科目I（全受験者共通・答案3枚・1,674字）の R03〜R07 フル模範解答集。担い手確保・DX・防災・老朽化など5年分の出題テーマに対し、元公務員（発注者）視点の「制度設計×行政調整×発注者責任」を盛り込んだ答案をプロセス型4段構成で収録。設問(1)の観点明記・(2)解決策・(3)将来懸念・(4)倫理の書き方解説付き。',
    shortTitle: '建設部門 必須科目I 模範解答集',
    shortDescription:
      'R03〜R07 の 5 年分フル模範解答。発注者視点の制度・行政調整論述が差別化軸。',
    imageUrl: '/images/magazines/pe-construction-required-cover.webp',
    price: '¥1,980（5本セット）',
    badge: 'note 限定',
  },

  // 原稿配置: docs/note/コンクリート主任技師/magazines/コンクリート主任技師-小論文-模範答案集/
  // コンクリート主任技師 小論文（記述式）模範答案集。解法ガイド + テーマ別フル模範小論文 4 本。published: false。
  // concrete-chief-engineer vertical は公開済 (guide/textbook/primary 計19記事 published:true)。
  // 公開時: noteUrl 埋め + cover 画像作成 + published: true。CTA は guide-essay 等の小論文系ページで発火。
  'cce-essay-magazine': {
    id: 'cce-essay-magazine',
    published: false,
    noteUrl: '',
    title: 'コンクリート主任技師 小論文｜評価される答案の型 + テーマ別 模範答案集',
    description:
      'コンクリート主任技師試験の小論文対策フル模範答案集。択一とは評価軸が異なる小論文（実務経験を技術論述に変換する試験）を、答案の型と4観点で攻略する。解法ガイド1本＋テーマ別フル模範小論文4本（耐久性・品質管理・環境配慮・施工トラブル）。各テーマは想定問題＋答案の方針＋1200〜1700字級フル模範小論文（固有数値は置換前提）＋採点者視点＋置換ガイドで構成。実在過去問の逐語再現はしない。',
    shortTitle: 'コンクリート主任技師 小論文 模範答案集',
    shortDescription:
      '解法ガイド＋テーマ別フル模範小論文4本（耐久性・品質管理・環境配慮・施工トラブル）。序論・本論・結論の型と採点4観点で攻略。',
    imageUrl: '/images/magazines/cce-essay-cover.webp',
    price: '¥1,480（5本セット）',
    badge: 'note 限定 教材',
  },

  // 技術士 建設部門 2次（BK シリーズ）。公開準備中（published:false）。
  // 公開時: note でマガジン公開 → noteUrl 埋め + published: true。CTA は pe-construction-r0X-required ページで発火。
  'pe-construction-required-magazine': {
    id: 'pe-construction-required-magazine',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m0f3bc3933454',
    title: '技術士 建設部門 2次｜必須科目I 模範解答集（R03-R07）',
    description:
      '技術士第二次試験 建設部門で全受験者必須の「必須科目I」を、令和3〜7年度の5年分まとめた模範解答集。元・地方自治体の土木職（発注者）視点で、安全・品質・コスト・環境の統合判断や住民対応・行政責任といった採点軸を補う。各年度に設問全文（出典明記）を再掲し、設問構成と論述方針・約1,500〜1,650字のフル模範解答・採点者が見るポイント・元公務員（発注者）からのコメントを収録。',
    shortTitle: '建設部門2次｜必須I 模範解答集',
    shortDescription:
      'R03〜R07 の5年分セット。必須科目I を元公務員（発注者）視点でフル解答。1年あたり約396円。',
    imageUrl: '/images/magazines/pe-construction-bk-i-required-cover.webp',
    price: '¥1,980（5本セット・単品¥500）',
    badge: 'note 限定',
  },

  'pe-construction-road-magazine': {
    id: 'pe-construction-road-magazine',
    published: false,
    noteUrl: '',
    title: '技術士 建設部門 2次｜道路 選択科目 模範解答集（R03-R07）',
    description:
      '技術士第二次試験 建設部門「道路」選択科目の令和3〜7年度を、II-1・II-2・III の全答案でフル解答した模範解答集（5年分 × 3答案 ＝ 15記事）。道路科目の合格者かつ元・地方自治体の土木職（発注者）の視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイント・元公務員（発注者）からのコメントを収録。',
    shortTitle: '建設部門2次｜道路 模範解答集',
    shortDescription:
      'R03〜R07 の II-1/II-2/III 全15記事。道路科目 合格者＋発注者視点でフル解答。',
    imageUrl: '/images/magazines/pe-construction-bk-01-road-cover.webp',
    price: '¥1,980（15記事セット）',
    badge: 'note 限定',
  },
  'pe-construction-river-coast-magazine': {
    id: 'pe-construction-river-coast-magazine',
    published: false,
    noteUrl: '',
    title: '技術士 建設部門 2次｜河川・砂防及び海岸・海洋 選択科目 模範解答集（R03-R07）',
    description:
      '技術士第二次試験 建設部門「河川、砂防及び海岸・海洋」選択科目の令和3〜7年度を、II-1（全4設問）・II-2（両選択肢）・III（両問題）の全選択肢でフル解答した模範解答集（5年分 × 3区分 ＝ 15記事）。元・地方自治体の土木職（発注者）として河川・砂防・海岸の発注・監督・積算審査に携わった視点で、各記事に設問全文（出典明記）・設問構成と論述方針・フル模範解答・採点者が見るポイントを収録。',
    shortTitle: '建設部門2次｜河川砂防 模範解答集',
    shortDescription:
      'R03〜R07 の II-1/II-2/III 全15記事。河川・砂防・海岸を発注者視点でフル解答。',
    imageUrl: '/images/magazines/pe-construction-bk-02-river-cover.webp',
    price: '¥1,980（15記事セット）',
    badge: 'note 限定',
  },
} as const satisfies Record<string, NoteMagazine>;

export type MagazineId = keyof typeof MAGAZINES_RAW;

export const NOTE_MAGAZINES: Readonly<Record<MagazineId, NoteMagazine>> = MAGAZINES_RAW;

/**
 * 公開済みかつ noteUrl が設定されているマガジンのみ取得。
 * 未公開 (published: false) や noteUrl 空のものは防御的に null を返す。
 */
export function getMagazine(id: MagazineId): NoteMagazine | null {
  const mag = NOTE_MAGAZINES[id];
  if (!mag.published || !mag.noteUrl) return null;
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
  const sep = magazine.noteUrl.includes('?') ? '&' : '?';
  return `${magazine.noteUrl}${sep}${params.toString()}`;
}
