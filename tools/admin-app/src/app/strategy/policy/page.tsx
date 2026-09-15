import Link from 'next/link';
import { rootById } from '@/lib/document-roots';
import { sharedPolicyDocs } from '@/lib/shared-policy';

export const dynamic = 'force-dynamic';

/**
 * 3 プロジェクト共通 SSOT（共通事業方針 / SNS リパーパス戦略 / note 記事構成）の索引。
 * 正本は Obsidian vault `memos/*SSOT.md`。ここにあるのは `npm run policy:sync` で配布された写しで、
 * 一覧の出どころは `.claude/shared-policy/manifest.json`（文書ごとの version / updated / 正本パス）。
 * 本文は `/strategy/policy/<NAME>` で読み取り専用表示する。
 */
export default function SharedPolicyIndexPage() {
  const descriptor = rootById('shared-policy')!;
  const docs = sharedPolicyDocs();

  return (
    <section className="page">
      <h1>共通方針（Obsidian 正本の写し）</h1>
      <p className="project-rail-meta">
        stats47 / doboku-note / Obsidian vault で共有する判断枠組み。正本は Obsidian vault の <code>memos/*SSOT.md</code>、
        写しは手編集せず <code>policy:sync</code> / <code>policy:check</code> で扱う（規約:{' '}
        <code>.claude/rules/shared-business-policy.md</code>）。
      </p>

      <div className="knowledge-grid">
        {docs.map((d) => {
          return (
            <Link className="knowledge-card" href={`${descriptor.routeBase}/${d.slug}`} key={d.name}>
              <div className="knowledge-card-meta">
                <span className="chip">v{d.version}</span>
                <span className="chip chip-outline">{d.updated}</span>
              </div>
              <h2>{d.title}</h2>
              <p>{d.summary}</p>
              <code>{descriptor.filePrefix}/{d.name} ← {d.sourcePath}</code>
            </Link>
          );
        })}
      </div>
      {docs.length === 0 && <div className="card empty">{descriptor.emptyState}</div>}
    </section>
  );
}
