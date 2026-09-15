import { notFound } from 'next/navigation';
import { DocDetailView } from '@/components/DocDetailView';
import { rootById } from '@/lib/document-roots';
import { SHARED_POLICY_LABELS, sharedPolicyDoc } from '@/lib/shared-policy';

export const dynamic = 'force-dynamic';

/**
 * 共有 SSOT 1 本の読み取り専用ミラー（/strategy/policy/POLICY・REPURPOSE・STRUCTURE）。
 * 正本は Obsidian vault、配布物は `npm run policy:sync` で更新する。manifest に無い文書は 404。
 */
export default async function SharedPolicyDocPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const meta = path.length === 1 ? sharedPolicyDoc(path[0]) : undefined;
  if (!meta) notFound();
  const label = SHARED_POLICY_LABELS[meta.name];

  return (
    <DocDetailView
      descriptor={rootById('shared-policy')!}
      path={path}
      headMeta={({ frontmatter }) => (
        <div className="doc-taxonomy-row">
          <span className="chip">v{String(frontmatter.version ?? meta.version)}</span>
          <span className="chip chip-outline">更新 {meta.updated}</span>
          <span className="chip chip-outline">正本: Obsidian vault {meta.sourcePath}</span>
        </div>
      )}
      railTop={() => (
        <section className="facet">
          <h4>責務の境界</h4>
          <p className="project-rail-meta">
            {label?.summary ?? '共有 SSOT の写し。'}
            {' '}doboku-note 固有の適用（対象読者・商品・KPI・記事タイプ別の使い分け・回遊）はこのリポジトリ側の文書が管理し、ここには書かない。
          </p>
        </section>
      )}
    />
  );
}
