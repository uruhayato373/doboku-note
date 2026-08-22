import { PageHead } from '@/components/ui';
import { magazines } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default function ContentMagazinesPage() {
  const mags = magazines();
  const pub = mags.filter((m) => m.published).length;
  return (
    <>
      <PageHead
        title="note マガジン"
        sub={`${mags.length} 件（公開 ${pub} / 未公開 ${mags.length - pub}）· SoT: src/lib/note-magazines.ts`}
      />
      <div className="card">
        <div className="table-wrap">
          <table className="data content-table">
            <thead>
              <tr>
                <th className="title-col">タイトル</th>
                <th className="optional-col id-col">id</th>
                <th className="price-col">価格</th>
                <th className="publish-col">公開</th>
                <th className="badge-col">バッジ</th>
              </tr>
            </thead>
            <tbody>
              {mags.map((m) => (
                <tr key={m.id}>
                  <td className="title-cell" title={m.title ?? m.id}>{m.title ?? m.id}</td>
                  <td className="mono small optional-col path-cell" title={m.id}>{m.id}</td>
                  <td className="price-col">{m.priceStr ?? ''}</td>
                  <td className="publish-col">
                    {m.published && m.noteUrl ? (
                      <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">
                        公開
                      </a>
                    ) : (
                      <span className="badge warn">未公開</span>
                    )}
                  </td>
                  <td className="muted small badge-col">{m.badge ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
