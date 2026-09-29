import Link from 'next/link';
import {
  numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
} from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { allChannelLifecycles, totalsOf, STAGE_ORDER, LABELS, DESCRIPTIONS } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

/**
 * /content/lifecycle — 全チャネルを「企画 → 下書き → 公開」の共通ステージで横断表示（read-only）。
 *
 * ステージ語彙と写像は scripts/lib/content-lifecycle.mjs（真実源）。各チャネルの
 * ネイティブ状態は書き換えず、ここは数えて並べるだけ。取得できなかったチャネルは
 * 0 件ではなく「未取得」と明示する（0 と検査不成立を同じ緑にしない）。
 */
export default async function LifecyclePage() {
  const rows = await allChannelLifecycles();
  const { counts, missing } = totalsOf(rows);

  return (
    <>
      <PageHead
        title="コンテンツ ライフサイクル"
        sub={`${rows.length} チャネル · 共通ステージで横断集計（read-only）${missing ? ` · 未取得 ${missing}` : ''}`}
      />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href="/content">コンテンツ</Link>
      </nav>

      <Stack>
        <PanelCard title="合計" description="未取得チャネルは合算に含めない">
          <div className="flex flex-wrap items-center gap-2">
            {STAGE_ORDER.map((s) => (
              <StatusBadge key={s} tone="neutral" title={DESCRIPTIONS[s]}>
                {LABELS[s]} {(counts as unknown as Record<string, number>)[s]}
              </StatusBadge>
            ))}
            {counts.unknown > 0 && <StatusBadge tone="bad">不明 {counts.unknown}</StatusBadge>}
          </div>
        </PanelCard>

        <PanelCard title="チャネル × 段階" description="各チャネルのネイティブ状態を共通ステージへ写像（真実源は各チャネルの SoT）">
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>チャネル</TableHead>
                {STAGE_ORDER.map((s) => (
                  <TableHead key={s} className={numCol} title={DESCRIPTIONS[s]}>
                    {LABELS[s]}
                  </TableHead>
                ))}
                <TableHead className={numCol}>不明</TableHead>
                <TableHead className={numCol}>計</TableHead>
                <TableHead>出所</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={r.href}>{r.label}</Link>
                    {!r.ok && <span className="ml-1.5"><StatusBadge tone="bad">未取得</StatusBadge></span>}
                  </TableCell>
                  {STAGE_ORDER.map((s) => {
                    const n = (r.counts as unknown as Record<string, number>)[s];
                    return (
                      <TableCell key={s} className={numCol}>
                        {r.ok ? (n || <span className="text-muted-foreground">0</span>) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell className={numCol}>
                    {!r.ok ? (
                      <span className="text-muted-foreground">—</span>
                    ) : r.counts.unknown ? (
                      <StatusBadge tone="bad">{r.counts.unknown}</StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className={numCol}>{r.ok ? r.total : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.ok ? r.source : r.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>

        <PanelCard title="ステージの意味" description=".claude/knowledge/reference/content-lifecycle.md が真実源">
          <ul className="content-listing">
            {STAGE_ORDER.map((s) => (
              <li key={s}>
                <StatusBadge tone="neutral">{LABELS[s]}</StatusBadge>
                <span className="text-muted-foreground"> · {DESCRIPTIONS[s]}</span>
              </li>
            ))}
            <li>
              <StatusBadge tone="bad">不明</StatusBadge>
              <span className="text-muted-foreground"> · ネイティブ状態を共通ステージへ写像できていない（写像表の更新もれ）</span>
            </li>
          </ul>
        </PanelCard>
      </Stack>
    </>
  );
}
