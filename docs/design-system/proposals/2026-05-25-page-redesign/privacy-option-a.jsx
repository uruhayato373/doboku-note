// Privacy Option A — Editorial Long-form
// 現行のカードグリッド型を、長文の編集記事スタイルに置き換える。
// 本文は1カラムで読みやすく、左に番号付きTOC、右に「最終更新日 / バージョン」のメタ情報。
// 信頼性最大化・モネタイズはゼロ（プライバシーページに広告を置くのは自殺行為）。

function PrivacyOptionA() {
  const { Header, Footer } = Shared;
  const { policySections, thirdPartyServices } = PrivacyMock;
  const { IconShield, IconChart, IconCheck, IconUser, IconCookie, IconClock, IconLock, IconUserCheck, IconRefresh, IconExternal } = Icons;
  const IconMail = (p) => <Icons.IconFile {...p} />;
  const iconMap = { IconShield, IconChart, IconCheck, IconUser, IconCookie, IconClock, IconLock, IconUserCheck, IconRefresh, IconMail };

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero — legal document feel */}
        <section className="border-b py-14 bg-white" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[860px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>Privacy</span>
            </nav>
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Legal · 法的事項</div>
            <h1 className="font-serif-jp font-black text-[var(--ink)] text-[56px] tracking-tight leading-[1.15] mb-6">プライバシーポリシー</h1>
            <p className="text-[16px] leading-[1.95] max-w-[60ch]" style={{ color: "var(--ink-body)" }}>
              本ポリシーは、doboku-note（以下「当サイト」）が取得・利用・管理するユーザーの個人情報の取扱いについて定めるものです。個人情報保護法、特定商取引法、ならびに EU 一般データ保護規則（GDPR）の要件を踏まえて作成しています。
            </p>
            <dl className="mt-8 pt-6 border-t grid grid-cols-4 gap-6" style={{ borderColor: "var(--rule-soft)" }}>
              {[
                ["Version", "2.1.0"],
                ["Effective", "2026.04.05"],
                ["Last review", "2026.05.01"],
                ["Next review", "2026.10.01"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--ink-muted)" }}>{k}</dt>
                  <dd className="font-serif-jp font-bold text-base tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* TOC + body */}
        <section className="py-12">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid grid-cols-12 gap-10">
            {/* TOC */}
            <aside className="col-span-3">
              <div className="sticky top-6">
                <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Contents</div>
                <ol className="space-y-2">
                  {policySections.map((s, i) => (
                    <li key={s.id} className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: "var(--ink-muted)" }}>{s.num}</span>
                      <a href={`#${s.id}`} className="font-serif-jp text-[13px] leading-snug hover:underline" style={{ color: i === 0 ? "var(--ink)" : "var(--ink-body)", fontWeight: i === 0 ? 700 : 400 }}>{s.title}</a>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>Download</div>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--accent)" }}>PDF version (v2.1.0) ↗</a>
                </div>
              </div>
            </aside>

            {/* Body */}
            <article className="col-span-9 bg-white border shadow-soft p-12" style={{ borderColor: "var(--rule-soft)" }}>
              {policySections.map((s, i) => {
                const Ic = iconMap[s.icon] || IconShield;
                return (
                  <section key={s.id} id={s.id} className={i > 0 ? "mt-14 pt-10 border-t" : ""} style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono text-[10px] tabular-nums tracking-widest" style={{ color: "var(--accent)" }}>§ {s.num}</span>
                      <Ic className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    </div>
                    <h2 className="font-serif-jp font-black text-[28px] leading-tight mb-3" style={{ color: "var(--ink)" }}>{s.title}</h2>
                    <p className="text-[15px] leading-[1.95] mb-4 italic" style={{ color: "var(--accent)" }}>{s.summary}</p>
                    <p className="text-[15px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>{s.body}</p>

                    {s.list && (
                      <ol className="mt-5 space-y-2.5">
                        {s.list.map((it, j) => (
                          <li key={it} className="flex gap-3 text-[14px] leading-[1.85]">
                            <span className="font-mono tabular-nums shrink-0" style={{ color: "var(--ink-muted)" }}>{String(j+1).padStart(2,"0")}.</span>
                            <span style={{ color: "var(--ink-body)" }}>{it}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {s.table && (
                      <table className="w-full text-[13px] mt-6 border" style={{ borderColor: "var(--rule-soft)" }}>
                        <thead>
                          <tr style={{ background: "var(--accent-fill)" }}>
                            {s.table.head.map(h => (
                              <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map((row, k) => (
                            <tr key={k} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                              {row.map((cell, l) => (
                                <td key={l} className="px-3 py-2.5 align-top" style={{ color: l === 0 ? "var(--ink)" : "var(--ink-body)", fontWeight: l === 0 ? 700 : 400 }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {s.id === "cookies" && (
                      <table className="w-full text-[13px] mt-6 border" style={{ borderColor: "var(--rule-soft)" }}>
                        <thead>
                          <tr style={{ background: "var(--accent-fill)" }}>
                            {["サービス", "目的", "データ", "保持期間", "オプトアウト"].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {thirdPartyServices.map(svc => (
                            <tr key={svc.name} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                              <td className="px-3 py-2.5 font-serif-jp font-bold" style={{ color: "var(--ink)" }}>{svc.name}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--ink-body)" }}>{svc.purpose}</td>
                              <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: "var(--ink-body)" }}>{svc.data}</td>
                              <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums" style={{ color: "var(--ink-body)" }}>{svc.retention}</td>
                              <td className="px-3 py-2.5">
                                {svc.optOut.startsWith("http") ? (
                                  <a href={svc.optOut} className="font-mono text-[11px] underline inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                                    設定 <IconExternal className="w-3 h-3" />
                                  </a>
                                ) : <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>{svc.optOut}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {s.id === "contact" && (
                      <div className="mt-6 bg-[var(--bg)] border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                        <div className="font-serif-jp font-bold text-base mb-1" style={{ color: "var(--ink)" }}>doboku-note 運営事務局</div>
                        <div className="font-mono text-[13px] tabular-nums mb-2" style={{ color: "var(--accent)" }}>privacy@doboku-note.com</div>
                        <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>件名に「プライバシーポリシーに関するお問い合わせ」と記載してください。返信は通常 7 営業日以内に行います。</p>
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Signature block */}
              <div className="mt-14 pt-8 border-t-2 flex items-end justify-between" style={{ borderColor: "var(--ink)" }}>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>Signed</div>
                  <div className="font-serif-jp font-bold text-base" style={{ color: "var(--ink)" }}>doboku-note 編集部</div>
                  <div className="font-mono text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>編集責任者 N</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>Document</div>
                  <div className="font-mono text-[12px] tabular-nums" style={{ color: "var(--ink-body)" }}>doboku-note-privacy-v2.1.0</div>
                  <div className="font-mono text-[11px] mt-1 tabular-nums" style={{ color: "var(--ink-muted)" }}>2026.04.05 / Tokyo, Japan</div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.PrivacyOptionA = PrivacyOptionA;
