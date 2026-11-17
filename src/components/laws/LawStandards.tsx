import MetaCard from '@/components/ui/MetaCard/MetaCard';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import type { DocMeta } from '@/lib/docs';
import { getDocTopics, getTopicStandards } from '@/lib/topics';
import { standardDocumentPath, type StandardDocument } from '@/lib/standards';

const LIMIT = 4;

/**
 * 法令ページの記事末: この法令のテーマにかかわる基準資料（共通仕様書・施工管理基準など）。
 * 基準書の章から法令ページへはテーマ経由のリンクがあるのに、法令ページから基準書へは 0 本だった（2026-11-15・DN-1221）。
 * テーマが名指しした資料（featuredStandardRefs）を先に、同じ題名の資料は機関違いを 1 つにまとめる。
 * クリックは internal_nav_click（label=law-standards）。
 */
function resolveLawStandards(doc: DocMeta): { document: StandardDocument; topicLabel: string }[] {
  const out: { document: StandardDocument; topicLabel: string }[] = [];
  const titles = new Set<string>();
  for (const topic of getDocTopics(doc)) {
    const featured = new Set(topic.featuredStandardRefs ?? []);
    const docs = getTopicStandards(topic).sort((a, b) =>
      Number(!featured.has(`${a.agencyId}/${a.documentId}`)) - Number(!featured.has(`${b.agencyId}/${b.documentId}`)));
    for (const document of docs) {
      if (titles.has(document.title) || out.length >= LIMIT) continue;
      titles.add(document.title);
      out.push({ document, topicLabel: topic.label });
    }
  }
  return out;
}

export default function LawStandards({ doc }: { doc: DocMeta }) {
  const rows = resolveLawStandards(doc);
  if (rows.length === 0) return null;
  return (
    <MetaCard trackNav="law-standards" ariaLabel="関係する基準資料" title="関係する基準資料" lead="この法令が現場でどう運用されるかを、発注者の仕様書・基準で確かめる">
      {/* 区切り線の文字の行は共通部品に任せる（発行機関・テーマを題名の上に出す） */}
      <LinkRowList>
        {rows.map(({ document, topicLabel }) => (
          <LinkRow
            key={`${document.agencyId}/${document.documentId}`}
            href={standardDocumentPath(document)}
            eyebrow={`${document.agencyName}・${topicLabel}`}
            title={document.title}
          />
        ))}
      </LinkRowList>
    </MetaCard>
  );
}
