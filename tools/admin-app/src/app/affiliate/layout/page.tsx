import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { jstDateTime } from '@/lib/format';
import { CHECK_LABELS, SHOTS_COMMAND, latestLayoutManifest, type LayoutShot } from '@/lib/affiliate-layout';

export const dynamic = 'force-dynamic';

/** 見やすい幅（実画面の幅に比例）。画像は枠の中で縦にスクロールできる */
const FIGURE_WIDTH: Record<string, string> = { sp: 'w-[300px]', tablet: 'w-[380px]', pc: 'w-[560px]' };

const shotsOf = (shots: LayoutShot[], targetId: string, viewport: string) => shots.filter((s) => s.targetId === targetId && s.viewport === viewport);

/** 幅ごとのまとめ: 全案 OK / NG の案 / 撮影失敗 */
function summarize(list: LayoutShot[]): { text: string; tone: 'good' | 'bad' | 'warn' | 'neutral' } {
  if (!list.length) return { text: '—', tone: 'neutral' };
  const ng = list.filter((s) => s.status === 'ng');
  const err = list.filter((s) => s.status === 'error');
  if (ng.length) return { text: `NG（案 ${ng.map((s) => s.variant).join('・')}）`, tone: 'bad' };
  if (err.length) return { text: `撮影失敗（案 ${err.map((s) => s.variant).join('・')}）`, tone: 'warn' };
  return { text: 'OK', tone: 'good' };
}

/**
 * /affiliate/layout — 広告配置のスクリーンショット。ページの種類 × 画面幅の判定一覧と、選んだページの案ごとの全面画像。
 * 撮影は npm run affiliate:shots（scripts/affiliate-layout-shots.mjs）。画面からは実行しない。
 */
export default async function AffiliateLayoutPage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const manifest = latestLayoutManifest();
  const { target: targetParam } = await searchParams;

  if (!manifest) {
    return (
      <>
        <PageHead title="広告配置" />
        <p className="text-sm text-muted-foreground">まだ撮影した記録が無い。<code>{SHOTS_COMMAND}</code></p>
      </>
    );
  }

  const { viewports, variants, shots, targets } = manifest;
  const current = targets.find((t) => t.id === targetParam) ?? targets.find((t) => shots.some((s) => s.targetId === t.id && s.status !== 'ok')) ?? targets[0];

  const columns: DataTableColumn[] = [
    { key: 'label', label: 'ページの種類' },
    ...viewports.map((v) => ({ key: v.id, label: `${v.label} ${v.width}px`, wrap: true })),
  ];
  const rows: DataTableRow[] = targets.map((t) => {
    const values: DataTableRow['values'] = {
      label: t.label,
      expected: Object.entries(t.expected).map(([slot, r]) => `${r.ruleId} ${slot}`).join(' / ') || '広告なし',
    };
    const cells: NonNullable<DataTableRow['cells']> = {
      label: (
        <span className="inline-flex items-center gap-3">
          <Link href={`/affiliate/layout?target=${t.id}`} className={t.id === current?.id ? 'font-bold underline' : 'underline'}>{t.label}</Link>
          <DetailSheet trigger={<span className="text-muted-foreground">詳細</span>} title={t.label}>
            <DetailList items={[{ label: '撮ったページ', value: t.path }, { label: '今の配置ルール', value: String(values.expected) }]} />
          </DetailSheet>
        </span>
      ),
    };
    for (const v of viewports) {
      const s = summarize(shotsOf(shots, t.id, v.id));
      values[v.id] = s.text;
      cells[v.id] = <StatusBadge tone={s.tone}>{s.text}</StatusBadge>;
    }
    return { id: t.id, values, cells };
  });

  return (
    <>
      <PageHead title="広告配置" sub={`${jstDateTime(manifest.generatedAt, { short: true })} 撮影`} />
      <div className="mb-4">
        <DataTable columns={columns} rows={rows} pageSize={50} />
      </div>
      {current && (
        <PanelCard title={`${current.label}（${current.path}）`}>
          <div className="flex flex-col gap-6">
            {viewports.map((v) => (
              <div key={v.id}>
                <h3 className="mb-2 text-sm font-bold">{v.label} {v.width}px</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {variants.map((variant) => {
                    const s = shots.find((x) => x.targetId === current.id && x.viewport === v.id && x.variant === variant);
                    return (
                      <figure key={variant} className={`flex shrink-0 flex-col gap-2 ${FIGURE_WIDTH[v.id] ?? 'w-[400px]'}`}>
                        <figcaption className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold">案 {variant}</span>
                          {s ? <StatusBadge tone={s.status === 'ok' ? 'good' : s.status === 'ng' ? 'bad' : 'warn'}>{s.status === 'ok' ? 'OK' : s.status === 'ng' ? 'NG' : '撮影失敗'}</StatusBadge> : <span>—</span>}
                          {s?.ads && <span className="text-muted-foreground">広告 {s.ads.length}</span>}
                          {s?.truncated && <span className="text-muted-foreground">下を省略（{s.pageHeight}px）</span>}
                        </figcaption>
                        {s?.file ? (
                          <a href={`/affiliate/layout-shot/${manifest.ts}/${s.file}`} target="_blank" rel="noreferrer" title="全体を開く">
                            <div className="h-[560px] overflow-y-auto rounded-md border">
                              <img src={`/affiliate/layout-shot/${manifest.ts}/${s.file}`} alt={`${current.label} ${v.label} 案${variant}`} className="block w-full" loading="lazy" />
                            </div>
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">{s?.error ?? '撮影なし'}</p>
                        )}
                        {s?.crops && s.crops.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {s.crops.map((c) => (
                              <a key={c.file} href={`/affiliate/layout-shot/${manifest.ts}/${c.file}`} target="_blank" rel="noreferrer" title="広告のまわりを開く">
                                <div className="text-xs text-muted-foreground">広告のまわり・{c.placement}（上から {c.y}px〜）</div>
                                <img src={`/affiliate/layout-shot/${manifest.ts}/${c.file}`} alt={`${current.label} ${v.label} 案${variant} ${c.placement} のまわり`} className="block w-full rounded-md border" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                        {s?.checks && (
                          <ul className="text-xs leading-5">
                            {Object.entries(s.checks).filter(([, c]) => !c.ok).map(([k, c]) => (
                              <li key={k} className="project-warning-text">{CHECK_LABELS[k] ?? k}: {c.detail.join(' / ')}</li>
                            ))}
                            {(s.warnings ?? []).map((w) => <li key={w} className="text-muted-foreground">注意: {w}</li>)}
                          </ul>
                        )}
                        {s?.ads && s.ads.length > 0 && (
                          <ul className="text-xs leading-5 text-muted-foreground">
                            {s.ads.map((a, i) => <li key={i}>{a.ruleId ?? 'ルール無し'}・{a.placement}・{a.program}（上から {a.top}px）</li>)}
                          </ul>
                        )}
                      </figure>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
    </>
  );
}
