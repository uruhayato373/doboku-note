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
 * - tankan-reading-guide: 5管理 精読ガイド (既公開、¥7,800)
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
    price: '¥7,800',
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
    title: '総監記述式 模範論文｜道路発注者（地方自治体）3年分セット',
    description:
      'R05/R06/R07 の3年分。地方自治体道路管理者の立場で「経済性 × 安全 × 社会環境」を主軸に組み立てる発注者視点の論文構成を解説。',
    shortTitle: '模範論文｜道路発注者',
    shortDescription:
      'R05〜R07 の 3 年分セット。地方自治体道路管理者視点、発注者立場の論文構成。',
    imageUrl: '/images/magazines/essay-road-municipality-cover.webp',
    price: '¥1,480（単品 3本 ¥1,500 → 1%OFF）',
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
