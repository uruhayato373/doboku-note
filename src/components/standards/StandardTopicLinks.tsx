import Link from 'next/link';
import type { Topic } from '@/lib/topics';
import { topicPath } from '@/lib/route-paths';
import StandardAside from './StandardAside';

export default function StandardTopicLinks({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;

  return (
    <StandardAside id="standard-related-topics" title="関連テーマ">
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={topicPath(topic.slug)}
            className="focus-ring rounded-full bg-(--accent-fill) px-3 py-1.5 font-mono text-[11px] text-(--accent) transition-colors hover:bg-(--accent) hover:text-(--paper)"
          >
            {topic.label}
          </Link>
        ))}
      </div>
    </StandardAside>
  );
}
