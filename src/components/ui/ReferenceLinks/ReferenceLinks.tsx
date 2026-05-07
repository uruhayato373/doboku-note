import Link from 'next/link';
import { getDocMeta } from '@/lib/docs';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

type ReferenceGroup = {
  heading?: string;
  slugs: string[];
};

interface ReferenceLinksProps {
  title?: string;
  description?: string;
  slugs?: string[];
  groups?: ReferenceGroup[];
}

async function resolveItems(slugs: string[]) {
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  return metas
    .map((meta, i) => (meta ? meta : { slug: slugs[i], title: slugs[i], description: '', published: false }))
    .filter((m) => m.published !== false);
}

export default async function ReferenceLinks({ title = '関連資料', description, slugs, groups }: ReferenceLinksProps) {
  const normalizedGroups: ReferenceGroup[] = groups ?? (slugs ? [{ slugs }] : []);
  if (normalizedGroups.length === 0) return null;

  const resolved = await Promise.all(
    normalizedGroups.map(async (g) => ({ heading: g.heading, items: await resolveItems(g.slugs) })),
  );
  const hasAny = resolved.some((g) => g.items.length > 0);
  if (!hasAny) return null;

  return (
    <MetaCard ariaLabel={title} className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
      <div className="space-y-5">
        {resolved.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{group.heading}</h3>
            )}
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    className="block rounded-sm border border-gray-200 dark:border-gray-700 px-4 py-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MetaCard>
  );
}
