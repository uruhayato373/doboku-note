import { PageHead } from '@/components/ui';
import { membershipState, statusSnapshot, STALE_DAYS } from '@/lib/note-status';

export const dynamic = 'force-dynamic';

/** 鮮度バッジ。0-1 日=good / STALE_DAYS 以内=warn / 超過・不明=bad。 */
function Age({ days }: { days: number | null }) {
  if (days == null) return <span className="badge bad">鮮度不明</span>;
  const cls = days <= 1 ? 'good' : days <= STALE_DAYS ? 'warn' : 'bad';
  return <span className={`badge ${cls}`}>{days} 日前</span>;
}

export default function NoteStatusPage() {
  const m = membershipState();
  const s = statusSnapshot();
  const bad = m.rows.filter((r) => !r.ok);

  return (
    <>
      <PageHead
        title="note 公開状態"
        sub="マガジン収録の三軸（repo 実数 ↔ SoT 件数表記 ↔ ライブ収録数）と、記事別の公開状態"
      />

      <div className="card">
        <p className="muted">
          記事を足したのにライブへ収録し忘れる事故（2026-08-24 ゼネコン/河川コンサル各 2 本）は、
          SoT とライブの 2 者だけを比べる検査では捕まらない。両方が同じ値で古びるため。
          repo の記事実数（frontmatter <code>noteMagazine</code> の集計）が第三の軸になる。
        </p>
      </div>

      {/* ─── 表1: マガジン収録の三軸 ─── */}
      <div className="card">
        <h2>マガジン収録</h2>
        <p className="muted">
          {!m.ok ? (
            <>
              <span className="badge bad">突合できていません</span>{' '}
              check-magazine-membership が実行できないため、下の表は表示できません（空欄＝問題なし
              ではありません）。{m.error}
            </>
          ) : (
            <>
              マガジン <strong>{m.rows.length}</strong> 件を実検査（記事 {m.articles} 本）· ズレ{' '}
              <strong className={bad.length ? 'badge bad' : 'badge good'}>{bad.length}</strong> 件
              {' · '}
              ライブ軸:{' '}
              {m.freshness.ok ? (
                <>
                  <Age days={m.freshness.ageDays} /> （{m.freshness.fetchedAt}）
                </>
              ) : (
                <>
                  <span className="badge bad">未検査</span> {m.freshness.reason} —
                  「ライブ」列の空欄は<strong>問題なしではありません</strong>。
                  週次 note-live-audit.yml の snapshot 供給を確認すること
                </>
              )}
            </>
          )}
        </p>

        {m.ok && m.rows.length > 0 && (
          <div className="table-wrap">
            <table className="data content-table">
              <thead>
                <tr>
                  <th className="title-col">マガジン</th>
                  <th className="badge-col">期待</th>
                  <th className="badge-col">repo</th>
                  <th className="badge-col">SoT</th>
                  <th className="badge-col">ライブ</th>
                  <th className="publish-col">判定</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="title-col">
                      {r.title || r.id}
                      <br />
                      <span className="muted">{r.id}</span>
                      {r.descWarn && (
                        <>
                          <br />
                          <span className="badge warn">{r.descWarn}</span>
                        </>
                      )}
                    </td>
                    <td>{r.expected}</td>
                    <td>
                      {r.repoCount}
                      {r.extra ? (
                        <span className="muted"> {r.extra > 0 ? `+${r.extra}` : r.extra}</span>
                      ) : null}
                    </td>
                    <td>{r.declared ?? <span className="muted">—</span>}</td>
                    <td>{r.liveCount ?? <span className="muted">—</span>}</td>
                    <td>
                      {!r.ok ? (
                        <span className="badge bad">{r.detail || r.kind}</span>
                      ) : r.liveCount == null ? (
                        // ライブを見ていない行を緑にしない。「repo↔SoT は合っている」と
                        // 「三軸とも合っている」は別物で、緑にすると後者に読める。
                        <span className="badge warn">repo↔SoT のみ</span>
                      ) : r.declared == null ? (
                        <span className="badge warn">repo↔ライブ のみ</span>
                      ) : (
                        <span className="badge good">一致</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {m.ok && (
          m.unclassified.length > 0 ? (
            <p className="muted">
              <span className="badge bad">未分類 {m.unclassified.length} 種</span>{' '}
              {m.unclassified.map((u) => `${u.label}(${u.count})`).join('、')}
              <br />
              <code>.claude/config/note-magazine-membership.json</code> の{' '}
              <code>labels</code> / <code>packs</code> / <code>excluded</code>{' '}
              のどれかへ登録する（未分類のまま放置すると、そのラベルは検査の射程外になる）。
            </p>
          ) : (
            <p className="muted">
              <span className="badge good">未分類 0</span>{' '}
              すべての <code>noteMagazine</code> ラベルが分類済み＝検査の射程に漏れが無い。
            </p>
          )
        )}
        {m.ok && m.unreferenced.length > 0 && (
          <p className="muted">
            labels から参照されないマガジン {m.unreferenced.length} 件（パック型など・ゲート対象外）
          </p>
        )}
      </div>

      {/* ─── 表2: 記事別の公開状態 ─── */}
      <div className="card">
        <h2>記事の公開状態</h2>
        <p className="muted">
          {!s.ok ? (
            <>
              <span className="badge bad">未取得</span>{' '}
              <code>.claude/state/note/status-snapshot.json</code> が読めません。
              記事別のライブ公開状態は<strong>判定していません</strong>。
              週次 note-live-audit.yml が供給します（管理画面はライブ API を叩きません）。{s.error}
            </>
          ) : (
            <>
              <Age days={s.ageDays} /> （{s.fetchedAt}） · noteStatus 運用 <strong>{s.tracked}</strong> 本
              のうち実検査 <strong>{s.inspected}</strong> 本 · noteUrl のみで管理 {s.untracked} 本
              {s.stale && (
                <>
                  {' '}
                  <span className="badge bad">古い</span> {STALE_DAYS} 日を超えています
                </>
              )}
            </>
          )}
        </p>

        {s.ok && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>区分</th>
                  <th>件数</th>
                  <th>意味</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ドリフト</td>
                  <td>
                    {s.drift.length ? (
                      <span className="badge bad">{s.drift.length}</span>
                    ) : (
                      <span className="badge good">0</span>
                    )}
                  </td>
                  <td className="muted">ライブは公開済みだが frontmatter の noteStatus が古い</td>
                </tr>
                <tr>
                  <td>要確認</td>
                  <td>
                    {s.warn.length ? (
                      <span className="badge warn">{s.warn.length}</span>
                    ) : (
                      <span className="badge good">0</span>
                    )}
                  </td>
                  <td className="muted">frontmatter は公開を主張するがライブが published でない</td>
                </tr>
                <tr>
                  <td>取得不能</td>
                  <td>
                    {s.noLive.length ? (
                      <span className="badge warn">{s.noLive.length}</span>
                    ) : (
                      <span className="badge good">0</span>
                    )}
                  </td>
                  <td className="muted">throttle・予約未 live など。再実行で解消することが多い</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {s.ok && s.drift.length > 0 && (
          <p className="muted">
            ドリフト: {s.drift.slice(0, 10).map((d) => d.rel).join('、')}
            {s.drift.length > 10 && ` … 他 ${s.drift.length - 10} 本`}
            <br />
            是正: <code>npm run verify-note-status -- --fix</code>
          </p>
        )}
      </div>
    </>
  );
}
