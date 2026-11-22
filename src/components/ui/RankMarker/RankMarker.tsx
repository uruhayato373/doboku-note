/** 順位の数字の目印（人気の一覧） */
export default function RankMarker({ rank }: { readonly rank: number }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-(--accent-fill) font-mono text-xs font-bold tabular-nums text-(--accent)">
      {rank}
    </span>
  );
}
