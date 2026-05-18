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
    badge: 'note 限定 教材',
  },

  'essay-river-consultant-magazine': {
    id: 'essay-river-consultant-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜建設コンサル河川・砂防 5年分セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の5年分。中堅建設コンサル河川・砂防部門 部長の立場で3,000字級フル論文＋5管理トレードオフ構造を解説。',
    shortTitle: '模範論文｜河川コンサル',
    shortDescription:
      'R03〜R07 の 5 年分セット。河川・砂防部門 部長視点で 3,000 字フル論文。',
    imageUrl: '/images/magazines/essay-river-consultant-cover.webp',
    price: '¥1,980（単品 5本 ¥2,500 → 21%OFF）',
    badge: 'note 限定',
  },

  'essay-general-contractor-magazine': {
    id: 'essay-general-contractor-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜ゼネコン 5年分セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の5年分。中堅ゼネコン土木部門の立場で「安全 × 経済性 × 人的資源」のトレードオフ構造を中核に組み立てた模範論文。',
    shortTitle: '模範論文｜ゼネコン',
    shortDescription:
      'R03〜R07 の 5 年分セット。ゼネコン土木部門視点、安全 × 経済性 × 人的資源 が主軸。',
    imageUrl: '/images/magazines/essay-general-contractor-cover.webp',
    price: '¥1,980（単品 5本 ¥2,500 → 21%OFF）',
    badge: 'note 限定',
  },

  'essay-environment-survey-magazine': {
    id: 'essay-environment-survey-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜環境調査会社 5年分セット',
    description:
      'R03（データ利活用）〜R07（少子高齢化）の5年分。環境影響評価コンサル/環境調査会社の立場で「社会環境 × 情報 × 経済性」を主軸とした論文構成。',
    shortTitle: '模範論文｜環境調査',
    shortDescription:
      'R03〜R07 の 5 年分セット。環境影響評価コンサル視点、社会環境 × 情報 × 経済性 が主軸。',
    imageUrl: '/images/magazines/essay-environment-survey-cover.webp',
    price: '¥1,980（単品 5本 ¥2,500 → 21%OFF）',
    badge: 'note 限定',
  },

  'essay-road-municipality-magazine': {
    id: 'essay-road-municipality-magazine',
    published: false,
    noteUrl: '',
    title: '総監記述式 模範論文｜道路発注者（地方自治体）R5-R7 + R8予想セット',
    description:
      'R05/R06/R07 の3年分過去問対策 + R08 予想問題集（気候変動適応・資源循環）。R7/R6 は橋梁長寿命化版とバイパス整備版の 2 バージョン併記、R5 は道路維持管理組織版、R8 予想は道路発注者フル解答 2 本の合計 7 本フル論文。地方自治体道路発注者の立場で「経済性 × 安全 × 社会環境」を主軸に組み立てる論文構成を解説。試験 1 ヶ月前（2026-06）に R8 予想章を追加公開予定。',
    shortTitle: '模範論文｜道路発注者 R5-R7+R8予想',
    shortDescription:
      'R05〜R07 過去問 + R08 予想 2 本 = 計 7 本フル論文。試験対策決定版。',
    imageUrl: '/images/magazines/essay-road-municipality-cover.webp',
    price: '¥2,480（単品 4本 ¥2,000 → 7本分の情報量で実質65%OFF）',
    badge: 'note 限定',
  },

  // ----- Series 1/3/4/5 新規マガジン (2026-05-17 完成、M1 は 2026-05-18 撤回) -----
  'whitepaper-r7-strategy': {
    id: 'whitepaper-r7-strategy',
    published: false,
    noteUrl: '',
    title: '国土交通白書 R7 完全対応集｜7 大テーマ × 5 管理トレードオフ',
    description:
      '白書 R7 の 7 大テーマと 5 管理ペアを完全可視化。R08 再出題確率スコア + 過去問適用パスポート + ワークシート 70 問付き。約 33,000 字。',
    shortTitle: '白書 R7 完全対応集',
    shortDescription:
      '7 大テーマ × R08 再出題確率 + ワークシート 70 問。',
    imageUrl: '/images/magazines/magazine-whitepaper-r7-strategy-cover.webp',
    price: '¥2,480',
    badge: 'note 限定',
  },

  'r8-essay-forecast': {
    id: 'r8-essay-forecast',
    published: false,
    noteUrl: '',
    title: '令和 8 年度 総監記述式 R8 予想問題集｜3 大テーマ × 三層構造',
    description:
      'R8 予想 3 大テーマ（資源循環 8.5/10・気候変動適応 8.0/10・少子高齢化 7.5/10）を 4 ペルソナ別にアレンジ。三層構造テンプレ + 5 大トレードオフ早見表。約 15,000 字。',
    shortTitle: 'R8 予想問題集',
    shortDescription:
      'R8 予想 3 大テーマ + 三層構造 + 4 ペルソナ別アレンジ。',
    imageUrl: '/images/magazines/magazine-r8-essay-forecast-cover.webp',
    price: '¥2,480',
    badge: 'note 限定',
  },

  'essay-template-3d': {
    id: 'essay-template-3d',
    published: false,
    noteUrl: '',
    title: '総監記述式 解答テンプレ集｜3D マトリクス 400 セル',
    description:
      'テーマ 20 × 5 管理 × 4 ペルソナ = 400 セルの 3D マトリクス。30 分骨子組立フロー + トレードオフ 16 ペア + 三層構造テンプレ。プレミアム約 51,000 字。',
    shortTitle: '解答テンプレ 3D',
    shortDescription:
      '400 セル 3D マトリクス + 30 分骨子フロー + 16 トレードオフ。',
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
