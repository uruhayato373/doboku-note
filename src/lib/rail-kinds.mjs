/**
 * 右の欄（PC ≥993px）に置けるものの種類の台帳。右の欄は RailStack が描き、並べる 1 つ 1 つに data-rail-kind を付ける。
 * ここに無い種類は右の欄に置けない（ビルド後の HTML は scripts/checks/check-cta-density.mjs、コードは tests/rail-ratchet.test.mjs が止める）。
 *
 * frame: 外枠と題名
 *   shared … MetaCard（枠・角丸・影・題名の大きさが共通）
 *   own    … 部品が自分の形を持つ（広告・画像の CTA）。理由を reason に書く
 * バナーと note の商品の中身（画像・文言・出し分け）はこの台帳では扱わない。
 * 配置の正本は config/site-cta-surfaces.json とアフィリエイトの配置ルール（二重に持たない）。
 */
export const RAIL_KINDS = /** @type {const} */ ({
  nav: { part: 'MetaCard + LinkRow', frame: 'shared', reason: '文字の一覧（資格の学習ナビ・カテゴリナビ・人気記事・基準書の機関と文書・回遊）' },
  thumbs: { part: 'RailArticleList', frame: 'shared', reason: '画像つきの回遊（関連・人気・新着の記事）' },
  tree: { part: 'DocumentTreeNav', frame: 'shared', reason: '基準書の目次。中身は編・章・節の入れ子の開閉で、行の部品に収まらない' },
  years: { part: 'PastExamCard', frame: 'shared', reason: '過去問の年度の表。中身は年度×試験区分の表' },
  questions: { part: 'ExamQuestionNav', frame: 'shared', reason: '設問番号のチップ。中身は番号の並び' },
  author: { part: 'AuthorProfile', frame: 'shared', reason: '運営者のプロフィール。中身は写真・経歴・保有資格' },
  bridge: { part: 'QualificationBridge', frame: 'shared', reason: '基準書から資格の学習へ渡す区画' },
  note: { part: 'NoteProductCard / HubCtaBanner', frame: 'own', reason: 'note の商品の画像の CTA。中身と配置は site-cta-surfaces.json が正本' },
  career: { part: 'ArticleBanner / StandardsRailBanner / ProgramSplitBanner', frame: 'own', reason: '転職の広告のバナー。配置はアフィリエイトの配置ルールが正本' },
  adsense: { part: 'AdSlot', frame: 'own', reason: 'AdSense の枠' },
});

/** @typedef {keyof typeof RAIL_KINDS} RailKind */

/** 広告の種類（記事の右欄で「カード」として数えない・data-article-sidebar-card を付けない） */
/** @param {RailKind} kind */
export function isRailAd(kind) {
  return kind === 'career' || kind === 'adsense';
}
