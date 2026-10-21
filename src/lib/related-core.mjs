/**
 * related-core — 関連記事の算法の純関数（content-taxonomy.md §6-3）。
 *
 * サイト（src/lib/related-score.ts が tags.json の class とテーマの所属を渡して使う）と、テスト・週次の報告
 * （report-taxonomy-wiring）が同じ算法を使う。I/O と import を持たない。
 */

/**
 * 共有タグ 1 つあたりの点（class 別）。
 * - topical（技術テーマ）が主役。
 * - qualification（資格・科目・年度）は関連度に数えない（技術テーマの共有が無いときの補い fallbackScore でだけ使う）。
 *   強く数えると同じ資格の記事だけが並び（2026-10 までの関連記事。他の資格の割合 2%）、弱く数えても、資格のタグを
 *   付け忘れた記事が同点の勝負で毎回負けてどの記事からも選ばれなくなる（総監のキーワード 43 本。2026-10-21）。
 *   総監の 5 管理のように科目名がテーマを兼ねるタグは、テーマの共有（SHARED_TOPIC_POINTS）で数える。
 * - learning（試験対策・出題傾向などの学習の型）は数えない。技術テーマではないので、どの記事とも「関連」になってしまう。
 */
export const TAG_WEIGHT = Object.freeze({ topical: 10, qualification: 3, learning: 0, structural: 0, flag: 0 });
/** 同じテーマ（topics.json）に属す 1 つあたりの点。タグの綴りが違っても同じテーマの記事を拾う */
export const SHARED_TOPIC_POINTS = 6;
/** 同じ資格（カテゴリ）への小さな加点。資格内の連続学習を保つ */
export const SAME_CATEGORY_POINTS = 2;
/** limit 件のうち同じ資格が占めてよい割合。他の資格・実務に関連の強い記事があれば、そちらへも回す */
export const MAX_SAME_CATEGORY_SHARE = 4 / 6;

/**
 * @typedef {{ slug: string, category?: string, tags?: string[], published?: boolean, dateModified?: string, created?: string }} Doc
 * @typedef {{ tagClass: (tag: string) => string, topicsOf: (doc: Doc) => string[] }} Deps
 *   tagClass は tags.json の class（未登録は topical）、topicsOf は記事が属すテーマの slug
 */

const isStructural = (cls) => cls === 'structural' || cls === 'flag';

/**
 * current から見た candidate の関連度。0 は無関係（技術テーマ＝主題タグかテーマを 1 つも共有しない）。
 * @param {Doc} current @param {Doc} candidate @param {Deps} deps
 */
export function relatedScore(current, candidate, { tagClass, topicsOf }) {
  const currentTags = new Set((current.tags ?? []).filter((t) => !isStructural(tagClass(t))));
  let themePoints = 0;
  for (const tag of candidate.tags ?? []) {
    if (!currentTags.has(tag)) continue;
    const cls = tagClass(tag);
    if (cls !== 'qualification') themePoints += TAG_WEIGHT[cls] ?? 0;
  }
  const currentTopics = new Set(topicsOf(current));
  themePoints += topicsOf(candidate).filter((slug) => currentTopics.has(slug)).length * SHARED_TOPIC_POINTS;
  // 資格・年度だけが同じ記事は関連に数えない（技術テーマの共有が前提）
  if (themePoints === 0) return 0;
  return themePoints + (candidate.category === current.category ? SAME_CATEGORY_POINTS : 0);
}

/**
 * 技術テーマを共有する記事が足りないときの補い（資格・科目・学習の型の共有）。試験の概要・申込のガイドや過去問のように
 * 技術テーマのタグを持たない記事でも、同じ資格・同じ学習段階の記事へ回遊できるようにする。0 は補いにも使わない。
 * @param {Doc} current @param {Doc} candidate @param {Pick<Deps, 'tagClass'>} deps
 */
export function fallbackScore(current, candidate, { tagClass }) {
  const currentTags = new Set((current.tags ?? []).filter((t) => !isStructural(tagClass(t))));
  let points = 0;
  for (const tag of candidate.tags ?? []) {
    if (!currentTags.has(tag)) continue;
    const cls = tagClass(tag);
    if (cls === 'qualification') points += TAG_WEIGHT.qualification;
    else if (cls === 'learning') points += 1;
  }
  return points === 0 ? 0 : points + (candidate.category === current.category ? SAME_CATEGORY_POINTS : 0);
}

/** FNV-1a（32 bit）。同点の並びを記事の組ごとに決めるだけなので、暗号の強さは要らない */
function hash32(text) {
  let x = 2166136261;
  for (let i = 0; i < text.length; i++) { x ^= text.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

/**
 * 同点の並べ方。記事の組（current → candidate）ごとに決まる擬似乱数の順で、ビルドのたびには変わらない。
 * 以前は更新日の新しい順で、どの記事からも同じ新しい記事が選ばれ、1,100 本のうち 705 本が
 * どの記事の関連記事にも選ばれなかった（2026-10-21 の report-taxonomy-wiring）。組ごとに散らすと 63 本になる。
 * @param {Doc} current @param {Doc} a @param {Doc} b
 */
export function stableTieBreak(current, a, b) {
  return hash32(`${current.slug}>${a.slug}`) - hash32(`${current.slug}>${b.slug}`);
}

/**
 * current に対する近傍の記事を関連度の降順で返す。
 * - 自分自身・非公開・exclude に挙がった記事は除外（記事末で先に出した記事を重ねない）
 * - 関連度 0 は除外。技術テーマを共有する記事が limit に満たなければ、資格・学習の型を共有する記事で補う
 * - 同じ資格は limit の 4/6 まで。他の資格・実務の候補が足りなければ同じ資格で埋める
 * - 同スコアは stableTieBreak（記事の組ごとの擬似乱数。同じ記事に関連が集中しない）
 * @param {Doc} current @param {Doc[]} pool @param {number} limit @param {ReadonlySet<string>} exclude @param {Deps} deps
 * @returns {Doc[]}
 */
export function rankRelated(current, pool, limit, exclude, deps) {
  const candidates = pool.filter((m) => m.slug !== current.slug && m.published !== false && !exclude.has(m.slug));
  const rank = (score) => candidates
    .map((m) => ({ doc: m, score: score(m) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || stableTieBreak(current, a.doc, b.doc))
    .map((s) => s.doc);
  const themed = rank((m) => relatedScore(current, m, deps));
  const themedSlugs = new Set(themed.map((doc) => doc.slug));
  const ranked = themed.length >= limit
    ? themed
    : [...themed, ...rank((m) => (themedSlugs.has(m.slug) ? 0 : fallbackScore(current, m, deps)))];

  const sameCap = Math.max(1, Math.floor(limit * MAX_SAME_CATEGORY_SHARE));
  const picked = [];
  const overflow = [];
  let same = 0;
  for (const doc of ranked) {
    if (picked.length >= limit) break;
    if (doc.category === current.category) {
      if (same >= sameCap) { overflow.push(doc); continue; }
      same += 1;
    }
    picked.push(doc);
  }
  // 他の資格の候補が足りないときは、上限で外した同じ資格の記事で埋める（関連の強い順は保つ）
  for (const doc of overflow) {
    if (picked.length >= limit) break;
    picked.push(doc);
  }
  const order = new Map(ranked.map((doc, i) => [doc.slug, i]));
  return picked.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}
