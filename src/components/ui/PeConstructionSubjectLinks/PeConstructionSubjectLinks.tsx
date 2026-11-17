import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import type { DocGroupKey } from '@/lib/doc-classifier';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';
import linksConfig from '@/config/pe-construction-exam-keyword-links.json';
import { getPublicDocPath } from '@/lib/content-routes';
import {
  findPeConstructionSubject,
  peConstructionSubjectKeyFromExamSlug,
} from '@/lib/pe-construction-subjects';

type SubjectKey = keyof typeof linksConfig.articleLevel.subjects;

interface PeConstructionSubjectLinksProps {
  currentSlug: string;
  docGroup: DocGroupKey;
  categoryArticles: DocMeta[];
}

function localSlug(slug: string): string {
  return slug.replace(/^pe-construction-/, '');
}

function subjectKeyForKeyword(slug: string): SubjectKey | undefined {
  const local = localSlug(slug);
  return (Object.entries(linksConfig.articleLevel.subjects) as Array<[SubjectKey, string[]]>)
    .find(([, slugs]) => slugs.includes(local))?.[0];
}

function fullSlug(local: string): string {
  return `pe-construction-${local}`;
}

/**
 * 建設部門の「年度別過去問 ↔ 同じ科目のキーワード記事」を確実に結ぶ。
 *
 * ここで扱うのは科目単位だけ。設問へ広い科目記事を機械付与すると検索意図がぼやけるため、
 * 設問単位は pe-construction-exam-keyword-links.json の questionLevel ポリシーで別管理する。
 */
export default function PeConstructionSubjectLinks({
  currentSlug,
  docGroup,
  categoryArticles,
}: PeConstructionSubjectLinksProps) {
  if (docGroup !== 'pastExam' && docGroup !== 'keyword') return null;

  const subjectKey = docGroup === 'pastExam'
    ? peConstructionSubjectKeyFromExamSlug(currentSlug) as SubjectKey | undefined
    : subjectKeyForKeyword(currentSlug);
  if (!subjectKey) return null;

  const yearSlug = new RegExp(`^r\\d{2}-${subjectKey}$`);
  const targetLocalSlugs = docGroup === 'pastExam'
    ? linksConfig.articleLevel.subjects[subjectKey]
    // 年度は固定せず、実在する年度別の科目ページ（r{年度}-{科目}）を全部拾う。R07 までの固定だと R08 が漏れた（2026-11-15）
    : categoryArticles
        .map((article) => article.slug.replace(/^pe-construction-/, ''))
        .filter((localSlug) => yearSlug.test(localSlug))
        .sort();
  const metaBySlug = new Map(categoryArticles.map((article) => [article.slug, article]));
  const targets = targetLocalSlugs.flatMap((targetLocalSlug) => {
    const slug = fullSlug(targetLocalSlug);
    const meta = metaBySlug.get(slug);
    return meta ? [{ slug, meta }] : [];
  });
  if (targets.length === 0) return null;

  const subject = findPeConstructionSubject(subjectKey);
  const isExam = docGroup === 'pastExam';

  return (
    <MetaCard
      ariaLabel={isExam ? 'この科目の対策記事' : 'この科目の過去問'}
      trackNav="pe-construction-subject-links" title={isExam ? 'この科目の対策記事' : 'この科目の過去問'} lead={<>{subject?.label ?? '同じ科目'}を年度・論点の両方向から確認できます</>}>
      <ul className="space-y-2">
        {targets.map(({ slug, meta }) => (
          <li key={slug}>
            <Link href={getPublicDocPath(slug)} className="block group">
              <MetaListItem title={meta.shortTitle ?? meta.title} />
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
