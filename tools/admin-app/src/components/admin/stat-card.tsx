import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * 数字 1 つの小さな区画（ラベル・値・補足）。Grid に並べて「いまの数」を見せる（DN-0851）。
 * 題名と中身を持つ区画は PanelCard、行の並ぶものは DataTable を使う。
 */
export function StatCard({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="flex flex-col gap-1 px-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </CardContent>
    </Card>
  );
}
