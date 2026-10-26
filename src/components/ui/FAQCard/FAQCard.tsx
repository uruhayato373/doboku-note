import MetaCard from '@/components/ui/MetaCard/MetaCard';
import Disclosure from '@/components/ui/Disclosure/Disclosure';

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
      <h2 className="text-lg font-bold text-(--ink) mb-1">
        よくある質問
      </h2>
      <p className="text-sm text-(--ink-muted) mb-4">
        この記事に関する Q&amp;A
      </p>
      <ul className="space-y-2">
        {faqs.map((entry, idx) => (
          <li key={idx}>
            <Disclosure chevron="start" summaryClassName="text-sm font-semibold text-(--ink)" summary={entry.q}>
              <p className="pb-3 pl-11 pr-4 text-sm text-(--ink-body) leading-relaxed">
                {entry.a}
              </p>
            </Disclosure>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
