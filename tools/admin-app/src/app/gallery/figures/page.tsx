import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanFigures, figureProgress, FIGURE_NEEDS_ORDER, FIGURE_NEEDS_LABEL } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

/** needs → バッジ色（緊急=bad / 要対応=warn / ok=good）。 */
function needsClass(n: string | null): string {
  if (!n || n === 'ok') return 'good';
  if (n === 'recrop-urgent') return 'bad';
  return 'warn';
}

export default async function FiguresGallery({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; kind?: string; needs?: string }>;
}) {
  const sp = await searchParams;
  const { items } = scanFigures();
  const prog = figureProgress(items);

  const cats = [...new Set(items.map((i) => i.category))].sort();
  const activeCat = cats.includes(sp.cat ?? '') ? sp.cat! : 'all';
  const activeKind = sp.kind === 'svg' || sp.kind === 'raster' ? sp.kind : 'all';
  const activeNeeds = (FIGURE_NEEDS_ORDER as readonly string[]).includes(sp.needs ?? '')
    ? sp.needs!
    : 'all';

  const filtered = items.filter(
    (i) =>
      (activeCat === 'all' || i.category === activeCat) &&
      (activeKind === 'all' || i.kind === activeKind) &&
      (activeNeeds === 'all' || i.needs === activeNeeds),
  );

  const link = (patch: Partial<{ cat: string; kind: string; needs: string }>) => {
    const cat = patch.cat ?? activeCat;
    const kind = patch.kind ?? activeKind;
    const needs = patch.needs ?? activeNeeds;
    const q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (kind !== 'all') q.set('kind', kind);
    if (needs !== 'all') q.set('needs', needs);
    const s = q.toString();
    return '/gallery/figures' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead
        title="記事図版ギャラリー"
        sub={`${items.length} 枚 · .local/r2/posts/**/img/*（表示中 ${filtered.length}）`}
      />

      {/* 図クロップ進捗（公開×掲載＝ライブで読者に見える図）*/}
      <div className="card">
        <h2>
          進捗（公開×掲載のライブ図）
          <span className="sub">figure-provenance.json · ok 以外＝要対応 · png/webp は basename 重複排除</span>
        </h2>
        <div className="filterbar" style={{ marginBottom: prog.breakdown.length ? 8 : 0 }}>
          <span className="badge good">OK {prog.liveOk}</span>
          <span className="badge bad">要対応 {prog.liveAction}</span>
          <span className="badge neutral">{prog.pct}% 完了</span>
        </div>
        {prog.breakdown.length ? (
          <p className="small muted" style={{ margin: 0 }}>
            内訳: {prog.breakdown.map((b) => `${FIGURE_NEEDS_LABEL[b.needs]} ${b.count}`).join(' · ')}
          </p>
        ) : null}
      </div>

      {/* 対応（needs）フィルタ — /figure-recrop・figure-provenance.md が参照 */}
      <div className="filterbar">
        <span className="muted small" style={{ alignSelf: 'center', marginRight: 4 }}>
          対応:
        </span>
        <Link href={link({ needs: 'all' })} className={'chip' + (activeNeeds === 'all' ? ' active' : '')}>
          全て
        </Link>
        {FIGURE_NEEDS_ORDER.filter((s) => prog.ndCount[s]).map((s) => (
          <Link key={s} href={link({ needs: s })} className={'chip' + (activeNeeds === s ? ' active' : '')}>
            {FIGURE_NEEDS_LABEL[s]} {prog.ndCount[s]}
          </Link>
        ))}
      </div>

      {/* 資格 */}
      <div className="filterbar">
        <Link href={link({ cat: 'all' })} className={'chip' + (activeCat === 'all' ? ' active' : '')}>
          全資格
        </Link>
        {cats.map((c) => (
          <Link key={c} href={link({ cat: c })} className={'chip' + (activeCat === c ? ' active' : '')}>
            {c}
          </Link>
        ))}
      </div>

      {/* 種別 */}
      <div className="filterbar">
        {['all', 'svg', 'raster'].map((k) => (
          <Link key={k} href={link({ kind: k })} className={'chip' + (activeKind === k ? ' active' : '')}>
            {k === 'all' ? '全種別' : k === 'svg' ? 'SVG図版' : 'ラスタ図'}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">該当なし</div>
      ) : (
        <div className="gallery small">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name}>
              <span className="badge neutral">{i.category}</span>
              <span className={'badge ' + (i.kind === 'svg' ? 'accent' : 'neutral')}>{i.kind}</span>
              {i.needs ? (
                <span
                  className={'badge ' + needsClass(i.needs)}
                  title={[i.needsReason, i.sourceDir ? `元: ${i.sourceDir}` : '']
                    .filter(Boolean)
                    .join(' / ')}
                >
                  {FIGURE_NEEDS_LABEL[i.needs] ?? i.needs}
                </span>
              ) : null}
              {i.kind === 'raster' && !i.referenced ? <span className="badge warn">孤児</span> : null}
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
