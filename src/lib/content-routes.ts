import docMetaIndex from '@/config/doc-meta-index.json';
import { classifyDoc, type DocGroupKey } from '@/lib/doc-classifier';
import type { DocMeta } from '@/lib/docs';

type IndexedDoc = Omit<DocMeta, 'slug'> & { slug?: string };
type PublicArea = 'exam' | 'practice' | 'standards';

export type PublicDocRoute = {
  area: PublicArea;
  category: string;
  group: string | null;
  localSlug: string;
  path: string;
};

const GROUP_SEGMENT: Record<DocGroupKey, string> = {
  guide: 'guide',
  pillar: 'pillar',
  textbook: 'textbook',
  pastExam: 'past-exams',
  keyword: 'keywords',
  primary: 'primary',
  secondary: 'secondary',
  career: 'career',
};

const SEGMENT_GROUP = new Map(Object.entries(GROUP_SEGMENT).map(([group, segment]) => [segment, group]));
const docs = (docMetaIndex as { docs: Record<string, IndexedDoc> }).docs;

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function routeGroup(meta: DocMeta): DocGroupKey {
  // pe-first-stage is a past-question archive. Older entries predate the
  // explicit frontmatter group field, so the generic classifier calls them
  // keywords even though their public intent is unambiguously primary exams.
  if (meta.category === 'pe-first-stage') return 'primary';
  return classifyDoc(meta);
}

function localSlugFor(meta: DocMeta, group: DocGroupKey): string {
  const category = meta.category || '';
  let local = category ? stripPrefix(meta.slug, `${category}-`) : meta.slug;
  const removable = group === 'pastExam' ? [] : [GROUP_SEGMENT[group], group];
  for (const prefix of removable) {
    local = stripPrefix(local, `${prefix}-`);
  }
  return local || meta.slug;
}

function getPublicDocRoute(meta: DocMeta): PublicDocRoute {
  const category = meta.category || 'uncategorized';
  if (category === 'civil-practice') {
    const localSlug = stripPrefix(meta.slug, 'civil-practice-');
    return { area: 'practice', category, group: null, localSlug, path: `/practice/${localSlug}` };
  }
  if (category === 'reference-materials') {
    const localSlug = stripPrefix(meta.slug, 'reference-materials-');
    return {
      area: 'standards',
      category,
      group: 'guides',
      localSlug,
      path: `/standards/guides/${localSlug}`,
    };
  }

  const group = routeGroup(meta);
  const groupSegment = GROUP_SEGMENT[group];
  const localSlug = localSlugFor(meta, group);
  return {
    area: 'exam',
    category,
    group: groupSegment,
    localSlug,
    path: `/exam/${category}/${groupSegment}/${localSlug}`,
  };
}

function getPublicDocRouteBySlug(slug: string): PublicDocRoute | null {
  const meta = docs[slug];
  return meta ? getPublicDocRoute({ slug, ...meta } as DocMeta) : null;
}

export function getPublicDocPath(slug: string): string {
  return getPublicDocRouteBySlug(slug)?.path ?? `/docs/${slug}`;
}

export function getAllPublicDocRoutes(): Array<PublicDocRoute & { legacySlug: string }> {
  return Object.entries(docs)
    .map(([legacySlug, meta]) => ({ legacySlug, ...getPublicDocRoute({ slug: legacySlug, ...meta } as DocMeta) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function findLegacySlugForPublicRoute(
  area: PublicArea,
  category: string,
  group: string | null,
  localSlug: string,
): string | null {
  for (const [legacySlug, indexed] of Object.entries(docs)) {
    const route = getPublicDocRoute({ slug: legacySlug, ...indexed } as DocMeta);
    if (
      route.area === area &&
      route.category === category &&
      route.group === group &&
      route.localSlug === localSlug
    ) {
      return legacySlug;
    }
  }
  return null;
}

export function isKnownPublicGroup(segment: string): boolean {
  return SEGMENT_GROUP.has(segment);
}

/** Replace legacy doc URLs in rendered MDX without rewriting 1,100+ source files. */
export function rewriteLegacyDocUrls(content: string): string {
  return content.replace(
    /(?:(https:\/\/doboku-note\.com))?\/docs\/([a-z0-9][a-z0-9-]*)/gi,
    (full, origin: string | undefined, slug: string) => {
      const route = getPublicDocRouteBySlug(slug);
      if (!route) return full;
      return `${origin ?? ''}${route.path}`;
    },
  );
}
