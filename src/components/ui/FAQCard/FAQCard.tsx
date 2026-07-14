import MetaCard from '@/components/ui/MetaCard/MetaCard';
import DisclosureChevron from '@/components/ui/DisclosureChevron';

interface FAQEntry {
  q: string;
  a: string;
}

interface FAQCardProps {
  faqs: FAQEntry[];
}

export default function FAQCard({ faqs }: FAQCardProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <MetaCard ariaLabel="よくある質問">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
        よくある質問
      </h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        この記事に関する Q&amp;A
      </p>
      <ul className="space-y-2">
        {faqs.map((entry, idx) => (
          <li key={idx}>
            <details className="group rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors open:border-[var(--accent)]">
              <summary className="flex items-start gap-2 cursor-pointer list-none text-sm font-semibold text-[var(--ink)] marker:hidden">
                <DisclosureChevron className="mt-0.5 h-4 w-4 text-[var(--ink-muted)]" />
                <span className="flex-1">{entry.q}</span>
              </summary>
              <p className="mt-3 ml-6 text-sm text-[var(--ink-body)] leading-relaxed">
                {entry.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
