/**
 * note 記事の公開状態と、公開の前に揃っているべきものの判定（唯一の実装）。
 *
 * 公開状態の正本は記事の frontmatter（noteId・noteStatus）。content/registry/ は YouTube・Instagram・X の公開だけを持ち、
 * note は持たない（content-registry.md）。2026-10-28、frontmatter を正規表現で直読みして CRLF の 692 本を「未公開」と数え、
 * 「公開の事実は registry に移った」と確かめずに説明した。frontmatter は gray-matter（note-frontmatter.mjs）でだけ読む。
 */
export const NOTE_STATE_SOURCE = 'frontmatter の noteId・noteStatus（content/registry/ は note を持たない）';

/** 有料境界の見出しの既定（note-publish.mjs の BOUNDARY と同じ）。 */
export const DEFAULT_PAID_BOUNDARY = '試験問題|予想問題';

/** 本文に残ると note-publish.mjs が公開を止める書きかけの印（マガジンの URL など）。 */
export const NOTE_PLACEHOLDER_RE = /\{\{|※note\s*公開後|MAGAZINE_URL/;

/** 「何が得られるか」の節の目印。公開済みの記事は check-note-intro-benefit が pre-commit で止める。 */
export const INTRO_BENEFIT_MARKER = '**この記事でわかること**';

/**
 * 「この記事でわかること」の節の位置を見る（check-note-intro-benefit と note-unpublished が使う）。
 * @returns {null|'missing'|'after-boundary'} 有料は境界の見出しより前（無料プレビューの中）に要る
 */
export function introBenefitGap(text, { isPaid, paidBoundary }) {
  const at = text.indexOf(INTRO_BENEFIT_MARKER);
  if (at < 0) return 'missing';
  if (!isPaid) return null;
  const boundary = text.match(new RegExp(`^##\\s*(?:${paidBoundary || DEFAULT_PAID_BOUNDARY})`, 'm'));
  return boundary && at > boundary.index ? 'after-boundary' : null;
}

/**
 * frontmatter から公開状態を決める。
 * @returns {{ state: 'published'|'draft'|'unrecorded', conflicts: string[] }}
 *   unrecorded は noteId も noteStatus も無い（公開されたかを frontmatter が言っていない）。
 */
export function notePublicationState(data) {
  const noteId = data.noteId || String(data.noteUrl || '').match(/\/n\/(n[0-9a-f]+)/)?.[1] || null;
  const status = data.noteStatus || null;
  const conflicts = [];
  if (noteId) {
    if (status === 'draft') conflicts.push(`noteId ${noteId} があるのに noteStatus が draft`);
    return { state: 'published', conflicts };
  }
  if (status === 'published') conflicts.push('noteStatus が published なのに noteId が無い');
  if (status === 'draft') return { state: 'draft', conflicts };
  return { state: status === 'published' ? 'published' : 'unrecorded', conflicts };
}

/**
 * note-publish.mjs が公開の前に止まる条件と、公開した直後に pre-commit が止める条件を、ブラウザを開かずに先に見る。
 * 表紙は公開のたびに frontmatter の cover から作るので、img/cover.png の有無では決めない。
 * @param {{ data: object, body: string, isPaid: boolean }} article parseNoteArticle の戻り値
 * @param {{ hasHashtags: boolean, coverTarget: boolean }} files
 * @returns {string[]} 足りないもの（空なら公開の準備はできている）
 */
export function notePublishGaps(article, { hasHashtags, coverTarget }) {
  const { data, body, isPaid } = article;
  const gaps = [];
  if (!data.title && !/^#\s+\S/m.test(body)) gaps.push('タイトルが無い（title か本文の H1）');
  if (!coverTarget || !data.cover || typeof data.cover !== 'object') gaps.push('表紙の指定（frontmatter の cover）が無い');
  if (!hasHashtags) gaps.push('hashtags.txt が無い');
  if (NOTE_PLACEHOLDER_RE.test(body)) gaps.push('書きかけの印（{{MAGAZINE_URL}} など）が本文に残っている。マガジンを先に作って URL を埋める');
  const benefit = introBenefitGap(body, { isPaid, paidBoundary: data.paidBoundary });
  if (benefit === 'missing') gaps.push(`${INTRO_BENEFIT_MARKER} の節が無い（公開すると pre-commit の check-note-intro-benefit が止める。H2 の見出しでは数えない）`);
  if (benefit === 'after-boundary') gaps.push(`${INTRO_BENEFIT_MARKER} が有料境界より後ろにあり、購入前に読めない`);
  if (isPaid) {
    if (!(Number(data.price) > 0)) gaps.push('有料なのに price が無い');
    const boundary = new RegExp(`^##\\s+(${data.paidBoundary || DEFAULT_PAID_BOUNDARY})`, 'm');
    if (!boundary.test(body)) gaps.push(`有料境界の見出し（## ${data.paidBoundary || DEFAULT_PAID_BOUNDARY}）が本文に無い`);
  }
  return gaps;
}
