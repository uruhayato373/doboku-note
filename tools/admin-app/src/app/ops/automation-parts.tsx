import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import type { Automation, AutomationIssue, AutomationIssuesView } from '@/lib/automations';

/** Mac の自動実行（/ops/mac）と CI（/ops/ci）の共通部品（DN-0851） */

/** 台帳の行の「いつ」。JST の書き方があればそれ、無ければ cron、それも無ければ起動条件 */
export const whenOf = (a: Automation) => a.scheduleJst ?? (a.schedule.length ? a.schedule.join(' / ') : a.triggers.join('・'));

export const fileOf = (a: Automation) => a.source.split('/').pop() as string;

const ISSUE_COLUMNS: DataTableColumn[] = [
  { key: 'number', label: '番号', num: true },
  { key: 'channel', label: 'channel' },
  { key: 'automation', label: '自動化' },
  { key: 'title', label: '題名', wrap: true },
];

/** 開いている自動化の Issue（automation-failure）。取れなかったときは空と読み替えずに理由を出す */
export function IssueTable({ view, issues, emptyText = '開いている Issue は無い' }: { view: AutomationIssuesView; issues: AutomationIssue[]; emptyText?: string }) {
  if (view.error) return <p className="project-warning-text text-sm">Issue を取れなかった（gh の認証・ネットワークを確かめる）: {view.error}</p>;
  const rows: DataTableRow[] = issues.map((i) => ({
    id: String(i.number),
    values: { number: i.number, channel: i.channel, automation: i.automation, title: i.title },
    cells: {
      number: (
        <a href={i.url} target="_blank" rel="noreferrer" className="hover:underline">
          #{i.number}
        </a>
      ),
    },
  }));
  return <DataTable columns={ISSUE_COLUMNS} rows={rows} pageSize={20} emptyText={emptyText} />;
}
