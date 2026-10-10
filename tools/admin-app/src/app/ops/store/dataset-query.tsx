import { EmptyRow, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { findRepoRoot } from '@/lib/repo-root';
import { queryDataset } from '../../../../../../scripts/lib/dataset-query.mjs';

const LIMIT = 50;
const compact = (row: unknown) => {
  const s = JSON.stringify(row);
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
};

/**
 * データセットの行を「欄=値」で絞る（DN-0585）。CLI の npm run data -- query と同じ関数（scripts/lib/dataset-query.mjs）を呼ぶ。
 * 行は配列の要素か対応表の各項目（_key がキー）。最新のファイルだけを見る。
 */
export function DatasetQuery({ id, area, domain, q }: { id: string; area: string; domain: string; q?: string }) {
  let result: { files: string[]; rowsPath: string | null; total: number; rows: unknown[] } | null = null;
  let error: string | null = null;
  try {
    result = queryDataset(findRepoRoot(), id, { where: q ? [q] : [], limit: LIMIT });
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <PanelCard
      title={<>行を絞る {result && <StatusBadge tone="neutral">{result.total} 行</StatusBadge>}</>}
      description={`最新のファイルの${result?.rowsPath ? ` ${result.rowsPath} の` : ''}各行を「欄=値」「欄!=値」「欄~値」（含む）で絞る。欄は「.」で入れ子（例 verdict.gap=0）。同じことは npm run data -- query ${id} --where …`}
    >
      <form className="knowledge-toolbar">
        <input type="hidden" name="k" value={area} />
        <input type="hidden" name="d" value={domain} />
        <input type="hidden" name="f" value={id} />
        <input name="q" type="search" defaultValue={q ?? ''} placeholder="欄=値" aria-label="絞り込みの条件" />
        <button type="submit">絞る</button>
      </form>
      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : (
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>行</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result!.rows.length === 0 && <EmptyRow colSpan={1}>該当なし</EmptyRow>}
            {result!.rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-normal"><code className="break-all text-xs">{compact(row)}</code></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      )}
      {result && result.total > result.rows.length && <p className="mt-2 text-xs text-muted-foreground">先頭 {result.rows.length} 行を表示（全 {result.total} 行）</p>}
    </PanelCard>
  );
}
