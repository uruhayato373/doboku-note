import { PanelCard, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { affiliatePreviewSurfaces, type PreviewSurface, type PreviewWidth } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

/** サイトの開発サーバー（scripts/dev-server.mjs が -p 3020 で起動）。見本は本番ではなく手元の実ページを開く。 */
const SITE_DEV_ORIGIN = 'http://localhost:3020';

/** 実ページの幅と高さ。PC は 1280×1000 を 0.6 倍に縮めて横に並べる（枠＝縮めた後の大きさ） */
const FRAME: Record<PreviewWidth, { label: string; box: string; frame: string }> = {
  sp: { label: 'スマホ 375px', box: 'h-[760px] w-[375px]', frame: 'h-[760px] w-[375px]' },
  pc: { label: 'PC 1280px', box: 'h-[600px] w-[768px]', frame: 'h-[1000px] w-[1280px] origin-top-left scale-[0.6]' },
};

function previewUrl(s: PreviewSurface, variant: string | null) {
  const q = new URLSearchParams({ previewFocus: s.slot });
  if (variant) q.set('affiliateVariant', variant);
  return `${SITE_DEV_ORIGIN}${s.path}?${q}`;
}

function Frame({ src, width }: { src: string; width: PreviewWidth }) {
  const f = FRAME[width];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{f.label}</span>
        <a href={src} target="_blank" rel="noreferrer">開く</a>
      </div>
      <div className={`overflow-hidden rounded-md border ${f.box}`}>
        <iframe src={src} title={f.label} loading="lazy" className={`border-0 ${f.frame}`} />
      </div>
    </div>
  );
}

/**
 * /affiliate/preview — 広告の面ごとに、実験の案（AFFILIATE_VARIANTS・今は B/C）をスマホ幅と PC 幅で並べて見る。
 * 実ページをサイトの開発サーバーで iframe に開き、?affiliateVariant= で案を固定、?previewFocus= でその面までスクロールする
 * （どちらも開発サーバーだけで効く: CareerAffiliateExperiment・DevPreviewFocus）。
 */
export default async function AffiliatePreviewPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) {
  const surfaces = affiliatePreviewSurfaces();
  const { slot } = await searchParams;
  const current = surfaces.find((s) => s.slot === slot) ?? surfaces.find((s) => s.path) ?? null;
  return (
    <>
      <PageHead title="広告の見本" />
      <FilterBar className="mb-3">
        {surfaces.map((s) => (
          <FilterChip key={s.slot} href={`/affiliate/preview?slot=${s.slot}`} active={s.slot === current?.slot}>
            {s.label}
            {!s.path && '（見本なし）'}
          </FilterChip>
        ))}
      </FilterBar>
      {current && !current.path && <p className="text-sm text-muted-foreground">この面の見本ページは未登録（tools/admin-app/src/lib/affiliate.ts の PREVIEW_PAGES）</p>}
      {current?.path && (
        <Stack gap="lg">
          {(current.variants.length ? current.variants : [null]).map((v) => (
            <PanelCard key={v ?? 'none'} title={v ? `${v} 案` : '実験の外（案なし）'}>
              <div className="flex flex-wrap items-start gap-6">
                {current.widths.map((w) => (
                  <Frame key={w} src={previewUrl(current, v)} width={w} />
                ))}
              </div>
            </PanelCard>
          ))}
        </Stack>
      )}
    </>
  );
}
