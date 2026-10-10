import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { pastExamLedgerSummary } from '@/lib/past-exam-ledger';

const pct = (n: number, d: number) => (d ? `${Math.floor((n / d) * 100)}%` : '—');

/** 過去問の照合（問題台帳）。資格ごとの照合率と、照合が終わっていない記事 */
export default function PastExamLedgerPanel() {
  const exams = pastExamLedgerSummary();
  const pending = exams.flatMap((e) => e.articles.filter((a) => a.done < a.total).map((a) => ({ ...a, label: e.label })));
  return (
    <PanelCard
      title="過去問の照合（問題台帳）"
      description="問題台帳（台帳 id pastexams.question-ledger）。転記を原典 PDF と照合した問題と、公式正答を確かめた問題の数。正答の不一致は npm run check-past-exam-ledger（CI）が止める"
    >
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>資格</TableHead>
            <TableHead className={numCol}>問題</TableHead>
            <TableHead className={numCol}>転記の照合済み</TableHead>
            <TableHead className={numCol}>原典なし</TableHead>
            <TableHead className={numCol}>公式正答 確認済み</TableHead>
            <TableHead className={numCol}>正答 PDF なし</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((e) => {
            const done = (e.transcription.verified ?? 0) + (e.transcription.fixed ?? 0);
            return (
              <TableRow key={e.qualification}>
                <TableCell>{e.label}{e.present ? null : <> <StatusBadge tone="bad">台帳なし</StatusBadge></>}</TableCell>
                <TableCell className={numCol}>{e.total}</TableCell>
                <TableCell className={numCol}>
                  <StatusBadge tone={done === e.total && e.total ? 'good' : done ? 'warn' : 'bad'}>{done}（{pct(done, e.total)}）</StatusBadge>
                </TableCell>
                <TableCell className={numCol}>{e.sourceMissing.question}</TableCell>
                <TableCell className={numCol}>{e.answer.official ?? 0}（{pct(e.answer.official ?? 0, e.total)}）</TableCell>
                <TableCell className={numCol}>{e.sourceMissing.answer}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableFrame>
      {pending.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">照合が終わっていない記事 {pending.length} 本</summary>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>資格</TableHead>
                <TableHead>記事</TableHead>
                <TableHead className={numCol}>照合済み / 問題</TableHead>
                <TableHead className={numCol}>原典なし</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((a) => (
                <TableRow key={a.article}>
                  <TableCell>{a.label}</TableCell>
                  <TableCell><code>{a.article}</code></TableCell>
                  <TableCell className={numCol}>{a.done} / {a.total}</TableCell>
                  <TableCell className={numCol}>{a.noSource}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </details>
      ) : null}
    </PanelCard>
  );
}
