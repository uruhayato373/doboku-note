import Link from 'next/link';
import { join } from 'node:path';
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
} from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/**
 * /schedule — 予約・計画・期日の横断ビュー（読み取り専用）。
 *
 * データは scripts/lib/schedule-events.mjs の collectScheduleEvents を @/lib/schedule 経由で
 * 読むだけ。書き込みUI・予約操作・カレンダー編集はここに一切実装しない（admin は読み取り専用）。
 *
 * `ch`（チャネル絞り込み）の適用範囲: 健全性ストリップは常に5チャネル全部を出す
 * （「データソースは生きているか」という別の関心事のため）。月グリッド・日別ドリルダウン・
 * 超過一覧（YouTube 集約行含む）は ch でフィルタする。
 */

type Query = { m?: string; d?: string; ch?: string };

const CHANNEL_ORDER: ScheduleChannel[] = ['exam', 'x', 'instagram', 'youtube', 'todo'];
const CHANNEL_LABEL: Record<ScheduleChannel, string> = {
  exam: '試験',
  x: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  todo: 'TODO',
};
const STATUS_LABEL: Record<ScheduleEventView['status'], string> = {
  planned: '予定',
  reserved: '予約済み',
  posted: '投稿済み',
  overdue: '超過',
};
const SOURCE_CHANNEL: Record<ScheduleEventView['sourceId'], ScheduleChannel> = {
  'exam-calendar': 'exam',
  'x-campaign': 'x',
  'x-status': 'x',
  'ig-status': 'instagram',
  'youtube-schedule': 'youtube',
  backlog: 'todo',
};
const WEEK_HEADERS = ['月', '火', '水', '木', '金', '土', '日'];

function isValidMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}
function isValidDay(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
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
    <div className="table-wrap">
      <table className="data schedule-grid">
        <thead>
          <tr>{WEEK_HEADERS.map((w) => <th key={w}>{w}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((dateKey, ci) => {
                if (!dateKey) return <td key={ci}><div className="schedule-cell-empty" /></td>;
                const dayEvents = byDay.get(dateKey) ?? [];
                const examEvents = dayEvents.filter((e) => e.kind === 'exam');
                const others = dayEvents.filter((e) => e.kind !== 'exam');
                const overdueNonYoutube = dayEvents.filter((e) => e.status === 'overdue' && e.channel !== 'youtube').length;
                const counts = new Map<ScheduleChannel, number>();
                for (const e of others) counts.set(e.channel, (counts.get(e.channel) ?? 0) + 1);
                const dayNum = Number(dateKey.slice(-2));
                const isToday = dateKey === today;
                return (
                  <td key={ci}>
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayDrilldown({ day, events }: { day: string; events: ScheduleEventView[] }) {
  const sorted = [...events].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
  return (
    <div className="card schedule-day-card">
      <h2>{day}（{weekdayLabel(day)}）の内訳<span className="sub">{sorted.length}件</span></h2>
      {sorted.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>時刻</th>
                <th>チャネル</th>
                <th>状態</th>
                <th>内容</th>
                <th>ソース</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.time ?? '終日'}</td>
                  <td><span className={`ch-dot ${e.channel}`} /> {CHANNEL_LABEL[e.channel]}</td>
                  <td>
                    <span className={'badge ' + (e.status === 'overdue' ? 'bad' : e.status === 'posted' ? 'good' : e.status === 'reserved' ? 'accent' : 'neutral')}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="wrap">
                    {e.label}
                    {e.detail ? <div className="muted small">{e.detail}</div> : null}
                  </td>
                  <td>
                    <a href={vscodeLink(e.sourcePath)} className="mono small" title={`${e.sourcePath} を VS Code で開く`}>
                      {e.sourcePath}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">この日のイベントはありません</div>
      )}
    </div>
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
      <div className="card schedule-overdue-card">
        <h2>{month} の超過一覧</h2>
        <div className="empty">超過はありません</div>
      </div>
    );
  }
  return (
    <div className="card schedule-overdue-card">
      <h2>{month} の超過一覧<span className="sub">YouTube は月をまたぐ集約（全期間）</span></h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>日付</th>
              <th>チャネル</th>
              <th>内容</th>
              <th>ソース</th>
            </tr>
          </thead>
          <tbody>
            {ytOverdue.length ? (
              <tr>
                <td className="mono">{ytOldest} 〜</td>
                <td><span className="ch-dot youtube" /> YouTube</td>
                <td className="schedule-yt-aggregate">
                  公開予約時刻を経過・公開実体は未検証の動画が <strong>{ytOverdue.length}件</strong>（DN-0131）
                </td>
                <td className="mono small">.claude/state/youtube-schedule.json</td>
              </tr>
            ) : null}
            {overdue.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.date}{e.time ? ` ${e.time}` : ''}</td>
                <td><span className={`ch-dot ${e.channel}`} /> {CHANNEL_LABEL[e.channel]}</td>
                <td className="wrap">{e.label}</td>
                <td>
                  <a href={vscodeLink(e.sourcePath)} className="mono small" title={`${e.sourcePath} を VS Code で開く`}>
                    {e.sourcePath}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Query> }) {
  const raw = await searchParams;
  const today = todayJst();
  const month = isValidMonth(raw.m) ? raw.m : today.slice(0, 7);
  const day = isValidDay(raw.d) ? raw.d : undefined;
  const channel = isValidChannel(raw.ch) ? raw.ch : undefined;
  const query: Query = { m: month, d: day, ch: channel };

  const board = await scheduleBoard(month);
  const monthEvents = channel ? board.events.filter((e) => e.channel === channel) : board.events;
  const dayEvents = day ? board.allEvents.filter((e) => e.date === day) : [];

  return (
    <>
      <PageHead
        title="スケジュール"
        sub="読み取り専用 · exam-calendar / x-campaigns / x-status / ig-status / youtube-schedule / backlog を集約"
      />
      <ChannelHealth board={board} />
      <MonthNav month={month} query={query} />
      <MonthGrid month={month} events={monthEvents} query={query} today={today} />
      {day ? <DayDrilldown day={day} events={channel ? dayEvents.filter((e) => e.channel === channel) : dayEvents} /> : null}
      <OverdueCard
        month={month}
        events={monthEvents}
        allEvents={board.allEvents}
        showYoutube={!channel || channel === 'youtube'}
      />
    </>
  );
}
