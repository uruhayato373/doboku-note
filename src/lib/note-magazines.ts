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

  // 原稿配置: docs/note/解答テンプレ3D/ （2026-05-25 まで docs/note/magazines/essay-template-3d/）
  // id は note 商品識別子として維持（site CTA cover も既存パス据置）
  'essay-template-3d': {
    id: 'essay-template-3d',
    published: false,
    noteUrl: '',
    title: '総監記述式 解答テンプレ集｜3D マトリクス 300 セル',
    description:
      'テーマ 20 × 5 管理 × 3 ペルソナ = 300 セルの 3D マトリクス。30 分骨子組立フロー + トレードオフ 16 ペア + 三層構造テンプレ。プレミアム約 51,000 字。',
    shortTitle: '解答テンプレ 3D',
    shortDescription:
      '300 セル 3D マトリクス + 30 分骨子フロー + 16 トレードオフ。',
    imageUrl: '/images/magazines/magazine-essay-template-3d-cover.webp',
    price: '¥2,980',
    badge: 'note 限定 プレミアム',
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
