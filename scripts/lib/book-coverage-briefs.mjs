/**
 * book-coverage-briefs.mjs — 書籍の網羅の判定（verdict.json の plan）を、記事ごとの brief に束ねる（DN-0621）。
 *
 * 判定の計画は本ごとに出る。同じ記事に効く複数の本の追記を 1 回で書けるよう、記事ごとに束ねて
 *   - brief（<資格>__<slug>.md）: 追記の見出し・位置・論点・図と写真の案（Writer が読む）
 *   - QA 用（<資格>__<slug>.qa.md）: 追記と読み比べる書籍の節（QA が開く OCR の節だけ）
 *   - items: 展開の workflow（.claude/workflows/book-coverage-expand.js）に渡す記事の一覧
 * を作る。brief は市販書籍の見出し・用語を含むので、書き出し先は git 管理外（.tmp/）にする。
 *
 * 新しい記事の案の重複も見る（book-coverage-expansion.md §0）。2026-10-09 に、経営事項審査の新規案が
 * 3 冊から別々の slug で出ていた。束ねる前に alias（案の slug → 既存か代表の slug）で寄せる。
 *
 * I/O を持たない。読み書きは呼び手（audit-reference-book-coverage --briefs）。
 */

const PRIORITY = { A: 0, B: 1, C: 2 };

/** 文字の 2-gram の Jaccard。題名の言い回しの近さを見るだけ（意味の判定ではない）。 */
export function titleSimilarity(a, b) {
  const grams = (s) => {
    const t = String(s ?? '').replace(/[\s　・、。（）()「」—－-]/g, '');
    const out = new Set();
    for (let i = 0; i + 1 < t.length; i += 1) out.add(t.slice(i, i + 2));
    return out;
  };
  const x = grams(a);
  const y = grams(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const g of x) if (y.has(g)) common += 1;
  return common / (x.size + y.size - common);
}

/** alias の値は slug の文字列か { to, title }。 */
function resolveAlias(alias, article) {
  const v = alias?.[article];
  if (!v) return { article, title: null, aliased: false };
  return typeof v === 'string' ? { article: v, title: null, aliased: true } : { article: v.to, title: v.title ?? null, aliased: true };
}

/**
 * @param {object} p
 * @param {{ id: string, shelf?: string, directory: string, verdict: object, candidates: object }[]} p.books 判定済みの書籍（棚の順に並べておく）
 * @param {Record<string, string|{to: string, title?: string}>} [p.alias] 案の slug を寄せる先
 * @param {Map<string, string>} p.existing 既存の記事（<資格>/<slug> → 題名）
 * @param {number} [p.similar] 題名が近いとみなす閾値
 * @returns {{ briefs: {file: string, brief: string, qa: string}[], items: object[], warnings: string[] }}
 */
export function buildBriefs({ books, alias = {}, existing, similar = 0.5 }) {
  const shelfRank = new Map();
  for (const b of books) if (!shelfRank.has(b.shelf ?? '')) shelfRank.set(b.shelf ?? '', shelfRank.size);
  const warnings = [];
  const arts = new Map();

  for (const book of books) {
    const units = new Map((book.candidates?.units ?? []).map((u) => [u.id, u]));
    for (const plan of book.verdict?.plan ?? []) {
      if (!plan.additions?.length) continue;   // ほかの記事へ振り分けた残り
      const { article, title: forced, aliased } = resolveAlias(alias, plan.article);
      let isNew = Boolean(plan.new) && !aliased;
      if (isNew && existing.has(article)) {
        warnings.push(`${book.id}: 新規案 ${article} は既にある記事。既存記事への追記として束ねた`);
        isNew = false;
      }
      if (!arts.has(article)) arts.set(article, { article, new: false, title: null, adds: [], sources: new Set(), rank: Infinity, qa: new Set() });
      const x = arts.get(article);
      x.new ||= isNew;
      x.title = forced ?? x.title ?? plan.title ?? null;
      x.rank = Math.min(x.rank, shelfRank.get(book.shelf ?? '') ?? Infinity);
      x.sources.add(book.id);
      for (const ad of plan.additions) {
        x.adds.push({ ...ad, sourceId: book.id });
        for (const uid of ad.unitIds ?? []) {
          const u = units.get(uid);
          if (u) x.qa.add(JSON.stringify([book.id, book.directory, u.file, u.page ?? null, String(u.heading ?? '').slice(0, 40)]));
        }
      }
    }
  }

  // 新しい記事の案どうし・既存の記事と、同じ資格で題名が近いものを挙げる（寄せるかは親が決めて alias に書く）
  const fresh = [...arts.values()].filter((x) => x.new);
  for (let i = 0; i < fresh.length; i += 1) {
    const dir = fresh[i].article.split('/')[0];
    for (let j = i + 1; j < fresh.length; j += 1) {
      if (fresh[j].article.split('/')[0] !== dir) continue;
      const s = titleSimilarity(fresh[i].title, fresh[j].title);
      if (s >= similar) warnings.push(`新規案どうしが近い（${s.toFixed(2)}）: ${fresh[i].article}「${fresh[i].title}」と ${fresh[j].article}「${fresh[j].title}」。1 本にするなら alias で寄せる`);
    }
    for (const [slug, title] of existing) {
      if (slug.split('/')[0] !== dir) continue;
      const s = titleSimilarity(fresh[i].title, title);
      if (s >= similar) warnings.push(`新規案が既存の記事に近い（${s.toFixed(2)}）: ${fresh[i].article}「${fresh[i].title}」と ${slug}「${title}」。追記で足りるなら alias で寄せる`);
    }
  }

  const briefs = [];
  const items = [];
  const ordered = [...arts.values()].sort((a, b) => a.rank - b.rank || b.adds.length - a.adds.length || a.article.localeCompare(b.article));
  for (const x of ordered) {
    const file = x.article.replace('/', '__');
    const lines = [`# 追加の brief: ${x.article}${x.new ? '（新規記事）' : ''}`, ''];
    if (x.new) lines.push(`新規記事の題名案: ${x.title}`, '');
    lines.push(`書籍 id（frontmatter の sources に足す）: ${[...x.sources].sort().join(', ')}`, '');
    lines.push('見出しと論点は判定のための仮の言葉。見出しの言葉・順・切り口は組み直す（book-coverage-expansion.md §1）。', '');
    for (const ad of [...x.adds].sort((a, b) => (PRIORITY[a.priority] ?? 3) - (PRIORITY[b.priority] ?? 3))) {
      lines.push(`## [${ad.priority ?? '-'}] ${ad.heading}（H${ad.level ?? 2}・位置: 「${ad.after ?? '-'}」の後）`);
      lines.push(`- 論点（語句）: ${(ad.points ?? []).join(' / ')}`);
      if (ad.figure) lines.push(`- 図の案: ${ad.figure}`);
      if (ad.photo) lines.push(`- 写真の案: ${ad.photo}`);
      lines.push('');
    }
    const qa = [`# QA 用: ${x.article} の追記と読み比べる書籍の節`, ''];
    for (const row of [...x.qa].sort()) {
      const [sid, dir, f, page, heading] = JSON.parse(row);
      qa.push(`- ${sid}: content/sources/books/${dir}/ocr/${f}（${page ?? '-'}・「${heading}」）`);
    }
    briefs.push({ file, brief: lines.join('\n') + '\n', qa: qa.join('\n') + '\n' });
    items.push({ article: x.article, file, new: x.new, adds: x.adds.length, sources: [...x.sources].sort(), photos: x.adds.filter((ad) => ad.photo).length });
  }
  return { briefs, items, warnings };
}
