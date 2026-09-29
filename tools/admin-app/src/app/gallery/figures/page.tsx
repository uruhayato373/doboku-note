import Link from 'next/link';
import { PanelCard, StatusBadge, type Tone } from '@/components/admin';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanFigures, figureProgress, FIGURE_NEEDS_ORDER, FIGURE_NEEDS_LABEL } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

/** needs → バッジ色（緊急=bad / 要対応=warn / ok=good）。 */
function needsTone(n: string | null): Tone {
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
        sub={`${items.length} 枚 · content/site/**/img/*（表示中 ${filtered.length}）`}
      />

      {/* 図クロップ進捗（公開×掲載＝ライブで読者に見える図）*/}
      <PanelCard title="進捗（公開×掲載のライブ図）" description="figure-provenance.json · ok 以外＝要対応 · png/webp は basename 重複排除">
        <div className={'flex flex-wrap items-center gap-2' + (prog.breakdown.length ? ' mb-2' : '')}>
          <StatusBadge tone="good">OK {prog.liveOk}</StatusBadge>
          <StatusBadge tone="bad">要対応 {prog.liveAction}</StatusBadge>
          <StatusBadge tone="neutral">{prog.pct}% 完了</StatusBadge>
        </div>
        {prog.breakdown.length ? (
          <p className="m-0 text-sm text-muted-foreground">
            内訳: {prog.breakdown.map((b) => `${FIGURE_NEEDS_LABEL[b.needs]} ${b.count}`).join(' · ')}
          </p>
        ) : null}
      </PanelCard>

      {/* 対応（needs）フィルタ — /figure-recrop・figure-provenance.md が参照 */}
      <div className="filterbar">
        <span className="mr-1 self-center text-xs text-muted-foreground">
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
        <p className="text-sm text-muted-foreground">該当なし</p>
      ) : (
        <div className="gallery small">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name}>
              <StatusBadge tone="neutral">{i.category}</StatusBadge>
              <StatusBadge tone={i.kind === 'svg' ? 'info' : 'neutral'}>{i.kind}</StatusBadge>
              {i.needs ? (
                <StatusBadge
                  tone={needsTone(i.needs)}
                  title={[i.needsReason, i.sourceDir ? `元: ${i.sourceDir}` : '']
                    .filter(Boolean)
                    .join(' / ')}
                >
                  {FIGURE_NEEDS_LABEL[i.needs] ?? i.needs}
                </StatusBadge>
              ) : null}
              {i.kind === 'raster' && !i.referenced ? <StatusBadge tone="warn">孤児</StatusBadge> : null}
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
