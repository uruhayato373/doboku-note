import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { resolveQualificationBridge, type QualificationBridgeSurface } from '@/config/qualification-bridge';

/**
 * QualificationBridge — 実務記事・共通仕様書の章末に置く「業務経験 → 資格」の橋渡しカード。
 *
 * 読者は資格を意識せずに業務の悩みで来ているため、本文には試験文脈を入れず、記事末に 1 枚だけ置く。
 * 立場（発注者／施工会社／迷っている）を読者に選ばせ、既存の資格ガイドへ送る。
 *
 * 計測: root の data-cta="qualification-bridge" が表示（qualification_bridge_impression・label=card）、
 * 各リンクの data-cta-label（orderer / contractor / qualification-map）がクリックのラベルになる。
 * 真実源: src/config/qualification-bridge.ts
 */
export default function QualificationBridge({ placement }: { placement: QualificationBridgeSurface }) {
  const options = resolveQualificationBridge();
  return (
    <div data-cta="qualification-bridge" data-cta-label="card" data-cta-placement={placement}>
      <MetaCard ariaLabel="この業務経験を資格につなげる">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-1">この業務経験を資格につなげる</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">
          いま担当している仕事の知識と経験は、土木系資格の受検や学習に使えます。立場に近いものを 1 つ選んでください。
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {options.map((option) => (
            <li key={option.key}>
              <Link
                href={option.href}
                data-cta-label={option.key}
                className="focus-ring block h-full rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-brand dark:border-[var(--rule-soft)]"
              >
                <span className="block text-[15px] font-medium text-[var(--ink)]">{option.title}</span>
                <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">{option.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      </MetaCard>
    </div>
  );
}
