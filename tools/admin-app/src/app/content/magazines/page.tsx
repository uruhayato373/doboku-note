import {
  StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { magazines } from '@/lib/content';
import { membershipState } from '@/lib/note-status';

export const dynamic = 'force-dynamic';

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
export default function ContentMagazinesPage() {
  const mags = magazines();
  const pub = mags.filter((m) => m.published).length;
  const membership = membershipState();
  const repoCount = new Map(membership.rows.map((r) => [r.id, r.repoCount]));
  const unreferenced = new Set(membership.unreferenced);
  return (
    <>
      <PageHead
        title="note マガジン"
        sub={`${mags.length} 件（公開 ${pub} / 未公開 ${mags.length - pub}）· SoT: src/lib/note-magazines.ts`}
      />
      <Stack>
        {membership.ok ? (
          <p className="text-sm text-muted-foreground">
            「repo 記事」= 記事 frontmatter <code>noteMagazine</code> の実数（check-magazine-membership 軸 A）。
            <strong>{unreferenced.size}</strong> 件はラベルから辿れない（束ね商品・単体商品・PDF）ため、
            記事一覧のマガジン絞り込みには現れない。
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <StatusBadge tone="bad">repo 記事は判定不可</StatusBadge>{' '}
            check-magazine-membership が実行できないため「?」を出しています（空欄＝0本 ではありません）。
            {membership.error}
          </p>
        )}
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead className="hidden xl:table-cell">id</TableHead>
              <TableHead>価格</TableHead>
              <TableHead>repo 記事</TableHead>
              <TableHead>公開</TableHead>
              <TableHead>バッジ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {mags.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-[28rem] truncate" title={m.title ?? m.id}>{m.title ?? m.id}</TableCell>
                  <TableCell className="hidden max-w-[16rem] truncate font-mono text-xs xl:table-cell" title={m.id}>{m.id}</TableCell>
                  <TableCell>{m.priceStr ?? ''}</TableCell>
                  <TableCell>
                    {!membership.ok ? (
                      <StatusBadge tone="neutral" title={membership.error ?? ''}>?</StatusBadge>
                    ) : unreferenced.has(m.id) ? (
                      <StatusBadge tone="neutral" title="この id を指す noteMagazine ラベルが無い">
                        ラベル無
                      </StatusBadge>
                    ) : (repoCount.get(m.id) ?? 0) === 0 ? (
                      <StatusBadge tone="warn">0</StatusBadge>
                    ) : (
                      repoCount.get(m.id)
                    )}
                  </TableCell>
                  <TableCell>
                    {m.published && m.noteUrl ? (
                      <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">
                        公開
                      </a>
                    ) : (
                      <StatusBadge tone="warn">未公開</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.badge ?? ''}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </TableFrame>
      </Stack>
    </>
  );
}
