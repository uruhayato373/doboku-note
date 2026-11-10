// Kindle 本の巻末に置く「レビューのお願い」のページ（3 つのビルダーで共通・2026-11-10）。
// Amazon のレビュー規約に合わせ、見返りを付けず、好意的な評価だけを頼まない中立の文面にする。
// 文面を変えるときはこの 1 か所だけを直す（ビルダーごとに書き写さない）。
import { xhtmlDoc } from './epub-writer.mjs'

export const REVIEW_REQUEST_TEXT = [
  '最後までお読みいただき、ありがとうございました。',
  '本書について、Amazon の商品ページで評価やレビューをお寄せいただけると幸いです。良かった点だけでなく、分かりにくかった点や誤りのご指摘も歓迎します。いただいたご意見は、訂正と次の版の改善に役立てます。',
]

export function reviewRequestPage() {
  return {
    id: 'p-review',
    href: 'p-review.xhtml',
    label: 'レビューのお願い',
    content: xhtmlDoc('レビューのお願い',
      `<div class="front back"><h1>レビューのお願い</h1>\n${REVIEW_REQUEST_TEXT.map((p) => `<p>${p}</p>`).join('\n')}</div>`),
  }
}
