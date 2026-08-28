import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { allChannelLifecycles, totalsOf, STAGE_ORDER, LABELS, DESCRIPTIONS } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

/**
 * /content/lifecycle — 全チャネルを「企画 → 下書き → 公開」の共通ステージで横断表示（read-only）。
 *
 * ステージ語彙と写像は scripts/lib/content-lifecycle.mjs（真実源）。各チャネルの
 * ネイティブ状態は書き換えず、ここは数えて並べるだけ。取得できなかったチャネルは
 * 0 件ではなく「未取得」と明示する（0 と検査不成立を同じ緑にしない）。
 */
export default async function LifecyclePage() {
  const rows = await allChannelLifecycles();
  const { counts, missing } = totalsOf(rows);

  return (
    <>
      <PageHead
        title="コンテンツ ライフサイクル"
        sub={`${rows.length} チャネル · 共通ステージで横断集計（read-only）${missing ? ` · 未取得 ${missing}` : ''}`}
      />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href="/content">コンテンツ</Link>
      </nav>

      <div className="card">
        <h2>
          合計
          <span className="sub">未取得チャネルは合算に含めない</span>
        </h2>
        <div className="filterbar">
          {STAGE_ORDER.map((s) => (
            <span key={s} className="badge neutral" title={DESCRIPTIONS[s]}>
              {LABELS[s]} {(counts as unknown as Record<string, number>)[s]}
            </span>
          ))}
          {counts.unknown > 0 && <span className="badge bad">不明 {counts.unknown}</span>}
        </div>
      </div>

      <div className="card">
        <h2>
          チャネル × 段階
          <span className="sub">各チャネルのネイティブ状態を共通ステージへ写像（真実源は各チャネルの SoT）</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>チャネル</th>
                {STAGE_ORDER.map((s) => (
                  <th key={s} className="num" title={DESCRIPTIONS[s]}>
                    {LABELS[s]}
                  </th>
                ))}
                <th className="num">不明</th>
                <th className="num">計</th>
                <th>出所</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={r.href}>{r.label}</Link>
                    {!r.ok && <span className="badge bad" style={{ marginLeft: 6 }}>未取得</span>}
                  </td>
                  {STAGE_ORDER.map((s) => {
                    const n = (r.counts as unknown as Record<string, number>)[s];
                    return (
                      <td key={s} className="num">
                        {r.ok ? (n || <span className="muted">0</span>) : <span className="muted">—</span>}
                      </td>
                    );
                  })}
                  <td className="num">
                    {!r.ok ? (
                      <span className="muted">—</span>
                    ) : r.counts.unknown ? (
                      <span className="badge bad">{r.counts.unknown}</span>
                    ) : (
                      <span className="muted">0</span>
                    )}
                  </td>
                  <td className="num">{r.ok ? r.total : <span className="muted">—</span>}</td>
                  <td className="muted small">{r.ok ? r.source : r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>
          ステージの意味
          <span className="sub">.claude/knowledge/reference/content-lifecycle.md が真実源</span>
        </h2>
        <ul className="content-listing">
          {STAGE_ORDER.map((s) => (
            <li key={s}>
              <span className="badge neutral">{LABELS[s]}</span>
              <span className="muted"> · {DESCRIPTIONS[s]}</span>
            </li>
          ))}
          <li>
            <span className="badge bad">不明</span>
            <span className="muted"> · ネイティブ状態を共通ステージへ写像できていない（写像表の更新もれ）</span>
          </li>
        </ul>
      </div>
    </>
  );
}
