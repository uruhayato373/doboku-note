import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { pastExamLedgerSummary } from '@/lib/past-exam-ledger';

const LEDGER_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'total', label: '問題', num: true },
  { key: 'done', label: '転記の照合済み', num: true },
  { key: 'noSourceQuestion', label: '原典なし', num: true },
  { key: 'official', label: '公式正答 確認済み', num: true },
  { key: 'noSourceAnswer', label: '正答 PDF なし', num: true },
];
const PENDING_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'article', label: '記事' },
  { key: 'done', label: '照合済み / 問題', num: true },
  { key: 'noSource', label: '原典なし', num: true },
];
const pct = (n: number, d: number) => (d ? `${Math.floor((n / d) * 100)}%` : '—');

/** 過去問の照合（問題台帳）。資格ごとの照合率と、照合が終わっていない記事 */
export default function PastExamLedgerPanel() {
  const exams = pastExamLedgerSummary();
  const pending = exams.flatMap((e) => e.articles.filter((a) => a.done < a.total).map((a) => ({ ...a, label: e.label })));
  const ledgerRows: DataTableRow[] = exams.map((e) => {
    const done = (e.transcription.verified ?? 0) + (e.transcription.fixed ?? 0);
    const official = e.answer.official ?? 0;
    return {
      id: e.qualification,
      values: { label: e.label, total: e.total, done, noSourceQuestion: e.sourceMissing.question, official, noSourceAnswer: e.sourceMissing.answer },
      cells: {
        label: <>{e.label}{e.present ? null : <> <StatusBadge tone="bad">台帳なし</StatusBadge></>}</>,
        done: <StatusBadge tone={done === e.total && e.total ? 'good' : done ? 'warn' : 'bad'}>{done}（{pct(done, e.total)}）</StatusBadge>,
        official: `${official}（${pct(official, e.total)}）`,
      },
    };
  });
  const pendingRows: DataTableRow[] = pending.map((a) => ({
    id: a.article,
    values: { label: a.label, article: a.article, done: a.done, noSource: a.noSource },
    cells: { article: <code>{a.article}</code>, done: `${a.done} / ${a.total}` },
  }));
  return (
    <PanelCard
      title="過去問の照合（問題台帳）"
      description="問題台帳（台帳 id pastexams.question-ledger）。転記を原典 PDF と照合した問題と、公式正答を確かめた問題の数。正答の不一致は npm run check-past-exam-ledger（CI）が止める"
    >
      <DataTable columns={LEDGER_COLUMNS} rows={ledgerRows} pageSize={100} />
      {pending.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">照合が終わっていない記事 {pending.length} 本</summary>
          <DataTable columns={PENDING_COLUMNS} rows={pendingRows} filter={pending.length > 30 ? '資格・記事で絞り込む' : undefined} />
        </details>
      ) : null}
    </PanelCard>
  );
}
