import Link from 'next/link';
import { Badge } from '@/components/primitives';
import { DocDetailView } from '@/components/DocDetailView';
import { rootById } from '@/lib/document-roots';
import { projectAnalysis } from '@/lib/project';
import { backlogIndex } from '@/lib/todo';
import { DOCUMENT_TYPE_LABELS, DOC_RETENTION_LABELS } from '@/lib/doc-taxonomy';

export const dynamic = 'force-dynamic';

/**
 * 文書詳細。旧 /project タブが持っていた「警告（廃止済み参照）／未チェック記法／
 * 関連 backlog タスク」のレールをそのまま出す（移行でルートを畳んだだけで機能は落とさない）。
 */
export default async function DocsDetailPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const index = backlogIndex();

  return (
    <DocDetailView
      descriptor={rootById('docs')!}
      path={path}
      headMeta={({ file, content, frontmatter }) => {
        const a = projectAnalysis(file, content, frontmatter);
        if (!a) return null;
        return (
          <div className="doc-taxonomy-row">
            <span className="chip">{DOCUMENT_TYPE_LABELS[a.documentType]}</span>
            {a.retention === 'temporary' && <span className="chip doc-badge-temporary">一時記録</span>}
            {a.channelLinks.map((c) =>
              c.href ? (
                <Link className="chip chip-outline" href={c.href} key={c.id} title={`${c.label} のコンテンツへ`}>
                  {c.label}
                </Link>
              ) : (
                <span className="chip chip-outline" key={c.id}>{c.label}</span>
              ),
            )}
            {a.taxonomyInvalidFields.length > 0 && (
              <span className="chip" title={a.taxonomyInvalidFields.join(', ')}>
                frontmatter 要修正: {a.taxonomyInvalidFields.join(', ')}
              </span>
            )}
          </div>
        );
      }}
      railTop={({ file, content, frontmatter }) => {
        const a = projectAnalysis(file, content, frontmatter);
        if (!a) return null;
        return (
          <>
            {a.retiredReferenceCount > 0 && (
              <section className="facet">
                <h4>警告</h4>
                <p className="project-warning-text">
                  廃止済み参照 {a.retiredReferenceCount} 件（task-queue.json / 旧 Project TODO）。
                  現行経路を確認してから除去してください。
                </p>
              </section>
            )}

            <section className="facet">
              <h4>この文書</h4>
              <p className="project-rail-meta">
                {a.sectionLabel} · 未チェック記法 {a.uncheckedCount} 件
              </p>
            </section>

            {a.backlogIds.length > 0 && (
              <section className="facet">
                <h4>関連タスク</h4>
                {a.backlogIds.map((id) => {
                  const ref = index.get(id);
                  if (!ref) {
                    return (
                      <p className="project-warning-text" key={id}>
                        <Badge variant="destructive">{id}</Badge> backlog に存在しない（参照切れ）
                      </p>
                    );
                  }
                  return (
                    <Link className="project-ref" href={`/todo?id=${id}`} key={id}>
                      <Badge variant="outline">{id}</Badge>
                      <span className="project-ref-title">{ref.title}</span>
                      <span className="project-ref-meta">
                        {[ref.kind, ref.due].filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  );
                })}
              </section>
            )}
          </>
        );
      }}
    />
  );
}
