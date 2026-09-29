import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * 状態の表示（済・ずれ・止・? など）。shadcn の Badge の variant に寄せる。
 * 旧来の `<span className="badge good|warn|bad|neutral|soft|accent">` の置き換え先。
 */
export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';

const VARIANT = {
  good: 'success',
  warn: 'warning',
  bad: 'destructive',
  neutral: 'outline',
  info: 'secondary',
} as const;

export function StatusBadge({ tone = 'neutral', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <Badge variant={VARIANT[tone]} title={title}>
      {children}
    </Badge>
  );
}
