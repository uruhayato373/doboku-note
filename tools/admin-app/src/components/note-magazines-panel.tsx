import { DataTable, DetailList, DetailSheet, type DataTableColumn, type DataTableRow, StatusBadge } from '@/components/admin';
import { Stack } from '@/components/layout';
import { magazines } from '@/lib/content';
import { membershipState } from '@/lib/note-status';

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'タイトル' },
  { key: 'price', label: '価格' },
  { key: 'repoCount', label: 'repo 記事' },
  { key: 'published', label: '公開' },
];

/**
 * note マガジン一覧（商品が主語）。SoT = src/lib/note-magazines.ts。
 *
 * 記事一覧（/content/note）のマガジン facet では代替できない。facet は「ラベルの付いた記事」から
 * しか作れないので、**記事ラベルから辿れない 16 件**（essay-complete-pack / civil-membership-lab /
 * 各 takuitsu-pdf ほか＝束ね商品・単体商品・PDF 商品）が構造的に現れない。価格・バッジ・noteUrl・
 * マガジン自体の公開状態も記事の属性ではないため facet には出せない。
 *
 * 「repo 記事」列は check-magazine-membership --json の軸 A をそのまま出す（数え直さない
 * ＝第 4 のドリフト源を作らない）。0 本や参照なしがその場で見えるのがこの列の目的。
 * 取得に失敗したら 0 ではなく「?」を出す（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 */
export function NoteMagazinesPanel() {
  const mags = magazines();
  const membership = membershipState();
  const repoCount = new Map(membership.rows.map((r) => [r.id, r.repoCount]));
  const unreferenced = new Set(membership.unreferenced);
  const rows: DataTableRow[] = mags.map((m) => ({
    id: m.id,
    values: {
      title: m.title ?? m.id,
      price: m.priceStr ?? null,
      repoCount: !membership.ok ? '?' : unreferenced.has(m.id) ? 'ラベル無' : (repoCount.get(m.id) ?? 0),
      published: m.published && m.noteUrl ? '公開' : '未公開',
    },
    cells: {
      title: (
        <DetailSheet trigger={<span className="block max-w-[28rem] truncate">{m.title ?? m.id}</span>} title={m.title ?? m.id} description={m.id}>
          <DetailList items={[{ label: 'バッジ', value: m.badge }, { label: 'note', value: m.noteUrl ? <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">開く</a> : null }]} />
        </DetailSheet>
      ),
      price: m.priceStr ?? '',
      repoCount: !membership.ok ? (
        <StatusBadge tone="neutral" title={membership.error ?? ''}>?</StatusBadge>
      ) : unreferenced.has(m.id) ? (
        <StatusBadge tone="neutral" title="この id を指す noteMagazine ラベルが無い">
          ラベル無
        </StatusBadge>
      ) : (repoCount.get(m.id) ?? 0) === 0 ? (
        <StatusBadge tone="warn">0</StatusBadge>
      ) : (
        repoCount.get(m.id)
      ),
      published: m.published && m.noteUrl ? (
        <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">
          公開
        </a>
      ) : (
        <StatusBadge tone="warn">未公開</StatusBadge>
      ),
    },
  }));
  return (
    <Stack>
      {!membership.ok && <p className="text-sm"><StatusBadge tone="bad">repo 記事は判定不可</StatusBadge></p>}
      <DataTable columns={COLUMNS} rows={rows} filter="タイトルで絞り込む" />
    </Stack>
  );
}
