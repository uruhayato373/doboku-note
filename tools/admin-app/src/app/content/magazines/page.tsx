import { PageHead } from '@/components/ui';
import { ContentNav } from '@/components/ContentNav';
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
      <ContentNav active="/content/magazines" />

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>id</th>
                <th>価格</th>
                <th>公開</th>
                <th>バッジ</th>
              </tr>
            </thead>
            <tbody>
              {mags.map((m) => (
                <tr key={m.id}>
                  <td className="wrap">{m.title ?? m.id}</td>
                  <td className="mono small">{m.id}</td>
                  <td>{m.priceStr ?? ''}</td>
                  <td>
                    {m.published && m.noteUrl ? (
                      <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">
                        公開
                      </a>
                    ) : (
                      <span className="badge warn">未公開</span>
                    )}
                  </td>
                  <td className="muted small">{m.badge ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
