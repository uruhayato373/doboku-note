import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadDocument } from '@/lib/document-store';
import { type RootDescriptor } from '@/lib/document-roots';

/**
 * ルート descriptor 1 つ分の詳細ビュー（read-only）。
 * root 外は document-store の prefix + realpath 検査で弾かれ、ここでは notFound へ倒すだけ。
 */
export function DocDetailView({
  descriptor,
  path,
  headMeta,
  railTop,
}: {
  descriptor: RootDescriptor;
  path: string[];
  /** タイトル直下に差し込む小さなメタ表示（docs の目的・チャネル・保持区分など） */
  headMeta?: (document: { file: string; content: string; frontmatter: Readonly<Record<string, unknown>> }) => ReactNode;
  /** 目次の手前に差し込むルート固有のレール（docs の警告・関連タスクなど） */
  railTop?: (document: { file: string; content: string; frontmatter: Readonly<Record<string, unknown>> }) => ReactNode;
}) {
  const document = loadDocument(descriptor, path);
  if (!document) notFound();

  const vscode = `vscode://file/${document.absolute.replace(/\\/g, '/')}`;

  return (
    <>
      <div className="knowledge-detail-head">
        <div>
          <nav className="project-crumbs" aria-label="パンくず">
            <Link href={descriptor.routeBase}>{descriptor.label}</Link>
          </nav>
          <h1>{document.title}</h1>
          <code>{document.file}</code>
          {headMeta?.(document)}
          <div className="project-meta">
            <span>最終更新 {document.modifiedAt.slice(0, 10)}</span>
            <a href={vscode} title="この文書を VS Code で開いて編集する">
              VS Code で開く（編集はエディタ側で行う）
            </a>
          </div>
        </div>
      </div>

      <div className="project-detail">
        <article className="knowledge-document">
          {document.json ? (
            <pre><code>{document.json}</code></pre>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: document.html }} />
          )}
        </article>

        <aside className="project-rail" aria-label="文書内ナビ">
          {railTop?.(document)}
          {document.headings.length > 0 && (
            <section className="facet">
              <h4>目次</h4>
              {document.headings.map((h) => (
                <a key={h.id} href={`#${h.id}`} className={h.depth === 3 ? 'toc-h3' : undefined}>
                  {h.text}
                </a>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
