/**
 * 国の計画・施策・審議会の一覧（制度の地図）。法令ページとテーマのページで共通に使う。
 * 中身は config/policy-registry.json（一次資料で確かめた日を checkedAt に持つ）。根拠法は法令ページか e-Gov へ。
 * 計測: data-cta="nav"（label policy-map）。公式資料への外部リンクは数えない。
 * 件数の多いテーマ（自治体の土木職 40 件など）は、新しい順に initial 件を見せ、残りは折りたたむ（初期 HTML には全件を出す）。
 */
import Link from 'next/link';
import type { LawLink, Policy } from '@/lib/law-wiring';

const KIND_LABEL: Record<Policy['kind'], string> = { council: '審議会', plan: '計画', policy: '施策・制度' };

type Row = Policy & { laws: LawLink[] };

export default function PolicyList({ policies, initial = 6 }: { policies: readonly Row[]; initial?: number }) {
  const head = policies.slice(0, initial);
  const rest = policies.slice(initial);
  return (
    <div data-cta="nav" data-cta-label="policy-map">
      <PolicyItems policies={head} />
      {rest.length > 0 && (
        <details className="group mt-5 rounded-card-content border border-(--rule-soft) dark:border-(--rule-soft)">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium text-(--accent)">ほかの計画・施策・審議会（{rest.length}件）</summary>
          <div className="border-t border-(--rule-soft) px-4 py-5 dark:border-(--rule-soft)"><PolicyItems policies={rest} /></div>
        </details>
      )}
    </div>
  );
}

function PolicyItems({ policies }: { policies: readonly Row[] }) {
  return (
    <ul className="space-y-5">
      {policies.map((p) => (
        <li key={p.id}>
          <p className="text-[15px]">
            <span className="mr-2 rounded-card-content border border-(--rule-soft) px-1.5 py-0.5 text-[11px] text-(--ink-muted) dark:border-(--rule-soft)">{KIND_LABEL[p.kind]}</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-(--accent) hover:underline">{p.title}</a>
          </p>
          <p className="mt-1 text-[12px] text-(--ink-muted)">
            {p.owner}・{p.decidedAt}{p.period ? `・${p.period}` : ''}
          </p>
          <p className="mt-1.5 text-[14px] leading-[1.8] text-(--ink-body)">{p.summary}</p>
          {(p.laws.length > 0 || (p.basisLawTitles?.length ?? 0) > 0) && (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
              <span className="text-(--ink-muted)">根拠</span>
              {p.laws.map((law) => law.internal
                ? <Link key={law.href} href={law.href} className="text-(--accent) hover:underline">{law.title}</Link>
                : <a key={law.href} href={law.href} target="_blank" rel="noopener noreferrer" className="text-(--accent) hover:underline">{law.title}</a>)}
              {(p.basisLawTitles ?? []).filter((t) => !p.laws.some((l) => l.title === t)).map((t) => <span key={t} className="text-(--ink-body)">{t}</span>)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
