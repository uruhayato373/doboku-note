import Link from 'next/link';
import { PageHead, Kpi } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadLineupView, type LineupItem, type LineupRow, type LineupSchedule } from '@/lib/lineup';

export const dynamic = 'force-dynamic';

/** 1マスに直接並べる件数。超えた分は折りたたむ（総監 note のように数十件あるマスがあるため）。 */
const VISIBLE_PER_CELL = 4;

const STAGE_ORDER = ['published', 'review', 'scheduled', 'draft', 'planned', 'retired', 'unknown'];

function stageVariant(stage: string): 'success' | 'warning' | 'outline' | 'secondary' | 'destructive' {
  if (stage === 'published') return 'success';
  if (stage === 'review' || stage === 'scheduled') return 'warning';
  if (stage === 'draft' || stage === 'planned') return 'outline';
  if (stage === 'unknown') return 'destructive';
  return 'secondary';
}

/**
 * /content/lineup — 商品ラインナップ（資格 × 試験区分 × チャネル）の read-only 画面。
 *
 * 空きマス（販売中 0）＝未展開の打ち手候補を一目で見るためのビュー。分類ルールは
 * `.claude/config/product-lineup.json`、判定は `scripts/lib/product-lineup.mjs`。
 * 価格・状態の変更や出品はしない（各チャネルのスキルの担当）。
 */
export default async function LineupPage({ searchParams }: { searchParams: Promise<{ retired?: string }> }) {
  const { retired } = await searchParams;
  const showRetired = retired === '1';
  const view = loadLineupView();
  const { channels, rows, unclassified, configErrors, sourceErrors, totals } = view;

  const visible = (items: LineupItem[]) =>
    items
      .filter((i) => showRetired || i.stage !== 'retired')
      .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <>
      <PageHead
        title="商品ラインナップ"
        sub="資格 × 試験区分 × チャネルの商品一覧・read-only（分類ルールは .claude/config/product-lineup.json）"
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        {channels.map((c) => (
          <Kpi key={c.id} label={`${c.label} 販売中`} value={`${totals[c.id]?.published ?? 0} / ${totals[c.id]?.all ?? 0}`} />
        ))}
      </div>

      {(configErrors.length > 0 || sourceErrors.length > 0) && (
        <div className="card warn-border">
          <h2>読み込みの問題</h2>
          <ul className="small">
            {sourceErrors.map((e) => (
              <li key={e.channel} className="project-warning-text">
                {e.channel}: {e.message}（このチャネルの空きマスは「未展開」ではなく「未検査」）
              </li>
            ))}
            {configErrors.map((e) => (
              <li key={e} className="project-warning-text">config: {e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>
          ラインナップ表
          <span className="sub">
            {showRetired ? (
              <Link href="/content/lineup">停止中を隠す</Link>
            ) : (
              <Link href="/content/lineup?retired=1">停止中も表示する</Link>
            )}
          </span>
        </h2>
        <p className="small muted">
          区分の日程は .claude/config/exam-calendar.json の今年度の試験日（残り日数は JST）と、日付未発表の期間。状態バッジが無い商品は販売中。「未展開」は販売中の商品が 0 件のマス。複数区分にまたがる商品（会員・診断など）は各マスに重複して表示する。
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>資格</th>
                <th>区分</th>
                {channels.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <LineupRowView key={row.key} row={row} channels={channels} visible={visible} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {unclassified.length > 0 && (
        <div className="card warn-border">
          <h2>未分類 {unclassified.length} 件</h2>
          <p className="small muted">
            どの分類ルールにも当たらなかった商品。<code>.claude/config/product-lineup.json</code> の rules に追加する。
          </p>
          <ul className="small">
            {unclassified.map((i) => (
              <li key={`${i.channel}:${i.id}`}>
                <span className="mono">{i.channel}</span> {i.title} <span className="muted mono">{i.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function LineupRowView({
  row,
  channels,
  visible,
}: {
  row: LineupRow;
  channels: { id: string; label: string }[];
  visible: (items: LineupItem[]) => LineupItem[];
}) {
  return (
    <tr style={{ verticalAlign: 'top' }}>
      {row.isFirstStage && (
        <th rowSpan={row.stageCount} scope="rowgroup" style={{ whiteSpace: 'nowrap' }}>
          {row.qualificationLabel}
        </th>
      )}
      <td style={{ whiteSpace: 'nowrap' }}>
        <div>{row.stageLabel}</div>
        <StageSchedule schedule={row.schedule} />
      </td>
      {channels.map((c) => {
        const items = visible(row.byChannel[c.id] ?? []);
        const hasPublished = items.some((i) => i.stage === 'published');
        return (
          <td key={c.id} style={{ minWidth: 200, maxWidth: 260, whiteSpace: 'normal' }}>
            {!hasPublished && <div className="small muted" style={{ marginBottom: 4 }}>未展開</div>}
            <div className="flex flex-col gap-1.5">
              {items.slice(0, VISIBLE_PER_CELL).map((i) => (
                <ItemTile key={i.id} item={i} />
              ))}
            </div>
            {items.length > VISIBLE_PER_CELL && (
              <details className="mt-1">
                <summary className="small muted cursor-pointer">ほか {items.length - VISIBLE_PER_CELL} 件</summary>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {items.slice(VISIBLE_PER_CELL).map((i) => (
                    <ItemTile key={i.id} item={i} />
                  ))}
                </div>
              </details>
            )}
          </td>
        );
      })}
    </tr>
  );
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** 'YYYY-MM-DD' → '2026/10/4（日）'。 */
function fmtExamDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}/${m}/${d}（${wd}）`;
}

/** 区分の試験日（exam-calendar.json）と残り日数。未発表の区分は期間の文言だけ出す。 */
function StageSchedule({ schedule }: { schedule: LineupSchedule | null }) {
  if (!schedule) return null;
  const many = schedule.events.length > 1;
  return (
    <div className="small" style={{ marginTop: 4, lineHeight: 1.45 }}>
      {schedule.events.map((e) => (
        <div key={`${e.label}-${e.date}`} className={e.daysLeft < 0 ? 'muted' : undefined}>
          {many && <span className="muted">{e.label} </span>}
          {fmtExamDate(e.date)}{' '}
          {e.daysLeft > 0 ? (
            <Badge variant={e.daysLeft <= 30 ? 'warning' : 'outline'}>あと{e.daysLeft}日</Badge>
          ) : e.daysLeft === 0 ? (
            <Badge variant="warning">本日</Badge>
          ) : (
            '（実施済み）'
          )}
        </div>
      ))}
      {schedule.periods.map((p) => (
        <div key={p.label} className="muted" style={{ whiteSpace: 'normal', maxWidth: 180 }}>
          {p.label} {p.window}
        </div>
      ))}
    </div>
  );
}

function ItemTile({ item: i }: { item: LineupItem }) {
  const title = i.url ? (
    <a href={i.url} target="_blank" rel="noreferrer">
      {i.title}
    </a>
  ) : (
    i.title
  );
  return (
    <div className="flex items-start gap-2" title={i.note ?? i.id}>
      {i.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={i.coverUrl} alt="" width={48} loading="lazy" className="shrink-0 rounded-sm border border-border" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[27px] w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground"
        >
          {i.platform ?? '表紙なし'}
        </span>
      )}
      <div className="min-w-0 small" style={{ lineHeight: 1.35 }}>
        <div>{title}</div>
        <div className="muted">
          {i.price ?? '—'}
          {i.stage !== 'published' && (
            <>
              {' '}
              <Badge variant={stageVariant(i.stage)}>{i.stageLabel}</Badge>
            </>
          )}
        </div>
        {i.note && <div className="muted" style={{ fontSize: 11 }}>{i.note}</div>}
      </div>
    </div>
  );
}
