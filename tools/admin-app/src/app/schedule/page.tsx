import Link from 'next/link';
import { join } from 'node:path';
import { PanelCard, StatusBadge, type Tone, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import {
  scheduleBoard,
  buildMonthMatrix,
  groupByDay,
  weekdayLabel,
  todayJst,
  type ScheduleEventView,
  type ScheduleChannel,
  type ScheduleDomain,
  DOMAINS,
} from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/**
 * /schedule — 予約・計画・期日の横断ビュー（読み取り専用）。
 *
 * データは scripts/lib/schedule-events.mjs の collectScheduleEvents を @/lib/schedule 経由で
 * 読むだけ。書き込みUI・予約操作・カレンダー編集はここに一切実装しない（admin は読み取り専用）。
 *
 * `dom`（領域: 試験/商品/SNS/開発/経営）と `ch`（チャネル）で絞り込む。適用範囲: 健全性ストリップは常に5チャネル全部を出す
 * （「データソースは生きているか」という別の関心事のため）。月グリッド・日別ドリルダウン・
 * 超過一覧（YouTube 集約行含む）は ch でフィルタする。
 */

type Query = { m?: string; d?: string; ch?: string; dom?: string };

const CHANNEL_ORDER: ScheduleChannel[] = ['exam', 'note', 'kindle', 'coconala', 'x', 'instagram', 'youtube', 'video', 'todo', 'experiment', 'review'];
const CHANNEL_LABEL: Record<ScheduleChannel, string> = {
  exam: '試験',
  note: 'note',
  kindle: 'Kindle',
  coconala: 'ココナラ',
  x: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  video: '動画パック',
  todo: 'TODO',
  experiment: '実験',
  review: 'レビュー',
};
const STATUS_LABEL: Record<ScheduleEventView['status'], string> = {
  planned: '予定',
  reserved: '予約済み',
  posted: '投稿済み',
  overdue: '超過',
};
const STATUS_TONE: Record<ScheduleEventView['status'], Tone> = {
  planned: 'neutral',
  reserved: 'info',
  posted: 'good',
  overdue: 'bad',
};
const SOURCE_CHANNEL: Record<ScheduleEventView['sourceId'], ScheduleChannel> = {
  'exam-calendar': 'exam',
  'x-campaign': 'x',
  'x-status': 'x',
  'ig-status': 'instagram',
  'youtube-schedule': 'youtube',
  backlog: 'todo',
  'note-articles': 'note',
  'kindle-catalog': 'kindle',
  'coconala-catalog': 'coconala',
  'video-status': 'video',
  experiments: 'experiment',
  'business-review': 'review',
};
const WEEK_HEADERS = ['月', '火', '水', '木', '金', '土', '日'];

function isValidMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}
function isValidDay(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isValidDomain(v: string | undefined): v is ScheduleDomain {
  return !!v && DOMAINS.some((d) => d.id === v);
}
function isValidChannel(v: string | undefined): v is ScheduleChannel {
  return !!v && (CHANNEL_ORDER as string[]).includes(v);
}

/** 年またぎ対応の月シフト（Date.UTC のオーバーフローに任せる。buildMonthMatrix と同じ手法）。 */
function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function href(q: Query, patch: Partial<Query>): string {
  const merged = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `/schedule?${search}` : '/schedule';
}

function vscodeLink(relPath: string): string {
  return `vscode://file/${join(findRepoRoot(), relPath).replace(/\\/g, '/')}`;
}

/** 健全性ストリップ：チャネル別に SourceReport を合算する（ch フィルタの影響を受けない）。 */
function ChannelHealth({ board }: { board: Awaited<ReturnType<typeof scheduleBoard>> }) {
  const byChannel = new Map<ScheduleChannel, { count: number; ok: boolean; errors: string[] }>();
  for (const ch of CHANNEL_ORDER) byChannel.set(ch, { count: 0, ok: true, errors: [] });
  for (const s of board.sources) {
    const ch = SOURCE_CHANNEL[s.id];
    const acc = byChannel.get(ch)!;
    acc.count += s.count;
    if (!s.ok) { acc.ok = false; acc.errors.push(...s.errors.map((e) => `${s.id}: ${e.message}`)); }
  }
  const ytOverdue = board.allEvents.filter((e) => e.channel === 'youtube' && e.status === 'overdue').length;
  const allErrors = [...byChannel.values()].flatMap((v) => v.errors);
  return (
    <>
      <div className="schedule-health">
        {CHANNEL_ORDER.map((ch) => {
          const acc = byChannel.get(ch)!;
          return (
            <span key={ch} className={'schedule-health-item' + (acc.ok ? '' : ' bad')}>
              {ch !== 'exam' ? <span className={`ch-dot ${ch}`} /> : null}
              {CHANNEL_LABEL[ch]}
              {acc.ok ? (
                <span className="n">{acc.count}</span>
              ) : (
                <span className="n">読取失敗</span>
              )}
              {ch === 'youtube' && ytOverdue > 0 ? (
                <span className="schedule-health-note">（超過{ytOverdue} = DN-0131）</span>
              ) : null}
            </span>
          );
        })}
      </div>
      {allErrors.length ? (
        <div className="schedule-source-errors">
          {allErrors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      ) : null}
    </>
  );
}

function MonthNav({ month, query }: { month: string; query: Query }) {
  const [y, m] = month.split('-').map(Number);
  const today = todayJst();
  return (
    <div className="schedule-nav">
      <Link href={href(query, { m: shiftMonth(month, -1) })}>‹ 前月</Link>
      <span className="schedule-nav-current">{y}年{m}月</span>
      <Link href={href(query, { m: today.slice(0, 7), d: undefined })}>今日</Link>
      <Link href={href(query, { m: shiftMonth(month, 1) })}>翌月 ›</Link>
    </div>
  );
}

function MonthGrid({ month, events, query, today }: { month: string; events: ScheduleEventView[]; query: Query; today: string }) {
  const rows = buildMonthMatrix(month);
  const byDay = groupByDay(events);
  return (
    <TableFrame>
      <TableHeader>
        <TableRow>{WEEK_HEADERS.map((w) => <TableHead key={w}>{w}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <TableRow key={ri}>
            {row.map((dateKey, ci) => {
              if (!dateKey) return <TableCell key={ci}><div className="schedule-cell-empty" /></TableCell>;
              const dayEvents = byDay.get(dateKey) ?? [];
              const examEvents = dayEvents.filter((e) => e.kind === 'exam');
              const others = dayEvents.filter((e) => e.kind !== 'exam');
              const overdueNonYoutube = dayEvents.filter((e) => e.status === 'overdue' && e.channel !== 'youtube').length;
              const counts = new Map<ScheduleChannel, number>();
              for (const e of others) counts.set(e.channel, (counts.get(e.channel) ?? 0) + 1);
              const dayNum = Number(dateKey.slice(-2));
              const isToday = dateKey === today;
              return (
                <TableCell key={ci}>
                  <Link className="schedule-cell" href={href(query, { d: dateKey })}>
                    <span className={'schedule-day-num' + (isToday ? ' is-today' : '')}>{dayNum}</span>
                    {examEvents.map((e) => (
                      <span key={e.id} className="schedule-exam-pill">{e.label}</span>
                    ))}
                    {others.length ? (
                      <span className="schedule-badges">
                        {[...counts.entries()].map(([channel, n]) => (
                          <span key={channel} className="schedule-badge">
                            <span className={`ch-dot ${channel}`} />
                            <span className="label">{n}</span>
                          </span>
                        ))}
                        {overdueNonYoutube > 0 ? (
                          <span className="schedule-overdue-flag">{`!${overdueNonYoutube}`}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
}

function DayDrilldown({ day, events }: { day: string; events: ScheduleEventView[] }) {
  const sorted = [...events].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  return (
    <PanelCard title={`${day}（${weekdayLabel(day)}）の内訳`} description={`${sorted.length}件`} className="schedule-day-card mt-4">
      {sorted.length ? (
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>時刻</TableHead>
              <TableHead>チャネル</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>ソース</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono">{e.time ?? '終日'}</TableCell>
                <TableCell><span className={`ch-dot ${e.channel}`} /> {CHANNEL_LABEL[e.channel]}</TableCell>
                <TableCell>
                  <StatusBadge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</StatusBadge>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {e.label}
                  {e.detail ? <div className="text-muted-foreground text-xs">{e.detail}</div> : null}
                </TableCell>
                <TableCell>
                  <a href={vscodeLink(e.sourcePath)} className="font-mono text-xs" title={`${e.sourcePath} を VS Code で開く`}>
                    {e.sourcePath}
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      ) : (
        <p className="text-sm text-muted-foreground">この日のイベントはありません</p>
      )}
    </PanelCard>
  );
}

function OverdueCard({
  month,
  events,
  allEvents,
  showYoutube,
}: {
  month: string;
  events: ScheduleEventView[];
  /** YouTube 集約行専用：月フィルタ前の全期間（DN-0131 は特定の月に属さない横断の懸念のため）。 */
  allEvents: ScheduleEventView[];
  showYoutube: boolean;
}) {
  const overdue = events
    .filter((e) => e.status === 'overdue' && e.channel !== 'youtube')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const ytOverdue = showYoutube ? allEvents.filter((e) => e.channel === 'youtube' && e.status === 'overdue') : [];
  const ytOldest = ytOverdue.length ? ytOverdue.reduce((min, e) => (e.date < min ? e.date : min), ytOverdue[0].date) : null;
  if (!overdue.length && !ytOverdue.length) {
    return (
      <PanelCard title={`${month} の超過一覧`} className="schedule-overdue-card mt-4">
        <p className="text-sm text-muted-foreground">超過はありません</p>
      </PanelCard>
    );
  }
  return (
    <PanelCard title={`${month} の超過一覧`} description="YouTube は月をまたぐ集約（全期間）" className="schedule-overdue-card mt-4">
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>チャネル</TableHead>
            <TableHead>内容</TableHead>
            <TableHead>ソース</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ytOverdue.length ? (
            <TableRow>
              <TableCell className="font-mono">{ytOldest} 〜</TableCell>
              <TableCell><span className="ch-dot youtube" /> YouTube</TableCell>
              <TableCell className="schedule-yt-aggregate">
                公開予約時刻を経過・公開実体は未検証の動画が <strong>{ytOverdue.length}件</strong>（DN-0131）
              </TableCell>
              <TableCell className="font-mono text-xs">content/registry（旧 Shorts）</TableCell>
            </TableRow>
          ) : null}
          {overdue.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-mono">{e.date}{e.time ? ` ${e.time}` : ''}</TableCell>
              <TableCell><span className={`ch-dot ${e.channel}`} /> {CHANNEL_LABEL[e.channel]}</TableCell>
              <TableCell className="whitespace-normal">{e.label}</TableCell>
              <TableCell>
                <a href={vscodeLink(e.sourcePath)} className="font-mono text-xs" title={`${e.sourcePath} を VS Code で開く`}>
                  {e.sourcePath}
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </PanelCard>
  );
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Query> }) {
  const raw = await searchParams;
  const today = todayJst();
  const month = isValidMonth(raw.m) ? raw.m : today.slice(0, 7);
  const day = isValidDay(raw.d) ? raw.d : undefined;
  const channel = isValidChannel(raw.ch) ? raw.ch : undefined;
  const domain = isValidDomain(raw.dom) ? raw.dom : undefined;
  const query: Query = { m: month, d: day, ch: channel, dom: domain };

  const board = await scheduleBoard(month);
  // 領域（dom）とチャネル（ch）は重ねて絞り込める
  const pick = (e: ScheduleEventView) => (!domain || e.domain === domain) && (!channel || e.channel === channel);
  const monthEvents = board.events.filter(pick);
  const dayEvents = day ? board.allEvents.filter((e) => e.date === day) : [];

  return (
    <>
      <PageHead title="スケジュール" />
      <div className="filterbar">
        <Link href={href(query, { dom: undefined, ch: undefined })} className={'chip' + (!domain ? ' active' : '')}>すべて</Link>
        {DOMAINS.map((d) => (
          <Link key={d.id} href={href(query, { dom: d.id, ch: undefined })} className={'chip' + (domain === d.id ? ' active' : '')}>
            {d.label}
          </Link>
        ))}
      </div>
      <ChannelHealth board={board} />
      <MonthNav month={month} query={query} />
      <MonthGrid month={month} events={monthEvents} query={query} today={today} />
      {day ? <DayDrilldown day={day} events={dayEvents.filter(pick)} /> : null}
      <OverdueCard
        month={month}
        events={monthEvents}
        allEvents={board.allEvents}
        showYoutube={(!channel || channel === 'youtube') && (!domain || domain === 'sns')}
      />
    </>
  );
}
