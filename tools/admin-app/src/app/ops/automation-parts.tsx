import { DataTable, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import type { Automation, AutomationIssue, AutomationIssuesView } from '@/lib/automations';

/** Mac の自動実行（/ops/mac）と CI（/ops/ci）の共通部品（DN-0851）。人が見る画面なので、判断に要る値だけを出す */

/** 台帳の行の「いつ」。JST の書き方があればそれ、無ければ cron、それも無ければ起動条件 */
export const whenOf = (a: Automation) => a.scheduleJst ?? (a.schedule.length ? a.schedule.join(' / ') : a.triggers.join('・'));

const ISSUE_COLUMNS: DataTableColumn[] = [
  { key: 'number', label: '番号', num: true },
  { key: 'title', label: '題名', wrap: true },
];

/** 開いている自動化の Issue。台帳のどの自動化にも当たらないもの（自動では閉じない）には「手で閉じる」を付ける */
export function IssueTable({ view, issues }: { view: AutomationIssuesView; issues: AutomationIssue[] }) {
  if (view.error) return <p className="project-warning-text text-sm">Issue を取れなかった: {view.error}</p>;
  const rows: DataTableRow[] = issues.map((i) => ({
    id: String(i.number),
    values: { number: i.number, title: i.title },
    cells: {
      number: (
        <a href={i.url} target="_blank" rel="noreferrer" className="hover:underline">
          #{i.number}
        </a>
      ),
      title: (
        <>
          {i.title.replace(/^\[auto\] /, '')} {i.runner === null && <StatusBadge tone="warn">手で閉じる</StatusBadge>}
        </>
      ),
    },
  }));
  return <DataTable columns={ISSUE_COLUMNS} rows={rows} pageSize={50} emptyText="開いている Issue は無い" />;
}
