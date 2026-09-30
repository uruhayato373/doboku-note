import { Facet, FacetHead, FacetShell, type FacetItem } from '@/components/admin';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanFigures, type FigureItem } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

const SITE = 'https://doboku-note.com';
const KINDS = [
  { key: 'svg', label: 'SVG' },
  { key: 'raster', label: '画像' },
] as const;

/** 一覧・絞り込み用の短い記事名（資格名の前置きと「 — 」「｜」以降の副題を落とす）。 */
function shortTitle(title: string, label: string | undefined): string {
  const t = title.split(/\s+—\s+|｜/)[0];
  return (label && t.startsWith(label) ? t.slice(label.length) : t).trim() || title;
}

/** 記事図版の目視確認用。図は記事ごとにまとめ、白地で並べるだけ（品質判定は CLI 側）。 */
export default async function FiguresGallery({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; doc?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const { items, catLabel } = scanFigures();

  const cats = [...new Set(items.map((i) => i.category))].sort();
  const cat = cats.includes(sp.cat ?? '') ? sp.cat! : null;
  const kind = KINDS.some((k) => k.key === sp.kind) ? sp.kind! : null;
  const inCat = items.filter((i) => !cat || i.category === cat);
  const docKeys = [...new Set(inCat.map((i) => i.docSlug))];
  const doc = cat && docKeys.includes(sp.doc ?? '') ? sp.doc! : null;
  const shown = inCat.filter((i) => (!doc || i.docSlug === doc) && (!kind || i.kind === kind));

  const href = (patch: Partial<Record<'cat' | 'doc' | 'kind', string | null>>) => {
    const next = { cat, doc, kind, ...patch };
    if ('cat' in patch) next.doc = null;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return '/gallery/figures' + (s ? `?${s}` : '');
  };
  const count = (list: FigureItem[], pred: (i: FigureItem) => boolean) => list.filter(pred).length;
  const facet = (key: 'cat' | 'doc' | 'kind', cur: string | null, list: { key: string; label: string; count: number }[]): FacetItem[] =>
    list.map((o) => ({ ...o, href: href({ [key]: cur === o.key ? null : o.key }), active: cur === o.key }));

  const byDoc = new Map<string, FigureItem[]>();
  for (const i of shown) byDoc.set(i.docSlug, [...(byDoc.get(i.docSlug) ?? []), i]);

  const main =
    shown.length === 0 ? (
      <p className="text-sm text-muted-foreground">該当なし</p>
    ) : (
      <div className="flex flex-col gap-6">
        {[...byDoc].map(([slug, list]) => (
          <section key={slug} className="flex flex-col gap-2">
            <h3 className="m-0 flex items-baseline gap-3 text-sm font-semibold">
              <span>{shortTitle(list[0].docTitle, catLabel[list[0].category])}</span>
              <a href={`${SITE}/docs/${slug}`} target="_blank" rel="noreferrer" className="text-xs font-normal">
                サイトで開く
              </a>
            </h3>
            <div className="gallery small">
              {list.map((i) => (
                <Thumb key={i.rel} url={i.url} name={i.rel} href={i.url} paper bare />
              ))}
            </div>
          </section>
        ))}
      </div>
    );

  const rail = (
    <>
      <FacetHead clearHref={cat || doc || kind ? '/gallery/figures' : null} />
      <Facet
        title="資格"
        items={facet('cat', cat, cats.map((c) => ({ key: c, label: catLabel[c] ?? c, count: count(items, (i) => i.category === c) })))}
      />
      {cat ? (
        <Facet
          title="記事"
          items={facet('doc', doc, docKeys.map((d) => ({ key: d, label: shortTitle(inCat.find((i) => i.docSlug === d)!.docTitle, catLabel[cat]), count: count(inCat, (i) => i.docSlug === d) })))}
        />
      ) : null}
      <Facet title="種別" items={facet('kind', kind, KINDS.map((k) => ({ ...k, count: count(inCat, (i) => i.kind === k.key) })))} />
    </>
  );

  return (
    <>
      <PageHead title="記事図版" sub={`${shown.length} 枚`} />
      <FacetShell main={main} rail={rail} />
    </>
  );
}
