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
    <section
      className="rounded-card-section shadow-card-section border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6 sm:p-8"
      aria-label="よくある質問"
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        よくある質問
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        この記事に関する Q&amp;A
      </p>
      <ul className="space-y-2">
        {faqs.map((entry, idx) => (
          <li key={idx}>
            <details className="group rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 open:border-blue-400 dark:open:border-blue-500 transition-colors">
              <summary className="flex items-start gap-2 cursor-pointer list-none text-sm font-semibold text-gray-900 dark:text-gray-100 marker:hidden">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-block w-4 h-4 shrink-0 transition-transform group-open:rotate-90 text-gray-400 dark:text-gray-500"
                >
                  ▶
                </span>
                <span className="flex-1">{entry.q}</span>
              </summary>
              <p className="mt-3 ml-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {entry.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
