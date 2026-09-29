import { StatusBadge, type Tone } from '@/components/admin';
import type { Drift, DriftState } from '@/lib/ledger-status';

const BADGE: Record<Exclude<DriftState, 'none'>, { tone: Tone; label: string }> = {
  ok: { tone: 'good', label: '済' },
  drift: { tone: 'warn', label: 'ずれ' },
  blocked: { tone: 'bad', label: '止' },
  unknown: { tone: 'neutral', label: '?' },
};

/** 台帳の「本文・画像・導線」列の 1 セル（済・ずれ・止・?。理由は title）。 */
export function DriftBadge({ state, why }: Drift) {
  if (state === 'none') return <span className="text-muted-foreground">—</span>;
  const b = BADGE[state];
  return <StatusBadge tone={b.tone} title={why}>{b.label}</StatusBadge>;
}
