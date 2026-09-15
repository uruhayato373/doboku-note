import { DocDetailView } from '@/components/DocDetailView';
import { rootById } from '@/lib/document-roots';

export const dynamic = 'force-dynamic';

/**
 * 3プロジェクト共通事業方針(HARM)の読み取り専用ミラー。
 * 正本はObsidian vault `memos/共通事業方針SSOT.md`。配布物は `npm run policy:sync` で更新する。
 */
export default function SharedPolicyPage() {
  return (
    <DocDetailView
      descriptor={rootById('shared-policy')!}
      path={['POLICY']}
      headMeta={({ frontmatter }) => (
        <div className="doc-taxonomy-row">
          {frontmatter.version ? <span className="chip">v{String(frontmatter.version)}</span> : null}
          <span className="chip chip-outline">正本: Obsidian vault memos/共通事業方針SSOT.md</span>
        </div>
      )}
      railTop={() => (
        <section className="facet">
          <h4>責務の境界</h4>
          <p className="project-rail-meta">
            HARM・5つの判断の問い・原則はここが正本の写し。doboku-noteの対象読者・提供商品・KPI・優先順位は
            <code> docs/strategy/04_収益化戦略.md</code> が管理する。
          </p>
        </section>
      )}
    />
  );
}
