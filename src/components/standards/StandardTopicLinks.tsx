import Link from 'next/link';
import type { Topic } from '@/lib/topics';

export default function StandardTopicLinks({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;

  return (
    <aside className="mt-8 border-y border-[var(--rule-soft)] py-5" aria-labelledby="standard-related-topics">
      <h2 id="standard-related-topics" className="font-serif text-lg font-bold text-[var(--ink)]">
        資格試験・施工実務の関連テーマ
      </h2>
      <p className="mt-1 text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        この仕様書と共通する論点を、試験解説・現場ガイドと横断して確認できます。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/topics/${topic.slug}`}
            className="focus-ring rounded-full bg-[var(--accent-fill)] px-3 py-1.5 font-mono text-[11px] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            {topic.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
